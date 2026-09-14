const express = require('express');
const { body, param, query } = require('express-validator');

const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/userController');
const followCtrl = require('../controllers/followController');
const videoCtrl = require('../controllers/videoController');

const router = express.Router();

const paginationValidators = [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('cursor').optional().isISO8601(),
];

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

router.post(
  '/:id/follow',
  requireAuth,
  [param('id').isMongoId()],
  validate,
  followCtrl.followUser
);

router.delete(
  '/:id/follow',
  requireAuth,
  [param('id').isMongoId()],
  validate,
  followCtrl.unfollowUser
);

router.get(
  '/:id/followers',
  [param('id').isMongoId(), ...paginationValidators],
  validate,
  followCtrl.listFollowers
);

router.get(
  '/:id/following',
  [param('id').isMongoId(), ...paginationValidators],
  validate,
  followCtrl.listFollowing
);

router.get(
  '/:id/videos',
  [param('id').isMongoId(), ...paginationValidators],
  validate,
  videoCtrl.listVideosByOwner
);

module.exports = router;
