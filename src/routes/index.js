const express = require('express');

const postRoutes = require('./postRoutes');
const userRoutes = require('./userRoutes');

// Aggregates all feature routers under /api (mounted in app.js).
// New features add one line here plus their own routes/controller/model/test.
const router = express.Router();

router.use('/posts', postRoutes);
router.use('/users', userRoutes);

module.exports = router;
