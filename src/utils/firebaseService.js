const admin = require("firebase-admin");
const path = require("path");

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

const convertDataToStrings = (data) => {
  const stringData = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      stringData[key] = "";
    } else if (typeof value === "object") {
      stringData[key] = JSON.stringify(value);
    } else {
      stringData[key] = String(value);
    }
  }
  return stringData;
};

// Send notification
const sendNotification = async (fcmToken, title, body, data = {}) => {
  try {
    const adminApp = initializeFirebase(); // IMPORTANT

    const message = {
      notification: {
        title,
        body,
      },
      data: convertDataToStrings({
        ...data,
        timestamp: new Date().toISOString(),
      }),
      token: fcmToken,
    };

    const response = await adminApp.messaging().send(message);

    return {
      success: true,
      messageId: response,
    };
  } catch (error) {
    console.error("[FCM ERROR]:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  initializeFirebase,
  sendNotification,
};