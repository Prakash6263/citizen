const Policy = require("../models/Policy")
const AuditLog = require("../models/AuditLog")
const asyncHandler = require("../utils/asyncHandler")
const ResponseHelper = require("../utils/responseHelper")
const { validationResult } = require("express-validator")

/**
 * @desc    Get policy by type
 * @route   GET /api/policies/:type
 * @access  Public
 */
const getPolicyByType = asyncHandler(async (req, res) => {
  const { type } = req.params

  // Validate policy type
  if (!["terms_and_conditions", "privacy_policy"].includes(type)) {
    return ResponseHelper.error(res, "Invalid policy type", 400)
  }

  const policy = await Policy.findOne({
    policyType: type,
    isActive: true,
  })

  if (!policy) {
    return ResponseHelper.error(res, `${type} policy not found`, 404)
  }

  ResponseHelper.success(
    res,
    {
      policyType: policy.policyType,
      content: policy.content,
      version: policy.version,
      lastUpdated: policy.updatedAt,
    },
    "Policy retrieved successfully",
  )
})

/**
 * @desc    Get all policies (admin view with version history)
 * @route   GET /api/policies
 * @access  Private (Superadmin only)
 */
const getAllPolicies = asyncHandler(async (req, res) => {
  const policies = await Policy.find({}).populate("createdBy", "fullName email").populate("updatedBy", "fullName email")

  ResponseHelper.success(res, policies, "All policies retrieved successfully")
})

/**
 * @desc    Get policy version history
 * @route   GET /api/policies/:type/history
 * @access  Private (Superadmin only)
 */
const getPolicyHistory = asyncHandler(async (req, res) => {
  const { type } = req.params

  if (!["terms_and_conditions", "privacy_policy"].includes(type)) {
    return ResponseHelper.error(res, "Invalid policy type", 400)
  }

  const policy = await Policy.findOne({
    policyType: type,
  }).populate("versionHistory.updatedBy", "fullName email")

  if (!policy) {
    return ResponseHelper.error(res, "Policy not found", 404)
  }

  ResponseHelper.success(res, policy.versionHistory, "Policy history retrieved successfully")
})

/**
 * @desc    Create or update policy (Superadmin only)
 * @route   POST /api/policies
 * @route   PUT /api/policies/:id
 * @access  Private (Superadmin only)
 */
const createOrUpdatePolicy = asyncHandler(async (req, res) => {
  if (req.user.role !== "superadmin") {
    return ResponseHelper.error(res, "Only superadmin can manage policies", 403)
  }

  // Check validation errors
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return ResponseHelper.validationError(res, errors.array())
  }

  const { policyType, content, changeNotes, isActive } = req.body
  const policyId = req.params.id

  // Validate policy type
  if (!["terms_and_conditions", "privacy_policy"].includes(policyType)) {
    return ResponseHelper.error(res, "Invalid policy type", 400)
  }

  if (!content || content.trim().length === 0) {
    return ResponseHelper.error(res, "Policy content cannot be empty", 400)
  }

  let policy

  if (policyId) {
    // Update existing policy
    policy = await Policy.findById(policyId)

    if (!policy) {
      return ResponseHelper.error(res, "Policy not found", 404)
    }

    // Save current content to version history before updating
    policy.versionHistory.push({
      version: policy.version,
      content: policy.content,
      updatedBy: req.user._id,
      updatedAt: policy.updatedAt,
      changeNotes: policy.changeNotes,
    })

    // Increment version
    policy.version += 1
    policy.content = content
    policy.updatedBy = req.user._id
    policy.changeNotes = changeNotes || ""
    if (isActive !== undefined) {
      policy.isActive = isActive
    }

    await policy.save()

    // Log audit trail
    await AuditLog.logAction({
      user: req.user._id,
      action: "policy_update",
      description: `${policyType} policy updated to version ${policy.version}`,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      severity: "medium",
    })

    ResponseHelper.success(res, policy, "Policy updated successfully", 200)
  } else {
    // Create new policy
    const existingPolicy = await Policy.findOne({ policyType })

    if (existingPolicy) {
      return ResponseHelper.error(res, `${policyType} policy already exists. Use PUT to update.`, 400)
    }

    policy = await Policy.create({
      policyType,
      content,
      changeNotes: changeNotes || "",
      createdBy: req.user._id,
      isActive: isActive !== undefined ? isActive : true,
    })

    // Log audit trail
    await AuditLog.logAction({
      user: req.user._id,
      action: "policy_create",
      description: `${policyType} policy created`,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      severity: "medium",
    })

    ResponseHelper.success(res, policy, "Policy created successfully", 201)
  }
})

/**
 * @desc    Update policy status (activate/deactivate)
 * @route   PATCH /api/policies/:id/status
 * @access  Private (Superadmin only)
 */
const updatePolicyStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== "superadmin") {
    return ResponseHelper.error(res, "Only superadmin can manage policies", 403)
  }

  const { id } = req.params
  const { isActive } = req.body

  if (typeof isActive !== "boolean") {
    return ResponseHelper.error(res, "isActive must be a boolean", 400)
  }

  const policy = await Policy.findByIdAndUpdate(id, { isActive }, { new: true })

  if (!policy) {
    return ResponseHelper.error(res, "Policy not found", 404)
  }

  // Log audit trail
  await AuditLog.logAction({
    user: req.user._id,
    action: "policy_status_update",
    description: `${policy.policyType} policy status changed to ${isActive ? "active" : "inactive"}`,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    severity: "low",
  })

  ResponseHelper.success(res, policy, "Policy status updated successfully")
})

/**
 * @desc    Get specific policy version
 * @route   GET /api/policies/:type/version/:versionNumber
 * @access  Private (Superadmin only)
 */
const getPolicyVersion = asyncHandler(async (req, res) => {
  if (req.user.role !== "superadmin") {
    return ResponseHelper.error(res, "Only superadmin can access policy versions", 403)
  }

  const { type, versionNumber } = req.params

  const policy = await Policy.findOne({ policyType: type }).populate("versionHistory.updatedBy", "fullName email")

  if (!policy) {
    return ResponseHelper.error(res, "Policy not found", 404)
  }

  if (Number(versionNumber) === policy.version) {
    return ResponseHelper.success(
      res,
      {
        version: policy.version,
        content: policy.content,
        updatedBy: policy.updatedBy,
        updatedAt: policy.updatedAt,
        changeNotes: policy.changeNotes,
      },
      "Policy version retrieved successfully",
    )
  }

  const versionRecord = policy.versionHistory.find((v) => v.version === Number(versionNumber))

  if (!versionRecord) {
    return ResponseHelper.error(res, "Policy version not found", 404)
  }

  ResponseHelper.success(res, versionRecord, "Policy version retrieved successfully")
})

/**
 * @desc    Restore policy to previous version
 * @route   POST /api/policies/:type/restore/:versionNumber
 * @access  Private (Superadmin only)
 */
const restorePolicyVersion = asyncHandler(async (req, res) => {
  if (req.user.role !== "superadmin") {
    return ResponseHelper.error(res, "Only superadmin can restore policies", 403)
  }

  const { type, versionNumber } = req.params
  const { changeNotes } = req.body

  const policy = await Policy.findOne({ policyType: type })

  if (!policy) {
    return ResponseHelper.error(res, "Policy not found", 404)
  }

  const targetVersion = Number(versionNumber)

  if (targetVersion === policy.version) {
    return ResponseHelper.error(res, "Cannot restore to current version", 400)
  }

  let versionRecord

  if (targetVersion < policy.version) {
    versionRecord = policy.versionHistory.find((v) => v.version === targetVersion)

    if (!versionRecord) {
      return ResponseHelper.error(res, "Version not found", 404)
    }
  } else {
    return ResponseHelper.error(res, "Cannot restore to future version", 400)
  }

  // Save current version to history
  policy.versionHistory.push({
    version: policy.version,
    content: policy.content,
    updatedBy: req.user._id,
    updatedAt: policy.updatedAt,
    changeNotes: policy.changeNotes,
  })

  // Restore from history
  policy.version += 1
  policy.content = versionRecord.content
  policy.updatedBy = req.user._id
  policy.changeNotes = changeNotes || `Restored from version ${targetVersion}`

  await policy.save()

  // Log audit trail
  await AuditLog.logAction({
    user: req.user._id,
    action: "policy_restore",
    description: `${type} policy restored from version ${targetVersion} to version ${policy.version}`,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    severity: "high",
  })

  ResponseHelper.success(res, policy, "Policy restored successfully")
})

module.exports = {
  getPolicyByType,
  getAllPolicies,
  getPolicyHistory,
  createOrUpdatePolicy,
  updatePolicyStatus,
  getPolicyVersion,
  restorePolicyVersion,
}
