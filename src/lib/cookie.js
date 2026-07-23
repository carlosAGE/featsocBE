const env = require('../config/env');

// Centralizes how the session cookie is set and cleared so the flags stay
// consistent. SameSite=None requires Secure=true (browsers enforce this),
// which is the case for a cross-site frontend in production.
function buildCookieOptions() {
  const sameSite = env.cookieSameSite; // 'lax' | 'strict' | 'none'
  const secure = env.isProd || sameSite === 'none';
  return {
    httpOnly: true,
    sameSite,
    secure,
    domain: env.cookieDomain,
    path: '/',
  };
}

function setAuthCookie(res, token) {
  res.cookie(env.cookieName, token, {
    ...buildCookieOptions(),
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
}

function clearAuthCookie(res) {
  res.clearCookie(env.cookieName, buildCookieOptions());
}

module.exports = { setAuthCookie, clearAuthCookie };
