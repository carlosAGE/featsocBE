const mongoose = require('mongoose');

// One user liking one video. Existence of the doc is the like — there's no
// boolean flag to flip, which is what makes like/unlike naturally idempotent.
const likeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
  },
  { timestamps: true }
);

// One like per user per video — also the index the like/unlike lookups use.
likeSchema.index({ user: 1, video: 1 }, { unique: true });

module.exports = mongoose.model('Like', likeSchema);
