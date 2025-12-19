# Enable Supabase Realtime

The subscription errors you're seeing indicate that Supabase Realtime needs to be enabled for your tables. Follow these steps:

## Step 1: Enable Realtime for Tables

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Replication**
3. Enable Realtime for the following tables:
   - `expenses`
   - `groups`
   - `settlements`

## Step 2: Enable Realtime via SQL (Alternative)

If you prefer to use SQL, run this in the Supabase SQL Editor:

```sql
-- Enable Realtime for expenses table
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;

-- Enable Realtime for groups table
ALTER PUBLICATION supabase_realtime ADD TABLE groups;

-- Enable Realtime for settlements table
ALTER PUBLICATION supabase_realtime ADD TABLE settlements;
```

## Step 3: Verify RLS Policies

Make sure your Row Level Security (RLS) policies allow users to read the data they're subscribing to. The subscriptions will work if:
- Users can SELECT from the tables (which they should based on existing RLS policies)
- Realtime is enabled for those tables

## Step 4: Check Subscription Status

After enabling Realtime, check the browser console. You should see:
- ✅ Successfully subscribed to expenses changes
- ✅ Successfully subscribed to groups changes
- ✅ Successfully subscribed to settlements changes

If you still see errors, check:
1. That Realtime is enabled in your Supabase project settings
2. That your RLS policies allow SELECT operations
3. That you're using the correct Supabase project URL and keys

## Note

Even if Realtime subscriptions fail, the app will still work because we've added manual refresh functions that update the UI immediately after operations. The subscriptions are for real-time updates across multiple devices/users.

