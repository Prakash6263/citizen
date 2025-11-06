const path = require("path")

class MediaValidator {
  static validateFileType(file, allowedTypes) {
    return allowedTypes.includes(file.mimetype)
  }

  static validateFileSize(file, maxSize) {
    return file.size <= maxSize
  }

  static validateImageDimensions(buffer, maxWidth = 4000, maxHeight = 4000) {
    // This would require image processing library like sharp
    // For now, we'll rely on Cloudinary transformations
    return true
  }

  static getFileCategory(mimetype) {
    if (mimetype.startsWith("image/")) return "image"
    if (mimetype.startsWith("video/")) return "video"
    if (mimetype.startsWith("audio/")) return "audio"
    if (mimetype === "application/pdf") return "pdf"
    if (mimetype.includes("word") || mimetype.includes("document")) return "document"
    if (mimetype.includes("spreadsheet") || mimetype.includes("excel")) return "spreadsheet"
    if (mimetype.includes("presentation") || mimetype.includes("powerpoint")) return "presentation"
    return "other"
  }

  static generateSecureFilename(originalName) {
    const ext = path.extname(originalName)
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `${timestamp}_${random}${ext}`
  }

  static sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
  }

  static validateUploadQuota(user, fileSize) {
    // Implement upload quota logic based on user type
    const quotas = {
      Citizen: 50 * 1024 * 1024, // 50MB
      "Social Project": 500 * 1024 * 1024, // 500MB
      "Local Government": 1024 * 1024 * 1024, // 1GB
    }

    const userQuota = quotas[user.userType] || quotas["Citizen"]
    const currentUsage = user.storageUsed || 0

    return currentUsage + fileSize <= userQuota
  }

  static getOptimizationSettings(fileType, category) {
    const settings = {
      image: {
        quality: "auto",
        format: "auto",
        width: 1200,
        height: 800,
        crop: "limit",
      },
      video: {
        quality: "auto",
        width: 1280,
        height: 720,
        crop: "limit",
      },
      document: {
        // No optimization for documents
      },
    }

    return settings[category] || {}
  }

  static async scanForMalware(buffer) {
    // Implement malware scanning logic
    // This could integrate with services like VirusTotal API
    // For now, we'll do basic checks

    // Check for suspicious file signatures
    const suspiciousSignatures = [
      Buffer.from([0x4d, 0x5a]), // PE executable
      Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // ELF executable
    ]

    for (const signature of suspiciousSignatures) {
      if (buffer.indexOf(signature) === 0) {
        return false // Suspicious file detected
      }
    }

    return true // File appears safe
  }

  static generateThumbnail(buffer, options = {}) {
    // This would require image processing library like sharp
    // Return promise that resolves to thumbnail buffer
    return Promise.resolve(buffer)
  }

  static extractMetadata(file) {
    return {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      category: this.getFileCategory(file.mimetype),
      uploadedAt: new Date(),
      checksum: this.generateChecksum(file.buffer),
    }
  }

  static generateChecksum(buffer) {
    const crypto = require("crypto")
    return crypto.createHash("md5").update(buffer).digest("hex")
  }
}

module.exports = MediaValidator
