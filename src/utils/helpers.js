const crypto = require("crypto")

// Generate unique ID with prefix
const generateUniqueId = (prefix = "") => {
  const timestamp = Date.now().toString(36)
  const randomStr = crypto.randomBytes(4).toString("hex").toUpperCase()
  return `${prefix}${timestamp}${randomStr}`
}

// Calculate token allocation based on activity
const calculateTokenReward = (activityType, baseAmount = 1) => {
  const multipliers = {
    project_support: 2,
    project_creation: 5,
    community_participation: 1,
    milestone_completion: 10,
    feedback_submission: 0.5,
  }

  return baseAmount * (multipliers[activityType] || 1)
}

// Validate token transaction limits
const validateTokenLimits = async (userId, amount, userType, limits) => {
  const TokenTransaction = require("../models/TokenTransaction")

  // Get current balance
  const userTransactions = await TokenTransaction.aggregate([
    {
      $match: {
        toUser: userId,
        status: "completed",
      },
    },
    {
      $group: {
        _id: null,
        totalReceived: { $sum: "$amount" },
      },
    },
  ])

  const currentBalance = userTransactions[0]?.totalReceived || 0
  const limit = userType === "citizen" ? limits.citizenLimit : limits.projectLimit

  return currentBalance + amount <= limit
}

// Format token amount for display
const formatTokenAmount = (amount) => {
  return Number.parseFloat(amount).toFixed(2)
}

// Generate transaction reference
const generateTransactionRef = () => {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
}

module.exports = {
  generateUniqueId,
  calculateTokenReward,
  validateTokenLimits,
  formatTokenAmount,
  generateTransactionRef,
}
