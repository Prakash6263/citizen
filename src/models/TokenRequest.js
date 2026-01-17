const mongoose = require("mongoose")

const tokenRequestSchema = new mongoose.Schema(
  {
    // Request ID
    tokenRequestId: {
      type: String,
      unique: true,
      required: true,
    },

    // Requester Information
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Location/City Association (for isolation)
    city: {
      type: String,
      required: true,
      index: true,
    },

    // Proof Documents (image or PDF)
    proofDocuments: [
      {
        filename: String,
        originalName: String,
        fileUrl: String,
        mimetype: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Status and Review
    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    // Government Review
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: Date,

    reviewNotes: String,

    rejectionReason: String,

    issueAmount: {
      type: Number,
      min: 1,
    },

    // Token Transaction Reference (created on approval)
    tokenTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TokenTransaction",
    },

    // Metadata
    metadata: {
      ipAddress: String,
      userAgent: String,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes
tokenRequestSchema.index({ requestedBy: 1, createdAt: -1 })
tokenRequestSchema.index({ status: 1, createdAt: -1 })
tokenRequestSchema.index({ reviewedBy: 1, reviewedAt: -1 })
tokenRequestSchema.index({ city: 1, status: 1 })

module.exports = mongoose.model("TokenRequest", tokenRequestSchema)
