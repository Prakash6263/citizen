const express = require("express")
const { getTokenBalance, issueToken, transferTokens, getTokenStats } = require("../controllers/tokenController")
const { protect } = require("../middleware/auth")

const router = express.Router()

// All routes require authentication
router.use(protect)

// Get token balance
router.get("/balance", getTokenBalance)

// Issue tokens (Government only)
router.post("/issue", issueToken)

// Transfer tokens between users
router.post("/transfer", transferTokens)

// Get token statistics (Government only)
router.get("/stats", getTokenStats)

module.exports = router
