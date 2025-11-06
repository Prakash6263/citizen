const User = require("../models/User")
const TokenTransaction = require("../models/TokenTransaction")
const SocialProjectRegistration = require("../models/SocialProjectRegistration")
const asyncHandler = require("../utils/asyncHandler")
const ResponseHelper = require("../utils/responseHelper")

/**
 * @desc    Get user wallet balance and summary
 * @route   GET /api/user/wallet
 * @access  Private
 */
const getWallet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("tokenBalance tokenSupportedProjects")

  if (!user) {
    return ResponseHelper.error(res, "User not found", 404)
  }

  // Get total tokens received (credit transactions)
  const receivedTokens = await TokenTransaction.aggregate([
    {
      $match: {
        toUser: user._id,
        transactionDirection: "credit",
        status: "completed",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ])

  // Get total tokens spent (debit transactions)
  const spentTokens = await TokenTransaction.aggregate([
    {
      $match: {
        fromUser: user._id,
        transactionDirection: "debit",
        status: "completed",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ])

  const totalReceived = receivedTokens.length > 0 ? receivedTokens[0].total : 0
  const totalSpent = spentTokens.length > 0 ? spentTokens[0].total : 0

  const walletData = {
    currentBalance: user.tokenBalance,
    totalReceived,
    totalSpent,
    availableTokens: user.tokenBalance,
    supportedTokens: (user.tokenSupportedProjects || []).reduce((sum, p) => sum + p.tokensSpent, 0),
  }

  ResponseHelper.success(res, walletData, "Wallet retrieved successfully")
})

/**
 * @desc    Get wallet transaction history
 * @route   GET /api/user/wallet/transactions
 * @access  Private
 */
const getTransactionHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type = "all", direction = "all" } = req.query
  const userId = req.user._id

  // Build query based on transaction type and direction
  const query = {
    $or: [
      { toUser: userId }, // Received transactions
      { fromUser: userId }, // Sent transactions
    ],
    status: "completed",
  }

  if (type !== "all") {
    query.transactionType = type
  }

  if (direction !== "all") {
    query.transactionDirection = direction
  }

  // Get transactions with pagination
  const transactions = await TokenTransaction.find(query)
    .populate("relatedProject", "projectTitle projectDescription")
    .populate("fromUser", "fullName username avatar")
    .populate("toUser", "fullName username avatar")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean()

  // Transform transactions for wallet display
  const formattedTransactions = transactions.map((transaction) => {
    const isReceived = transaction.toUser._id.toString() === userId.toString()
    const isSpent = transaction.fromUser._id.toString() === userId.toString()

    return {
      transactionId: transaction.transactionId,
      type: transaction.transactionType,
      amount: transaction.amount,
      direction: isReceived ? "received" : "spent",
      transactionDirection: transaction.transactionDirection,
      sign: isReceived ? "+" : "-",
      projectId: transaction.relatedProject?._id,
      projectName: transaction.relatedProject?.projectTitle || "Direct Transfer",
      projectDescription: transaction.relatedProject?.projectDescription,
      otherParty: isReceived ? transaction.fromUser : transaction.toUser,
      description: transaction.description,
      category: transaction.category,
      date: transaction.createdAt,
      timestamp: transaction.createdAt.getTime(),
    }
  })

  const total = await TokenTransaction.countDocuments(query)

  ResponseHelper.paginated(
    res,
    formattedTransactions,
    {
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
    "Transaction history retrieved successfully",
  )
})

/**
 * @desc    Get wallet statistics
 * @route   GET /api/user/wallet/stats
 * @access  Private
 */
const getWalletStats = asyncHandler(async (req, res) => {
  const userId = req.user._id

  // Get transaction counts by type
  const stats = await TokenTransaction.aggregate([
    {
      $match: {
        $or: [{ toUser: userId }, { fromUser: userId }],
        status: "completed",
      },
    },
    {
      $group: {
        _id: "$transactionType",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ])

  const directionStats = await TokenTransaction.aggregate([
    {
      $match: {
        $or: [{ toUser: userId }, { fromUser: userId }],
        status: "completed",
      },
    },
    {
      $group: {
        _id: "$transactionDirection",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ])

  // Get supported projects count
  const user = await User.findById(userId).select("tokenSupportedProjects")
  const supportedProjectsCount = user.tokenSupportedProjects.length

  // Get monthly transaction trend (last 6 months)
  const monthlyTrend = await TokenTransaction.aggregate([
    {
      $match: {
        $or: [{ toUser: userId }, { fromUser: userId }],
        status: "completed",
        createdAt: {
          $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ])

  ResponseHelper.success(
    res,
    {
      transactionStats: stats,
      directionStats,
      supportedProjectsCount,
      monthlyTrend,
    },
    "Wallet statistics retrieved successfully",
  )
})

module.exports = {
  getWallet,
  getTransactionHistory,
  getWalletStats,
}
