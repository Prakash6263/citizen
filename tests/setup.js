// Test setup file
const mongoose = require("mongoose")
const jest = require("jest")
const { afterAll } = require("@jest/globals")

// Increase timeout for database operations
jest.setTimeout(30000)

// Mock email service for testing
jest.mock("../src/utils/emailService", () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
  testEmailConfig: jest.fn().mockResolvedValue(true),
}))

// Mock Cloudinary service for testing
jest.mock("../src/utils/cloudinaryService", () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue({
    public_id: "test-public-id",
    secure_url: "https://test-url.com/image.jpg",
  }),
  deleteFromCloudinary: jest.fn().mockResolvedValue({ result: "ok" }),
  testCloudinaryConfig: jest.fn().mockResolvedValue(true),
}))

// Global test cleanup
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close()
  }
})
