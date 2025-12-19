CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  marked_as_paid BOOLEAN DEFAULT FALSE,
  marked_by TEXT,
  marked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read settlements in their groups" ON settlements;
DROP POLICY IF EXISTS "Users can insert settlements in their groups" ON settlements;
DROP POLICY IF EXISTS "Users can update settlements in their groups" ON settlements;

CREATE POLICY "Users can read settlements in their groups"
  ON settlements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = settlements.group_id
      AND (auth.uid()::text = ANY(groups.members) OR groups.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can insert settlements in their groups"
  ON settlements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = settlements.group_id
      AND (auth.uid()::text = ANY(groups.members) OR groups.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can update settlements in their groups"
  ON settlements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = settlements.group_id
      AND (auth.uid()::text = ANY(groups.members) OR groups.created_by = auth.uid())
    )
  );

