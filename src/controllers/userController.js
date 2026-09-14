const User = require('../models/User');
const Follow = require('../models/Follow');
const { asyncHandler } = require('./postController');
const { ApiError } = require('../middleware/error');

// GET /api/users
const listUsers = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const users = await User.find().sort({ createdAt: -1 }).limit(limit);
  res.json({ data: users, count: users.length });
});

// GET /api/users/:id
//
// isFollowing reflects the signed-in viewer, if any (attachUser is a soft
// gate — this route stays public), same pattern as isLiked on videos.
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  let isFollowing = false;
  if (req.user) {
    const edge = await Follow.findOne({ follower: req.user.id, following: user.id });
    isFollowing = Boolean(edge);
  }

  res.json({ data: { ...user.toJSON(), isFollowing } });
});

// POST /api/users
// NOTE: this creates a profile record only. It does NOT set up credentials —
// registration/login belongs to the (restricted, undecided) auth layer.
const createUser = asyncHandler(async (req, res) => {
  const { username, email, displayName, bio, avatarUrl } = req.body;
  const user = await User.create({
    username,
    email,
    displayName,
    bio,
    avatarUrl,
  });
  res.status(201).json({ data: user });
});

module.exports = { listUsers, getUser, createUser };
