const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const Video = require('../models/Video');
const { ApiError } = require('../middleware/error');
const { uploadFile, deleteFile } = require('../lib/r2Client');
const { probe, normalize, generateThumbnail } = require('../services/videoProcessing');

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
const getVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id).populate(
    'owner',
    'username displayName avatarUrl'
  );
  if (!video) throw new ApiError(404, 'Video not found');
  res.json({ data: video });
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

module.exports = { asyncHandler, uploadVideo, getVideo, deleteVideo };
