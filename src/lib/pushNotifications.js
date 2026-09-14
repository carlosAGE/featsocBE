const User = require('../models/User');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100; // Expo's per-request limit

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Sends one push per token via Expo's push HTTP API directly (no
// expo-server-sdk dependency — Node's native fetch, available since the
// Node 18+ this project already requires, covers it). Best-effort: a
// delivery failure never throws back to the caller (notify() is itself
// fire-and-forget), it's only logged. Tokens Expo reports as
// DeviceNotRegistered are pruned from the user's record so they stop being
// retried.
async function sendPushNotifications(userId, tokens, { title, body, data }) {
  if (!tokens || tokens.length === 0) return;

  const messages = tokens.map((to) => ({ to, title, body, data, sound: 'default' }));
  const staleTokens = [];

  for (const batch of chunk(messages, CHUNK_SIZE)) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });
      const result = await response.json().catch(() => null);
      const receipts = result?.data || [];

      receipts.forEach((receipt, index) => {
        if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
          staleTokens.push(batch[index].to);
        }
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[push] failed to send a batch', err);
    }
  }

  if (staleTokens.length > 0) {
    await User.updateOne({ _id: userId }, { $pullAll: { pushTokens: staleTokens } }).catch(() => {});
  }
}

module.exports = { sendPushNotifications };
