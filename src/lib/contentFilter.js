// Basic word-list profanity filter — deliberately simple for this baseline
// pass (chosen over a manual review queue, which would need an admin
// endpoint; admin/moderation routes are restricted to maintainer changes
// per CLAUDE.md). Rejects at creation time rather than silently allowing and
// flagging, since there's no queue to flag into yet. Revisit with a real
// provider (e.g. a moderation API) if this list proves too blunt.
const BANNED_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'cunt'];

function containsBannedContent(text) {
  if (!text) return false;
  const normalized = text.toLowerCase();
  return BANNED_WORDS.some((word) => normalized.includes(word));
}

module.exports = { containsBannedContent };
