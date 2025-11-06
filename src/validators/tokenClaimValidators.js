const { body, validationResult } = require("express-validator")
const { errorResponse } = require("../utils/responseHelper")

const validateTokenClaim = [
  body("paymentType")
    .isIn(["property_tax", "utility_bill", "municipal_fee", "other"])
    .withMessage("Invalid payment type"),

  body("paymentAmount").isFloat({ min: 0.01 }).withMessage("Payment amount must be a positive number"),

  body("paymentDate")
    .isISO8601()
    .withMessage("Invalid payment date format")
    .custom((value) => {
      const paymentDate = new Date(value)
      const now = new Date()
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(now.getFullYear() - 1)

      if (paymentDate > now) {
        throw new Error("Payment date cannot be in the future")
      }
      if (paymentDate < oneYearAgo) {
        throw new Error("Payment date cannot be more than one year ago")
      }
      return true
    }),

  body("paymentCurrency").optional().isIn(["ARS", "USD"]).withMessage("Invalid currency"),

  body("paymentReference")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Payment reference must be less than 100 characters"),

  body("description").optional().isLength({ max: 500 }).withMessage("Description must be less than 500 characters"),

  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array())
    }

    // Check if proof documents are uploaded
    if (!req.files || req.files.length === 0) {
      return errorResponse(res, "At least one proof document is required", 400)
    }

    next()
  },
]

const validateTokenClaimReview = [
  body("decision").isIn(["approve", "reject"]).withMessage("Decision must be either 'approve' or 'reject'"),

  body("reviewNotes").optional().isLength({ max: 1000 }).withMessage("Review notes must be less than 1000 characters"),

  body("rejectionReason")
    .if(body("decision").equals("reject"))
    .notEmpty()
    .withMessage("Rejection reason is required when rejecting a claim")
    .isLength({ max: 500 })
    .withMessage("Rejection reason must be less than 500 characters"),

  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array())
    }
    next()
  },
]

module.exports = {
  validateTokenClaim,
  validateTokenClaimReview,
}
