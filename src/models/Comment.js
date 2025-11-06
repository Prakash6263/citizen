const mongoose = require("mongoose")

const commentSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },

    projectUpdate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectUpdate",
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"],
    },

    // For nested comments (replies)
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },

    // Comment status
    status: {
      type: String,
      enum: ["active", "hidden", "deleted"],
      default: "active",
    },

    // Engagement metrics
    metrics: {
      likes: {
        type: Number,
        default: 0,
      },
      replies: {
        type: Number,
        default: 0,
      },
    },

    // Moderation
    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: Date,

    // Flagging system
    flags: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reason: {
          type: String,
          enum: ["spam", "inappropriate", "harassment", "misinformation", "other"],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Validation to ensure either project or projectUpdate is provided
commentSchema.pre("save", function (next) {
  if (!this.project && !this.projectUpdate) {
    return next(new Error("Either project or projectUpdate must be specified"))
  }
  if (this.project && this.projectUpdate) {
    return next(new Error("Cannot comment on both project and projectUpdate simultaneously"))
  }
  next()
})

// Indexes
commentSchema.index({ project: 1, createdAt: -1 })
commentSchema.index({ projectUpdate: 1, createdAt: -1 })
commentSchema.index({ author: 1, createdAt: -1 })
commentSchema.index({ parentComment: 1, createdAt: 1 })

// Post-save middleware to update comment counts
commentSchema.post("save", async function () {
  if (this.isNew && this.status === "active") {
    if (this.project) {
      // Update project comment count if needed
    } else if (this.projectUpdate) {
      await mongoose.model("ProjectUpdate").findByIdAndUpdate(this.projectUpdate, { $inc: { "metrics.comments": 1 } })
    }

    // Update parent comment reply count
    if (this.parentComment) {
      await mongoose.model("Comment").findByIdAndUpdate(this.parentComment, { $inc: { "metrics.replies": 1 } })
    }
  }
})

// Static method to get comments with replies
commentSchema.statics.getWithReplies = function (targetId, targetType, limit = 20) {
  const filter = { status: "active", parentComment: { $exists: false } }
  filter[targetType] = targetId

  return this.find(filter)
    .populate("author", "fullName avatar")
    .sort({ createdAt: -1 })
    .limit(limit)
    .then(async (comments) => {
      // Get replies for each comment
      for (const comment of comments) {
        const replies = await this.find({
          parentComment: comment._id,
          status: "active",
        })
          .populate("author", "fullName avatar")
          .sort({ createdAt: 1 })
          .limit(5) // Limit replies shown initially

        comment.replies = replies
      }
      return comments
    })
}

module.exports = mongoose.model("Comment", commentSchema)
