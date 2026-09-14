const User = require('../models/User');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
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
// isFollowing/isBlocked reflect the signed-in viewer, if any (attachUser is
// a soft gate — this route stays public), same pattern as isLiked on videos.
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  let isFollowing = false;
  let isBlocked = false;
  if (req.user) {
    const [followEdge, blockEdge] = await Promise.all([
      Follow.findOne({ follower: req.user.id, following: user.id }),
      Block.findOne({ blocker: req.user.id, blocked: user.id }),
    ]);
    isFollowing = Boolean(followEdge);
    isBlocked = Boolean(blockEdge);
  }

  res.json({ data: { ...user.toJSON(), isFollowing, isBlocked } });
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

// PATCH /api/users/:id  (requires auth + ownership)
//
// Only profile-display fields are editable here — username/email (unique,
// identity-bearing) and anything auth-related are out of scope for this
// route by design, not just by omission.
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (String(user.id) !== String(req.user.id)) {
    throw new ApiError(403, 'You can only edit your own profile');
  }

  if (typeof req.body.displayName === 'string') user.displayName = req.body.displayName;
  if (typeof req.body.bio === 'string') user.bio = req.body.bio;
  if (typeof req.body.avatarUrl === 'string') user.avatarUrl = req.body.avatarUrl;
  if (typeof req.body.isPrivate === 'boolean') user.isPrivate = req.body.isPrivate;

  await user.save();
  res.json({ data: { ...user.toJSON(), isFollowing: false, isBlocked: false } });
});

module.exports = { listUsers, getUser, createUser, updateUser };
