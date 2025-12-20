# Google Sign-In Setup for Android

## Option 1: Using Supabase OAuth (Recommended)

Supabase handles Google OAuth automatically. You just need to configure it in the Supabase dashboard.

### Steps:

1. **In Supabase Dashboard:**
   - Go to **Authentication** → **Providers** → **Google**
   - Enable Google provider
   - Add your Google OAuth Client ID and Secret (from Google Cloud Console)
   - Save

2. **In Google Cloud Console:**
   - Create OAuth 2.0 credentials for **Android**:
     - Package name: `com.splitmate`
     - SHA-1 fingerprint: Get from your keystore
   - Add redirect URI: `com.splitmate://auth`

3. **The app will automatically:**
   - Open browser for Google sign-in
   - Redirect back to app via deep link
   - Complete authentication

## Option 2: Manual OAuth (If Supabase doesn't work)

If Supabase's built-in Google provider doesn't work, you can provide Client ID and Secret:

1. **Update `AuthRepository.kt`:**
   ```kotlin
   suspend fun signInWithGoogle(
       clientId: String,
       clientSecret: String
   ): Result<Unit> {
       // Manual OAuth implementation
   }
   ```

2. **Add to `local.properties`:**
   ```properties
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

## Getting SHA-1 Fingerprint

For debug keystore:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

For release keystore:
```bash
keytool -list -v -keystore your-release.keystore -alias your-alias
```

## Testing

1. Run the app
2. Click "Sign in with Google"
3. Complete Google sign-in in browser
4. App should redirect back and authenticate

