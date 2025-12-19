const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const morgan = require("morgan")
const compression = require("compression")
const rateLimit = require("express-rate-limit")
const path = require("path")
const fs = require("fs") // Declare the fs variable before using it
require("dotenv").config({ path: path.join(__dirname, "../.env") })

const localStorageService = require("./utils/localStorageService")

// Import routes
const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/user")
const profileRoutes = require("./routes/profile")
const commentRoutes = require("./routes/comments")
const analyticsRoutes = require("./routes/analytics")
const governmentRoutes = require("./routes/government")
const adminRoutes = require("./routes/admin")
const tokenRoutes = require("./routes/tokens")
const dashboardRoutes = require("./routes/dashboard")
const ecosystemRoutes = require("./routes/ecosystem")
const tokenClaimRoutes = require("./routes/tokenClaims")
const superadmin = require("./routes/superadminAuth")
const socialProjectRegistrationRoutes = require("./routes/socialProjectRegistration")
const projectSupportRoutes = require("./routes/projectSupport")
const projectUpdateRoutes = require("./routes/ProjectUpdate")
const citizenRoutes = require("./routes/citizens")
const allocationLimitRoutes = require("./routes/allocationLimits") // Import allocation limits routes
const policyRoutes = require("./routes/policies")
// Import middleware
const errorHandler = require("./middleware/errorHandler")
const notFound = require("./middleware/notFound")

const app = express()

// Security middleware
app.use(helmet())
app.use(compression())

const uploadsPath = path.resolve(process.cwd(), "uploads")

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true })
  console.log(`📁 Created uploads directory: ${uploadsPath}`)
}

console.log(`[v0] Uploads directory configured at: ${uploadsPath}`)

// Serve static files with CORS headers for live domain
app.use("/uploads", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
  res.header("Access-Control-Allow-Headers", "Content-Type")
  res.header("Cache-Control", "public, max-age=31536000, immutable")
  const filePath = path.join(process.cwd(), "uploads", req.path)
  console.log("[v0] Static file request:", { path: req.path, filePath, exists: fs.existsSync(filePath) })
  next()
})

app.use(
  "/uploads",
  express.static(uploadsPath, {
    dotfiles: "deny",
    maxAge: "1y",
    etag: false,
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase()
      const contentTypes = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".mp4": "video/mp4",
      }
      const contentType = contentTypes[ext] || "application/octet-stream"
      res.setHeader("Content-Type", contentType)
    },
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
})
app.use("/api/", limiter)

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://localhost:5000",
  "http://82.29.178.117", // Live domain
  "https://citizenssss.duckdns.org"
]

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(null, true) // Allow for now, can restrict later
      }
    },
    credentials: true,
  }),
)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"))
} else {
  app.use(morgan("combined"))
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Municipality Backend API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
})



// API routes - Core functionality
app.use("/api/auth", authRoutes)
app.use("/api/user", userRoutes)
app.use("/api/profile", profileRoutes)
app.use("/api/comments", commentRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/super", superadmin)

app.use("/api/government", governmentRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/tokens", tokenRoutes)
app.use("/api/citizens", citizenRoutes)
app.use("/api/dashboard", dashboardRoutes)
app.use("/api/ecosystem", ecosystemRoutes)

app.use("/api/projects", projectSupportRoutes)
app.use("/api/social-projects", socialProjectRegistrationRoutes)
app.use("/api/allocation-limits", allocationLimitRoutes) // Add allocation limits routes
app.use("/api", projectUpdateRoutes)
app.use("/api/policies", policyRoutes)
// Error handling middleware (must be last)
app.use(notFound)
app.use(errorHandler)

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI)
    console.log(`MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error("Database connection error:", error.message)
    process.exit(1)
  }
}

// Start server
const PORT = process.env.PORT || 5000

const startServer = async () => {
  await connectDB()

  await localStorageService.initializeStorage()

  app.listen(PORT, () => {
    console.log(`
🚀 Municipality Backend Server is running!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV}
📊 Health Check: http://localhost:${PORT}/health
📚 API Base URL: http://localhost:${PORT}/api
📁 Static Files: http://localhost:${PORT}/uploads

🏛️  Available Modules:
   • Citizen Module: Authentication, Profile, Support
   • Social Project Module: Registration, Approvals, Comments, Analytics  
   • Government Module: Registration, Approvals, Token Management
   • Token Claim Module: Token Claims
    `)
  })
}

startServer()

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`)
  process.exit(1)
})

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`)
  process.exit(1)
})

module.exports = app
