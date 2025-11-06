const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")
const User = require("../models/User")

// @desc    Get all citizens (Government only)
// @route   GET /api/citizens
// @access  Private (Government users only)
const getAllCitizens = asyncHandler(async (req, res) => {
  // Check if requester is government user
  if (req.user.userType !== "government") {
    return errorResponse(res, "Only government users can view citizens", 403)
  }

  const { page = 1, limit = 10, search, sortBy = "createdAt", order = "desc" } = req.query

  // Build filter
  const filter = { userType: "citizen" }
  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { username: { $regex: search, $options: "i" } },
    ]
  }

  // Calculate pagination
  const skip = (page - 1) * limit
  const sortOrder = order === "asc" ? 1 : -1

  // Get total count
  const total = await User.countDocuments(filter)

  // Get citizens with pagination
  const citizens = await User.find(filter)
    .select(
      "fullName email username avatar phoneNumber city province country tokenBalance isActive isEmailVerified isGovernmentApproved createdAt",
    )
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(Number.parseInt(limit))

  successResponse(res, "Citizens retrieved successfully", {
    pagination: {
      total,
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      pages: Math.ceil(total / limit),
    },
    citizens: citizens.map((citizen) => ({
      id: citizen._id,
      fullName: citizen.fullName,
      email: citizen.email,
      username: citizen.username,
      avatar: citizen.avatar,
      phoneNumber: citizen.phoneNumber,
      location: {
        city: citizen.city,
        province: citizen.province,
        country: citizen.country,
      },
      tokenBalance: citizen.tokenBalance,
      status: {
        isActive: citizen.isActive,
        isEmailVerified: citizen.isEmailVerified,
        isGovernmentApproved: citizen.isGovernmentApproved,
      },
      joinedAt: citizen.createdAt,
    })),
  })
})

// @desc    Get single citizen details (Government only)
// @route   GET /api/citizens/:id
// @access  Private (Government users only)
const getCitizenDetails = asyncHandler(async (req, res) => {
  // Check if requester is government user
  if (req.user.userType !== "government") {
    return errorResponse(res, "Only government users can view citizen details", 403)
  }

  const citizen = await User.findById(req.params.id)
  if (!citizen || citizen.userType !== "citizen") {
    return errorResponse(res, "Citizen not found", 404)
  }

  // Get citizen's token transaction history
  const TokenTransaction = require("../models/TokenTransaction")
  const transactions = await TokenTransaction.find({
    $or: [{ toUser: citizen._id }, { fromUser: citizen._id }],
  })
    .populate("fromUser", "fullName email")
    .populate("toUser", "fullName email")
    .sort({ createdAt: -1 })
    .limit(20)

  successResponse(res, "Citizen details retrieved successfully", {
    citizen: {
      id: citizen._id,
      fullName: citizen.fullName,
      email: citizen.email,
      username: citizen.username,
      avatar: citizen.avatar,
      phoneNumber: citizen.phoneNumber,
      location: {
        city: citizen.city,
        province: citizen.province,
        country: citizen.country,
      },
      tokenBalance: citizen.tokenBalance,
      status: {
        isActive: citizen.isActive,
        isEmailVerified: citizen.isEmailVerified,
        isGovernmentApproved: citizen.isGovernmentApproved,
      },
      joinedAt: citizen.createdAt,
      lastLogin: citizen.lastLogin,
    },
    recentTransactions: transactions.map((tx) => ({
      id: tx._id,
      transactionId: tx.transactionId,
      type: tx.transactionType,
      direction: tx.transactionDirection,
      amount: tx.amount,
      from: tx.fromUser?.fullName,
      to: tx.toUser?.fullName,
      description: tx.description,
      date: tx.createdAt,
    })),
  })
})

module.exports = {
  getAllCitizens,
  getCitizenDetails,
}
