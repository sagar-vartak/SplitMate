-- Fix RLS infinite recursion by removing circular dependency
-- The issue: groups policy checks group_invites, and group_invites policies check groups
-- Solution: Remove invitation check from groups SELECT policy, use function for invitation access

-- Drop all existing policies (comprehensive list)
DROP POLICY IF EXISTS "Users can read groups they're members of or have invitation for" ON groups;
DROP POLICY IF EXISTS "Users can read groups they're members of or have valid invitation" ON groups;
DROP POLICY IF EXISTS "Users can read groups they're members of" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Users can update groups they created" ON groups;
DROP POLICY IF EXISTS "Users can update groups they're members of" ON groups;
DROP POLICY IF EXISTS "Users can delete groups they created" ON groups;

-- Simple SELECT Policy: Only check membership and creator (NO invitation check to avoid recursion)
CREATE POLICY "Users can read groups they're members of"
  ON groups FOR SELECT
  USING (
    auth.uid()::text = ANY(members) OR
    created_by = auth.uid()
  );

-- INSERT Policy: Allow authenticated users to create groups
CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- UPDATE Policy: Allow updating if user is a member or creator
CREATE POLICY "Users can update groups they're members of"
  ON groups FOR UPDATE
  USING (
    auth.uid()::text = ANY(members) OR
    created_by = auth.uid()
  )
  WITH CHECK (
    auth.uid()::text = ANY(members) OR
    created_by = auth.uid()
  );

-- DELETE Policy: Allow deleting if user created the group
CREATE POLICY "Users can delete groups they created"
  ON groups FOR DELETE
  USING (created_by = auth.uid());

-- Create a SECURITY DEFINER function to get group data for invitations
-- This bypasses RLS and allows reading group data when there's a valid invitation
CREATE OR REPLACE FUNCTION get_group_for_invitation(invitation_token TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  description TEXT,
  members TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  currency TEXT,
  created_by UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.description,
    g.members,
    g.created_at,
    g.currency,
    g.created_by
  FROM groups g
  INNER JOIN group_invites gi ON gi.group_id = g.id
  WHERE gi.token = invitation_token
    AND gi.status = 'pending'
    AND gi.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

