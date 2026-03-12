# React Native Starter

Expo + Expo Router app with EAS Build/Submit CI/CD for App Store and Play Store.

## Project Structure

```
app/                → Expo Router pages (file-based routing)
  _layout.js        → Root layout
  index.js          → Home screen
  about.js          → Example screen
assets/             → App icons and splash images
  icon.png          → App icon
  splash.png        → Splash screen
  adaptive-icon.png → Android adaptive icon
app.json            → Expo configuration (name, slug, bundle IDs)
eas.json            → EAS Build + Submit configuration
play-store-key.example.json → Google Play service account template
scripts/
  bump-version.js   → Version bumping (updates app.json)
docs/
  EXPO_SETUP.md     → Expo account + EAS setup
  APP_STORE_SETUP.md → Apple Developer + App Store Connect
  PLAY_STORE_SETUP.md → Google Play Console + service account
```

## CI/CD Pipeline

- **ci.yml**: Push/PR to main. ESLint + Jest + npm audit. No secrets.
- **cd-ios.yml**: Manual trigger. CI gate → EAS Build (iOS) → Submit to App Store → GitHub Release.
- **cd-android.yml**: Manual trigger. CI gate → EAS Build (Android) → Submit to Play Store → GitHub Release.
- **setup.yml**: First push only. Creates setup checklist Issue.

## Secrets

| Secret | Required | Purpose |
|--------|----------|---------|
| `EXPO_TOKEN` | Yes | EAS Build + Submit authentication |

Credentials for stores are managed via `eas credentials` (not GitHub Secrets).

## Configuration Files

**app.json** — Modify these:
- `expo.name` → App display name
- `expo.slug` → URL-friendly name (used by Expo)
- `expo.ios.bundleIdentifier` → iOS bundle ID (com.yourname.yourapp)
- `expo.android.package` → Android package name (com.yourname.yourapp)

**eas.json** — Modify `submit.production`:
- `ios.appleId` → Your Apple ID email
- `ios.ascAppId` → App Store Connect app ID
- `ios.appleTeamId` → Apple Developer Team ID
- `android.serviceAccountKeyPath` → Path to play-store-key.json

## What to Modify

- `app/` → Your screens and navigation (Expo Router file-based routing)
- `assets/` → Replace all 3 images (icon, splash, adaptive-icon)
- `app.json` → App metadata and bundle identifiers
- `eas.json` → Store submission config
- `play-store-key.json` → Copy from play-store-key.example.json, fill with real credentials (gitignored)
- Version → `npm run version:patch|minor|major` (updates app.json, not package.json)

## Do NOT Modify

- CD workflow structure (EAS Build → Submit flow)
  - **Why**: Build 완료 후 Submit이 실행되어야 함. 순서 변경 시 빌드 안 된 바이너리를 스토어에 제출.
- `eas.json` build profiles (development/preview/production)
  - **Why**: EAS CLI가 이 프로필 이름을 참조. 이름 변경 시 `eas build --profile production` 실패.
- `autoIncrement: true` in production build
  - **Why**: App Store/Play Store는 빌드 번호가 매번 증가해야 함. 수동 관리하면 빌드 번호 충돌로 제출 거절.
- Version guard logic
  - **Why**: 같은 버전으로 스토어 제출 시 거절됨.

## Key Patterns

- Version lives in `app.json` (not package.json) — bump script handles this
- Expo Router uses file-based routing in `app/` directory
- EAS handles code signing credentials (`eas credentials` command)
- Separate workflows for iOS and Android (different build times, independent releases)
- First store upload must be done manually before CI/CD can submit updates
