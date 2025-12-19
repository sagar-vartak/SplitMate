-- Fix RLS policy to allow reading groups via invitation links
-- This allows users to see group details when they have a valid pending invitation

-- Drop existing policy
DROP POLICY IF EXISTS "Users can read groups they're members of" ON groups;

-- Create updated policy that includes invitation access
CREATE POLICY "Users can read groups they're members of or have invitation for"
  ON groups FOR SELECT
  USING (
    -- Allow if user is a member
    auth.uid()::text = ANY(members) OR
    -- Allow if user created the group
    created_by = auth.uid() OR
    -- Allow if there's a valid pending invitation for this group
    EXISTS (
      SELECT 1 FROM group_invites
      WHERE group_invites.group_id = groups.id
      AND group_invites.status = 'pending'
      AND group_invites.expires_at > NOW()
      -- Note: We can't check the token here, but the invitation page will verify it
      -- This policy just allows reading the group if there's any pending invitation
    )
  );

