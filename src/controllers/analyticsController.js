const Comment = require("../models/Comment")
const User = require("../models/User")
const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")

// @desc    Get user analytics
// @route   GET /api/analytics/users/:userId
// @access  Private (User or admin only)
const getUserAnalytics = asyncHandler(async (req, res) => {
  const targetUserId = req.params.userId

  // Check if user can access these analytics
  if (req.user._id.toString() !== targetUserId && req.user.role !== "superadmin") {
    return errorResponse(res, "Not authorized to view these analytics", 403)
  }

  const user = await User.findById(targetUserId)

  if (!user) {
    return errorResponse(res, "User not found", 404)
  }

  const { timeframe = "30d" } = req.query

  // Calculate date range
  const now = new Date()
  let startDate

  switch (timeframe) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  const analytics = {
    user: {
      id: user._id,
      fullName: user.fullName,
      userType: user.userType,
      joinDate: user.createdAt,
      lastActive: user.lastLogin,
    },
    timeframe,
    generatedAt: new Date(),
  }

  successResponse(res, "User analytics retrieved successfully", analytics)
})

module.exports = {
  getUserAnalytics,
}
