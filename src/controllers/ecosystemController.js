const User = require("../models/User")
const TokenTransaction = require("../models/TokenTransaction")
const Government = require("../models/Government")
const SystemPolicy = require("../models/SystemPolicy")
const Project = require("../models/SocialProjectRegistration") // Import Project model
const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")

// @desc    Get all citizens in ecosystem
// @route   GET /api/ecosystem/citizens
// @access  Private (Government only)
const getAllCitizens = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, sortBy = "createdAt", sortOrder = "desc" } = req.query

  // Build filter
  const filter = { userType: "citizen" }

  if (search) {
    filter.$or = [{ fullName: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }]
  }

  if (status) {
    filter.accountStatus = status
  }

  // Build sort
  const sort = {}
  sort[sortBy] = sortOrder === "desc" ? -1 : 1

  const citizens = await User.find(filter)
    .select("fullName email tokenBalance accountStatus isVerified lastLoginAt createdAt")
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)

  const total = await User.countDocuments(filter)

  const citizensWithStats = citizens.map((citizen) => ({
    ...citizen.toObject(),
    stats: {
      tokensReceived: 0,
      tokensSpent: 0,
    },
  }))

  successResponse(res, "Citizens retrieved successfully", {
    citizens: citizensWithStats,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total,
    },
  })
})

// @desc    Get all projects in ecosystem
// @route   GET /api/ecosystem/projects
// @access  Private (Government only)
const getAllProjects = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, sortBy = "createdAt", sortOrder = "desc" } = req.query

  // Build filter
  const filter = {}

  if (search) {
    filter.projectTitle = { $regex: search, $options: "i" }
  }

  if (status) {
    filter.status = status
  }

  // Build sort
  const sort = {}
  sort[sortBy] = sortOrder === "desc" ? -1 : 1

  const projects = await Project.find(filter)
    .select("projectTitle status createdAt")
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)

  const total = await Project.countDocuments(filter)

  successResponse(res, "Projects retrieved successfully", {
    projects,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total,
    },
  })
})

// @desc    Get ecosystem overview statistics
// @route   GET /api/ecosystem/overview
// @access  Private (Government only)
const getEcosystemOverview = asyncHandler(async (req, res) => {
  const [citizenStats, tokenStats, activityStats] = await Promise.all([
    // Citizen statistics
    User.aggregate([
      {
        $match: { userType: "citizen" },
      },
      {
        $group: {
          _id: "$accountStatus",
          count: { $sum: 1 },
          totalTokens: { $sum: "$tokenBalance" },
        },
      },
    ]),

    // Token statistics
    TokenTransaction.aggregate([
      {
        $match: { status: "completed" },
      },
      {
        $group: {
          _id: "$transactionType",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]),

    // Recent activity (last 7 days)
    TokenTransaction.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      status: "completed",
    })
      .populate("toUser", "fullName")
      .sort({ createdAt: -1 })
      .limit(10),
  ])

  // Calculate growth metrics
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const [newCitizens, tokenActivity] = await Promise.all([
    User.countDocuments({
      userType: "citizen",
      createdAt: { $gte: last30Days },
    }),
    TokenTransaction.countDocuments({
      createdAt: { $gte: last30Days },
      status: "completed",
    }),
  ])

  successResponse(res, "Ecosystem overview retrieved successfully", {
    citizenStats,
    tokenStats,
    recentActivity: activityStats,
    growthMetrics: {
      newCitizens,
      tokenActivity,
    },
  })
})

// @desc    Manage citizen account
// @route   PUT /api/ecosystem/citizens/:id/manage
// @access  Private (Government only)
const manageCitizenAccount = asyncHandler(async (req, res) => {
  const { action, reason } = req.body
  const citizenId = req.params.id

  const citizen = await User.findById(citizenId)
  if (!citizen || citizen.userType !== "citizen") {
    return errorResponse(res, "Citizen not found", 404)
  }

  let updateData = {}
  let actionDescription = ""

  switch (action) {
    case "suspend":
      updateData = { accountStatus: "suspended" }
      actionDescription = "suspended"
      break
    case "activate":
      updateData = { accountStatus: "active" }
      actionDescription = "activated"
      break
    case "verify":
      updateData = { isVerified: true }
      actionDescription = "verified"
      break
    case "unverify":
      updateData = { isVerified: false }
      actionDescription = "unverified"
      break
    default:
      return errorResponse(res, "Invalid action", 400)
  }

  const updatedCitizen = await User.findByIdAndUpdate(citizenId, updateData, { new: true, runValidators: true })

  // Log the administrative action
  // This could be expanded to include an audit log model
  console.log(`Admin ${req.user._id} ${actionDescription} citizen ${citizenId}: ${reason}`)

  successResponse(res, `Citizen account ${actionDescription} successfully`, {
    citizen: {
      id: updatedCitizen._id,
      fullName: updatedCitizen.fullName,
      email: updatedCitizen.email,
      accountStatus: updatedCitizen.accountStatus,
      isVerified: updatedCitizen.isVerified,
    },
  })
})

// @desc    Manage project status
// @route   PUT /api/ecosystem/projects/:id/manage
// @access  Private (Government only)
const manageProjectStatus = asyncHandler(async (req, res) => {
  const { action, reason } = req.body
  const projectId = req.params.id

  const project = await Project.findById(projectId)
  if (!project) {
    return errorResponse(res, "Project not found", 404)
  }

  let updateData = {}
  let actionDescription = ""

  switch (action) {
    case "approve":
      updateData = {
        status: "active",
        approvedBy: req.user._id,
        approvedAt: new Date(),
      }
      actionDescription = "approved"
      break
    case "suspend":
      updateData = { status: "suspended" }
      actionDescription = "suspended"
      break
    case "reject":
      updateData = { status: "rejected" }
      actionDescription = "rejected"
      break
    case "complete":
      updateData = { status: "completed" }
      actionDescription = "marked as completed"
      break
    default:
      return errorResponse(res, "Invalid action", 400)
  }

  const updatedProject = await Project.findByIdAndUpdate(projectId, updateData, {
    new: true,
    runValidators: true,
  }).populate("createdBy", "fullName email")

  // Log the administrative action
  console.log(`Admin ${req.user._id} ${actionDescription} project ${projectId}: ${reason}`)

  successResponse(res, `Project ${actionDescription} successfully`, {
    project: {
      id: updatedProject._id,
      projectTitle: updatedProject.projectTitle,
      status: updatedProject.status,
      createdBy: updatedProject.createdBy,
    },
  })
})

// @desc    Set allocation limits
// @route   PUT /api/ecosystem/limits
// @access  Private (Government only)
const setAllocationLimits = asyncHandler(async (req, res) => {
  const { citizenLimit, projectLimit, dailyIssuanceLimit } = req.body

  const government = await Government.findOne({ userId: req.user._id })
  if (!government) {
    return errorResponse(res, "Government profile not found", 404)
  }

  // Update token allocation limits
  government.tokenAllocationLimits = {
    citizenLimit: citizenLimit || government.tokenAllocationLimits.citizenLimit,
    projectLimit: projectLimit || government.tokenAllocationLimits.projectLimit,
    dailyIssuanceLimit: dailyIssuanceLimit || government.tokenAllocationLimits.dailyIssuanceLimit,
  }

  await government.save()

  successResponse(res, "Allocation limits updated successfully", {
    limits: government.tokenAllocationLimits,
  })
})

// @desc    Get allocation limits
// @route   GET /api/ecosystem/limits
// @access  Private (Government only)
const getAllocationLimits = asyncHandler(async (req, res) => {
  const government = await Government.findOne({ userId: req.user._id })
  if (!government) {
    return errorResponse(res, "Government profile not found", 404)
  }

  successResponse(res, "Allocation limits retrieved successfully", {
    limits: government.tokenAllocationLimits,
  })
})

module.exports = {
  getAllCitizens,
  getAllProjects,
  getEcosystemOverview,
  manageCitizenAccount,
  manageProjectStatus,
  setAllocationLimits,
  getAllocationLimits,
}
