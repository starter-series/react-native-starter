# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file is **append-only**. Each release on
[GitHub Releases](https://github.com/starter-series/react-native-starter/releases) is the
authoritative source — `.github/workflows/update-changelog.yml` prepends a
new entry here when a release is published, so the file mirrors the
release feed without duplicating maintenance.

## [Unreleased]

### Security

- **BREAKING:** `isSessionStillValid` now requires the id_token `iss` claim
  to be both present AND in the Google allowlist. Previously, an id_token
  with no `iss` claim bypassed the allowlist via short-circuit evaluation
  (CWE-345). Surfaced by the 2026-05-21 adversarial second-pass audit.
- `handleAuthResult` now also rejects a `type:'success'` response whose
  id_token carries a missing or non-Google `iss`, so the acquisition path
  enforces the same trust boundary as rehydration (post-fix review).

### Migration

- Sessions persisted under the previous lenient check (legacy installs that
  may have stored an iss-less token) will be rejected on first launch after
  upgrade and the user will be redirected to `/login`. The SecureStore
  blob is purged automatically — no manual cleanup required.
- The release commit subject uses the `!` SemVer-major marker. Treat the
  next release tag accordingly.

### Tests / CI

- Test count: 19 → 49. Coverage: 80.2/62.5 → 93+/77+ (statements/branches).
- `npm audit` threshold raised from `critical` to `high`. CI, CD pipelines
  (`cd-android.yml`, `cd-ios.yml`), and the weekly `maintenance.yml` job
  will fail at the audit step until the Expo SDK 52 → 55 upgrade lands.
  Intentional forcing function; not a CI regression.
- The `Build verification` step (`npx expo export --platform web 2>/dev/null`)
  was removed — it swallowed errors and produced a false-green signal.
  Web export is a non-goal per README.

