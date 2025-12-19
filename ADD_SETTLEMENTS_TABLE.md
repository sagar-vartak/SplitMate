# Add Settlements Table Migration

## Overview
This migration adds a `settlements` table to store settlement payment records when users mark settlements as paid.

## Steps

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run the Migration**
   - Copy the contents of `add-settlements-table.sql`
   - Paste into the SQL Editor
   - Click **Run** or press `Ctrl+Enter` (or `Cmd+Enter` on Mac)

3. **Verify the Table**
   - Go to **Table Editor** in Supabase
   - You should see a new `settlements` table with the following columns:
     - `id` (TEXT, Primary Key)
     - `group_id` (TEXT, Foreign Key to groups)
     - `from_user_id` (TEXT)
     - `to_user_id` (TEXT)
     - `amount` (DECIMAL)
     - `marked_as_paid` (BOOLEAN)
     - `marked_by` (TEXT)
     - `marked_at` (TIMESTAMP)
     - `created_at` (TIMESTAMP)

## What This Enables

- **Persistent Settlement Records**: Settlement payment status is now saved to the database
- **Settlement Expense Logs**: When a settlement is marked as paid, it creates an expense entry showing "Settled: User1 paid User2 amount"
- **Settlement History**: You can track which settlements have been paid and when

## How It Works

1. When a user clicks "Mark Paid" on a settlement:
   - The settlement is saved to the database with `marked_as_paid = true`
   - An expense entry is created with description "Settled: User1 paid User2 amount"
   - The expense appears in the expenses list with special styling (green background)
   - Settlement expenses cannot be edited or deleted (they're read-only records)

2. The settlement expense:
   - Shows in the expenses list with a checkmark icon
   - Has a green background to distinguish it from regular expenses
   - Displays the settlement information clearly
   - Updates the balances to reflect the payment

