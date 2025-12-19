# SQL Setup Instructions - Step by Step

## The Problem
If you're getting a syntax error when running the SQL, it's likely due to how it's being copied/pasted. Follow these steps carefully.

## Solution: Run SQL in Parts

Instead of running everything at once, run it in smaller chunks. This is safer and easier to debug.

### Step 1: Create Tables

Copy and paste this into Supabase SQL Editor and click "Run":

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  members TEXT[] NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
```

### Step 2: Enable RLS

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
```

### Step 3: Create User Policies

```sql
DROP POLICY IF EXISTS "Users can read all users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

CREATE POLICY "Users can read all users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### Step 4: Create Group Policies

```sql
DROP POLICY IF EXISTS "Users can read groups they're members of" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Users can update groups they created" ON groups;

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
```

### Step 5: Create Expense Policies

```sql
DROP POLICY IF EXISTS "Users can read expenses in their groups" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can create expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update expenses in their groups" ON expenses;

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

## Alternative: Use the Clean SQL File

I've also created `supabase-setup-clean.sql` which has no comments. You can:
1. Open that file
2. Copy all the SQL (Cmd+A, Cmd+C)
3. Paste into Supabase SQL Editor
4. Click "Run"

## Troubleshooting

### If you still get errors:

1. **Check for invisible characters**: Make sure you're copying from the file, not from a browser
2. **Run one statement at a time**: If the full script fails, try running each CREATE TABLE separately
3. **Check existing tables**: Go to Table Editor and see if tables already exist
4. **Check existing policies**: Go to Authentication → Policies and see what's there

### Common Errors:

- **"relation already exists"**: Tables already created, skip that part
- **"policy already exists"**: Policies already exist, the DROP statements should handle this
- **"syntax error"**: Make sure you're copying the SQL exactly, no extra characters

## Verify It Worked

After running the SQL:
1. Go to **Table Editor** in Supabase
2. You should see three tables: `users`, `groups`, `expenses`
3. Go to **Authentication** → **Policies**
4. You should see policies for each table

That's it! Your database should be ready. 🎉

