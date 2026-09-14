const mongoose = require('mongoose');

// A comment on a video, optionally a reply to another comment (one level —
// `parentComment` always points at a top-level comment, never another reply).
const commentSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
  },
  { timestamps: true }
);

// Powers the video's comment list (top-level, cursor-paginated) and a
// reply's lookup of its parent thread.
commentSchema.index({ video: 1, parentComment: 1, createdAt: -1 });

commentSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Comment', commentSchema);
