# Token to Fiat Conversion Flow - Fixed Implementation

## Overview

This document explains the updated token conversion flow that prevents double-spending and ensures proper token management.

---

## New Flow: Pessimistic Locking Approach

### 1. **User Requests Token Conversion** (POST /api/token-conversion/request)

**What Happens:**
- User submits a conversion request with token amount and bank details
- System checks for existing active requests (prevents duplicate requests within 24 hours)
- **IMMEDIATELY deducts tokens from user wallet** ✅
- Creates a `TokenToFiatConversion` record with status `pending`
- Creates a hold transaction record in `TokenTransaction`

**Response:**
```json
{
  "status": "success",
  "message": "Token conversion request created successfully",
  "data": {
    "requestId": "CONV-1234567890-ABC123",
    "status": "pending",
    "tokenAmount": 100,
    "fiatAmount": 100,
    "newTokenBalance": 400,  // Already deducted
    "message": "Tokens have been reserved from your wallet. They will be released if your request is rejected."
  }
}
```

**Why Deduct Immediately?**
- Prevents double-spending if user makes multiple requests
- If government approves multiple requests, only one is valid (other will be rejected)
- If tokens are refunded on rejection, user gets them back

---

### 2. **Government Reviews & Approves** (PATCH /api/token-conversion/requests/:requestId/approve)

**What Happens:**
- Government staff reviews the conversion request
- Approves the request
- Status changes to `approved_by_government`
- **Tokens REMAIN deducted** (no additional deduction)
- Waiting for payment processing

**No Token Movement:** Tokens stay in reserved state from step 1.

---

### 3a. **Government Approves & Marks as Paid** (PATCH /api/token-conversion/requests/:requestId/mark-paid)

**What Happens:**
- Government processes the payment
- Creates a payment completion transaction record
- Status changes to `paid`
- **Tokens already deducted** (from step 1)
- Conversion is complete

**Response:**
```json
{
  "status": "success",
  "message": "Conversion marked as paid successfully",
  "data": {
    "requestId": "CONV-1234567890-ABC123",
    "status": "paid",
    "paidAt": "2024-03-30T10:30:00Z",
    "userTokenBalance": 400,  // Same as when request was created
    "message": "Conversion payment completed successfully. Tokens were deducted when the request was created."
  }
}
```

---

### 3b. **Government Rejects the Request** (PATCH /api/token-conversion/requests/:requestId/reject)

**What Happens:**
- Government reviews and rejects the request
- **Tokens are REFUNDED back to user wallet** ✅
- Creates a refund transaction record
- Status changes to `rejected`
- User can create a new request with different details

**Response:**
```json
{
  "status": "success",
  "message": "Conversion request rejected successfully",
  "data": {
    "requestId": "CONV-1234567890-ABC123",
    "status": "rejected",
    "rejectionReason": "Invalid bank details",
    "tokensRefunded": 100,
    "userTokenBalance": 500,  // Refunded
    "message": "Request rejected. 100 tokens have been refunded to user wallet."
  }
}
```

---

## State Diagram

```
CREATE REQUEST
    ↓
[Tokens: DEDUCTED] ← User wallet: -100 tokens
    ↓
STATUS: pending
    ├─→ GOVERNMENT REVIEWS
    │       ↓
    │   STATUS: approved_by_government
    │       ├─→ MARK AS PAID
    │       │       ↓
    │       │   STATUS: paid [FINAL]
    │       │   Tokens: Remain deducted ✅
    │       │
    │       └─→ (No explicit reject after approval)
    │
    └─→ GOVERNMENT REJECTS
            ↓
        STATUS: rejected [FINAL]
        Tokens: REFUNDED back ✅
```

---

## Key Rules

### ✅ **Token Deduction Timing**
- **When:** Immediately when conversion request is created
- **Why:** Prevents user from spending same tokens multiple times
- **Amount:** Exact amount requested in conversion

### ✅ **Token Refund Timing**
- **When:** When government explicitly rejects the request
- **Why:** User should get tokens back if request is denied
- **Automatic:** Yes, refund is automatic on rejection

### ✅ **Duplicate Prevention**
- **Check:** System prevents multiple active requests for same project within 24 hours
- **Error:** "You already have an active conversion request... Please wait..."
- **Reason:** Prevents spam and accidental double requests

### ❌ **What Can't Happen Now**
- ❌ User creates 2 requests → Government approves both → User gets paid twice
  - **Why Fixed:** Tokens deducted at request time, can't have excess tokens for second approval
- ❌ User creates request → Gets paid before government approves
  - **Why Fixed:** Payment only happens after approval
- ❌ User loses tokens on approval without payment
  - **Why Fixed:** Tokens only deducted at request time, not deducted again at approval

---

## Transaction Types

### Token Deduction Flow

| Transaction Type | Direction | Status | When | Amount |
|-----------------|-----------|--------|------|--------|
| `CONV-HOLD-*` | Debit | Pending | Request created | Full amount |
| `CONV-REFUND-*` | Credit | Completed | Request rejected | Full amount (refund) |
| `CONV-PAID-*` | Debit | Completed | Payment completed | Full amount (confirmation) |

---

## Error Cases & Responses

### 1. Insufficient Tokens
```json
{
  "status": "error",
  "message": "Insufficient tokens. Available: 50, Requested: 100. Please request a smaller amount."
}
```

### 2. Duplicate Active Request
```json
{
  "status": "error",
  "message": "You already have an active conversion request (CONV-1234567890-ABC123) for this project. Please wait for it to be processed or rejected before creating a new one."
}
```

### 3. Invalid Status Transition
```json
{
  "status": "error",
  "message": "Cannot reject request with status: paid. Request is already finalized."
}
```

---

## Database Schema Updates

### TokenToFiatConversion Model

**New Fields:**
```javascript
{
  tokensReserved: Boolean,      // Tracks if tokens are deducted
  reservedAt: Date,              // When tokens were deducted
}
```

---

## Frontend Developer Guide

### What Changed for Frontend?

1. **Request Creation Response**
   - Now includes `newTokenBalance` showing deducted balance
   - Message indicates tokens are reserved

2. **User Experience**
   - Show balance after request creation (already reflects deduction)
   - Don't allow creating another request if one is pending
   - Show refund message if request gets rejected

3. **API Error Handling**
   - Handle "Insufficient tokens" error gracefully
   - Handle "Active request exists" error with suggestion to wait or check existing request
   - Show rejection reasons clearly to user

---

## Testing Checklist

- [ ] User with 100 tokens requests 50 token conversion
  - [ ] Balance becomes 50 immediately
  - [ ] Can't create another request for same project
  
- [ ] Government approves request
  - [ ] Balance stays at 50
  - [ ] Status shows "approved_by_government"
  
- [ ] Government marks as paid
  - [ ] Balance stays at 50
  - [ ] Status shows "paid"
  
- [ ] Reject request workflow
  - [ ] Create request → Balance drops to 50
  - [ ] Government rejects
  - [ ] Balance returns to 100
  - [ ] Status shows "rejected"
  
- [ ] Create second request after rejection
  - [ ] Should succeed (previous is rejected)
  - [ ] Request for 50 tokens → Balance becomes 50

---

## Migration Notes

If you have existing pending requests:
1. They will work with the new flow
2. Government approval will not deduct tokens again
3. Rejection will refund tokens
4. Mark as paid will just record transaction
