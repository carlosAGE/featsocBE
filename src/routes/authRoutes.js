const express = require('express');
const { body } = require('express-validator');

const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const ctrl = require('../controllers/authController');

const router = express.Router();

// Auth endpoints are rate-limited harder than the rest of the API, since
// sign-up/sign-in are the prime abuse targets.

// Email/password registration.
router.post(
  '/signup',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('A valid email is required'),
    body('password')
      .isString()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  validate,
  ctrl.signup
);

// Social sign-in (Google).
router.post(
  '/google',
  authLimiter,
  [body('idToken').isString().trim().notEmpty()],
  validate,
  ctrl.googleSignIn
);

router.get('/me', requireAuth, ctrl.me);
router.post('/logout', ctrl.logout);

module.exports = router;
