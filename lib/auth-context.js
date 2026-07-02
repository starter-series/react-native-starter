import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { assertGoogleEnv, googleClientIds } from './env';

// Required on web + some managed flows: completes the auth popup when the
// redirect lands back in the app. No-op on native. Safe to call at module load.
WebBrowser.maybeCompleteAuthSession();

export const STORAGE_KEY = 'auth.session.v1';

const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
});

/**
 * Decode a JWT payload WITHOUT verifying the signature.
 * Safe here because `id_token` came from Google over TLS via expo-auth-session's
 * PKCE flow — we only read the public claims (email, name, picture).
 * Never trust this output for authorization on a server; verify on the backend.
 */
export function decodeIdToken(idToken) {
  if (typeof idToken !== 'string') return null;
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  try {
    // base64url -> base64
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    // `atob` is available in Hermes/React Native and Node >= 16.
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function userFromClaims(claims) {
  if (!claims) return null;
  return {
    email: claims.email ?? null,
    name: claims.name ?? null,
    picture: claims.picture ?? null,
    sub: claims.sub ?? null,
  };
}

// Google's documented `iss` values. Anything else means we're rehydrating
// a token from a different IdP — not what this starter assumes.
const ALLOWED_ISSUERS = new Set([
  'https://accounts.google.com',
  'accounts.google.com',
]);

/**
 * Reject sessions whose id_token has expired or wasn't issued by Google.
 * The token came from Google over TLS via PKCE, so this isn't a server-grade
 * check — it's the *client*'s self-defense against a stolen device replaying
 * an old SecureStore blob. Returns true when the session should be honoured.
 */
export function isSessionStillValid(session, now = Date.now()) {
  const idToken = session?.tokens?.idToken;
  if (!idToken) return false;
  const claims = decodeIdToken(idToken);
  if (!claims) return false;
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= now) return false;
  // Require a present, allow-listed issuer. A falsy/missing `iss` must NOT
  // pass: otherwise a token minted without an `iss` claim sails through the
  // issuer check, letting a stolen-device replay (or a token from another IdP
  // with no issuer) be honoured.
  if (!claims.iss || !ALLOWED_ISSUERS.has(claims.iss)) return false;
  return true;
}

/**
 * Pure post-auth handler. Exported so tests can cover the result -> user pipeline
 * without mocking `useAuthRequest` internals.
 *
 * `setSession` receives `{ user, tokens }` on success, `null` on dismissal.
 * Throws on error AND on a `success` whose id_token can't be turned into a
 * trustworthy session — the caller's effect maps the throw to `setError`.
 * Crucially, nothing is written to SecureStore unless the session passes the
 * SAME `isSessionStillValid` gate used when restoring on cold start, so a
 * session is never "valid enough to log in but purged next launch".
 */
export async function handleAuthResult(response, setSession, deps = {}) {
  const store = deps.store ?? SecureStore;
  const isValid = deps.isSessionStillValid ?? isSessionStillValid;

  if (!response) return;
  if (response.type === 'success') {
    const idToken =
      response.params?.id_token ?? response.authentication?.idToken ?? null;
    const accessToken =
      response.authentication?.accessToken ?? response.params?.access_token ?? null;
    const claims = decodeIdToken(idToken);
    const user = userFromClaims(claims);
    const session = { user, tokens: { idToken, accessToken } };
    // A `success` with no decodable / no longer trustworthy id_token must NOT
    // be persisted as a `{ user: null }` session. Surface an error and skip
    // the SecureStore write entirely — same trust model as restore-on-mount.
    if (!user || !isValid(session)) {
      throw new Error(
        'Google sign-in returned no usable id_token; not persisting session.',
      );
    }
    // Persist only what restore actually needs (the id_token + minimal user
    // claims). The access token is never read on cold start, so keep it out of
    // the SecureStore blob — this trims the payload well clear of Android
    // SecureStore's 2048-byte per-value warning threshold, above which the
    // write can be silently dropped (only a console.warn, no throw).
    const persisted = { user, tokens: { idToken } };
    const serialized = JSON.stringify(persisted);
    await store.setItemAsync(STORAGE_KEY, serialized);
    // Verify-after-write: expo-secure-store may drop an oversized value without
    // throwing, so read it back. If it didn't land, surface an error via the
    // caller's .catch -> setError instead of pretending the session persisted.
    const readBack = await store.getItemAsync(STORAGE_KEY);
    if (readBack !== serialized) {
      throw new Error(
        'Failed to persist session to secure storage (value may exceed the ' +
          'platform size limit); not treating sign-in as complete.',
      );
    }
    // Keep the access token in in-memory state only (not persisted above).
    setSession(session);
    return;
  }
  if (response.type === 'error') {
    throw response.error ?? new Error('Google sign-in failed.');
  }
  // `dismiss` / `cancel` -> no-op
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // `useAuthRequest` returns [request, response, promptAsync].
  // We build the config lazily and guard on env at signIn time so tests / dev
  // without client IDs don't crash at import.
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: googleClientIds.webClientId,
    iosClientId: googleClientIds.iosClientId,
    androidClientId: googleClientIds.androidClientId,
    webClientId: googleClientIds.webClientId,
    scopes: ['openid', 'profile', 'email'],
  });

  // Restore from SecureStore on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw);
          if (isSessionStillValid(parsed)) {
            setSession(parsed);
          } else {
            // Token expired or issuer mismatch — clear the blob so a fresh
            // sign-in is forced. Without this, an expired token persists
            // and the UI treats the user as signed in indefinitely.
            await SecureStore.deleteItemAsync(STORAGE_KEY);
          }
        }
      } catch {
        // Corrupt blob (JSON.parse failed) -> purge it so we don't re-read and
        // re-fail on every cold start, then treat as signed out. Mirrors the
        // expired/issuer-mismatch branch above.
        try {
          await SecureStore.deleteItemAsync(STORAGE_KEY);
        } catch {
          // best-effort cleanup; nothing more we can do here.
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // React to the auth response.
  useEffect(() => {
    if (!response) return;
    handleAuthResult(response, setSession).catch((e) => setError(e));
  }, [response]);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      assertGoogleEnv();
      if (!request) {
        // `useAuthRequest` not ready yet — retry shortly.
        throw new Error('Auth request not ready. Try again in a moment.');
      }
      await promptAsync();
    } catch (e) {
      setError(e);
      throw e;
    }
  }, [request, promptAsync]);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      tokens: session?.tokens ?? null,
      loading,
      error,
      signIn,
      signOut,
    }),
    [session, loading, error, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
