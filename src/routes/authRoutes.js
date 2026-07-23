const express = require('express');
const { body } = require('express-validator');

const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const ctrl = require('../controllers/authController');

const router = express.Router();

// Social sign-in (Google). Rate-limited harder than the rest of the API,
// since sign-in is the prime abuse target. Email/password routes will be
// added alongside this file as the next step.
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
