const express = require("express")
const {
  register,
  login,
  logout,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  resendVerificationPublic, // import new public resend function
  getMe,
  verifyResetPassword,
  registerSocial,
} = require("../controllers/authController")

const { protect } = require("../middleware/auth")

// Import validators
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyEmailValidation,
  verifyResetPasswordValidation,
  socialRegisterValidation, // add validator
} = require("../validators/authValidators")

const router = express.Router()

// Public routes
router.post("/register", registerValidation, register)
router.post("/login", loginValidation, login)

/**
 * @route   POST /api/auth/citizen-login
 * @desc    Login endpoint for citizen users with FCM token support
 * @access  Public
 * @body    { identifier: string, password: string, fcmToken?: string }
 */
router.post("/citizen-login", loginValidation, async (req, res) => {
  try {
    // Reuse login logic but filter by userType
    const { identifier, password, fcmToken } = req.body

    const user = await require("../models/User").findOne({
      $or: [{ email: identifier }, { phone: identifier }],
      userType: "citizen",
    }).select("+password +refreshToken")

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      })
    }

    // Update FCM token if provided
    if (fcmToken) {
      user.fcmToken = fcmToken
      await user.save()
    }

    // Generate tokens
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          userType: user.userType,
        },
        accessToken,
        refreshToken,
      },
    })
  } catch (error) {
    console.error("[v0] Citizen login error:", error.message)
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    })
  }
})

/**
 * @route   POST /api/auth/social-login
 * @desc    Login endpoint for social project users with FCM token support
 * @access  Public
 * @body    { identifier: string, password: string, fcmToken?: string }
 */
router.post("/social-login", loginValidation, async (req, res) => {
  try {
    const { identifier, password, fcmToken } = req.body

    const user = await require("../models/User").findOne({
      $or: [{ email: identifier }, { phone: identifier }],
      userType: "social_project",
    }).select("+password +refreshToken")

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      })
    }

    // Update FCM token if provided
    if (fcmToken) {
      user.fcmToken = fcmToken
      await user.save()
    }

    // Generate tokens
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          userType: user.userType,
        },
        accessToken,
        refreshToken,
      },
    })
  } catch (error) {
    console.error("[v0] Social login error:", error.message)
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    })
  }
})

/**
 * @route   POST /api/auth/government-login
 * @desc    Login endpoint for government users with FCM token support
 * @access  Public
 * @body    { identifier: string, password: string, fcmToken?: string }
 */
router.post("/government-login", loginValidation, async (req, res) => {
  try {
    const { identifier, password, fcmToken } = req.body

    const user = await require("../models/User").findOne({
      $or: [{ email: identifier }, { phone: identifier }],
      userType: "government",
    }).select("+password +refreshToken")

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      })
    }

    // Update FCM token if provided
    if (fcmToken) {
      user.fcmToken = fcmToken
      await user.save()
    }

    // Generate tokens
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          userType: user.userType,
        },
        accessToken,
        refreshToken,
      },
    })
  } catch (error) {
    console.error("[v0] Government login error:", error.message)
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    })
  }
})
router.post("/refresh", refreshAccessToken)
router.post("/forgot-password", forgotPasswordValidation, forgotPassword)
router.post("/reset-password/verify", verifyResetPasswordValidation, verifyResetPassword)
router.post("/reset-password", resetPasswordValidation, resetPassword) // Removed protect middleware from reset-password route to make it public
router.post("/verify-email", verifyEmailValidation, verifyEmail)
router.post("/register/social", socialRegisterValidation, registerSocial)

router.post("/resend-verification-public", verifyEmailValidation, resendVerificationPublic)

// Protected routes
router.post("/logout", protect, logout)
router.post("/resend-verification", protect, resendVerification)
router.get("/me", protect, getMe)

module.exports = router
