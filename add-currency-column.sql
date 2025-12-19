-- Add currency column to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Update RLS policy to allow group members to update groups (for currency changes)
-- Drop both old and new policy names to avoid conflicts
DROP POLICY IF EXISTS "Users can update groups they created" ON groups;
DROP POLICY IF EXISTS "Users can update groups they're members of" ON groups;

CREATE POLICY "Users can update groups they're members of"
  ON groups FOR UPDATE
  USING (
    auth.uid()::text = ANY(members) OR
    created_by = auth.uid()
  );

