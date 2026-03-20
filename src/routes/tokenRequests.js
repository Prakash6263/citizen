const express = require("express")
const {
  createTokenRequest,
  getMyTokenRequests,
  getTokenRequestDetails,
  getPendingTokenRequests,
  approveTokenRequest,
  rejectTokenRequest,
  getPendingClaims,
  claimApprovedTokens,
  claimAllPendingTokens,
} = require("../controllers/tokenRequestController")
const { protect, authorize } = require("../middleware/auth")
const { upload } = require("../controllers/mediaController")

const router = express.Router()

// All routes require authentication
router.use(protect)

// Government routes
router.get("/government", authorize("government"), getPendingTokenRequests)
router.post("/:tokenRequestId/approve", authorize("government"), approveTokenRequest)
router.post("/:tokenRequestId/reject", authorize("government"), rejectTokenRequest)

// Citizen routes - Token requests
router.post("/", authorize("citizen"), upload.single("proofDocument"), createTokenRequest)
router.get("/", authorize("citizen"), getMyTokenRequests)

// Citizen routes - Token claims (NEW FLOW)
router.get("/pending-claims", authorize("citizen"), getPendingClaims)
router.post("/claim-all", authorize("citizen"), claimAllPendingTokens)
router.post("/:tokenRequestId/claim", authorize("citizen"), claimApprovedTokens)

// Citizen route - Get specific request details (must be after other routes with params)
router.get("/:tokenRequestId", authorize("citizen"), getTokenRequestDetails)

module.exports = router
