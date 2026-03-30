const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")
const User = require("../models/User")
const TokenToFiatConversion = require("../models/TokenToFiatConversion")
const TokenTransaction = require("../models/TokenTransaction")
const SocialProjectRegistration = require("../models/SocialProjectRegistration")
const crypto = require("crypto")

// @desc    Check if social project goal is completed
// @route   GET /api/token-conversion/check-project-goal/:projectId
// @access  Private (Social Project User)
const checkProjectGoalCompletion = asyncHandler(async (req, res) => {
  const { projectId } = req.params

  console.log("[v0] Checking project goal - projectId:", projectId)

  // Find all social projects for the authenticated user
  const socialProject = await SocialProjectRegistration.findOne({
    "projects._id": projectId,
    user: req.user._id,
  }).populate("user", "_id fullName email")

  if (!socialProject) {
    console.log("[v0] Project not found for user:", req.user._id)
    return errorResponse(res, "Project not found", 404)
  }

  console.log("[v0] Found social project registration:", socialProject._id)

  // Find the specific project within the registration
  const project = socialProject.projects.find((p) => p._id.toString() === projectId)

  if (!project) {
    console.log("[v0] Project details not found in registration")
    return errorResponse(res, "Project details not found", 404)
  }

  // Check if goal is completed
  const fundingGoal = project.fundingGoal || 0
  const tokensFunded = project.tokensFunded || 0
  const isGoalCompleted = tokensFunded >= fundingGoal && fundingGoal > 0

  console.log("[v0] Project goal check - fundingGoal:", fundingGoal, "tokensFunded:", tokensFunded)

  successResponse(res, "Project goal status retrieved successfully", {
    projectId: project._id,
    projectTitle: project.projectTitle,
    fundingGoal,
    tokensFunded,
    isGoalCompleted,
    remainingTokens: Math.max(0, fundingGoal - tokensFunded),
    completionPercentage: fundingGoal > 0 ? ((tokensFunded / fundingGoal) * 100).toFixed(2) : 0,
  })
})

// @desc    Request token to fiat conversion
// @route   POST /api/token-conversion/request
// @access  Private (Social Project User)
const requestTokenConversion = asyncHandler(async (req, res) => {
  const {
    projectId,
    tokenAmount,
    fiatCurrency = "USD",
    conversionRate = 1,
    bankDetails,
  } = req.body

  // Validate input
  if (!projectId || !tokenAmount || !bankDetails) {
    return errorResponse(res, "Missing required fields: projectId, tokenAmount, bankDetails", 400)
  }

  if (tokenAmount <= 0) {
    return errorResponse(res, "Token amount must be greater than 0", 400)
  }

  // Get user's current token balance
  const user = await User.findById(req.user._id)

  if (!user) {
    return errorResponse(res, "User not found", 404)
  }

  if (user.tokenBalance < tokenAmount) {
    return errorResponse(
      res,
      `Insufficient tokens. Available: ${user.tokenBalance}, Requested: ${tokenAmount}. Please request a smaller amount.`,
      400,
    )
  }

  // Verify project exists and belongs to user
  const socialProject = await SocialProjectRegistration.findOne({
    "projects._id": projectId,
    user: req.user._id,
  })

  if (!socialProject) {
    return errorResponse(res, "Project not found", 404)
  }

  // Find the specific project
  const project = socialProject.projects.find((p) => p._id.toString() === projectId)

  if (!project) {
    return errorResponse(res, "Project details not found", 404)
  }

  // Prevent duplicate conversion requests for the same project within 24 hours
  const existingRequest = await TokenToFiatConversion.findOne({
    socialProjectUser: req.user._id,
    relatedProject: projectId,
    status: { $in: ["pending", "approved_by_government"] }, // Only check active requests
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
  })

  if (existingRequest) {
    return errorResponse(
      res,
      `You already have an active conversion request (${existingRequest.requestId}) for this project. Please wait for it to be processed or rejected before creating a new one.`,
      400,
    )
  }

  // Calculate fiat amount
  const fiatAmount = tokenAmount * conversionRate

  // Generate unique request ID
  const requestId = `CONV-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`

  // Create conversion request in pending state FIRST
  const conversionRequest = new TokenToFiatConversion({
    requestId,
    socialProjectUser: req.user._id,
    relatedProject: projectId,
    tokenAmount,
    conversionRate,
    fiatAmount,
    fiatCurrency,
    bankDetails: {
      accountHolderName: bankDetails.accountHolderName,
      bankName: bankDetails.bankName,
      accountNumber: bankDetails.accountNumber,
      ifscCode: bankDetails.ifscCode,
      swiftCode: bankDetails.swiftCode,
      routingNumber: bankDetails.routingNumber,
      country: bankDetails.country,
    },
    status: "pending",
    tokensReserved: true, // Flag to track that tokens are reserved/deducted
    reservedAt: new Date(),
  })

  await conversionRequest.save()

  console.log(
    "[v0] Token conversion request created:",
    requestId,
    "- Deducting",
    tokenAmount,
    "tokens immediately",
  )

  // IMMEDIATELY deduct tokens from user wallet (Pessimistic locking approach)
  user.tokenBalance -= tokenAmount
  await user.save()

  console.log("[v0] Tokens deducted. New balance:", user.tokenBalance)

  // Create transaction record for the deduction
  const transaction = new TokenTransaction({
    transactionId: `CONV-HOLD-${requestId}`,
    transactionType: "hold",
    transactionDirection: "debit",
    fromUser: user._id,
    toUser: user._id,
    amount: tokenAmount,
    tokenType: "civic",
    relatedProject: projectId,
    status: "pending", // Transaction is pending until conversion is approved
    description: `Token conversion request hold - Request ID: ${requestId}`,
    category: "conversion",
    relatedConversionRequest: conversionRequest._id,
  })

  await transaction.save()

  // Store transaction ID in conversion request
  conversionRequest.tokenTransactionId = transaction._id
  await conversionRequest.save()

  successResponse(res, "Token conversion request created successfully", {
    requestId: conversionRequest.requestId,
    status: conversionRequest.status,
    tokenAmount: conversionRequest.tokenAmount,
    fiatAmount: conversionRequest.fiatAmount,
    fiatCurrency: conversionRequest.fiatCurrency,
    createdAt: conversionRequest.createdAt,
    newTokenBalance: user.tokenBalance,
    message:
      "Tokens have been reserved from your wallet. They will be released if your request is rejected.",
  })
})

// @desc    Get all conversion requests (for government users)
// @route   GET /api/token-conversion/requests
// @access  Private (Government User)
const getConversionRequests = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query

  // Verify user is government type
  if (req.user.userType !== "government") {
    return errorResponse(res, "Unauthorized: Only government users can access this", 403)
  }

  const filter = {}

  if (status) {
    filter.status = status
  }

  const skip = (page - 1) * limit

  const requests = await TokenToFiatConversion.find(filter)
    .populate("socialProjectUser", "_id fullName email")
    .populate("relatedProject", "_id projectOrganizationName")
    .populate("governmentUser", "_id fullName")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  const total = await TokenToFiatConversion.countDocuments(filter)

  successResponse(res, "Token conversion requests retrieved successfully", {
    requests,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  })
})

// @desc    Get single conversion request details
// @route   GET /api/token-conversion/requests/:requestId
// @access  Private
const getConversionRequestDetails = asyncHandler(async (req, res) => {
  const { requestId } = req.params

  const request = await TokenToFiatConversion.findOne({ requestId })
    .populate("socialProjectUser", "_id fullName email")
    .populate("relatedProject", "_id projectOrganizationName")
    .populate("governmentUser", "_id fullName")
    .populate("tokenTransactionId")

  if (!request) {
    return errorResponse(res, "Conversion request not found", 404)
  }

  // Check authorization - user can view their own, government can view all
  if (
    req.user.userType !== "government" &&
    request.socialProjectUser._id.toString() !== req.user._id.toString()
  ) {
    return errorResponse(res, "Unauthorized: Cannot view this request", 403)
  }

  successResponse(res, "Conversion request details retrieved successfully", request)
})

// @desc    Approve conversion request (Government action)
// @route   PATCH /api/token-conversion/requests/:requestId/approve
// @access  Private (Government User)
const approveConversionRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params
  const { internalNotes } = req.body

  // Verify user is government type
  if (req.user.userType !== "government") {
    return errorResponse(res, "Unauthorized: Only government users can approve requests", 403)
  }

  const request = await TokenToFiatConversion.findOne({ requestId }).populate(
    "socialProjectUser",
    "_id fullName email tokenBalance",
  )

  if (!request) {
    return errorResponse(res, "Conversion request not found", 404)
  }

  if (request.status !== "pending") {
    return errorResponse(res, `Cannot approve request with status: ${request.status}`, 400)
  }

  // Update request status
  request.status = "approved_by_government"
  request.governmentUser = req.user._id
  request.approvedAt = new Date()
  request.verificationStatus = "verified"
  if (internalNotes) {
    request.internalNotes = internalNotes
  }

  await request.save()

  successResponse(res, "Conversion request approved successfully", {
    requestId: request.requestId,
    status: request.status,
    approvedAt: request.approvedAt,
    message: "Awaiting payment processing",
  })
})

// @desc    Reject conversion request (Government action)
// @route   PATCH /api/token-conversion/requests/:requestId/reject
// @access  Private (Government User)
const rejectConversionRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params
  const { rejectionReason } = req.body

  // Verify user is government type
  if (req.user.userType !== "government") {
    return errorResponse(res, "Unauthorized: Only government users can reject requests", 403)
  }

  if (!rejectionReason) {
    return errorResponse(res, "Rejection reason is required", 400)
  }

  const request = await TokenToFiatConversion.findOne({ requestId }).populate(
    "socialProjectUser",
    "_id fullName email tokenBalance",
  )

  if (!request) {
    return errorResponse(res, "Conversion request not found", 404)
  }

  if (request.status === "paid" || request.status === "rejected") {
    return errorResponse(res, `Cannot reject request with status: ${request.status}`, 400)
  }

  // If tokens were reserved, refund them back to user
  if (request.tokensReserved) {
    console.log("[v0] Refunding tokens for rejected request:", requestId, "- Amount:", request.tokenAmount)

    const user = request.socialProjectUser
    user.tokenBalance += request.tokenAmount
    await user.save()

    console.log("[v0] Tokens refunded. New balance:", user.tokenBalance)

    // Create refund transaction record
    const refundTransaction = new TokenTransaction({
      transactionId: `CONV-REFUND-${requestId}`,
      transactionType: "refund",
      transactionDirection: "credit",
      fromUser: user._id,
      toUser: user._id,
      amount: request.tokenAmount,
      tokenType: "civic",
      relatedProject: request.relatedProject,
      approvedBy: req.user._id,
      status: "completed",
      description: `Token conversion request rejected and refunded - Request ID: ${requestId} - Reason: ${rejectionReason}`,
      category: "conversion",
      processedAt: new Date(),
    })

    await refundTransaction.save()
  }

  // Update request status
  request.status = "rejected"
  request.rejectionReason = rejectionReason
  request.rejectedAt = new Date()
  request.rejectedBy = req.user._id

  await request.save()

  successResponse(res, "Conversion request rejected successfully", {
    requestId: request.requestId,
    status: request.status,
    rejectionReason: request.rejectionReason,
    tokensRefunded: request.tokensReserved ? request.tokenAmount : 0,
    userTokenBalance: request.socialProjectUser.tokenBalance,
    message: request.tokensReserved
      ? `Request rejected. ${request.tokenAmount} tokens have been refunded to user wallet.`
      : "Request rejected. No tokens were refunded.",
  })
})

// @desc    Mark conversion as paid (tokens already deducted at request time)
// @route   PATCH /api/token-conversion/requests/:requestId/mark-paid
// @access  Private (Government User)
const markConversionAsPaid = asyncHandler(async (req, res) => {
  const { requestId } = req.params
  const { transactionId, paymentMethod, bankTransferDetails, paymentNotes } = req.body

  // Verify user is government type
  if (req.user.userType !== "government") {
    return errorResponse(res, "Unauthorized: Only government users can mark payments", 403)
  }

  if (!transactionId) {
    return errorResponse(res, "Transaction ID is required", 400)
  }

  const request = await TokenToFiatConversion.findOne({ requestId }).populate(
    "socialProjectUser",
    "_id fullName email tokenBalance",
  )

  if (!request) {
    return errorResponse(res, "Conversion request not found", 404)
  }

  if (request.status !== "approved_by_government") {
    return errorResponse(
      res,
      `Cannot mark as paid. Current status: ${request.status}. Must be approved_by_government`,
      400,
    )
  }

  const user = request.socialProjectUser

  console.log(
    "[v0] Marking conversion as paid:",
    requestId,
    "- Tokens already deducted at request time",
  )

  // Create payment completion transaction record
  const transaction = new TokenTransaction({
    transactionId: `CONV-PAID-${transactionId}`,
    transactionType: "spend",
    transactionDirection: "debit",
    fromUser: user._id,
    toUser: user._id, // Self transaction for record keeping
    amount: request.tokenAmount,
    tokenType: "civic",
    relatedProject: request.relatedProject,
    issuedBy: req.user._id,
    approvedBy: req.user._id,
    status: "completed",
    description: `Token to Fiat Conversion Completed - Request ID: ${requestId} - Payment Ref: ${transactionId}`,
    category: "conversion",
    processedAt: new Date(),
  })

  await transaction.save()

  // Update conversion request with payment details
  request.status = "paid"
  request.paymentDetails = {
    transactionId,
    paidAt: new Date(),
    paymentMethod: paymentMethod || "bank_transfer",
    paymentNotes,
  }

  if (bankTransferDetails) {
    request.paymentDetails.bankTransferDetails = bankTransferDetails
  }

  request.tokenTransactionId = transaction._id
  request.tokensReserved = false // Tokens are no longer reserved, conversion is complete

  await request.save()

  successResponse(res, "Conversion marked as paid successfully", {
    requestId: request.requestId,
    status: request.status,
    paidAt: request.paymentDetails.paidAt,
    userTokenBalance: user.tokenBalance,
    transactionId: transaction.transactionId,
    message:
      "Conversion payment completed successfully. Tokens were deducted when the request was created.",
  })
})

// @desc    Get conversion history for a user
// @route   GET /api/token-conversion/user/history
// @access  Private
const getConversionHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query

  const skip = (page - 1) * limit

  const requests = await TokenToFiatConversion.find({ socialProjectUser: req.user._id })
    .populate("relatedProject", "_id projectOrganizationName")
    .populate("governmentUser", "_id fullName")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  const total = await TokenToFiatConversion.countDocuments({ socialProjectUser: req.user._id })

  successResponse(res, "User conversion history retrieved successfully", {
    requests,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  })
})

// @desc    Add comment to conversion request
// @route   POST /api/token-conversion/requests/:requestId/comment
// @access  Private
const addConversionComment = asyncHandler(async (req, res) => {
  const { requestId } = req.params
  const { comment } = req.body

  if (!comment || comment.trim() === "") {
    return errorResponse(res, "Comment cannot be empty", 400)
  }

  const request = await TokenToFiatConversion.findOne({ requestId })

  if (!request) {
    return errorResponse(res, "Conversion request not found", 404)
  }

  // Check authorization
  if (
    req.user.userType !== "government" &&
    request.socialProjectUser.toString() !== req.user._id.toString()
  ) {
    return errorResponse(res, "Unauthorized: Cannot comment on this request", 403)
  }

  request.comments.push({
    addedBy: req.user._id,
    comment,
    addedAt: new Date(),
  })

  await request.save()

  successResponse(res, "Comment added successfully", {
    requestId,
    comment: request.comments[request.comments.length - 1],
  })
})

module.exports = {
  checkProjectGoalCompletion,
  requestTokenConversion,
  getConversionRequests,
  getConversionRequestDetails,
  approveConversionRequest,
  rejectConversionRequest,
  markConversionAsPaid,
  getConversionHistory,
  addConversionComment,
}
