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

| Method | Path             | Notes                        |
| ------ | ---------------- | ---------------------------- |
| GET    | `/health`        | health probe                 |
| GET    | `/api/posts`     | list posts (`?limit&before`) |
| POST   | `/api/posts`     | create post                  |
| GET    | `/api/posts/:id` | get one                      |
| PATCH  | `/api/posts/:id` | update                       |
| DELETE | `/api/posts/:id` | delete                       |
| GET    | `/api/users`     | list users                   |
| POST   | `/api/users`     | create profile               |
| GET    | `/api/users/:id` | get one                      |

## Not yet implemented

- **Authentication / authorization.** The strategy is undecided and is a
  restricted area (see CLAUDE.md). `src/middleware/auth.js` defines the shape
  (`requireAuth`) but returns `501` until implemented. Post/User creation
  currently takes `author` from the body as a placeholder.
