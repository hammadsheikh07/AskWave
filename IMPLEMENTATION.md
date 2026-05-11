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
│       ├── feed.tsx             'use client' — realtime + optimistic state
│       ├── question-form.tsx    'use client' — submit handler
│       └── question-card.tsx    upvote button + count + body
└── lib/
    └── supabase/
        ├── client.ts            browser singleton (uses publishable key)
        └── server.ts            SSR fetch client (cookies-aware via @supabase/ssr)
```

No `src/` directory — the project is small enough to live at the root.

---

## 6. Component responsibilities

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
- Renders body, relative timestamp, vote count, upvote button.
- Button shows filled state if user has voted; click toggles:
  - If not voted: insert into `votes`. On unique-violation (`code === '23505'`) silently treat as already voted (race with realtime).
  - If voted: delete from `votes`.
- Optimistically updates local count + voted set; rolls back on error.

---

## 7. Environment & config

`.env.local` (gitignored):

```
NEXT_PUBLIC_SUPABASE_URL=https://gfrwzsvgnhwjxnzwkpog.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_vW0kBKQiiSnZavZI4NkOBQ_WeY80fP4
```

Use the modern **publishable key** (`sb_publishable_…`), not the legacy `anon` JWT. Both are present on the project; the publishable key is preferred for new applications.

`.env.example` ships with placeholder values so a fresh clone knows what to fill in.

---

## 8. Build order

1. **DB migration** — apply tables, indexes, trigger, RLS, realtime publication in one `apply_migration` call.
2. **Scaffold Next.js** — `package.json`, `tsconfig.json`, `next.config.ts`, Tailwind v4 setup, `.gitignore`, `.env.example`.
3. **Supabase clients** — `lib/supabase/client.ts` + `lib/supabase/server.ts`.
4. **Root layout + global styles**.
5. **Server page** with initial fetch.
6. **Feed client component** — state, auth bootstrap, realtime channel.
7. **Question form**.
8. **Question card** with vote toggle.
9. **`.env.local`** with the project's URL + publishable key.
10. **Local smoke test** — `npm run dev`, open two browsers, post + vote, watch realtime sync.

---

## 9. Out of scope for the MVP

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

## 10. Open questions

These are intentionally left for confirmation before we build:

1. **Toggle-off voting** — should clicking an already-upvoted button remove the vote, or is voting one-way? *Default in this doc: toggle.*
2. **Visual style** — minimal monochrome, or something more branded? *Default: minimal Tailwind, no theming.*
3. **Top-50 cap** — fine for MVP, or do you want infinite scroll / "load more"? *Default: hard cap at 50.*
4. **Anonymous auth dashboard toggle** — confirmed you'll flip it before testing, or do we fall back to localStorage UUID? *Default: anon auth, you toggle manually.*
