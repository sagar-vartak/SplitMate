# Fix Email Confirmation Link Issue

## The Problem
You're getting redirected to: `http://localhost:3000/#error=access_denied&error_code=otp_expired`

This happens because Supabase needs to know where to redirect users after they click the email confirmation link.

## The Solution

### Step 1: Configure Supabase Redirect URLs

1. **Go to your Supabase Dashboard**
   - Sign in at [supabase.com](https://supabase.com)
   - Select your project

2. **Open Authentication Settings**
   - Click **"Authentication"** in the left sidebar
   - Click **"URL Configuration"** (or go to Settings → Authentication → URL Configuration)

3. **Add Redirect URLs**
   - Under **"Redirect URLs"**, add these URLs (one per line):
     ```
     http://localhost:3000
     http://localhost:3000/**
     http://localhost:3000/auth/callback
     ```
   
   - Under **"Site URL"**, set it to:
     ```
     http://localhost:3000
     ```

4. **Save Changes**
   - Click **"Save"** at the bottom

### Step 2: Disable Email Confirmation (Optional - for testing)

If you want to test without email confirmation:

1. Go to **Authentication** → **Providers** → **Email**
2. Toggle **"Confirm email"** to OFF
3. Click **"Save"**

This way, users can sign up and immediately sign in without confirming their email.

### Step 3: Create Auth Callback Page (Recommended)

Create a callback page to handle the email confirmation redirect:

1. Create the file: `app/auth/callback/page.tsx`
2. Copy the code from the file I'll create below
3. This will handle the redirect properly

### Step 4: Test Again

1. Try signing up again
2. If you disabled email confirmation, you can sign in immediately
3. If email confirmation is enabled, check your email and click the link

## Alternative: Use Magic Link (No Password)

You can also use Supabase's magic link feature which doesn't require passwords:

1. Go to **Authentication** → **Providers** → **Email**
2. Enable **"Magic Link"**
3. Users can sign in by just entering their email (no password needed)

## Troubleshooting

### Still getting errors?
- Make sure you saved the URL configuration in Supabase
- Clear your browser cache
- Try in an incognito/private window
- Check that your `.env.local` has the correct Supabase URL

### Email not arriving?
- Check your spam folder
- In Supabase Dashboard → Authentication → Users, you can manually confirm users
- Or disable email confirmation for testing

