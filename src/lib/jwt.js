const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Signs and verifies the session JWT. The token carries only the user id
// (`sub`); everything else is looked up fresh from the DB on each request.

function signAuthToken(userId) {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET is not set — cannot sign auth tokens.');
  }
  return jwt.sign({ sub: String(userId) }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function verifyAuthToken(token) {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET is not set — cannot verify auth tokens.');
  }
  return jwt.verify(token, env.jwtSecret); // throws on invalid/expired
}

module.exports = { signAuthToken, verifyAuthToken };
