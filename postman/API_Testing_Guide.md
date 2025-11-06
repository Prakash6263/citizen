# Municipality Backend API Testing Guide - Phase 1 MVP

## 🚀 Quick Start

### Prerequisites
1. **Postman Desktop App** or **Postman Web** installed
2. **Backend server** running on `http://localhost:5000`
3. **Database** properly configured and seeded

### Import Collection
1. Open Postman
2. Click **Import** button
3. Select `Municipality_Backend_API.postman_collection.json`
4. Collection will appear in your workspace

## 📋 Testing Flow Guide - Phase 1 MVP

### 🎯 Complete User Journey Testing (Tax-based Token System)

Follow these flows in order to test the complete Phase 1 MVP experience as designed in Figma:

#### **FLOW 1: Authentication & Onboarding** 🔐
**Purpose**: Test complete user registration and login flow for all user types
**Figma Screens**: Registration, Login, Role Selection, Onboarding Tutorial

1. **1.1 Register Citizen**
   - Creates citizen account with tax information
   - **Key Fields**: `taxId`, `annualTaxContribution` (for token allocation)
   - **Test**: Verify 201 status and citizen role assignment
   - **Variables Set**: `userId`

2. **1.2 Register Social Project**
   - Creates social project/NGO account
   - **Key Fields**: `projectType`, `registrationNumber`
   - **Test**: Verify project role and pending approval status

3. **1.3 Register Municipality**
   - Creates government entity account
   - **Key Fields**: `governmentLevel`, `jurisdiction`, `officialId`
   - **Test**: Verify government role and administrative permissions

4. **1.4 Login User**
   - Authenticates any user type and gets tokens
   - **Test**: Verify 200 status and JWT tokens are returned
   - **Variables Set**: `accessToken`, `refreshToken`

#### **FLOW 2: Citizen Journey (Tax-based Token Allocation)** 👤
**Purpose**: Test citizen receiving tax-based tokens and allocating to projects
**Figma Screens**: Citizen Dashboard, Token Balance, Project Browser, Allocation Modal

1. **2.1 Get Citizen Dashboard**
   - Retrieve citizen dashboard with token balance and supported projects
   - **Test**: Verify token balance reflects tax contribution (1 token = $1 tax)

2. **2.2 Get Available Projects**
   - Browse social projects in citizen's city
   - **Test**: Verify filtering by city and active status works

3. **2.3 Allocate Tokens to Project**
   - Allocate tokens to social project (max 5 tokens per project)
   - **Key Logic**: Enforces 5-token limit per project per citizen
   - **Test**: Verify allocation limits and balance updates

4. **2.4 Get Token Balance**
   - Check current token balance and allocation history
   - **Test**: Verify balance decreases after allocation

5. **2.5 Get Supported Projects**
   - View list of projects citizen has supported
   - **Test**: Verify project appears in supported list after allocation

#### **FLOW 3: Social Project Management** 🏗️
**Purpose**: Test social project receiving tokens and providing updates
**Figma Screens**: Project Dashboard, Create Project, Progress Updates, Token Redemption

1. **3.1 Get Project Dashboard**
   - Retrieve project dashboard with received tokens and supporters
   - **Test**: Verify token balance from citizen allocations

2. **3.2 Create Project Profile**
   - Create detailed project profile for citizen browsing
   - **Key Fields**: `targetAmount`, `timeline`, `goals`
   - **Test**: Verify project creation and approval workflow

3. **3.3 Post Project Update**
   - Post progress updates with photos and milestones
   - **Key Feature**: News-feed style updates for transparency
   - **Test**: Verify media upload and milestone tracking

4. **3.4 Request Token Redemption**
   - Request to convert tokens back to fiat money from municipality
   - **Key Process**: Transfer tokens back to municipality for cash
   - **Test**: Verify redemption request with receipts and bank details

5. **3.5 Get Project Supporters**
   - View list of citizens who allocated tokens
   - **Test**: Verify supporter privacy and token amounts

#### **FLOW 4: Municipality Administration** 🏛️
**Purpose**: Test municipality issuing tokens and managing ecosystem
**Figma Screens**: Municipality Dashboard, Token Issuance, User Approvals, Ecosystem Overview

1. **4.1 Get Municipality Dashboard**
   - Retrieve municipality dashboard with token economy overview
   - **Test**: Verify total tokens issued, allocated, and redeemed

2. **4.2 Issue Tokens to Citizens**
   - Issue tokens based on citizen tax contributions
   - **Key Logic**: 1 token = $1 tax equivalent
   - **Test**: Verify token issuance based on `annualTaxContribution`

3. **4.3 Approve User Registrations**
   - Approve or reject citizen and project registrations
   - **Key Process**: Verification of tax IDs and NGO registrations
   - **Test**: Verify approval workflow and status updates

4. **4.4 Adjust Token Limits**
   - Modify token allocation limits and bonuses
   - **Key Settings**: Max tokens per project, high taxpayer bonuses
   - **Test**: Verify limit changes affect future allocations

5. **4.5 Process Token Redemptions**
   - Approve and process token redemption requests from projects
   - **Key Process**: Convert tokens back to fiat payments
   - **Test**: Verify redemption approval and payment processing

6. **4.6 Get Ecosystem Overview**
   - Complete overview of citizens, projects, and token flows
   - **Test**: Verify comprehensive ecosystem metrics

#### **FLOW 5: Global Admin Oversight** 🌐
**Purpose**: Test platform-wide administration and analytics
**Figma Screens**: Global Dashboard, Multi-Municipality Analytics, System Monitoring

1. **5.1 Get Global Analytics**
   - Platform-wide analytics across all municipalities
   - **Test**: Verify cross-municipality data aggregation

2. **5.2 Get All Municipalities**
   - List of all registered municipalities
   - **Test**: Verify municipality status and activity levels

3. **5.3 Monitor Token Economy**
   - Monitor token issuance, allocation, and redemption across platform
   - **Test**: Verify global token economy health metrics

#### **FLOW 6: Internal Token System (Phase 1)** 💰
**Purpose**: Test virtual token management (internal points system)
**Key Concept**: Tokens function like airline miles - internal virtual currency

1. **6.1 Get Token Statistics**
   - Comprehensive token economy statistics
   - **Test**: Verify token circulation and velocity metrics

2. **6.2 Get Token Transaction History**
   - Detailed transaction history for all token movements
   - **Test**: Verify complete audit trail of token flows

3. **6.3 Validate Token Allocation**
   - Validate allocation limits before processing
   - **Key Logic**: Enforce 5-token limit per project per citizen
   - **Test**: Verify validation prevents over-allocation

## 🔧 Environment Setup

### Variables Configuration
The collection uses these environment variables:

\`\`\`json
{
  "baseUrl": "http://localhost:5000/api",
  "accessToken": "",
  "refreshToken": "",
  "userId": "",
  "projectId": "",
  "governmentId": ""
}
\`\`\`

### Automatic Variable Management
- **Tokens**: Automatically set during login and refresh
- **IDs**: Automatically captured from responses
- **Manual Updates**: Update `baseUrl` for different environments

## 🧪 Phase 1 MVP Testing Best Practices

### 1. **Tax-based Token Flow Testing**
- Test token issuance based on tax contributions
- Verify 1 token = $1 tax equivalent calculation
- Test allocation limits (5 tokens per project per citizen)
- Verify token redemption back to municipality

### 2. **User Type Workflow Testing**
Test complete workflows for each user type:
- **Citizen**: Registration → Tax verification → Token receipt → Project allocation
- **Social Project**: Registration → Approval → Token receipt → Progress updates → Redemption
- **Municipality**: Setup → Citizen approval → Token issuance → Redemption processing
- **Global Admin**: Multi-municipality monitoring and analytics

### 3. **Internal Token System Validation**
- Verify tokens are virtual (no blockchain in Phase 1)
- Test token balance calculations
- Verify transaction history accuracy
- Test allocation and redemption limits

### 4. **Approval Workflow Testing**
- Test municipality approval of citizens and projects
- Verify tax ID validation for citizens
- Test NGO registration verification for projects

## 📊 Expected Response Formats

### Success Responses
\`\`\`json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ }
}
\`\`\`

### Token Balance Response
\`\`\`json
{
  "success": true,
  "data": {
    "balance": 95,
    "allocated": 5,
    "totalReceived": 100,
    "basedOnTaxContribution": 2500,
    "tokenValue": 1
  }
}
\`\`\`

### Token Allocation Response
\`\`\`json
{
  "success": true,
  "data": {
    "transactionId": "txn_123456",
    "amount": 5,
    "projectId": "proj_789",
    "remainingBalance": 95,
    "allocationLimit": 5,
    "limitReached": true
  }
}
\`\`\`

## 🚨 Phase 1 MVP Specific Issues & Solutions

### Token Allocation Issues
- **Problem**: Cannot allocate more than 5 tokens to same project
- **Solution**: This is by design - Phase 1 MVP limit
- **Fix**: Allocate to different projects or wait for municipality limit adjustment

### Tax-based Token Calculation
- **Problem**: Token amount doesn't match tax contribution
- **Solution**: Verify municipality has issued tokens based on tax data
- **Fix**: Check `annualTaxContribution` field and municipality token issuance

### Redemption Process
- **Problem**: Token redemption request rejected
- **Solution**: Ensure proper receipts and bank details provided
- **Fix**: Municipality must approve redemption requests manually

### User Approval Workflow
- **Problem**: Cannot access features after registration
- **Solution**: Municipality must approve user registration first
- **Fix**: Contact municipality admin or use admin flow to approve

## 🔄 Phase 1 to Phase 2 Preparation

### Current Internal Token System
- Virtual tokens managed within platform
- Fixed value: 1 token = $1 tax equivalent
- Manual municipality redemption process
- Internal transaction tracking

### Future Blockchain Integration (Phase 2)
- Migration to blockchain-based tokens
- Smart contract automation
- Enhanced transparency and auditability
- Automated redemption processes

---

**Phase 1 MVP Testing Complete! 🎉**

This testing guide covers the complete tax-based token allocation system for Phase 1. For Phase 2 blockchain integration planning, refer to the technical documentation.
