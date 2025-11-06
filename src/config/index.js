require("dotenv").config()

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV,
    host: process.env.HOST,
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || "fallback_secret_key",
    expiresIn: process.env.JWT_EXPIRE || "7d",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || "30d",
  },

  // Email Configuration
  email: {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number.parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true",
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || "noreply@municipality.gov",
  },

  // Rate Limiting
  rateLimit: {
    windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    maxRequests: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // CORS Configuration
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },

  // File Upload Configuration
  upload: {
    maxFileSize: Number.parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    allowedDocumentTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    localStoragePath: process.env.UPLOAD_PATH || "uploads",
  },

  // Security Configuration
  security: {
    bcryptRounds: Number.parseInt(process.env.BCRYPT_ROUNDS) || 12,
    passwordResetExpire: Number.parseInt(process.env.PASSWORD_RESET_EXPIRE) || 10 * 60 * 1000, // 10 minutes
    emailVerificationExpire: Number.parseInt(process.env.EMAIL_VERIFICATION_EXPIRE) || 24 * 60 * 60 * 1000, // 24 hours
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || "info",
    file: process.env.LOG_FILE || "logs/app.log",
    maxSize: process.env.LOG_MAX_SIZE || "20m",
    maxFiles: Number.parseInt(process.env.LOG_MAX_FILES) || 5,
  },
}

// Validation
const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET"]
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`)
  if (config.server.env === "production") {
    process.exit(1)
  }
}

module.exports = config
