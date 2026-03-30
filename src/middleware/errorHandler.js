/**
 * Global Error Handler Middleware
 * Handles all errors in the application and sends appropriate responses
 */

const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  // Log error for debugging
  console.error("Error:", err)

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found"
    error = { message, statusCode: 404 }
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    // Extract field names from the error
    const field = Object.keys(err.keyValue)[0]
    const value = err.keyValue[field]
    
    // Create user-friendly error messages
    let message = "Duplicate field value entered"
    
    if (err.collection === "projectsupports") {
      // Handle ProjectSupport-specific duplicate errors
      if (field === "supportId") {
        message = "This support record already exists. Please refresh and try again."
      } else if (field === "project" || err.keyPattern?.project_1_supporter_1) {
        message = "You have already supported this project. Update your existing support or contact support for assistance."
      } else {
        message = `Cannot create support record: ${field} must be unique. You may have already supported this project.`
      }
    } else {
      message = `A record with this ${field} already exists`
    }
    
    error = { message, statusCode: 400, details: { field, value } }
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const validationErrors = Object.entries(err.errors).map(([field, val]) => {
      let message = val.message
      
      // Special handling for ProjectSupport validation errors
      if (err.model?.modelName === "ProjectSupport") {
        if (field === "tokensSpent") {
          const value = val.value
          if (val.kind === "max") {
            message = `You cannot allocate more than 5 tokens to a single project. You tried to allocate ${value} tokens.`
          } else if (val.kind === "min") {
            message = `You must allocate at least 1 token to support a project. You tried to allocate ${value} tokens.`
          } else if (!value && val.kind === "required") {
            message = "Please specify how many tokens you want to allocate (1-5 tokens)."
          }
        } else if (field === "citizen") {
          message = "Invalid citizen information. Please try logging in again."
        } else if (field === "project") {
          message = "Invalid project ID. The project may have been deleted or is unavailable."
        } else if (field === "projectRegistration") {
          message = "Invalid project registration. Please try again later or contact support."
        } else if (field === "supportId") {
          message = "Failed to generate support record ID. Please try again."
        }
      }
      
      return message
    })
    
    const message = validationErrors.join("; ")
    error = { message, statusCode: 400 }
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token"
    error = { message, statusCode: 401 }
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired"
    error = { message, statusCode: 401 }
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Server Error",
  })
}

module.exports = errorHandler
