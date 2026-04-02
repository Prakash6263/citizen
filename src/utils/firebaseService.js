const admin = require("firebase-admin")
const fs = require("fs")
const path = require("path")

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length === 0) {
      let serviceAccount
      
      // Method 1: Get credentials from environment variable (JSON string)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      }
      // Method 2: Get credentials from file path
      else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const credentialsPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        if (fs.existsSync(credentialsPath)) {
          serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf8"))
        } else {
          throw new Error(`Firebase credentials file not found at: ${credentialsPath}`)
        }
      }
      // Method 3: Try default local path (development only)
      else {
        const defaultPath = path.join(__dirname, "../../citixen-app-firebase-adminsdk.json")
        if (fs.existsSync(defaultPath)) {
          serviceAccount = JSON.parse(fs.readFileSync(defaultPath, "utf8"))
        } else {
          throw new Error("Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH")
        }
      }
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      })
      
      console.log("✅ Firebase Admin SDK initialized successfully for project:", serviceAccount.project_id)
    }
    
    return admin
  } catch (error) {
    console.error("❌ Firebase initialization error:", error.message)
    throw error
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
