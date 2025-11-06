const { validationResult } = require("express-validator")
const { errorResponse } = require("../utils/responseHelper")

// Handle validation errors from express-validator
const handleValidationErrors = (req, res, next) => {
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

module.exports = {
  handleValidationErrors,
}
