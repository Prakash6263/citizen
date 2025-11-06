const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const passwordHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // We only need createdAt
  },
)

// Index for efficient queries
passwordHistorySchema.index({ user: 1, createdAt: -1 })

// TTL index - automatically delete records after 1 year
passwordHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 })

// Static method to check if password was used recently
passwordHistorySchema.statics.isPasswordReused = async function (userId, newPassword, lookbackCount = 5) {
  const recentPasswords = await this.find({ user: userId }).sort({ createdAt: -1 }).limit(lookbackCount)

  for (const record of recentPasswords) {
    const isMatch = await bcrypt.compare(newPassword, record.passwordHash)
    if (isMatch) {
      return true
    }
  }

  return false
}

// Static method to add password to history
passwordHistorySchema.statics.addToHistory = async function (userId, passwordHash) {
  await this.create({
    user: userId,
    passwordHash,
  })

  // Keep only last 10 passwords
  const allPasswords = await this.find({ user: userId }).sort({ createdAt: -1 })

  if (allPasswords.length > 10) {
    const toDelete = allPasswords.slice(10)
    await this.deleteMany({
      _id: { $in: toDelete.map((p) => p._id) },
    })
  }
}

module.exports = mongoose.model("PasswordHistory", passwordHistorySchema)
