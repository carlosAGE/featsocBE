const mongoose = require('mongoose');

// One directed follow edge: `follower` follows `following`. Existence of the
// doc is the only state — there's no "status" field, since requests/private
// accounts aren't part of this MVP pass.
const followSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// One edge per pair — also the index the follow/unfollow lookups use.
followSchema.index({ follower: 1, following: 1 }, { unique: true });
// Powers "who follows this user" / "who does this user follow" listings.
followSchema.index({ following: 1, createdAt: -1 });
followSchema.index({ follower: 1, createdAt: -1 });

followSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Follow', followSchema);
