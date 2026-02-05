const express = require("express")
const { getTokenBalance, submitTokenClaim, getMyTokenClaims } = require("../controllers/tokenController")
const { protect, authorize } = require("../middleware/auth")

const router = express.Router()

// All routes require authentication
router.use(protect)

// Get token balance
router.get("/balance", getTokenBalance)
router.post("/claim", authorize("citizen"), submitTokenClaim);     //added
router.get("/my-claims", authorize("citizen"), getMyTokenClaims);   // added

module.exports = router
