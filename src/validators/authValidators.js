const { body, param, query } = require("express-validator")

// Registration validation
const registerValidation = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Full name can only contain letters and spaces"),

  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email cannot exceed 255 characters"),

  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores")
    .custom((value) => {
      // Reserved usernames
      const reserved = ["admin", "root", "api", "www", "mail", "support", "help"]
      if (reserved.includes(value.toLowerCase())) {
        throw new Error("This username is reserved")
      }
      return true
    }),

  body("password")
    .isLength({ min: 6, max: 128 })
    .withMessage("Password must be between 6 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Password confirmation does not match password")
    }
    return true
  }),

  body("userType")
    .isIn(["citizen", "social_project", "government"])
    .withMessage("User type must be citizen, social_project, or localgovernment"),

  body("country").optional().trim().isLength({ max: 100 }).withMessage("Country name cannot exceed 100 characters"),

  body("province").optional().trim().isLength({ max: 100 }).withMessage("Province name cannot exceed 100 characters"),

  body("city").optional().trim().isLength({ max: 100 }).withMessage("City name cannot exceed 100 characters"),

  body("agreedToTerms")
    .isBoolean()
    .withMessage("Terms agreement must be a boolean")
    .custom((value) => {
      if (!value) {
        throw new Error("You must agree to the terms and conditions")
      }
      return true
    }),

  body("agreedToPrivacy")
    .isBoolean()
    .withMessage("Privacy agreement must be a boolean")
    .custom((value) => {
      if (!value) {
        throw new Error("You must agree to the privacy policy")
      }
      return true
    }),
]

// Login validation
const loginValidation = [
  body("identifier")
    .trim()
    .notEmpty()
    .withMessage("Email or username is required")
    .isLength({ max: 255 })
    .withMessage("Identifier cannot exceed 255 characters"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ max: 128 })
    .withMessage("Password cannot exceed 128 characters"),
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

// Social project registration validation
const socialRegisterValidation = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Full name can only contain letters and spaces"),

  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email cannot exceed 255 characters"),

  body("password")
    .isLength({ min: 6, max: 128 })
    .withMessage("Password must be between 6 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Password confirmation does not match password")
    }
    return true
  }),

  body("userType")
    .optional()
    .custom(() => {
      throw new Error("userType is not allowed in social signup")
    }),

  body("country")
    .trim()
    .notEmpty()
    .withMessage("Country is required")
    .isLength({ max: 100 })
    .withMessage("Country name cannot exceed 100 characters"),
  body("province").optional().trim().isLength({ max: 100 }).withMessage("Province name cannot exceed 100 characters"),
  body("city").optional().trim().isLength({ max: 100 }).withMessage("City name cannot exceed 100 characters"),

  body("agreedToTerms")
    .isBoolean()
    .withMessage("Terms agreement must be a boolean")
    .custom((value) => {
      if (!value) {
        throw new Error("You must agree to the terms and conditions")
      }
      return true
    }),

  body("agreedToPrivacy")
    .isBoolean()
    .withMessage("Privacy agreement must be a boolean")
    .custom((value) => {
      if (!value) {
        throw new Error("You must agree to the privacy policy")
      }
      return true
    }),
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
