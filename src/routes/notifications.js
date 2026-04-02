const express = require("express")
const { body, validationResult, query } = require("express-validator")
const router = express.Router()

const User = require("../models/User")
const Notification = require("../models/Notification")
const {
  sendTestNotification,
  sendNotification,
  sendMultipleNotifications,
} = require("../utils/firebaseService")

// Middleware to check validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: errors.array(),
    })
  }
  next()
}

/**
 * @route   POST /api/notifications/test
 * @desc    Send a test notification to a user by email
 * @access  Private (can be made public for testing)
 * @body    { email: string, title?: string, body?: string }
 */
router.post(
  "/test",
  [
    body("email")
      .trim()
      .isEmail()
      .withMessage("Please provide a valid email"),
    body("title")
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage("Title cannot exceed 255 characters"),
    body("body")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Body cannot exceed 500 characters"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, title = "Test Notification", body = "This is a test notification from your Municipality App" } = req.body

      console.log("[v0] Test notification request for email:", email)

      // Find user by email
      const user = await User.findOne({ email })

      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        })
      }

      if (!user.fcmToken) {
        return res.status(400).json({
          status: "error",
          message: "User has no FCM token registered. Please login with FCM token enabled.",
        })
      }

      console.log("[v0] Sending test notification to FCM token:", user.fcmToken.substring(0, 20) + "...")

      // Send notification
      const result = await sendTestNotification(user.fcmToken, title, body)

      if (result.success) {
        return res.status(200).json({
          status: "success",
          message: "Test notification sent successfully",
          data: {
            userId: user._id,
            email: user.email,
            messageId: result.messageId,
          },
        })
      } else {
        return res.status(500).json({
          status: "error",
          message: "Failed to send notification",
          error: result.error,
        })
      }
    } catch (error) {
      console.error("[v0] Error in test notification:", error.message)
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      })
    }
  }
)

/**
 * @route   POST /api/notifications/test-by-user-id
 * @desc    Send a test notification to a user by user ID
 * @access  Private
 * @body    { userId: string, title?: string, body?: string }
 */
router.post(
  "/test-by-user-id",
  [
    body("userId")
      .trim()
      .isLength({ min: 1 })
      .withMessage("User ID is required"),
    body("title")
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage("Title cannot exceed 255 characters"),
    body("body")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Body cannot exceed 500 characters"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId, title = "Test Notification", body = "This is a test notification from your Municipality App" } = req.body

      console.log("[v0] Test notification request for userId:", userId)

      // Find user by ID
      const user = await User.findById(userId)

      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        })
      }

      if (!user.fcmToken) {
        return res.status(400).json({
          status: "error",
          message: "User has no FCM token registered",
          email: user.email,
        })
      }

      console.log("[v0] Sending test notification to FCM token:", user.fcmToken.substring(0, 20) + "...")

      // Send notification
      const result = await sendTestNotification(user.fcmToken, title, body)

      if (result.success) {
        return res.status(200).json({
          status: "success",
          message: "Test notification sent successfully",
          data: {
            userId: user._id,
            email: user.email,
            fcmTokenPresent: !!user.fcmToken,
            messageId: result.messageId,
          },
        })
      } else {
        return res.status(500).json({
          status: "error",
          message: "Failed to send notification",
          error: result.error,
        })
      }
    } catch (error) {
      console.error("[v0] Error in test notification:", error.message)
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      })
    }
  }
)

/**
 * @route   POST /api/notifications/send
 * @desc    Send a custom notification to a user
 * @access  Private
 * @body    { email: string, title: string, body: string, data?: object }
 */
router.post(
  "/send",
  [
    body("email")
      .trim()
      .isEmail()
      .withMessage("Please provide a valid email"),
    body("title")
      .trim()
      .notEmpty()
      .withMessage("Title is required")
      .isLength({ max: 255 })
      .withMessage("Title cannot exceed 255 characters"),
    body("body")
      .trim()
      .notEmpty()
      .withMessage("Body is required")
      .isLength({ max: 500 })
      .withMessage("Body cannot exceed 500 characters"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, title, body, data = {} } = req.body

      const user = await User.findOne({ email })

      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        })
      }

      if (!user.fcmToken) {
        return res.status(400).json({
          status: "error",
          message: "User has no FCM token registered",
        })
      }

      // Send notification
      const result = await sendNotification(user.fcmToken, title, body, data)

      if (result.success) {
        return res.status(200).json({
          status: "success",
          message: "Notification sent successfully",
          data: {
            userId: user._id,
            email: user.email,
            messageId: result.messageId,
          },
        })
      } else {
        return res.status(500).json({
          status: "error",
          message: "Failed to send notification",
          error: result.error,
        })
      }
    } catch (error) {
      console.error("[v0] Error sending notification:", error.message)
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      })
    }
  }
)

/**
 * @route   GET /api/notifications/check-fcm-token
 * @desc    Check if a user has an FCM token registered
 * @access  Private
 * @query   { email: string }
 */
router.get(
  "/check-fcm-token",
  [
    query("email")
      .trim()
      .isEmail()
      .withMessage("Please provide a valid email"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email } = req.query

      const user = await User.findOne({ email })

      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        })
      }

      const hasFcmToken = !!user.fcmToken

      return res.status(200).json({
        status: "success",
        data: {
          userId: user._id,
          email: user.email,
          hasFcmToken,
          fcmTokenPrefix: hasFcmToken ? user.fcmToken.substring(0, 20) + "..." : null,
          userType: user.userType,
        },
      })
    } catch (error) {
      console.error("[v0] Error checking FCM token:", error.message)
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      })
    }
  }
)

/**
 * @route   POST /api/notifications/update-fcm-token
 * @desc    Update FCM token for a user (useful when client generates new token)
 * @access  Private
 * @body    { email: string, fcmToken: string }
 */
router.post(
  "/update-fcm-token",
  [
    body("email").trim().isEmail().withMessage("Please provide a valid email"),
    body("fcmToken")
      .trim()
      .notEmpty()
      .withMessage("FCM token is required")
      .isLength({ max: 512 })
      .withMessage("FCM token cannot exceed 512 characters"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, fcmToken } = req.body

      // Remove this token from other users (avoid duplicate notifications)
      await User.updateMany(
        { fcmToken },
        { $unset: { fcmToken: "" } }
      )

      // Assign token to current user
      const user = await User.findOneAndUpdate(
        { email },
        { fcmToken },
        { new: true }
      )

      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        })
      }

      return res.status(200).json({
        status: "success",
        message: "FCM token updated successfully",
        data: {
          userId: user._id,
          email: user.email,
          fcmTokenUpdated: true,
        },
      })
    } catch (error) {
      console.error("[v0] Error updating FCM token:", error.message)
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      })
    }
  }
)

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for a user, filtered by userType
 * @access  Private
 * @query   { userId: string, userType?: string, isRead?: boolean, limit?: number, skip?: number }
 */
router.get(
  "/",
  [
    query("userId")
      .trim()
      .notEmpty()
      .withMessage("User ID is required"),
    query("userType")
      .optional()
      .isIn(["citizen", "social_project", "government"])
      .withMessage("Invalid user type"),
    query("isRead")
      .optional()
      .isBoolean()
      .withMessage("isRead must be a boolean"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("skip")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Skip must be a non-negative integer"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId, userType, isRead, limit = 20, skip = 0 } = req.query

      // Verify user exists
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        })
      }

      // Build query filter
      const filter = {
        userId,
        isDeleted: false,
      }

      // Filter by user type if provided
      if (userType) {
        filter.userType = userType
      } else {
        // Use user's actual type if not specified
        filter.userType = user.userType
      }

      // Filter by read status if provided
      if (isRead !== undefined) {
        filter.isRead = isRead === "true"
      }

      // Get total count
      const total = await Notification.countDocuments(filter)

      // Get paginated notifications
      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .populate("userId", "email fullName userType")
        .populate("senderId", "email fullName")

      return res.status(200).json({
        status: "success",
        data: {
          notifications,
          pagination: {
            total,
            limit: parseInt(limit),
            skip: parseInt(skip),
            pages: Math.ceil(total / limit),
          },
        },
      })
    } catch (error) {
      console.error("[v0] Error fetching notifications:", error.message)
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      })
    }
  }
)

/**
 * @route   POST /api/notifications/create
 * @desc    Create a new notification for a user
 * @access  Private
 * @body    { userId: string, title: string, body: string, type?: string, priority?: string, data?: object, relatedId?: string, relatedModel?: string }
 */
router.post(
  "/create",
  [
    body("userId")
      .trim()
      .notEmpty()
      .withMessage("User ID is required"),
    body("title")
      .trim()
      .notEmpty()
      .withMessage("Title is required")
      .isLength({ max: 255 })
      .withMessage("Title cannot exceed 255 characters"),
    body("body")
      .trim()
      .notEmpty()
      .withMessage("Body is required")
      .isLength({ max: 500 })
      .withMessage("Body cannot exceed 500 characters"),
    body("type")
      .optional()
      .isIn(["project_update", "system", "alert", "message", "reminder", "other"])
      .withMessage("Invalid notification type"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "critical"])
      .withMessage("Invalid priority level"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId, title, body, type = "other", priority = "medium", data = {}, relatedId, relatedModel, senderId } = req.body

      // Verify user exists
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        })
      }

      // Create notification
      const notification = new Notification({
        userId,
        userType: user.userType,
        title,
        body,
        type,
        priority,
        data,
        relatedId: relatedId || null,
        relatedModel: relatedModel || null,
        senderId: senderId || null,
      })

      await notification.save()

      return res.status(201).json({
        status: "success",
        message: "Notification created successfully",
        data: {
          notification,
        },
      })
    } catch (error) {
      console.error("[v0] Error creating notification:", error.message)
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      })
    }
  }
)

/**
 * @route   PATCH /api/notifications/:notificationId/mark-read
 * @desc    Mark a notification as read
 * @access  Private
 * @params  { notificationId: string }
 */
router.patch(
  "/:notificationId/mark-read",
  async (req, res) => {
    try {
      const { notificationId } = req.params

      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        {
          isRead: true,
          readAt: new Date(),
        },
        { new: true }
      )

      if (!notification) {
        return res.status(404).json({
          status: "error",
          message: "Notification not found",
        })
      }

      return res.status(200).json({
        status: "success",
        message: "Notification marked as read",
        data: {
          notification,
        },
      })
    } catch (error) {
      console.error("[v0] Error marking notification as read:", error.message)
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      })
    }
  }
)

/**
 * @route   PATCH /api/notifications/mark-all-read/:userId
 * @desc    Mark all notifications as read for a specific user
 * @access  Private
 * @params  { userId: string }
 * @query   { userType?: string }
 */
router.patch(
  "/mark-all-read/:userId",
  [
    query("userType")
      .optional()
      .isIn(["citizen", "social_project", "government"])
      .withMessage("Invalid user type"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params
      const { userType } = req.query

      // Build filter
      const filter = {
        userId,
        isDeleted: false,
        isRead: false,
      }

      if (userType) {
        filter.userType = userType
      }

      const result = await Notification.updateMany(
        filter,
        {
          isRead: true,
          readAt: new Date(),
        }
      )

      return res.status(200).json({
        status: "success",
        message: "All notifications marked as read",
        data: {
          modifiedCount: result.modifiedCount,
        },
      })
    } catch (error) {
      console.error("[v0] Error marking all notifications as read:", error.message)
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      })
    }
  }
)

/**
 * @route   DELETE /api/notifications/:notificationId
 * @desc    Delete (soft delete) a notification
 * @access  Private
 * @params  { notificationId: string }
 */
router.delete(
  "/:notificationId",
  async (req, res) => {
    try {
      const { notificationId } = req.params

      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        {
          isDeleted: true,
          deletedAt: new Date(),
        },
        { new: true }
      )

      if (!notification) {
        return res.status(404).json({
          status: "error",
          message: "Notification not found",
        })
      }

      return res.status(200).json({
        status: "success",
        message: "Notification deleted successfully",
        data: {
          notification,
        },
      })
    } catch (error) {
      console.error("[v0] Error deleting notification:", error.message)
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      })
    }
  }
)

/**
 * @route   DELETE /api/notifications/clear-all/:userId
 * @desc    Clear all notifications for a specific user (soft delete)
 * @access  Private
 * @params  { userId: string }
 * @query   { userType?: string }
 */
router.delete(
  "/clear-all/:userId",
  [
    query("userType")
      .optional()
      .isIn(["citizen", "social_project", "government"])
      .withMessage("Invalid user type"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params
      const { userType } = req.query

      // Verify user exists
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        })
      }

      // Build filter
      const filter = {
        userId,
        isDeleted: false,
      }

      if (userType) {
        filter.userType = userType
      } else {
        filter.userType = user.userType
      }

      const result = await Notification.updateMany(
        filter,
        {
          isDeleted: true,
          deletedAt: new Date(),
        }
      )

      return res.status(200).json({
        status: "success",
        message: "All notifications cleared successfully",
        data: {
          clearedCount: result.modifiedCount,
        },
      })
    } catch (error) {
      console.error("[v0] Error clearing notifications:", error.message)
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      })
    }
  }
)

/**
 * @route   GET /api/notifications/count/:userId
 * @desc    Get unread notification count for a user
 * @access  Private
 * @params  { userId: string }
 * @query   { userType?: string }
 */
router.get(
  "/count/:userId",
  [
    query("userType")
      .optional()
      .isIn(["citizen", "social_project", "government"])
      .withMessage("Invalid user type"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params
      const { userType } = req.query

      // Verify user exists
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        })
      }

      // Build filter
      const filter = {
        userId,
        isDeleted: false,
        isRead: false,
      }

      if (userType) {
        filter.userType = userType
      } else {
        filter.userType = user.userType
      }

      const unreadCount = await Notification.countDocuments(filter)

      return res.status(200).json({
        status: "success",
        data: {
          userId,
          userType: user.userType,
          unreadCount,
        },
      })
    } catch (error) {
      console.error("[v0] Error getting notification count:", error.message)
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        error: error.message,
      })
    }
  }
)

module.exports = router
