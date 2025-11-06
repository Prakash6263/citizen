const RegistrationApproval = require("../models/RegistrationApproval")
const Government = require("../models/Government")
const User = require("../models/User")
const { sendEmail } = require("../utils/emailService")
const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")

function generateStrongPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+[]{};:,.?"
  let pwd = ""
  for (let i = 0; i < 14; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pwd
}

function buildUsername(base) {
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return slug.slice(0, 24)
}

// @desc    Get pending registrations
// @route   GET /api/admin/approvals
// @access  Private (Admin only)
const getPendingApprovals = asyncHandler(async (req, res) => {
  const { type, status, page = 1, limit = 10 } = req.query

  const filter = {}

  if (type) {
    const trimmed = String(type).trim().toLowerCase()
    const modelName =
      trimmed === "government" ? "government" : trimmed === "social_project" ? "social_project" : "citizen"
    filter.applicationType = modelName

    if (modelName === "government") {
      const statusSet = status ? [status] : ["pending", "under_review"]

      // Find all pending governments that don't have approval records yet
      const pendingGovs = await Government.find({
        status: { $in: statusSet },
        isSuperAdminVerified: false, // Only fetch unverified governments
      }).select("_id")

      const pendingGovIds = pendingGovs.map((g) => g._id)

      if (pendingGovIds.length > 0) {
        // Find which governments already have approval records
        const existingApprovals = await RegistrationApproval.find({
          applicationType: "government",
          applicantId: { $in: pendingGovIds },
        }).select("applicantId")

        const existingSet = new Set(existingApprovals.map((a) => String(a.applicantId)))
        const missingIds = pendingGovIds.filter((id) => !existingSet.has(String(id)))

        // Create approval records for governments that don't have one yet
        if (missingIds.length > 0) {
          await RegistrationApproval.insertMany(
            missingIds.map((id) => ({
              applicationType: "government",
              applicantId: id,
              applicantModel: "government",
              status: "pending",
              submittedAt: new Date(),
            })),
            { ordered: false },
          ).catch((err) => {
            // Ignore duplicate key errors
            if (err.code !== 11000) throw err
          })
        }
      }
    }
  }

  if (status) filter.status = status
  else filter.status = { $in: ["pending", "under_review"] }

  const query = RegistrationApproval.find(filter)
    .sort({ submittedAt: -1 })
    .limit(Number(limit) * 1)
    .skip((Number(page) - 1) * Number(limit))

  // Manually populate based on applicantModel for each document
  const approvals = await query.exec()
  const populatedApprovals = []

  for (const approval of approvals) {
    let model = Government
    if (approval.applicantModel === "User") model = User
    else if (approval.applicantModel === "SocialProjectRegistration") {
      const SocialProjectRegistration = require("../models/SocialProjectRegistration")
      model = SocialProjectRegistration
    }

    const applicant = await model
      .findById(approval.applicantId)
      .select(
        "fullName email governmentName projectTitle status verificationStatus isSuperAdminVerified city province country",
      )

    populatedApprovals.push({
      ...approval.toObject(),
      applicantId: applicant || null,
    })
  }

  const total = await RegistrationApproval.countDocuments(filter)

  successResponse(res, "Pending approvals retrieved successfully", {
    approvals: populatedApprovals,
    pagination: {
      current: Number(page),
      pages: Math.ceil(total / Number(limit)),
      total,
    },
  })
})

// @desc    Get approval details
// @route   GET /api/admin/approvals/:id
// @access  Private (Admin only)
const getApprovalDetails = asyncHandler(async (req, res) => {
  const approval = await RegistrationApproval.findById(req.params.id)

  if (!approval) {
    return errorResponse(res, "Approval record not found", 404)
  }

  let model = Government
  if (approval.applicantModel === "User") model = User
  else if (approval.applicantModel === "SocialProjectRegistration") {
    const SocialProjectRegistration = require("../models/SocialProjectRegistration")
    model = SocialProjectRegistration
  }

  const applicant = await model.findById(approval.applicantId)

  const populatedApproval = {
    ...approval.toObject(),
    applicantId: applicant,
  }

  // Populate reviewedBy
  if (approval.reviewedBy) {
    const reviewer = await User.findById(approval.reviewedBy).select("fullName email")
    populatedApproval.reviewedBy = reviewer
  }

  // Populate communicationLog.sentBy
  for (let i = 0; i < populatedApproval.communicationLog.length; i++) {
    if (populatedApproval.communicationLog[i].sentBy) {
      const sender = await User.findById(populatedApproval.communicationLog[i].sentBy).select("fullName")
      populatedApproval.communicationLog[i].sentBy = sender
    }
  }

  successResponse(res, "Approval details retrieved successfully", { approval: populatedApproval })
})

// @desc    Process approval decision
// @route   PUT /api/admin/approvals/:id/decision
// @access  Private (Admin only)
const processApprovalDecision = asyncHandler(async (req, res) => {
  const { decision, reviewNotes, rejectionReason, conditions } = req.body

  const approval = await RegistrationApproval.findById(req.params.id)
  if (!approval) return errorResponse(res, "Approval record not found", 404)

  let model = Government
  if (approval.applicantModel === "User") model = User
  else if (approval.applicantModel === "SocialProjectRegistration") {
    const SocialProjectRegistration = require("../models/SocialProjectRegistration")
    model = SocialProjectRegistration
  }

  const applicant = await model.findById(approval.applicantId)

  if (!applicant) {
    return errorResponse(res, "Associated applicant record not found. The applicant may have been deleted.", 404)
  }

  const type = (approval.applicationType || "").toString()

  // Only superadmin can approve/reject government registrations
  if (type === "government" && req.user.role !== "superadmin") {
    return errorResponse(res, "Only superadmin can approve or reject government registrations", 403)
  }

  if (type === "social_project") {
    return errorResponse(res, "Use /api/projects/applications/:id/decision for project approval workflow", 400)
  }

  // Update approval record
  approval.status = decision === "approved" ? "approved" : "rejected"
  approval.approvalDecision = decision
  approval.reviewedBy = req.user._id
  approval.reviewedAt = new Date()
  approval.reviewNotes = reviewNotes
  approval.rejectionReason = decision === "rejected" ? rejectionReason : undefined
  approval.conditions = conditions ?? approval.conditions
  await approval.save()

  let updatedGovernment
  if (type === "government") {
    updatedGovernment = await Government.findByIdAndUpdate(
      applicant._id,
      {
        status: decision === "approved" ? "approved" : "rejected",
        approvedBy: req.user._id,
        approvedAt: decision === "approved" ? new Date() : undefined,
        rejectionReason: decision === "rejected" ? rejectionReason : undefined,
        ...(decision === "approved" ? { isSuperAdminVerified: true } : {}),
      },
      { new: true },
    )

    if (!updatedGovernment) {
      return errorResponse(res, "Government record not found", 404)
    }

    if (decision === "approved") {
      if (updatedGovernment.userId) {
        await User.findByIdAndUpdate(
          updatedGovernment.userId,
          { isSuperAdminVerified: true, isEmailVerified: true },
          { new: true },
        )
      } else {
        const generatedPassword = generateStrongPassword()
        const baseUsername = buildUsername(updatedGovernment.governmentName || "gov")
        let username = baseUsername
        let i = 0
        while (await User.findOne({ username })) {
          i++
          username = `${baseUsername}_${i}`.slice(0, 30)
        }

        const targetUser = await User.create({
          fullName: updatedGovernment.governmentName,
          email: updatedGovernment.institutionalEmail.toLowerCase(),
          username,
          password: generatedPassword,
          userType: "government",
          country: updatedGovernment.country,
          province: updatedGovernment.province,
          city: updatedGovernment.city,
          agreedToTerms: !!updatedGovernment.acceptedTermsAndConditions,
          agreedToPrivacy: true,
          isEmailVerified: true,
          isSuperAdminVerified: true,
        })

        updatedGovernment.userId = targetUser._id
        await updatedGovernment.save({ validateBeforeSave: false })

        await sendEmail({
          email: updatedGovernment.institutionalEmail,
          subject: "Your Government Account is Approved",
          template: "governmentApprovedCredentials",
          data: {
            governmentName: updatedGovernment.governmentName,
            username: targetUser.username,
            password: generatedPassword,
            loginUrl: `${process.env.FRONTEND_URL || ""}/login`,
          },
        })
      }
    }
  } else if (type === "citizen") {
    if (decision === "approved") {
      await User.findByIdAndUpdate(applicant._id, {
        isGovernmentApproved: true,
      })
    } else {
      // On rejection, keep isGovernmentApproved as false
      await User.findByIdAndUpdate(applicant._id, {
        isGovernmentApproved: false,
      })
    }
  }

  const applicantEmail = applicant.email || applicant.institutionalEmail
  const applicantName = applicant.fullName || applicant.governmentName

  if (applicantEmail) {
    const emailTemplate =
      decision === "approved" ? `${approval.applicationType}Approved` : `${approval.applicationType}Rejected`

    try {
      await sendEmail({
        to: applicantEmail,
        subject: `Registration ${decision === "approved" ? "Approved" : "Rejected"}`,
        template: emailTemplate,
        data: {
          name: applicantName,
          reviewNotes,
          rejectionReason,
          conditions,
        },
      })
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message)
      // Don't fail the entire operation if email fails
    }
  }

  const responseData = type === "government" ? { approval: approval, government: updatedGovernment } : { approval }
  return successResponse(
    res,
    `Registration ${decision === "approved" ? "approved" : "rejected"} successfully`,
    responseData,
  )
})

// @desc    Add communication to approval
// @route   POST /api/admin/approvals/:id/communicate
// @access  Private (Admin only)
const addCommunication = asyncHandler(async (req, res) => {
  const { message, messageType } = req.body

  const approval = await RegistrationApproval.findById(req.params.id)

  if (!approval) {
    return errorResponse(res, "Approval record not found", 404)
  }

  approval.communicationLog.push({
    message,
    messageType,
    sentBy: req.user._id,
    sentAt: new Date(),
  })

  await approval.save()

  successResponse(res, "Communication added successfully", { approval })
})

// @desc    Get approval statistics
// @route   GET /api/admin/approvals/stats
// @access  Private (Admin only)
const getApprovalStats = asyncHandler(async (req, res) => {
  const stats = await RegistrationApproval.aggregate([
    {
      $group: {
        _id: {
          type: "$applicationType",
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.type",
        statuses: {
          $push: {
            status: "$_id.status",
            count: "$count",
          },
        },
        total: { $sum: "$count" },
      },
    },
  ])

  const pendingCount = await RegistrationApproval.countDocuments({
    status: { $in: ["pending", "under_review"] },
  })

  successResponse(res, "Approval statistics retrieved successfully", {
    stats,
    pendingCount,
  })
})

module.exports = {
  getPendingApprovals,
  getApprovalDetails,
  processApprovalDecision,
  addCommunication,
  getApprovalStats,
}
