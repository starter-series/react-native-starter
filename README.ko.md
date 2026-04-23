<div align="center">

# React Native Starter

**Expo + Expo Router + GitHub Actions CI/CD + App Store & Play Store 배포.**

앱을 만들고, push로 배포하세요.

[![CI](https://github.com/starter-series/react-native-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/starter-series/react-native-starter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Expo](https://img.shields.io/badge/Expo-SDK_52-000020.svg)](https://expo.dev)

[English](README.md) | **한국어**

</div>

---

> **[Starter Series](https://github.com/starter-series/starter-series)** — 매번 AI한테 CI/CD 설명하지 마세요. clone하고 바로 시작하세요.
>
> [Docker Deploy](https://github.com/starter-series/docker-deploy-starter) · [Discord Bot](https://github.com/starter-series/discord-bot-starter) · [Telegram Bot](https://github.com/starter-series/telegram-bot-starter) · [Browser Extension](https://github.com/starter-series/browser-extension-starter) · [Electron App](https://github.com/starter-series/electron-app-starter) · [npm Package](https://github.com/starter-series/npm-package-starter) · **React Native** · [VS Code Extension](https://github.com/starter-series/vscode-extension-starter) · [MCP Server](https://github.com/starter-series/mcp-server-starter) · [Python MCP Server](https://github.com/starter-series/python-mcp-server-starter) · [Cloudflare Pages](https://github.com/starter-series/cloudflare-pages-starter)

---

## 빠른 시작

**[create-starter](https://github.com/starter-series/create-starter) 사용** (권장):

```bash
npx @starter-series/create my-app --template react-native
cd my-app && npm install && npx expo start
```

**또는 직접 clone:**

```bash
git clone https://github.com/starter-series/react-native-starter my-app
cd my-app && npm install && npx expo start
```

그런 다음 Expo Go로 QR 코드를 스캔하세요 (또는 `a`로 Android / `i`로 iOS).

## 포함된 구성

```
├── app/                        # Expo Router 앱 디렉토리
│   ├── _layout.js              # 루트 레이아웃 — 전체를 <AuthProvider>로 감쌈
│   ├── (app)/                  # 인증 필요 그룹 (로그아웃 시 /login 리다이렉트)
│   │   ├── _layout.js          # 가드 레이아웃
│   │   ├── index.js            # 홈 화면
│   │   ├── about.js            # 예시 두 번째 화면
│   │   └── profile.js          # 로그인 유저 정보 + 로그아웃
│   └── (auth)/
│       ├── _layout.js          # 이미 로그인 상태면 / 로 리다이렉트
│       └── login.js            # "Continue with Google" 화면
├── lib/
│   ├── auth-context.js         # AuthProvider + useAuth + handleAuthResult
│   └── env.js                  # EXPO_PUBLIC_GOOGLE_* 클라이언트 ID 로드
├── assets/                     # 앱 아이콘, 스플래시, 어댑티브 아이콘
├── tests/                      # Jest 테스트 (auth-context, screens, 구조)
├── .env.example                # Google OAuth 클라이언트 ID 예시
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # 린트, 테스트, 감사
│   │   ├── cd-android.yml      # EAS로 Play Store 빌드 + 제출
│   │   ├── cd-ios.yml          # EAS로 App Store 빌드 + 제출
│   │   └── setup.yml           # 첫 사용 시 자동 설정 체크리스트
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── EXPO_SETUP.md           # Expo 계정 + EAS 설정
│   ├── APP_STORE_SETUP.md      # Apple Developer + App Store Connect
│   └── PLAY_STORE_SETUP.md     # Google Play Console 설정
├── scripts/
│   └── bump-version.js         # app.json + package.json 버전 업
├── eas-hooks/
│   └── eas-build-pre-install.sh  # EAS Build 훅 예시
├── eslint.config.js            # ESLint v9 flat config
├── app.json                    # Expo 설정
├── eas.json                    # EAS Build 프로필
└── package.json
```

## 주요 기능

- **Expo + Expo Router** -- 파일 기반 라우팅, 로컬에 네이티브 툴체인 불필요
- **CI 파이프라인** -- 모든 push와 PR에서 보안 감사, 린트, 테스트 실행
- **CD 파이프라인** -- EAS Build를 통한 원클릭 App Store / Play Store 배포
- **클라우드 빌드** -- EAS가 클라우드에서 네이티브 바이너리 컴파일 (로컬 Xcode/Android Studio 불필요)
- **버전 관리** -- `npm run version:patch/minor/major`로 `app.json` 버전 업
- **스타터 코드** -- 홈 + About + Profile 화면 + Google OAuth 로그인 연결 완료
- **스토어 설정 가이드** -- Apple Developer, Google Play Console, EAS 단계별 문서
- **템플릿 셋업** -- 첫 사용 시 설정 체크리스트 이슈 자동 생성

## CI/CD

### CI (모든 PR + main push 시)

| 단계 | 역할 |
|------|------|
| 보안 감사 | `npm audit`로 의존성 취약점 확인 |
| 린트 | ESLint로 앱 및 컴포넌트 코드 검사 |
| 테스트 | Jest + React Native Testing Library |

### 보안 & 유지보수

| 워크플로우 | 역할 |
|-----------|------|
| CodeQL (`codeql.yml`) | 보안 취약점 정적 분석 (push/PR + 주간) |
| Maintenance (`maintenance.yml`) | 주간 CI 헬스 체크 — 실패 시 이슈 자동 생성 |
| Stale (`stale.yml`) | 비활성 이슈/PR 30일 후 라벨링, 7일 후 자동 종료 |

### CD Android (Actions 탭에서 수동 실행)

| 단계 | 역할 |
|------|------|
| CI | 전체 CI 먼저 실행 |
| 버전 가드 | 해당 버전의 git 태그가 이미 있으면 실패 |
| EAS Build | `eas build --platform android --profile production` |
| EAS Submit | AAB를 Play Store에 업로드 (internal 트랙) |
| GitHub Release | 태그된 릴리즈 자동 생성 |

### CD iOS (Actions 탭에서 수동 실행)

| 단계 | 역할 |
|------|------|
| CI | 전체 CI 먼저 실행 |
| 버전 가드 | 해당 버전의 git 태그가 이미 있으면 실패 |
| EAS Build | `eas build --platform ios --profile production` |
| EAS Submit | App Store Connect에 업로드 |
| GitHub Release | 태그된 릴리즈 자동 생성 |

**배포 방법:**

1. `EXPO_TOKEN` 시크릿 설정 (아래 참조)
2. 스토어 계정 설정 ([docs/](docs/) 참조)
3. `eas submit:configure`를 한 번 실행해 `eas.json`의 `submit` 블록에 Apple/Google 자격 증명 채우기
4. 버전 업: `npm run version:patch`
5. **Actions** 탭 -> **Deploy to Play Store** 또는 **Deploy to App Store** -> **Run workflow**

### GitHub Secrets

| Secret | 설명 |
|--------|------|
| `EXPO_TOKEN` | EAS CLI 인증을 위한 Expo 액세스 토큰 |

토큰 생성 방법은 **[docs/EXPO_SETUP.md](docs/EXPO_SETUP.md)**를 참고하세요.

스토어 자격 증명은 `eas.json`과 `eas credentials`로 설정합니다 (GitHub Secrets가 아님):
- **[docs/APP_STORE_SETUP.md](docs/APP_STORE_SETUP.md)** - iOS
- **[docs/PLAY_STORE_SETUP.md](docs/PLAY_STORE_SETUP.md)** - Android

## EAS Build 훅 (Hooks)

EAS Build 생명주기 중간에 커스텀 스크립트를 실행합니다. `eas-hooks/<이름>.sh` 위치의 스크립트는 EAS CLI가 **자동 감지**합니다 — `eas.json` 설정 불필요. 시작할 수 있게 `eas-build-pre-install.sh` 예시가 포함되어 있습니다.

| 훅 | 실행 시점 | 용도 |
|----|----------|------|
| `eas-build-pre-install.sh` | `npm install` 전 | 환경 변수 주입, 필수 시크릿 검증, `.env` 파일 생성 |
| `eas-build-post-install.sh` | `npm install` 후, prebuild 전 | `patch-package`, 네이티브 모듈 설정, Ruby/CocoaPods 조정 |
| `eas-build-on-success.sh` | 빌드 성공 후 | 알림, 추가 아티팩트 업로드 |
| `eas-build-on-error.sh` | 빌드 실패 시 | 에러 리포팅, 디버깅 출력 |
| `eas-build-on-cancel.sh` | 빌드 취소 시 | 정리 작업 |

스크립트는 **실행 가능**해야 하며 (`chmod +x`), 실행 비트가 설정된 상태로 커밋해야 합니다. 훅에 시크릿을 노출하려면 `eas secret:create`를 사용하세요.

문서: [Run custom scripts with npm hooks](https://docs.expo.dev/build-reference/npm-hooks/)

## 개발

```bash
# 개발 서버 시작
npx expo start

# 특정 플랫폼에서 실행
npm run android
npm run ios

# 버전 업 (app.json + package.json 자동 업데이트)
npm run version:patch   # 1.0.0 -> 1.0.1
npm run version:minor   # 1.0.0 -> 1.1.0
npm run version:major   # 1.0.0 -> 2.0.0

# 린트 & 테스트
npm run lint
npm test
```

## 직접 설정하는 것 대비 장점

|  | 이 템플릿 | 처음부터 직접 |
|---|---|---|
| CI/CD | 풀 파이프라인 포함 | 직접 설정 |
| EAS 설정 | 빌드 프로필 사전 구성 | 문서 읽고 시행착오 |
| 스토어 배포 | GitHub Actions에서 원클릭 | 매번 수동 `eas build` + `eas submit` |
| 버전 관리 | `npm run version:patch` 자동 범프 | `app.json` 직접 수정 |
| 설정 가이드 | 단계별 문서 포함 | Expo, Apple, Google 문서 여기저기 |
| AI/바이브코딩 | LLM이 깔끔한 Expo 코드 생성 | LLM이 커스텀 설정을 이해해야 함 |
| 첫 배포까지 | 수 분 (스토어 계정 설정 후) | 설정에 수 시간 |

**핵심:** EAS가 클라우드에서 네이티브 빌드를 처리합니다 -- CI/CD에 로컬 Xcode나 Android Studio가 필요 없습니다. 이 템플릿은 그것을 GitHub Actions에 연결해서 첫날부터 원클릭 배포를 제공합니다.

### 인증(Google OAuth, 내장)

Google 로그인이 `expo-auth-session` + `expo-secure-store` 조합으로 **이미 연결**되어 있습니다. `app/(app)/` 아래 라우트는 인증 필수이며, 로그아웃 상태면 `/login`으로 자동 리다이렉트됩니다. 토큰은 iOS Keychain / Android Keystore에 저장되며, `AsyncStorage`는 사용하지 않습니다.

**설정:**

1. [Google Cloud Console → 사용자 인증 정보](https://console.cloud.google.com/apis/credentials) → **OAuth 클라이언트 ID 만들기**. 세 개 생성:
   - **웹 애플리케이션** (필수 — 개발 시 Expo AuthSession 프록시가 사용)
   - **iOS** — 번들 ID = `app.json`의 `ios.bundleIdentifier`
   - **Android** — 패키지 = `android.package`, 키스토어의 SHA-1 (`eas credentials`로 확인 가능)
2. `cp .env.example .env` 후 클라이언트 ID 붙여넣기:
   ```
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
   ```
3. `npx expo start` 실행 후 **Continue with Google** 탭.

클라이언트 ID가 없으면 로그인 버튼이 크래시 없이 명확한 에러 메시지를 표시합니다. 다른 provider로 바꾸려면 `lib/auth-context.js`에서 `expo-auth-session/providers/google`만 교체하면 됩니다.

문서: [Expo Google 인증 가이드](https://docs.expo.dev/guides/google-authentication/).

### TypeScript는?

이 템플릿은 가볍게 유지하기 위해 JavaScript를 사용합니다. TypeScript가 필요하면:

1. `devDependencies`에 `typescript`와 `@types/react` 추가
2. `tsconfig.json` 추가
3. `.js` 파일을 `.tsx`로 변경

Expo는 TypeScript를 기본 지원합니다 -- 추가 설정 불필요.

## 기여

PR 환영합니다. [PR 템플릿](.github/PULL_REQUEST_TEMPLATE.md)을 사용해 주세요.

## 라이선스

[MIT](LICENSE)
