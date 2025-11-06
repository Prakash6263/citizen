const express = require("express")
const router = express.Router()
const {
  upload,
  uploadProjectDocuments,
  uploadProjectImages,
  uploadUpdateMedia,
  deleteProjectDocument,
  deleteProjectImage,
  deleteUpdateMedia,
  getMediaInfo,
  updateMediaCaption,
} = require("../controllers/mediaController")

const { protect } = require("../middleware/auth")

// Public routes
router.get("/info/:type/:id", getMediaInfo)

// Protected routes
router.use(protect)

// Project media routes
router.post("/projects/:projectId/documents", upload.array("documents", 5), uploadProjectDocuments)
router.post("/projects/:projectId/images", upload.array("images", 5), uploadProjectImages)
router.delete("/projects/:projectId/documents/:documentId", deleteProjectDocument)
router.delete("/projects/:projectId/images/:imageId", deleteProjectImage)

// Update media routes
router.post("/updates/:updateId/media", upload.array("media", 5), uploadUpdateMedia)
router.delete("/updates/:updateId/media/:mediaId", deleteUpdateMedia)

// General media routes
router.put("/caption", updateMediaCaption)

module.exports = router
