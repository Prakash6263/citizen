# Project Support E11000 Error - Bug Fix Summary

## Problem
The API endpoint `POST /api/projects/:projectId/support` was returning a raw MongoDB E11000 error instead of a user-friendly message:

```
E11000 duplicate key error collection: municipality_db.projectsupports 
index: project_1_supporter_1_supportType_1 
dup key: { project: ObjectId('69c23cf4a4b1bea98937c0bc'), supporter: null, supportType: null }
```

## Root Cause
The MongoDB database had an old, incorrect unique index from a previous schema version that included fields (`supporter` and `supportType`) that no longer exist in the current code. MongoDB treats `null` as a value, so multiple documents with null values violated this unique constraint.

## Solution Implemented

### 1. ✅ Enhanced Error Handler
**File:** `src/middleware/errorHandler.js`
- Detects E11000 errors and extracts field information
- Returns clear, actionable error messages instead of raw MongoDB errors
- Provides appropriate HTTP status codes (400, 409)
- Example: `"You have already supported this project. You cannot support the same project twice."`

### 2. ✅ Added Input Validation
**File:** `src/controllers/projectSupportController.js`
- Validates all required fields before database operations
- Catches E11000 errors and converts them to proper 409 Conflict responses
- Logs detailed error information for debugging
- Prevents null values from being saved

### 3. ✅ Fixed Database Schema
**File:** `src/models/ProjectSupport.js`
- Removed references to non-existent fields
- Created correct unique compound index: `citizen + project`
- Added `sparse: true` to indexes (allows multiple nulls safely)
- Ensures only one support record per citizen-project pair

### 4. ✅ Database Cleanup Script
**File:** `scripts/fix-projectsupport-index.js`
- Drops the old incorrect index `project_1_supporter_1_supportType_1`
- Removes invalid records with null required fields
- Removes duplicate support records
- Creates the correct indexes

## How to Apply the Fix

### Step 1: Update Code
All code changes are already in place:
- Error handler middleware updated ✅
- Controller validation added ✅
- Schema corrected ✅

### Step 2: Clean the Database
Run the database fix script:
```bash
node scripts/fix-projectsupport-index.js
```

This script will:
- Remove problematic old indexes
- Clean up invalid data
- Create correct indexes
- Provide a summary of changes

### Step 3: Verify
Check that the API now returns proper error messages:
```bash
# Test supporting a project
curl -X POST http://localhost:3000/api/projects/123/support \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tokensToSpend": 2}'

# Should return 201 with success, or clear error message (400/403/404/409)
```

## Before & After

### Before (Raw Error)
```json
{
  "success": false,
  "message": "E11000 duplicate key error collection: municipality_db.projectsupports index: project_1_supporter_1_supportType_1 dup key: { project: ObjectId('69c23cf4a4b1bea98937c0bc'), supporter: null, supportType: null }"
}
```

### After (Clear Error)
```json
{
  "success": false,
  "message": "You have already supported this project. You cannot support the same project twice."
}
```

## Files Modified

| File | Changes |
|------|---------|
| `src/middleware/errorHandler.js` | Enhanced E11000 error handling with clear messages |
| `src/controllers/projectSupportController.js` | Added validation and error catching |
| `src/models/ProjectSupport.js` | Fixed schema and indexes |
| `scripts/fix-projectsupport-index.js` | NEW - Database cleanup script |
| `docs/E11000_ERROR_GUIDE.md` | NEW - Detailed technical guide |
| `docs/PROJECT_SUPPORT_API_GUIDE.md` | NEW - Frontend developer guide |

## Error Messages Reference

The API now returns clear messages for common scenarios:

| Status | Message | When |
|--------|---------|------|
| 201 | "Project supported successfully" | Support created |
| 400 | "Invalid token amount" | tokensToSpend <= 0 |
| 400 | "Insufficient token balance" | User has fewer tokens than requested |
| 403 | "Only citizens can support projects" | Non-citizen trying to support |
| 403 | "Your account must be approved before supporting projects" | Account not approved |
| 403 | "This project must be approved before receiving token support" | Project not active |
| 404 | "Project not found" | Project doesn't exist |
| 409 | "You have already supported this project..." | Duplicate support attempt |

## Technical Details

### Index Structure (After Fix)
```javascript
{
  "_id_": { "_id": 1 }                                    // Default
},
{
  "supportId_1": { "supportId": 1 },                     // Unique, sparse
  "unique": true,
  "sparse": true
},
{
  "citizen_1_project_1": { "citizen": 1, "project": 1 }, // Compound unique
  "unique": true,
  "sparse": true
},
{
  "citizen_1_createdAt_-1": { "citizen": 1, "createdAt": -1 }
},
{
  "project_1_createdAt_-1": { "project": 1, "createdAt": -1 }
},
{
  "projectRegistration_1": { "projectRegistration": 1 }
}
```

### Key Points
- **sparse: true** allows multiple null values without violating unique constraint
- **Compound unique index on citizen + project** ensures only one support per citizen-project pair
- All required fields must have values (no nulls)
- Old incorrect indexes are removed

## Testing Checklist

- [ ] Run `node scripts/fix-projectsupport-index.js`
- [ ] Verify script completes successfully
- [ ] Check MongoDB indexes are correct: `db.projectsupports.getIndexes()`
- [ ] Test supporting a project via API
- [ ] Test supporting with insufficient balance (should return 400)
- [ ] Test supporting the same project twice (should return 409)
- [ ] Test getting supported projects list
- [ ] Test getting project supporters
- [ ] Verify no raw MongoDB errors in responses

## Documentation

Two new guides have been created for different audiences:

1. **`docs/E11000_ERROR_GUIDE.md`**
   - Technical explanation of E11000 error
   - Root cause analysis
   - Step-by-step fix instructions
   - For backend developers and DevOps

2. **`docs/PROJECT_SUPPORT_API_GUIDE.md`**
   - API endpoint reference
   - Request/response examples
   - Frontend implementation examples
   - Error handling patterns
   - For frontend developers

## Questions?

- **Backend/Database Issue?** → See `docs/E11000_ERROR_GUIDE.md`
- **How to use the API?** → See `docs/PROJECT_SUPPORT_API_GUIDE.md`
- **Need quick steps?** → Run the database fix script
- **Still having issues?** → Check the debug logs in console

---

**Fix Status:** ✅ Complete and Ready for Testing
**Deploy Steps:** 1. Update code | 2. Run database script | 3. Test
