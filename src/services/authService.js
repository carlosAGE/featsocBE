const User = require('../models/User');

// Turns a verified external profile into a local User, creating or linking
// as needed. Kept separate from the controller so the account-resolution
// rules live in one testable place and can be reused by Apple sign-in later.

// Build a unique, schema-valid username from an email / display name.
async function generateUniqueUsername(seed) {
  const base = String(seed || 'user')
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24) || 'user';

  // username must be >= 3 chars (see User schema)
  let candidate = base.length >= 3 ? base : `${base}_u`;

  // Append a numeric suffix until it's free.
  let suffix = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await User.exists({ username: candidate })) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
  return candidate;
}

// provider: 'google' | 'apple' | ...
// profile: { providerId, email, emailVerified, name, picture }
async function findOrCreateFromProvider(provider, profile) {
  const { providerId, email, emailVerified, name, picture } = profile;

  // 1. Already linked to this exact provider identity?
  let user = await User.findOne({
    authProviders: { $elemMatch: { provider, providerId } },
  });
  if (user) return { user, created: false };

  // 2. Same email exists (e.g. signed up with password first)? Link it.
  if (email) {
    user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      user.authProviders.push({ provider, providerId });
      if (emailVerified) user.emailVerified = true;
      if (!user.avatarUrl && picture) user.avatarUrl = picture;
      await user.save();
      return { user, created: false };
    }
  }

  // 3. Brand new account.
  const username = await generateUniqueUsername(email || name);
  user = await User.create({
    username,
    email: email ? email.toLowerCase() : undefined,
    displayName: name || username,
    avatarUrl: picture || '',
    emailVerified: Boolean(emailVerified),
    authProviders: [{ provider, providerId }],
  });
  return { user, created: true };
}

// Creates an email/password ("local") account. Caller supplies an already
// hashed password. Username is generated from the email like social signups.
async function createLocalUser({ email, passwordHash }) {
  const username = await generateUniqueUsername(email);
  return User.create({
    username,
    email: email.toLowerCase(),
    displayName: username,
    passwordHash,
    emailVerified: false,
    authProviders: [{ provider: 'local', providerId: null }],
  });
}

module.exports = {
  findOrCreateFromProvider,
  generateUniqueUsername,
  createLocalUser,
};
