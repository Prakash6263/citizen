const multer = require("multer")
const path = require("path")
const fs = require("fs").promises
const User = require("../models/User")
const Project = require("../models/Project") // Declare Project variable
const ProjectUpdate = require("../models/ProjectUpdate") // Declare ProjectUpdate variable
const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")
const localStorageService = require("../utils/localStorageService")
const { getFullFileUrl, formatMedia, formatDocumentation } = require("../utils/urlHelper")

// Configure multer for file uploads
const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
  const allowedDocTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]
  const allowedVideoTypes = ["video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo"]

  const allAllowedTypes = [...allowedImageTypes, ...allowedDocTypes, ...allowedVideoTypes]

  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Invalid file type. Only images, PDFs, Word documents, and videos are allowed."), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files per request
  },
})

// @desc    Upload project documents
// @route   POST /api/media/projects/:projectId/documents
// @access  Private (Project owner only)
const uploadProjectDocuments = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId)

  if (!project) {
    return errorResponse(res, "Project not found", 404)
  }

  if (project.owner.toString() !== req.user._id.toString()) {
    return errorResponse(res, "Not authorized to upload documents for this project", 403)
  }

  if (!req.files || req.files.length === 0) {
    return errorResponse(res, "No files uploaded", 400)
  }

  const uploadedDocuments = []

  try {
    for (const file of req.files) {
      const result = await localStorageService.uploadFile(file.buffer, {
        folder: `municipality/projects/${project._id}/documents`,
        originalName: file.originalname,
        mimetype: file.mimetype,
        public_id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`,
      })

      const documentData = {
        filename: result.public_id,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        fileUrl: result.secure_url || getFullFileUrl(result.public_id),
      }

      project.documents.push(documentData)
      uploadedDocuments.push(documentData)
    }

    await project.save()

    const formattedDocs = formatDocumentation(uploadedDocuments)
    successResponse(res, "Documents uploaded successfully", formattedDocs, 201)
  } catch (error) {
    console.error("Document upload error:", error)
    errorResponse(res, "Failed to upload documents", 500)
  }
})

// @desc    Upload project images
// @route   POST /api/media/projects/:projectId/images
// @access  Private (Project owner only)
const uploadProjectImages = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId)

  if (!project) {
    return errorResponse(res, "Project not found", 404)
  }

  if (project.owner.toString() !== req.user._id.toString()) {
    return errorResponse(res, "Not authorized to upload images for this project", 403)
  }

  if (!req.files || req.files.length === 0) {
    return errorResponse(res, "No files uploaded", 400)
  }

  const uploadedImages = []

  try {
    for (const file of req.files) {
      if (!file.mimetype.startsWith("image/")) {
        continue
      }

      const result = await localStorageService.uploadFile(file.buffer, {
        folder: `municipality/projects/${project._id}/images`,
        originalName: file.originalname,
        mimetype: file.mimetype,
        public_id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`,
      })

      const imageData = {
        filename: result.public_id,
        originalName: file.originalname,
        url: result.secure_url || getFullFileUrl(result.public_id),
        caption: req.body.captions ? req.body.captions[uploadedImages.length] : "",
      }

      project.images.push(imageData)
      uploadedImages.push(imageData)
    }

    await project.save()

    const formattedMedia = formatMedia(uploadedImages)
    successResponse(res, "Images uploaded successfully", formattedMedia, 201)
  } catch (error) {
    console.error("Image upload error:", error)
    errorResponse(res, "Failed to upload images", 500)
  }
})

// @desc    Upload update media
// @route   POST /api/media/updates/:updateId/media
// @access  Private (Update author only)
const uploadUpdateMedia = asyncHandler(async (req, res) => {
  const update = await ProjectUpdate.findById(req.params.updateId)

  if (!update) {
    return errorResponse(res, "Update not found", 404)
  }

  if (update.author.toString() !== req.user._id.toString()) {
    return errorResponse(res, "Not authorized to upload media for this update", 403)
  }

  if (!req.files || req.files.length === 0) {
    return errorResponse(res, "No files uploaded", 400)
  }

  const uploadedMedia = []

  try {
    for (const file of req.files) {
      let mediaType
      const uploadOptions = {
        folder: `municipality/updates/${update._id}/media`,
        originalName: file.originalname,
        mimetype: file.mimetype,
        public_id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`,
      }

      if (file.mimetype.startsWith("image/")) {
        mediaType = "image"
      } else if (file.mimetype.startsWith("video/")) {
        mediaType = "video"
      } else {
        mediaType = "document"
      }

      const result = await localStorageService.uploadFile(file.buffer, uploadOptions)

      const mediaData = {
        type: mediaType,
        filename: result.public_id,
        originalName: file.originalname,
        url: result.secure_url || getFullFileUrl(result.public_id),
        mimetype: file.mimetype,
        size: file.size,
        caption: req.body.captions ? req.body.captions[uploadedMedia.length] : "",
      }

      update.media.push(mediaData)
      uploadedMedia.push(mediaData)
    }

    await update.save()

    const formattedMedia = formatMedia(uploadedMedia)
    successResponse(res, "Media uploaded successfully", formattedMedia, 201)
  } catch (error) {
    console.error("Media upload error:", error)
    errorResponse(res, "Failed to upload media", 500)
  }
})

// @desc    Delete project document
// @route   DELETE /api/media/projects/:projectId/documents/:documentId
// @access  Private (Project owner only)
const deleteProjectDocument = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId)

  if (!project) {
    return errorResponse(res, "Project not found", 404)
  }

  if (project.owner.toString() !== req.user._id.toString()) {
    return errorResponse(res, "Not authorized to delete documents from this project", 403)
  }

  const document = project.documents.id(req.params.documentId)

  if (!document) {
    return errorResponse(res, "Document not found", 404)
  }

  try {
    await localStorageService.deleteFile(document.filename, `municipality/projects/${project._id}/documents`)

    project.documents.pull(req.params.documentId)
    await project.save()

    successResponse(res, "Document deleted successfully")
  } catch (error) {
    console.error("Document deletion error:", error)
    errorResponse(res, "Failed to delete document", 500)
  }
})

// @desc    Delete project image
// @route   DELETE /api/media/projects/:projectId/images/:imageId
// @access  Private (Project owner only)
const deleteProjectImage = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId)

  if (!project) {
    return errorResponse(res, "Project not found", 404)
  }

  if (project.owner.toString() !== req.user._id.toString()) {
    return errorResponse(res, "Not authorized to delete images from this project", 403)
  }

  const image = project.images.id(req.params.imageId)

  if (!image) {
    return errorResponse(res, "Image not found", 404)
  }

  try {
    await localStorageService.deleteFile(image.filename, `municipality/projects/${project._id}/images`)

    project.images.pull(req.params.imageId)
    await project.save()

    successResponse(res, "Image deleted successfully")
  } catch (error) {
    console.error("Image deletion error:", error)
    errorResponse(res, "Failed to delete image", 500)
  }
})

// @desc    Delete update media
// @route   DELETE /api/media/updates/:updateId/media/:mediaId
// @access  Private (Update author only)
const deleteUpdateMedia = asyncHandler(async (req, res) => {
  const update = await ProjectUpdate.findById(req.params.updateId)

  if (!update) {
    return errorResponse(res, "Update not found", 404)
  }

  if (update.author.toString() !== req.user._id.toString()) {
    return errorResponse(res, "Not authorized to delete media from this update", 403)
  }

  const media = update.media.id(req.params.mediaId)

  if (!media) {
    return errorResponse(res, "Media not found", 404)
  }

  try {
    await localStorageService.deleteFile(media.filename, `municipality/updates/${update._id}/media`)

    update.media.pull(req.params.mediaId)
    await update.save()

    successResponse(res, "Media deleted successfully")
  } catch (error) {
    console.error("Media deletion error:", error)
    errorResponse(res, "Failed to delete media", 500)
  }
})

// @desc    Get media info
// @route   GET /api/media/info/:type/:id
// @access  Public
const getMediaInfo = asyncHandler(async (req, res) => {
  const { type, id } = req.params

  let mediaInfo = {}

  try {
    switch (type) {
      case "project":
        const project = await Project.findById(id).select("documents images title")
        if (!project) {
          return errorResponse(res, "Project not found", 404)
        }
        mediaInfo = {
          documents: formatDocumentation(project.documents),
          images: formatMedia(project.images),
          title: project.title,
        }
        break

      case "update":
        const update = await ProjectUpdate.findById(id).select("media title")
        if (!update) {
          return errorResponse(res, "Update not found", 404)
        }
        mediaInfo = {
          media: formatMedia(update.media),
          title: update.title,
        }
        break

      default:
        return errorResponse(res, "Invalid media type", 400)
    }

    successResponse(res, "Media info retrieved successfully", mediaInfo)
  } catch (error) {
    console.error("Get media info error:", error)
    errorResponse(res, "Failed to retrieve media info", 500)
  }
})

// @desc    Update media caption
// @route   PUT /api/media/caption
// @access  Private
const updateMediaCaption = asyncHandler(async (req, res) => {
  const { type, parentId, mediaId, caption } = req.body

  if (!type || !parentId || !mediaId) {
    return errorResponse(res, "Type, parentId, and mediaId are required", 400)
  }

  try {
    let updated = false

    switch (type) {
      case "project-image":
        const project = await Project.findById(parentId)
        if (!project) {
          return errorResponse(res, "Project not found", 404)
        }

        if (project.owner.toString() !== req.user._id.toString()) {
          return errorResponse(res, "Not authorized", 403)
        }

        const image = project.images.id(mediaId)
        if (image) {
          image.caption = caption || ""
          await project.save()
          updated = true
        }
        break

      case "update-media":
        const update = await ProjectUpdate.findById(parentId)
        if (!update) {
          return errorResponse(res, "Update not found", 404)
        }

        if (update.author.toString() !== req.user._id.toString()) {
          return errorResponse(res, "Not authorized", 403)
        }

        const media = update.media.id(mediaId)
        if (media) {
          media.caption = caption || ""
          await update.save()
          updated = true
        }
        break

      default:
        return errorResponse(res, "Invalid media type", 400)
    }

    if (!updated) {
      return errorResponse(res, "Media not found", 404)
    }

    successResponse(res, "Caption updated successfully")
  } catch (error) {
    console.error("Update caption error:", error)
    errorResponse(res, "Failed to update caption", 500)
  }
})

module.exports = {
  upload,
  uploadProjectDocuments,
  uploadProjectImages,
  uploadUpdateMedia,
  deleteProjectDocument,
  deleteProjectImage,
  deleteUpdateMedia,
  getMediaInfo,
  updateMediaCaption,
}
