const jwt = require("jsonwebtoken")
const User = require("../models/User")

/**
 * Protect routes - Authentication middleware
 * Verifies JWT token and adds user to request object
 */
const protect = async (req, res, next) => {
  try {
    let token

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1]
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Not authorized to access this route",
      })
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // Get user from token
      const user = await User.findById(decoded.id).select("-password")

      if (!user) {
        return res.status(401).json({
          success: false,
          error: "No user found with this token",
        })
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: "User account is deactivated",
        })
      }

      req.user = user
      next()
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: "Not authorized to access this route",
      })
    }
  } catch (error) {
    next(error)
  }
}

/**
 * Grant access to specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
     if (req.user.userType === "superadmin") {
      return next()
    }
    if (!roles.includes(req.user.userType )) {
      return res.status(403).json({
        success: false,
        error: `User type ${req.user.userType} is not authorized to access this route`,
      })
    }
    next()
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1]

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.id).select("-password")

        if (user && user.isActive) {
          req.user = user
        }
      } catch (error) {
        // Token invalid, but continue without user
        console.log("Invalid token in optional auth:", error.message)
      }
    }

    next()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  protect,
  authorize,
  optionalAuth,
}
