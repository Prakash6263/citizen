const mongoose = require("mongoose")

const loginAttemptSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true, // email or username
      lowercase: true,
    },

    ip: {
      type: String,
      required: true,
    },

    userAgent: String,

    success: {
      type: Boolean,
      required: true,
    },

    failureReason: {
      type: String,
      enum: [
        "invalid_credentials",
        "account_locked",
        "account_inactive",
        "email_not_verified",
        "too_many_attempts",
        "government_approval_pending",
        "government_not_approved",
        "superadmin_not_verified",
      ],
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
)

// Indexes
loginAttemptSchema.index({ identifier: 1, createdAt: -1 })
loginAttemptSchema.index({ ip: 1, createdAt: -1 })
loginAttemptSchema.index({ user: 1, createdAt: -1 })

// TTL index - automatically delete records after 30 days
loginAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

// Static method to check if IP or identifier is rate limited
loginAttemptSchema.statics.isRateLimited = async function (identifier, ip) {
  const timeWindow = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 5

  const recentAttempts = await this.countDocuments({
    $or: [{ identifier: identifier.toLowerCase() }, { ip: ip }],
    success: false,
    createdAt: { $gte: new Date(Date.now() - timeWindow) },
  })

  return recentAttempts >= maxAttempts
}

// Static method to log login attempt
loginAttemptSchema.statics.logAttempt = function (data) {
  return this.create({
    identifier: data.identifier.toLowerCase(),
    ip: data.ip,
    userAgent: data.userAgent,
    success: data.success,
    failureReason: data.failureReason,
    user: data.user,
  })
}

module.exports = mongoose.model("LoginAttempt", loginAttemptSchema)
