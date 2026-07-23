// Central place where every environment variable is read.
// Nothing else in the app should touch process.env directly — import from here.
// This keeps the "read env only via process.env, document in .env.example"
// convention enforceable in one file.

require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  port: parseInt(process.env.PORT || '3000', 10),

  // In test we spin up an in-memory Mongo, so a URI isn't required there.
  mongoUri:
    process.env.NODE_ENV === 'test'
      ? process.env.MONGODB_URI // may be undefined; test setup provides its own
      : required('MONGODB_URI', 'mongodb://127.0.0.1:27017/featsoc'),

  // Comma-separated origins -> array. "*" allows all (dev only).
  corsOrigin: (process.env.CORS_ORIGIN || '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  // --- Auth ---
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  cookieName: process.env.COOKIE_NAME || 'featsoc_token',
  cookieSameSite: (process.env.COOKIE_SAMESITE || 'lax').toLowerCase(),
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,

  // Google OAuth client id(s) accepted when verifying ID tokens. Supports a
  // comma-separated list so a web client id and native/iOS client id can both
  // be honored.
  googleClientIds: (process.env.GOOGLE_CLIENT_ID || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
};

module.exports = env;
