const Video = require('../models/Video');
const Like = require('../models/Like');
const { ApiError } = require('../middleware/error');
const { asyncHandler } = require('./postController');

// POST /api/videos/:id/like  (requires auth)
//
// Idempotent: liking an already-liked video just returns the current count
// rather than erroring — lets the client optimistically PUT its intended
// end state without checking prior state first.
const likeVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');

  const existing = await Like.findOne({ user: req.user.id, video: video.id });
  if (!existing) {
    await Like.create({ user: req.user.id, video: video.id });
    video.likeCount += 1;
    await video.save();
  }

  res.status(200).json({ data: { liked: true, likeCount: video.likeCount } });
});

// DELETE /api/videos/:id/like  (requires auth)
const unlikeVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');

  const existing = await Like.findOneAndDelete({ user: req.user.id, video: video.id });
  if (existing && video.likeCount > 0) {
    video.likeCount -= 1;
    await video.save();
  }

  res.status(200).json({ data: { liked: false, likeCount: video.likeCount } });
});

// Batch-checks which of the given video ids a user has liked. Used by feed/
// listing endpoints so the client isn't stuck guessing "isLiked" on first
// load — without this every reload would show every heart as unfilled
// regardless of actual like state.
async function getLikedVideoIdSet(userId, videoIds) {
  if (!userId || videoIds.length === 0) return new Set();
  const likes = await Like.find({ user: userId, video: { $in: videoIds } }).select('video');
  return new Set(likes.map((like) => String(like.video)));
}

module.exports = { likeVideo, unlikeVideo, getLikedVideoIdSet };
