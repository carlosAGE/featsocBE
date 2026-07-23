const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { ApiError } = require('./error');

// Rate limiting / abuse prevention. Two tiers:
//   - apiLimiter:  a generous global cap on every /api request
//   - authLimiter: a tight cap on auth endpoints (sign-in is a prime target
//                  for credential-stuffing / token-guessing abuse)
//
// Both are skipped under NODE_ENV=test so the suite stays deterministic; the
// factory itself is exercised directly in tests/rateLimit.test.js.

function createRateLimiter({ windowMs, max, message, skip }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // RateLimit-* headers
    legacyHeaders: false,
    ...(skip ? { skip } : {}),
    // Route the 429 through our normal error shape.
    handler: (req, res, next) => {
      next(new ApiError(429, message || 'Too many requests, please slow down.'));
    },
  });
}

// The wired-up limiters skip under NODE_ENV=test so the suite stays
// deterministic; the factory itself is exercised in tests/rateLimit.test.js.
const skipInTest = () => env.isTest;

// Global: 300 requests / 15 min / IP.
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many requests, please slow down.',
  skip: skipInTest,
});

// Auth: 10 attempts / 15 min / IP.
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again later.',
  skip: skipInTest,
});

module.exports = { createRateLimiter, apiLimiter, authLimiter };
