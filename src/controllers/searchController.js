const User = require('../models/User');
const Video = require('../models/Video');
const { asyncHandler } = require('./postController');

const OWNER_FIELDS = 'username displayName avatarUrl';

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/search?q=&limit=  (public)
//
// Users: case-insensitive substring match on username/displayName — a
// $text index does whole-word/stemmed matching, so searching "skate"
// wouldn't find "skateboardqueen"; substring is what search-as-you-type
// actually needs here, so users go through a regex instead.
// Videos: a $text index over caption + hashtags — captions are more
// naturally multi-word content where whole-word text search is the right
// fit, and it scores/ranks results rather than just matching.
// Private videos are excluded the same way the feed excludes them.
const search = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);

  if (!q) {
    return res.json({ data: { users: [], videos: [] } });
  }

  const userPattern = new RegExp(escapeRegex(q), 'i');

  const [users, videos] = await Promise.all([
    User.find({ $or: [{ username: userPattern }, { displayName: userPattern }] }).limit(limit),
    Video.find(
      { $text: { $search: q }, privacy: 'public' },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .populate('owner', OWNER_FIELDS),
  ]);

  res.json({ data: { users, videos } });
});

module.exports = { search };
