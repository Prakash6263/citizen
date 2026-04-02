const { body, param, query } = require("express-validator")

// Registration validation - Basic validation only
const registerValidation = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("username")
    .optional({ checkFalsy: true })
    .trim(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Password confirmation is required")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match")
      }
      return true
    }),

  body("userType")
    .notEmpty()
    .withMessage("User type is required")
    .isIn(["citizen", "social_project"])
    .withMessage("User type must be citizen or social_project"),

  body("country")
    .optional({ checkFalsy: true })
    .trim(),

  body("province")
    .optional({ checkFalsy: true })
    .trim(),

  body("city")
    .optional({ checkFalsy: true })
    .trim(),

  body("agreedToTerms")
    .notEmpty()
    .withMessage("You must agree to the terms and conditions"),

  body("agreedToPrivacy")
    .notEmpty()
    .withMessage("You must agree to the privacy policy"),
]

// Login validation
const loginValidation = [
  body("identifier")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isLength({ max: 255 })
    .withMessage("Identifier cannot exceed 255 characters"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ max: 128 })
    .withMessage("Password cannot exceed 128 characters"),

  body("fcmToken")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 512 })
    .withMessage("FCM token cannot exceed 512 characters"),
]

// Forgot password validation
const forgotPasswordValidation = [body("email").isEmail().withMessage("Please provide a valid email").normalizeEmail()]

// Reset password validation
const resetPasswordValidation = [
  body("resetToken")
    .notEmpty()
    .withMessage("Reset token is required")
    .isLength({ min: 32, max: 128 })
    .withMessage("Invalid reset token format"),

  body("newPassword")
    .isLength({ min: 6, max: 128 })
    .withMessage("New password must be between 6 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("New password must contain at least one uppercase letter, one lowercase letter, and one number"),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Password confirmation does not match new password")
    }
    return true
  }),
]

// Change password validation
const changePasswordValidation = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 6, max: 128 })
    .withMessage("New password must be between 6 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("New password must contain at least one uppercase letter, one lowercase letter, and one number")
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error("New password must be different from current password")
      }
      return true
    }),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Password confirmation does not match new password")
    }
    return true
  }),
]

// Verify email validation
const verifyEmailValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email cannot exceed 255 characters"),

  body("otp")
    .notEmpty()
    .withMessage("Verification code is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("Verification code must be exactly 6 digits")
    .matches(/^[0-9]{6}$/)
    .withMessage("Verification code must contain only numbers"),
]

// Verify reset password validation
const verifyResetPasswordValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email cannot exceed 255 characters"),
  body("otp")
    .notEmpty()
    .withMessage("Reset code is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("Reset code must be exactly 6 digits")
    .matches(/^[0-9]{6}$/)
    .withMessage("Reset code must contain only numbers"),
]

// Social project registration validation - Basic validation only
const socialRegisterValidation = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Password confirmation is required")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match")
      }
      return true
    }),

  body("country")
    .optional({ checkFalsy: true })
    .trim(),

  body("province")
    .optional({ checkFalsy: true })
    .trim(),

  body("city")
    .optional({ checkFalsy: true })
    .trim(),

  body("agreedToTerms")
    .notEmpty()
    .withMessage("You must agree to the terms and conditions"),

  body("agreedToPrivacy")
    .notEmpty()
    .withMessage("You must agree to the privacy policy"),
]

module.exports = {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  verifyEmailValidation,
  verifyResetPasswordValidation,
  socialRegisterValidation,
}
