const bcrypt = require('bcrypt');
const env = require('../config/env');

// Password hashing/verification, isolated so the algorithm and cost live in
// one place. Cost is configurable via BCRYPT_ROUNDS (default 12).

function hashPassword(plain) {
  return bcrypt.hash(plain, env.bcryptRounds);
}

function verifyPassword(plain, hash) {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, verifyPassword };
