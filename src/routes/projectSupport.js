const express = require("express")
const {
  supportProject,
  getMySupportedProjects,
  getProjectSupporters,
  getProjectSupportStats,
} = require("../controllers/projectSupportController")
const { protect, authorize } = require("../middleware/auth")

const router = express.Router()

// All routes require authentication
router.use(protect)

// Get citizen's supported projects
router.get("/my-supported", getMySupportedProjects)

// Citizen support project
router.post("/:projectId/support", authorize("citizen"), supportProject)

// Get project supporters
router.get("/:projectId/supporters", getProjectSupporters)

// Get project support statistics
router.get("/:projectId/support-stats", getProjectSupportStats)

module.exports = router
