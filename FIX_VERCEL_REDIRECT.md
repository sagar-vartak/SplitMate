# Fix Authentication Redirect on Vercel

## The Problem
After deploying to Vercel, authentication redirects back to `localhost` instead of your Vercel URL.

## The Solution

You need to update your **Supabase redirect URLs** to include your Vercel domain.

### Step 1: Get Your Vercel URL

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Copy your deployment URL (e.g., `https://your-project.vercel.app`)

### Step 2: Update Supabase Redirect URLs

1. **Go to Supabase Dashboard**
   - Sign in at [supabase.com](https://supabase.com)
   - Select your project

2. **Open Authentication Settings**
   - Click **"Authentication"** in the left sidebar
   - Click **"URL Configuration"** (or Settings → Authentication → URL Configuration)

3. **Update Site URL**
   - Change **Site URL** from `http://localhost:3000` to:
     ```
     https://your-project.vercel.app
     ```
     (Replace with your actual Vercel URL)

4. **Update Redirect URLs**
   - In the **Redirect URLs** field, add these URLs (one per line):
     ```
     http://localhost:3000
     http://localhost:3000/**
     http://localhost:3000/auth/callback
     https://your-project.vercel.app
     https://your-project.vercel.app/**
     https://your-project.vercel.app/auth/callback
     ```
     (Replace `your-project.vercel.app` with your actual Vercel URL)

5. **Save Changes**
   - Click **"Save"** at the bottom

### Step 3: Verify Environment Variables on Vercel

Make sure your Vercel project has the correct environment variables:

1. **Go to Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. **Verify these are set:**
   - `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon key

3. **If missing, add them:**
   - Get values from: Supabase Dashboard → Settings → API
   - Add them in Vercel
   - **Redeploy** after adding (Vercel will prompt you)

### Step 4: Test Authentication

1. Visit your Vercel URL: `https://your-project.vercel.app`
2. Click "Sign in with Google"
3. Complete the sign-in
4. You should be redirected back to your Vercel URL (not localhost)

## Why This Happens

- Your code already uses `window.location.origin` which automatically detects the current domain
- The issue is that **Supabase** needs to know which URLs are allowed for redirects
- Supabase was configured for `localhost` during development
- Now it needs your production Vercel URL added to the allowed list

## Quick Checklist

- [ ] Updated Supabase Site URL to Vercel URL
- [ ] Added Vercel URL to Supabase Redirect URLs
- [ ] Kept localhost URLs (for local development)
- [ ] Verified environment variables in Vercel
- [ ] Tested authentication on Vercel

## Still Not Working?

1. **Clear browser cache** or use incognito mode
2. **Check browser console** for any errors
3. **Verify the redirect URL** in the OAuth flow matches your Vercel URL
4. **Wait a few minutes** - Supabase changes can take a moment to propagate

## Custom Domain?

If you've set up a custom domain on Vercel:

1. Add your custom domain to Supabase Redirect URLs:
   ```
   https://your-custom-domain.com
   https://your-custom-domain.com/**
   https://your-custom-domain.com/auth/callback
   ```

2. Update Site URL to your custom domain

---

**That's it!** Your authentication should now work correctly on Vercel. 🎉

