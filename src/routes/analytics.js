const express = require("express")
const router = express.Router()
const { getUserAnalytics } = require("../controllers/analyticsController")

const { protect } = require("../middleware/auth")

// Protected routes - User analytics only
router.use(protect)
router.get("/users/:userId", getUserAnalytics)

module.exports = router
