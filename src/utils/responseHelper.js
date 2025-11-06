/**
 * Standardized API Response Helper
 * Provides consistent response format across the application
 */

class ResponseHelper {
  /**
   * Send success response
   */
  static success(res, data = null, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Send error response
   */
  static error(res, message = "Something went wrong", statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors && { errors }),
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Send validation error response
   * Modified to flatten error structure - first error message appears directly in response
   */
  static validationError(res, errors) {
    // Extract first error for direct access
    const firstError = errors && errors.length > 0 ? errors[0] : null

    return res.status(400).json({
      success: false,
      message: firstError?.msg || "Validation failed",
      field: firstError?.path || null,
      value: firstError?.value || null,
      ...(errors &&
        errors.length > 0 && {
          errors: errors.map((err) => ({
            field: err.path,
            message: err.msg,
            value: err.value,
          })),
        }),
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Send paginated response
   */
  static paginated(res, data, pagination, message = "Data retrieved successfully") {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        currentPage: pagination.page,
        totalPages: pagination.totalPages,
        totalItems: pagination.total,
        itemsPerPage: pagination.limit,
        hasNextPage: pagination.page < pagination.totalPages,
        hasPrevPage: pagination.page > 1,
      },
      timestamp: new Date().toISOString(),
    })
  }
}

const successResponse = (res, message = "Success", data = null, statusCode = 200) => {
  // Map to class method which expects (res, data, message, statusCode)
  return ResponseHelper.success(res, data, message, statusCode)
}

const errorResponse = (res, message = "Something went wrong", statusCode = 500, errors = null) => {
  return ResponseHelper.error(res, message, statusCode, errors)
}

const paginatedResponse = (res, data, pagination, message = "Data retrieved successfully") => {
  return ResponseHelper.paginated(res, data, pagination, message)
}

const validationErrorResponse = (res, errors) => {
  return ResponseHelper.validationError(res, errors)
}

// Ensure both default (class) and named function exports work
module.exports = ResponseHelper
module.exports.successResponse = successResponse
module.exports.errorResponse = errorResponse
module.exports.paginatedResponse = paginatedResponse
module.exports.validationErrorResponse = validationErrorResponse
