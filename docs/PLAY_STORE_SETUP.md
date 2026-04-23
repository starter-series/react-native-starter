# Play Store Setup (Android)

## Prerequisites

- [Google Play Console](https://play.google.com/console/) account ($25 one-time fee)
- Expo account with EAS configured (see [EXPO_SETUP.md](EXPO_SETUP.md))

## 1. Create a Google Play Developer Account

1. Go to [play.google.com/console/signup](https://play.google.com/console/signup)
2. Pay the $25 registration fee
3. Complete identity verification

## 2. Create an App in Google Play Console

1. Go to [play.google.com/console](https://play.google.com/console)
2. Click **Create app**
3. Fill in app details (name, language, app/game, free/paid)
4. Accept the declarations
5. Click **Create app**

## 3. Create a Service Account Key

This key allows EAS to upload builds to the Play Store automatically.

### 3.1 Enable the Google Play Android Developer API

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Go to **APIs & Services** → **Library**
4. Search for **Google Play Android Developer API**
5. Click **Enable**

### 3.2 Create a Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Name it something like `eas-submit`
4. Click **Create and Continue**
5. Skip the optional steps → **Done**

### 3.3 Generate a Key

1. Click on the service account you just created
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key** → **JSON**
4. Download the JSON file
5. Save it as `play-store-key.json` in your project root

> **Important:** This file is gitignored. Never commit it to version control.

### 3.4 Grant Permissions in Google Play Console

1. Go to [play.google.com/console](https://play.google.com/console)
2. Click **Users and permissions** → **Invite new users**
3. Enter the service account email (from the JSON file: `client_email`)
4. Under **App permissions**, add your app
5. Grant these permissions:
   - Release to production, exclude devices, and use Play App Signing
   - Release apps to testing tracks
   - Manage testing tracks and edit tester lists
6. Click **Invite user** → **Send invite**

## 4. Configure eas.json

The template ships without a `submit` block so you don't have to hand-edit placeholders. Run:

```bash
eas submit:configure
```

EAS will prompt you and write the values into `eas.json` under `submit.production.android`:

- `serviceAccountKeyPath`: path to the JSON you saved (e.g. `./play-store-key.json`)
- `track`: `internal`, `alpha`, `beta`, or `production`

See [Expo docs: Android submission](https://docs.expo.dev/submit/android/) for details.

## 5. First Submission

Google Play requires the first AAB to be uploaded manually:

1. Build your first production AAB:
   ```bash
   eas build --platform android --profile production
   ```
2. Download the AAB from [expo.dev](https://expo.dev) → your project → builds
3. Go to Google Play Console → your app → **Production** (or **Internal testing**)
4. Click **Create new release** → upload the AAB → **Save** → **Review release** → **Start rollout**

After the first manual upload, the CD workflow will handle all future deployments.

## Troubleshooting

### "Package name not found"
Ensure `android.package` in `app.json` matches what you registered in Google Play Console.

### "Service account doesn't have permission"
Double-check that the service account email has been invited in Google Play Console with the correct permissions. It can take a few hours for permissions to propagate.
