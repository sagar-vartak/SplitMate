-- Create group_invites table for email-based invitations
CREATE TABLE IF NOT EXISTS group_invites (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by TEXT NOT NULL, -- User ID who sent the invitation
  token TEXT UNIQUE NOT NULL, -- Unique token for invitation link
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by TEXT, -- User ID who accepted (if different from email)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_group_invites_token ON group_invites(token);
CREATE INDEX IF NOT EXISTS idx_group_invites_email ON group_invites(email);
CREATE INDEX IF NOT EXISTS idx_group_invites_group_id ON group_invites(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_status ON group_invites(status);

-- Enable Row Level Security
ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read invites for their groups" ON group_invites;
DROP POLICY IF EXISTS "Users can create invites for their groups" ON group_invites;
DROP POLICY IF EXISTS "Users can update invites for their groups" ON group_invites;
DROP POLICY IF EXISTS "Anyone can read invites by token" ON group_invites;

-- RLS Policies
-- Users can read invites for groups they're members of
CREATE POLICY "Users can read invites for their groups"
  ON group_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_invites.group_id
      AND (auth.uid()::text = ANY(groups.members) OR groups.created_by = auth.uid())
    )
  );

-- Users can create invites for groups they're members of
CREATE POLICY "Users can create invites for their groups"
  ON group_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_invites.group_id
      AND (auth.uid()::text = ANY(groups.members) OR groups.created_by = auth.uid())
    )
    AND invited_by = auth.uid()::text
  );

-- Users can update invites for groups they're members of
CREATE POLICY "Users can update invites for their groups"
  ON group_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_invites.group_id
      AND (auth.uid()::text = ANY(groups.members) OR groups.created_by = auth.uid())
    )
  );

-- Anyone can read invites by token (for acceptance page)
CREATE POLICY "Anyone can read invites by token"
  ON group_invites FOR SELECT
  USING (true); -- Allow reading by token for acceptance

