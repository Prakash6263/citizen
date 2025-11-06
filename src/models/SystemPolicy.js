const mongoose = require("mongoose")

const systemPolicySchema = new mongoose.Schema(
  {
    // Policy Identification
    policyName: {
      type: String,
      required: true,
      unique: true,
    },
    policyType: {
      type: String,
      required: true,
      enum: ["token_allocation", "approval_workflow", "user_limits", "project_guidelines", "system_settings"],
    },

    // Policy Configuration
    configuration: {
      // Token Allocation Policies
      maxTokensPerCitizen: Number,
      maxTokensPerProject: Number,
      dailyIssuanceLimit: Number,

      // Approval Workflow Policies
      autoApprovalThreshold: Number,
      requiredApprovals: Number,
      approvalTimeoutDays: Number,

      // User Limit Policies
      maxProjectsPerUser: Number,
      maxUpdatesPerDay: Number,
      maxSupportPerProject: Number,

      // Custom Configuration
      customSettings: mongoose.Schema.Types.Mixed,
    },

    // Policy Status
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "draft",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },

    // Governance
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Effective Dates
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    effectiveUntil: Date,

    // Description and Documentation
    description: String,
    changeLog: [
      {
        change: String,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        changedAt: {
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

// Indexes
systemPolicySchema.index({ policyType: 1, status: 1 })
systemPolicySchema.index({ effectiveFrom: 1, effectiveUntil: 1 })

module.exports = mongoose.model("SystemPolicy", systemPolicySchema)
