const mongoose = require('mongoose');

// A single uploaded video. `key`/`thumbnailKey` are the R2 object keys;
// `url`/`thumbnailUrl` are the derived public URLs returned to clients so
// the frontend never has to know the storage layout.
const videoSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 2200,
      default: '',
    },
    key: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnailKey: {
      type: String,
    },
    thumbnailUrl: {
      type: String,
    },
    durationSeconds: {
      type: Number,
      min: 0,
    },
    width: Number,
    height: Number,
    sizeBytes: {
      type: Number,
      min: 0,
    },

    // --- Denormalized engagement counters (additive) ---
    // Kept on the video doc so the feed can rank/display without a join per
    // request. Updated by the like/comment/view code paths, never computed
    // live from the Like/Comment collections on read.
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

videoSchema.index({ owner: 1, createdAt: -1 });
// Powers the global "For You" feed's cursor pagination.
videoSchema.index({ createdAt: -1 });

videoSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    // Object storage keys are an implementation detail, not part of the
    // public contract — clients only ever see url/thumbnailUrl.
    delete ret.key;
    delete ret.thumbnailKey;
    return ret;
  },
});

module.exports = mongoose.model('Video', videoSchema);
