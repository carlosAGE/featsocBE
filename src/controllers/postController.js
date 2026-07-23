const Post = require('../models/Post');
const { ApiError } = require('../middleware/error');

// Small wrapper so async controller errors reach the error handler
// without a try/catch in every function.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/posts?limit=&before=
const listPosts = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const filter = {};
  if (req.query.before) {
    filter.createdAt = { $lt: new Date(req.query.before) };
  }

  const posts = await Post.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('author', 'username displayName avatarUrl');

  res.json({ data: posts, count: posts.length });
});

// GET /api/posts/:id
const getPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).populate(
    'author',
    'username displayName avatarUrl'
  );
  if (!post) throw new ApiError(404, 'Post not found');
  res.json({ data: post });
});

// Only the author may modify a post. Throws 403 otherwise.
function assertOwner(post, req) {
  if (!post.author || String(post.author) !== String(req.user.id)) {
    throw new ApiError(403, 'You can only modify your own posts');
  }
}

// POST /api/posts  (requires auth)
const createPost = asyncHandler(async (req, res) => {
  const { content } = req.body;
  // Author is always the authenticated user — never trusted from the body.
  const post = await Post.create({ content, author: req.user.id });
  res.status(201).json({ data: post });
});

// PATCH /api/posts/:id  (requires auth + ownership)
const updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new ApiError(404, 'Post not found');
  assertOwner(post, req);

  if (typeof req.body.content === 'string') {
    post.content = req.body.content;
  }
  await post.save();
  res.json({ data: post });
});

// DELETE /api/posts/:id  (requires auth + ownership)
const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new ApiError(404, 'Post not found');
  assertOwner(post, req);

  await post.deleteOne();
  res.status(204).send();
});

module.exports = {
  asyncHandler,
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
};
