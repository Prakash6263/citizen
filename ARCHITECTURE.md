# Firebase Notification System Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Mobile/Web)                      │
│                                                                 │
│  1. Initialize Firebase SDK on App Startup                      │
│  2. Generate FCM Token from Firebase                            │
│  3. User provides email & password for login                    │
│  4. Include FCM Token in login request (OPTIONAL)               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    POST /api/auth/{type}-login
                    {
                      identifier: "email@example.com",
                      password: "pass123",
                      fcmToken: "cXE0uYqI0Uw:APA91bHg..."
                    }
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER (Node.js/Express)                   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Auth Controller (authController.js)                        │ │
│  │                                                             │ │
│  │  1. Validate email & password                             │ │
│  │  2. Check credentials against User database               │ │
│  │  3. If authentication succeeds:                           │ │
│  │     - Update lastLogin timestamp                          │ │
│  │     - Store fcmToken if provided ✓ NEW                    │ │
│  │     - Generate JWT token                                  │ │
│  │  4. Return auth response                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                         │                                        │
│                         ▼                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Database Update (User Model)                              │ │
│  │                                                             │ │
│  │  user.fcmToken = "cXE0uYqI0Uw:APA91bHg..."               │ │
│  │  user.lastLogin = new Date()                              │ │
│  │  user.save()                                              │ │
│  │                                                             │ │
│  │  User Document:                                            │ │
│  │  {                                                         │ │
│  │    _id: "507f1f77bcf86cd799439011",                       │ │
│  │    email: "citizen@example.com",                          │ │
│  │    userType: "citizen",                                   │ │
│  │    fcmToken: "cXE0uYqI0Uw:APA91bHg...",  ✓ NEW           │ │
│  │    lastLogin: "2026-04-02T12:00:00Z",                     │ │
│  │    ...                                                     │ │
│  │  }                                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                         │                                        │
│                         ▼                                        │
│              Return Login Response to Client                     │
│              (with auth token)                                   │
└─────────────────────────────────────────────────────────────────┘
                         │
                    Success ✓
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         Later: Send Notification to This User                   │
│                                                                 │
│  Example Trigger: Fund Request Approved                         │
│                                                                 │
│  Admin Panel:                                                   │
│    → Approves fund request                                      │
│    → Triggers notification                                      │
│         │                                                       │
│         ▼                                                       │
│  POST /api/notifications/send                                   │
│  {                                                              │
│    email: "citizen@example.com",                                │
│    title: "Fund Approved",                                      │
│    body: "Your fund request of 5000 has been approved",         │
│    data: { fundRequestId: "req-123", amount: "5000" }           │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                         │
                    Notification Route
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Notification Service Layer                         │
│           (src/utils/firebaseService.js)                        │
│                                                                 │
│  1. Find user by email in database                              │
│  2. Retrieve stored fcmToken                                    │
│  3. Prepare message:                                            │
│     {                                                           │
│       notification: {                                           │
│         title: "Fund Approved",                                 │
│         body: "Your fund request..."                            │
│       },                                                        │
│       data: {                                                   │
│         fundRequestId: "req-123",                               │
│         amount: "5000",                                         │
│         timestamp: "2026-04-02T12:00:00Z"                       │
│       },                                                        │
│       token: "cXE0uYqI0Uw:APA91bHg..."                          │
│     }                                                           │
│  4. Call Firebase Admin SDK: messaging().send(message)          │
│  5. Return response                                             │
└─────────────────────────────────────────────────────────────────┘
                         │
                    admin.messaging().send()
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FIREBASE CLOUD MESSAGING                    │
│                         (FCM)                                   │
│                                                                 │
│  • Validates FCM token                                          │
│  • Routes message through Firebase infrastructure               │
│  • Handles delivery to device                                   │
│  • Manages retry logic                                          │
└─────────────────────────────────────────────────────────────────┘
                         │
                    Device Push Message
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              USER'S MOBILE DEVICE                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Firebase Messaging Service                              │  │
│  │ (Runs in background)                                    │  │
│  │                                                         │  │
│  │ if app is BACKGROUND/CLOSED:                            │  │
│  │   → Display system notification                         │  │
│  │   → Show title & body                                   │  │
│  │   → User taps notification → App opens                  │  │
│  │                                                         │  │
│  │ if app is FOREGROUND:                                   │  │
│  │   → App receives onMessage() event                      │  │
│  │   → App can show in-app notification                    │  │
│  │   → Or display system notification                      │  │
│  │                                                         │  │
│  │ Message received:                                       │  │
│  │ {                                                       │  │
│  │   notification: {                                       │  │
│  │     title: "Fund Approved",                             │  │
│  │     body: "Your fund request of 5000..."                │  │
│  │   },                                                    │  │
│  │   data: {                                               │  │
│  │     fundRequestId: "req-123",                           │  │
│  │     amount: "5000"                                      │  │
│  │   }                                                     │  │
│  │ }                                                       │  │
│  └─────────────────────────────────────────────────────────┘  │
│            ▼                                    ▼               │
│    Notification                         App-Specific           │
│    Displayed                            Handler (optional)     │
│    to User                              Can navigate,          │
│                                         update UI, etc.        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Interactions

### User Model Updates
```
Before:                          After (NEW):
┌──────────────────┐            ┌──────────────────┐
│   User Schema    │            │   User Schema    │
│                  │            │                  │
│ - email          │            │ - email          │
│ - password       │            │ - password       │
│ - userType       │            │ - userType       │
│ - createdAt      │     ──→    │ - createdAt      │
│ - lastLogin      │            │ - lastLogin      │
│ - loginCount     │            │ - loginCount     │
│ - ...            │            │ - fcmToken ✓ NEW │
│                  │            │ - ...            │
└──────────────────┘            └──────────────────┘
```

### Auth Controller Flow
```
┌─────────────────────────────────────────┐
│   POST /api/auth/citizen-login          │
├─────────────────────────────────────────┤
│ Extract: identifier, password, fcmToken │
│                                          │
│ ▼ (Existing Logic)                       │
│ 1. Validate input                        │
│ 2. Find user by email                    │
│ 3. Verify password                       │
│ 4. Check user status/approval            │
│                                          │
│ ▼ (NEW: FCM Token Handling)              │
│ 5. IF fcmToken provided:                 │
│    user.fcmToken = fcmToken              │
│                                          │
│ 6. Update login tracking:                │
│    user.lastLogin = now                  │
│    user.loginCount++                     │
│    user.lastLoginIP = ip                 │
│                                          │
│ 7. Save user to database                 │
│    user.save()                           │
│                                          │
│ ▼ (Existing Logic)                       │
│ 8. Generate JWT token                    │
│ 9. Return auth response                  │
└─────────────────────────────────────────┘
```

### Notification Sending Flow
```
┌────────────────────────────────┐
│  POST /api/notifications/test   │
├────────────────────────────────┤
│  Validate email address         │
│           ▼                     │
│  Query User collection          │
│  Match email: email             │
│           ▼                     │
│  Check: user.fcmToken exists?   │
│  ├─ NO → Error 400              │
│  └─ YES ▼                       │
│         Call firebaseService    │
│         sendTestNotification()  │
│              ▼                  │
│  ┌─────────────────────────────┐│
│  │ Firebase Admin SDK          ││
│  │ messaging().send(message)   ││
│  │         ▼                   ││
│  │ Firebase Cloud Messaging    ││
│  │         ▼                   ││
│  │ Device/App receives message ││
│  └─────────────────────────────┘│
│           ▼                     │
│  Return success response        │
│  { status: 200, messageId }     │
└────────────────────────────────┘
```

---

## Data Flow Example: Complete Scenario

### Scenario: Citizen Logs In, Receives Notification

**Step 1: Login**
```
Client                            Server
  │                                  │
  ├─ POST /api/auth/citizen-login    │
  │  {                               │
  │    identifier: "test@email.com" │
  │    password: "pass123"          │
  │    fcmToken: "cXE0uYqI0..." ◄────┼─ (NEW: Optional field)
  │  }                              │
  │                                  │
  │                             authController()
  │                                  │
  │                             1. Validate credentials
  │                             2. Find & verify user
  │                             3. Store fcmToken in DB ◄─ NEW!
  │                             4. Generate JWT
  │                                  │
  │◄─ 200 OK + JWT token ────────────┤
│
│ (User can now use the app)
│
│ (Later: Admin approves fund request)
│
├─ ??? (Notification triggered elsewhere in code) ──►│
│                                                      │
│                              findUserByEmail()
│                              Get: fcmToken from DB
│                              Call firebaseService
│                                  │
│                            Firebase Admin SDK
│                            Send to device
│                                  │
│◄─ Push notification ────────────────────────────────┤
│
│ Device shows notification!
│ User taps → App opens → Shows fund details
```

---

## Database Operations

### Insert/Update User with FCM Token
```javascript
// During login
db.users.updateOne(
  { _id: userId },
  {
    $set: {
      fcmToken: "cXE0uYqI0Uw:APA91bHg...",  // NEW
      lastLogin: new Date(),
      loginCount: loginCount + 1,
      lastLoginIP: "192.168.1.1"
    }
  }
)

Result:
{
  _id: ObjectId("507f..."),
  email: "citizen@example.com",
  password: "$2b$10$..." (hashed),
  userType: "citizen",
  fcmToken: "cXE0uYqI0Uw:APA91bHg...",  ✓ STORED
  lastLogin: ISODate("2026-04-02T12:00:00Z"),
  loginCount: 5,
  lastLoginIP: "192.168.1.1",
  createdAt: ISODate("2026-01-15T10:00:00Z"),
  ...
}
```

### Query User for Notification
```javascript
// Finding user to send notification
db.users.findOne(
  { email: "citizen@example.com" },
  { fcmToken: 1, _id: 1, email: 1 }
)

Result:
{
  _id: ObjectId("507f..."),
  email: "citizen@example.com",
  fcmToken: "cXE0uYqI0Uw:APA91bHg..."  ◄─ Used for notification
}
```

---

## API Endpoint Interaction Map

```
┌──────────────────────────────────────────────────────────┐
│           Login Endpoints (UPDATED)                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  POST /api/auth/citizen-login                            │
│  POST /api/auth/social-login        ──────┐             │
│  POST /api/auth/government-login         │              │
│                                           │              │
│  Now accept optional: fcmToken           │              │
│  Store in: User.fcmToken                 │              │
└────────────────────────────┬──────────────┘              │
                             │                            │
        ┌────────────────────┴─────────────────┐           │
        │                                      │           │
        ▼                                      ▼           │
┌──────────────────────────┐    ┌──────────────────────────┐
│  Notification Endpoints  │    │ Token Management         │
│  (NEW API)               │    │ Endpoints (NEW API)      │
├──────────────────────────┤    ├──────────────────────────┤
│                          │    │                          │
│ POST /test               │    │ GET /check-fcm-token    │
│ POST /test-by-user-id    │    │ POST /update-fcm-token  │
│ POST /send               │    │                          │
│                          │    │                          │
│ All need: fcmToken       │    │ All need: fcmToken      │
│ from User database       │    │ or email/userId to get  │
│                          │    │                          │
│ Send via Firebase Admin  │    │ Manage tokens           │
│ SDK to device            │    │                          │
└──────────────────────────┘    └──────────────────────────┘
```

---

## Error Flow Diagram

```
POST /api/notifications/test
{
  email: "test@example.com",
  title: "Test",
  body: "Testing"
}
       │
       ▼
   Validate input
       │
  ├─ Invalid email? ──► 400 Bad Request
  │
  ▼
  Find user by email
  │
  ├─ User not found? ──► 404 Not Found
  │
  ▼
  Check: user.fcmToken exists?
  │
  ├─ No token? ──► 400 Bad Request
  │              "User has no FCM token registered"
  │
  ▼
  Call Firebase Admin SDK
  │
  ├─ Invalid token? ──► 500 Error
  │                     "Failed to send notification"
  │
  ├─ Network error? ──► 500 Error
  │                     "Internal server error"
  │
  ▼
  200 Success
  {
    status: "success",
    messageId: "projects/.../messages/..."
  }
```

---

## State Transitions

### User State Over Time
```
User Created          User Login without FCM      User Login with FCM
─────────────        ────────────────────────     ────────────────────
│                    │                            │
├─ email             ├─ email                     ├─ email
├─ password          ├─ password                  ├─ password
├─ userType          ├─ userType                  ├─ userType
├─ fcmToken: null    ├─ fcmToken: null            ├─ fcmToken: "cXE0..." ✓
├─ lastLogin: null   ├─ lastLogin: "2026-04-02"   ├─ lastLogin: "2026-04-02"
├─ loginCount: 0     ├─ loginCount: 1             ├─ loginCount: 1
│                    │                            │
└─ Cannot receive    └─ Cannot receive            └─ CAN receive
   notifications        notifications                 notifications! ✓
```

---

## Summary

The Firebase notification system integrates seamlessly with existing authentication by:

1. **Making FCM optional** during login
2. **Storing tokens** in the User database
3. **Retrieving tokens** when sending notifications
4. **Using Firebase Admin SDK** to deliver via FCM
5. **Handling errors gracefully** with helpful messages

The architecture is:
- **Non-blocking** (notifications sent asynchronously)
- **Scalable** (can send batch notifications)
- **Secure** (tokens validated, HTTPS recommended)
- **Backward compatible** (works without FCM tokens)
