const getBaseUrl = () => {
  // Check for explicit API_BASE_URL environment variable first
  if (process.env.API_BASE_URL) {
    console.log("[v0] Using explicit API_BASE_URL:", process.env.API_BASE_URL)
    return process.env.API_BASE_URL
  }

  // For production/live environment
  if (process.env.NODE_ENV === "production") {
    const url = process.env.LIVE_API_URL
    console.log("[v0] Using LIVE_API_URL:", url)
    return url
  }

  // For development/local environment
  const url = process.env.LOCAL_API_URL
  console.log("[v0] Using LOCAL_API_URL:", url)
  return url
}

const API_BASE_URL = getBaseUrl()

console.log("[v0] ===== API Configuration =====")
console.log("[v0] NODE_ENV:", process.env.NODE_ENV)
console.log("[v0] API_BASE_URL:", API_BASE_URL)
console.log("[v0] LOCAL_API_URL:", process.env.LOCAL_API_URL)
console.log("[v0] LIVE_API_URL:", process.env.LIVE_API_URL)
console.log("[v0] ===============================")

module.exports = {
  getBaseUrl,
  API_BASE_URL,
}
