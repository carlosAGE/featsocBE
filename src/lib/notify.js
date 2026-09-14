const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendPushNotifications } = require('./pushNotifications');

const PUSH_BODY_BY_TYPE = {
  follow: (actorUsername) => `@${actorUsername} started following you`,
  like: (actorUsername) => `@${actorUsername} liked your video`,
  comment: (actorUsername) => `@${actorUsername} commented on your video`,
};

// Fire-and-forget notification creation — a notification failing to write
// should never fail the follow/like/comment action that triggered it.
// Never notifies a user about their own action (self-follow is already
// blocked upstream, but self-like/self-comment on your own video are not).
// Also sends a push to the recipient's registered devices, best-effort —
// see pushNotifications.js.
async function notify({ recipient, actor, type, video, comment }) {
  if (String(recipient) === String(actor)) return;

  try {
    await Notification.create({ recipient, actor, type, video: video ?? null, comment: comment ?? null });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notify] failed to create notification', err);
    return;
  }

  try {
    const [recipientUser, actorUser] = await Promise.all([
      User.findById(recipient).select('+pushTokens'),
      User.findById(actor).select('username'),
    ]);
    if (!recipientUser?.pushTokens?.length || !actorUser) return;

    const body = PUSH_BODY_BY_TYPE[type]?.(actorUser.username);
    if (!body) return;

    await sendPushNotifications(recipient, recipientUser.pushTokens, {
      title: 'Featuresoc',
      body,
      data: { type, videoId: video ? String(video) : null, actorId: String(actor) },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notify] failed to send push', err);
  }
}

module.exports = { notify };
