const { ApiError } = require('./error');

// ---------------------------------------------------------------------------
// AUTH STUB — INTENTIONALLY NOT IMPLEMENTED.
//
// Per CLAUDE.md, authentication/authorization is a restricted area and the
// auth strategy (JWT / Passport / Auth0 / ...) has not been decided yet.
// This file only defines the SHAPE that route protection will take, so
// feature routes can reference `requireAuth` today without committing to an
// implementation. The maintainer should fill this in.
//
// When implemented, `requireAuth` should:
//   - read the credential (cookie / Authorization header)
//   - verify it
//   - attach the authenticated user to req.user
//   - call next(), or next(new ApiError(401, ...)) on failure
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
function requireAuth(req, res, next) {
  return next(
    new ApiError(501, 'Authentication is not implemented yet (see CLAUDE.md).')
  );
}

// Optional-auth variant: attaches req.user if present, but never blocks.
// Currently a no-op passthrough until auth is implemented.
function attachUser(req, res, next) {
  return next();
}

module.exports = { requireAuth, attachUser };
