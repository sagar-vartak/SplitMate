# SplitMate Android App

This is the Android version of SplitMate, built with Kotlin and Jetpack Compose.

## Prerequisites

- Android Studio Hedgehog (2023.1.1) or later
- JDK 17 or later
- Android SDK (API 24+)

## Setup Instructions

1. **Open the project in Android Studio**
   - Open Android Studio
   - Select "Open an Existing Project"
   - Navigate to the `android` folder

2. **Configure Supabase**
   - Copy `local.properties.example` to `local.properties`
   - Add your Supabase credentials:
     ```properties
     SUPABASE_URL=https://your-project.supabase.co
     SUPABASE_ANON_KEY=your-anon-key
     ```

3. **Sync Gradle**
   - Android Studio will prompt you to sync Gradle
   - Click "Sync Now" or go to File → Sync Project with Gradle Files

4. **Run the app**
   - Connect an Android device or start an emulator
   - Click the Run button (▶️) or press Shift+F10

## Project Structure

```
android/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/splitmate/
│   │   │   │   ├── data/          # Data models and repositories
│   │   │   │   ├── ui/            # UI screens and components
│   │   │   │   ├── utils/         # Utility functions
│   │   │   │   └── MainActivity.kt
│   │   │   └── res/               # Resources (layouts, strings, etc.)
│   │   └── test/                  # Unit tests
│   └── build.gradle.kts
├── build.gradle.kts
└── settings.gradle.kts
```

## Features

- ✅ Google Sign-In
- ✅ Group Management
- ✅ Expense Tracking
- ✅ Balance Calculations
- ✅ Settlement Management
- ✅ Real-time Notifications
- ✅ Group Invitations

## Building

```bash
./gradlew assembleDebug    # Build debug APK
./gradlew assembleRelease  # Build release APK
```

## Testing

```bash
./gradlew test            # Run unit tests
./gradlew connectedAndroidTest  # Run instrumented tests
```

