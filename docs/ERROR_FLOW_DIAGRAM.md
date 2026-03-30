# Error Flow & Fix Diagram

## Before Fix: How the Error Happened

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend: POST /api/projects/123/support                    │
│ Body: { tokensToSpend: 2 }                                  │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Route Handler: projectSupport()                              │
│ (src/routes/projectSupport.js)                              │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Controller: supportProject()                                 │
│ (src/controllers/projectSupportController.js)                │
│                                                              │
│ ❌ NO VALIDATION (before fix)                              │
│ ❌ NO ERROR CATCHING                                        │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ MongoDB: ProjectSupport.create({                            │
│   supportId: "SUP123...",                                   │
│   citizen: req.user._id,                                    │
│   project: projectId,                                       │
│   projectRegistration: ...,                                 │
│   tokensSpent: 2                                            │
│ })                                                          │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Database Check: Is this unique?                             │
│                                                              │
│ Index: project_1_supporter_1_supportType_1                 │
│ (OLD - INCORRECT - SHOULD NOT EXIST)                        │
│                                                              │
│ Check: { project: ObjectId(...),                            │
│          supporter: null,          ← DOESN'T EXIST!         │
│          supportType: null }        ← DOESN'T EXIST!        │
│                                                              │
│ Result: ❌ DUPLICATE FOUND!                                │
│ (Multiple docs have null values)                            │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ ❌ MongoDB Returns: E11000 Error                            │
│                                                              │
│ E11000 duplicate key error collection:                      │
│ municipality_db.projectsupports                             │
│ index: project_1_supporter_1_supportType_1                  │
│ dup key: {                                                  │
│   project: ObjectId('69c23cf4a4b1bea98937c0bc'),           │
│   supporter: null,                                          │
│   supportType: null                                         │
│ }                                                           │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Error Handler: errorHandler()                               │
│ (src/middleware/errorHandler.js)                            │
│                                                              │
│ ❌ BEFORE FIX: Generic message                             │
│ "Duplicate field value entered"                             │
│                                                              │
│ ❌ Returns raw error details                               │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ ❌ Frontend Gets Raw MongoDB Error                          │
│                                                              │
│ 400 Bad Request                                             │
│ {                                                           │
│   "success": false,                                         │
│   "message": "E11000 duplicate key error..."               │
│ }                                                           │
│                                                              │
│ ❌ PROBLEM: Developer can't understand what went wrong      │
└─────────────────────────────────────────────────────────────┘
```

---

## After Fix: How the Error is Handled

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend: POST /api/projects/123/support                    │
│ Body: { tokensToSpend: 2 }                                  │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Route Handler: projectSupport()                              │
│ (src/routes/projectSupport.js)                              │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Controller: supportProject()                                 │
│ (src/controllers/projectSupportController.js)                │
│                                                              │
│ ✅ VALIDATES INPUT                                          │
│ ✅ VALIDATES REQUIRED FIELDS (no nulls)                     │
│ ✅ WRAPS create() IN TRY-CATCH                              │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │ Try Block   │
                    └──────┬──────┘
                           │
                           ▼
         ┌─────────────────────────────────────┐
         │ MongoDB Insert (with validation)    │
         └──────────────┬──────────────────────┘
                        │
              ┌─────────┴──────────┐
              ▼                    ▼
         ✅ SUCCESS          ❌ E11000 ERROR
         (201 Created)
                        │
                        ▼
         ┌──────────────────────────────────────┐
         │ Catch Block Catches E11000           │
         │                                       │
         │ ✅ Identifies error.code === 11000   │
         │ ✅ Checks collection name            │
         │ ✅ Returns proper 409 status         │
         │ ✅ Logs detailed info for debugging  │
         └──────────────┬───────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Error Handler: errorHandler()                               │
│ (src/middleware/errorHandler.js)                            │
│                                                              │
│ ✅ AFTER FIX: Clear, actionable message                    │
│ Detects:                                                    │
│ - Collection: projectsupports                              │
│ - Field: project                                            │
│ - Error Type: duplicate key                                │
│                                                              │
│ ✅ Returns appropriate HTTP status (409 Conflict)           │
│ ✅ Returns clear message to user                            │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ ✅ Frontend Gets Clear Error Message                        │
│                                                              │
│ 409 Conflict                                                │
│ {                                                           │
│   "success": false,                                         │
│   "message": "You have already supported this project.      │
│               You cannot support the same project twice."   │
│ }                                                           │
│                                                              │
│ ✅ Developer knows exactly what went wrong                  │
│ ✅ User can take appropriate action                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Index Fix Flow

```
┌───────────────────────────────────────────────────────────────┐
│ BEFORE: Incorrect/Conflicting Indexes                         │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│ projectsupports.indexes = {                                   │
│   "_id_": { _id: 1 },                                        │
│   "supportId_1": { supportId: 1, unique: true },             │
│   "project_1_supporter_1_supportType_1": {        ❌ OLD     │
│     project: 1,                                    ❌ WRONG  │
│     supporter: 1,          ← DOESN'T EXIST!                  │
│     supportType: 1         ← DOESN'T EXIST!                  │
│   },                                                          │
│   "citizen_1_createdAt_-1": { ... }                          │
│ }                                                             │
│                                                                │
│ ❌ Problem: null values in supporter & supportType violate   │
│            unique constraint!                                │
└───────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────────┐
│ RUN: node scripts/fix-projectsupport-index.js                 │
└───────────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
    ┌────────┐      ┌──────────┐      ┌─────────┐
    │ Drop   │      │ Remove   │      │ Create  │
    │ Old    │      │ Invalid  │      │ Correct │
    │ Indexes│      │ Records  │      │ Indexes │
    └────┬───┘      └────┬─────┘      └────┬────┘
         │               │                  │
         ▼               ▼                  ▼
    Removes:        Deletes:            Creates:
    - project_1_    - Records with      - citizen_1_
      supporter_1_    null citizen        project_1
      supportType_1 - Records with        (unique,
    - supporter_1     null project        sparse)
    - supportType_1 - Duplicate          - supportId_1
                      supports             (unique,
                                          sparse)
                                        - All others

         │               │                  │
         └────────────────┼──────────────────┘
                          ▼
┌───────────────────────────────────────────────────────────────┐
│ AFTER: Clean, Correct Indexes                                │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│ projectsupports.indexes = {                                   │
│   "_id_": { _id: 1 },                                        │
│   "supportId_1": {                        ✅ CORRECT         │
│     supportId: 1,                                             │
│     unique: true,                                             │
│     sparse: true                          ✅ ALLOWS NULLS    │
│   },                                                          │
│   "citizen_1_project_1": {                ✅ NEW COMPOUND    │
│     citizen: 1,                                               │
│     project: 1,                                               │
│     unique: true,                         ✅ ONE SUPPORT     │
│     sparse: true                          ✅ PER PAIR       │
│   },                                                          │
│   "citizen_1_createdAt_-1": { ... }                          │
│   "project_1_createdAt_-1": { ... }                          │
│   "projectRegistration_1": { ... }                           │
│ }                                                             │
│                                                                │
│ ✅ All invalid data removed                                  │
│ ✅ No null value conflicts                                   │
│ ✅ One support per citizen-project pair enforced             │
└───────────────────────────────────────────────────────────────┘
```

---

## Validation Layers (After Fix)

```
Request Input Validation:
┌────────────────────────────┐
│ Frontend validates:        │
│ - tokensToSpend > 0        │
│ - projectId exists         │
└────────────────┬───────────┘
                 ▼
┌────────────────────────────┐
│ API Route validates:       │
│ - User authenticated       │
│ - User is citizen          │
└────────────────┬───────────┘
                 ▼
┌────────────────────────────┐
│ Controller validates:      │
│ ✅ (NEW) Required fields   │
│ ✅ (NEW) No null values    │
│ ✅ Account approved        │
│ ✅ Token balance sufficient│
│ ✅ Project status active   │
│ ✅ Funding goal not exceeded
└────────────────┬───────────┘
                 ▼
┌────────────────────────────┐
│ Database validation:       │
│ ✅ (FIXED) Unique indexes  │
│ ✅ (FIXED) No duplicates   │
│ ✅ (FIXED) Data integrity  │
└────────────────┬───────────┘
                 ▼
              ✅ SUCCESS
```

---

## Error Response Decision Tree

```
                    ┌─ Validation Error ─┐
                    │                      │
         ┌──────────┴──────────┐
         ▼                      ▼
    Invalid Input         Invalid State
    (400)                 (400/403/404)
    │                     │
    ├─ tokensToSpend ≤ 0  ├─ Insufficient balance
    ├─ Missing fields     ├─ Account not approved
    ├─ Invalid types      ├─ Project not active
    │                     ├─ Project not found
    │                     └─ User not citizen
    │
    ▼
Database Error
    │
    ├─ E11000 (Duplicate)
    │   └─ 409 Conflict
    │       "You have already supported..."
    │
    ├─ Validation Error
    │   └─ 400 Bad Request
    │
    └─ Other Error
        └─ 500 Server Error
```

---

## Summary of Changes

| Layer | Before | After |
|-------|--------|-------|
| **Frontend** | Gets raw error | Gets clear message |
| **Validation** | Minimal | Comprehensive |
| **Error Catch** | None | Try-Catch in controller |
| **Error Handler** | Generic | Specific to projectSupport |
| **Database** | Wrong index | Correct indexes |
| **Data** | Can have nulls | All nulls removed |
| **Status Code** | 400 | 400/403/404/409 (appropriate) |
| **Message** | Raw MongoDB | User-friendly |

---

**Result:** Clear, actionable error messages that help developers understand what went wrong!
