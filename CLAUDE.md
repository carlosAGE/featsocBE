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