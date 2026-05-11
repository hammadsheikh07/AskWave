# TASKS

A breakdown of the AskWave MVP into small, atomic units of work. Each task is sized to ship as a **single PR** with a **single GitHub issue** tracking it.

---

## How to work a task

For every task below:

1. **Open a GitHub issue** with the task code + title (e.g. `T01 — Apply DB schema`). Paste the task block from this file into the issue body.
2. **Branch off `main`** using the task code: `git switch -c t01-db-schema`.
3. **Implement** strictly within the task's scope. Architecture and conventions live in [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) — re-read §6 ("Architecture conventions") before writing code.
4. **Open a PR** with the same title as the issue. Start the PR body with `Closes #<issue-number>`.
5. **Wait for the Claude review workflow** to comment. Resolve every `[blocking]` finding; `[nit]` is at your discretion. Each push triggers a fresh review.
6. **Merge** when clean (squash recommended). Add a one-line bullet to [`JOURNAL.md`](./JOURNAL.md) under the active session.

**Rules:**
- One task per PR. If scope creeps, split into a follow-up task and add it to this file.
- No `style={{ ... }}` ever. Tailwind classes via `cn()` only.
- ≤ 80 lines per component file. Side effects live in `hooks/`, not components.

---

## Backlog

### T01 — Apply DB schema
**Branch:** `t01-db-schema` · **Depends on:** none
**Goal:** Create the `questions` and `votes` tables, the `bump_vote_count` trigger, the RLS policies, and add `questions` to the realtime publication. Mirror IMPLEMENTATION.md §3 exactly.
**Acceptance:**
- [ ] Migration applied via Supabase MCP (`apply_migration`).
- [ ] Migration SQL also committed at `supabase/migrations/<timestamp>_init.sql`.
- [ ] `list_tables` confirms columns, PKs, and indexes match the doc.
- [ ] `questions` appears in `supabase_realtime` publication.

### T02 — Project setup checklist (no code, no PR)
**Branch:** none · **Depends on:** T01
**Goal:** Manual prerequisites that must be true before any client-side feature works.
**Acceptance (checklist on the issue):**
- [ ] Supabase Dashboard → **Authentication → Sign In / Providers → Anonymous** is **enabled**.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set in Vercel for **both Production and Preview** environments.
- [ ] `.env.local` created locally from `.env.example` for dev.
> Close the issue once all three boxes are ticked. No PR required.

### T03 — Presentational: `EmptyState` + `CharCounter`
**Branch:** `t03-presentational-empty-charcounter` · **Depends on:** none
**Goal:** The two simplest pure components from IMPLEMENTATION.md §7.
**Acceptance:**
- [ ] `app/_components/empty-state.tsx` — props `{ message?: string }`. Default message: "No questions yet — be the first to ask."
- [ ] `app/_components/char-counter.tsx` — props `{ count: number; max: number }`. Renders `count / max`; switches color when `count > max`.
- [ ] No Supabase imports, no `style={{}}`, no `useState`. ≤ 30 lines each.

### T04 — Presentational: `QuestionBody` + `QuestionMeta`
**Branch:** `t04-presentational-body-meta` · **Depends on:** none
**Goal:** Pure renderers for a question row.
**Acceptance:**
- [ ] `app/_components/question-body.tsx` — props `{ body: string }`. Preserves whitespace, line-clamps long bodies if needed (Tailwind classes only).
- [ ] `app/_components/question-meta.tsx` — props `{ createdAt: string }`. Renders relative time ("3m ago"). Add `lib/format.ts` with a `relativeTime(iso)` helper.
- [ ] No effects, no Supabase. ≤ 40 lines each.

### T05 — Presentational: `UpvoteButton`
**Branch:** `t05-presentational-upvote-button` · **Depends on:** none
**Goal:** Pure button that shows the vote count and voted state.
**Acceptance:**
- [ ] `app/_components/upvote-button.tsx` — props `{ count: number; hasVoted: boolean; onClick: () => void; disabled?: boolean }`.
- [ ] Voted/unvoted styling via `className` only (use `cn()`).
- [ ] No data fetching, no internal state beyond what `props` provide. ≤ 50 lines.

### T06 — Hook: `use-anonymous-session`
**Branch:** `t06-hook-anonymous-session` · **Depends on:** T02
**Goal:** Bootstraps a Supabase anonymous session per browser. IMPLEMENTATION.md §7.
**Acceptance:**
- [ ] `hooks/use-anonymous-session.ts` — returns `{ userId: string | null; ready: boolean }`.
- [ ] On mount: `getSession()`; if null, `signInAnonymously()`; set state once resolved.
- [ ] Idempotent — re-mounting does not re-sign-in if session exists.

### T07 — Hook: `use-realtime-questions`
**Branch:** `t07-hook-realtime-questions` · **Depends on:** T01
**Goal:** Subscribes to `postgres_changes` on `questions` and exposes a sorted list.
**Acceptance:**
- [ ] `hooks/use-realtime-questions.ts` — input `initialQuestions: Question[]`. Returns `{ questions, applyVote(id, delta) }`.
- [ ] Handles INSERT (prepend + re-sort) and UPDATE (patch + re-sort).
- [ ] Sort: `vote_count desc, created_at desc`. Comparator extracted to `lib/format.ts`.
- [ ] Cleans up the channel on unmount.

### T08 — Hook: `use-voted-questions`
**Branch:** `t08-hook-voted-questions` · **Depends on:** T01, T06
**Goal:** Owns the per-user set of voted question IDs and the toggle mutation.
**Acceptance:**
- [ ] `hooks/use-voted-questions.ts` — input `userId: string | null`. Returns `{ hasVoted(id), toggleVote(id) }`.
- [ ] Seeds the set from `select question_id from votes where user_id = $userId` on first ready `userId`.
- [ ] `toggleVote` inserts/deletes a `votes` row; treats unique-violation (`23505`) as already-voted; updates the local set.

### T09 — Composite: `QuestionForm`
**Branch:** `t09-question-form` · **Depends on:** T03
**Goal:** Anonymous question submission. IMPLEMENTATION.md §7.
**Acceptance:**
- [ ] `app/_components/question-form.tsx` — controlled textarea, 280-char cap, submit disabled while pending or over cap.
- [ ] Uses `<CharCounter>` for the counter.
- [ ] Inserts via `supabase.from('questions').insert({ body })`. Clears textarea on success.
- [ ] No optimistic prepend — relies on realtime delivery.

### T10 — Composite: `QuestionCard` + `QuestionList`
**Branch:** `t10-question-card-list` · **Depends on:** T04, T05
**Goal:** Compose the three pure components into a row, and render the row in a list.
**Acceptance:**
- [ ] `app/_components/question-card.tsx` — props `{ question, hasVoted, onToggleVote }`. Composition only. ≤ 30 lines.
- [ ] `app/_components/question-list.tsx` — renders a sorted array of `<QuestionCard>` plus `<EmptyState>` when empty.
- [ ] No hooks called inside the card; all data flows in via props.

### T11 — Composite: `Feed` (composition root)
**Branch:** `t11-feed` · **Depends on:** T06, T07, T08, T09, T10
**Goal:** The single `'use client'` boundary that wires hooks into the components.
**Acceptance:**
- [ ] `app/_components/feed.tsx` — props `{ initialQuestions: Question[] }`.
- [ ] Calls `useAnonymousSession`, `useRealtimeQuestions`, `useVotedQuestions` (in that order).
- [ ] Renders `<QuestionForm />` above `<QuestionList />`. ≤ 60 lines.

### T12 — Server page initial fetch
**Branch:** `t12-page-initial-fetch` · **Depends on:** T01, T11
**Goal:** Replace the placeholder home page with an SSR fetch + the live feed.
**Acceptance:**
- [ ] `app/page.tsx` — Server Component. Uses `getSupabaseServer()` to fetch top 50 questions sorted by `vote_count desc, created_at desc`.
- [ ] Renders `<Feed initialQuestions={questions} />` inside the existing layout.
- [ ] Page remains statically optimizable where Next allows; falls back to dynamic if the client requires the session.

### T13 — Smoke test (no code; manual + screenshots)
**Branch:** none · **Depends on:** T11, T12
**Goal:** Verify the MVP end-to-end on the live Vercel deploy.
**Acceptance (checklist on the issue):**
- [ ] Two browsers (or one + incognito) open to the prod URL.
- [ ] Post a question in browser A → appears in B within ~1s without refresh.
- [ ] Upvote in B → count increments in A.
- [ ] Second upvote attempt from the same browser is a no-op (or toggles off, per design).
- [ ] Refresh: questions persist, vote state persists.
- [ ] Screenshots attached to the issue before closing.

---

## Out of backlog (defer)

Listed so they don't get pulled into MVP PRs. Add them as future tasks only after MVP is shipped:

- Pagination beyond the top 50.
- Comments / replies.
- Moderation / reporting / rate limiting.
- Editing or deleting questions.
- Real (non-anonymous) auth.
- Telemetry / error tracking.
