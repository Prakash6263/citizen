const express = require("express")
const { protect } = require("../middleware/auth")
const policyController = require("../controllers/policyController")

const router = express.Router()

// Get policy by type (public endpoints)
router.get("/:type", policyController.getPolicyByType)

// Protect all admin routes
router.use(protect)

// Get all policies with version history (admin)
router.get("/", policyController.getAllPolicies)

// Get policy version history
router.get("/:type/history", policyController.getPolicyHistory)

// Get specific policy version
router.get("/:type/version/:versionNumber", policyController.getPolicyVersion)

// Create or update policy
router.post("/", policyController.createOrUpdatePolicy)
router.put("/:id", policyController.createOrUpdatePolicy)

// Update policy status
router.patch("/:id/status", policyController.updatePolicyStatus)

// Restore policy to previous version
router.post("/:type/restore/:versionNumber", policyController.restorePolicyVersion)

module.exports = router
