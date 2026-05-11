# AskWave — Live Q&A, Powered by the Crowd

## MVP Features

1. **Post a Question** — anyone can submit a question anonymously, no login needed.
2. **Upvote Questions** — one upvote per user per question, sorted by most votes.
3. **Live Updates** — new questions and vote counts update in real time without refreshing.
4. **Simple Feed View** — clean list of questions ordered by popularity.

**Tools:** Next.js + Supabase.

---

## Resources

**Claude Web** — got the idea and the basic feature list.

![MVP feature list from Claude Web](docs/images/claude-web-idea.png)

**Claude Code** — planning, scaffolding, CI/CD, feature implementation.

**Supabase MCP** — project + schema access from CLI.

**Vercel** — hosting, auto-deploy on every push to `main` and preview deploy on every PR. Live at <https://askwave.vercel.app>.

---

## Sessions

### Session 01 — 2026-05-11

- Wrote `IMPLEMENTATION.md` (stack, anon-auth strategy, schema, RLS, realtime model, file layout, build order).
- Added architecture conventions to the plan: no inline styles, divide-and-conquer, side effects in hooks.
- Initialized git, renamed folder to `AskWave`, created public GitHub repo `hammadsheikh07/AskWave`.
- Scaffolded Next.js 15 + Tailwind v4 + Supabase boilerplate (no feature code).
- Added Claude auto-review GitHub Actions workflow (`.github/workflows/claude-review.yml`).
- Wrote `README.md`.
- Set up Vercel project `askwave`, pinned framework via `vercel.json`, connected GitHub for auto-deploys, first production deploy live at <https://askwave.vercel.app>.
- Wrote `TASKS.md` — 13 atomic tasks (T01–T13) covering the MVP, each sized for one issue + one PR, with explicit dependency notes for parallel execution.
- Reworked CI/CD into a two-workflow pattern: `auto-review` (trigger) posts `@claude` on PR open via `PAT_TOKEN`; `claude.yml` (responder) runs `anthropics/claude-code-action` on `issue_comment` containing `@claude` via `CLAUDE_CODE_OAUTH_TOKEN`. Replaced the original single-workflow that failed with 401s.
- Synced `main` into all open PR branches (`t01-db-schema`, `t03-t05-presentational`, `t06-t08-hooks`) so each carries the new trigger workflow; close+reopened PRs #4 and #8 to fire the responder.
