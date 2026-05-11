# AskWave — Implementation Plan

Live Q&A, powered by the crowd. Anonymous question posting, one-vote-per-user upvoting, and realtime updates without page refreshes.

---

## 1. Stack

| Layer       | Choice                                                |
| ----------- | ----------------------------------------------------- |
| Framework   | Next.js 15 (App Router, TypeScript, React 19)         |
| Styling     | Tailwind CSS v4                                       |
| Backend     | Supabase (Postgres 17, Realtime, Anonymous Auth)      |
| SDK         | `@supabase/supabase-js`, `@supabase/ssr`              |
| Deployment  | Vercel (target; not part of MVP build)                |

**Supabase project**: `AskWave` (ref `gfrwzsvgnhwjxnzwkpog`, region `ap-northeast-1`). Already provisioned, empty schema.

---

## 2. Anonymous identity strategy

The "one upvote per user without login" requirement forces a choice. We use **Supabase Anonymous Auth**.

- On first visit the browser calls `supabase.auth.signInAnonymously()`.
- The user is issued a real `auth.uid()` (UUID) and a session persisted in `localStorage`.
- That `uid` becomes the natural key for vote dedup and for RLS policies.

**Pros**: works with standard RLS, vote dedup is a Postgres `PRIMARY KEY` constraint (zero application logic), survives reloads.

**Cons**: bypassable by clearing storage / opening incognito — acceptable for MVP.

**Prerequisite**: Anonymous sign-ins must be enabled in the Supabase dashboard at **Authentication → Sign In / Providers → Anonymous**. MCP cannot toggle this; it is a manual step before the app works end-to-end.

**Fallback (not chosen)**: client-generated UUID in localStorage, sent with each vote. Simpler but no server-side identity, weaker RLS story.

---

## 3. Database schema

```sql
-- Questions submitted by anon users
create table public.questions (
  id          uuid primary key default gen_random_uuid(),
  body        text not null check (char_length(body) between 1 and 280),
  created_at  timestamptz not null default now(),
  vote_count  integer not null default 0
);

create index questions_sort_idx
  on public.questions (vote_count desc, created_at desc);

-- One row per (question, user) — the PK is the dedup
create table public.votes (
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id     uuid not null references auth.users(id)       on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (question_id, user_id)
);

create index votes_user_idx on public.votes (user_id);
```

### Trigger: maintain `vote_count`

```sql
create or replace function public.bump_vote_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.questions
       set vote_count = vote_count + 1
     where id = new.question_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.questions
       set vote_count = greatest(vote_count - 1, 0)
     where id = old.question_id;
    return old;
  end if;
  return null;
end $$;

create trigger votes_count_aiud
after insert or delete on public.votes
for each row execute function public.bump_vote_count();
```

Why a trigger and not a view: each vote produces a single `UPDATE` event on `questions`, which our realtime subscription already listens to. Clients get vote-count changes "for free" without subscribing to the votes table.

### Row Level Security

```sql
alter table public.questions enable row level security;
alter table public.votes     enable row level security;

-- questions: everyone can read; any authenticated user (incl. anon) can insert
create policy questions_read   on public.questions for select using (true);
create policy questions_insert on public.questions for insert to authenticated with check (true);

-- votes: everyone can read; you can only insert/delete your own row
create policy votes_read   on public.votes for select using (true);
create policy votes_insert on public.votes for insert to authenticated
  with check (user_id = auth.uid());
create policy votes_delete on public.votes for delete to authenticated
  using (user_id = auth.uid());
```

No UPDATE policies — questions and votes are append-only from the client (the trigger bumps `vote_count` via the table owner, which bypasses RLS).

### Realtime

Add `questions` to the `supabase_realtime` publication. Clients subscribe to INSERT + UPDATE on that table only.

```sql
alter publication supabase_realtime add table public.questions;
```

We deliberately do **not** publish `votes`. Each vote triggers an UPDATE on `questions`, which is what clients actually need to render.

---

## 4. Realtime model

Single channel, single table:

```ts
supabase
  .channel('questions')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'questions' }, onInsert)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'questions' }, onUpdate)
  .subscribe();
```

- **INSERT** → prepend to local list, re-sort.
- **UPDATE** → patch the matching question's `vote_count`, re-sort.

The client also tracks "which questions has *this* user voted on" via a one-time `select question_id from votes where user_id = auth.uid()` at startup, then maintains it optimistically on click. We do not need a realtime subscription to `votes` because the only thing affected by other users' votes is the count, which already flows through `questions`.

---

## 5. File layout

```
/
├── .mcp.json                    (existing — Supabase MCP config)
├── .claude/                     (existing)
├── .env.local                   (NOT committed — URL + publishable key)
├── .env.example                 (committed — placeholders)
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── app/
│   ├── layout.tsx               root layout, font, metadata
│   ├── page.tsx                 Server Component — SSR initial top-N questions
│   ├── globals.css              Tailwind v4 entry
│   └── _components/
│       ├── feed.tsx             'use client' — composition root for the feed
│       ├── question-list.tsx    pure rendering loop over the sorted array
│       ├── question-card.tsx    one row — composes body + meta + vote button
│       ├── question-body.tsx    formatted question text
│       ├── question-meta.tsx    relative timestamp
│       ├── upvote-button.tsx    button + count + voted state
│       ├── question-form.tsx    submit form (textarea + submit)
│       ├── char-counter.tsx     280-char counter sub-component
│       └── empty-state.tsx      shown when the feed is empty
├── hooks/
│   ├── use-anonymous-session.ts bootstraps signInAnonymously()
│   ├── use-realtime-questions.ts subscribes to postgres_changes
│   └── use-voted-questions.ts   seeds + maintains the Set of voted IDs
└── lib/
    ├── supabase/
    │   ├── client.ts            browser singleton (publishable key)
    │   └── server.ts            SSR fetch client (cookies via @supabase/ssr)
    ├── format.ts                relative-time formatter, sort comparator
    └── types.ts                 Question, Vote — derived from generated types
```

No `src/` directory — the project is small enough to live at the root.

---

## 6. Architecture conventions

These rules are non-negotiable for the duration of this build. They exist so the codebase stays reviewable as it grows and so styling stays portable.

### Divide and conquer

- **One component, one responsibility.** A component renders one thing or composes a small number of other components. If a file is doing data fetching *and* layout *and* event handling *and* presentation, split it.
- **Soft size cap: 80 lines per component file.** Above that, you are almost certainly mixing concerns. Extract sub-components or hooks until each file fits.
- **Pure where possible.** Presentational components (`QuestionBody`, `QuestionMeta`, `UpvoteButton`, `CharCounter`, `EmptyState`) take props and render. They do not call Supabase, do not own state beyond UI ephemera, and do not subscribe to anything.
- **Side effects live in hooks.** Realtime subscription, anonymous-session bootstrap, voted-set seeding — each gets its own custom hook in `hooks/`. Components consume hooks; hooks consume the Supabase client.
- **Composition over props drilling.** If a prop is being threaded through more than two levels, lift state into a hook or reach for context rather than widening every signature.

### No inline styles

- **`style={{ ... }}` is forbidden** in component code. No exceptions for "just this one rule" or "it's only one property."
- **All styling goes through Tailwind utility classes** on `className`. Conditional classes use a small `cn()` helper (clsx-style) — never string concatenation.
- **Truly repeated class combinations** get extracted into a named component (preferred) or, as a last resort, an `@apply` rule in `globals.css`. We do not invent ad-hoc utility shortcuts.
- **No CSS-in-JS libraries.** No styled-components, no emotion, no `style` objects. Tailwind only.
- **Design tokens** (colors, spacing scale) come from the Tailwind config. If a value is reached for twice, it belongs in the config, not inlined.

### Naming and structure

- Filenames are `kebab-case.tsx`. Exported component names are `PascalCase`. There is exactly one default-exported component per file, named to match the file.
- Hooks are `use-*.ts` and live in `hooks/`. They return a typed object, not a tuple, once they expose more than one value.
- Shared DB row shapes live in `lib/types.ts` and are derived from `supabase gen types` output (pasted in manually for the MVP, not wired through CI).

---

## 7. Component responsibilities

### `app/page.tsx` (Server Component)
- Creates a server Supabase client.
- Fetches the top ~50 questions: `select id, body, created_at, vote_count from questions order by vote_count desc, created_at desc limit 50`.
- Renders `<Feed initialQuestions={...} />`.

### `app/_components/feed.tsx` (Client Component)
- Receives `initialQuestions` as props, holds them in `useState`.
- On mount:
  1. If `supabase.auth.getSession()` returns null, call `signInAnonymously()`.
  2. Fetch `votes` rows for the current `user_id` to seed a `Set<question_id>` of already-voted IDs.
  3. Open the realtime channel and merge events into state.
- Renders `<QuestionForm />` above the list of `<QuestionCard />`s.

### `app/_components/question-form.tsx`
- Controlled textarea, 280-char cap, submit button disabled while pending.
- Calls `supabase.from('questions').insert({ body }).select().single()`.
- On success: clear the textarea. Realtime delivers the INSERT and adds it to the feed — no manual prepend.

### `app/_components/question-card.tsx`
- Composition only — renders `<QuestionBody>`, `<QuestionMeta>`, and `<UpvoteButton>`.
- No data fetching, no state of its own. Receives `question` + `hasVoted` + `onToggleVote` from the feed.

### `app/_components/upvote-button.tsx`
- Receives `count`, `hasVoted`, `onClick`. Pure presentational.
- Voted state communicated via `className` only (no inline styles).

### `app/_components/question-body.tsx`, `question-meta.tsx`, `char-counter.tsx`, `empty-state.tsx`
- Each renders one thing from props. No effects, no Supabase imports.

### `hooks/use-anonymous-session.ts`
- On mount: `getSession()` → if null, `signInAnonymously()` → returns the resolved `user_id` plus a `ready` boolean.

### `hooks/use-realtime-questions.ts`
- Takes `initialQuestions`, opens the `postgres_changes` channel, exposes a sorted array plus an optimistic `applyVote(questionId, delta)` callback used for instant UI feedback before the trigger's UPDATE event arrives.

### `hooks/use-voted-questions.ts`
- Takes the `user_id`, seeds a `Set<question_id>` from `votes`, exposes `hasVoted(id)` and `toggleVote(id)` which writes to Supabase and updates the set.

---

## 8. Environment & config

`.env.local` (gitignored):

```
NEXT_PUBLIC_SUPABASE_URL=https://gfrwzsvgnhwjxnzwkpog.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_vW0kBKQiiSnZavZI4NkOBQ_WeY80fP4
```

Use the modern **publishable key** (`sb_publishable_…`), not the legacy `anon` JWT. Both are present on the project; the publishable key is preferred for new applications.

`.env.example` ships with placeholder values so a fresh clone knows what to fill in.

---

## 9. Build order

1. **DB migration** — apply tables, indexes, trigger, RLS, realtime publication in one `apply_migration` call.
2. **Scaffold Next.js** — `package.json`, `tsconfig.json`, `next.config.ts`, Tailwind v4 setup, `.gitignore`, `.env.example`.
3. **Lib + types** — `lib/supabase/{client,server}.ts`, `lib/format.ts`, `lib/types.ts`, `lib/cn.ts`.
4. **Hooks** — `use-anonymous-session`, `use-realtime-questions`, `use-voted-questions` (each in its own file).
5. **Root layout + global styles**.
6. **Server page** with initial fetch.
7. **Presentational components** — `empty-state`, `char-counter`, `question-body`, `question-meta`, `upvote-button` (props-only, no effects).
8. **Composite components** — `question-card`, `question-list`, `question-form`.
9. **Feed composition root** — wires hooks into the components above.
10. **`.env.local`** with the project's URL + publishable key.
11. **Local smoke test** — `npm run dev`, open two browsers, post + vote, watch realtime sync.

---

## 10. Out of scope for the MVP

Listed so we don't accidentally drift:

- Authentication beyond anon (email, OAuth, accounts).
- Editing or deleting questions after submission.
- Comments / replies / threading.
- Moderation, profanity filtering, reporting.
- Rate limiting (would need an Edge Function or `pg_cron` cleanup).
- Pagination beyond the top 50 — for MVP we render a single window.
- Mobile-specific UI tweaks beyond Tailwind defaults.
- Analytics, telemetry, error tracking.

---

## 11. Open questions

These are intentionally left for confirmation before we build:

1. **Toggle-off voting** — should clicking an already-upvoted button remove the vote, or is voting one-way? *Default in this doc: toggle.*
2. **Visual style** — minimal monochrome, or something more branded? *Default: minimal Tailwind, no theming.*
3. **Top-50 cap** — fine for MVP, or do you want infinite scroll / "load more"? *Default: hard cap at 50.*
4. **Anonymous auth dashboard toggle** — confirmed you'll flip it before testing, or do we fall back to localStorage UUID? *Default: anon auth, you toggle manually.*
