const { body, validationResult } = require("express-validator")
const { errorResponse } = require("../utils/responseHelper")

// Handle validation errors from express-validator
const handleTokenConversionValidationErrors = (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }))

    return errorResponse(res, "Validation failed", 400, errorMessages)
  }

  next()
}

// Validator for requesting token conversion
const requestTokenConversionValidation = [
  body("projectId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Project ID is required"),
  body("tokenAmount")
    .isFloat({ min: 0.01 })
    .withMessage("Token amount must be a positive number"),
  body("fiatCurrency")
    .optional()
    .isIn(["USD", "EUR", "GBP", "INR", "CAD", "AUD"])
    .withMessage("Fiat currency must be one of: USD, EUR, GBP, INR, CAD, AUD"),
  body("conversionRate")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Conversion rate must be a positive number"),
  body("bankDetails.accountHolderName")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Account holder name is required"),
  body("bankDetails.bankName")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Bank name is required"),
  body("bankDetails.accountNumber")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Account number is required"),
  body("bankDetails.ifscCode")
    .optional()
    .isString()
    .trim(),
  body("bankDetails.swiftCode")
    .optional()
    .isString()
    .trim(),
  body("bankDetails.routingNumber")
    .optional()
    .isString()
    .trim(),
  body("bankDetails.country")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Country is required"),
  handleTokenConversionValidationErrors,
]

// Validator for approving conversion request
const approveConversionRequestValidation = [
  body("internalNotes")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Internal notes cannot exceed 500 characters"),
  handleTokenConversionValidationErrors,
]

// Validator for rejecting conversion request
const rejectConversionRequestValidation = [
  body("rejectionReason")
    .isString()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Rejection reason must be between 10 and 500 characters"),
  handleTokenConversionValidationErrors,
]

// Validator for marking conversion as paid
const markConversionAsPaidValidation = [
  body("transactionId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Transaction ID is required"),
  body("paymentMethod")
    .optional()
    .isIn(["bank_transfer", "check", "wire", "other"])
    .withMessage("Payment method must be one of: bank_transfer, check, wire, other"),
  body("paymentNotes")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Payment notes cannot exceed 500 characters"),
  body("bankTransferDetails.senderBankName")
    .optional()
    .isString()
    .trim(),
  body("bankTransferDetails.transferDate")
    .optional()
    .isISO8601()
    .withMessage("Transfer date must be a valid ISO8601 date"),
  body("bankTransferDetails.referenceNumber")
    .optional()
    .isString()
    .trim(),
  handleTokenConversionValidationErrors,
]

// Validator for adding comment
const addCommentValidation = [
  body("comment")
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Comment must be between 1 and 1000 characters"),
  handleTokenConversionValidationErrors,
]

module.exports = {
  requestTokenConversionValidation,
  approveConversionRequestValidation,
  rejectConversionRequestValidation,
  markConversionAsPaidValidation,
  addCommentValidation,
  handleTokenConversionValidationErrors,
}
