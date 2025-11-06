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
