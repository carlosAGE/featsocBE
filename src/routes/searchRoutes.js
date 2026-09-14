const express = require('express');
const { query } = require('express-validator');

const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/searchController');

const router = express.Router();

router.get(
  '/',
  [
    query('q').optional().isString().trim().isLength({ max: 200 }),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  validate,
  ctrl.search
);

module.exports = router;
