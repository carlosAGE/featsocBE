const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const Video = require('../models/Video');
const User = require('../models/User');
const Follow = require('../models/Follow');
const { ApiError } = require('../middleware/error');
const { uploadFile, deleteFile } = require('../lib/r2Client');
const { probe, normalize, generateThumbnail } = require('../services/videoProcessing');
const { getLikedVideoIdSet } = require('./likeController');
const { containsBannedContent } = require('../lib/contentFilter');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Best-effort local temp file cleanup — upload/processing failures shouldn't
// leave orphaned files on disk, but a cleanup failure itself shouldn't mask
// the real error.
async function cleanup(paths) {
  await Promise.all(
    paths.map((p) =>
      fsp.unlink(p).catch(() => {})
    )
  );
}

// POST /api/videos  (requires auth, multipart form: file=<video>, caption=<string?>)
//
// Single-shot upload: the raw file is proxied through this server (multer ->
// disk), normalized with ffmpeg, then the result is pushed to R2. See
// PROJECT_LOG.md for why this was chosen over presigned/resumable upload for
// the MVP.
const uploadVideo = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'A video file is required (field name "file")');
  if (containsBannedContent(req.body.caption)) {
    throw new ApiError(400, 'Caption violates community guidelines');
  }

  const rawPath = req.file.path;
  const id = crypto.randomUUID();
  const normalizedPath = path.join(os.tmpdir(), `${id}-normalized.mp4`);
  const thumbnailPath = path.join(os.tmpdir(), `${id}-thumb.jpg`);
  const tempPaths = [rawPath, normalizedPath, thumbnailPath];

  try {
    const rawInfo = await probe(rawPath).catch(() => null);
    if (!rawInfo || !rawInfo.durationSeconds) {
      throw new ApiError(400, 'Could not read the uploaded file as a video');
    }

    await normalize(rawPath, normalizedPath);

    const thumbnailAt = Math.min(1, rawInfo.durationSeconds / 2);
    await generateThumbnail(normalizedPath, thumbnailPath, thumbnailAt);

    const finalInfo = await probe(normalizedPath);
    const stat = await fsp.stat(normalizedPath);

    const videoKey = `videos/${id}.mp4`;
    const thumbnailKey = `thumbnails/${id}.jpg`;

    const videoUrl = await uploadFile(
      videoKey,
      fs.createReadStream(normalizedPath),
      'video/mp4'
    );
    const thumbnailUrl = await uploadFile(
      thumbnailKey,
      fs.createReadStream(thumbnailPath),
      'image/jpeg'
    );

    const video = await Video.create({
      owner: req.user.id,
      caption: req.body.caption || '',
      key: videoKey,
      url: videoUrl,
      thumbnailKey,
      thumbnailUrl,
      durationSeconds: finalInfo.durationSeconds || rawInfo.durationSeconds,
      width: finalInfo.width,
      height: finalInfo.height,
      sizeBytes: stat.size,
    });

    res.status(201).json({ data: video });
  } finally {
    await cleanup(tempPaths);
  }
});

// GET /api/videos/:id
//
// MVP view counting: every fetch of the detail view counts as a view, no
// dedup/session tracking yet. Simple and honest for now; revisit if view
// count needs to be gamed-resistant later.
const getVideo = asyncHandler(async (req, res) => {
  const video = await Video.findByIdAndUpdate(
    req.params.id,
    { $inc: { viewCount: 1 } },
    { new: true }
  ).populate('owner', 'username displayName avatarUrl');
  if (!video) throw new ApiError(404, 'Video not found');

  const likedSet = await getLikedVideoIdSet(req.user?.id, [video.id]);
  res.json({ data: { ...video.toJSON(), isLiked: likedSet.has(video.id) } });
});

// DELETE /api/videos/:id  (requires auth + ownership)
const deleteVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, 'Video not found');
  if (String(video.owner) !== String(req.user.id)) {
    throw new ApiError(403, 'You can only delete your own videos');
  }

  await Promise.all([
    deleteFile(video.key).catch(() => {}),
    video.thumbnailKey ? deleteFile(video.thumbnailKey).catch(() => {}) : null,
  ]);
  await video.deleteOne();
  res.status(204).send();
});

// GET /api/users/:id/videos?cursor=&limit=  (public route, but gated —
// see below)
//
// A private account's videos are hidden from anyone who isn't the owner or
// an existing follower. attachUser is a soft gate so this stays a public
// route for non-private accounts.
const listVideosByOwner = asyncHandler(async (req, res) => {
  const owner = await User.findById(req.params.id).select('isPrivate');
  if (!owner) throw new ApiError(404, 'User not found');

  if (owner.isPrivate && String(owner.id) !== String(req.user?.id)) {
    const isFollower = req.user
      ? Boolean(await Follow.findOne({ follower: req.user.id, following: owner.id }))
      : false;
    if (!isFollower) {
      return res.json({ data: [], count: 0, nextCursor: null, private: true });
    }
  }

  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const filter = { owner: req.params.id };
  if (req.query.cursor) {
    filter.createdAt = { $lt: new Date(req.query.cursor) };
  }

  const videos = await Video.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('owner', 'username displayName avatarUrl');

  const nextCursor =
    videos.length === limit ? videos[videos.length - 1].createdAt.toISOString() : null;

  res.json({ data: videos, count: videos.length, nextCursor });
});

module.exports = { asyncHandler, uploadVideo, getVideo, deleteVideo, listVideosByOwner };
