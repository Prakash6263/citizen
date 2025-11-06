const express = require("express")
const router = express.Router()
const {
  createComment,
  getComments,
  updateComment,
  deleteComment,
  flagComment,
  getCommentReplies,
} = require("../controllers/commentController")

const { protect } = require("../middleware/auth")

// Public routes
router.get("/", getComments)
router.get("/:id/replies", getCommentReplies)

// Protected routes
router.use(protect)

router.post("/", createComment)
router.put("/:id", updateComment)
router.delete("/:id", deleteComment)
router.post("/:id/flag", flagComment)

module.exports = router
