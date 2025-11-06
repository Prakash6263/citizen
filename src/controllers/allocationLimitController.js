const AllocationLimit = require("../models/AllocationLimit")
const SocialProjectRegistration = require("../models/SocialProjectRegistration")
const User = require("../models/User")
const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")
const { validationResult } = require("express-validator")

// @desc    Set allocation limits for a project (Government only)
// @route   POST /api/allocation-limits/set
// @access  Private (Government only)
const setAllocationLimits = asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, "Validation failed", 400, errors.array())
  }

  // Only government users can set allocation limits
  if (req.user.userType !== "government") {
    return errorResponse(res, "Only government users can set allocation limits", 403)
  }

  const { projectRegistrationId, projectId, citizenTokenLimit, projectTokenLimit, notes } = req.body

  // Verify the project registration exists and is approved
  const registration = await SocialProjectRegistration.findById(projectRegistrationId)

  if (!registration) {
    return errorResponse(res, "Project registration not found", 404)
  }

  if (registration.status !== "approved") {
    return errorResponse(res, "Project registration must be approved before setting allocation limits", 400)
  }

  // Verify the project exists within the registration
  const project = registration.projects.find((p) => p._id.toString() === projectId)

  if (!project) {
    return errorResponse(res, "Project not found in this registration", 404)
  }

  // Check if allocation limits already exist for this project
  let allocationLimit = await AllocationLimit.findOne({
    projectRegistration: projectRegistrationId,
    project: projectId,
  })

  if (allocationLimit) {
    // Update existing limits
    allocationLimit.citizenTokenLimit = citizenTokenLimit
    allocationLimit.projectTokenLimit = projectTokenLimit
    allocationLimit.notes = notes
    allocationLimit.setBy = req.user._id
    allocationLimit.updatedAt = new Date()
    await allocationLimit.save()

    return successResponse(res, "Allocation limits updated successfully", allocationLimit, 200)
  }

  // Create new allocation limits
  allocationLimit = await AllocationLimit.create({
    projectRegistration: projectRegistrationId,
    project: projectId,
    citizenTokenLimit,
    projectTokenLimit,
    setBy: req.user._id,
    notes,
  })

  successResponse(res, "Allocation limits set successfully", allocationLimit, 201)
})

// @desc    Get allocation limits for a project
// @route   GET /api/allocation-limits/:projectRegistrationId/:projectId
// @access  Private
const getAllocationLimits = asyncHandler(async (req, res) => {
  const { projectRegistrationId, projectId } = req.params

  const allocationLimit = await AllocationLimit.findOne({
    projectRegistration: projectRegistrationId,
    project: projectId,
  }).populate("setBy", "fullName email")

  if (!allocationLimit) {
    return errorResponse(res, "Allocation limits not found for this project", 404)
  }

  successResponse(res, "Allocation limits retrieved successfully", allocationLimit)
})

// @desc    Get all allocation limits for a registration (Government only)
// @route   GET /api/allocation-limits/registration/:projectRegistrationId
// @access  Private (Government only)
const getAllocationLimitsByRegistration = asyncHandler(async (req, res) => {
  if (req.user.userType !== "government") {
    return errorResponse(res, "Only government users can view all allocation limits", 403)
  }

  const { projectRegistrationId } = req.params
  const { page = 1, limit = 10 } = req.query

  // Verify registration exists
  const registration = await SocialProjectRegistration.findById(projectRegistrationId)

  if (!registration) {
    return errorResponse(res, "Project registration not found", 404)
  }

  const skip = (page - 1) * limit

  const [limits, total] = await Promise.all([
    AllocationLimit.find({ projectRegistration: projectRegistrationId })
      .populate("setBy", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))
      .lean(),
    AllocationLimit.countDocuments({ projectRegistration: projectRegistrationId }),
  ])

  const pagination = {
    currentPage: Number.parseInt(page),
    totalPages: Math.ceil(total / limit),
    totalLimits: total,
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1,
  }

  successResponse(res, "Allocation limits retrieved successfully", {
    limits,
    pagination,
  })
})

// @desc    Update allocation limits (Government only)
// @route   PUT /api/allocation-limits/:limitId
// @access  Private (Government only)
const updateAllocationLimits = asyncHandler(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, "Validation failed", 400, errors.array())
  }

  if (req.user.userType !== "government") {
    return errorResponse(res, "Only government users can update allocation limits", 403)
  }

  const { limitId } = req.params
  const { citizenTokenLimit, projectTokenLimit, status, notes } = req.body

  const allocationLimit = await AllocationLimit.findById(limitId)

  if (!allocationLimit) {
    return errorResponse(res, "Allocation limit not found", 404)
  }

  // Update fields
  if (citizenTokenLimit !== undefined) {
    allocationLimit.citizenTokenLimit = citizenTokenLimit
  }

  if (projectTokenLimit !== undefined) {
    allocationLimit.projectTokenLimit = projectTokenLimit
  }

  if (status !== undefined) {
    allocationLimit.status = status
  }

  if (notes !== undefined) {
    allocationLimit.notes = notes
  }

  allocationLimit.updatedAt = new Date()
  await allocationLimit.save()

  successResponse(res, "Allocation limits updated successfully", allocationLimit, 200)
})

// @desc    Get citizen's spending on a project
// @route   GET /api/allocation-limits/:projectId/citizen-spending
// @access  Private (Citizen only)
const getCitizenSpendingOnProject = asyncHandler(async (req, res) => {
  if (req.user.userType !== "citizen") {
    return errorResponse(res, "Only citizens can view their spending", 403)
  }

  const { projectId } = req.params

  // Find the registration containing this project
  const registration = await SocialProjectRegistration.findOne({
    status: "approved",
    "projects._id": projectId,
  })

  if (!registration) {
    return errorResponse(res, "Project not found", 404)
  }

  // Find the specific project
  const project = registration.projects.find((p) => p._id.toString() === projectId)

  if (!project) {
    return errorResponse(res, "Project not found", 404)
  }

  // Get allocation limits
  const allocationLimit = await AllocationLimit.findOne({
    projectRegistration: registration._id,
    project: projectId,
  })

  // Find citizen's support on this project
  const citizenSupport = project.supportedBy.find((s) => s.userId.toString() === req.user._id.toString())

  const tokensSpent = citizenSupport ? citizenSupport.tokensSpent : 0
  const citizenLimit = allocationLimit ? allocationLimit.citizenTokenLimit : null
  const remainingTokens = citizenLimit ? Math.max(0, citizenLimit - tokensSpent) : null

  successResponse(res, "Citizen spending retrieved successfully", {
    projectId,
    projectTitle: project.projectTitle,
    tokensSpent,
    citizenTokenLimit: citizenLimit,
    remainingTokens,
    canSpendMore: remainingTokens === null || remainingTokens > 0,
  })
})

// @desc    Get project funding status with limits
// @route   GET /api/allocation-limits/:projectRegistrationId/:projectId/funding-status
// @access  Public
const getProjectFundingStatusWithLimits = asyncHandler(async (req, res) => {
  const { projectRegistrationId, projectId } = req.params

  // Find the registration
  const registration = await SocialProjectRegistration.findById(projectRegistrationId)

  if (!registration) {
    return errorResponse(res, "Project registration not found", 404)
  }

  // Find the project
  const project = registration.projects.find((p) => p._id.toString() === projectId)

  if (!project) {
    return errorResponse(res, "Project not found", 404)
  }

  // Get allocation limits
  const allocationLimit = await AllocationLimit.findOne({
    projectRegistration: projectRegistrationId,
    project: projectId,
  })

  const fundingStatus = {
    projectId,
    projectTitle: project.projectTitle,
    tokensFunded: project.tokensFunded,
    fundingGoal: project.fundingGoal,
    percentageFunded: Math.round((project.tokensFunded / project.fundingGoal) * 100),
    supportersCount: project.supportedBy.length,
    allocationLimits: allocationLimit
      ? {
          citizenTokenLimit: allocationLimit.citizenTokenLimit,
          projectTokenLimit: allocationLimit.projectTokenLimit,
          tokensRemainingForProject: Math.max(0, allocationLimit.projectTokenLimit - project.tokensFunded),
          isProjectLimitReached: project.tokensFunded >= allocationLimit.projectTokenLimit,
        }
      : null,
  }

  successResponse(res, "Project funding status retrieved successfully", fundingStatus)
})

module.exports = {
  setAllocationLimits,
  getAllocationLimits,
  getAllocationLimitsByRegistration,
  updateAllocationLimits,
  getCitizenSpendingOnProject,
  getProjectFundingStatusWithLimits,
}
