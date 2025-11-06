const { body, validationResult } = require("express-validator")

// Social project registration for project creation
const socialProjectRegistrationValidation = [
  body("projectOrganizationName")
    .notEmpty()
    .withMessage("Project / Organization Name is required")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Project / Organization Name must be between 3 and 100 characters"),

  body("state")
    .notEmpty()
    .withMessage("State is required")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("State must be between 2 and 50 characters"),

  body("allowedProjectTypes")
    .isArray({ min: 1 })
    .withMessage("At least one project type must be selected")
    .custom((value) => {
      const validTypes = [
        "Infrastructure",
        "Environment",
        "Education",
        "Healthcare",
        "Social Welfare",
        "Technology",
        "Community Development",
        "Arts & Culture",
        "Sports & Recreation",
        "Other",
      ]
      const allValid = value.every((type) => validTypes.includes(type))
      if (!allValid) {
        throw new Error("Invalid project type selected")
      }
      return true
    }),

  body("city")
    .notEmpty()
    .withMessage("City is required")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("City must be between 2 and 50 characters"),

  body("country")
    .notEmpty()
    .withMessage("Country is required")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Country must be between 2 and 50 characters"),

  body("responsiblePersonFullName")
    .notEmpty()
    .withMessage("Responsible Person Full Name is required")
    .trim()
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Full name can only contain letters and spaces")
    .isLength({ min: 3, max: 100 })
    .withMessage("Full name must be between 3 and 100 characters"),

  body("personPositionRole")
    .notEmpty()
    .withMessage("Person Position/Role is required")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Position/Role must be between 2 and 100 characters"),

  body("contactNumber")
    .notEmpty()
    .withMessage("Contact Number is required")
    .trim()
    .matches(/^[0-9\s\-+()]+$/)
    .withMessage("Contact Number must be a valid phone number"),

  body("emailAddress")
    .notEmpty()
    .withMessage("Email Address is required")
    .isEmail()
    .withMessage("Email Address must be valid")
    .normalizeEmail(),

  body("registrationNotes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Registration notes cannot exceed 1000 characters"),
]

// Approval decision validation (Government approval with token allocation)
const socialProjectApprovalValidation = [
  body("decision").isIn(["approved", "rejected"]).withMessage("Decision must be either 'approved' or 'rejected'"),

  body("rejectionReason")
    .if((value, { req }) => req.body.decision === "rejected")
    .notEmpty()
    .withMessage("Rejection reason is required when rejecting")
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Rejection reason must be between 10 and 500 characters"),

  body("fundingGoal")
    .if((value, { req }) => req.body.decision === "approved")
    .notEmpty()
    .withMessage("Funding goal is required when approving a project")
    .isInt({ min: 1, max: 10000 })
    .withMessage("Funding goal must be a number between 1 and 10000 tokens"),

  body("citizenTokenLimit")
    .if((value, { req }) => req.body.decision === "approved")
    .notEmpty()
    .withMessage("Citizen token limit is required when approving a project")
    .isInt({ min: 1, max: 100 })
    .withMessage("Citizen token limit must be a number between 1 and 100 tokens"),

  body()
    .if((value, { req }) => req.body.decision === "approved")
    .custom((value, { req }) => {
      const fundingGoal = Number.parseInt(req.body.fundingGoal)
      const citizenTokenLimit = Number.parseInt(req.body.citizenTokenLimit)
      if (citizenTokenLimit > fundingGoal) {
        throw new Error("Citizen token limit cannot exceed the funding goal")
      }
      return true
    }),

  body("approvalNotes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Approval notes cannot exceed 500 characters"),
]

// Project creation validation (after approval)
const projectCreationValidation = [
  body("projectTitle")
    .notEmpty()
    .withMessage("Project Title is required")
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage("Project Title must be between 3 and 150 characters"),

  body("projectType")
    .notEmpty()
    .withMessage("Project Type is required")
    .isIn([
      "Infrastructure",
      "Environment",
      "Education",
      "Healthcare",
      "Social Welfare",
      "Technology",
      "Community Development",
      "Arts & Culture",
      "Sports & Recreation",
      "Other",
    ])
    .withMessage("Invalid project type selected"),

  body("state")
    .notEmpty()
    .withMessage("State is required")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("State must be between 2 and 50 characters"),

  body("city").optional().trim().isLength({ min: 2, max: 50 }).withMessage("City must be between 2 and 50 characters"),

  body("country")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Country must be between 2 and 50 characters"),

  body("projectDescription")
    .notEmpty()
    .withMessage("Project Description is required")
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Project Description must be between 10 and 2000 characters"),

  body("contactInfo.representativeName")
    .notEmpty()
    .withMessage("Representative Name is required")
    .trim()
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Representative name can only contain letters and spaces")
    .isLength({ min: 3, max: 100 })
    .withMessage("Representative name must be between 3 and 100 characters"),

  body("contactInfo.email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be valid")
    .normalizeEmail(),
]

const projectUpdateValidation = [
  body("projectTitle")
    .optional()
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage("Project Title must be between 3 and 150 characters"),

  body("projectDescription")
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Project Description must be between 10 and 2000 characters"),
]

module.exports = {
  socialProjectRegistrationValidation,
  socialProjectApprovalValidation,
  projectCreationValidation,
  projectUpdateValidation,
}
