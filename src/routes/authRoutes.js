const express = require('express');
const { body } = require('express-validator');

const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

const router = express.Router();

// Social sign-in (Google). Email/password routes will be added alongside
// this file as the next step.
router.post(
  '/google',
  [body('idToken').isString().trim().notEmpty()],
  validate,
  ctrl.googleSignIn
);

router.get('/me', requireAuth, ctrl.me);
router.post('/logout', ctrl.logout);

module.exports = router;
