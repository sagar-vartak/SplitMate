# Android Studio Setup Guide - Step by Step

This guide will walk you through setting up and running the SplitMate Android app in Android Studio.

## Prerequisites Checklist

Before starting, make sure you have:
- ✅ Android Studio installed (Hedgehog 2023.1.1 or later)
- ✅ JDK 17 or later (usually comes with Android Studio)
- ✅ An Android device connected via USB OR an Android emulator set up
- ✅ Your Supabase project URL and anon key ready

---

## Step 1: Open the Project in Android Studio

1. **Launch Android Studio**
   - Open Android Studio from your Applications folder (Mac) or Start Menu (Windows)

2. **Open the Project**
   - Click **"Open"** on the welcome screen
   - OR go to **File → Open** if Android Studio is already open
   - Navigate to your project folder: `/Users/sagar.vartak/work/vibe-coding/android`
   - Select the `android` folder
   - Click **"OK"**

3. **Wait for Gradle Sync**
   - Android Studio will automatically detect the project
   - A popup will appear: **"Gradle Sync"** - Click **"OK"** or **"Sync Now"**
   - Wait for the sync to complete (this may take 2-5 minutes on first run)
   - You'll see progress in the bottom status bar

---

## Step 2: Configure Supabase Credentials

1. **Create local.properties file**
   - In Android Studio, look at the **Project** panel on the left
   - Navigate to: `android` → `local.properties.example`
   - Right-click on `local.properties.example`
   - Select **"Copy"**
   - Right-click in the same directory
   - Select **"Paste"**
   - Rename the copied file to `local.properties` (remove `.example`)

2. **Add Your Supabase Credentials**
   - Double-click `local.properties` to open it
   - You'll see:
     ```properties
     SUPABASE_URL=https://your-project-id.supabase.co
     SUPABASE_ANON_KEY=your-anon-key-here
     ```
   - Replace with your actual values:
     - **Get SUPABASE_URL**: 
       - Go to [Supabase Dashboard](https://app.supabase.com)
       - Select your project
       - Go to **Settings → API**
       - Copy the **Project URL** → paste as `SUPABASE_URL`
     - **Get SUPABASE_ANON_KEY**:
       - In the same page (Settings → API)
       - Copy the **anon public** key → paste as `SUPABASE_ANON_KEY`
   - Save the file (Cmd+S / Ctrl+S)

3. **Verify the file looks like this:**
   ```properties
   SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI4MCwiZXhwIjoxOTU0NTQzMjgwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

## Step 3: Sync Gradle Again

1. **After updating local.properties**
   - Go to **File → Sync Project with Gradle Files**
   - OR click the **elephant icon** (🔄) in the toolbar
   - Wait for sync to complete
   - Check the **Build** tab at the bottom for any errors

2. **If you see errors:**
   - Make sure `local.properties` is in the `android` folder (not `android/app`)
   - Verify your Supabase credentials are correct
   - Try **File → Invalidate Caches → Invalidate and Restart**

---

## Step 4: Set Up Android Device or Emulator

### Option A: Use a Physical Android Device

1. **Enable Developer Options on your phone:**
   - Go to **Settings → About Phone**
   - Tap **Build Number** 7 times
   - You'll see "You are now a developer!"

2. **Enable USB Debugging:**
   - Go to **Settings → Developer Options**
   - Enable **USB Debugging**

3. **Connect your phone:**
   - Connect via USB cable
   - On your phone, allow USB debugging when prompted
   - In Android Studio, you should see your device in the device dropdown

### Option B: Use an Android Emulator

1. **Open Device Manager:**
   - Click **Tools → Device Manager** (or the device icon in toolbar)

2. **Create a Virtual Device:**
   - Click **"Create Device"**
   - Select a device (e.g., **Pixel 6**)
   - Click **"Next"**
   - Select a system image (e.g., **API 34 - Android 14**)
   - If not downloaded, click **"Download"** and wait
   - Click **"Next"** → **"Finish"**

3. **Start the Emulator:**
   - Click the **▶️ Play button** next to your virtual device
   - Wait for the emulator to boot (may take 1-2 minutes)

---

## Step 5: Run the App

1. **Select Your Device:**
   - Look at the top toolbar in Android Studio
   - Click the device dropdown (should show your device/emulator name)
   - Select your device or emulator

2. **Run the App:**
   - Click the green **▶️ Run** button (or press **Shift+F10**)
   - OR go to **Run → Run 'app'**

3. **Wait for Build:**
   - Android Studio will:
     - Build the app (first time takes 2-5 minutes)
     - Install it on your device
     - Launch the app
   - You'll see progress in the **Build** tab at the bottom

4. **First Launch:**
   - The app will install and launch on your device
   - You should see the **Login Screen** with "Sign in with Google" button

---

## Step 6: Verify Everything Works

1. **Check the Login Screen:**
   - You should see "SplitMate" title
   - "Sign in with Google" button (may not work yet - needs Google OAuth setup)

2. **Check Logcat for Errors:**
   - Open **View → Tool Windows → Logcat**
   - Look for any red error messages
   - Common issues:
     - `SUPABASE_URL` or `SUPABASE_ANON_KEY` not found → Check `local.properties`
     - Network errors → Check internet connection
     - Build errors → See troubleshooting below

---

## Troubleshooting Common Issues

### Issue 1: "Gradle Sync Failed"

**Solution:**
1. Check your internet connection
2. Go to **File → Invalidate Caches → Invalidate and Restart**
3. After restart, go to **File → Sync Project with Gradle Files**

### Issue 2: "Build Failed" or "Cannot resolve symbol"

**Solution:**
1. Make sure `local.properties` exists in the `android` folder
2. Verify Supabase credentials are correct
3. Go to **File → Sync Project with Gradle Files**
4. Try **Build → Clean Project**, then **Build → Rebuild Project**

### Issue 3: "SDK location not found"

**Solution:**
1. Go to **File → Project Structure → SDK Location**
2. Set **Android SDK location** (usually `~/Library/Android/sdk` on Mac)
3. Click **OK** and sync again

### Issue 4: "Device not found" or "No devices available"

**Solution:**
- **For Physical Device:**
  - Make sure USB debugging is enabled
  - Try a different USB cable
  - Check if device appears in `adb devices` (run in terminal)
- **For Emulator:**
  - Make sure emulator is running (you should see it on screen)
  - Try restarting the emulator

### Issue 5: "SUPABASE_URL not found" at runtime

**Solution:**
1. Verify `local.properties` is in the `android` folder (not `android/app`)
2. Make sure file contains:
   ```properties
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-key-here
   ```
3. **File → Sync Project with Gradle Files**
4. **Build → Clean Project**
5. Run again

### Issue 6: App crashes on launch

**Solution:**
1. Check **Logcat** for error messages
2. Common causes:
   - Missing Supabase credentials
   - Network permission not granted
   - Supabase URL/key incorrect
3. Share the error from Logcat for specific help

---

## Next Steps After Setup

Once the app is running:

1. **Test Basic Navigation:**
   - Login screen should appear
   - (Google Sign-In will need additional setup - see `GOOGLE_AUTH_SETUP.md`)

2. **Test Without Auth (if you want to skip Google setup for now):**
   - You can temporarily modify the code to skip login
   - Or set up Google OAuth (see `GOOGLE_AUTH_SETUP.md`)

3. **Build a Release APK (when ready):**
   - **Build → Generate Signed Bundle / APK**
   - Select **APK**
   - Create a keystore (first time only)
   - Select **release** build variant
   - Click **Finish**

---

## Quick Reference

### Important Files
- `local.properties` - Supabase credentials (DO NOT commit to git)
- `app/build.gradle.kts` - App dependencies and configuration
- `build.gradle.kts` - Project-level configuration

### Important Folders
- `app/src/main/java/com/splitmate/` - All Kotlin source code
- `app/src/main/res/` - Resources (layouts, strings, etc.)

### Useful Android Studio Shortcuts
- **Run**: `Shift+F10` (Mac: `Ctrl+R`)
- **Sync Gradle**: `Ctrl+Alt+Y` (Mac: `Cmd+Option+Y`)
- **Build**: `Ctrl+F9` (Mac: `Cmd+F9`)
- **Open Logcat**: `Alt+6` (Mac: `Cmd+6`)

---

## Getting Help

If you encounter issues:

1. **Check Logcat** for error messages
2. **Verify Supabase credentials** in `local.properties`
3. **Check internet connection** (needed for Gradle sync and Supabase)
4. **Try Clean & Rebuild**: **Build → Clean Project** → **Build → Rebuild Project**
5. **Invalidate Caches**: **File → Invalidate Caches → Invalidate and Restart**

---

## Success Checklist

You're all set when:
- ✅ Project opens in Android Studio without errors
- ✅ Gradle sync completes successfully
- ✅ `local.properties` contains your Supabase credentials
- ✅ Device/emulator is connected and visible
- ✅ App builds without errors
- ✅ App installs and launches on device
- ✅ Login screen appears

---

**Ready to code! 🚀**

If you need help with Google Sign-In setup, see `GOOGLE_AUTH_SETUP.md`.

