# Google Cloud Setup Guide for Splitwise Clone

This guide will walk you through setting up Google Cloud Firestore (database) and Google OAuth (authentication) for your Splitwise Clone app.

## Prerequisites

- A Google account
- Node.js and npm installed
- A domain or you can use localhost for development

## Part 1: Google Cloud Project Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter project name: `splitwise-clone` (or any name you prefer)
5. Click **"Create"**
6. Wait for the project to be created and select it

### Step 2: Enable Required APIs

1. In the Google Cloud Console, go to **"APIs & Services"** → **"Library"**
2. Search for and enable the following APIs:
   - **Firebase API** (or use Firebase Console directly)
   - **Google Identity** (for OAuth)

### Step 3: Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Select your Google Cloud project from the dropdown (the one you just created)
4. Click **"Continue"**
5. **Disable** Google Analytics (optional, you can enable it later if needed)
6. Click **"Create project"**
7. Wait for Firebase to initialize (takes 1-2 minutes)
8. Click **"Continue"** when ready

## Part 2: Firestore Database Setup

### Step 4: Create Firestore Database

1. In Firebase Console, click on **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Select **"Start in test mode"** (for development)
   - ⚠️ **Important**: Test mode allows anyone to read/write. We'll add security rules later.
4. Choose a location for your database (choose the closest to you)
   - Recommended: `us-central` or `europe-west`
5. Click **"Enable"**
6. Wait for the database to be created

### Step 5: Set Up Firestore Security Rules

1. In Firestore, go to the **"Rules"** tab
2. Replace the default rules with these (more secure):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Groups collection - users can read groups they're members of
    match /groups/{groupId} {
      allow read: if request.auth != null && 
        (resource.data.members.hasAny([request.auth.uid]) || 
         request.auth.uid == resource.data.createdBy);
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.createdBy;
    }
    
    // Expenses collection - users can read expenses in groups they're members of
    match /expenses/{expenseId} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null;
    }
  }
}
```

3. Click **"Publish"**

## Part 3: Google Authentication Setup

### Step 6: Enable Google Sign-In

1. In Firebase Console, go to **"Authentication"** in the left sidebar
2. Click **"Get started"**
3. Click on **"Sign-in method"** tab
4. Click on **"Google"** provider
5. Toggle **"Enable"** to ON
6. Enter a project support email (your email)
7. Click **"Save"**

### Step 7: Configure OAuth Consent Screen

1. Go back to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **"APIs & Services"** → **"OAuth consent screen"**
3. Select **"External"** (unless you have a Google Workspace account)
4. Click **"Create"**
5. Fill in the required information:
   - **App name**: `Splitwise Clone`
   - **User support email**: Your email
   - **Developer contact information**: Your email
6. Click **"Save and Continue"**
7. On **"Scopes"** page, click **"Save and Continue"** (default scopes are fine)
8. On **"Test users"** page, add your email as a test user (if in testing mode)
9. Click **"Save and Continue"**
10. Review and click **"Back to Dashboard"**

### Step 8: Create OAuth Credentials

1. In Google Cloud Console, go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **"Web application"**
4. Enter a name: `Splitwise Clone Web Client`
5. Add **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `http://localhost:3001` (if you use a different port)
   - Add your production domain later if you deploy
6. Add **Authorized redirect URIs**:
   - `http://localhost:3000`
   - `http://localhost:3000/auth/callback` (if needed)
7. Click **"Create"**
8. **Copy the Client ID** - you'll need this for your `.env.local` file

## Part 4: Get Firebase Configuration

### Step 9: Get Firebase Web App Config

1. In Firebase Console, click the gear icon ⚙️ next to **"Project Overview"**
2. Select **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **"</>"** (Web) icon to add a web app
5. Register app:
   - App nickname: `Splitwise Clone Web`
   - Check **"Also set up Firebase Hosting"** (optional)
6. Click **"Register app"**
7. **Copy the Firebase configuration object** - it looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

8. You'll need these values for your `.env.local` file

## Part 5: Environment Variables

### Step 10: Create Environment File

Create a `.env.local` file in your project root with:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-oauth-client-id-here
```

Replace all the values with your actual Firebase and OAuth credentials.

## Part 6: Install Dependencies

Run these commands in your project:

```bash
npm install firebase
npm install @next/font
```

## Part 7: Production Deployment (Optional but Recommended)

### For Production:

1. **Update OAuth Consent Screen**:
   - Go to Google Cloud Console → OAuth consent screen
   - Add your production domain to authorized origins
   - Submit for verification (if making it public)

2. **Update Firestore Rules** for production:
   - Make security rules more restrictive
   - Test thoroughly before going live

3. **Add Production URLs**:
   - Add your production domain to OAuth authorized origins
   - Update Firebase authorized domains

## Troubleshooting

### Common Issues:

1. **"Firebase: Error (auth/unauthorized-domain)"**
   - Solution: Add your domain to Firebase Console → Authentication → Settings → Authorized domains

2. **"OAuth client not found"**
   - Solution: Make sure you copied the correct Client ID from Google Cloud Console

3. **"Permission denied" in Firestore**
   - Solution: Check your Firestore security rules and make sure the user is authenticated

4. **Data not syncing across devices**
   - Solution: Make sure you're using Firestore (not localStorage) and the user is logged in with the same Google account

## Next Steps

After completing these steps:
1. Install the npm dependencies
2. Create the `.env.local` file with your credentials
3. The code will be updated to use Firebase and Google Auth
4. Run `npm run dev` and test the authentication

## Security Notes

⚠️ **Important Security Considerations**:

1. Never commit `.env.local` to git (it's already in `.gitignore`)
2. For production, use environment variables in your hosting platform
3. Regularly review Firestore security rules
4. Monitor Firebase usage to avoid unexpected costs
5. Set up billing alerts in Google Cloud Console

## Cost Information

- **Firestore**: Free tier includes 50K reads, 20K writes, 20K deletes per day
- **Authentication**: Free for up to 50K monthly active users
- **Google Cloud**: $300 free credit for new accounts

Most small to medium apps will stay within the free tier.

