-- Enable Supabase Realtime for tables
-- Run this in Supabase SQL Editor to enable real-time subscriptions

-- Enable Realtime for expenses table
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;

-- Enable Realtime for groups table
ALTER PUBLICATION supabase_realtime ADD TABLE groups;

-- Enable Realtime for settlements table
ALTER PUBLICATION supabase_realtime ADD TABLE settlements;

-- Verify Realtime is enabled (optional - check in Dashboard → Database → Replication)
-- You should see all three tables listed with Realtime enabled

