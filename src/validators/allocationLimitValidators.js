const { body } = require("express-validator")

// Validation for setting allocation limits
const setAllocationLimitsValidation = [
  body("projectRegistrationId")
    .notEmpty()
    .withMessage("Project Registration ID is required")
    .isMongoId()
    .withMessage("Invalid Project Registration ID"),

  body("projectId").notEmpty().withMessage("Project ID is required").isMongoId().withMessage("Invalid Project ID"),

  body("citizenTokenLimit")
    .notEmpty()
    .withMessage("Citizen Token Limit is required")
    .isInt({ min: 1, max: 100 })
    .withMessage("Citizen Token Limit must be between 1 and 100"),

  body("projectTokenLimit")
    .notEmpty()
    .withMessage("Project Token Limit is required")
    .isInt({ min: 1, max: 1000 })
    .withMessage("Project Token Limit must be between 1 and 1000"),

  body("notes").optional().trim().isLength({ max: 500 }).withMessage("Notes cannot exceed 500 characters"),
]

// Validation for updating allocation limits
const updateAllocationLimitsValidation = [
  body("citizenTokenLimit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Citizen Token Limit must be between 1 and 100"),

  body("projectTokenLimit")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Project Token Limit must be between 1 and 1000"),

  body("status").optional().isIn(["active", "inactive"]).withMessage("Status must be either 'active' or 'inactive'"),

  body("notes").optional().trim().isLength({ max: 500 }).withMessage("Notes cannot exceed 500 characters"),
]

module.exports = {
  setAllocationLimitsValidation,
  updateAllocationLimitsValidation,
}
