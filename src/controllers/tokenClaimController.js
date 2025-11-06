const TokenClaim = require("../models/TokenClaim")
const TokenTransaction = require("../models/TokenTransaction")
const User = require("../models/User")
const Government = require("../models/Government")
const { generateUniqueId } = require("../utils/helpers")
const { sendEmail } = require("../utils/emailService")
const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")

// @desc    Submit token claim request
// @route   POST /api/tokens/claims
// @access  Private (Citizens only)
const submitTokenClaim = asyncHandler(async (req, res) => {
  const { paymentType, paymentAmount, paymentCurrency, paymentDate, paymentReference, description } = req.body

  // Only citizens can submit claims
  if (req.user.userType !== "citizen") {
    return errorResponse(res, "Only citizens can submit token claims", 403)
  }

  // Generate claim ID
  const claimId = generateUniqueId("CLAIM")

  const tokenClaim = await TokenClaim.create({
    claimId,
    claimant: req.user._id,
    paymentType,
    paymentAmount,
    paymentCurrency: paymentCurrency || "ARS",
    paymentDate: new Date(paymentDate),
    paymentReference,
    description,
    proofDocuments: req.files
      ? req.files.map((file) => ({
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        }))
      : [],
    metadata: {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    },
  })

  // Send notification to government users
  const governmentUsers = await User.find({ userType: "government", isActive: true })

  for (const govUser of governmentUsers) {
    await sendEmail({
      to: govUser.email,
      subject: "New Token Claim Submitted",
      template: "newTokenClaim",
      data: {
        governmentName: govUser.fullName,
        claimantName: req.user.fullName,
        claimId,
        paymentType,
        paymentAmount,
        calculatedTokens: tokenClaim.calculatedTokens,
      },
    })
  }

  successResponse(
    res,
    "Token claim submitted successfully",
    {
      claim: {
        id: tokenClaim._id,
        claimId,
        paymentAmount,
        calculatedTokens: tokenClaim.calculatedTokens,
        status: tokenClaim.status,
        submittedAt: tokenClaim.createdAt,
      },
    },
    201,
  )
})

// @desc    Get user's token claims
// @route   GET /api/tokens/claims/my
// @access  Private (Citizens only)
const getMyTokenClaims = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query

  const filter = { claimant: req.user._id }
  if (status) filter.status = status

  const claims = await TokenClaim.find(filter)
    .populate("reviewedBy", "fullName")
    .populate("tokenTransaction", "transactionId amount status")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)

  const total = await TokenClaim.countDocuments(filter)

  successResponse(res, "Token claims retrieved successfully", {
    claims,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total,
    },
  })
})

// @desc    Get all token claims (Government only)
// @route   GET /api/tokens/claims
// @access  Private (Government only)
const getAllTokenClaims = asyncHandler(async (req, res) => {
  // Verify government permissions
  if (req.user.userType !== "government") {
    return errorResponse(res, "Unauthorized access", 403)
  }

  const { page = 1, limit = 10, status, paymentType } = req.query

  const filter = {}
  if (status) filter.status = status
  if (paymentType) filter.paymentType = paymentType

  const claims = await TokenClaim.find(filter)
    .populate("claimant", "fullName email userType")
    .populate("reviewedBy", "fullName")
    .populate("tokenTransaction", "transactionId amount status")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)

  const total = await TokenClaim.countDocuments(filter)

  successResponse(res, "Token claims retrieved successfully", {
    claims,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total,
    },
  })
})

// @desc    Review token claim (Approve/Reject)
// @route   PUT /api/tokens/claims/:id/review
// @access  Private (Government only)
const reviewTokenClaim = asyncHandler(async (req, res) => {
  const { decision, reviewNotes, rejectionReason } = req.body

  // Verify government permissions
  const government = await Government.findOne({ userId: req.user._id })
  if (!government || government.status !== "approved") {
    return errorResponse(res, "Unauthorized to review token claims", 403)
  }

  const claim = await TokenClaim.findById(req.params.id).populate("claimant")
  if (!claim) {
    return errorResponse(res, "Token claim not found", 404)
  }

  if (claim.status !== "pending" && claim.status !== "under_review") {
    return errorResponse(res, "This claim has already been reviewed", 400)
  }

  claim.status = decision === "approve" ? "approved" : "rejected"
  claim.reviewedBy = req.user._id
  claim.reviewedAt = new Date()
  claim.reviewNotes = reviewNotes
  if (decision === "reject") {
    claim.rejectionReason = rejectionReason
  }

  await claim.save()

  if (decision === "approve") {
    // Check daily issuance limit
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIssuance = await TokenTransaction.aggregate([
      {
        $match: {
          issuedBy: req.user._id,
          transactionType: "issue",
          createdAt: { $gte: today },
        },
      },
      {
        $group: {
          _id: null,
          totalIssued: { $sum: "$amount" },
        },
      },
    ])

    const todayTotal = todayIssuance[0]?.totalIssued || 0
    if (todayTotal + claim.calculatedTokens > government.tokenAllocationLimits.dailyIssuanceLimit) {
      return errorResponse(res, "Daily issuance limit would be exceeded", 400)
    }

    // Create token transaction
    const transactionId = generateUniqueId("TXN")
    const transaction = await TokenTransaction.create({
      transactionId,
      transactionType: "issue",
      toUser: claim.claimant._id,
      amount: claim.calculatedTokens,
      tokenType: "civic",
      description: `Token claim approved - ${claim.paymentType} payment`,
      category: "participation",
      issuedBy: req.user._id,
      approvedBy: req.user._id,
      status: "completed",
      processedAt: new Date(),
    })

    // Update user token balance
    await User.findByIdAndUpdate(claim.claimant._id, {
      $inc: { tokenBalance: claim.calculatedTokens },
    })

    // Link transaction to claim
    claim.tokenTransaction = transaction._id
    await claim.save()

    // Send approval notification
    await sendEmail({
      to: claim.claimant.email,
      subject: "Token Claim Approved",
      template: "tokenClaimApproved",
      data: {
        claimantName: claim.claimant.fullName,
        claimId: claim.claimId,
        tokensAwarded: claim.calculatedTokens,
        paymentType: claim.paymentType,
        paymentAmount: claim.paymentAmount,
        transactionId,
      },
    })
  } else {
    // Send rejection notification
    await sendEmail({
      to: claim.claimant.email,
      subject: "Token Claim Rejected",
      template: "tokenClaimRejected",
      data: {
        claimantName: claim.claimant.fullName,
        claimId: claim.claimId,
        rejectionReason,
        reviewNotes,
      },
    })
  }

  successResponse(res, `Token claim ${decision}d successfully`, {
    claim: {
      id: claim._id,
      claimId: claim.claimId,
      status: claim.status,
      reviewedAt: claim.reviewedAt,
      tokensAwarded: decision === "approve" ? claim.calculatedTokens : 0,
    },
  })
})

// @desc    Get token claim statistics
// @route   GET /api/tokens/claims/stats
// @access  Private (Government only)
const getTokenClaimStats = asyncHandler(async (req, res) => {
  if (req.user.userType !== "government") {
    return errorResponse(res, "Unauthorized access", 403)
  }

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
    default:
      startDate.setDate(endDate.getDate() - 30)
  }

  const stats = await TokenClaim.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalTokens: { $sum: "$calculatedTokens" },
        totalPaymentAmount: { $sum: "$paymentAmount" },
      },
    },
  ])

  const paymentTypeStats = await TokenClaim.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$paymentType",
        count: { $sum: 1 },
        totalTokens: { $sum: "$calculatedTokens" },
        avgPaymentAmount: { $avg: "$paymentAmount" },
      },
    },
  ])

  successResponse(res, "Token claim statistics retrieved successfully", {
    period,
    statusStats: stats,
    paymentTypeStats,
  })
})

module.exports = {
  submitTokenClaim,
  getMyTokenClaims,
  getAllTokenClaims,
  reviewTokenClaim,
  getTokenClaimStats,
}
