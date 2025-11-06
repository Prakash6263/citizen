const ProjectUpdate = require("../models/ProjectUpdate")
const SocialProjectRegistration = require("../models/SocialProjectRegistration")
const User = require("../models/User")
const mongoose = require("mongoose")
const { getFullFileUrl, formatMedia } = require("../utils/urlHelper")

// Create a new project update
exports.createProjectUpdate = async (req, res) => {
  try {
    const { projectId } = req.params
    const { title, description } = req.body
    const userId = req.user.id

    const registration = await SocialProjectRegistration.findOne({
      "projects._id": projectId,
      user: userId,
    })

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: "Project not found or you don't have permission to update it",
      })
    }

    const project = registration.projects.id(projectId)
    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      })
    }

    let media = null
    if (req.file) {
      media = {
        fileName: req.file.originalname,
        fileUrl: getFullFileUrl(req.file.path || req.file.url),
        fileType: req.file.mimetype,
        uploadedAt: new Date(),
      }
    }

    const projectUpdate = new ProjectUpdate({
      registrationId: registration._id,
      projectId: projectId,
      createdBy: userId,
      title,
      description,
      media,
    })

    await projectUpdate.save()
    await projectUpdate.populate("createdBy", "fullName avatar")

    res.status(201).json({
      success: true,
      data: projectUpdate,
      message: "Project update created successfully",
    })
  } catch (error) {
    console.error("[v0] Error creating project update:", error)
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create project update",
    })
  }
}

// Get all updates for a specific project
exports.getProjectUpdatesByProjectId = async (req, res) => {
  try {
    const { projectId } = req.params
    const { page = 1, limit = 10 } = req.query

    const skip = (page - 1) * limit

    const updates = await ProjectUpdate.find({ projectId: projectId })
      .populate("createdBy", "fullName avatar userType")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const updatesWithCounts = updates.map((update) => {
      const updateObj = update.toObject()
      updateObj.likesCount = update.likes.length
      updateObj.commentsCount = update.comments.length
      if (updateObj.media) {
        updateObj.media = formatMedia([updateObj.media])
      }
      return updateObj
    })

    const total = await ProjectUpdate.countDocuments({ projectId: projectId })

    res.status(200).json({
      success: true,
      data: updatesWithCounts,
      pagination: {
        total,
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        pages: Math.ceil(total / limit),
      },
      message: "Project updates retrieved successfully",
    })
  } catch (error) {
    console.error("[v0] Error fetching project updates:", error)
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch project updates",
    })
  }
}

// Get a specific update by ID
exports.getProjectUpdateById = async (req, res) => {
  try {
    const { updateId } = req.params

    // Only populate createdBy which actually exists in the schema
    const update = await ProjectUpdate.findById(updateId).populate("createdBy", "fullName avatar userType")

    if (!update) {
      return res.status(404).json({
        success: false,
        error: "Update not found",
      })
    }

    const updateObj = update.toObject()
    updateObj.likesCount = update.likes.length
    updateObj.commentsCount = update.comments.length
    if (updateObj.media) {
      updateObj.media = formatMedia([updateObj.media])
    }

    res.status(200).json({
      success: true,
      data: updateObj,
      message: "Project update retrieved successfully",
    })
  } catch (error) {
    console.error("[v0] Error fetching project update:", error)
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch project update",
    })
  }
}

// Update a project update
exports.updateProjectUpdate = async (req, res) => {
  try {
    const { updateId } = req.params
    const { title, description } = req.body
    const userId = req.user.id

    const update = await ProjectUpdate.findById(updateId)
    if (!update) {
      return res.status(404).json({
        success: false,
        error: "Update not found",
      })
    }

    if (update.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: "Only update creator can edit this update",
      })
    }

    if (title) update.title = title
    if (description) update.description = description

    if (req.file) {
      update.media = {
        fileName: req.file.originalname,
        fileUrl: getFullFileUrl(req.file.path || req.file.url),
        fileType: req.file.mimetype,
        uploadedAt: new Date(),
      }
    }

    await update.save()
    await update.populate("createdBy", "fullName avatar")

    const updateObj = update.toObject()
    if (updateObj.media) {
      updateObj.media = formatMedia([updateObj.media])
    }

    res.status(200).json({
      success: true,
      data: updateObj,
      message: "Project update updated successfully",
    })
  } catch (error) {
    console.error("[v0] Error updating project update:", error)
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update project update",
    })
  }
}

// Delete a project update
exports.deleteProjectUpdate = async (req, res) => {
  try {
    const { updateId } = req.params
    const userId = req.user.id

    const update = await ProjectUpdate.findById(updateId)
    if (!update) {
      return res.status(404).json({
        success: false,
        error: "Update not found",
      })
    }

    if (update.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: "Only update creator can delete this update",
      })
    }

    await ProjectUpdate.findByIdAndDelete(updateId)

    res.status(200).json({
      success: true,
      message: "Project update deleted successfully",
    })
  } catch (error) {
    console.error("[v0] Error deleting project update:", error)
    res.status(500).json({
      success: false,
      error: error.message || "Failed to delete project update",
    })
  }
}

exports.likeProjectUpdate = async (req, res) => {
  try {
    const { updateId } = req.params
    const userId = req.user.id

    const update = await ProjectUpdate.findById(updateId)
    if (!update) {
      return res.status(404).json({
        success: false,
        error: "Update not found",
      })
    }

    const alreadyLiked = update.likes.some((like) => like.userId.toString() === userId)
    if (alreadyLiked) {
      return res.status(400).json({
        success: false,
        error: "You have already liked this update",
      })
    }

    update.likes.push({
      userId: userId,
      likedAt: new Date(),
    })

    await update.save()
    await update.populate("likes.userId", "fullName avatar userType")
    await update.populate("createdBy", "fullName avatar userType")

    const updateObj = update.toObject()
    updateObj.likesCount = update.likes.length
    updateObj.commentsCount = update.comments.length

    res.status(200).json({
      success: true,
      data: updateObj,
      message: "Update liked successfully",
    })
  } catch (error) {
    console.error("[v0] Error liking project update:", error)
    res.status(500).json({
      success: false,
      error: error.message || "Failed to like project update",
    })
  }
}

exports.unlikeProjectUpdate = async (req, res) => {
  try {
    const { updateId } = req.params
    const userId = req.user.id

    const update = await ProjectUpdate.findById(updateId)
    if (!update) {
      return res.status(404).json({
        success: false,
        error: "Update not found",
      })
    }

    update.likes = update.likes.filter((like) => like.userId.toString() !== userId)

    await update.save()
    await update.populate("likes.userId", "fullName avatar userType")
    await update.populate("createdBy", "fullName avatar userType")

    const updateObj = update.toObject()
    updateObj.likesCount = update.likes.length
    updateObj.commentsCount = update.comments.length

    res.status(200).json({
      success: true,
      data: updateObj,
      message: "Like removed successfully",
    })
  } catch (error) {
    console.error("[v0] Error unliking project update:", error)
    res.status(500).json({
      success: false,
      error: error.message || "Failed to unlike project update",
    })
  }
}

exports.addCommentToProjectUpdate = async (req, res) => {
  try {
    const { updateId } = req.params
    const { text } = req.body
    const userId = req.user.id

    if (!text || text.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Comment text is required",
      })
    }

    const update = await ProjectUpdate.findById(updateId)
    if (!update) {
      return res.status(404).json({
        success: false,
        error: "Update not found",
      })
    }

    const comment = {
      _id: new mongoose.Types.ObjectId(),
      userId: userId,
      text: text.trim(),
      createdAt: new Date(),
    }

    update.comments.push(comment)
    await update.save()

    await update.populate("comments.userId", "fullName avatar userType")
    await update.populate("createdBy", "fullName avatar userType")

    const updateObj = update.toObject()
    updateObj.likesCount = update.likes.length
    updateObj.commentsCount = update.comments.length

    res.status(201).json({
      success: true,
      data: updateObj,
      message: "Comment added successfully",
    })
  } catch (error) {
    console.error("[v0] Error adding comment:", error)
    res.status(500).json({
      success: false,
      error: error.message || "Failed to add comment",
    })
  }
}

exports.removeCommentFromProjectUpdate = async (req, res) => {
  try {
    const { updateId, commentId } = req.params
    const userId = req.user.id

    const update = await ProjectUpdate.findById(updateId)
    if (!update) {
      return res.status(404).json({
        success: false,
        error: "Update not found",
      })
    }

    const comment = update.comments.id(commentId)
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: "Comment not found",
      })
    }

    if (comment.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: "Only comment creator can delete this comment",
      })
    }

    update.comments.id(commentId).deleteOne()
    await update.save()

    await update.populate("comments.userId", "fullName avatar userType")
    await update.populate("createdBy", "fullName avatar userType")

    const updateObj = update.toObject()
    updateObj.likesCount = update.likes.length
    updateObj.commentsCount = update.comments.length

    res.status(200).json({
      success: true,
      data: updateObj,
      message: "Comment removed successfully",
    })
  } catch (error) {
    console.error("[v0] Error removing comment:", error)
    res.status(500).json({
      success: false,
      error: error.message || "Failed to remove comment",
    })
  }
}

exports.getProjectUpdateComments = async (req, res) => {
  try {
    const { updateId } = req.params
    const { page = 1, limit = 10 } = req.query

    const skip = (page - 1) * limit

    const update = await ProjectUpdate.findById(updateId)
      .populate({
        path: "comments.userId",
        select: "fullName avatar userType",
      })
      .select("comments")

    if (!update) {
      return res.status(404).json({
        success: false,
        error: "Update not found",
      })
    }

    const comments = update.comments.slice(skip, skip + Number.parseInt(limit))
    const total = update.comments.length

    res.status(200).json({
      success: true,
      data: comments,
      pagination: {
        total,
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        pages: Math.ceil(total / limit),
      },
      message: "Comments retrieved successfully",
    })
  } catch (error) {
    console.error("[v0] Error fetching comments:", error)
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch comments",
    })
  }
}
