# Google OAuth Setup for Supabase

## Quick Setup Guide

### Step 1: Configure Google OAuth in Supabase

1. **Go to Supabase Dashboard**
   - Sign in at [supabase.com](https://supabase.com)
   - Select your project

2. **Enable Google Provider**
   - Go to **Authentication** → **Providers**
   - Find **"Google"** in the list
   - Toggle **"Enable Google provider"** to ON

3. **Get Google OAuth Credentials**
   - You'll need to create OAuth credentials in Google Cloud Console
   - Follow the steps below to get your Client ID and Client Secret

### Step 2: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit [console.cloud.google.com](https://console.cloud.google.com)
   - Sign in with your Google account

2. **Create a Project** (if you don't have one)
   - Click the project dropdown at the top
   - Click **"New Project"**
   - Enter a name (e.g., "SplitMate")
   - Click **"Create"**

3. **Enable Google+ API**
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API" or "Google Identity"
   - Click on it and click **"Enable"**

4. **Configure OAuth Consent Screen**
   - Go to **APIs & Services** → **OAuth consent screen**
   - Select **"External"** (unless you have a Google Workspace)
   - Click **"Create"**
   - Fill in:
     - **App name**: SplitMate
     - **User support email**: Your email
     - **Developer contact information**: Your email
   - Click **"Save and Continue"**
   - On **Scopes** page, click **"Save and Continue"** (default scopes are fine)
   - On **Test users** page, add your email, then click **"Save and Continue"**
   - Review and click **"Back to Dashboard"**

5. **Create OAuth Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Click **"Create Credentials"** → **"OAuth client ID"**
   - Select **"Web application"**
   - Name: `SplitMate Web`
   - **Authorized JavaScript origins**: Add:
     ```
     https://YOUR_PROJECT_REF.supabase.co
     ```
     (Replace `YOUR_PROJECT_REF` with your Supabase project reference)
   - **Authorized redirect URIs**: Add:
     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     ```
   - Click **"Create"**
   - **Copy the Client ID and Client Secret**

### Step 3: Add Credentials to Supabase

1. **Back in Supabase Dashboard**
   - Go to **Authentication** → **Providers** → **Google**
   - Paste your **Client ID** and **Client Secret** from Google Cloud Console
   - Click **"Save"**

### Step 4: Configure Redirect URLs in Supabase

1. **Go to Authentication Settings**
   - Click **Authentication** → **URL Configuration**
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: Add:
     ```
     http://localhost:3000
     http://localhost:3000/**
     http://localhost:3000/auth/callback
     ```
   - Click **"Save"**

### Step 5: Test It Out

1. **Restart your dev server**:
   ```bash
   npm run dev
   ```

2. **Try signing in**:
   - Go to `http://localhost:3000`
   - Click "Sign in with Google"
   - You should be redirected to Google sign-in
   - After signing in, you'll be redirected back to your app

## Troubleshooting

### "redirect_uri_mismatch" error
- Make sure you added the correct redirect URI in Google Cloud Console:
  - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- Check that your Supabase project reference is correct

### "Access blocked: This app's request is invalid"
- Make sure you added your email as a test user in OAuth consent screen
- Or publish your app (if you want it public)

### Not redirecting back to app
- Check that redirect URLs are set correctly in Supabase
- Make sure Site URL is set to `http://localhost:3000`

### Still having issues?
- Check browser console for errors
- Verify all URLs match exactly (no trailing slashes)
- Make sure you saved all changes in both Google Cloud Console and Supabase

## Production Deployment

When deploying to production:
1. Add your production domain to Google OAuth authorized origins
2. Add production redirect URI: `https://YOUR_DOMAIN/auth/callback`
3. Update Supabase Site URL and Redirect URLs to your production domain

That's it! Your Google OAuth should work now. 🎉

