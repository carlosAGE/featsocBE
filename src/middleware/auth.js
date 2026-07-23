const { ApiError } = require('./error');
const { verifyAuthToken } = require('../lib/jwt');
const User = require('../models/User');
const env = require('../config/env');

// Reads the session JWT from the httpOnly cookie, falling back to a
// `Authorization: Bearer <token>` header (useful for native clients).
function readToken(req) {
  const fromCookie = req.cookies && req.cookies[env.cookieName];
  if (fromCookie) return fromCookie;

  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();

  return null;
}

// Resolves the token to a live user document, or null if anything is off.
async function resolveUser(req) {
  const token = readToken(req);
  if (!token) return null;

  let payload;
  try {
    payload = verifyAuthToken(token);
  } catch {
    return null; // invalid or expired
  }

  const user = await User.findById(payload.sub);
  return user || null;
}

// Hard gate: 401s if there's no valid session.
async function requireAuth(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) return next(new ApiError(401, 'Authentication required'));
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

// Soft variant: attaches req.user when present, never blocks.
async function attachUser(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (user) req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAuth, attachUser };
