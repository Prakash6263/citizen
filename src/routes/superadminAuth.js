const express = require("express")
const router = express.Router()
const User = require("../models/User")
const RefreshToken = require("../models/RefreshToken")
const AuditLog = require("../models/AuditLog")

// @desc    Superadmin login
// @route   POST /api/super/login
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body
    const ip = req.ip
    const userAgent = req.get("User-Agent")

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both email and password",
      })
    }

    const user = await User.findByEmailOrUsername(email).select("+password")

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    // Ensure this is the superadmin
    if (user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Access denied — this route is only for superadmin",
      })
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Superadmin account is deactivated",
      })
    }

    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    const token = user.getSignedJwtToken()

    // Update user login info
    user.lastLogin = new Date()
    user.loginCount += 1
    user.lastLoginIP = ip
    await user.save({ validateBeforeSave: false })

    // Log audit trail
    await AuditLog.logAction({
      user: user._id,
      action: "login",
      description: "Superadmin logged in successfully",
      ip,
      userAgent,
      severity: "medium",
    })

    // Generate refresh token
    const refreshToken = user.getRefreshToken()
    await RefreshToken.create({
      token: refreshToken,
      user: user._id,
      deviceInfo: {
        userAgent,
        ip,
        deviceType: userAgent?.includes("Mobile") ? "mobile" : "desktop",
      },
    })

    res.status(200).json({
      success: true,
      message: "Superadmin login successful",
      token,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        role: user.role,
        userType: user.userType,
      },
    })
  } catch (error) {
    console.error("Superadmin login error:", error)
    res.status(500).json({
      success: false,
      message: "Server error during superadmin login",
    })
  }
})

module.exports = router
