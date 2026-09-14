# featsoc — backend

Backend for a community-steered ("living") social media app. See
[CLAUDE.md](CLAUDE.md) for the project concept, conventions, and restricted
areas.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in real values
npm run dev            # start with hot reload (nodemon)
npm start              # start once
npm test               # run the test suite (in-memory MongoDB)
```

## Project structure

```
src/
  index.js            # entry point: connect DB, start server
  app.js              # builds the Express app (no server/DB side effects)
  config/
    env.js            # the ONLY place process.env is read
    db.js             # mongoose connection helpers
  middleware/
    error.js          # ApiError, 404 + centralized error handler
    validate.js       # express-validator result -> 400
    auth.js           # AUTH STUB — not implemented (see CLAUDE.md)
  models/             # Mongoose schemas (User, Post)
  controllers/        # request handlers
  routes/             # express routers, one file per feature + index.js
tests/                # jest + supertest, one file per feature
```

## Adding a feature

Follow the Posts feature as a template: add a `model`, `controller`,
`routes/<feature>Routes.js`, register it in `routes/index.js`, and add a
`tests/<feature>.test.js`. Every route must validate input and have a test
before a PR is considered done.

## Endpoints

| Method | Path                | Notes                                   |
| ------ | ------------------- | --------------------------------------- |
| GET    | `/health`           | health probe                            |
| POST   | `/api/auth/signup`  | register with email + password          |
| POST   | `/api/auth/login`   | sign in with email + password           |
| POST   | `/api/auth/google`  | sign in with a Google ID token          |
| GET    | `/api/auth/me`      | current user (requires session)         |
| POST   | `/api/auth/logout`  | clear the session cookie                |
| GET    | `/api/posts`        | list posts (`?limit&before`) — public   |
| POST   | `/api/posts`        | create post — **auth**; author = session |
| GET    | `/api/posts/:id`    | get one — public                        |
| PATCH  | `/api/posts/:id`    | update — **auth + owner**               |
| DELETE | `/api/posts/:id`    | delete — **auth + owner**               |
| GET    | `/api/users`        | list users                              |
| POST   | `/api/users`        | create profile                          |
| GET    | `/api/users/:id`    | get one                                 |
| POST   | `/api/videos`       | upload video — **auth**; multipart, see below |
| GET    | `/api/videos/:id`   | get one — public                        |
| DELETE | `/api/videos/:id`   | delete — **auth + owner**               |

## Authentication

All auth endpoints return the same shape — `{ token, user, created? }` — and
`GET /api/auth/me` returns `{ user }`. `token` is the JWT (also set as an
httpOnly cookie); `user` always has `id` and `email`.

- **Email/password** (`POST /api/auth/signup`, `POST /api/auth/login`): body
  `{ email, password }` (email trimmed + lowercased server-side; password min 8
  chars on signup, hashed with bcrypt). Signup: `409` if the email exists,
  `400` on validation. Login: `401 Invalid email or password` for any failure
  (wrong password, unknown email, or a social-only account) — deliberately
  generic to avoid user enumeration.
- **Google sign-in** (`POST /api/auth/google`): the client obtains a Google ID
  token via Google Identity Services and posts `{ idToken }`. The backend
  verifies it (`google-auth-library`), finds-or-creates the user, and issues a
  JWT **two ways**: as an httpOnly cookie (web) and in the response body as
  `token` (native/mobile). Protect any route with the `requireAuth`
  middleware (`src/middleware/auth.js`); it reads the cookie, or a
  `Authorization: Bearer <jwt>` header for native clients.
- Requires `JWT_SECRET` and `GOOGLE_CLIENT_ID` in `.env`.
- Account linking: signing in with Google on an email that already exists links
  the provider to that account instead of creating a duplicate — so email/password
  and Apple sign-in (next) resolve to one user.

## Rate limiting

Abuse prevention lives in `src/middleware/rateLimit.js`:

- **Global** — 300 requests / 15 min / IP on everything under `/api`.
- **Auth** — 10 attempts / 15 min / IP on `POST /api/auth/google` (sign-in is
  the prime abuse target).

Limits are per client IP; `trust proxy` is set to `1` so the real IP is read
from Azure's proxy. Both limiters are skipped under `NODE_ENV=test`.

## Video upload

Storage is Cloudflare R2; see `PROJECT_LOG.md` (D-012, D-013) for the full
tradeoff writeup. Summary:

- `POST /api/videos` — `multipart/form-data`, field `file` (video, one of
  mp4/mov/webm/mkv/avi) + optional `caption`. **Single-shot upload**: the raw
  file is proxied through this server, run through ffmpeg (normalized to a
  capped-bitrate H.264/AAC mp4 + a jpg thumbnail), pushed to R2, then a
  `Video` doc is created. Responds `201 { data: { id, url, thumbnailUrl,
  caption, durationSeconds, width, height, sizeBytes, owner, createdAt } }`.
  `url`/`thumbnailUrl` are immediately playable — no separate "processing"
  poll step.
- This is not presigned/resumable upload — a failed upload is a full retry,
  not a resume. `MAX_UPLOAD_MB` (`.env`, default 200) caps request size.
- Requires `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL` in `.env`.
- ffmpeg/ffprobe are bundled via `ffmpeg-static`/`ffprobe-static` (no system
  install needed, including on Azure).

## Not yet implemented

- **Apple sign-in** — same verify-a-token pattern as Google; the
  `authProviders` model and `findOrCreateFromProvider` service already support
  it.
- Web frontend origin isn't set on the Google client yet (mobile-first launch).
