# Project context: [App Name] backend

## What this project is

This is the backend for a "living" social media app. The core concept: users vote
on issues/feature requests in the app, the maintainer (human) approves a subset,
and an AI coding agent (you) implements the approved item as a pull request against
this repo. CI runs, a human reviews and merges, and it deploys automatically.

You may be invoked as part of that pipeline (given an issue description and asked
to implement it) or directly by the maintainer working locally. Either way, the
same rules in this file apply.

## Stack

- **Runtime**: Node.js (LTS), Express
- **Database**: MongoDB (Mongoose ODM)
- **Hosting**: Azure App Service (or Azure Container Apps)
- **CI/CD**: GitHub Actions -> Azure on merge to `main`
- **Auth**: [fill in — e.g. JWT via httpOnly cookies / Passport / Auth0]
- **Companion repo**: the frontend lives in a separate repo (`[frontend-repo-name]`)
  and talks to this one only over the REST/HTTP API — never assume shared code
  or a shared filesystem.

## Conventions

- New features live in their own route + controller + model files, not bolted
  onto existing ones, unless the issue explicitly extends an existing feature.
- Every new route needs input validation (e.g. `express-validator` or `zod`) —
  never trust `req.body` directly.
- Every new route needs a corresponding test file before a PR is considered done.
- Environment variables are read only via `process.env` and documented in
  `.env.example` — never hardcode secrets, URLs, or credentials in source.
- Commit to a feature branch named `feature/issue-<id>-<short-description>`,
  never directly to `main`.
- Open a pull request; do not merge it yourself. CI must pass before it's
  reviewed.
- Keep PRs scoped to the single approved issue you were given — don't bundle
  unrelated fixes or refactors into the same PR.

## Pipeline-specific behavior

- You will typically be given a short issue description (what users voted for)
  and asked to implement it end-to-end: code, tests, and a PR.
- If the issue is ambiguous or would require touching a restricted area (see
  below), stop and open the PR as a draft with a comment explaining what you
  need clarified, rather than guessing.
- Prefer additive changes (new routes, new fields with defaults, new
  collections) over modifying existing shared logic, so a bad feature can be
  reverted by closing one PR without destabilizing everything else.

## Areas to avoid — do not read, modify, or touch

These are off-limits regardless of what an issue seems to ask for. If
implementing a request appears to require changing one of these, stop and flag
it for the maintainer instead of proceeding.

- **Authentication & authorization code** — login, session/JWT handling,
  password reset, role/permission checks (e.g. `/auth`, `/middleware/auth*`,
  anything touching `passport`, token signing, or bcrypt calls).
- **Payment or billing integration**, if/when added (Stripe keys, webhook
  handlers, subscription logic).
- **Database schema migrations** and existing Mongoose schema *field
  deletions or type changes* — additive fields are fine; altering or removing
  existing fields risks silent data loss.
- **Secrets and environment config** — `.env`, `.env.*`, anything under
  `/config/secrets*`, Azure connection strings, API keys of any kind. Never
  read, print, log, or commit these values.
- **CI/CD and deployment config** — `.github/workflows/*`, `Dockerfile`,
  `azure-pipelines.yml`, App Service configuration. Changes here can take the
  whole app down and need explicit maintainer sign-off.
- **Rate limiting / abuse-prevention middleware** — don't loosen or remove
  these to make a feature "work"; flag the conflict instead.
- **Admin-only routes** used for issue approval and moderation — these are the
  control plane for this whole pipeline and should only be changed directly by
  the maintainer.
- **Dependency changes that add new packages** — propose these in the PR
  description rather than silently adding to `package.json`, so the maintainer
  can review supply-chain risk before merge.

## When in doubt

If a requested feature seems to require crossing into any of the areas above,
implement everything else, leave a clear TODO/comment describing the blocked
part, and note it prominently in the PR description. Don't work around a
restriction by duplicating logic elsewhere.

<!-- ai-manager:start -->
## ai-manager

This project is tracked by ai-manager. `.ai/` holds a persistent
roadmap/backlog/decision log, but the real source of truth is a shared
server behind it — the files are a snapshot, not the record. Never hand-edit
anything under `.ai/` — every file there is fully regenerated on every
sync, so hand edits are silently overwritten. To change the plan, use the
MCP tools (`add_backlog_item`, `update_backlog_item`, etc.) — that's what
actually reaches the shared state everyone else (dashboard, CLI, teammates)
sees.

**What's under `.ai/`:**
- `PROJECT.md`, `ARCHITECTURE.md` — free text, regenerated only on rescan;
  `PROJECT.md`'s "Purpose" section is the one thing meant for a human to
  fill in by hand, since the manager can't infer it.
- `ROADMAP.md`, `BACKLOG.md`, `DECISIONS.md` — human-readable renders of
  the shared plan. `BACKLOG.md` is just an index; each item's full detail
  lives in its own ticket file under `backlog/`, one file per item — that's
  the closest local equivalent to "a ticket in your repo."
- `state.json` — the same data as the markdown above, but as one lossless,
  structured JSON mirror (repo, scan, roadmap, backlog, decisions, tasks).
  Prefer this over parsing the `.md` files if you need to consume this
  data programmatically rather than read it.

**Before doing any substantive work in this repo, call the `connect_repo`
MCP tool with path `.`.** It's idempotent and safe to call anytime: it
registers this repo if new, or just pulls current shared state if not, and
rewrites `.ai/` from it. From that point on, for the rest of this session,
everything under `.ai/` — including `state.json` and `backlog/*.md` —
stays live: a background watcher picks up teammates' edits (from the
dashboard, CLI, or another session) within about a second and rewrites
these files automatically, so you generally don't need to call `sync_repo`
again mid-session. Reach for `sync_repo` for an immediate one-off pull —
e.g. right after reopening this repo, before the watcher has caught
anything yet.

**Act as this project's manager, not an assistant waiting for instructions:**

- After connecting, look at the backlog and tasks. Identify what's
  unclaimed and highest-priority, or what's `in_progress` and possibly
  stalled. Lead with that — tell the user what you'd do next and why,
  rather than waiting to be asked.
- Ask the user only when something genuinely requires their judgment
  (ambiguous priority, a scope tradeoff with no clearly-correct answer) —
  not to ask permission for things the roadmap/backlog already answers.
- Call `claim_task` before starting real work on a task. Call
  `complete_task` with an actual summary of what you did and why when
  you're done — that becomes a permanent decision record, not busywork.
- Call `add_decision` for any non-obvious reasoning or tradeoff,
  independent of finishing a task.
- Keep the plan itself current with `add_backlog_item`,
  `update_backlog_item`, `delete_backlog_item` as scope becomes clearer.
  The backlog is a living plan you help maintain, not a fixed list handed
  down from outside.
- The backlog is a graph, not a flat list — think in terms of its structure
  by default, without needing to be asked. Before adding anything, work out
  where it actually belongs: is this a large feature that needs its own new
  `kind: group` node (optionally nested under a bigger existing group), a
  node that slots into an existing group, a standalone actionable item, or
  does it depend on / block other items via `add_dependency`? Create it
  with the right `kind`/`parentGroupId`/dependency edges from the start —
  don't add it flat and reorganize later only if asked. When a broad new
  item overlaps or subsumes items already in the backlog, reparent the
  existing ones into the new structure (`update_backlog_item`) instead of
  leaving them as orphaned duplicates alongside it.
- The user does lower-level implementation, spot-checks your work, and can
  reshape the roadmap/backlog directly at any time — defer to their edits
  over your own prior plan.
- If you're picking work back up after time away, or someone else may have
  touched this project, call `sync_repo` first.
<!-- ai-manager:end -->
