const mongoose = require("mongoose")

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      required: true,
      enum: [
        // Authentication actions
        "login",
        "logout",
        "register",
        "register_social",
        "password_change",
        "password_reset",
        "password_reset_request",
        "email_verification",

        // Profile actions
        "profile_update",
        "avatar_upload",
        "avatar_delete",
        "settings_update",

        // Account actions
        "account_deactivate",
        "account_reactivate",
        "account_delete",

        // Security actions
        "suspicious_activity",
        "failed_login_attempt",
        "token_refresh",

        // Policy management actions
        "policy_create",
        "policy_update",
        "policy_status_update",
        "policy_restore",
      ],
    },

    description: {
      type: String,
      required: true,
    },

    // Request information
    ip: String,
    userAgent: String,

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Severity level
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },
  },
  {
    timestamps: true,
  },
)

// Indexes
auditLogSchema.index({ user: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ severity: 1, createdAt: -1 })
auditLogSchema.index({ ip: 1, createdAt: -1 })

// TTL index - automatically delete records after 1 year
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 })

// Static method to log user action
auditLogSchema.statics.logAction = function (data) {
  return this.create({
    user: data.user,
    action: data.action,
    description: data.description,
    ip: data.ip,
    userAgent: data.userAgent,
    metadata: data.metadata || {},
    severity: data.severity || "low",
  })
}

// Static method to get user activity
auditLogSchema.statics.getUserActivity = function (userId, limit = 50) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("action description createdAt ip severity")
}

module.exports = mongoose.model("AuditLog", auditLogSchema)
