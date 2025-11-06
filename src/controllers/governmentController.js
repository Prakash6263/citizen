const Government = require("../models/Government")
const User = require("../models/User")
const RegistrationApproval = require("../models/RegistrationApproval")
const { generateUniqueId } = require("../utils/helpers")
const { sendEmail } = require("../utils/emailService")
const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")

// Step 1: Institutional Information
// @desc    Register government (step 1)
// @route   POST /api/government/register/step-1
// @access  Public
const registerGovernmentStep1 = asyncHandler(async (req, res) => {
  const {
    governmentName,
    entityType,
    country,
    province,
    city,
    representativeName,
    representativeRole,
    institutionalEmail,
  } = req.body

  // Unique by email or name+entity+city
  const existingGov = await Government.findOne({
    $or: [{ institutionalEmail }, { governmentName, entityType, city }],
  })
  if (existingGov) return errorResponse(res, "Government entity already started registration", 400)

  const registrationNumber = generateUniqueId("GOV")

  const government = await Government.create({
    governmentName,
    entityType,
    country,
    province,
    city,
    representativeName,
    representativeRole,
    institutionalEmail,
    registrationNumber,
    status: "pending",
    verificationStatus: "unverified",
  })

  // Only return id; step 2 will finalize and create approval
  return successResponse(
    res,
    "Government registration step 1 saved",
    {
      government: {
        _id: government._id,
        governmentName,
        registrationNumber,
        status: government.status,
      },
    },
    201,
  )
})

// Step 2: Main Contact & Consents -> Submit for approval
// @desc    Complete government registration (step 2)
// @route   PUT /api/government/register/step-2/:id
// @access  Public
const registerGovernmentStep2 = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { officialWebsite, comments, consentContactBeforeActivation, acceptedTermsAndConditions } = req.body

  const government = await Government.findById(id)
  if (!government) return errorResponse(res, "Government draft not found", 404)

  // Persist step-2 details
  government.officialWebsite = officialWebsite
  government.comments = comments
  government.consentContactBeforeActivation = !!consentContactBeforeActivation
  government.acceptedTermsAndConditions = !!acceptedTermsAndConditions
  await government.save()

  await RegistrationApproval.create({
    applicationType: "government",
    applicantId: government._id,
    applicantModel: "Government", // Specify which model the applicantId references
    status: "pending",
    submittedAt: new Date(),
  })

  // Acknowledge submission to institutional email
  await sendEmail({
    email: government.institutionalEmail,
    subject: "Government Registration Submitted",
    template: "governmentRegistrationSubmitted",
    data: {
      governmentName: government.governmentName,
      representativeName: government.representativeName,
      registrationNumber: government.registrationNumber,
    },
  })

  return successResponse(res, "Government registration submitted successfully", {
    government: {
      _id: government._id,
      governmentName: government.governmentName,
      status: government.status,
    },
  })
})

// @desc    Get government profile
// @route   GET /api/government/profile
// @access  Private
const getGovernmentProfile = asyncHandler(async (req, res) => {
  const government = await Government.findOne({ userId: req.user._id })
    .populate("userId", "fullName email")
    .populate("approvedBy", "fullName")

  if (!government) {
    return errorResponse(res, "Government profile not found", 404)
  }

  successResponse(res, "Government profile retrieved successfully", { government })
})

// @desc    Update government profile
// @route   PUT /api/government/profile
// @access  Private
const updateGovernmentProfile = asyncHandler(async (req, res) => {
  const government = await Government.findOne({ userId: req.user._id })

  if (!government) {
    return errorResponse(res, "Government profile not found", 404)
  }

  // Only allow updates if not approved or if specific fields
  const allowedUpdates = ["representativeName", "representativeRole", "officialWebsite", "comments"]

  const updates = {}
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field]
    }
  })

  const updatedGovernment = await Government.findByIdAndUpdate(government._id, updates, {
    new: true,
    runValidators: true,
  })

  successResponse(res, "Government profile updated successfully", {
    government: updatedGovernment,
  })
})

module.exports = {
  registerGovernmentStep1,
  registerGovernmentStep2,
  getGovernmentProfile,
  updateGovernmentProfile,
}
