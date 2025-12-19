const express = require("express")
const router = express.Router()
const multer = require("multer")
const {
  submitSocialProjectRegistration,
  getMyRegistration,
  getPendingRegistrations,
  processSocialProjectDecision,
  createProject,
  getMyProjects,
  getRegistrationStats,
  getAllProjects,
  getActiveProjectsPublic,
  getProjectDetailsPublic,
  supportProjectWithTokens,
  getProjectFundingDetails,
  updateProject,
  getPendingProjectsApproval,
  approveProjectDecision,
} = require("../controllers/socialProjectRegistrationController")

const { protect, authorize, protectOptional } = require("../middleware/auth")
const {
  socialProjectRegistrationValidation,
  socialProjectApprovalValidation,
  projectCreationValidation,
  projectUpdateValidation,
} = require("../validators/socialProjectRegistrationValidators")

// Configure multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Invalid file type. Only PDF, images, and documents are allowed"))
    }
  },
})

// ============================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================

// Get all active projects
router.get("/public/active", getActiveProjectsPublic)

// Get single project details
router.get("/public/:projectId", protectOptional, getProjectDetailsPublic)

// Get project funding details (public access)
router.get("/:projectId/funding", getProjectFundingDetails)

// Get all projects (admin view, public)
router.get("/", getAllProjects)

// ============================================
// PROTECTED ROUTES (Authentication Required)
// ============================================

router.use(protect)

// ============================================
// GOVERNMENT USER ROUTES - Placed First
// ============================================

router.get("/pending-approval", authorize("government"), getPendingProjectsApproval)

// Get pending registrations for approval
router.get("/registrations/pending", authorize("government"), getPendingRegistrations)

// Get registration statistics
router.get("/registrations/stats", authorize("government"), getRegistrationStats)

// Approve or reject registration
router.put(
  "/registrations/:id/decision",
  authorize("government"),
  socialProjectApprovalValidation,
  processSocialProjectDecision,
)

// Approve or reject individual project
router.put("/:projectId/approve", authorize("government"), socialProjectApprovalValidation, approveProjectDecision)

// ============================================
// SOCIAL PROJECT USER ROUTES
// ============================================

// Submit registration (select project types)
router.post(
  "/register",
  authorize("social_project"),
  upload.array("documents", 5),
  socialProjectRegistrationValidation,
  submitSocialProjectRegistration,
)

// Get user's own registration
router.get("/my-registration", authorize("social_project"), getMyRegistration)

// Create a new project (only after registration approval)
router.post(
  "/create",
  authorize("social_project"),
  upload.array("documentation", 5),
  projectCreationValidation,
  createProject,
)

// Get all projects created by the user
router.get("/my-projects", authorize("social_project"), getMyProjects)

// Update project (title, description, media)
router.put(
  "/:projectId/update",
  authorize("social_project"),
  upload.array("documentation", 5),
  projectUpdateValidation,
  updateProject,
)

// ============================================
// CITIZEN USER ROUTES
// ============================================

// Support a project with tokens
router.post("/:projectId/support", authorize("citizen"), supportProjectWithTokens)

module.exports = router
