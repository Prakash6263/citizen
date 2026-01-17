const express = require("express")
const {
  createTokenRequest,
  getMyTokenRequests,
  getTokenRequestDetails,
  getPendingTokenRequests,
  approveTokenRequest,
  rejectTokenRequest,
} = require("../controllers/tokenRequestController")
const { protect, authorize } = require("../middleware/auth")
const { upload } = require("../controllers/mediaController")

const router = express.Router()

// All routes require authentication
router.use(protect)

router.get("/government", authorize("government"), getPendingTokenRequests)

// Citizen routes
router.post("/", authorize("citizen"), upload.single("proofDocument"), createTokenRequest)
router.get("/", authorize("citizen"), getMyTokenRequests)
router.get("/:tokenRequestId", authorize("citizen"), getTokenRequestDetails)

router.post("/:tokenRequestId/approve", authorize("government"), approveTokenRequest)
router.post("/:tokenRequestId/reject", authorize("government"), rejectTokenRequest)

module.exports = router
