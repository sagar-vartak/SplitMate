-- Enable Realtime for notifications table only
-- Run this if notifications table is not yet enabled for realtime
-- If you get an error that it's already added, that's fine - it means it's already enabled

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

