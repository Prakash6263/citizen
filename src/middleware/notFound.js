/**
 * 404 Not Found Middleware
 * Handles requests to non-existent routes
 */

const notFound = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`)
  res.status(404).json({
    success: false,
    error: error.message,
    availableRoutes: {
      auth: "/api/auth",
      user: "/api/user",
      profile: "/api/profile",
      health: "/health",
    },
  })
}

module.exports = notFound
