const express = require("express")
const {
  createTokenRequest,
  getMyTokenRequests,
  getTokenRequestDetails,
} = require("../controllers/tokenRequestController")
const { protect, authorize } = require("../middleware/auth")
const { upload } = require("../controllers/mediaController")

const router = express.Router()

// All routes require authentication
router.use(protect)

// Citizen can create token requests
router.post("/", authorize("citizen"), upload.single("proofDocument"), createTokenRequest)

// Citizen can view their token requests
router.get("/", authorize("citizen"), getMyTokenRequests)

// Citizen can view specific token request details
router.get("/:tokenRequestId", authorize("citizen"), getTokenRequestDetails)

module.exports = router
