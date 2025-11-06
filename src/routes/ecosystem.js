const express = require("express")
const {
  getAllCitizens,
  getAllProjects,
  getEcosystemOverview,
  manageCitizenAccount,
  manageProjectStatus,
  setAllocationLimits,
  getAllocationLimits,
} = require("../controllers/ecosystemController")
const { protect, authorize } = require("../middleware/auth")
const { body } = require("express-validator")
const { handleValidationErrors } = require("../middleware/validation")

const router = express.Router()

// All ecosystem routes require government authorization
router.use(protect)
router.use(authorize("government"))

// Ecosystem overview and listings
router.get("/overview", getEcosystemOverview)
router.get("/citizens", getAllCitizens)
router.get("/projects", getAllProjects)

// Account and project management
router.put(
  "/citizens/:id/manage",
  [
    body("action").isIn(["suspend", "activate", "verify", "unverify"]),
    body("reason").optional().isLength({ min: 5, max: 200 }),
  ],
  handleValidationErrors,
  manageCitizenAccount,
)

router.put(
  "/projects/:id/manage",
  [
    body("action").isIn(["approve", "suspend", "reject", "complete"]),
    body("reason").optional().isLength({ min: 5, max: 200 }),
  ],
  handleValidationErrors,
  manageProjectStatus,
)

// Allocation limits management
router.get("/limits", getAllocationLimits)
router.put(
  "/limits",
  [
    body("citizenLimit").optional().isInt({ min: 1, max: 10000 }),
    body("projectLimit").optional().isInt({ min: 1, max: 100000 }),
    body("dailyIssuanceLimit").optional().isInt({ min: 1, max: 1000000 }),
  ],
  handleValidationErrors,
  setAllocationLimits,
)

module.exports = router
