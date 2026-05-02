# iOS Privacy Manifest & Android Photo Picker

## iOS — `NSPrivacyAccessed…`

Apple requires every iOS 17+ app that links a "required reason API" to declare an approved reason in its privacy manifest. Submission is rejected at the App Store layer if the manifest is missing or contains an unapproved code.

`app.json` ships with reasons for the four most common APIs you'll hit in a fresh Expo + expo-secure-store app:

| API category | Why we declared it | Reason code |
|---|---|---|
| `NSPrivacyAccessedAPICategoryUserDefaults` | `expo-secure-store` falls back to `UserDefaults` when the keychain is unavailable. | `CA92.1` — read/write data the app itself wrote. |
| `NSPrivacyAccessedAPICategoryFileTimestamp` | `expo-router`, `expo-asset`, and React Native's bundler stat their cache files. | `C617.1` — display info to the user inside the app. |
| `NSPrivacyAccessedAPICategorySystemBootTime` | React Native uses `mach_absolute_time` for performance telemetry. | `35F9.1` — measure how long an in-app operation took. |
| `NSPrivacyAccessedAPICategoryDiskSpace` | RN warns at low disk; some Expo modules pre-flight downloads. | `E174.1` — display info to the user inside the app. |

### When to add more reasons

If you add **any** module that uses one of the categories not listed above (`ActiveKeyboards`, `FileTimestamp` for non-display purposes, `UserDefaults` for cross-app sharing, etc.), open Apple's table at <https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api> and add the matching `NSPrivacyAccessedAPIType` block.

### Tracking

The starter declares:

```json
"NSPrivacyTracking": false,
"NSPrivacyTrackingDomains": [],
"NSPrivacyCollectedDataTypes": []
```

Flip `NSPrivacyTracking` to `true` and populate `NSPrivacyTrackingDomains` the moment you add an analytics or ads SDK. Otherwise the App Store will reject.

## Android — Photo Picker (Android 14, API 34+)

Android 14 introduced the **partial photo access** model: instead of the historical `READ_MEDIA_IMAGES` (all photos) you can declare `READ_MEDIA_VISUAL_USER_SELECTED` to request access only to images the user explicitly picks.

The starter declares the partial permission. If your app actually needs the full library:

```json
"android": {
  "permissions": [
    "READ_MEDIA_VISUAL_USER_SELECTED",
    "READ_MEDIA_IMAGES",
    "READ_MEDIA_VIDEO"
  ]
}
```

Always include `READ_MEDIA_VISUAL_USER_SELECTED` even if you also declare `READ_MEDIA_IMAGES` — it's the fallback when the user grants partial-only access on Android 14+.

## EAS Build

These declarations are picked up automatically by the Expo prebuild on EAS Build. No native code changes are required as long as the module versions match Expo SDK 53+.

## References

- [Apple — Describing data use in privacy manifests](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_data_use_in_privacy_manifests)
- [Apple — Required reason API](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api)
- [Android 14 — Photo picker permission](https://developer.android.com/training/data-storage/shared/photopicker)
