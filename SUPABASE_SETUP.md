# Supabase Setup Guide - Completely Free Alternative

Supabase is an open-source Firebase alternative with a **generous free tier** that includes:
- ✅ 500 MB database storage
- ✅ 2 GB bandwidth per month
- ✅ 50,000 monthly active users
- ✅ Real-time subscriptions
- ✅ Built-in authentication (email, OAuth, magic links)
- ✅ No credit card required for free tier

## Step 1: Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign up"**
3. Sign up with GitHub (recommended) or email
4. Verify your email if needed

## Step 2: Create a New Project

1. Click **"New Project"**
2. Fill in the details:
   - **Name**: `splitwise-clone` (or any name)
   - **Database Password**: Create a strong password (save it somewhere safe)
   - **Region**: Choose the closest to you
3. Click **"Create new project"**
4. Wait 2-3 minutes for the project to be created

## Step 3: Get Your API Keys

1. Once your project is ready, go to **Settings** (gear icon) → **API**
2. You'll see:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: A long string starting with `eyJ...`
   - **service_role key**: (Keep this secret, don't use in frontend)

3. Copy these values - you'll need them for `.env.local`

## Step 4: Set Up Authentication

1. Go to **Authentication** → **Providers** in the left sidebar
2. Enable **Email** provider (already enabled by default)
3. Optionally enable **Google** provider:
   - Click on **Google**
   - Toggle **"Enable Google provider"**
   - You'll need Google OAuth credentials (optional, can skip for now)
   - For now, email authentication is enough

## Step 5: Create Database Tables

1. Go to **SQL Editor** in the left sidebar
2. Click **"New query"**
3. Copy and paste this SQL:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  members TEXT[] NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  paid_by TEXT NOT NULL,
  split_among TEXT[] NOT NULL,
  split_type TEXT NOT NULL CHECK (split_type IN ('equal', 'unequal', 'percentage')),
  splits JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read all users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create policies for groups table
CREATE POLICY "Users can read groups they're members of"
  ON groups FOR SELECT
  USING (
    auth.uid()::text = ANY(members) OR
    created_by = auth.uid()
  );

CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update groups they created"
  ON groups FOR UPDATE
  USING (created_by = auth.uid());

-- Create policies for expenses table
CREATE POLICY "Users can read expenses in their groups"
  ON expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = expenses.group_id
      AND (auth.uid()::text = ANY(groups.members) OR groups.created_by = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can create expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update expenses in their groups"
  ON expenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = expenses.group_id
      AND (auth.uid()::text = ANY(groups.members) OR groups.created_by = auth.uid())
    )
  );
```

4. Click **"Run"** (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned"

## Step 6: Set Up Environment Variables

1. Create a `.env.local` file in your project root
2. Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace with your actual values from Step 3.

## Step 7: Install Dependencies

Run:
```bash
npm install @supabase/supabase-js
```

## Step 8: Test It Out

1. Run `npm run dev`
2. Go to `http://localhost:3000`
3. Sign up with your email
4. Check your email for the confirmation link
5. Sign in and start using the app!

## Free Tier Limits

- **Database**: 500 MB storage
- **Bandwidth**: 2 GB/month
- **Auth**: 50,000 monthly active users
- **API Requests**: Unlimited (with rate limiting)
- **Real-time**: Included

For most personal/small projects, this is more than enough!

## Troubleshooting

### "Invalid API key"
- Make sure you're using the `anon` key, not the `service_role` key
- Check that `.env.local` has the correct values

### "Row Level Security policy violation"
- Make sure you ran all the SQL policies from Step 5
- Check that you're authenticated (signed in)

### "Email not confirmed"
- Check your email for the confirmation link
- In Supabase Dashboard → Authentication → Users, you can manually confirm users

## Next Steps

- The code has been updated to use Supabase
- Just follow the steps above and you're good to go!
- No credit card required, completely free!

