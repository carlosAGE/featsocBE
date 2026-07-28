const { asyncHandler } = require('./postController');
const { ApiError } = require('../middleware/error');
const { verifyGoogleIdToken } = require('../lib/googleVerify');
const { findOrCreateFromProvider } = require('../services/authService');
const { signAuthToken } = require('../lib/jwt');
const { setAuthCookie, clearAuthCookie } = require('../lib/cookie');

// POST /api/auth/google
// Body: { idToken } — the Google ID token obtained by the client.
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

  const token = signAuthToken(user.id);
  setAuthCookie(res, token);

  // Web clients use the httpOnly cookie above; native (Android/iOS) clients
  // store this token and send it as `Authorization: Bearer <token>`.
  res.status(created ? 201 : 200).json({ data: user, created, token });
});

// GET /api/auth/me — current authenticated user (requireAuth populates req.user)
const me = asyncHandler(async (req, res) => {
  res.json({ data: req.user });
});

// POST /api/auth/logout — clears the session cookie.
const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
});

module.exports = { googleSignIn, me, logout };
