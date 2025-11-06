const express = require("express")
const { getAllCitizens, getCitizenDetails } = require("../controllers/citizenController")
const { protect } = require("../middleware/auth")

const router = express.Router()

// All routes require authentication
router.use(protect)

// Get all citizens (Government only)
router.get("/", getAllCitizens)

// Get single citizen details (Government only)
router.get("/:id", getCitizenDetails)

module.exports = router
