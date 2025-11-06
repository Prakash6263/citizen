const express = require("express")
const {
  getPendingApprovals,
  getApprovalDetails,
  processApprovalDecision,
  addCommunication,
  getApprovalStats,
} = require("../controllers/approvalController")
const { protect, authorize } = require("../middleware/auth")
const { approvalValidation } = require("../validators/governmentValidators")
const { handleValidationErrors } = require("../middleware/validation")

const router = express.Router()

// All routes require authentication
router.use(protect)

// Government users can approve citizens, superadmin can approve governments
router.get(
  "/approvals",
  (req, res, next) => {
    // Allow government and superadmin roles
    if (req.user.userType !== "government" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied" })
    }
    next()
  },
  getPendingApprovals,
)

router.get(
  "/approvals/stats",
  (req, res, next) => {
    if (req.user.userType !== "government" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied" })
    }
    next()
  },
  getApprovalStats,
)

router.get(
  "/approvals/:id",
  (req, res, next) => {
    if (req.user.userType !== "government" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied" })
    }
    next()
  },
  getApprovalDetails,
)

router.put(
  "/approvals/:id/decision",
  (req, res, next) => {
    if (req.user.userType !== "government" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied" })
    }
    next()
  },
  approvalValidation,
  handleValidationErrors,
  processApprovalDecision,
)

router.post(
  "/approvals/:id/communicate",
  (req, res, next) => {
    if (req.user.userType !== "government" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied" })
    }
    next()
  },
  addCommunication,
)

module.exports = router
