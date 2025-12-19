# Deployment Guide - Host Your SplitMate

## 🚀 Best Hosting Options

### **Recommended: Vercel** (Best for Next.js)
- ✅ **Free tier** with generous limits
- ✅ Made by Next.js team - perfect integration
- ✅ Automatic deployments from Git
- ✅ Zero configuration needed
- ✅ Global CDN for fast performance
- ✅ Free SSL certificates
- ✅ Environment variables management

### **Alternative Options:**
1. **Netlify** - Good free tier, easy deployment
2. **Railway** - $5/month after free trial, very easy
3. **Render** - Free tier available, good for full-stack apps
4. **Cloudflare Pages** - Free tier, excellent performance

---

## 📦 Deploy to Vercel (Recommended)

### Step 1: Prepare Your Code

1. **Make sure your code is in Git:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub:**
   - Create a new repository on GitHub
   - Push your code:
     ```bash
     git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
     git branch -M main
     git push -u origin main
     ```

### Step 2: Deploy to Vercel

1. **Sign up for Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Sign Up" and use your GitHub account

2. **Import Your Project:**
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables:**
   - In the "Environment Variables" section, add:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - Get these from: Supabase Dashboard → Settings → API

4. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Step 3: Update Supabase Settings

After deployment, update your Supabase redirect URLs:

1. **Go to Supabase Dashboard:**
   - Authentication → URL Configuration

2. **Update Site URL:**
   ```
   https://your-project.vercel.app
   ```

3. **Update Redirect URLs:**
   ```
   https://your-project.vercel.app
   https://your-project.vercel.app/**
   https://your-project.vercel.app/auth/callback
   ```

4. **Update Google OAuth Redirect URI:**
   - Go to Google Cloud Console
   - APIs & Services → Credentials
   - Edit your OAuth 2.0 Client
   - Add to Authorized redirect URIs:
     ```
     https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
     ```
   (This should already be there, but verify it)

### Step 4: Test Your Deployment

1. Visit your Vercel URL: `https://your-project.vercel.app`
2. Try signing in with Google
3. Verify everything works

---

## 🔄 Automatic Deployments

Vercel automatically deploys when you push to GitHub:

- **Production**: Deploys from `main` branch
- **Preview**: Creates preview URLs for pull requests

Every time you push code, Vercel will:
1. Build your app
2. Run tests (if configured)
3. Deploy to production or preview

---

## 📝 Vercel Configuration File (Optional)

Create `vercel.json` in your project root for custom settings:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

---

## 🌍 Other Deployment Options

### Option 2: Netlify

1. **Sign up:** [netlify.com](https://netlify.com)
2. **Deploy:**
   - Connect GitHub repository
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Add environment variables
3. **Update Supabase redirect URLs** with your Netlify URL

### Option 3: Railway

1. **Sign up:** [railway.app](https://railway.app)
2. **Deploy:**
   - Click "New Project" → "Deploy from GitHub"
   - Select your repository
   - Add environment variables
   - Railway auto-detects Next.js
3. **Update Supabase redirect URLs** with your Railway URL

### Option 4: Render

1. **Sign up:** [render.com](https://render.com)
2. **Deploy:**
   - New → Web Service
   - Connect GitHub repository
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Add environment variables
3. **Update Supabase redirect URLs** with your Render URL

---

## 🔒 Security Checklist

Before going live:

- [ ] Environment variables are set (not in code)
- [ ] Supabase redirect URLs updated
- [ ] Google OAuth redirect URI verified
- [ ] Test authentication flow
- [ ] Test creating groups and expenses
- [ ] Check browser console for errors

---

## 💰 Cost Comparison

| Platform | Free Tier | Paid Plans |
|----------|-----------|------------|
| **Vercel** | ✅ Generous (100GB bandwidth/month) | $20/month (Pro) |
| **Netlify** | ✅ Good (100GB bandwidth/month) | $19/month (Pro) |
| **Railway** | ✅ $5 credit/month | $5/month (Hobby) |
| **Render** | ✅ Limited (spins down after inactivity) | $7/month (Starter) |
| **Cloudflare Pages** | ✅ Unlimited | Free forever |

**Recommendation:** Start with Vercel (best Next.js integration) or Cloudflare Pages (unlimited free tier).

---

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel auto-detects)

### Environment Variables Not Working
- Make sure variables start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding variables
- Check variable names match your code

### OAuth Not Working After Deployment
- Verify Supabase redirect URLs include your production URL
- Check Google OAuth redirect URI is correct
- Clear browser cache and try again

### 404 Errors
- Check that all routes are properly configured
- Verify `next.config.js` if you have custom routing

---

## 📚 Next Steps

1. **Set up custom domain** (optional):
   - In Vercel: Settings → Domains
   - Add your domain
   - Update DNS records as instructed

2. **Enable analytics** (optional):
   - Vercel Analytics (included in Pro)
   - Or use Google Analytics

3. **Set up monitoring:**
   - Vercel has built-in error tracking
   - Consider Sentry for advanced error tracking

4. **Optimize performance:**
   - Images: Use Next.js Image component
   - Code splitting: Automatic with Next.js
   - Caching: Automatic with Vercel CDN

---

## ✅ Quick Deploy Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel account created
- [ ] Project imported from GitHub
- [ ] Environment variables added
- [ ] First deployment successful
- [ ] Supabase redirect URLs updated
- [ ] Google OAuth redirect URI verified
- [ ] Tested sign-in flow
- [ ] Tested app functionality

---

**Need help?** Check Vercel docs: [vercel.com/docs](https://vercel.com/docs)

