# Android App Setup Guide

This guide will help you set up and build the SplitMate Android app.

## Prerequisites

1. **Android Studio** - Download from [developer.android.com](https://developer.android.com/studio)
2. **JDK 17** - Comes with Android Studio, or download separately
3. **Android SDK** - Installed via Android Studio SDK Manager
4. **Supabase Account** - Same account used for the web app

## Step 1: Open Project in Android Studio

1. Open Android Studio
2. Select **File → Open**
3. Navigate to the `android` folder in this project
4. Click **OK**

## Step 2: Configure Supabase

1. Copy `local.properties.example` to `local.properties`
2. Open `local.properties`
3. Add your Supabase credentials:
   ```properties
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```
4. Get these values from your Supabase Dashboard:
   - Go to **Project Settings → API**
   - Copy **Project URL** → `SUPABASE_URL`
   - Copy **anon public** key → `SUPABASE_ANON_KEY`

## Step 3: Configure Google Sign-In

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google Sign-In API**
4. Create **OAuth 2.0 Client ID**:
   - Application type: **Android**
   - Package name: `com.splitmate`
   - SHA-1: Get from Android Studio (Build → Generate Signed Bundle/APK → Create new → Copy SHA-1)
5. Download `google-services.json`
6. Place it in `android/app/` directory

## Step 4: Sync Gradle

1. Android Studio will prompt you to sync Gradle
2. Click **Sync Now** or go to **File → Sync Project with Gradle Files**
3. Wait for sync to complete

## Step 5: Run the App

1. Connect an Android device via USB (enable USB debugging) OR
2. Start an Android Emulator (Tools → Device Manager → Create Device)
3. Click the **Run** button (▶️) or press **Shift+F10**
4. Select your device/emulator
5. Wait for the app to build and install

## Building Release APK

1. **Build → Generate Signed Bundle / APK**
2. Select **APK**
3. Create a new keystore (first time only)
4. Fill in keystore details
5. Select **release** build variant
6. Click **Finish**

## Troubleshooting

### Gradle Sync Fails
- Check internet connection
- Invalidate caches: **File → Invalidate Caches → Invalidate and Restart**
- Check `local.properties` has correct Supabase credentials

### Build Errors
- Make sure JDK 17 is selected: **File → Project Structure → SDK Location → JDK location**
- Clean project: **Build → Clean Project**
- Rebuild: **Build → Rebuild Project**

### Google Sign-In Not Working
- Verify `google-services.json` is in `android/app/`
- Check package name matches: `com.splitmate`
- Verify SHA-1 fingerprint is correct in Google Cloud Console

### Supabase Connection Issues
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `local.properties`
- Check Supabase project is active
- Verify RLS policies allow authenticated users

## Project Structure

```
android/
├── app/
│   ├── src/main/java/com/splitmate/
│   │   ├── data/              # Data models, repositories, Supabase client
│   │   ├── ui/                 # Compose screens and components
│   │   │   ├── auth/           # Login screen
│   │   │   ├── dashboard/      # Dashboard screen
│   │   │   ├── groups/         # Group list and detail screens
│   │   │   └── theme/          # App theme
│   │   └── MainActivity.kt     # Main entry point
│   └── build.gradle.kts        # App dependencies
├── build.gradle.kts            # Project-level config
└── settings.gradle.kts         # Project settings
```

## Next Steps

After the basic setup, you'll need to implement:
- Authentication screens
- Dashboard with groups list
- Group detail with expenses
- Expense creation/editing
- Balance calculations
- Settlement management
- Notifications

The foundation is already set up - you just need to build the UI screens!

