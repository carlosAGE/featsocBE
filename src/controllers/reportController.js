const Report = require('../models/Report');
const { asyncHandler } = require('./postController');

// POST /api/reports  (requires auth)
// body: { targetType: 'video'|'comment'|'user', targetId, reason? }
const createReport = asyncHandler(async (req, res) => {
  const report = await Report.create({
    reporter: req.user.id,
    targetType: req.body.targetType,
    targetId: req.body.targetId,
    reason: req.body.reason || '',
  });
  res.status(201).json({ data: report });
});

module.exports = { createReport };
