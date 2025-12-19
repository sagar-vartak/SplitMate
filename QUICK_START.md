# Quick Start Guide - Supabase (Free Forever!)

## ✅ What's Been Done

1. **Supabase Integration**: All data now uses Supabase PostgreSQL database (completely free!)
2. **Email Authentication**: Sign up and sign in with email/password
3. **Real-time Sync**: Data syncs automatically across all your devices
4. **Multi-device Support**: Works on phone, tablet, and computer simultaneously

## 🎉 Why Supabase?

- ✅ **Completely Free**: 500 MB database, 2 GB bandwidth, 50K users/month
- ✅ **No Credit Card Required**: Sign up and start using immediately
- ✅ **PostgreSQL Database**: More powerful than Firestore
- ✅ **Built-in Auth**: Email/password authentication included
- ✅ **Real-time**: Live updates across all devices
- ✅ **Open Source**: Self-hostable if needed

## 🚀 Next Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase (5 minutes)

Follow the detailed guide in **`SUPABASE_SETUP.md`** - it has step-by-step instructions for:
- Creating a Supabase account (free)
- Creating a project
- Setting up database tables
- Getting your API keys

### 3. Create Environment File

1. Copy `env.example` to `.env.local`:
   ```bash
   cp env.example .env.local
   ```

2. Fill in your Supabase credentials:
   - Open Supabase Dashboard → Settings → API
   - Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Run the App

```bash
npm run dev
```

### 5. Test It Out

1. Open `http://localhost:3000` (or your IP address for other devices)
2. Click "Sign up" to create an account
3. Check your email for confirmation (or confirm in Supabase dashboard)
4. Sign in and create a group
5. Open the same URL on your phone and sign in with the same account
6. You should see the same data! 🎉

## 🔑 Key Features

- **Email Sign Up/In**: Simple email and password authentication
- **Cloud Database**: All data stored in Supabase PostgreSQL
- **Real-time Updates**: Changes appear instantly on all devices
- **Free Forever**: No credit card, no hidden costs
- **Secure**: Row-level security policies protect your data

## 📱 Testing on Multiple Devices

1. Make sure both devices are on the same Wi-Fi network
2. Find your computer's IP address (see `NETWORK_ACCESS.md`)
3. On your phone, go to `http://YOUR_IP:3000`
4. Sign in with the same email/password
5. All your groups and expenses will be visible!

## ⚠️ Important Notes

- **Same Account**: You must sign in with the same email/password on all devices
- **Internet Required**: The app requires internet connection
- **Email Confirmation**: You may need to confirm your email (check Supabase dashboard if needed)

## 🐛 Troubleshooting

### "Invalid API key"
- Solution: Make sure you copied the `anon public` key (not service_role)
- Check that `.env.local` has the correct values

### "Row Level Security policy violation"
- Solution: Make sure you ran all the SQL from `SUPABASE_SETUP.md` Step 5
- Check that you're authenticated (signed in)

### "Email not confirmed"
- Solution: Check your email for confirmation link
- Or go to Supabase Dashboard → Authentication → Users and manually confirm

### Data not syncing
- Solution: Make sure you're signed in with the same email on all devices

## 📚 Documentation

- **SUPABASE_SETUP.md**: Complete Supabase setup guide with SQL
- **NETWORK_ACCESS.md**: How to access from other devices

## 🎉 You're All Set!

Once you complete the Supabase setup (about 5 minutes), your app will work across all devices with real-time synchronization - completely free!
