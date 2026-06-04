// Read-once env config for Google OAuth.
//
// Expo SDK 52 inlines `EXPO_PUBLIC_*` vars from `.env` into the bundle at build time,
// so `process.env.EXPO_PUBLIC_FOO` works on device. Missing vars here surface a clear
// error at the point of use (sign-in), not a cryptic OAuth failure later.

/**
 * Read the client IDs from the environment. Read LAZILY (per call) rather than
 * once at module load so the missing-WEB-client guard in `assertGoogleEnv` is
 * actually reachable/testable: a test can clear the var and call the function
 * without having to re-import this module before its first read. Expo still
 * inlines `EXPO_PUBLIC_*` at build time, so on-device behaviour is unchanged —
 * `process.env.EXPO_PUBLIC_*` resolves to the inlined string literals.
 *
 * `env` is injectable purely for tests; production always passes `process.env`.
 */
export function readGoogleClientIds(env = process.env) {
  return {
    webClientId: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  };
}

// Live, lazily-evaluated view of the client IDs. Defined as a getter object so
// existing consumers (`googleClientIds.webClientId`) keep working unchanged
// while each access reflects the current environment.
export const googleClientIds = {
  get webClientId() {
    return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  },
  get iosClientId() {
    return process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  },
  get androidClientId() {
    return process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  },
};

/**
 * Throw if the web client ID is missing. The web client ID is the minimum
 * required for Expo AuthSession proxy dev flow; native IDs are only needed
 * for standalone production builds.
 *
 * `env` is injectable for tests so the missing-var path is reachable without
 * mutating global `process.env`; production callers pass nothing.
 */
export function assertGoogleEnv(env = process.env) {
  if (!env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
    throw new Error(
      'Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID. ' +
        'Create OAuth client IDs in Google Cloud Console and add them to .env. ' +
        'See .env.example and README "Auth" section.',
    );
  }
}
