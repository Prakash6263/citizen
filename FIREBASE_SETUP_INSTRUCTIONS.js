/**
 * FIREBASE CLOUD MESSAGING SETUP INSTRUCTIONS
 * 
 * IMPORTANT: Firebase credentials contain private keys and must NEVER be committed to git.
 * Follow one of these methods to securely configure Firebase.
 */

// ============================================================================
// METHOD 1: ENVIRONMENT VARIABLE (RECOMMENDED FOR PRODUCTION & VERCEL)
// ============================================================================
// Set FIREBASE_SERVICE_ACCOUNT_JSON as an environment variable with the full JSON
// 
// Steps:
// 1. Get your Firebase service account JSON from Firebase Console
// 2. Convert it to a single-line JSON string
// 3. In Vercel/Production environment, set:
//    FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"citixen-app",...}'
// 
// Example in Vercel:
// - Go to Project Settings → Environment Variables
// - Add: FIREBASE_SERVICE_ACCOUNT_JSON = (paste your full JSON string)
// 
// The firebaseService.js will automatically load from this env var.

// ============================================================================
// METHOD 2: FILE PATH (DEVELOPMENT ONLY)
// ============================================================================
// For local development, use a local credentials file
// 
// Steps:
// 1. Obtain your Firebase service account JSON file from Firebase Console:
//    - Go to Firebase Console → Project Settings → Service Accounts
//    - Click "Generate New Private Key"
//    - Save as: citixen-app-firebase-adminsdk.json in project root
// 
// 2. The file is already in .gitignore, so it won't be committed
// 
// 3. The service will auto-load from:
//    - First: FIREBASE_SERVICE_ACCOUNT_PATH environment variable
//    - Then: ./citixen-app-firebase-adminsdk.json (project root)
// 
// Example .env.development.local:
// FIREBASE_SERVICE_ACCOUNT_PATH='citixen-app-firebase-adminsdk.json'

// ============================================================================
// STEP-BY-STEP SETUP
// ============================================================================

/*
1. GET FIREBASE SERVICE ACCOUNT JSON
   ─────────────────────────────────────
   a) Go to: https://console.firebase.google.com/
   b) Select your "citixen-app" project
   c) Click ⚙️ Settings → Service Accounts
   d) Click "Generate New Private Key" button
   e) A JSON file will download (citixen-app-firebase-adminsdk-xxx.json)

2. FOR LOCAL DEVELOPMENT
   ─────────────────────────────────────
   a) Place the JSON file in project root:
      /vercel/share/v0-project/citixen-app-firebase-adminsdk.json
   
   b) Make sure .gitignore includes it (already done):
      *firebase-adminsdk*.json
   
   c) Optional: Add to .env.development.local
      FIREBASE_SERVICE_ACCOUNT_PATH='citixen-app-firebase-adminsdk.json'
   
   d) Start server: npm run dev
   
   e) Firebase will initialize automatically on startup

3. FOR VERCEL/PRODUCTION
   ─────────────────────────────────────
   a) Go to Vercel Project → Settings → Environment Variables
   
   b) Create new environment variable:
      Name: FIREBASE_SERVICE_ACCOUNT_JSON
      Value: (paste entire JSON content from the file)
      
   c) Make sure to select environments: Production, Preview, Development
   
   d) Deploy - Firebase will auto-initialize on startup

4. FOR GITHUB ACTIONS / CI/CD
   ─────────────────────────────────────
   a) Go to GitHub → Repository Settings → Secrets and Variables → Actions
   
   b) Create new secret:
      Name: FIREBASE_SERVICE_ACCOUNT_JSON
      Value: (paste entire JSON content)
   
   c) In your workflow, use:
      env:
        FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}
*/

// ============================================================================
// TEST FIREBASE SETUP
// ============================================================================

/*
Once configured, test Firebase notifications:

1. Via cURL - Send test notification:
   
   curl -X POST http://localhost:5000/api/notifications/test \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "title": "Test Notification",
       "body": "Firebase is working!"
     }'

2. Expected Response:
   {
     "status": "success",
     "message": "Notification sent successfully",
     "messageId": "message_id_string"
   }

3. Check your device/app for the notification

4. If it fails:
   - Check server logs for Firebase initialization errors
   - Verify credentials file exists (development) or env var is set (production)
   - Verify FCM token is registered on the device
   - Check Firebase Console → Cloud Messaging for quota/errors
*/

// ============================================================================
// COMMON ISSUES & FIXES
// ============================================================================

/*
ISSUE: "Firebase credentials not found"
FIX: 
  - Development: Place JSON file in project root
  - Production: Set FIREBASE_SERVICE_ACCOUNT_JSON env var
  - Check file permissions (readable by Node.js process)

ISSUE: "Invalid service account"
FIX:
  - Verify JSON is not corrupted
  - Try downloading new key from Firebase Console
  - Check project_id matches in firebaseService.js logs

ISSUE: "Notification not received on device"
FIX:
  - Verify user has FCM token stored in database
  - Check user device registered app with Firebase
  - Verify FCM token is for correct Firebase project
  - Check Firebase Cloud Messaging is enabled

ISSUE: "GitHub blocked push due to secrets"
FIX:
  - Never commit credentials file to git
  - Use .gitignore (already configured)
  - Use environment variables in production instead
  - GitHub will scan and block pushes with leaked secrets
*/

// ============================================================================
// FILE LOADING LOGIC (firebaseService.js)
// ============================================================================

/*
The service tries credentials in this order:

1. FIREBASE_SERVICE_ACCOUNT_JSON env var (JSON string)
   ↓ If not set
2. FIREBASE_SERVICE_ACCOUNT_PATH env var (file path)
   ↓ If not found
3. ./citixen-app-firebase-adminsdk.json (local file, development only)
   ↓ If not found
4. Error: Firebase credentials not found

This ensures flexibility across all environments.
*/

module.exports = {
  // This file is documentation only - no exports
  // All actual Firebase initialization happens in src/utils/firebaseService.js
}
