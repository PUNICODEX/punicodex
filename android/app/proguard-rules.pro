# PuniCodex — Production ProGuard/R8 Rules

# Keep Capacitor bridge and plugins
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.Bridge { *; }
-keep class com.getcapacitor.BridgeActivity { *; }
-keep class com.getcapacitor.Plugin { *; }
-keep class com.getcapacitor.annotation.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin *;
    @com.getcapacitor.annotation.PluginMethod *;
}
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# Keep our custom plugin
-keep class com.punicodex.keyboard.PunyKeyboardPlugin { *; }

# Keep InputMethodService
-keep class android.inputmethodservice.InputMethodService { *; }
-keepclassmembers class android.inputmethodservice.InputMethodService { *; }

# Keep exception names for crash reporting
-keepnames class * extends java.lang.Exception

# Preserve line numbers for debugging stack traces in production
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Remove logs in release builds
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
