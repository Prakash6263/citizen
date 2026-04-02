const mongoose = require("mongoose")

const notificationSchema = new mongoose.Schema(
  {
    // Recipient user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    // User type for filtering notifications
    userType: {
      type: String,
      enum: ["citizen", "social_project", "government"],
      required: [true, "User type is required"],
    },

    // Notification content
    title: {
      type: String,
      required: [true, "Title is required"],
      maxlength: [255, "Title cannot exceed 255 characters"],
    },

    body: {
      type: String,
      required: [true, "Body is required"],
      maxlength: [500, "Body cannot exceed 500 characters"],
    },

    // Additional data
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Notification status
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    // Notification type for categorization
    type: {
      type: String,
      enum: ["project_update", "system", "alert", "message", "reminder", "other"],
      default: "other",
    },

    // Reference to related resources
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    relatedModel: {
      type: String,
      default: null,
    },

    // Sender information (optional)
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Priority level
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },

    // Expiry date (notifications older than this can be deleted)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      index: true,
    },

    // Soft delete flag
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
)

// Compound indexes for common queries
notificationSchema.index({ userId: 1, isRead: 1 })
notificationSchema.index({ userId: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, userType: 1 })
notificationSchema.index({ type: 1, createdAt: -1 })

// Virtual to calculate unread count
notificationSchema.virtual("unreadCount").get(function () {
  return this.isRead ? 0 : 1
})

module.exports = mongoose.model("Notification", notificationSchema)
