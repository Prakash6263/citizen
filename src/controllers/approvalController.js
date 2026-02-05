const RegistrationApproval = require("../models/RegistrationApproval");
const Government = require("../models/Government");
const User = require("../models/User");
const { sendEmail } = require("../utils/emailService");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/responseHelper");

function generateStrongPassword() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+[]{};:,.?";
  let pwd = "";
  for (let i = 0; i < 14; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

function buildUsername(base) {
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug.slice(0, 24);
}

// @desc    Get pending registrations
// @route   GET /api/admin/approvals
// @access  Private (Admin only)

const getPendingApprovals = asyncHandler(async (req, res) => {
  const { type, status, page = 1, limit = 10 } = req.query;

  const filter = {};

  // 1️⃣ Application type filter
  if (type) {
    const trimmed = String(type).trim().toLowerCase();
    filter.applicationType =
      trimmed === "government"
        ? "government"
        : trimmed === "social_project"
        ? "social_project"
        : "citizen";
  }

  // 2️⃣ Status filter
  if (status) {
    filter.status = status;
  } else {
    // For social_project, include all statuses (pending and approved)
    // For others, only show pending and under_review
    if (type && String(type).trim().toLowerCase() === "social_project") {
      filter.status = { $in: ["pending", "under_review", "approved"] };
    } else {
      filter.status = { $in: ["pending", "under_review"] };
    }
  }

  // 3️⃣ Get government city if logged-in user is government (not superadmin)
  let govCity = null;
  if (req.user.userType === "government" && req.user.role !== "superadmin") {
    const government = await Government.findOne({
      userId: req.user._id,
      isSuperAdminVerified: true,
    }).lean();

    if (!government || !government.city) {
      return errorResponse(res, "Government profile or city not found", 404);
    }

    govCity = government.city.trim().toLowerCase();
   
  }

  // 4️⃣ Fetch approvals from RegistrationApproval
  const approvals = await RegistrationApproval.find(filter)
    .sort({ submittedAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .lean();

  const populatedApprovals = [];

  for (const approval of approvals) {
    const applicantCity = approval.city?.trim().toLowerCase();

    // 🔐 Only include citizen & social_project where city matches government city (but not for superadmin)
    if (
      req.user.userType === "government" &&
      req.user.role !== "superadmin" &&
      ["citizen", "social_project"].includes(approval.applicationType)
    ) {
      if (!applicantCity || applicantCity !== govCity) {
        // console.log(`Skipping ${approval.applicantId} | city: ${approval.city}`);
        continue; // Skip approvals where city does not match
      }
    }

    // 5️⃣ Populate government data for government applicant types
    let populatedApproval = { ...approval };

    if (approval.applicationType === "government" && approval.applicantModel === "Government") {
      try {
        const government = await Government.findById(approval.applicantId).lean();
        if (government) {
          populatedApproval.applicantData = {
            governmentName: government.governmentName,
            entityType: government.entityType,
            country: government.country,
            province: government.province,
            city: government.city,
            representativeName: government.representativeName,
            email: government.institutionalEmail,
          };
        }
      } catch (error) {
        console.error("Error fetching government data:", error.message);
      }
    } else if (approval.applicationType === "social_project" && approval.applicantModel === "User") {
      // Populate social project user data
      try {
        const user = await User.findById(approval.applicantId).lean();
        if (user) {
          populatedApproval.applicantData = {
            fullName: user.fullName,
            email: user.email,
            username: user.username,
            userType: user.userType,
            country: approval.country,
            province: approval.province,
            city: approval.city,
            phone: user.phone,
            accountCreatedAt: user.createdAt,
          };
        }
      } catch (error) {
        console.error("Error fetching social project user data:", error.message);
      }
    }

    // Include approval if city matches or not restricted
    populatedApprovals.push(populatedApproval);
  }

  const total = populatedApprovals.length;
 
  return successResponse(res, "Pending approvals retrieved successfully", {
    approvals: populatedApprovals,
    pagination: {
      current: Number(page),
      pages: Math.ceil(total / Number(limit)),
      total,
    },
  });
});


module.exports = { getPendingApprovals };

// @desc    Get approval details
// @route   GET /api/admin/approvals/:id
// @access  Private (Admin only)
const getApprovalDetails = asyncHandler(async (req, res) => {
  const approval = await RegistrationApproval.findById(req.params.id);

  if (!approval) {
    return errorResponse(res, "Approval record not found", 404);
  }

  let model = Government;
  if (approval.applicantModel === "User") model = User;
  else if (approval.applicantModel === "SocialProjectRegistration") {
    const SocialProjectRegistration = require("../models/SocialProjectRegistration");
    model = SocialProjectRegistration;
  }

  const applicant = await model.findById(approval.applicantId);

  const populatedApproval = {
    ...approval.toObject(),
    applicantId: applicant,
  };

  // Populate reviewedBy
  if (approval.reviewedBy) {
    const reviewer = await User.findById(approval.reviewedBy).select(
      "fullName email",
    );
    populatedApproval.reviewedBy = reviewer;
  }

  // Populate communicationLog.sentBy
  for (let i = 0; i < populatedApproval.communicationLog.length; i++) {
    if (populatedApproval.communicationLog[i].sentBy) {
      const sender = await User.findById(
        populatedApproval.communicationLog[i].sentBy,
      ).select("fullName");
      populatedApproval.communicationLog[i].sentBy = sender;
    }
  }

  successResponse(res, "Approval details retrieved successfully", {
    approval: populatedApproval,
  });
});

// @desc    Process approval decision
// @route   PUT /api/admin/approvals/:id/decision
// @access  Private (Admin only)
const processApprovalDecision = asyncHandler(async (req, res) => {
  const { decision } = req.body;

  const approval = await RegistrationApproval.findById(req.params.id);
  if (!approval) return errorResponse(res, "Approval record not found", 404);

  let model = Government;
  if (approval.applicantModel === "User") model = User;
  else if (approval.applicantModel === "SocialProjectRegistration") {
    const SocialProjectRegistration = require("../models/SocialProjectRegistration");
    model = SocialProjectRegistration;
  }

  const applicant = await model.findById(approval.applicantId);

  if (!applicant) {
    return errorResponse(
      res,
      "Associated applicant record not found. The applicant may have been deleted.",
      404,
    );
  }

  const type = (approval.applicationType || "").toString();

  // Only superadmin can approve/reject government registrations
  if (type === "government" && req.user.role !== "superadmin") {
    return errorResponse(
      res,
      "Only superadmin can approve or reject government registrations",
      403,
    );
  }

  // Update approval record
  approval.status = decision === "approved" ? "approved" : "rejected";
  approval.approvalDecision = decision;
  approval.reviewedBy = req.user._id;
  approval.reviewedAt = new Date();
  await approval.save();

  let updatedGovernment;
  if (type === "government") {
    updatedGovernment = await Government.findByIdAndUpdate(
      applicant._id,
      {
        status: decision === "approved" ? "approved" : "rejected",
        approvedBy: req.user._id,
        approvedAt: decision === "approved" ? new Date() : undefined,
        ...(decision === "approved" ? { isSuperAdminVerified: true } : {}),
      },
      { new: true },
    );

    if (!updatedGovernment) {
      return errorResponse(res, "Government record not found", 404);
    }

    if (decision === "approved") {
      if (updatedGovernment.userId) {
        await User.findByIdAndUpdate(
          updatedGovernment.userId,
          { isSuperAdminVerified: true, isEmailVerified: true },
          { new: true },
        );
      } else {
        const generatedPassword = generateStrongPassword();
        const baseUsername = buildUsername(
          updatedGovernment.governmentName || "gov",
        );
        let username = baseUsername;
        let i = 0;
        while (await User.findOne({ username })) {
          i++;
          username = `${baseUsername}_${i}`.slice(0, 30);
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
        });

        updatedGovernment.userId = targetUser._id;
        await updatedGovernment.save({ validateBeforeSave: false });

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
        });
      }
    }
  } else if (type === "citizen" || type === "social_project") {
    // Handle both citizen and social_project approvals
    if (decision === "approved") {
      const updateData = {
        isGovernmentApproved: true,
      };
      
      // For social_project, also set isRegistrationProjectDone to true
      if (type === "social_project") {
        updateData.isRegistrationProjectDone = true;
      }
      
      await User.findByIdAndUpdate(applicant._id, updateData);
    } else {
      // On rejection, keep isGovernmentApproved as false
      await User.findByIdAndUpdate(applicant._id, {
        isGovernmentApproved: false,
      });
    }
  }

  const applicantEmail = applicant.email || applicant.institutionalEmail;
  const applicantName = applicant.fullName || applicant.governmentName;

  if (applicantEmail) {
    const emailTemplate =
      decision === "approved"
        ? `${approval.applicationType}Approved`
        : `${approval.applicationType}Rejected`;

    try {
      await sendEmail({
        to: applicantEmail,
        subject: `Registration ${decision === "approved" ? "Approved" : "Rejected"}`,
        template: emailTemplate,
        data: {
          name: applicantName,
        },
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
      // Don't fail the entire operation if email failss
    }
  }

  const responseData =
    type === "government"
      ? { approval: approval, government: updatedGovernment }
      : { approval };
  return successResponse(
    res,
    `Registration ${decision === "approved" ? "approved" : "rejected"} successfully`,
    responseData,
  );
});

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
  ]);

  const pendingCount = await RegistrationApproval.countDocuments({
    status: { $in: ["pending", "under_review"] },
  });

  successResponse(res, "Approval statistics retrieved successfully", {
    stats,
    pendingCount,
  });
});

module.exports = {
  getPendingApprovals,
  getApprovalDetails,
  processApprovalDecision,
  getApprovalStats,
};
