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

## Authentication

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

## Not yet implemented

- **Email/password sign-up** (`bcrypt` is installed and the `passwordHash`
  field exists; routes are next).
- **Apple sign-in** — same verify-a-token pattern as Google; the
  `authProviders` model and `findOrCreateFromProvider` service already support
  it.
- Web frontend origin isn't set on the Google client yet (mobile-first launch).
