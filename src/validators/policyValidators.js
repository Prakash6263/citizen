const { body, param } = require("express-validator")

const policyValidation = [
  body("policyType")
    .notEmpty()
    .withMessage("Policy type is required")
    .isIn(["terms_and_conditions", "privacy_policy"])
    .withMessage("Policy type must be either terms_and_conditions or privacy_policy"),

  body("content")
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ min: 10 })
    .withMessage("Content must be at least 10 characters long"),

  body("changeNotes")
    .optional()
    .isString()
    .withMessage("Change notes must be a string")
    .isLength({ max: 500 })
    .withMessage("Change notes cannot exceed 500 characters"),

  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
]

const policyTypeParamValidation = [
  param("type")
    .notEmpty()
    .withMessage("Policy type is required")
    .isIn(["terms_and_conditions", "privacy_policy"])
    .withMessage("Policy type must be either terms_and_conditions or privacy_policy"),
]

const versionParamValidation = [
  param("versionNumber").isInt({ min: 1 }).withMessage("Version must be a positive integer"),
]

module.exports = {
  policyValidation,
  policyTypeParamValidation,
  versionParamValidation,
}
