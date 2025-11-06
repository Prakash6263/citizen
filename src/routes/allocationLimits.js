const express = require("express")
const router = express.Router()
const {
  setAllocationLimits,
  getAllocationLimits,
  getAllocationLimitsByRegistration,
  updateAllocationLimits,
  getCitizenSpendingOnProject,
  getProjectFundingStatusWithLimits,
} = require("../controllers/allocationLimitController")

const { protect, authorize } = require("../middleware/auth")
const {
  setAllocationLimitsValidation,
  updateAllocationLimitsValidation,
} = require("../validators/allocationLimitValidators")

// All routes require authentication
router.use(protect)

// Government routes - Set and manage allocation limits
router.post("/set", authorize("government"), setAllocationLimitsValidation, setAllocationLimits)

router.get("/registration/:projectRegistrationId", authorize("government"), getAllocationLimitsByRegistration)

router.put("/:limitId", authorize("government"), updateAllocationLimitsValidation, updateAllocationLimits)

// Public routes - View allocation limits and funding status
router.get("/:projectRegistrationId/:projectId", getAllocationLimits)

router.get("/:projectRegistrationId/:projectId/funding-status", getProjectFundingStatusWithLimits)

// Citizen routes - View personal spending
router.get("/:projectId/citizen-spending", authorize("citizen"), getCitizenSpendingOnProject)

module.exports = router
