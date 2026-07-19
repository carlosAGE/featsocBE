const express = require('express');
const { body, param, query } = require('express-validator');

const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/userController');

const router = express.Router();

router.get(
  '/',
  [query('limit').optional().isInt({ min: 1, max: 100 }).toInt()],
  validate,
  ctrl.listUsers
);

router.get(
  '/:id',
  [param('id').isMongoId()],
  validate,
  ctrl.getUser
);

router.post(
  '/',
  [
    body('username').isString().trim().isLength({ min: 3, max: 30 }),
    body('email').isEmail().normalizeEmail(),
    body('displayName').optional().isString().trim().isLength({ max: 60 }),
    body('bio').optional().isString().isLength({ max: 280 }),
    body('avatarUrl').optional().isURL(),
  ],
  validate,
  ctrl.createUser
);

module.exports = router;
