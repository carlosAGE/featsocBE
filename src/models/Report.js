const mongoose = require('mongoose');

// A user-submitted report against a video, comment, or user. No admin
// review/resolution workflow here by design — the admin-side queue is part
// of this pipeline's control plane and is restricted to maintainer changes
// only (see CLAUDE.md). This just captures the report.
const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['video', 'comment', 'user'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: true }
);

reportSchema.index({ targetType: 1, targetId: 1 });

reportSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Report', reportSchema);
