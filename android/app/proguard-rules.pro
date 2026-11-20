-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.community.admob.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
