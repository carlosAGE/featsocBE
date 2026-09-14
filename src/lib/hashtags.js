// Extracts #hashtags out of a caption — lowercased, deduped, in the order
// they first appear. Hashtags live inline in the caption text (same as
// TikTok — there's no separate "tags" input); this just indexes them.
const HASHTAG_PATTERN = /#([a-z0-9_]+)/gi;

function extractHashtags(caption) {
  if (!caption) return [];
  const seen = new Set();
  const matches = caption.matchAll(HASHTAG_PATTERN);
  for (const match of matches) {
    seen.add(match[1].toLowerCase());
  }
  return [...seen];
}

module.exports = { extractHashtags };
