# App Store Setup (iOS)

## Prerequisites

- [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/year)
- Expo account with EAS configured (see [EXPO_SETUP.md](EXPO_SETUP.md))

## 1. Enroll in Apple Developer Program

1. Go to [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll/)
2. Sign in with your Apple ID
3. Complete enrollment ($99/year for individuals)
4. Wait for approval (usually within 48 hours)

## 2. Create an App in App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Platform:** iOS
   - **Name:** Your app name
   - **Primary language:** Your language
   - **Bundle ID:** Must match `ios.bundleIdentifier` in `app.json`
   - **SKU:** A unique identifier (e.g., `com.example.myapp`)
4. Click **Create**

## 3. Configure eas.json

The template ships without a `submit` block so you don't have to hand-edit placeholders. Run:

```bash
eas submit:configure
```

EAS will prompt you for the values below and write them into `eas.json` under `submit.production.ios`:

- `appleId`: Your Apple ID email
- `ascAppId`: App Store Connect → Your App → General → App Information → Apple ID
- `appleTeamId`: [developer.apple.com/account](https://developer.apple.com/account) → Membership Details → Team ID

See [Expo docs: iOS submission](https://docs.expo.dev/submit/ios/) for details.

## 4. Set Up Signing (EAS Manages This)

EAS can manage your certificates and provisioning profiles automatically:

```bash
eas credentials
```

Select iOS → Production → Let EAS manage everything.

This is one of the key benefits of EAS — you don't need a Mac or Xcode to manage iOS signing.

## 5. First Submission

Apple requires the first binary to be uploaded before automated submissions work smoothly:

```bash
# Build
eas build --platform ios --profile production

# Submit
eas submit --platform ios --profile production
```

After the first successful submission, the CD workflow will handle all future deployments.

## Troubleshooting

### "No suitable provisioning profile"
Run `eas credentials` and let EAS regenerate your provisioning profile.

### "App ID doesn't match"
Ensure `ios.bundleIdentifier` in `app.json` matches what you registered in App Store Connect.
