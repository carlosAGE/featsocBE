const Video = require('../models/Video');
const Comment = require('../models/Comment');
const { ApiError } = require('../middleware/error');
const { asyncHandler } = require('./postController');

const AUTHOR_FIELDS = 'username displayName avatarUrl';

// GET /api/videos/:id/comments?cursor=&limit=
//
// Top-level comments only (parentComment: null), newest first, same cursor
// convention as the feed.
const listComments = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const filter = { video: req.params.id, parentComment: null };
  if (req.query.cursor) {
    filter.createdAt = { $lt: new Date(req.query.cursor) };
  }

  const comments = await Comment.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('author', AUTHOR_FIELDS);

  const nextCursor =
    comments.length === limit ? comments[comments.length - 1].createdAt.toISOString() : null;

  res.json({ data: comments, count: comments.length, nextCursor });
});

// POST /api/videos/:id/comments  (requires auth)
// body: { content, parentCommentId? }
const createComment = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');

  let parentComment = null;
  if (req.body.parentCommentId) {
    const parent = await Comment.findById(req.body.parentCommentId);
    if (!parent || String(parent.video) !== String(video.id)) {
      throw new ApiError(400, 'parentCommentId does not refer to a comment on this video');
    }
    // Replies always attach to the top-level comment — a reply-to-a-reply
    // flattens onto the same parent, one level of nesting only.
    parentComment = parent.parentComment || parent.id;
  }

  const comment = await Comment.create({
    video: video.id,
    author: req.user.id,
    content: req.body.content,
    parentComment,
  });
  video.commentCount += 1;
  await video.save();

  await comment.populate('author', AUTHOR_FIELDS);
  res.status(201).json({ data: comment });
});

// DELETE /api/comments/:id  (requires auth + ownership)
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'Comment not found');
  if (String(comment.author) !== String(req.user.id)) {
    throw new ApiError(403, 'You can only delete your own comments');
  }

  await comment.deleteOne();
  await Video.updateOne(
    { _id: comment.video, commentCount: { $gt: 0 } },
    { $inc: { commentCount: -1 } }
  );

  res.status(204).send();
});

module.exports = { listComments, createComment, deleteComment };
