/**
 * Script to create a superadmin user
 * Run with: node scripts/create-superadmin.js
 */

const mongoose = require("mongoose")
const User = require("./src/models/User")
require("dotenv").config()

async function createSuperadmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("✓ Connected to MongoDB")

    // Check if superadmin already exists
    const existingSuperadmin = await User.findOne({ role: "superadmin" })
    if (existingSuperadmin) {
      console.log("⚠ Superadmin already exists:")
      console.log(`  Email: ${existingSuperadmin.email}`)
      console.log(`  Username: ${existingSuperadmin.username}`)
      console.log("\nIf you need to reset the password, delete this user first and run the script again.")
      await mongoose.connection.close()
      return
    }

    // Superadmin credentials
    const superadminData = {
      fullName: "Super Admin",
      email: "superadmin@municipality.gov",
      username: "superadmin",
      password: "SuperAdmin@2025", // Change this after first login!
      userType: "government",
      role: "superadmin",
      country: "System",
      province: "System",
      city: "System",
      agreedToTerms: true,
      agreedToPrivacy: true,
      isEmailVerified: true,
      isSuperAdminVerified: true,
      isActive: true,
    }

    // Create superadmin
    const superadmin = await User.create(superadminData)

    console.log("\n✓ Superadmin created successfully!")
    console.log("\n=== SUPERADMIN CREDENTIALS ===")
    console.log(`Email:    ${superadmin.email}`)
    console.log(`Username: ${superadmin.username}`)
    console.log(`Password: SuperAdmin@2025`)
    console.log("==============================\n")
    console.log("⚠ IMPORTANT: Change the password after first login!\n")
    console.log("You can now login at your application and approve government registrations.\n")

    await mongoose.connection.close()
    console.log("✓ Database connection closed")
  } catch (error) {
    console.error("✗ Error creating superadmin:", error.message)
    if (error.code === 11000) {
      console.error("\nDuplicate key error - email or username already exists.")
      console.error("Please check the database or use different credentials.")
    }
    await mongoose.connection.close()
    process.exit(1)
  }
}

// Run the script
createSuperadmin()
