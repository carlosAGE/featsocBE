const express = require('express');

const authRoutes = require('./authRoutes');
const postRoutes = require('./postRoutes');
const userRoutes = require('./userRoutes');
const videoRoutes = require('./videoRoutes');
const feedRoutes = require('./feedRoutes');
const commentRoutes = require('./commentRoutes');
const notificationRoutes = require('./notificationRoutes');
const reportRoutes = require('./reportRoutes');

// Aggregates all feature routers under /api (mounted in app.js)
// New features add one line here plus their own routes/controller/model/test.
const router = express.Router();

router.use('/auth', authRoutes);
router.use('/posts', postRoutes);
router.use('/users', userRoutes);
router.use('/videos', videoRoutes);
router.use('/feed', feedRoutes);
router.use('/comments', commentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
