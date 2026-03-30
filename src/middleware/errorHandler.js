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
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ")
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
