#!/usr/bin/env bash
# EAS Build pre-install hook — runs before npm install on EAS build servers.
# Use for: injecting build-time env vars, patching native deps, etc.
#
# Available env vars on EAS:
#   EAS_BUILD_PROFILE       — "development" | "preview" | "production" (from eas.json)
#   EAS_BUILD_PLATFORM      — "android" | "ios"
#   EAS_BUILD_RUNNER        — "eas-build" on EAS cloud, unset locally
#   EAS_BUILD_WORKINGDIR    — absolute path to the project on the builder
#
# Docs: https://docs.expo.dev/build-reference/npm-hooks/

set -euo pipefail

echo "[eas-hook] pre-install running (profile=${EAS_BUILD_PROFILE:-unknown}, platform=${EAS_BUILD_PLATFORM:-unknown})"

# Example 1: bail if a required build-time secret is missing.
# Set it via `eas secret:create` — it will be exposed as an env var on the builder.
# : "${SENTRY_AUTH_TOKEN:?Missing SENTRY_AUTH_TOKEN — run 'eas secret:create' to add it}"

# Example 2: write a build-time env file consumed by app.config.js / native code.
# cat > .env.production <<EOF
# API_URL=${API_URL:-https://api.example.com}
# SENTRY_DSN=${SENTRY_DSN:-}
# EOF

# Example 3: apply patches with patch-package after install — usually belongs
# in `eas-build-post-install.sh` instead, since patch-package needs node_modules.
