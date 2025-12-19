-- Fix infinite recursion in groups RLS policy
-- The issue is that checking group_invites creates a circular dependency
-- Solution: Remove the invitation check from the SELECT policy
-- Instead, we'll handle invitation access differently

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can read groups they're members of or have invitation for" ON groups;
DROP POLICY IF EXISTS "Users can read groups they're members of" ON groups;

-- Recreate the simple policy without invitation check
CREATE POLICY "Users can read groups they're members of"
  ON groups FOR SELECT
  USING (
    auth.uid()::text = ANY(members) OR
    created_by = auth.uid()
  );

-- For invitation access, we'll use a different approach:
-- The invitation page will fetch group data via a join with group_invites
-- which has a permissive policy for reading by token

