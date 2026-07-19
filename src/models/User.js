const mongoose = require('mongoose');

// Core user profile. Auth-related fields (passwordHash, provider ids, etc.)
// are intentionally NOT defined here yet — auth is a restricted area and its
// strategy is undecided (see CLAUDE.md). Add them alongside the auth
// implementation so credential handling stays in one reviewed place.
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
  },
  { timestamps: true }
);

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
