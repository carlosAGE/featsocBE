const express = require('express');
const { body, param, query } = require('express-validator');

const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/postController');

const router = express.Router();

router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('before').optional().isISO8601(),
  ],
  validate,
  ctrl.listPosts
);

router.get(
  '/:id',
  [param('id').isMongoId()],
  validate,
  ctrl.getPost
);

router.post(
  '/',
  requireAuth,
  [body('content').isString().trim().notEmpty().isLength({ max: 5000 })],
  validate,
  ctrl.createPost
);

router.patch(
  '/:id',
  requireAuth,
  [
    param('id').isMongoId(),
    body('content').optional().isString().trim().notEmpty().isLength({ max: 5000 }),
  ],
  validate,
  ctrl.updatePost
);

router.delete(
  '/:id',
  requireAuth,
  [param('id').isMongoId()],
  validate,
  ctrl.deletePost
);

module.exports = router;
