const crypto = require("crypto")
const User = require("../models/User")
const RefreshToken = require("../models/RefreshToken")
const LoginAttempt = require("../models/LoginAttempt")
const AuditLog = require("../models/AuditLog")
const asyncHandler = require("../utils/asyncHandler")
const ResponseHelper = require("../utils/responseHelper")
const { validationResult } = require("express-validator")
const { sendEmail } = require("../utils/emailService")

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return ResponseHelper.validationError(res, errors.array())
  }

  const { fullName, email, username, password, userType, country, province, city, agreedToTerms, agreedToPrivacy } =
    req.body

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  })

  if (existingUser) {
    if (existingUser.email === email.toLowerCase()) {
      return ResponseHelper.error(res, "User with this email already exists", 200)
    }
    if (existingUser.username === username.toLowerCase()) {
      return ResponseHelper.error(res, "Username is already taken", 400)
    }
  }

  // Create user
  const user = await User.create({
    fullName,
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    password,
    userType,
    country,
    province,
    city,
    agreedToTerms,
    agreedToPrivacy,
    registrationIP: req.ip,
    isGovernmentApproved: userType === "government" ? false : false, // Will be set to true only when government approves
  })

  const verificationOTP = user.getEmailVerificationOTP()
  await user.save({ validateBeforeSave: false })

  // Send verification email with OTP
  try {
    await sendEmail({
      email: user.email,
      subject: "Email Verification - Municipality Platform",
      template: "emailVerification",
      data: {
        name: user.fullName,
        otp: verificationOTP,
      },
    })
  } catch (error) {
    console.error("Email sending failed:", error)
    // Don't fail registration if email fails
  }

  // Log audit trail
  await AuditLog.logAction({
    user: user._id,
    action: "register",
    description: `User registered with type: ${userType}`,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    severity: "low",
  })

  if (userType === "citizen") {
    const RegistrationApproval = require("../models/RegistrationApproval")
    const Government = require("../models/Government")

    const government = await Government.findOne({
      city: city,
      province: province,
      country: country,
      status: "approved",
      isSuperAdminVerified: true,
    })

    const approvalStatus = government ? "approved" : "pending"

    const approval = await RegistrationApproval.create({
      applicationType: "citizen",
      applicantId: user._id,
      applicantModel: "User",
      status: approvalStatus,
      submittedAt: new Date(),
      country: country,
      province: province,
      city: city,
      ...(government && {
        reviewedBy: government.userId,
        reviewedAt: new Date(),
        approvalDecision: "approved",
      }),
    })

    // Auto-approve citizen if government exists
    if (government) {
      await User.findByIdAndUpdate(user._id, {
        isGovernmentApproved: true,
      })
    }
  }

  // Remove password from response
  user.password = undefined

  ResponseHelper.success(
    res,
    {
      user,
      message:
        "Registration successful! Please check your email for the 6-digit verification code. Your account will be activated after email verification and local government approval.",
    },
    "User registered successfully",
    201,
  )
})

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return ResponseHelper.validationError(res, errors.array())
  }

  const { identifier, password } = req.body
  const ip = req.ip
  const userAgent = req.get("User-Agent")

  // Check rate limiting
  const isRateLimited = await LoginAttempt.isRateLimited(identifier, ip)
  if (isRateLimited) {
    await LoginAttempt.logAttempt({
      identifier,
      ip,
      userAgent,
      success: false,
      failureReason: "too_many_attempts",
    })

    return ResponseHelper.error(res, "Too many login attempts. Please try again later.", 429)
  }

  // Find user by email or username
  const user = await User.findByEmailOrUsername(identifier).select("+password")

  if (!user) {
    await LoginAttempt.logAttempt({
      identifier,
      ip,
      userAgent,
      success: false,
      failureReason: "invalid_credentials",
    })

    return ResponseHelper.error(res, "Invalid credentials", 401)
  }

  // Check if account is active
  if (!user.isActive) {
    await LoginAttempt.logAttempt({
      identifier,
      ip,
      userAgent,
      success: false,
      failureReason: "account_inactive",
      user: user._id,
    })

    return ResponseHelper.error(res, "Account is deactivated. Please contact support.", 401)
  }

  if (!user.isEmailVerified) {
    await LoginAttempt.logAttempt({
      identifier,
      ip,
      userAgent,
      success: false,
      failureReason: "email_not_verified",
      user: user._id,
    })

    return ResponseHelper.error(
      res,
      "Please verify your email address before logging in. Check your inbox for the verification code.",
      401,
    )
  }

  if (user.userType === "citizen" && !user.isGovernmentApproved) {
    console.log("[v0] Citizen login blocked - government approval pending:", user._id, user.email)
    await LoginAttempt.logAttempt({
      identifier,
      ip,
      userAgent,
      success: false,
      failureReason: "government_not_approved",
      user: user._id,
    })
    return ResponseHelper.error(
      res,
      "Your account is pending approval from your local government. Please contact your local government office for approval.",
      401,
    )
  }

  if (user.userType === "social_project" && !user.isGovernmentApproved) {
    console.log("[v0] Social project login blocked - government approval pending:", user._id, user.email)
    await LoginAttempt.logAttempt({
      identifier,
      ip,
      userAgent,
      success: false,
      failureReason: "government_not_approved",
      user: user._id,
    })
    return ResponseHelper.error(
      res,
      "Your social project account is pending approval from your local government. Please contact your local government office for approval.",
      401,
    )
  }

  // Block government users from logging in until superadmin verifies
  if (user.userType === "government" && user.role !== "superadmin" && user.isSuperAdminVerified !== true) {
    await LoginAttempt.logAttempt({
      identifier,
      ip,
      userAgent,
      success: false,
      failureReason: "superadmin_not_verified",
      user: user._id,
    })
    return ResponseHelper.error(res, "Your account is pending super admin verification. Please try again later.", 401)
  }

  const isMatch = await user.matchPassword(password)
  if (!isMatch) {
    await LoginAttempt.logAttempt({
      identifier,
      ip,
      userAgent,
      success: false,
      failureReason: "invalid_credentials",
      user: user._id,
    })

    return ResponseHelper.error(res, "Invalid credentials", 401)
  }

  // Log successful login attempt
  await LoginAttempt.logAttempt({
    identifier,
    ip,
    userAgent,
    success: true,
    user: user._id,
  })

  // Update user login info
  user.lastLogin = new Date()
  user.loginCount += 1
  user.lastLoginIP = ip
  await user.save({ validateBeforeSave: false })

  // Log audit trail
  await AuditLog.logAction({
    user: user._id,
    action: "login",
    description: "User logged in successfully",
    ip,
    userAgent,
    severity: "low",
  })

  // Generate tokens
  const token = user.getSignedJwtToken()
  const refreshToken = user.getRefreshToken()

  // Save refresh token
  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    deviceInfo: {
      userAgent,
      ip,
      deviceType: userAgent?.includes("Mobile") ? "mobile" : "desktop",
    },
  })

  // Remove password from response
  user.password = undefined

  const responseData = {
    user,
    token,
    refreshToken,
  }

  if (user.userType === "social_project") {
    const RegistrationApproval = require("../models/RegistrationApproval")
    const SocialProjectRegistration = require("../models/SocialProjectRegistration")

    responseData.isRegistrationProjectDone = user.isRegistrationProjectDone || false

    const projectRegistration = await SocialProjectRegistration.findOne({ user: user._id })

    // If registration exists and is approved, then government approval is considered done
    responseData.isGovernmentApproveProject = projectRegistration ? projectRegistration.status === "approved" : false
  }

  ResponseHelper.success(res, responseData, "Login successful")
})

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body

  if (refreshToken) {
    // Deactivate refresh token
    await RefreshToken.findOneAndUpdate({ token: refreshToken, user: req.user._id }, { isActive: false })
  }

  // Log audit trail
  await AuditLog.logAction({
    user: req.user._id,
    action: "logout",
    description: "User logged out",
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    severity: "low",
  })

  ResponseHelper.success(res, null, "Logout successful")
})

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return ResponseHelper.error(res, "Refresh token is required", 400)
  }

  // Find and validate refresh token
  const tokenDoc = await RefreshToken.findOne({
    token: refreshToken,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).populate("user")

  if (!tokenDoc) {
    return ResponseHelper.error(res, "Invalid or expired refresh token", 401)
  }

  // Check if user is still active
  if (!tokenDoc.user.isActive) {
    await RefreshToken.findByIdAndUpdate(tokenDoc._id, { isActive: false })
    return ResponseHelper.error(res, "User account is deactivated", 401)
  }

  // Update last used
  tokenDoc.lastUsed = new Date()
  await tokenDoc.save()

  // Generate new access token
  const newAccessToken = tokenDoc.user.getSignedJwtToken()

  // Log audit trail
  await AuditLog.logAction({
    user: tokenDoc.user._id,
    action: "token_refresh",
    description: "Access token refreshed",
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    severity: "low",
  })

  ResponseHelper.success(
    res,
    {
      token: newAccessToken,
      user: {
        id: tokenDoc.user._id,
        fullName: tokenDoc.user.fullName,
        email: tokenDoc.user.email,
        username: tokenDoc.user.username,
        userType: tokenDoc.user.userType,
        isEmailVerified: tokenDoc.user.isEmailVerified,
      },
    },
    "Token refreshed successfully",
  )
})

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return ResponseHelper.validationError(res, errors.array())
  }

  const { email } = req.body

  const user = await User.findOne({ email: email.toLowerCase() })

  if (!user) {
    // Don't reveal if email exists or not
    return ResponseHelper.success(
      res,
      null,
      "If an account with that email exists, a password reset code has been sent.",
    )
  }

  const resetOTP = user.getResetPasswordOTP()
  await user.save({ validateBeforeSave: false })

  // Send reset email with OTP
  try {
    await sendEmail({
      email: user.email,
      subject: "Password Reset - Municipality Platform",
      template: "passwordResetOTP",
      data: {
        name: user.fullName,
        otp: resetOTP,
      },
    })

    // Log audit trail
    await AuditLog.logAction({
      user: user._id,
      action: "password_reset",
      description: "Password reset OTP requested",
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      severity: "medium",
    })
  } catch (error) {
    console.error("Email sending failed:", error)
    user.resetPasswordOTP = undefined
    user.resetPasswordExpire = undefined
    await user.save({ validateBeforeSave: false })

    return ResponseHelper.error(res, "Email could not be sent. Please try again later.", 500)
  }

  ResponseHelper.success(res, null, "If an account with that email exists, a password reset code has been sent.")
})

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return ResponseHelper.validationError(res, errors.array())
  }

  const { resetToken, newPassword } = req.body

  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordTokenExpire: { $gt: Date.now() },
  })

  if (!user) {
    return ResponseHelper.error(res, "Invalid or expired reset token. Please request a new password reset.", 400)
  }

  // Set new password
  user.password = newPassword
  user.resetPasswordOTP = undefined
  user.resetPasswordExpire = undefined
  user.resetPasswordToken = undefined
  user.resetPasswordTokenExpire = undefined
  await user.save()

  // Revoke all refresh tokens for security
  await RefreshToken.revokeAllForUser(user._id)

  // Log audit trail
  await AuditLog.logAction({
    user: user._id,
    action: "password_change",
    description: "Password reset completed using secure token",
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    severity: "medium",
  })

  // Generate new tokens
  const newToken = user.getSignedJwtToken()
  const refreshToken = user.getRefreshToken()

  // Save refresh token
  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    deviceInfo: {
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      deviceType: req.get("User-Agent")?.includes("Mobile") ? "mobile" : "desktop",
    },
  })

  ResponseHelper.success(
    res,
    {
      token: newToken,
      refreshToken,
    },
    "Password reset successful",
  )
})

/**
 * @desc    Verify email
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
const verifyEmail = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return ResponseHelper.validationError(res, errors.array())
  }

  const { email, otp } = req.body

  if (!email || !otp) {
    return ResponseHelper.error(res, "Email and OTP are required", 400)
  }

  const user = await User.findOne({
    email: email.toLowerCase(),
    emailVerificationOTP: otp,
    emailVerificationExpire: { $gt: Date.now() },
  })

  if (!user) {
    return ResponseHelper.error(res, "Invalid email or OTP, or verification code has expired", 400)
  }

  // Verify email
  user.isEmailVerified = true
  user.emailVerificationOTP = undefined
  user.emailVerificationExpire = undefined
  await user.save({ validateBeforeSave: false })

  // Send welcome email
  try {
    await sendEmail({
      email: user.email,
      template: "welcomeEmail",
      data: {
        name: user.fullName,
      },
    })
  } catch (error) {
    console.error("Welcome email sending failed:", error)
    // Don't fail verification if welcome email fails
  }

  // Log audit trail
  await AuditLog.logAction({
    user: user._id,
    action: "email_verification",
    description: "Email verified successfully",
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    severity: "low",
  })

  ResponseHelper.success(
    res,
    {
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    },
    "Email verified successfully",
  )
})

/**
 * @desc    Resend email verification
 * @route   POST /api/auth/resend-verification
 * @access  Private
 */
const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  if (user.isEmailVerified) {
    return ResponseHelper.error(res, "Email is already verified", 400)
  }

  const verificationOTP = user.getEmailVerificationOTP()
  await user.save({ validateBeforeSave: false })

  // Send verification email with new OTP
  try {
    await sendEmail({
      email: user.email,
      subject: "Email Verification - Municipality Platform",
      template: "emailVerification",
      data: {
        name: user.fullName,
        otp: verificationOTP,
      },
    })
  } catch (error) {
    console.error("Email sending failed:", error)
    return ResponseHelper.error(res, "Email could not be sent. Please try again later.", 500)
  }

  ResponseHelper.success(res, null, "New verification code sent to your email")
})

/**
 * @desc    Resend email verification (Public - for unverified users)
 * @route   POST /api/auth/resend-verification-public
 * @access  Public
 */
const resendVerificationPublic = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return ResponseHelper.validationError(res, errors.array())
  }

  const { email } = req.body

  // Find user by email
  const user = await User.findOne({ email: email.toLowerCase() })

  if (!user) {
    // Don't reveal if email exists
    return ResponseHelper.success(res, null, "If an account with that email exists, a verification code has been sent.")
  }

  if (user.isEmailVerified) {
    return ResponseHelper.error(res, "Email is already verified", 400)
  }

  // Generate new OTP
  const verificationOTP = user.getEmailVerificationOTP()
  await user.save({ validateBeforeSave: false })

  // Send verification email with new OTP
  try {
    await sendEmail({
      email: user.email,
      subject: "Email Verification - Municipality Platform",
      template: "emailVerification",
      data: {
        name: user.fullName,
        otp: verificationOTP,
      },
    })

    // Log audit trail
    await AuditLog.logAction({
      user: user._id,
      action: "resend_verification",
      description: "Email verification OTP resent (public endpoint)",
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      severity: "low",
    })
  } catch (error) {
    console.error("Email sending failed:", error)
    return ResponseHelper.error(res, "Email could not be sent. Please try again later.", 500)
  }

  ResponseHelper.success(res, null, "Verification code sent to your email")
})

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  ResponseHelper.success(res, { user }, "User data retrieved successfully")
})

/**
 * @desc    Verify reset password OTP
 * @route   POST /api/auth/verify-reset-password
 * @access  Public
 */
const verifyResetPassword = asyncHandler(async (req, res) => {
  // Validate input
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return ResponseHelper.validationError(res, errors.array())
  }

  const { email, otp } = req.body

  const user = await User.findOne({
    email: email.toLowerCase(),
    resetPasswordOTP: otp,
    resetPasswordExpire: { $gt: Date.now() },
  })

  if (!user) {
    return ResponseHelper.error(res, "Invalid email, OTP, or reset code has expired", 400)
  }

  const resetToken = user.getResetPasswordToken()
  await user.save({ validateBeforeSave: false })

  // Log audit trail for verification step
  await AuditLog.logAction({
    user: user._id,
    action: "password_reset",
    description: "Password reset OTP verified and reset token generated",
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    severity: "medium",
  })

  return ResponseHelper.success(
    res,
    {
      verified: true,
      resetToken,
      message: "OTP verified successfully. Use the reset token to change your password.",
    },
    "Reset code verified",
  )
})

/**
 * @desc    Register social project user
 * @route   POST /api/auth/register-social
 * @access  Public
 */
const registerSocial = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return ResponseHelper.validationError(res, errors.array())
  }

  const { fullName, email, password, country, province, city, agreedToTerms, agreedToPrivacy } = req.body

  // Check if email already exists
  const existingByEmail = await User.findOne({ email: email.toLowerCase() })
  if (existingByEmail) {
    return ResponseHelper.error(res, "User with this email already exists", 200)
  }

  // Generate a unique username from fullName or email local-part
  const baseFromName = (fullName || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  const baseFromEmail = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  let base = baseFromName || baseFromEmail || "user"
  base = base.slice(0, 24) // keep under 30 after suffix

  let username = base
  let attempt = 0
  // ensure username uniqueness
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await User.findOne({ username })
    if (!exists) break
    attempt += 1
    const suffix = attempt < 1000 ? attempt.toString() : Math.floor(Math.random() * 100000).toString()
    username = `${base}_${suffix}`.slice(0, 30)
  }

  // Create social_project user
  const user = await User.create({
    fullName,
    email: email.toLowerCase(),
    username,
    password,
    userType: "social_project", // force social module
    country,
    province,
    city,
    agreedToTerms,
    agreedToPrivacy,
    registrationIP: req.ip,
    isGovernmentApproved: false, // Will be set to true only when government approves
  })

  const verificationOTP = user.getEmailVerificationOTP()
  await user.save({ validateBeforeSave: false })

  // Send verification email with OTP (best-effort)
  try {
    await sendEmail({
      email: user.email,
      subject: "Email Verification - Municipality Platform",
      template: "emailVerification",
      data: { name: user.fullName, otp: verificationOTP },
    })
  } catch (error) {
    console.error("Email sending failed:", error)
    // proceed without failing registration
  }

  // Audit log
  await AuditLog.logAction({
    user: user._id,
    action: "register_social",
    description: "Social Project user registered",
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    severity: "low",
  })

  const RegistrationApproval = require("../models/RegistrationApproval")
  const Government = require("../models/Government")

  const government = await Government.findOne({
    city: city,
    province: province,
    country: country,
    status: "approved",
    isSuperAdminVerified: true,
  })

  const approvalStatus = government ? "approved" : "pending"

  await RegistrationApproval.create({
    applicationType: "social_project",
    applicantId: user._id,
    applicantModel: "User",
    status: approvalStatus,
    submittedAt: new Date(),
    country: country,
    province: province,
    city: city,
    ...(government && {
      reviewedBy: government.userId,
      reviewedAt: new Date(),
      approvalDecision: "approved",
    }),
  })

  // Auto-approve social project if government exists
  if (government) {
    await User.findByIdAndUpdate(user._id, {
      isGovernmentApproved: true,
    })
  }

  return ResponseHelper.success(
    res,
    {
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        isEmailVerified: false,
      },
      message:
        "Registration successful! Please check your email for the 6-digit verification code. You must verify your email before logging in.",
    },
    "Social project user registered successfully. Please verify your email.",
    201,
  )
})

module.exports = {
  register,
  login,
  logout,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  resendVerificationPublic,
  getMe,
  verifyResetPassword,
  registerSocial,
}
