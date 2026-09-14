const User = require('../models/User');
const { asyncHandler } = require('./postController');

// POST /api/push-tokens  (requires auth)
// body: { token }
//
// $addToSet keeps this idempotent — registering the same token twice (e.g.
// app relaunch) is a no-op, not a duplicate.
const registerPushToken = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $addToSet: { pushTokens: req.body.token } });
  res.status(200).json({ data: { ok: true } });
});

// DELETE /api/push-tokens  (requires auth)
// body: { token }
//
// Best-effort unregister on logout — not required (stale tokens also get
// pruned lazily when Expo reports DeviceNotRegistered), but avoids sending
// pushes to a device the user explicitly signed out of.
const unregisterPushToken = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $pull: { pushTokens: req.body.token } });
  res.status(200).json({ data: { ok: true } });
});

module.exports = { registerPushToken, unregisterPushToken };
