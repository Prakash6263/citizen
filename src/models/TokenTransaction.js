const mongoose = require("mongoose")

const tokenTransactionSchema = new mongoose.Schema(
  {
    // Transaction Details
    transactionId: {
      type: String,
      unique: true,
      required: true,
    },
    transactionType: {
      type: String,
      required: true,
      enum: ["issue", "transfer", "spend", "reward", "penalty", "refund"],
    },

    transactionDirection: {
      type: String,
      required: true,
      enum: ["credit", "debit"],
      default: "debit",
      description: "credit = tokens received, debit = tokens spent",
    },

    // Parties Involved
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Token Information
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    tokenType: {
      type: String,
      enum: ["civic", "project", "reward", "penalty"],
      default: "civic",
    },

    // Transaction Context
    relatedProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SocialProjectRegistration",
    },
    relatedActivity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectUpdate",
    },

    // Administrative Details
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Status and Verification
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },

    // Description and Metadata
    description: String,
    category: {
      type: String,
      enum: ["participation", "contribution", "milestone", "bonus", "correction"],
    },

    // Audit Trail
    processedAt: Date,
    failureReason: String,
  },
  {
    timestamps: true,
  },
)

// Indexes
tokenTransactionSchema.index({ toUser: 1, createdAt: -1 })
tokenTransactionSchema.index({ fromUser: 1, createdAt: -1 })
tokenTransactionSchema.index({ transactionType: 1, status: 1 })
tokenTransactionSchema.index({ transactionDirection: 1 })
tokenTransactionSchema.index({ relatedProject: 1 })

module.exports = mongoose.model("TokenTransaction", tokenTransactionSchema)
