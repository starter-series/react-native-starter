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
    const claims = decodeIdToken(idToken);
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
        if (!cancelled && raw) setSession(JSON.parse(raw));
      } catch {
        // corrupt blob -> treat as signed out
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
