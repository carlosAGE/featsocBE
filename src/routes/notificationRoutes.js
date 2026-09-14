const express = require('express');
const { query } = require('express-validator');

const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

const router = express.Router();

router.get(
  '/',
  requireAuth,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('cursor').optional().isISO8601(),
  ],
  validate,
  ctrl.listNotifications
);

router.post('/read-all', requireAuth, ctrl.markAllRead);

module.exports = router;
