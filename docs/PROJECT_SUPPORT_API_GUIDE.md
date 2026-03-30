# Project Support API - Frontend Developer Guide

## Quick Overview

The Project Support endpoint allows citizens to support social projects with civic tokens. Each citizen can support a project only once but can increase their support amount up to a maximum of 5 tokens per project.

## API Endpoints

### 1. Support a Project
**POST** `/api/projects/:projectId/support`

**Purpose:** Citizen supports a project with civic tokens

**Request:**
```javascript
fetch(`/api/projects/${projectId}/support`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tokensToSpend: 2
  })
})
```

**Request Body:**
```typescript
{
  tokensToSpend: number  // 1-5 tokens
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Project supported successfully",
  "data": {
    "support": {
      "id": "507f1f77bcf86cd799439011",
      "supportId": "SUP123456789",
      "projectTitle": "Community Garden Initiative",
      "tokensSpent": 2,
      "remainingBalance": 3,
      "projectFundingProgress": {
        "funded": 8,
        "goal": 10,
        "percentage": 80
      }
    }
  }
}
```

**Error Responses:**

| Status | Message | Meaning |
|--------|---------|---------|
| 400 | "Insufficient token balance" | User doesn't have enough tokens |
| 400 | "Invalid token amount" | tokensToSpend is <= 0 or missing |
| 403 | "Only citizens can support projects" | User is not a citizen |
| 403 | "Your account must be approved before supporting projects" | Account not approved |
| 403 | "This project must be approved before receiving token support" | Project status is not "active" |
| 404 | "Project not found" | Project ID doesn't exist |
| 409 | "You have already supported this project..." | Trying to support the same project twice (see note below) |

**Note on Error 409:**
If you get a 409 error when trying to support for the first time, there's a database issue. Contact the backend team to run:
```bash
node scripts/fix-projectsupport-index.js
```

---

### 2. Get Citizen's Supported Projects
**GET** `/api/projects/my-supported?page=1&limit=10`

**Purpose:** Retrieve all projects supported by the current user

**Request:**
```javascript
fetch('/api/projects/my-supported?page=1&limit=10', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

**Query Parameters:**
```typescript
{
  page?: number      // Default: 1
  limit?: number     // Default: 10
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Supported projects retrieved successfully",
  "data": {
    "projects": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "supportId": "SUP123456789",
        "projectTitle": "Community Garden Initiative",
        "projectType": "environmental",
        "projectDescription": "Building sustainable gardens...",
        "organizationName": "Green Earth Foundation",
        "organizationCity": "New York",
        "organizationState": "NY",
        "organizationCountry": "USA",
        "createdBy": {
          "_id": "507f1f77bcf86cd799439012",
          "fullName": "Jane Doe",
          "email": "jane@example.com",
          "avatar": "https://..."
        },
        "tokensSpent": 2,
        "fundingProgress": {
          "funded": 8,
          "goal": 10,
          "percentage": 80
        },
        "supportedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 42
    }
  }
}
```

---

### 3. Get Project Supporters
**GET** `/api/projects/:projectId/supporters?page=1&limit=10`

**Purpose:** Get list of citizens supporting a specific project

**Request:**
```javascript
fetch(`/api/projects/${projectId}/supporters?page=1&limit=10`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Project supporters retrieved successfully",
  "data": {
    "supporters": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "citizenName": "John Smith",
        "citizenAvatar": "https://...",
        "tokensContributed": 3,
        "supportedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 2,
      "total": 15
    }
  }
}
```

---

### 4. Get Project Support Statistics
**GET** `/api/projects/:projectId/support-stats`

**Purpose:** Get funding progress and supporter count for a project

**Request:**
```javascript
fetch(`/api/projects/${projectId}/support-stats`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Project support statistics retrieved successfully",
  "data": {
    "stats": {
      "totalSupporters": 15,
      "totalTokensFunded": 8,
      "fundingGoal": 10,
      "fundingPercentage": 80,
      "tokensNeeded": 2,
      "isFullyFunded": false
    }
  }
}
```

---

## Frontend Implementation Example

### Support a Project (React)
```jsx
import { useState } from 'react';

function SupportButton({ projectId, userTokenBalance }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tokenAmount, setTokenAmount] = useState(1);

  const handleSupport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/support`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tokensToSpend: tokenAmount
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Error handling - backend now returns clear messages
        setError(data.message);
        
        // Handle specific cases
        if (response.status === 409) {
          // Already supported - show UI to increase support
          showIncreaseDialog();
        }
        return;
      }

      // Success - update UI
      showSuccessMessage(`Supported with ${data.data.support.tokensSpent} tokens!`);
      updateUserBalance(data.data.support.remainingBalance);
      refreshProjectStats();

    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <select value={tokenAmount} onChange={(e) => setTokenAmount(Number(e.target.value))}>
        {[1, 2, 3, 4, 5].map(n => (
          <option key={n} value={n}>{n} tokens</option>
        ))}
      </select>
      <button onClick={handleSupport} disabled={loading || tokenAmount > userTokenBalance}>
        {loading ? 'Supporting...' : 'Support Project'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### Display Funding Progress
```jsx
function FundingProgress({ projectId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const response = await fetch(`/api/projects/${projectId}/support-stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setStats(data.data.stats);
      setLoading(false);
    };

    fetchStats();
  }, [projectId]);

  if (loading) return <div>Loading...</div>;
  if (!stats) return <div>No data</div>;

  return (
    <div>
      <div className="progress-bar" style={{ width: `${stats.fundingPercentage}%` }} />
      <p>{stats.fundingPercentage}% funded</p>
      <p>{stats.totalSupporters} supporters</p>
      <p>Needs {stats.tokensNeeded} more tokens</p>
      {stats.isFullyFunded && <span className="badge">Fully Funded!</span>}
    </div>
  );
}
```

---

## Status Codes Reference

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Data retrieved successfully |
| 201 | Created | Support recorded successfully |
| 400 | Bad Request | Invalid input - check error message |
| 403 | Forbidden | Permission denied - check user role/approval |
| 404 | Not Found | Project/user doesn't exist |
| 409 | Conflict | Already supported (or database issue) |
| 500 | Server Error | Backend issue - contact support |

---

## Handling Errors

The API now returns clear, actionable error messages:

```javascript
const handleSupportError = (status, message) => {
  switch(status) {
    case 400:
      if (message.includes('balance')) {
        showErrorUI('Not enough tokens. Earn more tokens to support.');
      } else if (message.includes('amount')) {
        showErrorUI('Invalid token amount. Please select 1-5 tokens.');
      }
      break;
    
    case 403:
      if (message.includes('approved')) {
        showErrorUI('Your account is not approved yet.');
      } else if (message.includes('citizen')) {
        showErrorUI('Only citizens can support projects.');
      } else if (message.includes('approved')) {
        showErrorUI('This project is not yet approved for support.');
      }
      break;
    
    case 404:
      showErrorUI('Project not found.');
      break;
    
    case 409:
      showErrorUI('You already support this project. Update your existing support.');
      break;
    
    default:
      showErrorUI('An unexpected error occurred. Please try again.');
  }
};
```

---

## Common Questions

**Q: Can I support a project multiple times?**
A: No, each citizen can only support a project once. But you can increase your support up to 5 tokens total.

**Q: What happens if I get an E11000 error?**
A: This is a database issue. Contact your backend team to run the fix script: `node scripts/fix-projectsupport-index.js`

**Q: How many tokens can I spend?**
A: 1-5 tokens per project maximum.

**Q: What if the project already has full funding?**
A: The API will return an error showing how many tokens the project still needs.

---

## Troubleshooting

**Issue: Getting 409 error on first support attempt**
- Backend team should run: `node scripts/fix-projectsupport-index.js`

**Issue: API returns raw MongoDB error**
- Update to the latest error handler middleware

**Issue: Status 403 "user not approved"**
- User needs to complete account approval before supporting

**Issue: Status 404 "project not found"**
- Verify project ID is correct
- Check if project exists and is active

---

**Last Updated:** March 2024
**API Version:** v1
