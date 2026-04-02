const admin = require("firebase-admin")
const path = require("path")

let firebaseApp;

const initializeFirebase = () => {
  if (!firebaseApp) {
    const serviceAccount = require(path.join(
      __dirname,
      "../../citixen-app-firebase-adminsdk.json"
    ));

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase initialized");
  }

  return admin;
};

module.exports = { initializeFirebase };

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
