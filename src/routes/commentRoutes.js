const express = require('express');
const { param } = require('express-validator');

const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/commentController');

const router = express.Router();

// Deleting a comment isn't scoped under /videos/:videoId since a comment id
// alone is enough to look it up and check ownership.
router.delete(
  '/:id',
  requireAuth,
  [param('id').isMongoId()],
  validate,
  ctrl.deleteComment
);

module.exports = router;
