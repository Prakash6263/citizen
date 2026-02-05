const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")
const User = require("../models/User")
const TokenTransaction = require("../models/TokenTransaction")

// @desc    Get user approved token balance (calculated)
// @route   GET /api/tokens/balance
// @access  Private
const getTokenBalance = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const user = await User.findById(userId).select("fullName email")
  if (!user) {
    return errorResponse(res, "User not found", 404)
  }

  // ✅ Sum of all approved token credits
const result = await TokenTransaction.aggregate([
  {
    $match: {
      toUser: userId,
      transactionDirection: "credit",
      status: "completed",
    },
  },
  {
    $group: {
      _id: "$toUser",
      totalTokens: { $sum: "$amount" },
    },
  },
])


  const totalTokens = result.length > 0 ? result[0].totalTokens : 0

  return successResponse(
    res,
    `token approved by government,received-${totalTokens} `,
    {
      user: {
        id: user._id,
        name: user.fullName,
        email: user.email,
      },
      tokenBalance: totalTokens,
    }
  )
})

// @desc    Submit token claim request
// @route   POST /api/tokens/claim
// @access  Private
const submitTokenClaim = asyncHandler(async (req, res) => {
 
  const userId = req.user._id;
  const { amount, reason } = req.body;

  if (!amount || amount <= 0) {
    return errorResponse(res, "Valid token amount is required", 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    return errorResponse(res, "User not found", 404);
  }

  const claim = await TokenTransaction.create({
    fromUser: userId,
    transactionDirection: "debit", // user claiming tokens
    amount,
    reason,
    status: "pending", // admin/government approval needed
  });

  return successResponse(
    res,
    "Token claim submitted successfully",
    {
      claimId: claim._id,
      amount: claim.amount,
      status: claim.status,
    },
    201
  );
});

// @desc    Get logged-in user's token claims
// @route   GET /api/tokens/my-claims
// @access  Private
const getMyTokenClaims = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const claims = await TokenTransaction.find({
    fromUser: userId,
    transactionDirection: "debit",
  })
    .select("amount reason status createdAt")
    .sort({ createdAt: -1 });

  return successResponse(
    res,
    "My token claims fetched successfully",
    {
      totalClaims: claims.length,
      claims,
    }
  );
});

module.exports = {
  getTokenBalance,
  submitTokenClaim,
  getMyTokenClaims,
};

