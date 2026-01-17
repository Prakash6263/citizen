const express = require("express")
const { getTokenBalance } = require("../controllers/tokenController")
const { protect } = require("../middleware/auth")

const router = express.Router()

// All routes require authentication
router.use(protect)

// Get token balance
router.get("/balance", getTokenBalance)

module.exports = router
