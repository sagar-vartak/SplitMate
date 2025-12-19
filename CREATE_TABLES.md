# Quick Fix: Create Database Tables

## The Problem
You're seeing the error: **"Could not find the table 'public.users' in the schema cache"**

This means the database tables haven't been created yet in your Supabase project.

## The Solution (2 minutes)

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open your Supabase Dashboard**
   - Go to [supabase.com](https://supabase.com) and sign in
   - Select your project

2. **Open SQL Editor**
   - Click on **"SQL Editor"** in the left sidebar
   - Click **"New query"**

3. **Copy and Run the SQL**
   - Open the file `supabase-setup.sql` in this project
   - Copy ALL the SQL code
   - Paste it into the SQL Editor
   - Click **"Run"** (or press Cmd/Ctrl + Enter)

4. **Verify Success**
   - You should see "Success. No rows returned"
   - If you see any errors, make sure you copied the entire SQL script

5. **Check Tables**
   - Go to **"Table Editor"** in the left sidebar
   - You should now see three tables: `users`, `groups`, and `expenses`

### Option 2: Using Cursor/VS Code (If you have Supabase extension)

1. Open the `supabase-setup.sql` file
2. Right-click and select "Run SQL" or use the Supabase extension command
3. Make sure you're connected to the correct Supabase project

## After Running the SQL

1. **Restart your dev server** (if it's running):
   ```bash
   # Stop the server (Ctrl+C) and restart
   npm run dev
   ```

2. **Try signing up again**
   - Go to `http://localhost:3000`
   - Fill in the sign-up form
   - It should work now! 🎉

## Troubleshooting

### "relation already exists"
- This means some tables already exist. The script uses `CREATE TABLE IF NOT EXISTS` so it's safe to run again.

### "permission denied"
- Make sure you're running the SQL as the project owner
- Check that you're in the correct Supabase project

### Still getting errors?
- Make sure your `.env.local` file has the correct Supabase URL and API key
- Check that you're connected to the right Supabase project
- Restart your dev server after creating the tables

## What This SQL Does

1. Creates three tables:
   - `users` - Stores user profiles
   - `groups` - Stores expense groups
   - `expenses` - Stores individual expenses

2. Sets up security:
   - Enables Row Level Security (RLS)
   - Creates policies so users can only access their own data

3. Sets up relationships:
   - Groups reference users
   - Expenses reference groups

That's it! Once you run this SQL, your app should work perfectly. 🚀

