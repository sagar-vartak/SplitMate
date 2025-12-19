-- Supabase Database Setup Script
-- Run this in Supabase SQL Editor

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

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read all users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can read groups they're members of" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Users can update groups they created" ON groups;
DROP POLICY IF EXISTS "Users can read expenses in their groups" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can create expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update expenses in their groups" ON expenses;

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

