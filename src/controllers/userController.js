const User = require("../models/User")
const AuditLog = require("../models/AuditLog")
const asyncHandler = require("../utils/asyncHandler")
const ResponseHelper = require("../utils/responseHelper")
const { validationResult } = require("express-validator")
const localStorageService = require("../utils/localStorageService")
const path = require("path")

/**
 * @desc    Get user profile
 * @route   GET /api/user/profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password")

  if (!user) {
    return ResponseHelper.error(res, "User not found", 404)
  }

  const profileData = {
    user,
    walletBalance: user.tokenBalance || 0,
  }

  ResponseHelper.success(res, profileData, "Profile retrieved successfully")
})

/**
 * @desc    Update user profile
 * @route   PUT /api/user/profile
 * @access  Private
 * @note    Social users can only update: fullName, email, phoneNumber
 */
const updateProfile = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return ResponseHelper.validationError(res, errors.array())
  }

  const { fullName, email, phoneNumber } = req.body

  // Validate at least one field is provided
  if (!fullName && !email && !phoneNumber) {
    return ResponseHelper.error(res, "At least one field (fullName, email, or phoneNumber) must be provided", 400)
  }

  // Build update object with only allowed fields
  const updateFields = {}
  if (fullName !== undefined) updateFields.fullName = fullName
  if (email !== undefined) updateFields.email = email
  if (phoneNumber !== undefined) updateFields.phoneNumber = phoneNumber

  const user = await User.findByIdAndUpdate(req.user._id, updateFields, {
    new: true,
    runValidators: true,
  }).select("-password")

  if (!user) {
    return ResponseHelper.error(res, "User not found", 404)
  }

  // Log audit trail
  await AuditLog.logAction({
    user: user._id,
    action: "profile_update",
    description: "User profile updated",
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    metadata: { updatedFields: Object.keys(updateFields) },
    severity: "low",
  })

  ResponseHelper.success(res, { user }, "Profile updated successfully")
})

/**
 * @desc    Upload profile avatar
 * @route   POST /api/user/avatar
 * @access  Private
 */
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ResponseHelper.error(res, "Please upload an image file", 400)
  }

  const user = await User.findById(req.user._id)

  if (!user) {
    return ResponseHelper.error(res, "User not found", 404)
  }

  try {
    // Delete existing avatar if exists
    if (user.avatar && user.avatar.public_id) {
      await localStorageService.deleteFile(user.avatar.public_id, "municipality/avatars")
    }

    // Upload new avatar
    const result = await localStorageService.uploadFile(req.file.buffer, {
      folder: "municipality/avatars",
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      public_id: `avatar_${user._id}${path.extname(req.file.originalname)}`,
    })

    // Update user avatar
    user.avatar = {
      public_id: result.public_id,
      url: result.secure_url,
    }

    await user.save({ validateBeforeSave: false })

    // Log audit trail
    await AuditLog.logAction({
      user: user._id,
      action: "avatar_upload",
      description: "Profile avatar uploaded",
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      severity: "low",
    })

    ResponseHelper.success(
      res,
      {
        avatar: user.avatar,
      },
      "Avatar uploaded successfully",
    )
  } catch (error) {
    console.error("Avatar upload error:", error)
    ResponseHelper.error(res, "Failed to upload avatar", 500)
  }
})

/**
 * @desc    Delete profile avatar
 * @route   DELETE /api/user/avatar
 * @access  Private
 */
const deleteAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  if (!user) {
    return ResponseHelper.error(res, "User not found", 404)
  }

  if (!user.avatar || !user.avatar.public_id) {
    return ResponseHelper.error(res, "No avatar to delete", 400)
  }

  try {
    // Delete from local storage
    await localStorageService.deleteFile(user.avatar.public_id, "municipality/avatars")

    // Remove avatar from user
    user.avatar = undefined
    await user.save({ validateBeforeSave: false })

    // Log audit trail
    await AuditLog.logAction({
      user: user._id,
      action: "avatar_delete",
      description: "Profile avatar deleted",
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      severity: "low",
    })

    ResponseHelper.success(res, null, "Avatar deleted successfully")
  } catch (error) {
    console.error("Avatar deletion error:", error)
    ResponseHelper.error(res, "Failed to delete avatar", 500)
  }
})

/**
 * @desc    Get user settings
 * @route   GET /api/user/settings
 * @access  Private
 */
const getSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("settings")

  if (!user) {
    return ResponseHelper.error(res, "User not found", 404)
  }

  ResponseHelper.success(res, { settings: user.settings }, "Settings retrieved successfully")
})

/**
 * @desc    Update user settings
 * @route   PUT /api/user/settings
 * @access  Private
 */
const updateSettings = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return ResponseHelper.validationError(res, errors.array())
  }

  const { settings } = req.body

  const user = await User.findById(req.user._id)

  if (!user) {
    return ResponseHelper.error(res, "User not found", 404)
  }

  // Deep merge settings
  if (settings.notifications) {
    user.settings.notifications = {
      ...user.settings.notifications,
      ...settings.notifications,
    }
  }

  if (settings.privacy) {
    user.settings.privacy = {
      ...user.settings.privacy,
      ...settings.privacy,
    }
  }

  if (settings.language) {
    user.settings.language = settings.language
  }

  if (settings.timezone) {
    user.settings.timezone = settings.timezone
  }

  await user.save({ validateBeforeSave: false })

  // Log audit trail
  await AuditLog.logAction({
    user: user._id,
    action: "settings_update",
    description: "User settings updated",
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    metadata: { updatedSettings: Object.keys(settings) },
    severity: "low",
  })

  ResponseHelper.success(res, { settings: user.settings }, "Settings updated successfully")
})

/**
 * @desc    Change password
 * @route   PUT /api/user/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return ResponseHelper.validationError(res, errors.array())
  }

  const { currentPassword, newPassword } = req.body

  const user = await User.findById(req.user._id).select("+password")

  if (!user) {
    return ResponseHelper.error(res, "User not found", 404)
  }

  // Check current password
  const isMatch = await user.matchPassword(currentPassword)
  if (!isMatch) {
    return ResponseHelper.error(res, "Current password is incorrect", 400)
  }

  // Update password
  user.password = newPassword
  await user.save()

  // Log audit trail
  await AuditLog.logAction({
    user: user._id,
    action: "password_change",
    description: "Password changed successfully",
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    severity: "medium",
  })

  ResponseHelper.success(res, null, "Password changed successfully")
})

/**
 * @desc    Get user activity/audit log
 * @route   GET /api/user/activity
 * @access  Private
 */
const getUserActivity = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query

  const activities = await AuditLog.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select("action description createdAt ip severity")

  const total = await AuditLog.countDocuments({ user: req.user._id })

  ResponseHelper.paginated(
    res,
    activities,
    {
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
    "Activity retrieved successfully",
  )
})

/**
 * @desc    Deactivate user account
 * @route   PUT /api/user/deactivate
 * @access  Private
 */
const deactivateAccount = asyncHandler(async (req, res) => {
  const { password } = req.body

  if (!password) {
    return ResponseHelper.error(res, "Password is required to deactivate account", 400)
  }

  const user = await User.findById(req.user._id).select("+password")

  if (!user) {
    return ResponseHelper.error(res, "User not found", 404)
  }

  // Verify password
  const isMatch = await user.matchPassword(password)
  if (!isMatch) {
    return ResponseHelper.error(res, "Password is incorrect", 400)
  }

  // Deactivate account
  user.isActive = false
  await user.save({ validateBeforeSave: false })

  // Log audit trail
  await AuditLog.logAction({
    user: user._id,
    action: "account_deactivate",
    description: "User account deactivated",
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    severity: "high",
  })

  ResponseHelper.success(res, null, "Account deactivated successfully")
})

/**
 * @desc    Delete user account permanently
 * @route   DELETE /api/user/account
 * @access  Private
 */
const deleteAccount = asyncHandler(async (req, res) => {
  const { password, confirmText } = req.body

  if (!password) {
    return ResponseHelper.error(res, "Password is required to delete account", 400)
  }

  if (confirmText !== "DELETE MY ACCOUNT") {
    return ResponseHelper.error(res, 'Please type "DELETE MY ACCOUNT" to confirm', 400)
  }

  const user = await User.findById(req.user._id).select("+password")

  if (!user) {
    return ResponseHelper.error(res, "User not found", 404)
  }

  // Verify password
  const isMatch = await user.matchPassword(password)
  if (!isMatch) {
    return ResponseHelper.error(res, "Password is incorrect", 400)
  }

  try {
    // Delete avatar from local storage if exists
    if (user.avatar && user.avatar.public_id) {
      await localStorageService.deleteFile(user.avatar.public_id, "municipality/avatars")
    }

    // Log audit trail before deletion
    await AuditLog.logAction({
      user: user._id,
      action: "account_delete",
      description: "User account deleted permanently",
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      severity: "critical",
    })

    // Delete user account
    await User.findByIdAndDelete(req.user._id)

    ResponseHelper.success(res, null, "Account deleted successfully")
  } catch (error) {
    console.error("Account deletion error:", error)
    ResponseHelper.error(res, "Failed to delete account", 500)
  }
})

/**
 * @desc    Get user statistics
 * @route   GET /api/user/stats
 * @access  Private
 */
const getUserStats = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  if (!user) {
    return ResponseHelper.error(res, "User not found", 404)
  }

  const stats = {
    accountAge: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)), // days
    loginCount: user.loginCount,
    lastLogin: user.lastLogin,
    emailVerified: user.isEmailVerified,
    profileCompletion: calculateProfileCompletion(user),
  }

  ResponseHelper.success(res, { stats }, "User statistics retrieved successfully")
})

// Helper function to calculate profile completion percentage
const calculateProfileCompletion = (user) => {
  const fields = ["fullName", "email", "phoneNumber", "country", "province", "city", "avatar"]

  let completedFields = 0

  fields.forEach((field) => {
    if (field === "avatar") {
      if (user.avatar && user.avatar.url) completedFields++
    } else if (user[field] && user[field].trim() !== "") {
      completedFields++
    }
  })

  return Math.round((completedFields / fields.length) * 100)
}

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  getSettings,
  updateSettings,
  changePassword,
  getUserActivity,
  deactivateAccount,
  deleteAccount,
  getUserStats,
}
