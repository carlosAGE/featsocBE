const { asyncHandler } = require('./postController');
const { ApiError } = require('../middleware/error');
const { verifyGoogleIdToken } = require('../lib/googleVerify');
const {
  findOrCreateFromProvider,
  createLocalUser,
} = require('../services/authService');
const { signAuthToken } = require('../lib/jwt');
const { hashPassword, verifyPassword } = require('../lib/password');
const { createResetToken, hashResetToken } = require('../lib/passwordReset');
const { setAuthCookie, clearAuthCookie } = require('../lib/cookie');
const env = require('../config/env');
const User = require('../models/User');

// Signs a session JWT, sets the httpOnly cookie (web), and returns the shared
// auth response body. `token` is also in the body for native clients. Every
// auth endpoint uses this so the client sees one consistent contract.
function issueSession(res, user, extra = {}) {
  const token = signAuthToken(user.id);
  setAuthCookie(res, token);
  return { token, user, ...extra };
}

// POST /api/auth/signup  — email/password registration.
// Body: { email, password }
const signup = asyncHandler(async (req, res) => {
  const email = String(req.body.email).trim().toLowerCase();
  const { password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An account with that email already exists');
  }

  const passwordHash = await hashPassword(password);
  const user = await createLocalUser({ email, passwordHash });

  res.status(201).json(issueSession(res, user, { created: true }));
});

// POST /api/auth/login  — email/password sign in.
// Body: { email, password }
const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email).trim().toLowerCase();
  const { password } = req.body;

  // passwordHash is select:false, so ask for it explicitly.
  const user = await User.findOne({ email }).select('+passwordHash');

  // One generic error for "no such user", "social-only account", and "wrong
  // password" so we don't leak which emails exist.
  const ok = user && (await verifyPassword(password, user.passwordHash));
  if (!ok) {
    throw new ApiError(401, 'Invalid email or password');
  }

  res.json(issueSession(res, user));
});

// POST /api/auth/google  — sign in with a Google ID token.
// Body: { idToken }
const googleSignIn = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  let profile;
  try {
    profile = await verifyGoogleIdToken(idToken);
  } catch (err) {
    throw new ApiError(401, 'Invalid Google token');
  }

  if (!profile.email) {
    throw new ApiError(400, 'Google account has no email');
  }

  const { user, created } = await findOrCreateFromProvider('google', profile);

  res.status(created ? 201 : 200).json(issueSession(res, user, { created }));
});

// GET /api/auth/me — current authenticated user (requireAuth populates req.user)
const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout — clears the session cookie.
const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
});

// POST /api/auth/forgot-password — Body: { email }
//
// Always responds 200 with the same generic message regardless of whether
// the email exists or is social-only — the response must not leak which
// emails have accounts.
//
// NO EMAIL SERVICE EXISTS YET. In a real deployment the raw reset link
// would be emailed to the user; this project has no email-sending
// integration configured (and adding one needs a provider + API key this
// agent doesn't have access to). As a stopgap, non-production environments
// get the raw token back in the response body so the reset flow is
// actually testable end to end — production never does. This is a
// deliberate, documented gap, not a finished delivery mechanism.
const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email).trim().toLowerCase();
  const user = await User.findOne({ email });

  const genericBody = {
    message: 'If an account with that email exists, a password reset link has been sent.',
  };

  if (!user) {
    res.json(genericBody);
    return;
  }

  const { rawToken, tokenHash, expiresAt } = createResetToken();
  user.resetPasswordTokenHash = tokenHash;
  user.resetPasswordExpires = expiresAt;
  await user.save();

  // Stand-in for an email send — see the doc comment above.
  // eslint-disable-next-line no-console
  console.log(`[auth] password reset token for ${email} (expires ${expiresAt.toISOString()}): ${rawToken}`);

  res.json(env.isProd ? genericBody : { ...genericBody, devResetToken: rawToken });
});

// POST /api/auth/reset-password — Body: { token, password }
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const tokenHash = hashResetToken(token);

  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordTokenHash +resetPasswordExpires');

  if (!user) {
    throw new ApiError(400, 'This reset link is invalid or has expired');
  }

  user.passwordHash = await hashPassword(password);
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  // A password reset is also a good time to add the local provider, in case
  // this was a social-only account setting a password for the first time.
  if (!user.authProviders.some((p) => p.provider === 'local')) {
    user.authProviders.push({ provider: 'local', providerId: null });
  }
  await user.save();

  res.json(issueSession(res, user));
});

module.exports = { signup, login, googleSignIn, me, logout, forgotPassword, resetPassword };
