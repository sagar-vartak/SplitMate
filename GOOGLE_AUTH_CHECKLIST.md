# Google OAuth Setup Checklist

Based on your logs, the requests are successful (200 status codes), which is good! But let's verify your Google OAuth setup is complete.

## ✅ What Your Logs Show

- `GET /auth/callback 200` ✅ - Callback page is loading
- `GET /dashboard 200` ✅ - Dashboard is accessible
- `GET / 200` ✅ - Home page works

The 404s for `.well-known/appspecific/com.chrome.devtools.json` are **normal** - just Chrome DevTools looking for a config file. Ignore them.

## 🔍 Google OAuth Configuration Checklist

### 1. Supabase Dashboard Settings

Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**:

- [ ] **Site URL**: Should be `http://localhost:3000`
- [ ] **Redirect URLs**: Should include:
  - `http://localhost:3000`
  - `http://localhost:3000/**`
  - `http://localhost:3000/auth/callback`

### 2. Google Provider in Supabase

Go to **Supabase Dashboard** → **Authentication** → **Providers** → **Google**:

- [ ] **Enable Google provider**: Toggle should be ON
- [ ] **Client ID**: Should have your Google OAuth Client ID
- [ ] **Client Secret**: Should have your Google OAuth Client Secret
- [ ] **Save** button clicked

### 3. Google Cloud Console Settings

Go to **Google Cloud Console** → **APIs & Services** → **Credentials**:

- [ ] **OAuth 2.0 Client ID** created
- [ ] **Authorized JavaScript origins** includes:
  - `https://YOUR_PROJECT_REF.supabase.co`
  - `http://localhost:3000` (for development)
- [ ] **Authorized redirect URIs** includes:
  - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
  - (This is the Supabase callback, not your app's callback)

### 4. OAuth Consent Screen

Go to **Google Cloud Console** → **APIs & Services** → **OAuth consent screen**:

- [ ] App name filled in
- [ ] Your email added as a **Test user** (if app is in testing mode)
- [ ] Or app is **Published** (if you want it public)

## 🧪 Test the Flow

1. **Clear browser cache** or use incognito mode
2. Go to `http://localhost:3000`
3. Click "Sign in with Google"
4. **Expected flow**:
   - Redirects to Google sign-in
   - You sign in with Google
   - Redirects to Supabase: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
   - Supabase processes it
   - Redirects to your app: `http://localhost:3000/auth/callback?code=...`
   - Your app exchanges code for session
   - Redirects to dashboard

## 🐛 Common Issues

### Issue: "redirect_uri_mismatch"
**Solution**: Make sure Google Cloud Console has:
- `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

### Issue: "Access blocked"
**Solution**: Add your email as a test user in OAuth consent screen

### Issue: Stuck on callback page
**Solution**: Check browser console for errors. The code I updated should handle hash fragments now.

### Issue: No code in URL
**Solution**: Check Supabase redirect URLs are set correctly

## 📝 What I Just Fixed

1. **Hash fragment support**: Updated callback to read code from both query params (`?code=...`) and hash fragments (`#code=...`)
2. **Better user profile creation**: Improved error handling when creating user profile
3. **Better logging**: More detailed error messages

## ✅ Quick Test

Open browser console (F12) and check:
- Are there any red errors?
- When you sign in, do you see the code in the URL?
- Does it redirect to dashboard successfully?

If everything works, you're all set! 🎉

