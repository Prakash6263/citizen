const express = require("express")
const { body, validationResult, query } = require("express-validator")
const router = express.Router()

const User = require("../models/User")
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
module.exports = router
