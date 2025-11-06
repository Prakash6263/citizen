const express = require("express")
const {
  registerGovernmentStep1,
  registerGovernmentStep2,
  getGovernmentProfile,
  updateGovernmentProfile,
} = require("../controllers/governmentController")
const { protect, authorize } = require("../middleware/auth")
const {
  governmentRegisterStep1Validation,
  governmentRegisterStep2Validation,
} = require("../validators/governmentValidators")
const { handleValidationErrors } = require("../middleware/validation")

const router = express.Router()

// Two-step registration (public)
router.post("/register/step-1", governmentRegisterStep1Validation, handleValidationErrors, registerGovernmentStep1)
router.put("/register/step-2/:id", governmentRegisterStep2Validation, handleValidationErrors, registerGovernmentStep2)

// Profile (requires government user)
router.get("/profile", protect, authorize("government"), getGovernmentProfile)
router.put("/profile", protect, authorize("government"), updateGovernmentProfile)

module.exports = router
