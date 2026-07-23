const mongoose = require('mongoose');

// A linked external identity (Google now; Apple/others later). A user can
// have several, so signing in with Google and later with Apple on the same
// email resolves to one account.
const authProviderSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ['google', 'apple', 'local'],
      required: true,
    },
    // The provider's stable user id (Google "sub", Apple "sub"). Null for
    // the local email/password provider.
    providerId: { type: String, default: null },
  },
  { _id: false }
);

// Core user profile plus auth fields. Credential material lives here but is
// never serialized to JSON (see toJSON transform + `select: false`).
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      lowercase: true,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    bio: {
      type: String,
      maxlength: 280,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },

    // --- Auth (additive; safe defaults) ---
    // bcrypt hash for email/password sign-in. Absent for social-only accounts.
    // `select: false` keeps it out of query results unless explicitly asked.
    passwordHash: {
      type: String,
      select: false,
      default: undefined,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    authProviders: {
      type: [authProviderSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Fast lookup when resolving a social login to an account.
userSchema.index({ 'authProviders.provider': 1, 'authProviders.providerId': 1 });

// Never leak internal fields when serializing to JSON.
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
