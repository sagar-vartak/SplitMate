# Supabase Edge Function Setup for Email Invitations

This guide shows how to use Supabase Edge Functions to send invitation emails, keeping everything within the Supabase ecosystem.

## Why Edge Functions?

- ✅ Everything in Supabase ecosystem
- ✅ No separate API route needed
- ✅ Automatic scaling
- ✅ Built-in authentication handling

## Setup Steps

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link Your Project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

You can find your project ref in the Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

### 4. Deploy the Edge Function

```bash
supabase functions deploy send-invite-email
```

### 5. Set Environment Variables

In Supabase Dashboard:
1. Go to **Project Settings** → **Edge Functions**
2. Add secrets:
   - `RESEND_API_KEY` = Your Resend API key
   - `RESEND_FROM_EMAIL` = Your Resend from email (e.g., `SplitMate <onboarding@resend.dev>`)
   - `NEXT_PUBLIC_APP_URL` = Your app URL (e.g., `https://your-app.vercel.app`)

Or via CLI:
```bash
supabase secrets set RESEND_API_KEY=your_resend_key
supabase secrets set RESEND_FROM_EMAIL="SplitMate <onboarding@resend.dev>"
supabase secrets set NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 6. Update Client Code

Update `app/groups/[id]/page.tsx` to call the Edge Function instead of the API route:

```typescript
// Replace the fetch call with:
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  toast.showError('You must be logged in to send invitations');
  return;
}

const { data, error } = await supabase.functions.invoke('send-invite-email', {
  body: {
    groupId: group.id,
    email: email.trim(),
    invitedBy: user.id,
    accessToken: session.access_token,
  },
});

if (error) {
  throw new Error(error.message || 'Failed to send invitation');
}
```

## Alternative: Keep Current Next.js API Route

The current Next.js API route approach is simpler and doesn't require:
- Supabase CLI installation
- Edge Function deployment
- Additional environment variable management

**Recommendation**: Keep the current Next.js API route unless you specifically want everything in Supabase.

