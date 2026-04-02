# Notification API - Complete Examples

## 1. Login First & Get FCM Token

### Login Endpoint (Get Authorization)
```bash
curl -X POST http://localhost:5000/api/auth/social-login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "user@example.com",
    "password": "password123",
    "fcmToken": "YOUR_DEVICE_FCM_TOKEN_HERE"
  }'
```

**Response includes:**
- `accessToken` - Use this for protected endpoints
- `refreshToken` - Use to refresh access token
- User data with `userType` (citizen, social_project, government)

---

## 2. Create Notification - Correct Payload

### ✅ CORRECT - Minimal Payload
```bash
curl -X POST http://localhost:5000/api/notifications/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "69ca689b682f35fc07cfb6c9",
    "title": "Budget Allocation Updated",
    "body": "Your Q2 budget has been updated to ₹50,00,000",
    "type": "project_update",
    "priority": "medium"
  }'
```

### ✅ CORRECT - With String Data Values
```bash
curl -X POST http://localhost:5000/api/notifications/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "69ca689b682f35fc07cfb6c9",
    "title": "Budget Allocation Notification",
    "body": "Your allocated budget for Q2 has been updated.",
    "type": "project_update",
    "priority": "medium",
    "userType": "social_project",
    "senderId": "698441366bb9d0e4b23cff78",
    "relatedId": "budget_2024_q2",
    "relatedModel": "Budget",
    "data": {
      "budgetAmount": "5000000",
      "quarter": "Q2",
      "fiscalYear": "2024",
      "actionUrl": "/budget/budget_2024_q2",
      "lastUpdated": "2024-04-02T10:30:00Z"
    }
  }'
```

### ❌ WRONG - Do NOT send nested objects in data
```bash
# This will FAIL - objects must be converted to strings
{
  "data": {
    "metadata": {
      "nested": "object"  // ❌ WRONG
    },
    "amount": 5000000     // ❌ WRONG - numbers should be strings
  }
}
```

---

## 3. Retrieve Notifications

### Get All Notifications for a User
```bash
curl -X GET "http://localhost:5000/api/notifications?userId=69ca689b682f35fc07cfb6c9&limit=20&skip=0" \
  -H "Content-Type: application/json"
```

### Get Unread Notifications Only
```bash
curl -X GET "http://localhost:5000/api/notifications?userId=69ca689b682f35fc07cfb6c9&isRead=false&limit=20" \
  -H "Content-Type: application/json"
```

### Get Notifications for Specific User Type
```bash
curl -X GET "http://localhost:5000/api/notifications?userId=69ca689b682f35fc07cfb6c9&userType=government&limit=20" \
  -H "Content-Type: application/json"
```

### Get Unread Count
```bash
curl -X GET "http://localhost:5000/api/notifications/count/69ca689b682f35fc07cfb6c9?userType=government" \
  -H "Content-Type: application/json"
```

---

## 4. Mark Notifications as Read

### Mark Single Notification as Read
```bash
curl -X PATCH http://localhost:5000/api/notifications/NOTIFICATION_ID/mark-read \
  -H "Content-Type: application/json"
```

### Mark All Notifications as Read
```bash
curl -X PATCH http://localhost:5000/api/notifications/mark-all-read/69ca689b682f35fc07cfb6c9 \
  -H "Content-Type: application/json"
```

### Mark All as Read for Specific User Type
```bash
curl -X PATCH "http://localhost:5000/api/notifications/mark-all-read/69ca689b682f35fc07cfb6c9?userType=government" \
  -H "Content-Type: application/json"
```

---

## 5. Delete Notifications

### Delete Single Notification
```bash
curl -X DELETE http://localhost:5000/api/notifications/NOTIFICATION_ID \
  -H "Content-Type: application/json"
```

### Clear All Notifications
```bash
curl -X DELETE http://localhost:5000/api/notifications/clear-all/69ca689b682f35fc07cfb6c9 \
  -H "Content-Type: application/json"
```

### Clear All for Specific User Type
```bash
curl -X DELETE "http://localhost:5000/api/notifications/clear-all/69ca689b682f35fc07cfb6c9?userType=government" \
  -H "Content-Type: application/json"
```

---

## 6. Data Field Guidelines

### ✅ CORRECT Data Format (All Strings)
```json
{
  "data": {
    "projectId": "proj_123",
    "budgetAmount": "5000000",
    "quarter": "Q2",
    "completed": "true",
    "percentage": "75",
    "metadata": "{\"key\": \"value\"}"
  }
}
```

### ❌ WRONG Data Format
```json
{
  "data": {
    "projectId": "proj_123",
    "budgetAmount": 5000000,              // ❌ Number instead of string
    "metadata": { "key": "value" },       // ❌ Object instead of string
    "completed": true,                    // ❌ Boolean instead of string
    "tags": ["tag1", "tag2"]              // ❌ Array instead of string
  }
}
```

---

## 7. Government-Specific Examples

### Government Project Approval Notification
```bash
curl -X POST http://localhost:5000/api/notifications/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "69ca689b682f35fc07cfb6c9",
    "title": "New Project Awaiting Approval",
    "body": "Community Health Initiative requires your approval",
    "type": "project_update",
    "priority": "high",
    "userType": "government",
    "relatedId": "proj_community_health",
    "relatedModel": "Project",
    "data": {
      "projectName": "Community Health Initiative",
      "submittedBy": "NGO_123",
      "requiredAction": "review_and_approve",
      "actionUrl": "/projects/proj_community_health/review"
    }
  }'
```

### Government Compliance Alert
```bash
curl -X POST http://localhost:5000/api/notifications/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "69ca689b682f35fc07cfb6c9",
    "title": "Compliance Alert",
    "body": "Project XYZ is missing Q2 compliance report",
    "type": "alert",
    "priority": "critical",
    "userType": "government",
    "relatedId": "proj_xyz",
    "relatedModel": "Project",
    "data": {
      "projectId": "proj_xyz",
      "complianceIssue": "Missing quarterly report",
      "dueDate": "2024-04-05",
      "actionUrl": "/compliance/proj_xyz"
    }
  }'
```

### Government Budget Allocation
```bash
curl -X POST http://localhost:5000/api/notifications/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "69ca689b682f35fc07cfb6c9",
    "title": "Budget Allocation Updated",
    "body": "Your budget allocation for Q2 2024 has been finalized",
    "type": "project_update",
    "priority": "medium",
    "userType": "government",
    "relatedId": "budget_q2_2024",
    "relatedModel": "Budget",
    "data": {
      "allocatedAmount": "50000000",
      "quarter": "Q2",
      "fiscalYear": "2024",
      "department": "Social Welfare",
      "actionUrl": "/budget/budget_q2_2024"
    }
  }'
```

---

## Troubleshooting

### Issue: Firebase Credential Error
**Error:** "Invalid JWT Signature"
**Solution:** 
1. Check your Firebase service account key file
2. Ensure the key file has not been revoked
3. Sync your server time
4. Generate a new service account key from Firebase Console

### Issue: FCM Data Error
**Error:** "data must only contain string values"
**Solution:** 
Convert all data values to strings:
```javascript
// Convert objects to JSON strings
data.metadata = JSON.stringify(metadata)
// Convert numbers to strings
data.amount = String(amount)
```

### Issue: Notification not showing in Frontend
**Solution:**
1. Ensure user has FCM token registered (login with fcmToken parameter)
2. Check if user.fcmToken exists in database
3. Verify Firebase certificate is valid
4. Check app logs for FCM errors
5. Ensure device has internet connection

---

## Response Examples

### Successful Notification Creation
```json
{
  "status": "success",
  "message": "Notification created successfully",
  "data": {
    "notification": {
      "_id": "66a1f2b3c4d5e6f7g8h9i0j1",
      "userId": "69ca689b682f35fc07cfb6c9",
      "userType": "government",
      "title": "Budget Allocation Updated",
      "body": "Your Q2 budget has been updated",
      "type": "project_update",
      "priority": "medium",
      "isRead": false,
      "isDeleted": false,
      "createdAt": "2024-04-02T10:30:00Z",
      "updatedAt": "2024-04-02T10:30:00Z"
    },
    "fcmNotSent": false
  }
}
```

### Get Notifications Response
```json
{
  "status": "success",
  "data": {
    "notifications": [
      {
        "_id": "66a1f2b3c4d5e6f7g8h9i0j1",
        "title": "Budget Allocation Updated",
        "body": "Your Q2 budget has been updated",
        "type": "project_update",
        "priority": "medium",
        "isRead": false,
        "createdAt": "2024-04-02T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 15,
      "limit": 20,
      "skip": 0,
      "pages": 1
    }
  }
}
```
