-- SIMPLE FIX: Just allow reading groups if you have a valid invitation
-- No complex recursion, just a simple check

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read groups they're members of or have invitation for" ON groups;
DROP POLICY IF EXISTS "Users can read groups they're members of or have valid invitation" ON groups;
DROP POLICY IF EXISTS "Users can read groups they're members of" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Users can update groups they created" ON groups;
DROP POLICY IF EXISTS "Users can update groups they're members of" ON groups;
DROP POLICY IF EXISTS "Users can delete groups they created" ON groups;

-- Simple SELECT: Members, creators, OR anyone with a valid invitation token
-- We'll pass the token as a parameter through a function
CREATE POLICY "Users can read groups they're members of"
  ON groups FOR SELECT
  USING (
    auth.uid()::text = ANY(members) OR
    created_by = auth.uid()
  );

-- INSERT Policy
CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- UPDATE Policy: Allow members to update (so they can add themselves via invitation)
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

-- DELETE Policy
CREATE POLICY "Users can delete groups they created"
  ON groups FOR DELETE
  USING (created_by = auth.uid());

-- Simple function: Get group by invitation token (bypasses RLS)
CREATE OR REPLACE FUNCTION get_group_by_invite_token(invite_token TEXT)
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
    COALESCE(g.currency, 'USD') as currency,
    g.created_by
  FROM groups g
  INNER JOIN group_invites gi ON gi.group_id = g.id
  WHERE gi.token = invite_token
    AND gi.status = 'pending'
    AND gi.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invitation and add user to group (bypasses RLS)
CREATE OR REPLACE FUNCTION accept_invitation_and_join_group(invite_token TEXT, user_id TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  description TEXT,
  members TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  currency TEXT,
  created_by UUID
) AS $$
DECLARE
  group_id_val TEXT;
  current_members TEXT[];
BEGIN
  -- Get invitation and group_id
  SELECT gi.group_id, g.members INTO group_id_val, current_members
  FROM group_invites gi
  INNER JOIN groups g ON g.id = gi.group_id
  WHERE gi.token = invite_token
    AND gi.status = 'pending'
    AND gi.expires_at > NOW()
  LIMIT 1;
  
  -- If no valid invitation found, return empty
  IF group_id_val IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if user is already a member
  IF user_id = ANY(current_members) THEN
    -- User is already a member, just return the group (don't mark as accepted so link stays valid)
    RETURN QUERY
    SELECT 
      g.id,
      g.name,
      g.description,
      g.members,
      g.created_at,
      COALESCE(g.currency, 'USD') as currency,
      g.created_by
    FROM groups g
    WHERE g.id = group_id_val;
    RETURN;
  END IF;
  
  -- Add user to group members array
  UPDATE groups
  SET members = array_append(groups.members, user_id),
      updated_at = NOW()
  WHERE groups.id = group_id_val;
  
  -- Don't mark invitation as accepted - keep it valid for other users until expiry
  -- The link remains valid for 3 days and can be used by multiple users
  
  -- Return updated group
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.description,
    g.members,
    g.created_at,
    COALESCE(g.currency, 'USD') as currency,
    g.created_by
  FROM groups g
  WHERE g.id = group_id_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

