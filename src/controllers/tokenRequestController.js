const TokenRequest = require("../models/TokenRequest")
const TokenTransaction = require("../models/TokenTransaction")
const User = require("../models/User")
const AuditLog = require("../models/AuditLog")
const { generateUniqueId } = require("../utils/helpers")
const { sendEmail } = require("../utils/emailService")
const localStorageService = require("../utils/localStorageService")
const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")
const path = require("path")

// @desc    Create token request (citizen submits)
// @route   POST /api/token-requests
// @access  Private (citizen)
const createTokenRequest = asyncHandler(async (req, res) => {
  const { tokenAmount, requestReason } = req.body

  // Validate required fields
  if (!tokenAmount || tokenAmount < 1) {
    return errorResponse(res, "tokenAmount is required and must be at least 1", 400)
  }

  // Validate file upload - proof document is required
  if (!req.file) {
    return errorResponse(res, "Proof document is required (image or PDF - tax or eligibility proof)", 400)
  }

  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "application/pdf"]
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return errorResponse(res, "Invalid file type. Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed", 400)
  }

  // Validate file size (max 10MB)
  if (req.file.size > 10 * 1024 * 1024) {
    return errorResponse(res, "File size must not exceed 10MB", 400)
  }

  try {
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
      tokenAmount: Number(tokenAmount),
      requestReason: requestReason || "",
      proofDocuments: [proofDocument],
      status: "pending",
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
    })

    // Audit log
    await AuditLog.logAction({
      user: req.user._id,
      action: "create_token_request",
      description: `Requested ${tokenAmount} tokens`,
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
        tokenAmount,
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

module.exports = {
  createTokenRequest,
  getMyTokenRequests,
  getTokenRequestDetails,
}
