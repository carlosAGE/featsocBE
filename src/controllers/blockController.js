const User = require('../models/User');
const Block = require('../models/Block');
const { ApiError } = require('../middleware/error');
const { asyncHandler } = require('./postController');

// POST /api/users/:id/block  (requires auth)
//
// Idempotent, same shape as follow/like. Blocking does not require an
// existing follow relationship, and doesn't touch it either — this is a
// content-visibility gate (see feedController's exclusion query), not a
// full mutual-interaction lock (no enforcement yet against the blocked user
// still being able to like/comment/follow) — flagged as a known limitation.
const blockUser = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  if (targetId === String(req.user.id)) {
    throw new ApiError(400, 'You cannot block yourself');
  }

  const target = await User.findById(targetId);
  if (!target) throw new ApiError(404, 'User not found');

  const existing = await Block.findOne({ blocker: req.user.id, blocked: targetId });
  if (!existing) {
    await Block.create({ blocker: req.user.id, blocked: targetId });
  }

  res.status(200).json({ data: { blocked: true } });
});

// DELETE /api/users/:id/block  (requires auth)
const unblockUser = asyncHandler(async (req, res) => {
  await Block.findOneAndDelete({ blocker: req.user.id, blocked: req.params.id });
  res.status(200).json({ data: { blocked: false } });
});

// Ids the viewer has blocked — used to exclude their videos from the
// viewer's own feed.
async function getBlockedUserIds(viewerId) {
  if (!viewerId) return [];
  const blocks = await Block.find({ blocker: viewerId }).select('blocked');
  return blocks.map((b) => String(b.blocked));
}

module.exports = { blockUser, unblockUser, getBlockedUserIds };
