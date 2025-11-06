const express = require("express")
const multer = require("multer")
const path = require("path")
const { protect, authorize } = require("../middleware/auth")
const {
  submitTokenClaim,
  getMyTokenClaims,
  getAllTokenClaims,
  reviewTokenClaim,
  getTokenClaimStats,
} = require("../controllers/tokenClaimController")
const { validateTokenClaim, validateTokenClaimReview } = require("../validators/tokenClaimValidators")

const router = express.Router()

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || "uploads/")
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, "claim-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const fileFilter = (req, file, cb) => {
  // Accept images and PDFs only
  if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
    cb(null, true)
  } else {
    cb(new Error("Only images and PDF files are allowed"), false)
  }
}

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5, // Maximum 5 files
  },
  fileFilter: fileFilter,
})

// Citizen routes
router.post("/", protect, authorize("citizen"), upload.array("proofDocuments", 5), validateTokenClaim, submitTokenClaim)
router.get("/my", protect, authorize("citizen"), getMyTokenClaims)

// Government routes
router.get("/", protect, authorize("government"), getAllTokenClaims)
router.put("/:id/review", protect, authorize("government"), validateTokenClaimReview, reviewTokenClaim)
router.get("/stats", protect, authorize("government"), getTokenClaimStats)

module.exports = router
