# Firebase Setup & Testing Guide

## Quick Start (5 minutes)

### Step 1: Copy Your Firebase Service Account File

You've already provided the Firebase credentials file. Place it in the project root:

```bash
# The file should be located at:
/vercel/share/v0-project/citixen-app-firebase-adminsdk-fbsvc-1a4deb920b-1xEeTAxnoufBLd6EzQ87spzx4tzzjg.json

# Or set the path in .env:
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/your/firebase-adminsdk.json
```

### Step 2: Start the Server

```bash
npm run dev
# Server runs on http://localhost:5000
```

### Step 3: Run the Test Sequence

Open Postman (or use cURL) and follow these steps in order:

#### Test 1: Get a Test User ID
```bash
GET /api/notifications/check-fcm-token?email=citizen@example.com
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "userId": "YOUR_USER_ID",
    "email": "citizen@example.com",
    "hasFcmToken": false
  }
}
```

#### Test 2: Login and Register FCM Token
```bash
POST /api/auth/citizen-login
Body: {
  "identifier": "citizen@example.com",
  "password": "password123",
  "fcmToken": "cXE0uYqI0Uw:APA91bHg..." // Replace with your actual FCM token
}
```

**Expected Response:** Token received + User object

#### Test 3: Verify FCM Token was Stored
```bash
GET /api/notifications/check-fcm-token?email=citizen@example.com
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "hasFcmToken": true,
    "fcmTokenPrefix": "cXE0uYqI0Uw:APA91bHg..."
  }
}
```

#### Test 4: Send Test Notification
```bash
POST /api/notifications/test
Body: {
  "email": "citizen@example.com",
  "title": "Test Notification",
  "body": "If you see this, Firebase is working!"
}
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Test notification sent successfully",
  "data": {
    "messageId": "projects/your-project/messages/message-id"
  }
}
```

**If you see this response, check your mobile device for the notification!**

---

## Getting Your FCM Token for Testing

### Option 1: From Web Browser (Using Firebase Config)
```javascript
// In your browser console:
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  projectId: "citixen-app",
  // ... other config
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' }).then((currentToken) => {
  if (currentToken) {
    console.log('FCM Token:', currentToken);
  }
});
```

### Option 2: From React Native App
```javascript
import { initializeApp } from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';

const fcmToken = await messaging().getToken();
console.log('FCM Token:', fcmToken);
```

### Option 3: From Flutter App
```dart
final fcmToken = await FirebaseMessaging.instance.getToken();
print('FCM Token: $fcmToken');
```

---

## What Each API Endpoint Does

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/citizen-login` | POST | Login with FCM token (new) |
| `/api/auth/social-login` | POST | Social project login with FCM token (new) |
| `/api/auth/government-login` | POST | Government login with FCM token (new) |
| `/api/notifications/test` | POST | Send test notification to email |
| `/api/notifications/test-by-user-id` | POST | Send test notification to user ID |
| `/api/notifications/send` | POST | Send custom notification |
| `/api/notifications/check-fcm-token` | GET | Check if user has FCM token |
| `/api/notifications/update-fcm-token` | POST | Update user's FCM token |

---

## Troubleshooting

### Error: "Firebase initialization error"
**Solution:** Check if Firebase service account file exists at the specified path
```bash
ls -la /vercel/share/v0-project/citixen-app-firebase-adminsdk-fbsvc-1a4deb920b-1xEeTAxnoufBLd6EzQ87spzx4tzzjg.json
```

### Error: "User has no FCM token registered"
**Solution:** User must login with FCM token. Use the login endpoint and include `fcmToken` in the body.

### Error: "Failed to send notification"
**Possible causes:**
- FCM token is expired
- Firebase project settings incorrect
- Invalid service account credentials

**Solution:**
1. Verify Firebase credentials file is valid JSON
2. Check server logs for detailed error message
3. Try updating the FCM token with a fresh one from your app

### Notification not arriving on device
**Check:**
1. Is the app running on your device?
2. Are notifications enabled in app settings?
3. Is the device connected to the internet?
4. Did the API return success status?

**Debug:**
- Check server logs for `[v0]` debug messages
- Verify FCM token is the one registered in the app
- Test on Android and iOS separately

---

## Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (citixen-app)
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key** if needed
5. This gives you the JSON file to use in `FIREBASE_SERVICE_ACCOUNT_PATH`

---

## Integration Checklist

- [x] Firebase Admin SDK installed (`firebase-admin`)
- [x] Firebase service account file placed or path configured
- [x] Notification routes created at `/api/notifications/*`
- [x] User model updated with `fcmToken` field
- [x] Login endpoints updated to accept `fcmToken`
- [x] Server initialized Firebase on startup
- [ ] Test authentication endpoints with FCM token
- [ ] Test notification endpoints
- [ ] Verify notifications arrive on mobile device
- [ ] Update frontend to send FCM token during login

---

## Next Steps for Frontend

### 1. Generate FCM Token on App Startup
```javascript
// Example React
useEffect(() => {
  async function getFCMToken() {
    try {
      const token = await getMessagingToken();
      // Store in state for login
      setFcmToken(token);
    } catch (error) {
      console.error('Failed to get FCM token:', error);
    }
  }
  getFCMToken();
}, []);
```

### 2. Send FCM Token During Login
```javascript
// Example login function
const handleLogin = async (email, password) => {
  const response = await fetch('/api/auth/citizen-login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: email,
      password: password,
      fcmToken: fcmToken  // Include FCM token
    })
  });
  // ... handle response
};
```

### 3. Listen for Messages
```javascript
// Example React
import { onMessage } from "firebase/messaging";
import { messaging } from './firebase-config';

onMessage(messaging, (payload) => {
  console.log('Message received:', payload);
  // Show in-app notification
});
```

---

## Support & Documentation

- **Firebase Docs:** https://firebase.google.com/docs/cloud-messaging
- **Admin SDK:** https://firebase.google.com/docs/database/admin/start
- **Notification API Docs:** See `NOTIFICATION_API.md`

---

## Server Logs to Watch For

```
✅ Firebase Admin SDK initialized successfully
[v0] Sending test notification to FCM token: cXE0uYqI0Uw:APA91bHg...
[v0] Notification sent successfully: projects/your-project/messages/message-id
```

If you see these logs, Firebase is working!

---

## Important: Security Notes

1. **Never commit Firebase credentials** - Add to `.gitignore`
2. **Use environment variables** - Set `FIREBASE_SERVICE_ACCOUNT_PATH` in production
3. **FCM tokens are sensitive** - Treat like passwords
4. **Use HTTPS** in production to protect tokens in transit
5. **Validate all inputs** - All notification endpoints validate email and token format

---

## Quick Testing Commands

```bash
# Test 1: Check user FCM status
curl "http://localhost:5000/api/notifications/check-fcm-token?email=citizen@example.com"

# Test 2: Send test notification
curl -X POST http://localhost:5000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "email": "citizen@example.com",
    "title": "Test",
    "body": "Working!"
  }'

# Test 3: Login with FCM token
curl -X POST http://localhost:5000/api/auth/citizen-login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "citizen@example.com",
    "password": "password123",
    "fcmToken": "YOUR_FCM_TOKEN"
  }'
```

---

All done! You now have a fully functional Firebase notification system. Test it and let me know if you need any adjustments! 🚀
