const admin = require("firebase-admin")
const path = require("path")

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    // Get the service account credentials path from environment or use default
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
      path.join(__dirname, "../../citixen-app-firebase-adminsdk.json")
    
    // Check if Firebase is already initialized
    if (admin.apps.length === 0) {
      const serviceAccount = require(serviceAccountPath)
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      })
      
      console.log("✅ Firebase Admin SDK initialized successfully")
    }
    
    return admin
  } catch (error) {
    console.error("❌ Firebase initialization error:", error.message)
    console.error("Make sure FIREBASE_SERVICE_ACCOUNT_PATH is set in .env or the service account file exists")
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
