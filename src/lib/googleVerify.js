const { OAuth2Client } = require('google-auth-library');
const env = require('../config/env');

// Verifies a Google ID token (the credential the frontend / iOS client gets
// from Google Identity Services) and returns a normalized profile.
//
// This is isolated in its own module so it can be mocked in tests and so the
// verification logic lives in exactly one place.

const client = new OAuth2Client();

async function verifyGoogleIdToken(idToken) {
  if (!env.googleClientIds.length) {
    throw new Error('GOOGLE_CLIENT_ID is not set — cannot verify Google tokens.');
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.googleClientIds, // accepts any of the configured client ids
  });

  const payload = ticket.getPayload();

  return {
    providerId: payload.sub, // stable Google user id
    email: payload.email,
    emailVerified: Boolean(payload.email_verified),
    name: payload.name,
    picture: payload.picture,
  };
}

module.exports = { verifyGoogleIdToken };
