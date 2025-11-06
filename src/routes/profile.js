const express = require("express")
const User = require("../models/User")
const asyncHandler = require("../utils/asyncHandler")
const ResponseHelper = require("../utils/responseHelper")
const { protect, optionalAuth } = require("../middleware/auth")

const router = express.Router()

/**
 * @desc    Get public profile by username
 * @route   GET /api/profile/:username
 * @access  Public (with optional auth for privacy checks)
 */
const getPublicProfile = asyncHandler(async (req, res) => {
  const { username } = req.params

  const user = await User.findOne({
    username: username.toLowerCase(),
    isActive: true,
  }).select("-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken -emailVerificationExpire")

  if (!user) {
    return ResponseHelper.error(res, "User not found", 404)
  }

  // Check privacy settings
  const isOwnProfile = req.user && req.user._id.toString() === user._id.toString()
  const privacySettings = user.settings.privacy

  // If profile is private and not own profile, return limited info
  if (privacySettings.profileVisibility === "private" && !isOwnProfile) {
    return ResponseHelper.success(
      res,
      {
        user: {
          username: user.username,
          fullName: user.fullName,
          userType: user.userType,
          avatar: user.avatar,
          profileVisibility: "private",
        },
      },
      "Profile retrieved successfully",
    )
  }

  // Build response based on privacy settings
  const profileData = {
    id: user._id,
    username: user.username,
    fullName: user.fullName,
    userType: user.userType,
    avatar: user.avatar,
    country: user.country,
    province: user.province,
    city: user.city,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  }

  // Add email if allowed
  if (privacySettings.showEmail || isOwnProfile) {
    profileData.email = user.email
  }

  // Add phone if allowed
  if (privacySettings.showPhone || isOwnProfile) {
    profileData.phoneNumber = user.phoneNumber
  }

  // Add full settings if own profile
  if (isOwnProfile) {
    profileData.settings = user.settings
    profileData.isEmailVerified = user.isEmailVerified
    profileData.loginCount = user.loginCount
  }

  ResponseHelper.success(res, { user: profileData }, "Profile retrieved successfully")
})

/**
 * @desc    Search users
 * @route   GET /api/profile/search
 * @access  Public
 */
const searchUsers = asyncHandler(async (req, res) => {
  const { q, userType, page = 1, limit = 20 } = req.query

  if (!q || q.trim().length < 2) {
    return ResponseHelper.error(res, "Search query must be at least 2 characters", 400)
  }

  // Build search query
  const searchQuery = {
    isActive: true,
    "settings.privacy.profileVisibility": { $ne: "private" },
    $or: [{ fullName: { $regex: q, $options: "i" } }, { username: { $regex: q, $options: "i" } }],
  }

  if (userType && ["citizen", "social_project", "government"].includes(userType)) {
    searchQuery.userType = userType
  }

  const users = await User.find(searchQuery)
    .select("username fullName userType avatar country province city createdAt")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)

  const total = await User.countDocuments(searchQuery)

  ResponseHelper.paginated(
    res,
    users,
    {
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
    "Users found successfully",
  )
})

/**
 * @desc    Get user statistics (public)
 * @route   GET /api/profile/stats
 * @access  Public
 */
const getPublicStats = asyncHandler(async (req, res) => {
  const stats = await User.getStats()

  ResponseHelper.success(res, { stats }, "Statistics retrieved successfully")
})

// Routes
router.get("/search", searchUsers)
router.get("/stats", getPublicStats)
router.get("/:username", optionalAuth, getPublicProfile)

module.exports = router
