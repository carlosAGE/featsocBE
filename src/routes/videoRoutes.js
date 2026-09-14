const express = require('express');
const multer = require('multer');
const os = require('os');
const { body, param, query } = require('express-validator');

const { validate } = require('../middleware/validate');
const { requireAuth, attachUser } = require('../middleware/auth');
const { ApiError } = require('../middleware/error');
const env = require('../config/env');
const ctrl = require('../controllers/videoController');
const likeCtrl = require('../controllers/likeController');
const commentCtrl = require('../controllers/commentController');

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
  [
    body('caption').optional().isString().trim().isLength({ max: 2200 }),
    body('soundCredit').optional().isString().trim().isLength({ max: 100 }),
    body('privacy').optional().isIn(['public', 'private']),
  ],
  validate,
  ctrl.uploadVideo
);

router.get('/:id', attachUser, [param('id').isMongoId()], validate, ctrl.getVideo);

router.patch(
  '/:id',
  requireAuth,
  [
    param('id').isMongoId(),
    body('caption').optional().isString().trim().isLength({ max: 2200 }),
    body('privacy').optional().isIn(['public', 'private']),
  ],
  validate,
  ctrl.updateVideo
);

router.delete(
  '/:id',
  requireAuth,
  [param('id').isMongoId()],
  validate,
  ctrl.deleteVideo
);

router.post(
  '/:id/like',
  requireAuth,
  [param('id').isMongoId()],
  validate,
  likeCtrl.likeVideo
);

router.delete(
  '/:id/like',
  requireAuth,
  [param('id').isMongoId()],
  validate,
  likeCtrl.unlikeVideo
);

const paginationValidators = [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('cursor').optional().isISO8601(),
];

router.get(
  '/:id/comments',
  [param('id').isMongoId(), ...paginationValidators],
  validate,
  commentCtrl.listComments
);

router.post(
  '/:id/comments',
  requireAuth,
  [
    param('id').isMongoId(),
    body('content').isString().trim().isLength({ min: 1, max: 500 }),
    body('parentCommentId').optional().isMongoId(),
  ],
  validate,
  commentCtrl.createComment
);

module.exports = router;
