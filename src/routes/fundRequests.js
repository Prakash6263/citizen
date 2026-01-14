const express = require("express")
const { createFundRequest, getMyfundRequests, getFundRequestDetails } = require("../controllers/fundRequestController")
const { protect, authorize } = require("../middleware/auth")
const { upload } = require("../controllers/mediaController")

const router = express.Router()

// All routes require authentication
router.use(protect)

// Citizen/Social Project owner can create fund requests
router.post("/", authorize("citizen", "social_project"), upload.single("bankTransferProof"), createFundRequest)

router.get("/", authorize("citizen", "social_project"), getMyfundRequests)

router.get("/:fundRequestId", authorize("citizen", "social_project"), getFundRequestDetails)

module.exports = router
