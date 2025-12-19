# Fix 404 Error for Users Table

## The Problem
You're seeing a `404 Not Found` error when trying to fetch user data from Supabase. This happens because:
1. The user profile doesn't exist in the `users` table yet (first time signing in)
2. The code is now handling this gracefully

## What I Fixed

1. **Updated `getUser` function**: Now treats 404 errors as "user not found" instead of throwing an error
2. **Updated `saveUser` function**: Better error handling - won't crash if save fails
3. **Auto-create user profile**: When a user signs in but doesn't have a profile, it's automatically created

## Verify Your Database Setup

Make sure you've run the SQL script to create the tables:

1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL from `supabase-setup.sql`
3. Make sure the `users` table exists

## Check RLS Policies

The 404 might also be caused by Row Level Security (RLS) policies blocking access. Check:

1. Go to Supabase Dashboard → Authentication → Policies
2. Make sure the `users` table has these policies:
   - **SELECT**: `Users can read all users` - should allow `true`
   - **INSERT**: `Users can insert their own profile` - should check `auth.uid() = id`
   - **UPDATE**: `Users can update their own profile` - should check `auth.uid() = id`

If these policies don't exist, run the SQL from `supabase-setup.sql` again.

## Test It

1. **Clear your browser cache** (or use incognito mode)
2. **Sign in with Google again**
3. The 404 error should still appear in the console (it's expected on first sign-in)
4. But the app should continue working and create your profile automatically
5. On subsequent page loads, the 404 should disappear

## What Happens Now

1. User signs in with Google → Gets authenticated
2. App tries to fetch user profile → Gets 404 (user doesn't exist yet)
3. App creates user profile automatically → Saves to database
4. Next time → Profile exists, no more 404

The 404 error on first sign-in is **normal and expected**. The app now handles it gracefully and creates the profile automatically.

