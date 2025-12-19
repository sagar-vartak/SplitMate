# Add Currency Column Migration

## Problem
The currency setting in group settings wasn't being saved or displayed because the database table was missing the `currency` column.

## Solution

### Step 1: Run the Migration SQL

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Run the following SQL:

```sql
-- Add currency column to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Update RLS policy to allow group members to update groups (for currency changes)
DROP POLICY IF EXISTS "Users can update groups they created" ON groups;

CREATE POLICY "Users can update groups they're members of"
  ON groups FOR UPDATE
  USING (
    auth.uid()::text = ANY(members) OR
    created_by = auth.uid()
  );
```

### Step 2: Verify

After running the migration:
1. Go to your app
2. Open a group
3. Go to Settings
4. Change the currency to INR (or any other currency)
5. Save
6. Check that all expenses, balances, and settlements now show in the new currency

## What Changed

1. **Database**: Added `currency` column to `groups` table with default value 'USD'
2. **RLS Policy**: Updated to allow all group members to update group settings (not just creators)
3. **Storage Functions**: Updated to save and retrieve currency from database
4. **UI**: Currency now persists and displays correctly for all expenses

## Notes

- Existing groups will default to USD until you change them
- The currency applies to all expenses in the group (both old and new)
- Amounts stay the same, only the currency symbol/format changes

