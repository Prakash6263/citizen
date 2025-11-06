const request = require("supertest")
const mongoose = require("mongoose")
const app = require("../src/server")
const User = require("../src/models/User")

// Test database
const MONGODB_URI = process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/municipality_test"

describe("Authentication Endpoints", () => {
  let server

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(MONGODB_URI)
    server = app.listen(0) // Use random port for testing
  })

  afterAll(async () => {
    // Clean up
    await mongoose.connection.dropDatabase()
    await mongoose.connection.close()
    server.close()
  })

  beforeEach(async () => {
    // Clear users before each test
    await User.deleteMany({})
  })

  describe("POST /api/auth/register", () => {
    const validUserData = {
      fullName: "John Doe",
      email: "john@example.com",
      username: "johndoe",
      password: "SecurePass123",
      confirmPassword: "SecurePass123",
      userType: "citizen",
      agreedToTerms: true,
      agreedToPrivacy: true,
    }

    it("should register a new user successfully", async () => {
      const response = await request(app).post("/api/auth/register").send(validUserData).expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe(validUserData.email)
      expect(response.body.data.user.username).toBe(validUserData.username)
      expect(response.body.data.token).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()
    })

    it("should not register user with existing email", async () => {
      // Create user first
      await User.create(validUserData)

      const response = await request(app).post("/api/auth/register").send(validUserData).expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain("email already exists")
    })

    it("should not register user with invalid email", async () => {
      const invalidData = { ...validUserData, email: "invalid-email" }

      const response = await request(app).post("/api/auth/register").send(invalidData).expect(400)

      expect(response.body.success).toBe(false)
    })

    it("should not register user with weak password", async () => {
      const weakPasswordData = { ...validUserData, password: "123", confirmPassword: "123" }

      const response = await request(app).post("/api/auth/register").send(weakPasswordData).expect(400)

      expect(response.body.success).toBe(false)
    })

    it("should not register user without agreeing to terms", async () => {
      const noTermsData = { ...validUserData, agreedToTerms: false }

      const response = await request(app).post("/api/auth/register").send(noTermsData).expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe("POST /api/auth/login", () => {
    let testUser

    beforeEach(async () => {
      testUser = await User.create({
        fullName: "John Doe",
        email: "john@example.com",
        username: "johndoe",
        password: "SecurePass123",
        userType: "citizen",
        agreedToTerms: true,
        agreedToPrivacy: true,
      })
    })

    it("should login with valid email and password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: "john@example.com",
          password: "SecurePass123",
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe("john@example.com")
      expect(response.body.data.token).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()
    })

    it("should login with valid username and password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: "johndoe",
          password: "SecurePass123",
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.username).toBe("johndoe")
    })

    it("should not login with invalid password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: "john@example.com",
          password: "WrongPassword",
        })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain("Invalid credentials")
    })

    it("should not login with non-existent user", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: "nonexistent@example.com",
          password: "SecurePass123",
        })
        .expect(401)

      expect(response.body.success).toBe(false)
    })

    it("should not login inactive user", async () => {
      testUser.isActive = false
      await testUser.save()

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: "john@example.com",
          password: "SecurePass123",
        })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain("deactivated")
    })
  })

  describe("GET /api/auth/me", () => {
    let testUser
    let authToken

    beforeEach(async () => {
      testUser = await User.create({
        fullName: "John Doe",
        email: "john@example.com",
        username: "johndoe",
        password: "SecurePass123",
        userType: "citizen",
        agreedToTerms: true,
        agreedToPrivacy: true,
      })

      authToken = testUser.getSignedJwtToken()
    })

    it("should get current user with valid token", async () => {
      const response = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${authToken}`).expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe("john@example.com")
    })

    it("should not get user without token", async () => {
      const response = await request(app).get("/api/auth/me").expect(401)

      expect(response.body.success).toBe(false)
    })

    it("should not get user with invalid token", async () => {
      const response = await request(app).get("/api/auth/me").set("Authorization", "Bearer invalid-token").expect(401)

      expect(response.body.success).toBe(false)
    })
  })

  describe("POST /api/auth/forgot-password", () => {
    let testUser

    beforeEach(async () => {
      testUser = await User.create({
        fullName: "John Doe",
        email: "john@example.com",
        username: "johndoe",
        password: "SecurePass123",
        userType: "citizen",
        agreedToTerms: true,
        agreedToPrivacy: true,
      })
    })

    it("should send reset email for valid email", async () => {
      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "john@example.com" })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain("reset link has been sent")
    })

    it("should not reveal if email does not exist", async () => {
      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "nonexistent@example.com" })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain("reset link has been sent")
    })

    it("should not accept invalid email format", async () => {
      const response = await request(app).post("/api/auth/forgot-password").send({ email: "invalid-email" }).expect(400)

      expect(response.body.success).toBe(false)
    })
  })
})
