const User = require("../models/User")
const TokenTransaction = require("../models/TokenTransaction")
const RegistrationApproval = require("../models/RegistrationApproval")
const Government = require("../models/Government")
const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")

// @desc    Get dashboard overview statistics
// @route   GET /api/dashboard/overview
// @access  Private (Government only)
const getDashboardOverview = asyncHandler(async (req, res) => {
  const { period = "30d" } = req.query

  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()

  switch (period) {
    case "7d":
      startDate.setDate(endDate.getDate() - 7)
      break
    case "30d":
      startDate.setDate(endDate.getDate() - 30)
      break
    case "90d":
      startDate.setDate(endDate.getDate() - 90)
      break
    case "1y":
      startDate.setFullYear(endDate.getFullYear() - 1)
      break
    default:
      startDate.setDate(endDate.getDate() - 30)
  }

  // Get user statistics
  const userStats = await User.aggregate([
    {
      $group: {
        _id: "$userType",
        count: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [{ $gte: ["$lastLoginAt", startDate] }, 1, 0],
          },
        },
        totalTokens: { $sum: "$tokenBalance" },
      },
    },
  ])

  // Get recent activity
  const recentActivity = await TokenTransaction.find({
    createdAt: { $gte: startDate },
  })
    .populate("toUser", "fullName userType")
    .populate("fromUser", "fullName userType")
    .sort({ createdAt: -1 })
    .limit(10)

  // Get pending approvals count
  const pendingApprovals = await RegistrationApproval.countDocuments({
    status: { $in: ["pending", "under_review"] },
  })

  // Get token circulation
  const tokenCirculation = await TokenTransaction.aggregate([
    {
      $match: {
        status: "completed",
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$transactionType",
        totalAmount: { $sum: "$amount" },
        transactionCount: { $sum: 1 },
      },
    },
  ])

  successResponse(res, "Dashboard overview retrieved successfully", {
    period,
    userStats,
    recentActivity,
    pendingApprovals,
    tokenCirculation,
  })
})

// @desc    Get user engagement metrics
// @route   GET /api/dashboard/engagement
// @access  Private (Government only)
const getUserEngagement = asyncHandler(async (req, res) => {
  const { period = "30d" } = req.query

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - Number.parseInt(period))

  // Daily active users
  const dailyActiveUsers = await User.aggregate([
    {
      $match: {
        lastLoginAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$lastLoginAt" },
        },
        activeUsers: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ])

  // User registration trends
  const registrationTrends = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          userType: "$userType",
        },
        newUsers: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": 1 } },
  ])

  const projectParticipation = []

  successResponse(res, "User engagement metrics retrieved successfully", {
    dailyActiveUsers,
    registrationTrends,
    projectParticipation,
  })
})

// @desc    Get financial analytics
// @route   GET /api/dashboard/financial
// @access  Private (Government only)
const getFinancialAnalytics = asyncHandler(async (req, res) => {
  const { period = "30d" } = req.query

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - Number.parseInt(period))

  // Token issuance trends
  const tokenIssuance = await TokenTransaction.aggregate([
    {
      $match: {
        transactionType: "issue",
        status: "completed",
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          tokenType: "$tokenType",
        },
        totalIssued: { $sum: "$amount" },
        transactionCount: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": 1 } },
  ])

  const projectFunding = []
  const topFundedProjects = []

  // Token distribution by user type
  const tokenDistribution = await User.aggregate([
    {
      $group: {
        _id: "$userType",
        userCount: { $sum: 1 },
        totalTokens: { $sum: "$tokenBalance" },
        avgTokensPerUser: { $avg: "$tokenBalance" },
        maxTokens: { $max: "$tokenBalance" },
        minTokens: { $min: "$tokenBalance" },
      },
    },
  ])

  successResponse(res, "Financial analytics retrieved successfully", {
    tokenIssuance,
    projectFunding,
    topFundedProjects,
    tokenDistribution,
  })
})

// @desc    Get system health metrics
// @route   GET /api/dashboard/health
// @access  Private (Government only)
const getSystemHealth = asyncHandler(async (req, res) => {
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Error rates and system issues
  const systemMetrics = {
    totalUsers: await User.countDocuments(),
    activeUsers24h: await User.countDocuments({
      lastLoginAt: { $gte: last24h },
    }),
    totalProjects: 0,
    activeProjects: 0,
    pendingApprovals: await RegistrationApproval.countDocuments({
      status: { $in: ["pending", "under_review"] },
    }),
    failedTransactions: await TokenTransaction.countDocuments({
      status: "failed",
      createdAt: { $gte: last7d },
    }),
  }

  // Database performance metrics
  const dbMetrics = {
    totalTransactions: await TokenTransaction.countDocuments(),
    transactionsLast24h: await TokenTransaction.countDocuments({
      createdAt: { $gte: last24h },
    }),
    avgTransactionTime: 0.15, // Mock metric - would be calculated from actual performance data
    successRate: 99.2, // Mock metric
  }

  // Recent system alerts
  const systemAlerts = [
    // These would be generated based on actual system monitoring
    {
      type: "info",
      message: "System running normally",
      timestamp: now,
      resolved: true,
    },
  ]

  successResponse(res, "System health metrics retrieved successfully", {
    systemMetrics,
    dbMetrics,
    systemAlerts,
    lastUpdated: now,
  })
})

// @desc    Get detailed reports
// @route   GET /api/dashboard/reports
// @access  Private (Government only)
const getDetailedReports = asyncHandler(async (req, res) => {
  const { reportType, startDate, endDate, format = "json" } = req.query

  const start = new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000)
  const end = new Date(endDate || Date.now())

  let reportData = {}

  switch (reportType) {
    case "user_activity":
      reportData = await generateUserActivityReport(start, end)
      break
    case "project_performance":
      reportData = []
      break
    case "token_circulation":
      reportData = await generateTokenCirculationReport(start, end)
      break
    case "approval_workflow":
      reportData = await generateApprovalWorkflowReport(start, end)
      break
    default:
      return errorResponse(res, "Invalid report type", 400)
  }

  successResponse(res, `${reportType} report generated successfully`, {
    reportType,
    period: { startDate: start, endDate: end },
    data: reportData,
    generatedAt: new Date(),
  })
})

// Helper functions for report generation
const generateUserActivityReport = async (startDate, endDate) => {
  return await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          userType: "$userType",
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        },
        newUsers: { $sum: 1 },
        avgTokenBalance: { $avg: "$tokenBalance" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ])
}

const generateTokenCirculationReport = async (startDate, endDate) => {
  return await TokenTransaction.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: "completed",
      },
    },
    {
      $group: {
        _id: {
          type: "$transactionType",
          tokenType: "$tokenType",
        },
        totalAmount: { $sum: "$amount" },
        transactionCount: { $sum: 1 },
        avgAmount: { $avg: "$amount" },
      },
    },
  ])
}

const generateApprovalWorkflowReport = async (startDate, endDate) => {
  return await RegistrationApproval.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          applicationType: "$applicationType",
          status: "$status",
        },
        count: { $sum: 1 },
        avgProcessingTime: {
          $avg: {
            $subtract: ["$reviewedAt", "$submittedAt"],
          },
        },
      },
    },
  ])
}

module.exports = {
  getDashboardOverview,
  getUserEngagement,
  getFinancialAnalytics,
  getSystemHealth,
  getDetailedReports,
}
