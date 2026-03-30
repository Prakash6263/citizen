# E11000 Duplicate Key Error - Understanding and Fixing

## What is the E11000 Error?

The E11000 error is a MongoDB error that occurs when you try to insert or update a document with a value that should be unique but already exists in the database.

**Error Message Example:**
```
E11000 duplicate key error collection: municipality_db.projectsupports 
index: project_1_supporter_1_supportType_1 
dup key: { project: ObjectId('69c23cf4a4b1bea98937c0bc'), supporter: null, supportType: null }
```

## Why Did This Happen?

### Root Cause
The database has an old, incorrect index from a previous schema version that included fields (`supporter` and `supportType`) that no longer exist in the current code. When MongoDB tries to enforce this old index with null values, it treats multiple null entries as duplicates.

### Technical Details
- **Old Index**: `project_1_supporter_1_supportType_1` (from outdated schema)
- **Issue**: MongoDB treats `null` as a value. Multiple documents with `supporter: null` and `supportType: null` violate the unique constraint
- **Current Schema**: Only has `citizen`, `project`, and `projectRegistration` fields (no `supporter` or `supportType`)

## What's Been Fixed?

### 1. **Better Error Messages** (`src/middleware/errorHandler.js`)
- The API now returns user-friendly error messages instead of raw MongoDB errors
- Frontend developers see: `"You have already supported this project. You cannot support the same project twice."`
- Instead of: Raw MongoDB E11000 error message

### 2. **Input Validation** (`src/controllers/projectSupportController.js`)
- Added validation to ensure no null required fields
- Catches duplicate key errors and returns proper HTTP 409 status
- Logs detailed error information for debugging

### 3. **Correct Database Schema** (`src/models/ProjectSupport.js`)
- Added unique compound index: `citizen + project` (one support per citizen per project)
- Added `sparse: true` to indexes (allows multiple nulls safely)
- Removed references to non-existent fields

### 4. **Database Cleanup Script** (`scripts/fix-projectsupport-index.js`)
- Drops the old incorrect index
- Removes invalid records with null values
- Removes duplicate supports
- Creates the correct indexes

## How to Fix Your Database

### Step 1: Run the Cleanup Script
```bash
node scripts/fix-projectsupport-index.js
```

This will:
- ✓ Drop the old problematic index `project_1_supporter_1_supportType_1`
- ✓ Remove any documents with null required fields
- ✓ Remove duplicate supports (keeps the first one per citizen-project pair)
- ✓ Create the correct indexes

### Step 2: Verify the Fix
Check your MongoDB collection to confirm:
```javascript
// In MongoDB shell
db.projectsupports.getIndexes()
```

You should see:
```javascript
{
  "v": 2,
  "key": { "_id": 1 }
},
{
  "v": 2,
  "key": { "supportId": 1 },
  "unique": true,
  "sparse": true
},
{
  "v": 2,
  "key": { "citizen": 1, "project": 1 },
  "unique": true,
  "sparse": true
},
// ... other indexes
```

## For Frontend Developers

When you see an error response from the support API, it will now be clear:

### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Project supported successfully",
  "data": {
    "support": {
      "id": "...",
      "supportId": "SUP...",
      "projectTitle": "...",
      "tokensSpent": 3,
      "remainingBalance": 2,
      "projectFundingProgress": {
        "funded": 8,
        "goal": 10,
        "percentage": 80
      }
    }
  }
}
```

### Error Responses

**Already Supported (409 Conflict)**
```json
{
  "success": false,
  "message": "You have already supported this project. You cannot support the same project twice."
}
```

**Insufficient Balance (400 Bad Request)**
```json
{
  "success": false,
  "message": "Insufficient token balance"
}
```

**Project Not Found (404 Not Found)**
```json
{
  "success": false,
  "message": "Project not found"
}
```

**Duplicate Key Error (409 Conflict)** - (should not happen after fix)
```json
{
  "success": false,
  "message": "Cannot create support record: duplicate key error"
}
```

## API Endpoint Reference

### Support a Project
**POST** `/api/projects/:projectId/support`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "tokensToSpend": 3
}
```

**Status Codes:**
- `201 Created` - Support successful
- `400 Bad Request` - Invalid input, insufficient balance, project not found
- `403 Forbidden` - User not approved or project not active
- `404 Not Found` - Project or user not found
- `409 Conflict` - Already supported this project (after trying to support twice)

## Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| E11000 error on /support endpoint | Run `node scripts/fix-projectsupport-index.js` |
| "Already supported" when only trying once | Database has duplicate entries; run cleanup script |
| API returns raw MongoDB error | Update to latest `src/middleware/errorHandler.js` |
| Null values in database | Run cleanup script to remove invalid records |

## For Backend Developers

### Key Changes Made

1. **Error Handler Enhancement**
   - Detects collection name and field names from error object
   - Returns appropriate HTTP status codes (400, 409)
   - Maintains backward compatibility

2. **Controller Validation**
   - Validates all required fields before database operation
   - Catches E11000 errors and returns 409 Conflict
   - Provides actionable error messages

3. **Schema Correction**
   - Compound unique index on `citizen` + `project`
   - Sparse indexes to allow null values safely
   - No references to deleted fields

### Testing the Fix

```javascript
// Test: Attempt to support twice (should fail with 409)
POST /api/projects/123/support
{ "tokensToSpend": 2 }

// Response 409
{
  "success": false,
  "message": "You have already supported this project. You cannot support the same project twice."
}
```

## Prevention

To prevent this issue in the future:

1. **Always use sparse indexes** for optional fields
2. **Add validation** before database operations
3. **Use proper error handling** in middleware
4. **Keep schema and indexes in sync** with code
5. **Document index requirements** in model files

---

**Questions?** Check the error message returned by the API - it should now be clear and actionable!
