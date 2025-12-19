# Email Invitation Setup Guide

This guide will help you set up email invitations for SplitMate.

## ⚠️ Important: Domain Verification Required

**Resend requires domain verification to send emails to any recipient.** If you're only able to send emails to yourself, you need to verify your domain. See `RESEND_DOMAIN_SETUP.md` for detailed instructions.

## Option 1: Resend (Recommended for Production)

Resend is free for 100 emails/day, but requires domain verification to send to any recipient.

## Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Click **"Sign Up"** and create a free account
3. Verify your email address

## Step 2: Get Your API Key

1. Once logged in, go to **API Keys** in the dashboard
2. Click **"Create API Key"**
3. Give it a name (e.g., "SplitMate Production")
4. Copy the API key (starts with `re_`)

## Step 3: Set Up Domain (Optional but Recommended)

For production, you should verify your domain:

1. Go to **Domains** in Resend dashboard
2. Click **"Add Domain"**
3. Follow the DNS setup instructions
4. Once verified, you can use your custom email (e.g., `noreply@yourdomain.com`)

For development/testing, you can use the default `onboarding@resend.dev` domain.

## Step 4: Configure Environment Variables

1. Open your `.env.local` file (create it if it doesn't exist)
2. Add the following:

```env
# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=SplitMate <onboarding@resend.dev>

# App URL (for invitation links)
# For local development:
NEXT_PUBLIC_APP_URL=http://localhost:3000

# For production (Vercel):
# NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

3. Replace `re_xxxxxxxxxxxxx` with your actual Resend API key
4. If you verified a domain, update `RESEND_FROM_EMAIL` to use your domain

## Step 5: Install Resend Package

Run this command in your terminal:

```bash
npm install resend
```

## Step 6: Create Database Table

Run the SQL script to create the `group_invites` table:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open and run `create-group-invites-table.sql`

## Step 7: Test the Invitation System

1. Start your development server: `npm run dev`
2. Create a group
3. Click **"Invite"** button in the group
4. Enter an email address
5. Click **"Send Invitation"**
6. Check the email inbox for the invitation
7. Click the invitation link to accept

## How It Works

1. **Sending Invitations:**
   - User clicks "Invite" in a group
   - Enters an email address
   - System creates an invitation record in the database
   - Sends an email via Resend with a unique invitation link

2. **Accepting Invitations:**
   - User clicks the invitation link
   - If not logged in, they're prompted to sign in
   - System verifies the invitation token
   - If valid, user is added to the group
   - User is redirected to the group page

3. **Privacy:**
   - Groups are only visible to members
   - Users can only see other users who are in the same groups
   - Only invited users can join groups

## Troubleshooting

### "Email service not configured"
- Make sure `RESEND_API_KEY` is set in `.env.local`
- Restart your development server after adding environment variables

### "Failed to send invitation"
- Check that your Resend API key is correct
- Verify you haven't exceeded the 100 emails/day limit
- Check the Resend dashboard for error logs

### Invitation link doesn't work
- Make sure `NEXT_PUBLIC_APP_URL` is set correctly
- For Vercel deployments, this should be your Vercel URL
- Check that the invitation hasn't expired (7 days)

### Users can still see all groups
- Make sure you've run the SQL script to create the `group_invites` table
- Verify that `getGroups` is filtering by user membership (already implemented)
- Check that RLS policies are correctly set up

## Free Tier Limits

- **Resend Free Tier:**
  - 100 emails per day
  - 3,000 emails per month
  - Perfect for development and small apps

- **Upgrade Options:**
  - If you need more, Resend offers paid plans starting at $20/month
  - Alternative free services: SendGrid (100/day), Mailgun (5,000/month)

## Security Notes

- Invitation tokens are unique and expire after 7 days
- Only the invited email can accept the invitation
- Users must sign in with the correct email address
- RLS policies ensure only group members can see group data

