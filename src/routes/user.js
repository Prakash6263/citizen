const express = require("express")
const multer = require("multer")
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  getSettings,
  updateSettings,
  changePassword,
  getUserActivity,
  deactivateAccount,
  deleteAccount,
  getUserStats,
} = require("../controllers/userController")

const { getWallet, getTransactionHistory, getWalletStats } = require("../controllers/walletController")

const { protect } = require("../middleware/auth")
const { updateProfileValidation, updateSettingsValidation } = require("../validators/userValidators")
const { changePasswordValidation } = require("../validators/authValidators")

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
})

// All routes are protected
router.use(protect)

// Profile routes
router.get("/profile", getProfile)
router.put("/profile", updateProfileValidation, updateProfile)
router.get("/stats", getUserStats)

// Avatar routes
router.post("/avatar", upload.single("avatar"), uploadAvatar)
router.delete("/avatar", deleteAvatar)

// Settings routes
router.get("/settings", getSettings)
router.put("/settings", updateSettingsValidation, updateSettings)

// Password management
router.put("/change-password", changePasswordValidation, changePassword)

// Activity and audit
router.get("/activity", getUserActivity)

router.get("/wallet", getWallet)
router.get("/wallet/transactions", getTransactionHistory)
router.get("/wallet/stats", getWalletStats)

// Account management
router.put("/deactivate", deactivateAccount)
router.delete("/account", deleteAccount)

module.exports = router
