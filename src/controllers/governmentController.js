const Government = require("../models/Government")
const User = require("../models/User")
const RegistrationApproval = require("../models/RegistrationApproval")
const SocialProjectRegistration = require("../models/SocialProjectRegistration")
const TokenClaim = require("../models/TokenClaim")
const FundRequest = require("../models/FundRequest")
const TokenTransaction = require("../models/TokenTransaction")
const AuditLog = require("../models/AuditLog")
const TokenRequest = require("../models/TokenRequest") // Added TokenRequest model import
const { generateUniqueId } = require("../utils/helpers")
const { sendEmail } = require("../utils/emailService")
const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")

// ============================================
// EXISTING FUNCTIONS (registration)
// ============================================

// Step 1: Institutional Information
// @desc    Register government (step 1)
// @route   POST /api/government/register/step-1
// @access  Public
const registerGovernmentStep1 = asyncHandler(async (req, res) => {
  const {
    governmentName,
    entityType,
    country,
    province,
    city,
    representativeName,
    representativeRole,
    institutionalEmail,
  } = req.body

  const existingGov = await Government.findOne({
    $or: [{ institutionalEmail }, { governmentName, entityType, city }],
  })
  if (existingGov) return errorResponse(res, "Government entity already started registration", 400)

  const registrationNumber = generateUniqueId("GOV")

  const government = await Government.create({
    governmentName,
    entityType,
    country,
    province,
    city,
    representativeName,
    representativeRole,
    institutionalEmail,
    registrationNumber,
    status: "pending",
    verificationStatus: "unverified",
  })

  return successResponse(
    res,
    "Government registration step 1 saved",
    {
      government: {
        _id: government._id,
        governmentName,
        registrationNumber,
        status: government.status,
      },
    },
    201,
  )
})

// Step 2: Main Contact & Consents -> Submit for approval
// @desc    Complete government registration (step 2)
// @route   PUT /api/government/register/step-2/:id
// @access  Public
const registerGovernmentStep2 = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { officialWebsite, comments, consentContactBeforeActivation, acceptedTermsAndConditions } = req.body

  const government = await Government.findById(id)
  if (!government) return errorResponse(res, "Government draft not found", 404)

  government.officialWebsite = officialWebsite
  government.comments = comments
  government.consentContactBeforeActivation = !!consentContactBeforeActivation
  government.acceptedTermsAndConditions = !!acceptedTermsAndConditions
  await government.save()

  await RegistrationApproval.create({
    applicationType: "government",
    applicantId: government._id,
    applicantModel: "Government", // Changed applicantModel from "government" to "Government"
    status: "pending",
    submittedAt: new Date(),
  })

  await sendEmail({
    email: government.institutionalEmail,
    subject: "Government Registration Submitted",
    template: "governmentRegistrationSubmitted",
    data: {
      governmentName: government.governmentName,
      representativeName: government.representativeName,
      registrationNumber: government.registrationNumber,
    },
  })

  return successResponse(res, "Government registration submitted successfully", {
    government: {
      _id: government._id,
      governmentName: government.governmentName,
      status: government.status,
    },
  })
})

// @desc    Get government profile
// @route   GET /api/government/profile
// @access  Private
const getGovernmentProfile = asyncHandler(async (req, res) => {
  const government = await Government.findOne({ userId: req.user._id })
    .populate("userId", "fullName email")
    .populate("approvedBy", "fullName")

  if (!government) {
    return errorResponse(res, "Government profile not found", 404)
  }

  successResponse(res, "Government profile retrieved successfully", { government })
})

// @desc    Update government profile
// @route   PUT /api/government/profile
// @access  Private
const updateGovernmentProfile = asyncHandler(async (req, res) => {
  const government = await Government.findOne({ userId: req.user._id })

  if (!government) {
    return errorResponse(res, "Government profile not found", 404)
  }

  const allowedUpdates = ["representativeName", "representativeRole", "officialWebsite", "comments"]

  const updates = {}
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field]
    }
  })

  const updatedGovernment = await Government.findByIdAndUpdate(government._id, updates, {
    new: true,
    runValidators: true,
  })

  successResponse(res, "Government profile updated successfully", {
    government: updatedGovernment,
  })
})

// ============================================
// NEW FUNCTIONS (government operations)
// ============================================

// REGISTRATION REQUEST REVIEW

// @desc    Get pending citizen registrations (city-scoped) – FIXED PROPERLY
// @route   GET /api/government/registrations/citizens
// @access  Private (government)
const getPendingCitizenRegistrations = asyncHandler(async (req, res) => {
  const government = await Government.findOne({ userId: req.user._id })
  if (!government) {
    return errorResponse(res, "Government profile not found", 404)
  }

  const { page = 1, limit = 20, status = "pending" } = req.query
  const skip = (page - 1) * limit

  // 1️⃣ Fetch approval records (city isolation at DB level)
  const approvals = await RegistrationApproval.find({
    applicationType: "citizen",
    status,
    country: government.country,
    province: government.province,
    city: government.city,
  })
    .sort({ submittedAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean()

  // 2️⃣ MANUAL population (THIS IS THE FIX)
  const results = []

  for (const approval of approvals) {
    const citizen = await User.findById(approval.applicantId)
      .select("fullName email username city userType isGovernmentApproved isEmailVerified createdAt")
      .lean()

    if (
      citizen &&
      citizen.userType === "citizen" &&
      citizen.isGovernmentApproved === false
    ) {
      results.push({
        ...approval,
        applicant: citizen,
      })
    }
  }

  // 3️⃣ Count for pagination
  const total = await RegistrationApproval.countDocuments({
    applicationType: "citizen",
    status,
    country: government.country,
    province: government.province,
    city: government.city,
  })

  return successResponse(res, "Citizen registrations retrieved", {
    registrations: results,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
    },
  })
})



// @desc    Get pending social project registrations (city-scoped)
// @route   GET /api/government/registrations/projects
// @access  Private (government)
const getPendingSocialProjectRegistrations = asyncHandler(async (req, res) => {
  const government = await Government.findOne({ userId: req.user._id })
  if (!government) return errorResponse(res, "Government profile not found", 404)

  const { page = 1, limit = 20, status = "pending" } = req.query

  const registrations = await RegistrationApproval.find({
    applicationType: "social_project",
    status,
    country: government.country,
    province: government.province,
    city: government.city,
  })
    .populate("applicantId", "fullName email city")
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ submittedAt: -1 })

  const total = await RegistrationApproval.countDocuments({
    applicationType: "social_project",
    status,
    country: government.country,
    province: government.province,
    city: government.city,
  })

  successResponse(res, "Social project registrations retrieved", {
    registrations,
    pagination: { page: Number(page), limit: Number(limit), total },
  })
})

// @desc    Approve citizen registration
// @route   POST /api/government/registrations/citizens/approve
// @access  Private (Government)
const approveCitizenRegistration = asyncHandler(async (req, res) => {
  const { approvalId } = req.body

  // 1️⃣ Validate input
  if (!approvalId) {
    return errorResponse(res, "approvalId is required", 400)
  }

  // 2️⃣ Get government profile
  const government = await Government.findOne({ userId: req.user._id })
  if (!government) {
    return errorResponse(res, "Government profile not found", 404)
  }

  // 3️⃣ Get approval record
  const approval = await RegistrationApproval.findById(approvalId)
  if (!approval) {
    return errorResponse(res, "Registration approval not found", 404)
  }

  // 4️⃣ Enforce city isolation (CRITICAL)
  if (
    approval.country !== government.country ||
    approval.province !== government.province ||
    approval.city !== government.city
  ) {
    return errorResponse(res, "You are not authorized to approve this citizen", 403)
  }

  // 5️⃣ Prevent double approval
  if (approval.status !== "pending") {
    return errorResponse(res, "This request has already been processed", 400)
  }

  // 6️⃣ Get citizen user
  const citizen = await User.findById(approval.applicantId)
  if (!citizen || citizen.userType !== "citizen") {
    return errorResponse(res, "Citizen not found", 404)
  }

  // 7️⃣ Approve registration
  approval.status = "approved"
  approval.reviewedBy = req.user._id
  approval.reviewedAt = new Date()
  approval.approvalDecision = "approved"
  await approval.save()

  // 8️⃣ Approve citizen account
  citizen.isGovernmentApproved = true
  await citizen.save()

  // 9️⃣ Success response
  return successResponse(res, "Citizen approved successfully", {
    approvalId: approval._id,
    citizenId: citizen._id,
    citizenName: citizen.fullName,
  })
})

// @desc    Reject citizen registration
// @route   POST /api/government/registrations/citizens/:registrationId/reject
// @access  Private (government)
const rejectCitizenRegistration = asyncHandler(async (req, res) => {
  const { registrationId } = req.params
  const { rejectionReason } = req.body

  const government = await Government.findOne({ userId: req.user._id })
  if (!government) return errorResponse(res, "Government profile not found", 404)

  const registration = await RegistrationApproval.findById(registrationId).populate("applicantId")
  if (!registration) return errorResponse(res, "Registration not found", 404)

  if (registration.applicantId.city !== government.city) {
    return errorResponse(res, "Cannot reject registration from a different city", 403)
  }

  registration.status = "rejected"
  registration.rejectionReason = rejectionReason
  registration.rejectedAt = new Date()
  registration.rejectedBy = req.user._id
  await registration.save()

  const citizen = registration.applicantId

  // Log audit trail
  await AuditLog.logAction({
    user: req.user._id,
    action: "reject_citizen_registration",
    description: `Rejected citizen registration: ${rejectionReason || "No reason provided"}`,
    governmentId: government._id,
    entityType: "citizen",
    entityId: citizen._id,
    city: government.city,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  })

  // Send rejection email
  await sendEmail({
    email: citizen.email,
    subject: "Registration Rejected",
    template: "citizenRegistrationRejected",
    data: { citizenName: citizen.fullName, reason: rejectionReason },
  })

  successResponse(res, "Citizen registration rejected", { registration })
})

// @desc    Approve social project registration
// @route   POST /api/government/registrations/projects/:projectId/approve
// @access  Private (government)
const approveSocialProjectRegistration = asyncHandler(async (req, res) => {
  const { projectId } = req.params

  const government = await Government.findOne({ userId: req.user._id })
  if (!government) return errorResponse(res, "Government profile not found", 404)

  const project = await SocialProjectRegistration.findById(projectId).populate("user")
  if (!project) return errorResponse(res, "Project registration not found", 404)

  if (project.city !== government.city) {
    return errorResponse(res, "Cannot approve project from a different city", 403)
  }

  project.status = "approved"
  project.approvedBy = req.user._id
  project.approvedAt = new Date()
  await project.save()

  // Log audit trail
  await AuditLog.logAction({
    user: req.user._id,
    action: "approve_social_project_registration",
    description: `Approved social project registration: ${project.projectOrganizationName}`,
    governmentId: government._id,
    entityType: "social_project",
    entityId: project._id,
    city: government.city,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  })

  // Send approval email
  await sendEmail({
    email: project.user.email,
    subject: "Project Registration Approved",
    template: "projectRegistrationApproved",
    data: { projectName: project.projectOrganizationName },
  })

  successResponse(res, "Social project registration approved", { project })
})

// @desc    Reject social project registration
// @route   POST /api/government/registrations/projects/:projectId/reject
// @access  Private (government)
const rejectSocialProjectRegistration = asyncHandler(async (req, res) => {
  const { projectId } = req.params
  const { rejectionReason } = req.body

  const government = await Government.findOne({ userId: req.user._id })
  if (!government) return errorResponse(res, "Government profile not found", 404)

  const project = await SocialProjectRegistration.findById(projectId).populate("user")
  if (!project) return errorResponse(res, "Project registration not found", 404)

  if (project.city !== government.city) {
    return errorResponse(res, "Cannot reject project from a different city", 403)
  }

  project.status = "rejected"
  project.rejectionReason = rejectionReason
  await project.save()

  // Log audit trail
  await AuditLog.logAction({
    user: req.user._id,
    action: "reject_social_project_registration",
    description: `Rejected social project registration: ${rejectionReason || "No reason provided"}`,
    governmentId: government._id,
    entityType: "social_project",
    entityId: project._id,
    city: government.city,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  })

  // Send rejection email
  await sendEmail({
    email: project.user.email,
    subject: "Project Registration Rejected",
    template: "projectRegistrationRejected",
    data: { projectName: project.projectOrganizationName, reason: rejectionReason },
  })

  successResponse(res, "Social project registration rejected", { project })
})

// TOKEN CLAIM REVIEW

// @desc    Get pending token claims (city-scoped)
// @route   GET /api/government/token-claims
// @access  Private (government)
const getPendingTokenClaims = asyncHandler(async (req, res) => {
  const government = await Government.findOne({ userId: req.user._id })
  if (!government) return errorResponse(res, "Government profile not found", 404)

  const { page = 1, limit = 20, status = "pending" } = req.query

  // Get claims from citizens in the same city
  const claims = await TokenClaim.find({ status })
    .populate({
      path: "claimant",
      match: { city: government.city },
      select: "fullName email city tokenBalance",
    })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 })

  // Filter out null claimants (from different cities)
  const filteredClaims = claims.filter((claim) => claim.claimant !== null)

  const total = await TokenClaim.countDocuments({
    status,
  })

  successResponse(res, "Token claims retrieved", {
    claims: filteredClaims,
    pagination: { page: Number(page), limit: Number(limit), total },
  })
})

// @desc    Approve token claim
// @route   POST /api/government/token-claims/:claimId/approve
// @access  Private (government)
const approveTokenClaim = asyncHandler(async (req, res) => {
  const { claimId } = req.params
  const { reviewNotes } = req.body

  const government = await Government.findOne({ userId: req.user._id })
  if (!government) return errorResponse(res, "Government profile not found", 404)

  const claim = await TokenClaim.findById(claimId).populate("claimant")
  if (!claim) return errorResponse(res, "Token claim not found", 404)

  if (claim.claimant.city !== government.city) {
    return errorResponse(res, "Cannot approve claim from a different city", 403)
  }

  // Create token transaction
  const transaction = await TokenTransaction.create({
    transactionId: generateUniqueId("TXN"),
    transactionType: "issue",
    transactionDirection: "credit",
    toUser: claim.claimant._id,
    amount: claim.calculatedTokens,
    issuedBy: req.user._id,
    approvedBy: req.user._id,
    description: `Approved token claim for ${claim.paymentType}`,
    status: "completed",
    processedAt: new Date(),
  })

  // Update claim status
  claim.status = "approved"
  claim.reviewedBy = req.user._id
  claim.reviewedAt = new Date()
  claim.reviewNotes = reviewNotes
  claim.tokenTransaction = transaction._id
  await claim.save()

  // Update citizen wallet
  await User.findByIdAndUpdate(claim.claimant._id, { $inc: { tokenBalance: claim.calculatedTokens } }, { new: true })

  // Log audit trail
  await AuditLog.logAction({
    user: req.user._id,
    action: "approve_token_claim",
    description: `Approved token claim: ${claim.calculatedTokens} tokens for ${claim.claimant.fullName}`,
    governmentId: government._id,
    entityType: "token_claim",
    entityId: claim._id,
    city: government.city,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  })

  // Send approval email
  await sendEmail({
    email: claim.claimant.email,
    subject: "Token Claim Approved",
    template: "tokenClaimApproved",
    data: {
      citizenName: claim.claimant.fullName,
      tokenAmount: claim.calculatedTokens,
    },
  })

  successResponse(res, "Token claim approved", { claim, transaction })
})

// @desc    Reject token claim
// @route   POST /api/government/token-claims/:claimId/reject
// @access  Private (government)
const rejectTokenClaim = asyncHandler(async (req, res) => {
  const { claimId } = req.params
  const { rejectionReason, reviewNotes } = req.body

  const government = await Government.findOne({ userId: req.user._id })
  if (!government) return errorResponse(res, "Government profile not found", 404)

  const claim = await TokenClaim.findById(claimId).populate("claimant")
  if (!claim) return errorResponse(res, "Token claim not found", 404)

  if (claim.claimant.city !== government.city) {
    return errorResponse(res, "Cannot reject claim from a different city", 403)
  }

  claim.status = "rejected"
  claim.reviewedBy = req.user._id
  claim.reviewedAt = new Date()
  claim.rejectionReason = rejectionReason
  claim.reviewNotes = reviewNotes
  await claim.save()

  // Log audit trail
  await AuditLog.logAction({
    user: req.user._id,
    action: "reject_token_claim",
    description: `Rejected token claim: ${rejectionReason || "No reason provided"}`,
    governmentId: government._id,
    entityType: "token_claim",
    entityId: claim._id,
    city: government.city,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  })

  // Send rejection email
  await sendEmail({
    email: claim.claimant.email,
    subject: "Token Claim Rejected",
    template: "tokenClaimRejected",
    data: {
      citizenName: claim.claimant.fullName,
      reason: rejectionReason,
    },
  })

  successResponse(res, "Token claim rejected", { claim })
})

// MANUAL TOKEN ISSUE / TRANSFER

// @desc    Issue tokens to citizen
// @route   POST /api/government/tokens/issue
// @access  Private (government)
const issueTokens = asyncHandler(async (req, res) => {
  const { citizenId, tokenAmount } = req.body

  const government = await Government.findOne({ userId: req.user._id })
  if (!government) return errorResponse(res, "Government profile not found", 404)

  const citizen = await User.findById(citizenId)
  if (!citizen) return errorResponse(res, "Citizen not found", 404)

  if (citizen.city !== government.city) {
    return errorResponse(res, "Cannot issue tokens to citizen from a different city", 403)
  }

  // Check if citizen is approved
  if (!citizen.isGovernmentApproved) {
    return errorResponse(res, "Citizen is not approved", 400)
  }

  // Create token transaction
  const transaction = await TokenTransaction.create({
    transactionId: generateUniqueId("TXN"),
    transactionType: "issue",
    transactionDirection: "credit",
    toUser: citizen._id,
    amount: tokenAmount,
    issuedBy: req.user._id,
    approvedBy: req.user._id,
    description: `Manual token issue by government`,
    status: "completed",
    processedAt: new Date(),
  })

  // Update citizen wallet
  const updatedCitizen = await User.findByIdAndUpdate(
    citizen._id,
    { $inc: { tokenBalance: tokenAmount } },
    { new: true },
  )

  // Log audit trail
  await AuditLog.logAction({
    user: req.user._id,
    action: "issue_tokens",
    description: `Issued ${tokenAmount} tokens to ${citizen.fullName}`,
    governmentId: government._id,
    entityType: "citizen",
    entityId: citizen._id,
    city: government.city,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  })

  successResponse(res, "Tokens issued successfully", { transaction, citizen: updatedCitizen })
})

// @desc    Transfer tokens between citizens
// @route   POST /api/government/tokens/transfer
// @access  Private (government)
const transferTokens = asyncHandler(async (req, res) => {
  const { fromCitizenId, toCitizenId, tokenAmount } = req.body

  const government = await Government.findOne({ userId: req.user._id })
  if (!government) return errorResponse(res, "Government profile not found", 404)

  const fromCitizen = await User.findById(fromCitizenId)
  const toCitizen = await User.findById(toCitizenId)

  if (!fromCitizen || !toCitizen) {
    return errorResponse(res, "One or both citizens not found", 404)
  }

  if (fromCitizen.city !== government.city || toCitizen.city !== government.city) {
    return errorResponse(res, "Cannot transfer tokens to/from citizens in a different city", 403)
  }

  // Check sender balance
  if (fromCitizen.tokenBalance < tokenAmount) {
    return errorResponse(res, "Insufficient token balance", 400)
  }

  // Create token transaction
  const transaction = await TokenTransaction.create({
    transactionId: generateUniqueId("TXN"),
    transactionType: "transfer",
    transactionDirection: "credit",
    fromUser: fromCitizen._id,
    toUser: toCitizen._id,
    amount: tokenAmount,
    issuedBy: req.user._id,
    approvedBy: req.user._id,
    description: `Government-authorized transfer`,
    status: "completed",
    processedAt: new Date(),
  })

  // Update wallets
  await User.findByIdAndUpdate(fromCitizen._id, { $inc: { tokenBalance: -tokenAmount } })
  const updatedToCitizen = await User.findByIdAndUpdate(
    toCitizen._id,
    { $inc: { tokenBalance: tokenAmount } },
    { new: true },
  )

  // Log audit trail
  await AuditLog.logAction({
    user: req.user._id,
    action: "transfer_tokens",
    description: `Transferred ${tokenAmount} tokens from ${fromCitizen.fullName} to ${toCitizen.fullName}`,
    governmentId: government._id,
    entityType: "citizen",
    entityId: toCitizen._id,
    city: government.city,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  })

  successResponse(res, "Tokens transferred successfully", { transaction })
})

// SOCIAL PROJECT FUND REQUEST REVIEW

// @desc    Get pending fund requests (city-scoped)
// @route   GET /api/government/fund-requests
// @access  Private (government)
const getPendingFundRequests = asyncHandler(async (req, res) => {
  const government = await Government.findOne({ userId: req.user._id })
  if (!government) return errorResponse(res, "Government profile not found", 404)

  const { page = 1, limit = 20, status = "pending" } = req.query

  const requests = await FundRequest.find({
    status,
    city: government.city,
  })
    .populate("projectId", "projectOrganizationName")
    .populate("requestedBy", "fullName email")
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 })

  const total = await FundRequest.countDocuments({
    status,
    city: government.city,
  })

  successResponse(res, "Fund requests retrieved", {
    requests,
    pagination: { page: Number(page), limit: Number(limit), total },
  })
})

// @desc    Approve fund request
// @route   POST /api/government/fund-requests/:fundRequestId/approve
// @access  Private (government)
const approveFundRequest = asyncHandler(async (req, res) => {
  const { fundRequestId } = req.params
  const { reviewNotes } = req.body

  const government = await Government.findOne({ userId: req.user._id })
  if (!government) return errorResponse(res, "Government profile not found", 404)

  const fundRequest = await FundRequest.findById(fundRequestId).populate("projectId").populate("requestedBy")

  if (!fundRequest) return errorResponse(res, "Fund request not found", 404)

  if (fundRequest.city !== government.city) {
    return errorResponse(res, "Cannot approve fund request from a different city", 403)
  }

  // Create token transaction for fiat conversion
  const transaction = await TokenTransaction.create({
    transactionId: generateUniqueId("TXN"),
    transactionType: "transfer",
    transactionDirection: "debit",
    fromUser: fundRequest.requestedBy._id,
    toUser: fundRequest.requestedBy._id, // Back to same user (conversion)
    amount: fundRequest.tokenAmount,
    issuedBy: req.user._id,
    approvedBy: req.user._id,
    description: `Fund request approval: ${fundRequest.requestedFiatAmount} ${fundRequest.fiatCurrency}`,
    status: "completed",
    processedAt: new Date(),
  })

  // Update fund request
  fundRequest.status = "approved"
  fundRequest.reviewedBy = req.user._id
  fundRequest.reviewedAt = new Date()
  fundRequest.reviewNotes = reviewNotes
  fundRequest.tokenTransaction = transaction._id
  await fundRequest.save()

  // Deduct tokens from project wallet
  await User.findByIdAndUpdate(
    fundRequest.requestedBy._id,
    { $inc: { tokenBalance: -fundRequest.tokenAmount } },
    { new: true },
  )

  // Log audit trail
  await AuditLog.logAction({
    user: req.user._id,
    action: "approve_fund_request",
    description: `Approved fund request: ${fundRequest.requestedFiatAmount} ${fundRequest.fiatCurrency}`,
    governmentId: government._id,
    entityType: "fund_request",
    entityId: fundRequest._id,
    city: government.city,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  })

  // Send approval email
  await sendEmail({
    email: fundRequest.requestedBy.email,
    subject: "Fund Request Approved",
    template: "fundRequestApproved",
    data: {
      projectName: fundRequest.projectId.projectOrganizationName,
      fiatAmount: fundRequest.requestedFiatAmount,
      currency: fundRequest.fiatCurrency,
    },
  })

  successResponse(res, "Fund request approved", { fundRequest, transaction })
})

// @desc    Reject fund request
// @route   POST /api/government/fund-requests/:fundRequestId/reject
// @access  Private (government)
const rejectFundRequest = asyncHandler(async (req, res) => {
  const { fundRequestId } = req.params
  const { rejectionReason, reviewNotes } = req.body

  const government = await Government.findOne({ userId: req.user._id })
  if (!government) return errorResponse(res, "Government profile not found", 404)

  const fundRequest = await FundRequest.findById(fundRequestId).populate("requestedBy")
  if (!fundRequest) return errorResponse(res, "Fund request not found", 404)

  if (fundRequest.city !== government.city) {
    return errorResponse(res, "Cannot reject fund request from a different city", 403)
  }

  fundRequest.status = "rejected"
  fundRequest.reviewedBy = req.user._id
  fundRequest.reviewedAt = new Date()
  fundRequest.rejectionReason = rejectionReason
  fundRequest.reviewNotes = reviewNotes
  await fundRequest.save()

  // Log audit trail
  await AuditLog.logAction({
    user: req.user._id,
    action: "reject_fund_request",
    description: `Rejected fund request: ${rejectionReason || "No reason provided"}`,
    governmentId: government._id,
    entityType: "fund_request",
    entityId: fundRequest._id,
    city: government.city,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  })

  // Send rejection email
  await sendEmail({
    email: fundRequest.requestedBy.email,
    subject: "Fund Request Rejected",
    template: "fundRequestRejected",
    data: {
      projectName: fundRequest.projectId.projectOrganizationName,
      reason: rejectionReason,
    },
  })

  successResponse(res, "Fund request rejected", { fundRequest })
})

// AUDIT LOGGING

// @desc    Get government audit logs
// @route   GET /api/government/audit-logs
// @access  Private (government)
const getGovernmentAuditLogs = asyncHandler(async (req, res) => {
  const government = await Government.findOne({ userId: req.user._id })
  if (!government) return errorResponse(res, "Government profile not found", 404)

  const { page = 1, limit = 50 } = req.query

  const logs = await AuditLog.find({ governmentId: government._id })
    .populate("user", "fullName email")
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 })

  const total = await AuditLog.countDocuments({ governmentId: government._id })

  successResponse(res, "Audit logs retrieved", {
    logs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
    },
  })
})

// TOKEN REQUEST REVIEW

// @desc    Get pending token requests (government only, city-scoped)
// @route   GET /api/government/token-requests
// @access  Private (government)
const getPendingTokenRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status = "pending" } = req.query

  // Get government profile
  const government = await Government.findOne({ userId: req.user._id })
  if (!government) {
    return errorResponse(res, "Government profile not found", 404)
  }

  const filter = {
    city: government.city,
    status: status || "pending",
  }

  const tokenRequests = await TokenRequest.find(filter)
    .populate("requestedBy", "fullName email username city")
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

// @desc    Approve token request (government only)
// @route   POST /api/government/token-requests/:tokenRequestId/approve
// @access  Private (government)
const approveTokenRequest = asyncHandler(async (req, res) => {
  const { tokenRequestId } = req.params
  const { reviewNotes } = req.body

  // Get government profile
  const government = await Government.findOne({ userId: req.user._id })
  if (!government) {
    return errorResponse(res, "Government profile not found", 404)
  }

  // Find token request
  const tokenRequest = await TokenRequest.findById(tokenRequestId).populate("requestedBy")
  if (!tokenRequest) {
    return errorResponse(res, "Token request not found", 404)
  }

  if (tokenRequest.city !== government.city) {
    return errorResponse(res, "Cannot approve token request from different city", 403)
  }

  // Get citizen
  const citizen = await User.findById(tokenRequest.requestedBy._id)
  if (!citizen) {
    return errorResponse(res, "Citizen not found", 404)
  }

  try {
    // Create token transaction
    const transaction = await TokenTransaction.create({
      transactionId: generateUniqueId("TXN"),
      transactionType: "issue",
      transactionDirection: "credit",
      toUser: citizen._id,
      amount: tokenRequest.tokenAmount,
      issuedBy: req.user._id,
      approvedBy: req.user._id,
      description: `Approved token request ${tokenRequest.tokenRequestId}`,
      status: "completed",
      processedAt: new Date(),
    })

    // Update citizen wallet
    const updatedCitizen = await User.findByIdAndUpdate(
      citizen._id,
      { $inc: { tokenBalance: tokenRequest.tokenAmount } },
      { new: true },
    )

    // Update token request
    await TokenRequest.findByIdAndUpdate(tokenRequestId, {
      status: "approved",
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes || "",
      tokenTransaction: transaction._id,
    })

    // Audit log
    await AuditLog.logAction({
      user: req.user._id,
      action: "approve_token_request",
      description: `Approved token request ${tokenRequest.tokenRequestId} for ${tokenRequest.tokenAmount} tokens`,
      governmentId: government._id,
      entityType: "token_request",
      entityId: tokenRequest._id,
      city: government.city,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    })

    // Send approval email to citizen
    await sendEmail({
      email: citizen.email,
      subject: "Token Request Approved",
      template: "tokenRequestApproved",
      data: {
        citizenName: citizen.fullName,
        tokenRequestId: tokenRequest.tokenRequestId,
        tokenAmount: tokenRequest.tokenAmount,
        newBalance: updatedCitizen.tokenBalance,
      },
    })

    successResponse(res, "Token request approved successfully", { transaction, citizen: updatedCitizen })
  } catch (error) {
    console.error("Token request approval error:", error)
    errorResponse(res, "Failed to approve token request", 500)
  }
})

// @desc    Reject token request (government only)
// @route   POST /api/government/token-requests/:tokenRequestId/reject
// @access  Private (government)
const rejectTokenRequest = asyncHandler(async (req, res) => {
  const { tokenRequestId } = req.params
  const { rejectionReason, reviewNotes } = req.body

  if (!rejectionReason) {
    return errorResponse(res, "Rejection reason is required", 400)
  }

  // Get government profile
  const government = await Government.findOne({ userId: req.user._id })
  if (!government) {
    return errorResponse(res, "Government profile not found", 404)
  }

  // Find token request
  const tokenRequest = await TokenRequest.findById(tokenRequestId).populate("requestedBy")
  if (!tokenRequest) {
    return errorResponse(res, "Token request not found", 404)
  }

  if (tokenRequest.city !== government.city) {
    return errorResponse(res, "Cannot reject token request from different city", 403)
  }

  const citizen = await User.findById(tokenRequest.requestedBy._id)

  try {
    // Update token request
    await TokenRequest.findByIdAndUpdate(tokenRequestId, {
      status: "rejected",
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      rejectionReason,
      reviewNotes: reviewNotes || "",
    })

    // Audit log
    await AuditLog.logAction({
      user: req.user._id,
      action: "reject_token_request",
      description: `Rejected token request ${tokenRequest.tokenRequestId}: ${rejectionReason}`,
      governmentId: government._id,
      entityType: "token_request",
      entityId: tokenRequest._id,
      city: government.city,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    })

    // Send rejection email to citizen
    await sendEmail({
      email: citizen.email,
      subject: "Token Request Rejected",
      template: "tokenRequestRejected",
      data: {
        citizenName: citizen.fullName,
        tokenRequestId: tokenRequest.tokenRequestId,
        rejectionReason,
      },
    })

    successResponse(res, "Token request rejected successfully", { tokenRequest })
  } catch (error) {
    console.error("Token request rejection error:", error)
    errorResponse(res, "Failed to reject token request", 500)
  }
})

module.exports = {
  // Existing
  registerGovernmentStep1,
  registerGovernmentStep2,
  getGovernmentProfile,
  updateGovernmentProfile,
  // New
  getPendingCitizenRegistrations,
  getPendingSocialProjectRegistrations,
  approveCitizenRegistration,
  rejectCitizenRegistration,
  approveSocialProjectRegistration,
  rejectSocialProjectRegistration,
  getPendingTokenClaims,
  approveTokenClaim,
  rejectTokenClaim,
  issueTokens,
  transferTokens,
  getPendingFundRequests,
  approveFundRequest,
  rejectFundRequest,
  getGovernmentAuditLogs,
  getPendingTokenRequests,
  approveTokenRequest,
  rejectTokenRequest,
}
