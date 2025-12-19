-- Complete fix for groups RLS policy
-- This ensures existing groups are visible and new groups can be created
-- while still allowing invitation access

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can read groups they're members of or have invitation for" ON groups;
DROP POLICY IF EXISTS "Users can read groups they're members of or have valid invitation" ON groups;
DROP POLICY IF EXISTS "Users can read groups they're members of" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Users can update groups they created" ON groups;
DROP POLICY IF EXISTS "Users can update groups they're members of" ON groups;

-- SELECT Policy: Allow reading if:
-- 1. User is a member of the group (primary case for existing groups)
-- 2. User created the group (for creators)
-- 3. There's a valid pending invitation for the group (for invitation acceptance)
-- Note: The invitation check is last to avoid performance issues
CREATE POLICY "Users can read groups they're members of or have valid invitation"
  ON groups FOR SELECT
  USING (
    -- Primary: User is a member (covers most cases)
    auth.uid()::text = ANY(members) OR
    -- Secondary: User created the group
    created_by = auth.uid() OR
    -- Tertiary: There's a valid pending invitation (for non-members viewing via invite)
    EXISTS (
      SELECT 1 FROM group_invites
      WHERE group_invites.group_id = groups.id
      AND group_invites.status = 'pending'
      AND group_invites.expires_at > NOW()
    )
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

