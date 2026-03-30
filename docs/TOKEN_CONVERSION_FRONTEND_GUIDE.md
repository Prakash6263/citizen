# Token Conversion API - Frontend Developer Guide

## Quick Reference

### The Problem Fixed
- **Before:** User could get paid multiple times if government approved multiple requests
- **After:** Tokens deducted immediately, preventing double-spending

---

## API Endpoints Overview

### 1. Create Conversion Request
```
POST /api/token-conversion/request
```

**Request Body:**
```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "tokenAmount": 100,
  "fiatCurrency": "USD",
  "conversionRate": 1,
  "bankDetails": {
    "accountHolderName": "John Doe",
    "bankName": "State Bank of India",
    "accountNumber": "9876543210",
    "ifscCode": "SBIN0001234",
    "country": "India"
  }
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Token conversion request created successfully",
  "data": {
    "requestId": "CONV-1234567890-ABC123",
    "status": "pending",
    "tokenAmount": 100,
    "fiatAmount": 100,
    "fiatCurrency": "USD",
    "createdAt": "2024-03-30T10:00:00Z",
    "newTokenBalance": 400,
    "message": "Tokens have been reserved from your wallet. They will be released if your request is rejected."
  }
}
```

**⚠️ Key Point:** Balance immediately shows deducted tokens!

**Error Cases:**

1. **Insufficient Tokens (400)**
```json
{
  "status": "error",
  "message": "Insufficient tokens. Available: 50, Requested: 100. Please request a smaller amount."
}
```

2. **Duplicate Request (400)**
```json
{
  "status": "error",
  "message": "You already have an active conversion request (CONV-1234567890-ABC123) for this project. Please wait for it to be processed or rejected before creating a new one."
}
```

---

### 2. Get User's Conversion History
```
GET /api/token-conversion/user/history?page=1&limit=20
```

**Response (200):**
```json
{
  "status": "success",
  "message": "User conversion history retrieved successfully",
  "data": {
    "requests": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "requestId": "CONV-1234567890-ABC123",
        "status": "pending",
        "tokenAmount": 100,
        "fiatAmount": 100,
        "createdAt": "2024-03-30T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

---

### 3. Get Conversion Request Details
```
GET /api/token-conversion/requests/:requestId
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Conversion request details retrieved successfully",
  "data": {
    "requestId": "CONV-1234567890-ABC123",
    "status": "pending",
    "tokenAmount": 100,
    "fiatAmount": 100,
    "createdAt": "2024-03-30T10:00:00Z",
    "approvedAt": null,
    "rejectionReason": null,
    "paymentDetails": null
  }
}
```

---

## Status Flow Explained

```
pending
  ↓
  ├→ approved_by_government
  │    ↓
  │    └→ paid [FINAL]
  │
  └→ rejected [FINAL]
```

### Status Meanings:

| Status | Meaning | User Action | Tokens |
|--------|---------|-------------|--------|
| `pending` | Awaiting government review | Wait | Deducted |
| `approved_by_government` | Approved, awaiting payment | Wait | Deducted |
| `paid` | Payment completed | Done ✅ | Deducted |
| `rejected` | Request denied | Can retry | Refunded ✅ |

---

## Frontend Implementation Examples

### Example 1: Create Conversion Request

```javascript
const createTokenConversionRequest = async (projectId, tokenAmount, bankDetails) => {
  try {
    const response = await fetch('/api/token-conversion/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        projectId,
        tokenAmount,
        fiatCurrency: 'USD',
        conversionRate: 1,
        bankDetails
      })
    })

    const data = await response.json()

    if (!response.ok) {
      // Handle specific errors
      if (response.status === 400) {
        if (data.message.includes('Insufficient tokens')) {
          alert('You don\'t have enough tokens. Please enter a smaller amount.')
        } else if (data.message.includes('already have an active')) {
          alert('You already have a pending request for this project.')
        }
      }
      throw new Error(data.message)
    }

    // Show success
    console.log('Request created:', data.data.requestId)
    console.log('New balance:', data.data.newTokenBalance) // Already deducted!
    
    return data.data
  } catch (error) {
    console.error('Error creating request:', error)
  }
}
```

### Example 2: Show Conversion History

```javascript
const ConversionHistory = () => {
  const [requests, setRequests] = useState([])

  useEffect(() => {
    const fetchHistory = async () => {
      const response = await fetch('/api/token-conversion/user/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      setRequests(data.data.requests)
    }

    fetchHistory()
  }, [])

  return (
    <div>
      {requests.map(req => (
        <div key={req._id}>
          <p>Request ID: {req.requestId}</p>
          <p>Amount: {req.tokenAmount} tokens</p>
          <p>Status: <StatusBadge status={req.status} /></p>
          <p>Created: {new Date(req.createdAt).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  )
}
```

### Example 3: Status Badge Component

```javascript
const StatusBadge = ({ status }) => {
  const colors = {
    pending: 'yellow',
    approved_by_government: 'blue',
    paid: 'green',
    rejected: 'red'
  }

  const messages = {
    pending: 'Awaiting Government Review',
    approved_by_government: 'Approved - Processing Payment',
    paid: 'Payment Completed',
    rejected: 'Request Rejected'
  }

  return (
    <span className={`badge bg-${colors[status]}`}>
      {messages[status]}
    </span>
  )
}
```

---

## Important Notes for Frontend Developers

### 1. **Token Balance Updates**
- When user creates a request, their balance IMMEDIATELY decreases
- Don't wait for server response to show updated balance
- The `newTokenBalance` in response will reflect the deduction

### 2. **Duplicate Request Prevention**
- If user tries to create another request for same project while one is pending:
  - Show error: "You already have a pending request"
  - Let user view existing request details
  - Don't allow them to create another until first is resolved

### 3. **Rejection Handling**
- If request is rejected, user can create a NEW request
- Their tokens will be refunded
- They can try again with different details

### 4. **Error Messages to Handle**

```javascript
const handleConversionError = (message) => {
  if (message.includes('Insufficient tokens')) {
    return "You don't have enough tokens. Please enter a smaller amount."
  }
  if (message.includes('already have an active')) {
    return "You already have a pending request. Please wait for it to be processed."
  }
  if (message.includes('Invalid bank details')) {
    return "There's an issue with your bank details. Please check and try again."
  }
  return message // Fallback to server message
}
```

### 5. **User Journey**

```
User with 500 tokens
  ↓
Creates request for 100 tokens
  ↓
Balance immediately becomes 400 ✅
  ↓
Government reviews
  ├→ Approves: Balance stays 400, user gets paid ✅
  └→ Rejects: Balance returns to 500 ✅
  ↓
User can create new request (if rejected)
```

---

## Common Issues & Solutions

### Issue: "Tokens deducted but request is still pending"
**Solution:** This is normal! Tokens are reserved when request is created. They'll stay deducted until request is approved and paid, or rejected (then refunded).

### Issue: "User says they were charged twice"
**Solution:** Check conversion history. With new flow, this shouldn't happen because:
- First request deducts tokens
- If both requests are approved, second approval fails (insufficient tokens)
- Only the first request gets paid

### Issue: "User wants to cancel their request"
**Solution:** They can't cancel directly. They need to contact government support to reject the request, which will refund their tokens.

---

## Testing Scenarios

### Test 1: Normal Flow
1. Create user with 500 tokens
2. Create conversion request for 100 tokens
3. Verify balance is 400
4. Government approves
5. Government marks as paid
6. Verify balance stays 400

### Test 2: Rejection Refund
1. Create user with 500 tokens
2. Create conversion request for 100 tokens
3. Verify balance is 400
4. Government rejects
5. Verify balance returns to 500

### Test 3: Prevent Duplicate
1. Create conversion request
2. Try to create another request for same project
3. Verify error: "already have an active conversion request"

---

## API Response Checklist

When building features, ensure you:
- [ ] Show `newTokenBalance` after request creation
- [ ] Display rejection reason if request is rejected
- [ ] Show payment date when status is "paid"
- [ ] Prevent duplicate requests with appropriate error messaging
- [ ] Handle 400, 403, 404 errors gracefully
