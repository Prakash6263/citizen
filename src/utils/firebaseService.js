const admin = require("firebase-admin")
const fs = require("fs")
const path = require("path")

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length === 0) {
      let serviceAccount
      let initialized = false

      // Method 1: Environment Variable (Recommended for production)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
          initialized = true
          console.log("✅ Firebase loaded from FIREBASE_SERVICE_ACCOUNT_JSON env variable")
        } catch (e) {
          console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON, trying alternatives...")
        }
      }

      // Method 2: File Path
      if (!initialized && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const credentialsPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        if (fs.existsSync(credentialsPath)) {
          serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf8"))
          initialized = true
          console.log("✅ Firebase loaded from FIREBASE_SERVICE_ACCOUNT_PATH")
        }
      }

      // Method 3: Default local file
      if (!initialized) {
        const defaultPath = path.join(__dirname, "../../citixen-app-firebase-adminsdk.json")
        if (fs.existsSync(defaultPath)) {
          serviceAccount = JSON.parse(fs.readFileSync(defaultPath, "utf8"))
          initialized = true
          console.log("✅ Firebase loaded from project root")
        }
      }

      // If still not initialized, throw informative error
      if (!initialized) {
        console.warn("⚠️ Firebase not configured. Notifications will not work.")
        console.warn("To enable Firebase, set FIREBASE_SERVICE_ACCOUNT_JSON environment variable")
        return null
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      })

      console.log("✅ Firebase Admin SDK initialized for project:", serviceAccount.project_id)
    }

    return admin
  } catch (error) {
    console.warn("⚠️ Firebase initialization warning:", error.message)
    console.warn("Notifications will be unavailable. Set FIREBASE_SERVICE_ACCOUNT_JSON to enable.")
    return null
  }
}

// Send a test notification to a user
const sendTestNotification = async (fcmToken, title = "Test Notification", body = "This is a test notification from your Municipality App") => {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        timestamp: new Date().toISOString(),
        type: "test",
      },
      token: fcmToken,
    }

    const response = await admin.messaging().send(message)
    console.log("[v0] Notification sent successfully:", response)
    
    return {
      success: true,
      messageId: response,
      message: "Notification sent successfully",
    }
  } catch (error) {
    console.error("[v0] Error sending notification:", error.message)
    return {
      success: false,
      error: error.message,
      message: "Failed to send notification",
    }
  }
}

// Send a notification with custom data
const sendNotification = async (fcmToken, title, body, data = {}) => {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      token: fcmToken,
    }

    const response = await admin.messaging().send(message)
    return {
      success: true,
      messageId: response,
    }
  } catch (error) {
    console.error("[v0] Error sending notification:", error.message)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Send a notification to multiple users
const sendMultipleNotifications = async (fcmTokens, title, body, data = {}) => {
  try {
    const messages = fcmTokens.map((token) => ({
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      token,
    }))

    const response = await admin.messaging().sendAll(messages)
    
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    }
  } catch (error) {
    console.error("[v0] Error sending multiple notifications:", error.message)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Update user FCM token
const updateUserFCMToken = async (userId, newFcmToken, User) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { fcmToken: newFcmToken },
      { new: true }
    )
    
    return {
      success: true,
      message: "FCM token updated",
      user,
    }
  } catch (error) {
    console.error("[v0] Error updating FCM token:", error.message)
    return {
      success: false,
      error: error.message,
    }
  }
}

module.exports = {
  initializeFirebase,
  sendTestNotification,
  sendNotification,
  sendMultipleNotifications,
  updateUserFCMToken,
}
