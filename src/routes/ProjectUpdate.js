const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const projectUpdateController = require("../controllers/projectUpdateController")
const { protect, authorize } = require("../middleware/auth")

const uploadDir = path.join(process.env.UPLOAD_PATH || "uploads", "project-updates")

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, "update-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const fileFilter = (req, file, cb) => {
  // Accept images only for project updates
  if (file.mimetype.startsWith("image/")) {
    cb(null, true)
  } else {
    cb(new Error("Only image files are allowed for project updates"), false)
  }
}

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
})

// Create a new project update
router.post(
  "/social-projects/:projectId/updates",
  protect,
  authorize("social_project"),
  upload.single("media"),
  projectUpdateController.createProjectUpdate,
)

// Get all updates for a specific project
router.get("/social-projects/:projectId/updates", projectUpdateController.getProjectUpdatesByProjectId)

// Get a specific update by ID
router.get("/updates/:updateId", projectUpdateController.getProjectUpdateById)

// Update a project update
router.put(
  "/updates/:updateId",
  protect,
  authorize("social_project"),
  upload.single("media"),
  projectUpdateController.updateProjectUpdate,
)

// Delete a project update
router.delete("/updates/:updateId", protect, authorize("social_project"), projectUpdateController.deleteProjectUpdate)

router.post("/updates/:updateId/like", protect, projectUpdateController.likeProjectUpdate)

router.delete("/updates/:updateId/like", protect, projectUpdateController.unlikeProjectUpdate)

router.post("/updates/:updateId/comments", protect, projectUpdateController.addCommentToProjectUpdate)

router.delete("/updates/:updateId/comments/:commentId", protect, projectUpdateController.removeCommentFromProjectUpdate)

router.get("/updates/random/all", projectUpdateController.getAllProjectUpdatesRandomly)

router.get("/updates/:updateId/comments", projectUpdateController.getProjectUpdateComments)

module.exports = router
