# Quick Start - Android App

## 🚀 5-Minute Setup

### 1. Open in Android Studio
```
File → Open → Select the "android" folder
```

### 2. Configure Supabase
1. Copy `local.properties.example` → rename to `local.properties`
2. Add your credentials:
   ```properties
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```
3. Get these from: Supabase Dashboard → Settings → API

### 3. Sync Gradle
```
File → Sync Project with Gradle Files
```
Wait for sync to complete (2-5 minutes first time)

### 4. Connect Device
- **Physical**: Enable USB debugging, connect via USB
- **Emulator**: Tools → Device Manager → Create Device → Start

### 5. Run
```
Click the green ▶️ Run button (or Shift+F10)
```

---

## ✅ Success Indicators

- ✅ Gradle sync completes without errors
- ✅ Device appears in device dropdown
- ✅ App builds successfully
- ✅ Login screen appears on device

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Gradle sync fails | Check internet, invalidate caches |
| Build fails | Verify `local.properties` exists and has correct values |
| Device not found | Enable USB debugging (physical) or start emulator |
| App crashes | Check Logcat for errors, verify Supabase credentials |

---

## 📚 Detailed Guides

- **Step-by-step setup**: [ANDROID_STUDIO_GUIDE.md](./ANDROID_STUDIO_GUIDE.md)
- **Google Sign-In**: [GOOGLE_AUTH_SETUP.md](./GOOGLE_AUTH_SETUP.md)
- **Full documentation**: [ANDROID_SETUP.md](./ANDROID_SETUP.md)

---

**Need help?** Check the detailed guide or Logcat for error messages.

