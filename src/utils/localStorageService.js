const fs = require("fs").promises
const path = require("path")
const crypto = require("crypto")

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads")

/**
 * Ensure directory exists
 */
const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.access(dirPath)
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true })
  }
}

/**
 * Generate unique filename
 */
const generateUniqueFilename = (originalName, prefix = "") => {
  const ext = path.extname(originalName)
  const timestamp = Date.now()
  const randomString = crypto.randomBytes(8).toString("hex")
  return `${prefix}${timestamp}_${randomString}${ext}`
}

/**
 * Upload file to local storage
 */
const uploadFile = async (buffer, options = {}) => {
  try {
    const { folder = "general", public_id, originalName = "file", mimetype = "application/octet-stream" } = options

    // Create folder path
    const folderPath = path.join(UPLOAD_DIR, folder)
    await ensureDirectoryExists(folderPath)

    // Generate filename
    const filename = public_id || generateUniqueFilename(originalName)
    const filePath = path.join(folderPath, filename)

    // Write file to disk
    await fs.writeFile(filePath, buffer)

    const relativePath = `${folder}/${filename}`.replace(/\\/g, "/")

    // Return result similar to Cloudinary format
    return {
      public_id: filename,
      secure_url: `/uploads/${relativePath}`,
      url: `/uploads/${relativePath}`,
      bytes: buffer.length,
      format: path.extname(originalName).slice(1),
      resource_type: mimetype.startsWith("image/") ? "image" : mimetype.startsWith("video/") ? "video" : "raw",
    }
  } catch (error) {
    console.error("Local storage upload error:", error)
    throw new Error("Failed to upload file to local storage")
  }
}

/**
 * Delete file from local storage
 */
const deleteFile = async (filename, folder = "") => {
  try {
    // Extract folder from filename if it contains path
    let filePath
    if (filename.includes("/")) {
      filePath = path.join(UPLOAD_DIR, filename)
    } else {
      filePath = path.join(UPLOAD_DIR, folder, filename)
    }

    // Normalize and ensure path stays within UPLOAD_DIR
    const normalizedPath = path.normalize(filePath)
    if (!normalizedPath.startsWith(UPLOAD_DIR)) {
      throw new Error("Invalid file path")
    }

    await fs.unlink(normalizedPath)
    return { result: "ok" }
  } catch (error) {
    // Don't throw or log for missing files
    if (error.code === "ENOENT") {
      return { result: "not found" }
    }
    console.error("Local storage delete error:", error)
    throw new Error("Failed to delete file from local storage")
  }
}

/**
 * Get file info
 */
const getFileInfo = async (filename, folder = "") => {
  try {
    const filePath = path.join(UPLOAD_DIR, folder, filename)
    const stats = await fs.stat(filePath)

    return {
      exists: true,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
    }
  } catch (error) {
    return { exists: false }
  }
}

/**
 * Initialize upload directories
 */
const initializeStorage = async () => {
  try {
    await ensureDirectoryExists(UPLOAD_DIR)
    await ensureDirectoryExists(path.join(UPLOAD_DIR, "municipality"))
    await ensureDirectoryExists(path.join(UPLOAD_DIR, "municipality", "avatars"))
    await ensureDirectoryExists(path.join(UPLOAD_DIR, "municipality", "projects"))
    await ensureDirectoryExists(path.join(UPLOAD_DIR, "municipality", "updates"))
    console.log("Local storage directories initialized")
  } catch (error) {
    console.error("Failed to initialize storage directories:", error)
  }
}

module.exports = {
  uploadFile,
  deleteFile,
  getFileInfo,
  initializeStorage,
  UPLOAD_DIR,
}
