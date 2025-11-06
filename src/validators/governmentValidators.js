const { body, param, query } = require("express-validator")

const governmentRegistrationValidation = [
  body("governmentName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Government name must be between 2 and 100 characters"),

  body("entityType")
    .isIn(["Municipal", "Provincial", "Federal", "Regional", "District", "County"])
    .withMessage("Please select a valid entity type"),

  body("country").trim().isLength({ min: 2, max: 50 }).withMessage("Country is required"),

  body("province").trim().isLength({ min: 2, max: 50 }).withMessage("Province/State is required"),

  body("city").trim().isLength({ min: 2, max: 50 }).withMessage("City is required"),

  body("representativeName").trim().isLength({ min: 2, max: 50 }).withMessage("Representative name is required"),

  body("representativeRole").trim().isLength({ min: 2, max: 50 }).withMessage("Representative role is required"),

  body("institutionalEmail").isEmail().normalizeEmail().withMessage("Please provide a valid institutional email"),

  body("officialWebsite").optional().isURL().withMessage("Please provide a valid website URL"),

  body("comments").optional().isLength({ max: 500 }).withMessage("Comments cannot exceed 500 characters"),
]

const approvalValidation = [
  body("decision").isIn(["approved", "rejected", "requires_info"]).withMessage("Please provide a valid decision"),

  body("reviewNotes").optional().isLength({ max: 1000 }).withMessage("Review notes cannot exceed 1000 characters"),

  body("rejectionReason")
    .if(body("decision").equals("rejected"))
    .notEmpty()
    .withMessage("Rejection reason is required when rejecting"),

  body("conditions").optional().isArray().withMessage("Conditions must be an array"),
]

const tokenIssuanceValidation = [
  body("recipientId").isMongoId().withMessage("Please provide a valid recipient ID"),

  body("amount").isFloat({ min: 0.01, max: 10000 }).withMessage("Token amount must be between 0.01 and 10,000"),

  body("tokenType").isIn(["civic", "project", "reward", "penalty"]).withMessage("Please select a valid token type"),

  body("description")
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Description must be between 5 and 200 characters"),

  body("category")
    .isIn(["participation", "contribution", "milestone", "bonus", "correction"])
    .withMessage("Please select a valid category"),
]

const governmentRegisterStep1Validation = [
  body("governmentName").trim().isLength({ min: 2, max: 100 }).withMessage("Government name must be 2-100 chars"),
  body("entityType")
    .isIn(["Municipal", "Provincial", "Federal", "Regional", "District", "County"])
    .withMessage("Please select a valid entity type"),
  body("country").trim().isLength({ min: 2, max: 50 }).withMessage("Country is required"),
  body("province").trim().isLength({ min: 2, max: 50 }).withMessage("Province/State is required"),
  body("city").trim().isLength({ min: 2, max: 50 }).withMessage("City is required"),
  body("representativeName").trim().isLength({ min: 2, max: 50 }).withMessage("Representative name is required"),
  body("representativeRole").trim().isLength({ min: 2, max: 50 }).withMessage("Role is required"),
  body("institutionalEmail").isEmail().normalizeEmail().withMessage("Provide a valid institutional email"),
]

const governmentRegisterStep2Validation = [
  body("officialWebsite").optional().isURL().withMessage("Provide a valid website URL"),
  body("comments").optional().isLength({ max: 500 }).withMessage("Comments cannot exceed 500 characters"),
  body("consentContactBeforeActivation").isBoolean().withMessage("Consent flag must be boolean"),
  body("acceptedTermsAndConditions").equals("true").withMessage("You must read and accept the terms and conditions"),
]

module.exports = {
  governmentRegistrationValidation,
  approvalValidation,
  tokenIssuanceValidation,
  governmentRegisterStep1Validation,
  governmentRegisterStep2Validation,
}
