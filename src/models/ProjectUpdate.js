const mongoose = require("mongoose")

const projectUpdateSchema = new mongoose.Schema(
  {
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SocialProjectRegistration",
      required: true,
    },

    // Reference to the nested project ID within the registration
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // Reference to the social user who created the update
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Update Title
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Short Description
    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Media (image URL)
    media: {
      fileName: String,
      fileUrl: String,
      fileType: String,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },

    likes: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        likedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    comments: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        text: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for efficient querying
projectUpdateSchema.index({ registrationId: 1, projectId: 1, createdAt: -1 })
projectUpdateSchema.index({ createdBy: 1 })
projectUpdateSchema.index({ "likes.userId": 1 })

module.exports = mongoose.model("ProjectUpdate", projectUpdateSchema)
