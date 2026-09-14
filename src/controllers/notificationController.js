const Notification = require('../models/Notification');
const { asyncHandler } = require('./postController');

const ACTOR_FIELDS = 'username displayName avatarUrl';
const VIDEO_FIELDS = 'caption thumbnailUrl';

// GET /api/notifications?cursor=&limit=  (requires auth)
const listNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const filter = { recipient: req.user.id };
  if (req.query.cursor) {
    filter.createdAt = { $lt: new Date(req.query.cursor) };
  }

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actor', ACTOR_FIELDS)
      .populate('video', VIDEO_FIELDS),
    Notification.countDocuments({ recipient: req.user.id, readAt: null }),
  ]);

  const data = notifications.map((n) => ({ ...n.toJSON(), isRead: Boolean(n.readAt) }));
  const nextCursor =
    notifications.length === limit ? notifications[notifications.length - 1].createdAt.toISOString() : null;

  res.json({ data, count: data.length, nextCursor, unreadCount });
});

// POST /api/notifications/read-all  (requires auth)
//
// One bulk action rather than per-notification toggling — matches the
// common "open the inbox, everything's read now" pattern.
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user.id, readAt: null },
    { $set: { readAt: new Date() } }
  );
  res.status(200).json({ data: { ok: true } });
});

module.exports = { listNotifications, markAllRead };
