const mongoose = require('mongoose');

// A post in the social feed. Kept deliberately simple as the reference
// feature for the boilerplate — new features should follow this
// model + controller + route + test shape.
const postSchema = new mongoose.Schema(
  {
    // Author is a User reference. Not `required` yet because auth isn't wired
    // up; once requireAuth is implemented, set this from req.user and make it
    // required.
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });

postSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Post', postSchema);
