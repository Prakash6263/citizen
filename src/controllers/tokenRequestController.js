const TokenRequest = require("../models/TokenRequest")
const TokenTransaction = require("../models/TokenTransaction")
const User = require("../models/User")
const Government = require("../models/Government")
const AuditLog = require("../models/AuditLog")
const { generateUniqueId } = require("../utils/helpers")
const { sendEmail } = require("../utils/emailService")
const localStorageService = require("../utils/localStorageService")
const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")
const path = require("path")
const crypto = require("crypto")

// @desc    Create token request (citizen submits) - only proof document required
// @route   POST /api/token-requests
// @access  Private (citizen)
const createTokenRequest = asyncHandler(async (req, res) => {
  // Validate file upload - proof document is required
  if (!req.file) {
    return errorResponse(res, "Proof document is required (image or PDF - tax or eligibility proof)", 400)
  }

  // Validate file size (max 10MB)
  if (req.file.size > 10 * 1024 * 1024) {
    return errorResponse(res, "File size must not exceed 10MB", 400)
  }

  try {
    console.log("[v0] Creating token request for citizen:", {
      citizenId: req.user._id,
      citizenEmail: req.user.email,
      citizenCity: req.user.city,
      fileName: req.file.originalname,
    })

    // Upload proof document
    const uploadResult = await localStorageService.uploadFile(req.file.buffer, {
      folder: `municipality/token-requests/${req.user._id}/proof`,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      public_id: `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(req.file.originalname)}`,
    })

    const proofDocument = {
      filename: uploadResult.public_id,
      originalName: req.file.originalname,
      fileUrl: uploadResult.secure_url,
      mimetype: req.file.mimetype,
      uploadedAt: new Date(),
    }

    // Create token request
    const tokenRequestId = generateUniqueId("TOKENREQ")

    const tokenRequest = await TokenRequest.create({
      tokenRequestId,
      requestedBy: req.user._id,
      city: req.user.city,
      proofDocuments: [proofDocument],
      status: "pending",
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
    })

    console.log("[v0] Token request created successfully:", {
      tokenRequestId: tokenRequest.tokenRequestId,
      savedCity: tokenRequest.city,
      status: tokenRequest.status,
    })

    // Audit log
    await AuditLog.logAction({
      user: req.user._id,
      action: "create_token_request",
      description: `Submitted token request with proof document`,
      entityType: "token_request",
      entityId: tokenRequest._id,
      city: req.user.city,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    })

    // Send confirmation email
    await sendEmail({
      email: req.user.email,
      subject: "Token Request Submitted",
      template: "tokenRequestSubmitted",
      data: {
        citizenName: req.user.fullName,
        tokenRequestId,
      },
    })

    successResponse(res, "Token request created successfully", { tokenRequest }, 201)
  } catch (error) {
    console.error("Token request creation error:", error)
    errorResponse(res, "Failed to create token request", 500)
  }
})

// @desc    Get citizen's token requests
// @route   GET /api/token-requests
// @access  Private (citizen)
const getMyTokenRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query

  const filter = { requestedBy: req.user._id }
  if (status) {
    filter.status = status
  }

  const tokenRequests = await TokenRequest.find(filter)
    .populate("reviewedBy", "fullName email")
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 })

  const total = await TokenRequest.countDocuments(filter)

  successResponse(res, "Token requests retrieved", {
    requests: tokenRequests,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
    },
  })
})

// @desc    Get specific token request details
// @route   GET /api/token-requests/:tokenRequestId
// @access  Private (citizen - owner only)
const getTokenRequestDetails = asyncHandler(async (req, res) => {
  const { tokenRequestId } = req.params

  const tokenRequest = await TokenRequest.findById(tokenRequestId)
    .populate("requestedBy", "fullName email city")
    .populate("reviewedBy", "fullName email")

  if (!tokenRequest) {
    return errorResponse(res, "Token request not found", 404)
  }

  // Verify ownership
  if (tokenRequest.requestedBy._id.toString() !== req.user._id.toString()) {
    return errorResponse(res, "Not authorized to view this token request", 403)
  }

  successResponse(res, "Token request details retrieved", { tokenRequest })
})

// @desc    Get pending token requests for government (city-based isolation)
// @route   GET /api/token-requests/government
// @access  Private (government)
const getPendingTokenRequests = asyncHandler(async (req, res) => {
  // Verify government permissions
  if (req.user.userType !== "government") {
    return errorResponse(res, "Only government users can view token requests", 403)
  }

  const { page = 1, limit = 20, status } = req.query

  console.log("[v0] Government user requesting token requests:", {
    governmentId: req.user._id,
    governmentCity: req.user.city,
    userType: req.user.userType,
    status: status || "all",
  })

  const filter = { city: req.user.city } // City isolation - government only sees their city's requests
  if (status) {
    filter.status = status
  }

  const tokenRequests = await TokenRequest.find(filter)
    .populate("requestedBy", "fullName email city")
    .populate("reviewedBy", "fullName email")
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 })

  const total = await TokenRequest.countDocuments(filter)

  console.log("[v0] Token requests found:", {
    count: tokenRequests.length,
    total,
    filter,
  })

  successResponse(res, "Token requests retrieved", {
    requests: tokenRequests,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
    },
  })
})

// @desc    Government approves token request and issues tokens
// @route   POST /api/government/token-requests/:tokenRequestId/approve
// @access  Private (government)
const approveTokenRequest = asyncHandler(async (req, res) => {
  const { amount } = req.body

  // Verify government permissions
  if (req.user.userType !== "government") {
    return errorResponse(res, "Only government users can approve token requests", 403)
  }

  // Validate amount
  if (!amount || amount < 1) {
    return errorResponse(res, "Amount is required and must be at least 1 token", 400)
  }

  // Find token request
  const tokenRequest = await TokenRequest.findById(req.params.tokenRequestId).populate("requestedBy")

  if (!tokenRequest) {
    return errorResponse(res, "Token request not found", 404)
  }

  // Verify city isolation
  if (tokenRequest.city !== req.user.city) {
    return errorResponse(res, "You can only review requests from your city", 403)
  }

  // Verify request is pending
  if (tokenRequest.status !== "pending" && tokenRequest.status !== "under_review") {
    return errorResponse(res, "This request has already been reviewed", 400)
  }

  try {
    // Check daily issuance limit
    const government = await Government.findOne({ userId: req.user._id })
    if (!government || government.status !== "approved") {
      return errorResponse(res, "Unauthorized to approve token requests", 403)
    }

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
    if (todayTotal + amount > government.tokenAllocationLimits.dailyIssuanceLimit) {
      return errorResponse(res, "Daily issuance limit would be exceeded", 400)
    }

    // Update request status
    tokenRequest.status = "approved"
    tokenRequest.reviewedBy = req.user._id
    tokenRequest.reviewedAt = new Date()
    tokenRequest.issueAmount = amount

    // Create token transaction
    const transactionId = generateUniqueId("TXN")
    const transaction = await TokenTransaction.create({
      transactionId,
      transactionType: "issue",
      transactionDirection: "credit",
      toUser: tokenRequest.requestedBy._id,
      amount,
      tokenType: "civic",
      description: `Token request approved - ${amount} tokens issued`,
      category: "participation",
      issuedBy: req.user._id,
      approvedBy: req.user._id,
      status: "completed",
      processedAt: new Date(),
    })

    // Update citizen token balance
    await User.findByIdAndUpdate(tokenRequest.requestedBy._id, {
      $inc: { tokenBalance: amount },
    })

    // Link transaction to request
    tokenRequest.tokenTransaction = transaction._id
    await tokenRequest.save()

    // Audit log
    await AuditLog.logAction({
      user: req.user._id,
      action: "approve_token_request",
      description: `Approved token request and issued ${amount} tokens to ${tokenRequest.requestedBy.fullName}`,
      entityType: "token_request",
      entityId: tokenRequest._id,
      city: req.user.city,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    })

    // Send approval notification
    await sendEmail({
      email: tokenRequest.requestedBy.email,
      subject: "Token Request Approved",
      template: "tokenRequestApproved",
      data: {
        citizenName: tokenRequest.requestedBy.fullName,
        tokenRequestId: tokenRequest.tokenRequestId,
        tokensIssued: amount,
      },
    })

    successResponse(res, "Token request approved and tokens issued successfully", {
      request: {
        id: tokenRequest._id,
        tokenRequestId: tokenRequest.tokenRequestId,
        status: tokenRequest.status,
        issueAmount: amount,
        reviewedAt: tokenRequest.reviewedAt,
        transaction: {
          transactionId: transaction.transactionId,
          amount: transaction.amount,
        },
      },
    })
  } catch (error) {
    console.error("Token request approval error:", error)
    errorResponse(res, "Failed to approve token request", 500)
  }
})

// @desc    Government rejects token request
// @route   POST /api/government/token-requests/:tokenRequestId/reject
// @access  Private (government)
const rejectTokenRequest = asyncHandler(async (req, res) => {
  const { rejectionReason, reviewNotes } = req.body

  // Verify government permissions
  if (req.user.userType !== "government") {
    return errorResponse(res, "Only government users can reject token requests", 403)
  }

  // Validate rejection reason
  if (!rejectionReason) {
    return errorResponse(res, "Rejection reason is required", 400)
  }

  // Find token request
  const tokenRequest = await TokenRequest.findById(req.params.tokenRequestId).populate("requestedBy")

  if (!tokenRequest) {
    return errorResponse(res, "Token request not found", 404)
  }

  // Verify city isolation
  if (tokenRequest.city !== req.user.city) {
    return errorResponse(res, "You can only review requests from your city", 403)
  }

  // Verify request is pending
  if (tokenRequest.status !== "pending" && tokenRequest.status !== "under_review") {
    return errorResponse(res, "This request has already been reviewed", 400)
  }

  try {
    // Update request status
    tokenRequest.status = "rejected"
    tokenRequest.reviewedBy = req.user._id
    tokenRequest.reviewedAt = new Date()
    tokenRequest.rejectionReason = rejectionReason
    tokenRequest.reviewNotes = reviewNotes || ""
    await tokenRequest.save()

    // Audit log
    await AuditLog.logAction({
      user: req.user._id,
      action: "reject_token_request",
      description: `Rejected token request: ${rejectionReason}`,
      entityType: "token_request",
      entityId: tokenRequest._id,
      city: req.user.city,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    })

    // Send rejection notification
    await sendEmail({
      email: tokenRequest.requestedBy.email,
      subject: "Token Request Rejected",
      template: "tokenRequestRejected",
      data: {
        citizenName: tokenRequest.requestedBy.fullName,
        tokenRequestId: tokenRequest.tokenRequestId,
        rejectionReason,
        reviewNotes,
      },
    })

    successResponse(res, "Token request rejected successfully", {
      request: {
        id: tokenRequest._id,
        tokenRequestId: tokenRequest.tokenRequestId,
        status: tokenRequest.status,
        rejectionReason,
        reviewedAt: tokenRequest.reviewedAt,
      },
    })
  } catch (error) {
    console.error("Token request rejection error:", error)
    errorResponse(res, "Failed to reject token request", 500)
  }
})

module.exports = {
  createTokenRequest,
  getMyTokenRequests,
  getTokenRequestDetails,
  getPendingTokenRequests,
  approveTokenRequest,
  rejectTokenRequest,
}
