const Notification = require('../models/Notification');

// Fire-and-forget notification creation — a notification failing to write
// should never fail the follow/like/comment action that triggered it.
// Never notifies a user about their own action (self-follow is already
// blocked upstream, but self-like/self-comment on your own video are not).
async function notify({ recipient, actor, type, video, comment }) {
  if (String(recipient) === String(actor)) return;

  try {
    await Notification.create({ recipient, actor, type, video: video ?? null, comment: comment ?? null });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notify] failed to create notification', err);
  }
}

module.exports = { notify };
