# Quick Deploy to Vercel (5 Minutes)

## 🚀 Fastest Way to Deploy

### 1. Push to GitHub (2 min)

```bash
# If not already a git repo
git init
git add .
git commit -m "Ready to deploy"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### 2. Deploy on Vercel (3 min)

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = (from Supabase Dashboard → Settings → API)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (from Supabase Dashboard → Settings → API)
5. Click **"Deploy"**

### 3. Update Supabase (1 min)

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Update **Site URL** to: `https://your-project.vercel.app`
3. Add to **Redirect URLs**:
   ```
   https://your-project.vercel.app
   https://your-project.vercel.app/**
   https://your-project.vercel.app/auth/callback
   ```

### 4. Test It! ✅

Visit `https://your-project.vercel.app` and sign in!

---

## 📝 Your Vercel URL Format

After deployment, your app will be at:
```
https://your-project-name.vercel.app
```

You can also add a custom domain later in Vercel settings.

---

## 🔄 Future Updates

Just push to GitHub and Vercel auto-deploys:
```bash
git add .
git commit -m "Update app"
git push
```

That's it! 🎉

