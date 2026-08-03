# Project Log — featsoc backend

An **append-only** history of decisions, completed work, and open questions.

## How to use this file
- **Never edit or delete existing entries.** Only append new ones at the bottom.
- To change/resolve a past item, append a **new dated entry** that references
  its ID (e.g. "O-004 RESOLVED → see D-014"). The old entry stays as-is.
- **Current status is derived by reading top-to-bottom**: a later entry
  supersedes an earlier one with the same ID.
- Every append is announced in chat (what was added/changed + date).

## ID scheme
- `D-###` — Decision made
- `O-###` — Open question / option to decide later
- `T-###` — Todo (planned work not yet done)
- `X-###` — Done (shipped work); may reference the D/T it fulfills

## Entry format
```
### YYYY-MM-DD · TYPE · ID(s) · short title
- what happened / what's proposed
- Why: reasoning
- Refs: files, commits, related IDs
```

---

# LOG

### 2026-07-24 · X-001 · Backfill: Express + Mongoose boilerplate
- Scaffolded the backend: `src/{index,app}.js`, `config/{env,db}.js`,
  centralized error handling, `express-validator`, Jest + supertest with an
  in-memory MongoDB. Posts + Users features as the reference shape.
- Why: needed a working, testable foundation before features. `app.js` is
  split from `index.js` so tests import the app without opening a socket/DB.
- Refs: commit `f95173e` (2026-07-23); README.md

### 2026-07-24 · D-001 · Google auth via ID-token verification (not redirect flow)
- Frontend obtains a Google ID token client-side (Google Identity Services /
  native SDK) and POSTs it to `POST /api/auth/google`; backend verifies with
  `google-auth-library`.
- Why: cleaner for a decoupled SPA + native mobile; no client secret on the
  backend; same pattern works for iOS/Apple later. (User chose this over the
  server-side OAuth code/redirect flow.)
- Refs: src/lib/googleVerify.js, src/controllers/authController.js

### 2026-07-24 · D-002 · Session = JWT in an httpOnly cookie (web)
- On sign-in the backend signs a JWT (`sub` = user id) and sets it as a
  Secure, httpOnly, SameSite cookie.
- Why: XSS-safe (JS can't read it); works with the CORS `credentials: true`
  setup. (User chose this over bearer-only.)
- Refs: src/lib/jwt.js, src/lib/cookie.js

### 2026-07-24 · D-003 · Also return the JWT in the response body (native)
- `POST /api/auth/google` returns `{ data, created, token }`; `requireAuth`
  accepts either the cookie or `Authorization: Bearer <token>`.
- Why: Android is the primary client and native apps don't handle cookies as
  cleanly as browsers.
- Refs: src/controllers/authController.js, src/middleware/auth.js

### 2026-07-24 · D-004 · User schema auth fields are additive only
- Added `authProviders[]`, `passwordHash` (`select:false`), `emailVerified` to
  the User model; nothing existing was retyped or removed.
- Why: auth is a CLAUDE.md-restricted area; additive changes avoid silent data
  loss and keep the feature revertible.
- Refs: src/models/User.js

### 2026-07-24 · D-005 · Auto-generate username on social signup
- Kept `username` required+unique; generate one from the email/name for social
  signups (`generateUniqueUsername`).
- Why: avoids loosening an existing required field (schema-tightening risk),
  still guarantees a valid unique handle.
- Refs: src/services/authService.js

### 2026-07-24 · D-006 · Account linking by email across providers
- If a verified provider email matches an existing user, link the provider to
  that account instead of creating a duplicate.
- Why: one person = one account, whether they use Google now or Apple/password
  later.
- Refs: src/services/authService.js (findOrCreateFromProvider)

### 2026-07-24 · X-002 · Auth enforced on Posts
- `POST /api/posts` requires a session; `author` comes from `req.user` (body
  `author` ignored). `PATCH`/`DELETE` require auth + ownership (403 otherwise).
  Reads stay public.
- Why: makes auth actually protect data rather than just existing.
- Refs: src/routes/postRoutes.js, src/controllers/postController.js

### 2026-07-24 · D-007 · Rate limiting (global + strict auth tier)
- Global: 300 req / 15 min / IP on `/api`. Auth: 10 / 15 min / IP on
  `POST /api/auth/google`. `trust proxy = 1` for Azure's proxy. Skipped under
  NODE_ENV=test.
- Why: sign-in is the prime brute-force/abuse target; global cap is a
  backstop. Added at user request (abuse-prevention is restricted, but this is
  additive/strengthening).
- Refs: src/middleware/rateLimit.js, src/app.js

---

# OPEN QUESTIONS / DECIDE LATER

### 2026-07-24 · O-001 · Email/password sign-up
- `bcrypt` is installed and `passwordHash` exists, but no register/login routes
  yet. Deferred at user request to focus on Google.
- Decide: password rules, verification email, reset flow.
- Refs: T-001

### 2026-07-24 · O-002 · Apple / iOS sign-in
- Deferred. Infra supports it (`authProviders`, `findOrCreateFromProvider`).
  Note: Apple setup is in Apple's Developer portal, separate from Google.
- Refs: T-002

### 2026-07-24 · O-003 · Production CORS origins + cross-site cookie
- Web frontend origin not set on the Google client yet (mobile-first). For a
  cross-origin web FE in prod: set `CORS_ORIGIN` and `COOKIE_SAMESITE=none`
  (forces Secure/HTTPS).
- Decide: final FE domain(s).

### 2026-07-24 · O-004 · Rate-limiter store for scale-out
- Current limiter is in-memory (per-process). On multi-instance Azure or after
  a restart, counts aren't shared and reset.
- Decide: move to a shared store (e.g. `rate-limit-redis`) before scaling out.
- Refs: T-003

### 2026-07-24 · O-005 · Token revocation / logout-everywhere
- Bearer JWTs stay valid until expiry (7d); no server-side revocation. Cookie
  logout only clears the browser cookie.
- Decide: token versioning or a refresh-token model if we need real logout /
  "sign out all devices".

### 2026-07-24 · O-006 · Android OAuth client ID + SHA-1 fingerprints
- When wiring the Android client: create an Android client ID (package name +
  SHA-1 for BOTH debug and release/Play App Signing keys) and append its id to
  `GOOGLE_CLIENT_ID` (comma-separated; backend already accepts a list).

### 2026-07-24 · O-007 · Make Post.author required?
- `author` is always set now (from session) but the schema still allows null
  (legacy-safe). Could tighten to required.
- Decide: whether to enforce at schema level (minor schema change).

---

# TODO (planned work)

### 2026-07-24 · T-001 · Build email/password auth (register + login)
- Depends on O-001. bcrypt hashing, validation, tests.

### 2026-07-24 · T-002 · Build Apple sign-in
- Depends on O-002. Verify Apple token → `findOrCreateFromProvider('apple', …)`.

### 2026-07-24 · T-003 · Redis-backed rate limiting before scale-out
- Depends on O-004.

---

### 2026-07-30 · X-003 · Email/password signup implemented
- Added `POST /api/auth/signup` (body `{ email, password }`). Hashes with
  bcrypt, creates a `local`-provider user, returns `{ token, user, created }`
  and sets the cookie. 409 on duplicate email, 400 on validation. Rate-limited
  via the strict auth limiter. Password min length 8; bcrypt cost via
  `BCRYPT_ROUNDS` (default 12). Built from a FE-provided contract spec.
- Why: first-class email/password path requested by the maintainer; matches
  what the frontend client already sends/expects.
- Refs: src/lib/password.js, src/services/authService.js (createLocalUser),
  src/controllers/authController.js, src/routes/authRoutes.js
- Fulfills: T-001. Partially resolves O-001 (signup done; login still open →
  T-004).

### 2026-07-30 · D-008 · Unified auth response shape across endpoints
- All auth endpoints now return `{ token, user, created? }`; `GET /me` returns
  `{ user }`. Changed `/google` (was `{ data: user, created, token }`) and
  `/me` (was `{ data: user }`) to match.
- Why: the FE treats all auth endpoints as one contract and its parser wants
  `user.id`/`user.email` + optional `token`. One shape avoids brittle parsing.
- Refs: src/controllers/authController.js (issueSession)

### 2026-07-30 · D-009 · Email normalized by lowercase+trim only (not aggressive)
- Server trims and lowercases the email; does NOT use `normalizeEmail()`.
- Why: consistent lookups/dedupe without gmail dot-stripping or plus-tag
  surprises that `normalizeEmail` would introduce.
- Refs: src/routes/authRoutes.js, src/controllers/authController.js

### 2026-07-30 · D-010 · passwordHash never serialized
- `passwordHash` is `select:false` AND explicitly deleted in the User `toJSON`
  transform (belt-and-braces).
- Why: defense in depth so a hash can never leak in an API response even if a
  query selects it.
- Refs: src/models/User.js

### 2026-07-30 · O-001 · UPDATE — password policy still open
- Signup shipped (X-003) but the only rule is min length 8. Still to decide:
  complexity requirements, email verification, and password reset flow.

### 2026-07-30 · O-008 · Field-level validation error messages
- Backend returns `{ error: { message, details[] } }`, but the FE currently
  only surfaces the HTTP status ("Sign up failed (400)"). Showing per-field
  messages is a FE change too.
- Decide: whether/when to wire field-level errors end to end.

### 2026-07-30 · T-004 · Build POST /api/auth/login (email/password)
- FE already wired for it: same `{ email, password }` request, same
  `{ token, user }` response. Verify with `verifyPassword`; 401 on bad creds.
- Depends on X-003 (done). Natural next step.

### 2026-07-30 · NOTE · PORT is already env-driven
- Running on a different port needs no code change: `env.js` reads
  `process.env.PORT` (default 3000). Set `PORT=3002` in `.env`.
- Refs: src/config/env.js

---

### 2026-08-03 · X-004 · Email/password login implemented
- Added `POST /api/auth/login` (body `{ email, password }`). Looks up the user
  with `.select('+passwordHash')`, verifies with bcrypt, returns
  `{ token, user }` and sets the cookie. Rate-limited via the auth limiter.
- Why: completes the email/password pair; FE was already wired for it.
- Refs: src/controllers/authController.js (login), src/routes/authRoutes.js
- Fulfills: T-004. Resolves the login half of O-001.

### 2026-08-03 · D-011 · Generic 401 on login (no user enumeration)
- "No such user", "social-only account (no password set)", and "wrong
  password" all return the same `401 Invalid email or password`.
- Why: avoids leaking which emails have accounts / which use social login.
- Refs: src/controllers/authController.js (login)

### 2026-08-03 · NOTE · Dev server moved to nodemon
- `npm start` (plain node) was serving a stale build (signup 404'd). Restarted
  under `npm run dev` (nodemon) so file changes auto-reload in dev.
- Observed: dev DB connected as `test` (not `featsoc`) — MONGODB_URI likely
  points at the default DB. Not changed (won't touch `.env`); flagged for
  maintainer.
