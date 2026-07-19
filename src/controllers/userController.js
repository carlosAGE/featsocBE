const User = require('../models/User');
const { asyncHandler } = require('./postController');
const { ApiError } = require('../middleware/error');

// GET /api/users
const listUsers = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const users = await User.find().sort({ createdAt: -1 }).limit(limit);
  res.json({ data: users, count: users.length });
});

// GET /api/users/:id
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ data: user });
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
