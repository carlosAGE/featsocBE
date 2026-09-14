const express = require('express');
const { body } = require('express-validator');

const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/reportController');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  [
    body('targetType').isIn(['video', 'comment', 'user']),
    body('targetId').isMongoId(),
    body('reason').optional().isString().trim().isLength({ max: 500 }),
  ],
  validate,
  ctrl.createReport
);

module.exports = router;
