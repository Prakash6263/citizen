const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")
const User = require("../models/User")
const TokenTransaction = require("../models/TokenTransaction")

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

module.exports = {
  getTokenBalance,
}
