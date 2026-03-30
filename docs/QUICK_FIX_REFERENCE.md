# Quick Fix Reference Card

## TL;DR - Fix the E11000 Error in 2 Steps

### Step 1: Run Database Fix Script
```bash
node scripts/fix-projectsupport-index.js
```

This will:
- ✅ Remove old wrong indexes
- ✅ Clean invalid data
- ✅ Create correct indexes

### Step 2: Test the API
```bash
curl -X POST http://localhost:3000/api/projects/:projectId/support \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tokensToSpend": 2}'
```

Expected response (201):
```json
{
  "success": true,
  "message": "Project supported successfully",
  "data": { ... }
}
```

---

## What Changed?

### Code Changes (✅ Already Done)
1. **Error Handler** - Returns clear messages instead of raw MongoDB errors
2. **Controller** - Validates input and catches errors properly  
3. **Schema** - Fixed indexes and removed null value conflicts

### Database Changes (⚠️ You Must Run Script)
```bash
# Run once:
node scripts/fix-projectsupport-index.js
```

---

## Error Messages You Should See Now

| Error | What to Do |
|-------|-----------|
| 400 "Invalid token amount" | Send tokensToSpend: 1-5 |
| 400 "Insufficient balance" | User needs more tokens |
| 403 "Not approved" | User account needs approval |
| 404 "Project not found" | Check project ID |
| 409 "Already supported" | ✅ Database is working! |

---

## Before & After

### Before (Raw Error) ❌
```
Status: 400
Message: "E11000 duplicate key error... project_1_supporter_1_supportType_1..."
```

### After (Clear Error) ✅
```
Status: 409
Message: "You have already supported this project."
```

---

## File Locations

| What | Where |
|------|-------|
| **Tech Explanation** | `docs/E11000_ERROR_GUIDE.md` |
| **API Reference** | `docs/PROJECT_SUPPORT_API_GUIDE.md` |
| **Visual Diagrams** | `docs/ERROR_FLOW_DIAGRAM.md` |
| **Full Summary** | `BUGFIX_SUMMARY.md` |
| **Database Script** | `scripts/fix-projectsupport-index.js` |

---

## Troubleshooting

**Q: Script fails to connect?**
- Check `MONGODB_URI` in .env file
- Ensure MongoDB is running

**Q: Script says "index doesn't exist"?**
- This is normal and safe
- Means the old index is already gone

**Q: API still returns error?**
- Verify script ran successfully
- Check MongoDB indexes: `db.projectsupports.getIndexes()`
- Restart Node.js server

**Q: Getting 409 error?**
- This is CORRECT behavior! 
- Means user already supported this project
- Database is now working properly

---

## For Frontend

Just handle these status codes:

```javascript
if (response.status === 201) {
  // Success! Support recorded
} else if (response.status === 400) {
  // Invalid input - show error message to user
} else if (response.status === 403) {
  // Permission denied - show error message
} else if (response.status === 404) {
  // Project not found
} else if (response.status === 409) {
  // Already supported - offer to increase support
}
```

---

## For Backend

### Check if Database is Fixed
```javascript
// In MongoDB shell
db.projectsupports.getIndexes()

// Look for:
// ✅ "citizen_1_project_1" (unique, sparse) - Should exist
// ❌ "project_1_supporter_1_supportType_1" - Should NOT exist
```

### Check Data Quality
```javascript
// Look for invalid records
db.projectsupports.find({ citizen: null })     // Should be empty
db.projectsupports.find({ project: null })     // Should be empty
```

---

## Checklist

- [ ] Run: `node scripts/fix-projectsupport-index.js`
- [ ] Script completes without errors
- [ ] Test support API endpoint
- [ ] Get 201 on first support attempt
- [ ] Get 409 on second support attempt (correct!)
- [ ] Verify error messages are clear
- [ ] Code review: error handler changes
- [ ] Code review: controller changes
- [ ] Code review: schema changes

---

## Most Important Things

1. **Run the script once** - Fixes the database
2. **Code is already updated** - No more changes needed
3. **Test the API** - Should return clear errors now
4. **Share the guides** - Help your team understand

---

**Still having issues?**
- Check: `docs/E11000_ERROR_GUIDE.md` (technical)
- Check: `docs/PROJECT_SUPPORT_API_GUIDE.md` (frontend)
- Check: `docs/ERROR_FLOW_DIAGRAM.md` (visual)

---

**Status:** ✅ Ready to fix
**Time to fix:** ~2 minutes
**Risk:** None (script only cleans up data)
