const express = require('express');
const { param, query } = require('express-validator');

const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/videoController');

const router = express.Router();

router.get(
  '/:tag/videos',
  [
    param('tag').isString().trim().isLength({ min: 1, max: 100 }),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('cursor').optional().isISO8601(),
  ],
  validate,
  ctrl.listVideosByHashtag
);

module.exports = router;
