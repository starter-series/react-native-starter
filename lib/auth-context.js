import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
 *
 * The `iss` claim is REQUIRED, not optional. A token missing `iss` is by
 * definition not Google-issued, so accepting it would defeat the allowlist.
 */
export function isSessionStillValid(session, now = Date.now()) {
  const idToken = session?.tokens?.idToken;
  if (!idToken) return false;
  const claims = decodeIdToken(idToken);
  if (!claims) return false;
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= now) return false;
  // Require iss AND match the allowlist. A missing iss must be rejected:
  // an `iss`-less token cannot have come from Google's documented OIDC flow.
  if (typeof claims.iss !== 'string' || !ALLOWED_ISSUERS.has(claims.iss)) {
    return false;
  }
  return true;
}

/**
 * Pure post-auth handler. Exported so tests can cover the result -> user pipeline
 * without mocking `useAuthRequest` internals.
 *
 * `setSession` receives `{ user, tokens }` on success, `null` on dismissal, or
 * throws on error.
 */
export async function handleAuthResult(response, setSession, deps = {}) {
  const store = deps.store ?? SecureStore;

  if (!response) return;
  if (response.type === 'success') {
    const idToken =
      response.params?.id_token ?? response.authentication?.idToken ?? null;
    const accessToken =
      response.authentication?.accessToken ?? response.params?.access_token ?? null;
    // A `type:'success'` response without an id_token cannot establish
    // identity — the scope requested includes `openid` so Google always
    // returns one. Treating this as success would persist a `{user:null,...}`
    // blob to SecureStore that's then deleted on the next mount: a real but
    // self-healing state-corruption bug surfaced by the 2026-05-21 audit.
    if (!idToken) {
      throw new Error(
        'Auth success response missing id_token. Refusing to persist a userless session.',
      );
    }
    const claims = decodeIdToken(idToken);
    // Enforce the SAME issuer allowlist on acquisition that
    // isSessionStillValid enforces on rehydration. Asymmetric enforcement
    // (lax acquire / strict rehydrate) was flagged by the 2026-05-21
    // post-fix review: the threat model is narrower here (response came
    // over TLS from Google), but if the token is going to be deleted on
    // the next mount because iss is missing, persisting it once + flipping
    // the UI to "signed in" produces a confusing flash. Reject upfront.
    if (
      !claims ||
      typeof claims.iss !== 'string' ||
      !ALLOWED_ISSUERS.has(claims.iss)
    ) {
      throw new Error(
        'Auth success response carried an id_token that is not Google-issued (missing or unrecognised iss claim).',
      );
    }
    const user = userFromClaims(claims);
    const session = { user, tokens: { idToken, accessToken } };
    await store.setItemAsync(STORAGE_KEY, JSON.stringify(session));
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
        // corrupt blob -> treat as signed out
        // TODO(2nd-pass-audit-2026-05-21): also call deleteItemAsync here
        // so a corrupt blob is purged rather than re-read on every mount.
        // Self-healing on next successful sign-in, but explicit is better.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // React to the auth response. Guard against re-handling the SAME response
  // object if the effect re-runs (StrictMode double-invoke in dev, or any
  // upstream re-render that keeps `response` identity-stable). Without this,
  // a malformed success response would re-throw on every render, repeatedly
  // setError-ing with no recovery path. Surfaced by the 2026-05-21 review.
  const handledResponseRef = useRef(null);
  useEffect(() => {
    if (!response) return;
    if (handledResponseRef.current === response) return;
    handledResponseRef.current = response;
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
