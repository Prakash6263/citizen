# Firebase Notifications - Quick Reference

## Setup Checklist (5 mins)

- [ ] Place Firebase service account JSON in project root OR set env var
- [ ] Run `npm install` (firebase-admin already added to package.json)
- [ ] Run `npm run dev` to start server
- [ ] Check server logs for "✅ Firebase Admin SDK initialized successfully"
- [ ] Test with cURL commands below

---

## Quick Test Commands

### Test 1: Login with FCM Token
```bash
curl -X POST http://localhost:5000/api/auth/citizen-login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "citizen@example.com",
    "password": "password123",
    "fcmToken": "YOUR_FCM_TOKEN_HERE"
  }'
```

### Test 2: Check if FCM Token was Stored
```bash
curl "http://localhost:5000/api/notifications/check-fcm-token?email=citizen@example.com"
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

### Test 3: Send Test Notification
```bash
curl -X POST http://localhost:5000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "email": "citizen@example.com",
    "title": "Test Notification",
    "body": "If you see this, Firebase is working!"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Test notification sent successfully",
  "data": {
    "messageId": "projects/citixen-app/messages/abc123..."
  }
}
```

**✓ Check your device for the notification!**

---

## All Endpoints at a Glance

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/api/auth/citizen-login` | POST | email, password, fcmToken(opt) | JWT token |
| `/api/auth/social-login` | POST | email, password, fcmToken(opt) | JWT token |
| `/api/auth/government-login` | POST | email, password, fcmToken(opt) | JWT token |
| `/api/notifications/test` | POST | email, title(opt), body(opt) | success/error |
| `/api/notifications/test-by-user-id` | POST | userId, title(opt), body(opt) | success/error |
| `/api/notifications/send` | POST | email, title, body, data(opt) | success/error |
| `/api/notifications/check-fcm-token` | GET | email (query) | hasFcmToken (boolean) |
| `/api/notifications/update-fcm-token` | POST | email, fcmToken | success/error |

---

## File Changes Made

### Created Files
```
src/utils/firebaseService.js              ← Firebase Admin SDK utilities
src/routes/notifications.js               ← Notification endpoints
NOTIFICATION_API.md                       ← Full API documentation
FIREBASE_SETUP_GUIDE.md                   ← Detailed setup guide
FIREBASE_IMPLEMENTATION_SUMMARY.md        ← What was implemented
ARCHITECTURE.md                           ← System diagrams
QUICK_REFERENCE.md                        ← This file
postman/notifications-collection.json     ← Postman test collection
```

### Modified Files
```
src/models/User.js                        ← Added fcmToken field
src/validators/authValidators.js          ← Added fcmToken validation
src/controllers/authController.js         ← Store fcmToken on login
src/server.js                             ← Added notification routes + Firebase init
package.json                              ← Added firebase-admin dependency
```

---

## Implementation Examples

### Example 1: Sending Notification on Fund Approval
```javascript
// In your fund approval controller
const { sendNotification } = require("../utils/firebaseService");

const approveFund = async (req, res) => {
  try {
    const fund = await FundRequest.findByIdAndUpdate(req.params.id, {
      status: "approved"
    });
    
    // Send notification to user
    const user = await User.findById(fund.userId);
    
    if (user && user.fcmToken) {
      const result = await sendNotification(
        user.fcmToken,
        "Fund Request Approved!",
        `Your fund request for $${fund.amount} has been approved.`,
        {
          fundRequestId: fund._id.toString(),
          amount: fund.amount,
          status: "approved"
        }
      );
      
      if (result.success) {
        console.log("Notification sent:", result.messageId);
      }
    }
    
    res.json({ status: "success", data: fund });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
};
```

### Example 2: Sending to Multiple Users
```javascript
const { sendMultipleNotifications } = require("../utils/firebaseService");

const notifyAllCitizens = async (title, body) => {
  try {
    // Get all citizens with FCM tokens
    const citizens = await User.find({
      userType: "citizen",
      fcmToken: { $exists: true, $ne: null }
    }).select("fcmToken");
    
    const fcmTokens = citizens.map(c => c.fcmToken);
    
    const result = await sendMultipleNotifications(fcmTokens, title, body);
    
    console.log(`Sent to ${result.successCount} users`);
    if (result.failureCount > 0) {
      console.warn(`Failed for ${result.failureCount} users`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
};
```

### Example 3: Conditional Notification Based on User Type
```javascript
const notifyIfHasFcmToken = async (userId, title, body, data) => {
  const user = await User.findById(userId);
  
  if (!user || !user.fcmToken) {
    console.log("User has no FCM token, skipping notification");
    return { success: false, reason: "no_fcm_token" };
  }
  
  const { sendNotification } = require("../utils/firebaseService");
  
  return await sendNotification(user.fcmToken, title, body, data);
};
```

---

## Troubleshooting Quick Answers

**Q: "Firebase initialization error"**
A: Check if Firebase service account file exists. Place it in project root or set `FIREBASE_SERVICE_ACCOUNT_PATH` env var.

**Q: "User has no FCM token registered"**
A: User must login with an FCM token. Use login endpoint and include `fcmToken` in request body.

**Q: "Failed to send notification"**
A: Check if FCM token is valid. View server logs for detailed error. Verify Firebase project settings.

**Q: Notification not received on device**
A: Ensure app is running with Firebase SDK configured. Check app notification permissions. Verify FCM token matches device.

**Q: How to get FCM token for testing?**
A: From web: `getToken(messaging)` in Firebase SDK. From React Native: `messaging().getToken()`. From Flutter: `FirebaseMessaging.instance.getToken()`.

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/utils/firebaseService.js` | Core Firebase functionality |
| `src/routes/notifications.js` | All notification endpoints |
| `src/controllers/authController.js` | Login logic (stores fcmToken) |
| `src/models/User.js` | User schema with fcmToken |
| `NOTIFICATION_API.md` | API documentation |
| `ARCHITECTURE.md` | System diagrams |
| `postman/notifications-collection.json` | Ready-to-import Postman tests |

---

## Environment Configuration

### Option 1: Env Variable (Recommended)
```bash
# In .env file
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/firebase-adminsdk.json
```

### Option 2: Default Location
Place your JSON file at:
```
/vercel/share/v0-project/citixen-app-firebase-adminsdk-fbsvc-1a4deb920b-1xEeTAxnoufBLd6EzQ87spzx4tzzjg.json
```

---

## Testing Order

1. **Verify Firebase is initialized** → Check server logs
2. **Login with FCM token** → POST /api/auth/citizen-login
3. **Check token was stored** → GET /api/notifications/check-fcm-token
4. **Send test notification** → POST /api/notifications/test
5. **Check mobile device** → Look for notification
6. **Send custom notification** → POST /api/notifications/send

---

## Security Reminders

✓ Keep Firebase credentials out of version control  
✓ Use environment variables for configuration  
✓ FCM tokens are treated as sensitive data  
✓ Validate all inputs on endpoints  
✓ Use HTTPS in production  
✓ Add authentication to notification endpoints as needed  

---

## Next Steps

1. Place Firebase credentials
2. Run server: `npm run dev`
3. Test with curl commands above
4. Import Postman collection for easier testing
5. Integrate into your business logic
6. Update frontend to send FCM token during login

---

## Support Resources

- **Full API Docs:** `NOTIFICATION_API.md`
- **Setup Guide:** `FIREBASE_SETUP_GUIDE.md`
- **Architecture:** `ARCHITECTURE.md`
- **Implementation Details:** `FIREBASE_IMPLEMENTATION_SUMMARY.md`
- **Postman Collection:** `postman/notifications-collection.json`

---

## One-Liner Test

```bash
# Replace YOUR_EMAIL, YOUR_PASSWORD, and YOUR_FCM_TOKEN
# Login and send notification in one script:
curl -X POST http://localhost:5000/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","title":"Test","body":"Working!"}'
```

---

**Status:** ✅ Ready to Use
**Last Updated:** April 2, 2026
**Firebase Admin SDK:** v12.0.0
