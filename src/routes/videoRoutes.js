const express = require('express');
const multer = require('multer');
const os = require('os');
const { body, param } = require('express-validator');

const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { ApiError } = require('../middleware/error');
const env = require('../config/env');
const ctrl = require('../controllers/videoController');

const router = express.Router();

const ACCEPTED_MIMETYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  'video/x-msvideo',
]);

const upload = multer({
  storage: multer.diskStorage({ destination: os.tmpdir() }),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ACCEPTED_MIMETYPES.has(file.mimetype)) {
      return cb(new ApiError(400, `Unsupported video type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

// Translates multer's own errors (file too large, etc.) into our standard
// error shape instead of letting them fall through as raw 500s.
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return next(new ApiError(400, `Upload error: ${err.message}`));
    }
    next(err);
  });
}

router.post(
  '/',
  requireAuth,
  handleUpload,
  [body('caption').optional().isString().trim().isLength({ max: 2200 })],
  validate,
  ctrl.uploadVideo
);

router.get('/:id', [param('id').isMongoId()], validate, ctrl.getVideo);

router.delete(
  '/:id',
  requireAuth,
  [param('id').isMongoId()],
  validate,
  ctrl.deleteVideo
);

module.exports = router;
