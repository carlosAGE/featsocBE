const express = require('express');
const { body } = require('express-validator');

const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/pushTokenController');

const router = express.Router();

const tokenValidator = [body('token').isString().trim().isLength({ min: 1, max: 200 })];

router.post('/', requireAuth, tokenValidator, validate, ctrl.registerPushToken);
router.delete('/', requireAuth, tokenValidator, validate, ctrl.unregisterPushToken);

module.exports = router;
