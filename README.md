<div align="center">

# React Native Starter

**Expo + Expo Router + GitHub Actions CI/CD + App Store & Play Store deploy.**

Build your app. Push to deploy.

[![CI](https://github.com/starter-series/react-native-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/starter-series/react-native-starter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Expo](https://img.shields.io/badge/Expo-SDK_52-000020.svg)](https://expo.dev)

**English** | [한국어](README.ko.md)

</div>

---

> **Part of [Starter Series](https://github.com/starter-series/starter-series)** — Stop explaining CI/CD to your AI every time. Clone and start.
>
> [Docker Deploy](https://github.com/starter-series/docker-deploy-starter) · [Discord Bot](https://github.com/starter-series/discord-bot-starter) · [Telegram Bot](https://github.com/starter-series/telegram-bot-starter) · [Browser Extension](https://github.com/starter-series/browser-extension-starter) · [Electron App](https://github.com/starter-series/electron-app-starter) · [npm Package](https://github.com/starter-series/npm-package-starter) · [React Native](https://github.com/starter-series/react-native-starter) · [VS Code Extension](https://github.com/starter-series/vscode-extension-starter) · [MCP Server](https://github.com/starter-series/mcp-server-starter)

---

## Quick Start

```bash
# 1. Click "Use this template" on GitHub (or clone)
git clone https://github.com/starter-series/react-native-starter.git my-app
cd my-app

# 2. Install dependencies
npm install

# 3. Start the dev server
npx expo start

# 4. Scan the QR code with Expo Go (or press 'a' for Android / 'i' for iOS)
```

## What's Included

```
├── app/                        # Expo Router app directory
│   ├── _layout.js              # Root layout (Stack navigator)
│   ├── index.js                # Home screen
│   └── about.js                # Example second screen
├── assets/                     # App icon, splash, adaptive icon
├── tests/                      # Add your tests here
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # Lint, test, audit
│   │   ├── cd-android.yml      # Build + submit to Play Store via EAS
│   │   ├── cd-ios.yml          # Build + submit to App Store via EAS
│   │   └── setup.yml           # Auto setup checklist on first use
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── EXPO_SETUP.md           # Expo account + EAS setup
│   ├── APP_STORE_SETUP.md      # Apple Developer + App Store Connect
│   └── PLAY_STORE_SETUP.md     # Google Play Console setup
├── scripts/
│   └── bump-version.js         # Bumps version in app.json + package.json
├── eslint.config.js            # ESLint v9 flat config
├── app.json                    # Expo config
├── eas.json                    # EAS Build profiles
└── package.json
```

## Features

- **Expo + Expo Router** -- file-based routing, no native toolchain required locally
- **CI Pipeline** -- security audit, lint, test on every push and PR
- **CD Pipeline** -- one-click deploy to App Store and Play Store via EAS Build
- **Cloud builds** -- EAS compiles native binaries in the cloud (no local Xcode/Android Studio needed)
- **Version management** -- `npm run version:patch/minor/major` to bump `app.json`
- **Starter code** -- Home screen + About screen with navigation
- **Store setup guides** -- step-by-step docs for Apple Developer, Google Play Console, and EAS
- **Template setup** -- auto-creates setup checklist issue on first use

## CI/CD

### CI (every PR + push to main)

| Step | What it does |
|------|-------------|
| Security audit | `npm audit` for dependency vulnerabilities |
| Lint | ESLint on app and component code |
| Test | Jest with React Native Testing Library |

### CD Android (manual trigger via Actions tab)

| Step | What it does |
|------|-------------|
| CI | Runs full CI first |
| Version guard | Fails if git tag already exists for this version |
| EAS Build | `eas build --platform android --profile production` |
| EAS Submit | Uploads AAB to Play Store (internal track) |
| GitHub Release | Creates a tagged release |

### CD iOS (manual trigger via Actions tab)

| Step | What it does |
|------|-------------|
| CI | Runs full CI first |
| Version guard | Fails if git tag already exists for this version |
| EAS Build | `eas build --platform ios --profile production` |
| EAS Submit | Uploads to App Store Connect |
| GitHub Release | Creates a tagged release |

**How to deploy:**

1. Set up `EXPO_TOKEN` secret (see below)
2. Configure store accounts (see [docs/](docs/))
3. Bump version: `npm run version:patch`
4. Go to **Actions** tab -> **Deploy to Play Store** or **Deploy to App Store** -> **Run workflow**

### GitHub Secrets

| Secret | Description |
|--------|-------------|
| `EXPO_TOKEN` | Expo access token for EAS CLI authentication |

See **[docs/EXPO_SETUP.md](docs/EXPO_SETUP.md)** for how to generate the token.

Store credentials are configured through `eas.json` and `eas credentials` -- not GitHub Secrets. See:
- **[docs/APP_STORE_SETUP.md](docs/APP_STORE_SETUP.md)** for iOS
- **[docs/PLAY_STORE_SETUP.md](docs/PLAY_STORE_SETUP.md)** for Android

## Development

```bash
# Start dev server
npx expo start

# Run on specific platform
npm run android
npm run ios

# Bump version (updates app.json + package.json)
npm run version:patch   # 1.0.0 -> 1.0.1
npm run version:minor   # 1.0.0 -> 1.1.0
npm run version:major   # 1.0.0 -> 2.0.0

# Lint & test
npm run lint
npm test
```

## Why This Over Manual Setup?

|  | This template | Starting from scratch |
|---|---|---|
| CI/CD | Full pipeline included | Set up yourself |
| EAS config | Pre-configured build profiles | Read docs, trial and error |
| Store deployment | One-click via GitHub Actions | Manual `eas build` + `eas submit` each time |
| Version management | `npm run version:patch` auto-bumps | Edit `app.json` by hand |
| Setup guides | Step-by-step docs included | Scattered across Expo docs, Apple docs, Google docs |
| AI/vibe-coding | LLMs generate clean Expo code | LLMs must understand your custom setup |
| Time to first deploy | Minutes (after store account setup) | Hours of configuration |

**The key insight:** EAS handles native builds in the cloud -- no local Xcode or Android Studio needed for CI/CD. This template wires that up to GitHub Actions so you get one-click deploys from day one.

### What about TypeScript?

This template uses JavaScript to stay lightweight. To add TypeScript:

1. Add `typescript` and `@types/react` to devDependencies
2. Add a `tsconfig.json`
3. Rename `.js` files to `.tsx`

Expo supports TypeScript out of the box -- no extra configuration needed.

## Contributing

PRs welcome. Please use the [PR template](.github/PULL_REQUEST_TEMPLATE.md).

## License

[MIT](LICENSE)
