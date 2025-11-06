const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")
const User = require("../models/User")
const TokenTransaction = require("../models/TokenTransaction")
const crypto = require("crypto")

// @desc    Get user token balance
// @route   GET /api/tokens/balance
// @access  Private
const getTokenBalance = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("fullName email tokenBalance")
  if (!user) {
    return errorResponse(res, "User not found", 404)
  }

  successResponse(res, "Token balance retrieved successfully", {
    user: {
      id: user._id,
      name: user.fullName,
      email: user.email,
      tokenBalance: user.tokenBalance,
    },
  })
})

// @desc    Issue tokens to a citizen (Government only)
// @route   POST /api/tokens/issue
// @access  Private (Government users only)
const issueToken = asyncHandler(async (req, res) => {
  const { recipientId, amount, tokenType = "civic", description, category } = req.body

  // Validate input
  if (!recipientId || !amount) {
    return errorResponse(res, "Recipient ID and amount are required", 400)
  }

  if (amount <= 0) {
    return errorResponse(res, "Amount must be greater than 0", 400)
  }

  // Check if requester is government user
  if (req.user.userType !== "government") {
    return errorResponse(res, "Only government users can issue tokens", 403)
  }

  // Find recipient
  const recipient = await User.findById(recipientId)
  if (!recipient) {
    return errorResponse(res, "Recipient user not found", 404)
  }

  // Ensure recipient is a citizen
  if (recipient.userType !== "citizen") {
    return errorResponse(res, "Tokens can only be issued to citizens", 400)
  }

  // Create transaction record
  const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`
  const transaction = await TokenTransaction.create({
    transactionId,
    transactionType: "issue",
    transactionDirection: "credit",
    fromUser: req.user._id,
    toUser: recipientId,
    amount,
    tokenType,
    issuedBy: req.user._id,
    description: description || `Tokens issued by ${req.user.fullName}`,
    category: category || "participation",
    status: "completed",
    processedAt: new Date(),
  })

  // Update recipient's token balance
  recipient.tokenBalance += amount
  await recipient.save()

  successResponse(res, "Tokens issued successfully", {
    transaction: {
      id: transaction._id,
      transactionId: transaction.transactionId,
      recipient: {
        id: recipient._id,
        name: recipient.fullName,
        email: recipient.email,
      },
      amount,
      tokenType,
      newBalance: recipient.tokenBalance,
      issuedAt: transaction.createdAt,
    },
  })
})

// @desc    Transfer tokens between users
// @route   POST /api/tokens/transfer
// @access  Private
const transferTokens = asyncHandler(async (req, res) => {
  const { recipientId, amount, description } = req.body

  // Validate input
  if (!recipientId || !amount) {
    return errorResponse(res, "Recipient ID and amount are required", 400)
  }

  if (amount <= 0) {
    return errorResponse(res, "Amount must be greater than 0", 400)
  }

  // Check sender's balance
  const sender = await User.findById(req.user._id)
  if (sender.tokenBalance < amount) {
    return errorResponse(res, "Insufficient token balance", 400)
  }

  // Find recipient
  const recipient = await User.findById(recipientId)
  if (!recipient) {
    return errorResponse(res, "Recipient user not found", 404)
  }

  // Create transaction record
  const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`
  const transaction = await TokenTransaction.create({
    transactionId,
    transactionType: "transfer",
    transactionDirection: "credit",
    fromUser: req.user._id,
    toUser: recipientId,
    amount,
    tokenType: "civic",
    description: description || `Tokens transferred from ${sender.fullName}`,
    category: "contribution",
    status: "completed",
    processedAt: new Date(),
  })

  // Update balances
  sender.tokenBalance -= amount
  recipient.tokenBalance += amount
  await sender.save()
  await recipient.save()

  successResponse(res, "Tokens transferred successfully", {
    transaction: {
      id: transaction._id,
      transactionId: transaction.transactionId,
      from: {
        id: sender._id,
        name: sender.fullName,
      },
      to: {
        id: recipient._id,
        name: recipient.fullName,
      },
      amount,
      senderNewBalance: sender.tokenBalance,
      recipientNewBalance: recipient.tokenBalance,
      transferredAt: transaction.createdAt,
    },
  })
})

// @desc    Get token statistics (Government only)
// @route   GET /api/tokens/stats
// @access  Private (Government users only)
const getTokenStats = asyncHandler(async (req, res) => {
  // Check if requester is government user
  if (req.user.userType !== "government") {
    return errorResponse(res, "Only government users can view token statistics", 403)
  }

  // Get total tokens issued
  const totalIssued = await TokenTransaction.aggregate([
    {
      $match: {
        transactionType: "issue",
        status: "completed",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ])

  // Get citizen statistics
  const citizenStats = await User.aggregate([
    {
      $match: { userType: "citizen" },
    },
    {
      $group: {
        _id: null,
        totalCitizens: { $sum: 1 },
        totalTokensHeld: { $sum: "$tokenBalance" },
        avgTokensPerCitizen: { $avg: "$tokenBalance" },
      },
    },
  ])

  // Get transaction breakdown
  const transactionBreakdown = await TokenTransaction.aggregate([
    {
      $match: { status: "completed" },
    },
    {
      $group: {
        _id: "$transactionType",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ])

  successResponse(res, "Token statistics retrieved successfully", {
    stats: {
      totalIssued: totalIssued[0]?.total || 0,
      issueCount: totalIssued[0]?.count || 0,
      citizens: {
        total: citizenStats[0]?.totalCitizens || 0,
        totalTokensHeld: citizenStats[0]?.totalTokensHeld || 0,
        avgTokensPerCitizen: Math.round(citizenStats[0]?.avgTokensPerCitizen || 0),
      },
      transactionBreakdown: transactionBreakdown.reduce((acc, item) => {
        acc[item._id] = {
          count: item.count,
          totalAmount: item.totalAmount,
        }
        return acc
      }, {}),
    },
  })
})

module.exports = {
  getTokenBalance,
  issueToken,
  transferTokens,
  getTokenStats,
}
