# Resend Domain Setup - Send Emails to Any Recipient

## Problem
Resend with the default `onboarding@resend.dev` domain has restrictions and may only send to verified/test emails. To send to **any recipient**, you need to verify your own domain.

## Solution: Verify Your Domain in Resend

### Step 1: Add Your Domain to Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter your domain (e.g., `yourdomain.com` or `splitmate.app`)
4. Click **"Add"**

### Step 2: Configure DNS Records

Resend will show you DNS records to add. You need to add these to your domain's DNS settings:

#### Required DNS Records:

1. **SPF Record** (TXT record)
   ```
   v=spf1 include:resend.com ~all
   ```

2. **DKIM Record** (TXT record)
   ```
   Resend will provide a unique DKIM key
   ```

3. **DMARC Record** (TXT record) - Optional but recommended
   ```
   v=DMARC1; p=none; rua=mailto:[email protected]
   ```

### Step 3: Add DNS Records to Your Domain

**If using a domain registrar (GoDaddy, Namecheap, etc.):**
1. Log into your domain registrar
2. Go to DNS Management
3. Add the TXT records provided by Resend
4. Wait 5-10 minutes for DNS propagation

**If using Vercel/Netlify domain:**
- You can add DNS records in their dashboard
- Or use a subdomain like `mail.yourdomain.com`

### Step 4: Verify Domain in Resend

1. Go back to Resend Dashboard → Domains
2. Click **"Verify"** next to your domain
3. Wait a few minutes for verification
4. Once verified, you'll see a green checkmark ✅

### Step 5: Update Environment Variables

Update your `.env.local`:

```env
RESEND_FROM_EMAIL=SplitMate <noreply@yourdomain.com>
```

Replace `yourdomain.com` with your verified domain.

### Step 6: Test

Try sending an invitation to any email address - it should work now!

---

## Alternative: Use a Different Email Service

If you don't want to verify a domain, you can use:

### Option 1: SendGrid (Free tier: 100 emails/day)
- No domain verification needed for free tier
- Can send to any email
- Setup: https://sendgrid.com

### Option 2: Mailgun (Free tier: 5,000 emails/month)
- No domain verification for testing
- Can send to any email
- Setup: https://mailgun.com

### Option 3: AWS SES (Very cheap)
- $0.10 per 1,000 emails
- Requires AWS account setup
- More complex but very reliable

---

## Quick Fix for Testing (Temporary)

If you just want to test quickly without domain verification:

1. **Add test emails in Resend:**
   - Go to Resend Dashboard → Emails → Test Emails
   - Add email addresses you want to test with
   - These will receive emails even without domain verification

2. **Use a service like Mailtrap for development:**
   - Mailtrap catches all emails in development
   - No real emails sent
   - Good for testing email templates

---

## Recommended Approach

**For Production:**
- ✅ Verify your own domain in Resend
- ✅ Use `noreply@yourdomain.com` or `hello@yourdomain.com`
- ✅ Professional and reliable

**For Development:**
- ✅ Use Mailtrap or similar service
- ✅ Or add test emails in Resend
- ✅ Or use SendGrid/Mailgun for easier testing

