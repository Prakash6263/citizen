const mongoose = require("mongoose")

const projectSupportSchema = new mongoose.Schema(
  {
    // Support Details
    supportId: {
      type: String,
      unique: true,
      required: true,
      sparse: true, // Allow multiple nulls for sparse indexes
    },

    // Citizen who is supporting
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Project being supported
    project: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // Project registration reference
    projectRegistration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SocialProjectRegistration",
      required: true,
    },

    // Tokens spent on this project
    tokensSpent: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // Support timestamp
    supportedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes
// Ensure citizen and project are unique together (one support per citizen per project)
projectSupportSchema.index({ citizen: 1, project: 1 }, { unique: true, sparse: true })
projectSupportSchema.index({ citizen: 1, createdAt: -1 })
projectSupportSchema.index({ project: 1, createdAt: -1 })
projectSupportSchema.index({ projectRegistration: 1 })

module.exports = mongoose.model("ProjectSupport", projectSupportSchema)
