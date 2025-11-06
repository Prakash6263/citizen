/**
 * Password Utility Functions
 * Provides password strength checking and security utilities
 */

// Common weak passwords to check against
const commonPasswords = [
  "password",
  "123456",
  "123456789",
  "qwerty",
  "abc123",
  "password123",
  "admin",
  "letmein",
  "welcome",
  "monkey",
  "1234567890",
  "password1",
  "qwerty123",
  "dragon",
  "master",
  "hello",
  "login",
  "passw0rd",
]

// Common patterns to avoid
const commonPatterns = [
  /^(.)\1+$/, // All same character
  /^(012|123|234|345|456|567|678|789|890)+/, // Sequential numbers
  /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+/i, // Sequential letters
  /^(qwe|wer|ert|rty|tyu|yui|uio|iop|asd|sdf|dfg|fgh|ghj|hjk|jkl|zxc|xcv|cvb|vbn|bnm)+/i, // Keyboard patterns
]

/**
 * Check password strength
 */
const checkPasswordStrength = (password) => {
  if (!password) {
    return {
      score: 0,
      isStrong: false,
      feedback: "Password is required",
      suggestions: ["Please enter a password"],
    }
  }

  let score = 0
  const feedback = []
  const suggestions = []

  // Length check
  if (password.length >= 8) {
    score += 1
  } else {
    suggestions.push("Use at least 8 characters")
  }

  if (password.length >= 12) {
    score += 1
  } else if (password.length >= 8) {
    suggestions.push("Consider using 12 or more characters for better security")
  }

  // Character variety checks
  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    suggestions.push("Add lowercase letters")
  }

  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    suggestions.push("Add uppercase letters")
  }

  if (/[0-9]/.test(password)) {
    score += 1
  } else {
    suggestions.push("Add numbers")
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1
  } else {
    suggestions.push("Add special characters (!@#$%^&*)")
  }

  // Check against common passwords
  if (commonPasswords.includes(password.toLowerCase())) {
    score = Math.max(0, score - 2)
    suggestions.push("Avoid common passwords")
  }

  // Check against common patterns
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score = Math.max(0, score - 1)
      suggestions.push("Avoid predictable patterns")
      break
    }
  }

  // Check for repeated characters
  const repeatedChars = password.match(/(.)\1{2,}/g)
  if (repeatedChars) {
    score = Math.max(0, score - 1)
    suggestions.push("Avoid repeating characters")
  }

  // Determine strength level
  let strength = "Very Weak"
  let isStrong = false

  if (score >= 5) {
    strength = "Very Strong"
    isStrong = true
    feedback.push("Excellent password strength!")
  } else if (score >= 4) {
    strength = "Strong"
    isStrong = true
    feedback.push("Good password strength")
  } else if (score >= 3) {
    strength = "Moderate"
    feedback.push("Password strength is moderate")
  } else if (score >= 2) {
    strength = "Weak"
    feedback.push("Password is weak")
  } else {
    feedback.push("Password is very weak")
  }

  return {
    score,
    strength,
    isStrong,
    feedback: feedback.join(". "),
    suggestions: suggestions.length > 0 ? suggestions : ["Your password meets the requirements"],
  }
}

/**
 * Generate password suggestions based on user input
 */
const generatePasswordSuggestions = (basePassword) => {
  const suggestions = []

  if (!basePassword) {
    return ["MySecure2024!", "StrongPass#123", "Municipality@2024", "Citizen$Power99"]
  }

  // Create variations of the base password
  const base = basePassword.replace(/[^a-zA-Z0-9]/g, "")

  suggestions.push(`${base}2024!`)
  suggestions.push(`${base}#Secure`)
  suggestions.push(`My${base}@123`)
  suggestions.push(`${base}$Power`)

  return suggestions.slice(0, 4)
}

/**
 * Check if password contains personal information
 */
const containsPersonalInfo = (password, userInfo = {}) => {
  const { fullName, email, username } = userInfo
  const lowerPassword = password.toLowerCase()

  const personalData = [fullName?.toLowerCase(), email?.split("@")[0]?.toLowerCase(), username?.toLowerCase()].filter(
    Boolean,
  )

  for (const data of personalData) {
    if (data && data.length > 2 && lowerPassword.includes(data)) {
      return true
    }
  }

  return false
}

/**
 * Estimate time to crack password
 */
const estimateCrackTime = (password) => {
  const charset = {
    lowercase: /[a-z]/.test(password) ? 26 : 0,
    uppercase: /[A-Z]/.test(password) ? 26 : 0,
    numbers: /[0-9]/.test(password) ? 10 : 0,
    symbols: /[^a-zA-Z0-9]/.test(password) ? 32 : 0,
  }

  const charsetSize = Object.values(charset).reduce((sum, size) => sum + size, 0)
  const combinations = Math.pow(charsetSize, password.length)

  // Assume 1 billion guesses per second
  const secondsToCrack = combinations / (2 * 1000000000)

  if (secondsToCrack < 60) {
    return "Less than a minute"
  } else if (secondsToCrack < 3600) {
    return `${Math.ceil(secondsToCrack / 60)} minutes`
  } else if (secondsToCrack < 86400) {
    return `${Math.ceil(secondsToCrack / 3600)} hours`
  } else if (secondsToCrack < 31536000) {
    return `${Math.ceil(secondsToCrack / 86400)} days`
  } else {
    return `${Math.ceil(secondsToCrack / 31536000)} years`
  }
}

module.exports = {
  checkPasswordStrength,
  generatePasswordSuggestions,
  containsPersonalInfo,
  estimateCrackTime,
}
