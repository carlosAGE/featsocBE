const express = require('express');
const { query } = require('express-validator');

const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/feedController');

const router = express.Router();

const paginationValidators = [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('cursor').optional().isISO8601(),
];

router.get('/', paginationValidators, validate, ctrl.getForYouFeed);
router.get('/following', requireAuth, paginationValidators, validate, ctrl.getFollowingFeed);

module.exports = router;
