const { body, param } = require("express-validator")

// Profile update validation
const updateProfileValidation = [
  body("fullName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Full name can only contain letters and spaces"),

  body("email").optional().trim().isEmail().withMessage("Please provide a valid email address").normalizeEmail(),

  body("phoneNumber")
    .optional()
    .trim()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage("Please provide a valid phone number"),

  body().custom((value, { req }) => {
    const allowedFields = ["fullName", "email", "phoneNumber"]
    const providedFields = Object.keys(req.body)
    const invalidFields = providedFields.filter((field) => !allowedFields.includes(field))

    if (invalidFields.length > 0) {
      throw new Error(
        `Only these fields can be updated: fullName, email, phoneNumber. Invalid fields: ${invalidFields.join(", ")}`,
      )
    }
    return true
  }),
]

// Settings update validation
const updateSettingsValidation = [
  body("settings.notifications.email")
    .optional()
    .isBoolean()
    .withMessage("Email notification setting must be a boolean"),

  body("settings.notifications.push").optional().isBoolean().withMessage("Push notification setting must be a boolean"),

  body("settings.notifications.projectUpdates")
    .optional()
    .isBoolean()
    .withMessage("Project updates setting must be a boolean"),

  body("settings.notifications.newsletter").optional().isBoolean().withMessage("Newsletter setting must be a boolean"),

  body("settings.privacy.profileVisibility")
    .optional()
    .isIn(["public", "private", "friends"])
    .withMessage("Profile visibility must be public, private, or friends"),

  body("settings.privacy.showEmail").optional().isBoolean().withMessage("Show email setting must be a boolean"),

  body("settings.privacy.showPhone").optional().isBoolean().withMessage("Show phone setting must be a boolean"),

  body("settings.language")
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage("Language code must be between 2 and 5 characters"),

  body("settings.timezone").optional().isLength({ max: 50 }).withMessage("Timezone cannot exceed 50 characters"),
]

module.exports = {
  updateProfileValidation,
  updateSettingsValidation,
}
