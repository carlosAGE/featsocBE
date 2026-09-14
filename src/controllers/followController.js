const User = require('../models/User');
const Follow = require('../models/Follow');
const { ApiError } = require('../middleware/error');
const { asyncHandler } = require('./postController');

const PUBLIC_FIELDS = 'username displayName avatarUrl followerCount followingCount';

// POST /api/users/:id/follow  (requires auth)
//
// Idempotent: following an already-followed user just returns the current
// state rather than erroring, so the client can fire-and-forget optimistic
// updates without checking prior state first.
const followUser = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  if (targetId === String(req.user.id)) {
    throw new ApiError(400, 'You cannot follow yourself');
  }

  const target = await User.findById(targetId);
  if (!target) throw new ApiError(404, 'User not found');

  const existing = await Follow.findOne({ follower: req.user.id, following: targetId });
  if (!existing) {
    await Follow.create({ follower: req.user.id, following: targetId });
    await Promise.all([
      User.updateOne({ _id: req.user.id }, { $inc: { followingCount: 1 } }),
      User.updateOne({ _id: targetId }, { $inc: { followerCount: 1 } }),
    ]);
  }

  res.status(200).json({ data: { following: true } });
});

// DELETE /api/users/:id/follow  (requires auth)
//
// Idempotent unlike-style unfollow: no-op if the edge doesn't exist.
const unfollowUser = asyncHandler(async (req, res) => {
  const targetId = req.params.id;

  const existing = await Follow.findOneAndDelete({
    follower: req.user.id,
    following: targetId,
  });
  if (existing) {
    await Promise.all([
      User.updateOne(
        { _id: req.user.id, followingCount: { $gt: 0 } },
        { $inc: { followingCount: -1 } }
      ),
      User.updateOne({ _id: targetId, followerCount: { $gt: 0 } }, { $inc: { followerCount: -1 } }),
    ]);
  }

  res.status(200).json({ data: { following: false } });
});

// GET /api/users/:id/followers?cursor=&limit=
const listFollowers = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const filter = { following: req.params.id };
  if (req.query.cursor) {
    filter.createdAt = { $lt: new Date(req.query.cursor) };
  }

  const follows = await Follow.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('follower', PUBLIC_FIELDS);

  const nextCursor =
    follows.length === limit ? follows[follows.length - 1].createdAt.toISOString() : null;

  res.json({ data: follows.map((f) => f.follower), count: follows.length, nextCursor });
});

// GET /api/users/:id/following?cursor=&limit=
const listFollowing = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const filter = { follower: req.params.id };
  if (req.query.cursor) {
    filter.createdAt = { $lt: new Date(req.query.cursor) };
  }

  const follows = await Follow.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('following', PUBLIC_FIELDS);

  const nextCursor =
    follows.length === limit ? follows[follows.length - 1].createdAt.toISOString() : null;

  res.json({ data: follows.map((f) => f.following), count: follows.length, nextCursor });
});

module.exports = { followUser, unfollowUser, listFollowers, listFollowing };
