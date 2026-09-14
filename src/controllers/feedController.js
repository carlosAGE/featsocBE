const Video = require('../models/Video');
const Follow = require('../models/Follow');
const { asyncHandler } = require('./postController');
const { getLikedVideoIdSet } = require('./likeController');

const OWNER_FIELDS = 'username displayName avatarUrl';

// Attaches isLiked (false when there's no signed-in viewer) without a join
// per video — one extra query for the whole page.
async function withLikedState(videos, viewerId) {
  const likedSet = await getLikedVideoIdSet(viewerId, videos.map((v) => v.id));
  return videos.map((v) => ({ ...v.toJSON(), isLiked: likedSet.has(v.id) }));
}

// GET /api/feed?cursor=&limit=
//
// The "For You" feed: every video, newest first. MVP ranking is pure
// recency — likeCount/commentCount/viewCount are tracked on the video doc
// so a real engagement-weighted ranking can replace this sort once there's
// real usage data to tune it against (see ai-manager decision log: raw
// file serving over HLS follows the same "ship the loop, tune later" call).
// `cursor` is the createdAt of the last item the client has already seen —
// the same cursor style Posts already used via `before`, chosen so the feed
// stays stable while new videos land mid-scroll (no offset/skip-limit).
const getForYouFeed = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const filter = {};
  if (req.query.cursor) {
    filter.createdAt = { $lt: new Date(req.query.cursor) };
  }

  const videos = await Video.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('owner', OWNER_FIELDS);

  const nextCursor =
    videos.length === limit ? videos[videos.length - 1].createdAt.toISOString() : null;
  const data = await withLikedState(videos, req.user?.id);

  res.json({ data, count: data.length, nextCursor });
});

// GET /api/feed/following?cursor=&limit=  (requires auth)
//
// Same cursor/ranking convention as the "For You" feed, scoped to the
// accounts the current user follows.
const getFollowingFeed = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);

  const follows = await Follow.find({ follower: req.user.id }).select('following');
  const followingIds = follows.map((f) => f.following);

  if (followingIds.length === 0) {
    return res.json({ data: [], count: 0, nextCursor: null });
  }

  const filter = { owner: { $in: followingIds } };
  if (req.query.cursor) {
    filter.createdAt = { $lt: new Date(req.query.cursor) };
  }

  const videos = await Video.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('owner', OWNER_FIELDS);

  const nextCursor =
    videos.length === limit ? videos[videos.length - 1].createdAt.toISOString() : null;
  const data = await withLikedState(videos, req.user.id);

  res.json({ data, count: data.length, nextCursor });
});

module.exports = { getForYouFeed, getFollowingFeed };
