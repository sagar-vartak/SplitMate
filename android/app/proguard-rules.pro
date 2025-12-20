# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Keep Supabase classes
-keep class io.github.jan.supabase.** { *; }
-keep class kotlinx.serialization.** { *; }

# Keep data classes
-keep class com.splitmate.data.model.** { *; }

