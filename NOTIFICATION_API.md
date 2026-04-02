# Firebase Cloud Messaging (FCM) Notification API Documentation

## Setup Requirements

### 1. Install Firebase Admin SDK
The Firebase Admin SDK has been added to `package.json`. Install it with:
```bash
npm install
```

### 2. Configure Firebase Service Account
You have two options:

**Option A: Using Environment Variable (Recommended)**
```env
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/your/citixen-app-firebase-adminsdk.json
```

**Option B: Default Location**
Place your Firebase service account JSON file at:
```
/project-root/citixen-app-firebase-adminsdk.json
```

Your Firebase service account file looks like:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-key-id",
  "private_key": "your-private-key",
  "client_email": "firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "your-cert-url"
}
```

### 3. Update User Login
Clients should include FCM token during login:

```bash
POST /api/auth/citizen-login
{
  "identifier": "user@example.com",
  "password": "password123",
  "fcmToken": "your_fcm_token_from_client"  # Optional but recommended
}
```

The same applies to:
- `POST /api/auth/social-login`
- `POST /api/auth/government-login`

---

## Notification API Endpoints

### 1. Send Test Notification by Email
**Endpoint:** `POST /api/notifications/test`

**Description:** Send a test notification to verify Firebase is working

**Request Body:**
```json
{
  "email": "user@example.com",
  "title": "Test Notification",
  "body": "This is a test notification from your Municipality App"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Test notification sent successfully",
  "data": {
    "userId": "user_id_here",
    "email": "user@example.com",
    "messageId": "projects/project-id/messages/message-id"
  }
}
```

**Error Response (400):**
```json
{
  "status": "error",
  "message": "User has no FCM token registered. Please login with FCM token enabled."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "email": "citizen@example.com",
    "title": "Welcome!",
    "body": "Your notification test was successful"
  }'
```

---

### 2. Send Test Notification by User ID
**Endpoint:** `POST /api/notifications/test-by-user-id`

**Description:** Send a test notification using user ID instead of email

**Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "title": "Test Notification",
  "body": "This is a test notification"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Test notification sent successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "fcmTokenPresent": true,
    "messageId": "projects/project-id/messages/message-id"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/notifications/test-by-user-id \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011"
  }'
```

---

### 3. Send Custom Notification
**Endpoint:** `POST /api/notifications/send`

**Description:** Send a custom notification with additional data payload

**Request Body:**
```json
{
  "email": "user@example.com",
  "title": "Fund Approved",
  "body": "Your fund request has been approved",
  "data": {
    "fundRequestId": "fund-123",
    "amount": "5000",
    "status": "approved"
  }
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Notification sent successfully",
  "data": {
    "userId": "user_id_here",
    "email": "user@example.com",
    "messageId": "projects/project-id/messages/message-id"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "email": "citizen@example.com",
    "title": "Fund Request Approved",
    "body": "Your fund request of 5000 has been approved",
    "data": {
      "requestId": "req-123",
      "amount": "5000"
    }
  }'
```

---

### 4. Check if User Has FCM Token
**Endpoint:** `GET /api/notifications/check-fcm-token`

**Description:** Check if a user has registered an FCM token

**Query Parameters:**
```
email: user@example.com
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "hasFcmToken": true,
    "fcmTokenPrefix": "cXE0uYqI0Uw:APA91bHg...",
    "userType": "citizen"
  }
}
```

**cURL Example:**
```bash
curl "http://localhost:5000/api/notifications/check-fcm-token?email=citizen@example.com"
```

---

### 5. Update FCM Token
**Endpoint:** `POST /api/notifications/update-fcm-token`

**Description:** Update user's FCM token (useful when client generates a new token)

**Request Body:**
```json
{
  "email": "user@example.com",
  "fcmToken": "new_fcm_token_here"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "FCM token updated successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "fcmTokenUpdated": true
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/notifications/update-fcm-token \
  -H "Content-Type: application/json" \
  -d '{
    "email": "citizen@example.com",
    "fcmToken": "cXE0uYqI0Uw:APA91bHg..."
  }'
```

---

## Testing Workflow

### Step 1: Login with FCM Token
```bash
curl -X POST http://localhost:5000/api/auth/citizen-login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "citizen@example.com",
    "password": "password123",
    "fcmToken": "YOUR_FCM_TOKEN_HERE"
  }'
```

### Step 2: Verify FCM Token is Stored
```bash
curl "http://localhost:5000/api/notifications/check-fcm-token?email=citizen@example.com"
```

Expected response: `"hasFcmToken": true`

### Step 3: Send Test Notification
```bash
curl -X POST http://localhost:5000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "email": "citizen@example.com",
    "title": "Test Message",
    "body": "If you see this, Firebase is working!"
  }'
```

### Step 4: Check Your Device
Open your mobile app and check for the notification!

---

## Common Issues & Solutions

### Issue 1: "Firebase initialization error"
**Solution:**
- Ensure the service account JSON file path is correct
- Check that `FIREBASE_SERVICE_ACCOUNT_PATH` environment variable is set
- Verify the file contains valid JSON

### Issue 2: "User has no FCM token registered"
**Solution:**
- User must login with an FCM token provided
- Client must generate FCM token and send during login
- Use `/api/notifications/update-fcm-token` to add token for existing users

### Issue 3: "Failed to send notification"
**Solution:**
- Verify FCM token is valid and not expired
- Check Firebase project settings
- Ensure Firebase Admin SDK has correct permissions
- View server logs for detailed error message

### Issue 4: Notification not received on device
**Solution:**
- Ensure app is properly configured with Firebase SDK on client
- Check notification permissions on device
- Verify Firebase project is properly linked to app
- Check that notification title and body are not empty

---

## Integration in Controllers

### Example: Send notification when fund is approved

```javascript
// In your fundRequest approval controller
const { sendNotification } = require("../utils/firebaseService")

// After approving fund request
const user = await User.findById(fundRequest.userId)

if (user && user.fcmToken) {
  const result = await sendNotification(
    user.fcmToken,
    "Fund Approved",
    `Your fund request of ${fundRequest.amount} has been approved`,
    {
      fundRequestId: fundRequest._id.toString(),
      amount: fundRequest.amount,
      status: "approved"
    }
  )
  
  if (!result.success) {
    console.error("Failed to send notification:", result.error)
  }
}
```

---

## Database Schema

User model now includes:
```javascript
fcmToken: {
  type: String,
  default: null,
}
```

This field stores the Firebase Cloud Messaging token for push notifications.

---

## Security Notes

1. FCM tokens are optional - login works without them
2. FCM tokens are never exposed in API responses (only prefixes for debugging)
3. Each user can have only one active FCM token at a time
4. Tokens are automatically updated on login
5. Use HTTPS in production to protect tokens in transit

---

## Support

For issues with Firebase setup, refer to:
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/database/admin/start)
- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Console](https://console.firebase.google.com)
