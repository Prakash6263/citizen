const express = require("express")
const {
  getDashboardOverview,
  getUserEngagement,
  getFinancialAnalytics,
  getSystemHealth,
  getDetailedReports,
} = require("../controllers/dashboardController")
const { protect, authorize } = require("../middleware/auth")

const router = express.Router()

// All dashboard routes require government authorization
router.use(protect)
router.use(authorize("government"))

// Dashboard analytics routes
router.get("/overview", getDashboardOverview)
router.get("/engagement", getUserEngagement)
router.get("/financial", getFinancialAnalytics)
router.get("/health", getSystemHealth)
router.get("/reports", getDetailedReports)

module.exports = router
