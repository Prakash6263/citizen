const User = require("../models/User")
const TokenTransaction = require("../models/TokenTransaction")
const asyncHandler = require("../utils/asyncHandler")
const ResponseHelper = require("../utils/responseHelper")

/**
 * @desc    Get user wallet balance and summary
 * @route   GET /api/user/wallet
 * @access  Private
 */
const getWallet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "tokenBalance tokenSupportedProjects"
  )

  if (!user) {
    return ResponseHelper.error(res, "User not found", 404)
  }

  // Total received tokens
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

  // Total spent tokens
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

  const totalReceived = receivedTokens[0]?.total || 0
  const totalSpent = spentTokens[0]?.total || 0

  ResponseHelper.success(
    res,
    {
      currentBalance: user.tokenBalance,
      totalReceived,
      totalSpent,
      availableTokens: user.tokenBalance,
      supportedTokens: (user.tokenSupportedProjects || []).reduce(
        (sum, p) => sum + (p.tokensSpent || 0),
        0
      ),
    },
    "Wallet retrieved successfully"
  )
})

/**
 * @desc    Get wallet transaction history (received & spent)
 * @route   GET /api/user/wallet/transactions
 * @access  Private
 */
const getTransactionHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type = "all", direction = "all" } = req.query
  const userId = req.user._id

  const query = {
    $or: [{ toUser: userId }, { fromUser: userId }],
    status: "completed",
  }

  if (type !== "all") query.transactionType = type
  if (direction !== "all") query.transactionDirection = direction

  const transactions = await TokenTransaction.find(query)
    .populate("relatedProject", "projectTitle projectDescription")
    .populate("fromUser", "fullName username avatar")
    .populate("toUser", "fullName username avatar")
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .lean()

  const formattedTransactions = transactions.map((transaction) => {
    const isReceived =
      transaction.toUser &&
      transaction.toUser._id.toString() === userId.toString()

    const isSpent =
      transaction.fromUser &&
      transaction.fromUser._id.toString() === userId.toString()

    let message = ""

    // Government approval case
    if (
      isReceived &&
      transaction.transactionType === "issue" &&
      transaction.transactionDirection === "credit"
    ) {
      message = "received by government"
    }
    // Spent case
    else if (isSpent) {
      message = transaction.relatedProject
        ? `Spent on ${transaction.relatedProject.projectTitle}`
        : "Spent tokens"
    }

    return {
      transactionId: transaction.transactionId,
      type: transaction.transactionType,
      amount: transaction.amount,
      direction: isReceived ? "received" : "spent",
      sign: isReceived ? "+" : "-",
      message,
      projectId: transaction.relatedProject?._id || null,
      projectName: transaction.relatedProject?.projectTitle || null,
      projectDescription: transaction.relatedProject?.projectDescription,
      description: transaction.description,
      category: transaction.category,
      date: transaction.createdAt,
      timestamp: new Date(transaction.createdAt).getTime(),
    }
  })

  const total = await TokenTransaction.countDocuments(query)

  ResponseHelper.paginated(
    res,
    formattedTransactions,
    {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
    "Transaction history retrieved successfully"
  )
})

/**
 * @desc    Get wallet statistics
 * @route   GET /api/user/wallet/stats
 * @access  Private
 */
const getWalletStats = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const transactionStats = await TokenTransaction.aggregate([
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

  const user = await User.findById(userId).select("tokenSupportedProjects")
  const supportedProjectsCount = user?.tokenSupportedProjects?.length || 0

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
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ])

  ResponseHelper.success(
    res,
    {
      transactionStats,
      directionStats,
      supportedProjectsCount,
      monthlyTrend,
    },
    "Wallet statistics retrieved successfully"
  )
})

module.exports = {
  getWallet,
  getTransactionHistory,
  getWalletStats,
}
