// Read-once env config for Google OAuth.
//
// Expo SDK 52 inlines `EXPO_PUBLIC_*` vars from `.env` into the bundle at build time,
// so `process.env.EXPO_PUBLIC_FOO` works on device. Missing vars here surface a clear
// error at the point of use (sign-in), not a cryptic OAuth failure later.

const WEB = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const ANDROID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

export const googleClientIds = {
  webClientId: WEB,
  iosClientId: IOS,
  androidClientId: ANDROID,
};

/**
 * Throw if the web client ID is missing. The web client ID is the minimum
 * required for Expo AuthSession proxy dev flow; native IDs are only needed
 * for standalone production builds.
 */
export function assertGoogleEnv() {
  if (!WEB) {
    throw new Error(
      'Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID. ' +
        'Create OAuth client IDs in Google Cloud Console and add them to .env. ' +
        'See .env.example and README "Auth" section.',
    );
  }
}
