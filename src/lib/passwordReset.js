const crypto = require('crypto');

const TOKEN_BYTES = 32;
const EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Generates a one-time reset token: the raw value goes to the user (in a
// real deployment, via email — see authController's forgotPassword for the
// current no-email-service limitation), only its sha256 hash is stored.
function createResetToken() {
  const rawToken = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + EXPIRY_MS);
  return { rawToken, tokenHash, expiresAt };
}

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = { createResetToken, hashResetToken };
