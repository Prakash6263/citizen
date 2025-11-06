const { API_BASE_URL } = require("../config/urlConfig")

const getFullFileUrl = (filePath) => {
  if (!filePath || filePath === "") {
    console.log("[v0] getFullFileUrl received empty path")
    return null
  }

  // If it's already a full URL, return as-is
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    console.log("[v0] getFullFileUrl - already full URL:", filePath)
    return filePath
  }

  // Normalize path separators
  let relativePath = filePath.replace(/\\/g, "/")

  if (relativePath.startsWith("/uploads")) {
    const fullUrl = `${API_BASE_URL}${relativePath}`
    console.log("[v0] File URL constructed from /uploads path:", { filePath, fullUrl })
    return fullUrl
  }

  // If path doesn't start with /uploads, add it
  if (!relativePath.startsWith("uploads")) {
    relativePath = `/uploads/${relativePath}`
  } else if (!relativePath.startsWith("/uploads")) {
    relativePath = `/${relativePath}`
  }

  const fullUrl = `${API_BASE_URL}${relativePath}`
  console.log("[v0] File URL constructed:", { filePath, relativePath, fullUrl })

  return fullUrl
}

const formatDocumentation = (docs) => {
  if (!docs || !Array.isArray(docs)) {
    return []
  }

  return docs
    .map((doc) => {
      if (!doc) return null

      // Try to find any available file path field
      let filePath = null

      if (doc.fileUrl) {
        // Check if fileUrl is already a full URL
        if (
          doc.fileUrl.startsWith("http://") ||
          doc.fileUrl.startsWith("https://") ||
          doc.fileUrl.startsWith("/uploads")
        ) {
          filePath = doc.fileUrl
        } else {
          filePath = doc.fileUrl
        }
      } else if (doc.path) {
        filePath = doc.path
      } else if (doc.url) {
        filePath = doc.url
      } else if (doc.filename) {
        filePath = doc.filename
      } else if (doc.fileName) {
        filePath = `/uploads/${doc.fileName}`
      }

      // Only construct full URL if it's not already complete
      const fullUrl = filePath
        ? filePath.startsWith("http://") || filePath.startsWith("https://") || filePath.startsWith("/uploads")
          ? filePath
          : getFullFileUrl(filePath)
        : null

      // Fallback: if no filePath, return empty array item
      if (!fullUrl && !filePath) {
        return null
      }

      return {
        fileName: doc.fileName || doc.originalName || doc.filename || "Unknown",
        fileType: doc.fileType || doc.mimetype || "",
        uploadedAt: doc.uploadedAt || new Date(),
        _id: doc._id,
        fileUrl: fullUrl || filePath,
      }
    })
    .filter(Boolean)
}

const formatMedia = (mediaArray) => {
  if (!mediaArray || !Array.isArray(mediaArray)) {
    return []
  }

  return mediaArray
    .map((media) => {
      if (!media) return null

      const filePath = media.url || media.path || media.fileUrl || media.filename

      const fullUrl =
        filePath &&
        (filePath.startsWith("http://") || filePath.startsWith("https://") || filePath.startsWith("/uploads"))
          ? filePath
          : getFullFileUrl(filePath) || filePath

      return {
        ...(media.toObject ? media.toObject() : media),
        url: fullUrl,
        fileUrl: fullUrl,
      }
    })
    .filter(Boolean)
}

module.exports = {
  getFullFileUrl,
  formatDocumentation,
  formatMedia,
}
