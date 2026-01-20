const express = require("express")
const { protect } = require("../middleware/auth")
const {
  requestTokenConversionValidation,
  approveConversionRequestValidation,
  rejectConversionRequestValidation,
  markConversionAsPaidValidation,
  addCommentValidation,
} = require("../validators/tokenToFiatValidators")
const {
  checkProjectGoalCompletion,
  requestTokenConversion,
  getConversionRequests,
  getConversionRequestDetails,
  approveConversionRequest,
  rejectConversionRequest,
  markConversionAsPaid,
  getConversionHistory,
  addConversionComment,
} = require("../controllers/tokenToFiatController")

const router = express.Router()

// All routes require authentication
router.use(protect)

// ============================================
// Social Project User Routes
// ============================================

// Check if project goal is completed
router.get("/check-project-goal/:projectId", checkProjectGoalCompletion)

// Request token to fiat conversion
router.post("/request", requestTokenConversionValidation, requestTokenConversion)

// Get user's conversion history
router.get("/user/history", getConversionHistory)

// Get specific conversion request details
router.get("/requests/:requestId", getConversionRequestDetails)

// Add comment to conversion request
router.post(
  "/requests/:requestId/comment",
  addCommentValidation,
  addConversionComment,
)

// ============================================
// Government User Routes
// ============================================

// Get all conversion requests (government only)
router.get("/", getConversionRequests)

// Approve conversion request
router.patch(
  "/requests/:requestId/approve",
  approveConversionRequestValidation,
  approveConversionRequest,
)

// Reject conversion request
router.patch(
  "/requests/:requestId/reject",
  rejectConversionRequestValidation,
  rejectConversionRequest,
)

// Mark conversion as paid and deduct tokens
router.patch(
  "/requests/:requestId/mark-paid",
  markConversionAsPaidValidation,
  markConversionAsPaid,
)

module.exports = router
