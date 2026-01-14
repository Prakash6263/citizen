const FundRequest = require("../models/FundRequest")
const SocialProjectRegistration = require("../models/SocialProjectRegistration")
const User = require("../models/User")
const AuditLog = require("../models/AuditLog")
const { generateUniqueId } = require("../utils/helpers")
const { sendEmail } = require("../utils/emailService")
const localStorageService = require("../utils/localStorageService")
const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")
const path = require("path")

// @desc    Create fund request (citizen/project submits)
// @route   POST /api/fund-requests
// @access  Private (citizen/social_project)
const createFundRequest = asyncHandler(async (req, res) => {
  const { projectId, tokenAmount, requestedFiatAmount, fiatCurrency = "ARS", bankDetails } = req.body

  // Validate project exists and belongs to requester
  const project = await SocialProjectRegistration.findById(projectId)
  if (!project) {
    return errorResponse(res, "Social project not found", 404)
  }

  if (project.user.toString() !== req.user._id.toString()) {
    return errorResponse(res, "Not authorized to create fund request for this project", 403)
  }

  // Validate required fields
  if (!tokenAmount || !requestedFiatAmount) {
    return errorResponse(res, "tokenAmount and requestedFiatAmount are required", 400)
  }

  if (!bankDetails || !bankDetails.bankName || !bankDetails.accountNumber) {
    return errorResponse(res, "Bank details with bankName and accountNumber are required", 400)
  }

  // Validate file upload if provided
  if (!req.file) {
    return errorResponse(res, "Bank transfer proof document is required (image or PDF)", 400)
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
    const uploadResult = await localStorageService.uploadFile(req.file.buffer, {
      folder: `municipality/fund-requests/${req.user._id}/proof`,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      public_id: `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(req.file.originalname)}`,
    })

    const bankTransferProof = {
      filename: uploadResult.public_id,
      originalName: req.file.originalname,
      fileUrl: uploadResult.secure_url,
      mimetype: req.file.mimetype,
      uploadedAt: new Date(),
    }

    // Create fund request
    const fundRequestId = generateUniqueId("FUNDREQ")

    const fundRequest = await FundRequest.create({
      fundRequestId,
      projectId: project._id,
      requestedBy: req.user._id,
      city: req.user.city,
      tokenAmount: Number(tokenAmount),
      requestedFiatAmount: Number(requestedFiatAmount),
      fiatCurrency,
      bankDetails: {
        bankName: bankDetails.bankName,
        accountHolder: bankDetails.accountHolder || req.user.fullName,
        accountNumber: bankDetails.accountNumber,
        accountType: bankDetails.accountType,
        routingNumber: bankDetails.routingNumber,
        swiftCode: bankDetails.swiftCode,
      },
      bankTransferProof,
      status: "pending",
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
    })

    await AuditLog.logAction({
      user: req.user._id,
      action: "create_fund_request",
      description: `Created fund request for ${requestedFiatAmount} ${fiatCurrency}`,
      entityType: "fund_request",
      entityId: fundRequest._id,
      city: req.user.city,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    })

    // Send confirmation email
    await sendEmail({
      email: req.user.email,
      subject: "Fund Request Submitted",
      template: "fundRequestSubmitted",
      data: {
        projectName: project.projectOrganizationName,
        fundRequestId,
        tokenAmount,
        fiatAmount: requestedFiatAmount,
        currency: fiatCurrency,
      },
    })

    successResponse(res, "Fund request created successfully", { fundRequest }, 201)
  } catch (error) {
    console.error("Fund request creation error:", error)
    errorResponse(res, "Failed to create fund request", 500)
  }
})

// @desc    Get citizen's fund requests
// @route   GET /api/fund-requests
// @access  Private (citizen/social_project)
const getMyfundRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query

  const filter = { requestedBy: req.user._id }
  if (status) {
    filter.status = status
  }

  const fundRequests = await FundRequest.find(filter)
    .populate("projectId", "projectOrganizationName")
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 })

  const total = await FundRequest.countDocuments(filter)

  successResponse(res, "Fund requests retrieved", {
    fundRequests,
    pagination: { page: Number(page), limit: Number(limit), total },
  })
})

// @desc    Get specific fund request details
// @route   GET /api/fund-requests/:fundRequestId
// @access  Private (citizen/social_project - owner only)
const getFundRequestDetails = asyncHandler(async (req, res) => {
  const { fundRequestId } = req.params

  const fundRequest = await FundRequest.findById(fundRequestId)
    .populate("projectId")
    .populate("requestedBy", "fullName email")
    .populate("reviewedBy", "fullName email")

  if (!fundRequest) {
    return errorResponse(res, "Fund request not found", 404)
  }

  if (fundRequest.requestedBy._id.toString() !== req.user._id.toString()) {
    return errorResponse(res, "Not authorized to view this fund request", 403)
  }

  successResponse(res, "Fund request details retrieved", { fundRequest })
})

module.exports = {
  createFundRequest,
  getMyfundRequests,
  getFundRequestDetails,
}
