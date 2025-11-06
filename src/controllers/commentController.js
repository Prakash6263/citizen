const Comment = require("../models/Comment")
const asyncHandler = require("../utils/asyncHandler")
const { successResponse, errorResponse } = require("../utils/responseHelper")
const { validationResult } = require("express-validator")

// @desc    Create comment
// @route   POST /api/comments
// @access  Private
const createComment = asyncHandler(async (req, res) => {
  const { content, project, projectUpdate, parentComment } = req.body

  if (!content || content.trim().length === 0) {
    return errorResponse(res, "Comment content is required", 400)
  }

  if (!parentComment) {
    return errorResponse(res, "Parent comment is required", 400)
  }

  // Verify parent comment exists if provided
  if (parentComment) {
    const parent = await Comment.findById(parentComment)
    if (!parent) {
      return errorResponse(res, "Parent comment not found", 404)
    }
  }

  const commentData = {
    content: content.trim(),
    author: req.user._id,
    parentComment,
  }

  const comment = await Comment.create(commentData)
  await comment.populate("author", "fullName avatar")

  successResponse(res, "Comment created successfully", comment, 201)
})

// @desc    Get comments for project or update
// @route   GET /api/comments
// @access  Public
const getComments = asyncHandler(async (req, res) => {
  const { parentComment, page = 1, limit = 20 } = req.query

  if (!parentComment) {
    return errorResponse(res, "Parent comment parameter is required", 400)
  }

  const comments = await Comment.getWithReplies(parentComment, Number.parseInt(limit))

  successResponse(res, "Comments retrieved successfully", comments)
})

// @desc    Update comment
// @route   PUT /api/comments/:id
// @access  Private (Author only)
const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body

  if (!content || content.trim().length === 0) {
    return errorResponse(res, "Comment content is required", 400)
  }

  const comment = await Comment.findById(req.params.id)

  if (!comment) {
    return errorResponse(res, "Comment not found", 404)
  }

  // Check if user is the author
  if (comment.author.toString() !== req.user._id.toString()) {
    return errorResponse(res, "Not authorized to update this comment", 403)
  }

  comment.content = content.trim()
  comment.isEdited = true
  comment.editedAt = new Date()

  await comment.save()
  await comment.populate("author", "fullName avatar")

  successResponse(res, "Comment updated successfully", comment)
})

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private (Author only)
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id)

  if (!comment) {
    return errorResponse(res, "Comment not found", 404)
  }

  // Check if user is the author
  if (comment.author.toString() !== req.user._id.toString()) {
    return errorResponse(res, "Not authorized to delete this comment", 403)
  }

  // Soft delete - mark as deleted instead of removing
  comment.status = "deleted"
  comment.content = "[Comment deleted]"
  await comment.save()

  successResponse(res, "Comment deleted successfully")
})

// @desc    Flag comment
// @route   POST /api/comments/:id/flag
// @access  Private
const flagComment = asyncHandler(async (req, res) => {
  const { reason } = req.body

  if (!reason) {
    return errorResponse(res, "Flag reason is required", 400)
  }

  const validReasons = ["spam", "inappropriate", "harassment", "misinformation", "other"]
  if (!validReasons.includes(reason)) {
    return errorResponse(res, "Invalid flag reason", 400)
  }

  const comment = await Comment.findById(req.params.id)

  if (!comment) {
    return errorResponse(res, "Comment not found", 404)
  }

  // Check if user already flagged this comment
  const existingFlag = comment.flags.find((flag) => flag.user.toString() === req.user._id.toString())

  if (existingFlag) {
    return errorResponse(res, "You have already flagged this comment", 400)
  }

  comment.flags.push({
    user: req.user._id,
    reason,
  })

  await comment.save()

  successResponse(res, "Comment flagged successfully")
})

// @desc    Get comment replies
// @route   GET /api/comments/:id/replies
// @access  Public
const getCommentReplies = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query

  const skip = (page - 1) * limit

  const [replies, total] = await Promise.all([
    Comment.find({
      parentComment: req.params.id,
      status: "active",
    })
      .populate("author", "fullName avatar")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(Number.parseInt(limit)),
    Comment.countDocuments({
      parentComment: req.params.id,
      status: "active",
    }),
  ])

  const pagination = {
    currentPage: Number.parseInt(page),
    totalPages: Math.ceil(total / limit),
    totalReplies: total,
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1,
  }

  successResponse(res, "Comment replies retrieved successfully", {
    replies,
    pagination,
  })
})

module.exports = {
  createComment,
  getComments,
  updateComment,
  deleteComment,
  flagComment,
  getCommentReplies,
}
