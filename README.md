# AskWave

Live Q&A, powered by the crowd. Anyone can post a question anonymously, anyone can upvote, and the feed reorders in real time as votes come in — no refresh, no login.

## Stack

Next.js 15 (App Router, React 19) · TypeScript · Tailwind CSS v4 · Supabase (Postgres 17, Realtime, Anonymous Auth).

## Getting started

```bash
git clone git@github.com:hammadsheikh07/AskWave.git
cd AskWave
npm install
cp .env.example .env.local   # then fill in the two NEXT_PUBLIC_ vars
npm run dev
```

The two env vars come from your Supabase project's API settings:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

> Before voting will work end-to-end, enable **Authentication → Sign In / Providers → Anonymous** in the Supabase dashboard. The MVP uses `signInAnonymously()` to issue a per-browser `auth.uid()` for vote dedup. See [IMPLEMENTATION.md §2](./IMPLEMENTATION.md) for the rationale.

## Project structure

```
app/                  Next.js App Router — layout, page, components
hooks/                custom hooks for Supabase side effects
lib/                  shared utilities + Supabase clients + types
IMPLEMENTATION.md     full plan, schema, conventions, build order
```

The full file layout, component responsibilities, and build order live in [IMPLEMENTATION.md](./IMPLEMENTATION.md).

## Architecture conventions

Hard rules for every contribution:

- **No inline styles.** `style={{ ... }}` is forbidden. Tailwind utility classes only; conditional classes go through `lib/cn.ts`.
- **Divide and conquer.** One responsibility per component, ~80 lines per file. Side effects live in `hooks/`, not components.
- **No CSS-in-JS** of any kind.

These are enforced in code review (see CI/CD below) and in [IMPLEMENTATION.md §6](./IMPLEMENTATION.md).

## CI/CD

Every pull request — on open and on every new commit — is reviewed automatically by Claude via [`.github/workflows/claude-review.yml`](./.github/workflows/claude-review.yml). The workflow posts a single summary comment with `[blocking]` and `[nit]` findings, checked against the conventions above plus the usual bug/security/type-safety axes.

Required repo secrets:

| Secret                      | Purpose                                              |
| --------------------------- | ---------------------------------------------------- |
| `CLAUDE_CODE_OAUTH_TOKEN`   | Authenticates the Claude Code GitHub Action.         |
| `PAT`                       | Posts review comments under your account.            |

## Scripts

| Command         | What it does                       |
| --------------- | ---------------------------------- |
| `npm run dev`   | Start the dev server on `:3000`.   |
| `npm run build` | Production build + type-check.     |
| `npm run start` | Serve the production build.        |
