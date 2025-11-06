/**
 * Async Handler Wrapper
 * Eliminates the need for try-catch blocks in async route handlers
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = asyncHandler
