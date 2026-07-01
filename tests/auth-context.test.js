import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

// --- Mocks --------------------------------------------------------------

// In-memory SecureStore substitute. Exposed so tests can assert + reset it.
// Name must start with `mock` — Jest allows that through its factory-hoist guard.
const mockMemStore = new Map();
const mockSecureStore = {
  getItemAsync: jest.fn(async (k) =>
    mockMemStore.has(k) ? mockMemStore.get(k) : null,
  ),
  setItemAsync: jest.fn(async (k, v) => {
    mockMemStore.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k) => {
    mockMemStore.delete(k);
  }),
};

jest.mock('expo-secure-store', () => mockSecureStore);

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

// Prevent `useAuthRequest` from reaching the network / native discovery.
jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: () => [{ state: 'ready' }, null, jest.fn(async () => ({ type: 'cancel' }))],
}));

// Env: pretend the web client ID is set.
process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-web-client-id';

// --- Fixture: a Google id_token (not signature-verified, only decoded) ---
// header.payload.signature where payload is base64url(JSON).
// Helper so each test can mint a token with exactly the claims it needs.
function makeIdToken(overrides = {}) {
  const claims = {
    iss: 'https://accounts.google.com',
    sub: 'goog-123',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    picture: 'https://example.com/ada.png',
    // Far-future exp so isSessionStillValid() accepts it across CI runs.
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10,
    ...overrides,
  };
  const payloadB64 = Buffer.from(JSON.stringify(claims))
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `eyJhbGciOiJSUzI1NiJ9.${payloadB64}.sig`;
}

const fakeIdToken = makeIdToken();
const sessionWith = (idToken) => ({ tokens: { idToken, accessToken: 'a' } });

// --- Consumer probe -----------------------------------------------------

const {
  AuthProvider,
  useAuth,
  handleAuthResult,
  decodeIdToken,
  isSessionStillValid,
  STORAGE_KEY,
} = require('../lib/auth-context');

const { assertGoogleEnv, readGoogleClientIds } = require('../lib/env');

function Probe({ onUser }) {
  const ctx = useAuth();
  onUser?.(ctx);
  if (ctx.loading) return <Text>loading</Text>;
  return <Text>{ctx.user ? `user:${ctx.user.email}` : 'anon'}</Text>;
}

beforeEach(() => {
  mockMemStore.clear();
  mockSecureStore.getItemAsync.mockClear();
  mockSecureStore.setItemAsync.mockClear();
  mockSecureStore.deleteItemAsync.mockClear();
});

// -----------------------------------------------------------------------

describe('decodeIdToken', () => {
  test('returns claims for a valid JWT', () => {
    expect(decodeIdToken(fakeIdToken)).toMatchObject({
      email: 'ada@example.com',
      name: 'Ada Lovelace',
    });
  });

  test('returns null for malformed input', () => {
    expect(decodeIdToken('not-a-jwt')).toBeNull();
    expect(decodeIdToken(null)).toBeNull();
    expect(decodeIdToken('aaa.!!!.ccc')).toBeNull();
  });
});

describe('isSessionStillValid', () => {
  const FIXED_NOW = 1_700_000_000_000; // fixed clock so exp math is deterministic
  const futureExp = Math.floor(FIXED_NOW / 1000) + 3600;
  const pastExp = Math.floor(FIXED_NOW / 1000) - 3600;

  test('accepts a session with a future exp and an allow-listed issuer', () => {
    const s = sessionWith(makeIdToken({ exp: futureExp, iss: 'https://accounts.google.com' }));
    expect(isSessionStillValid(s, FIXED_NOW)).toBe(true);
    // The bare-host issuer Google also documents must pass too.
    const s2 = sessionWith(makeIdToken({ exp: futureExp, iss: 'accounts.google.com' }));
    expect(isSessionStillValid(s2, FIXED_NOW)).toBe(true);
  });

  test('rejects an expired token even with a valid issuer', () => {
    const s = sessionWith(makeIdToken({ exp: pastExp, iss: 'https://accounts.google.com' }));
    expect(isSessionStillValid(s, FIXED_NOW)).toBe(false);
  });

  // --- Replay-bypass guard. These are the tests that FAIL if line ~82 ever
  // reverts to `if (claims.iss && !ALLOWED_ISSUERS.has(claims.iss))`, because
  // a falsy `iss` would then short-circuit the issuer check and return true.
  test('rejects a token whose iss claim is MISSING (replay-bypass guard)', () => {
    const s = sessionWith(makeIdToken({ exp: futureExp, iss: undefined }));
    expect(isSessionStillValid(s, FIXED_NOW)).toBe(false);
  });

  test('rejects a token whose iss claim is the empty string', () => {
    const s = sessionWith(makeIdToken({ exp: futureExp, iss: '' }));
    expect(isSessionStillValid(s, FIXED_NOW)).toBe(false);
  });

  test('rejects a token from a foreign (non-Google) issuer', () => {
    const s = sessionWith(makeIdToken({ exp: futureExp, iss: 'https://evil.example.com' }));
    expect(isSessionStillValid(s, FIXED_NOW)).toBe(false);
  });

  test('rejects when there is no id_token or it is undecodable', () => {
    expect(isSessionStillValid(undefined, FIXED_NOW)).toBe(false);
    expect(isSessionStillValid({ tokens: {} }, FIXED_NOW)).toBe(false);
    expect(isSessionStillValid(sessionWith('not-a-jwt'), FIXED_NOW)).toBe(false);
  });

  test('rejects when exp is non-numeric (no silent pass)', () => {
    const s = sessionWith(makeIdToken({ exp: 'soon', iss: 'https://accounts.google.com' }));
    expect(isSessionStillValid(s, FIXED_NOW)).toBe(false);
  });
});

describe('handleAuthResult (pure)', () => {
  test('success result populates user + writes SecureStore', async () => {
    const setSession = jest.fn();
    await handleAuthResult(
      {
        type: 'success',
        params: { id_token: fakeIdToken },
        authentication: { accessToken: 'at-1' },
      },
      setSession,
    );

    expect(setSession).toHaveBeenCalledTimes(1);
    const session = setSession.mock.calls[0][0];
    expect(session.user).toMatchObject({
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      picture: 'https://example.com/ada.png',
    });
    expect(session.tokens).toEqual({ idToken: fakeIdToken, accessToken: 'at-1' });
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.any(String),
    );
  });

  test('cancel result is a no-op', async () => {
    const setSession = jest.fn();
    await handleAuthResult({ type: 'cancel' }, setSession);
    expect(setSession).not.toHaveBeenCalled();
    expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  test('error result throws', async () => {
    const setSession = jest.fn();
    const err = new Error('boom');
    await expect(
      handleAuthResult({ type: 'error', error: err }, setSession),
    ).rejects.toBe(err);
    expect(setSession).not.toHaveBeenCalled();
  });

  // --- Finding: a `success` with no decodable id_token must surface an error
  // and SKIP the SecureStore write, NOT persist a `{ user: null }` session.
  // FAILS if handleAuthResult reverts to unconditionally writing the session.
  test('success with NO decodable id_token throws and writes nothing', async () => {
    const setSession = jest.fn();
    await expect(
      handleAuthResult(
        // No params.id_token and no authentication.idToken -> idToken === null.
        { type: 'success', params: {}, authentication: { accessToken: 'at-1' } },
        setSession,
      ),
    ).rejects.toThrow(/no usable id_token/i);
    expect(setSession).not.toHaveBeenCalled();
    expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(mockMemStore.has(STORAGE_KEY)).toBe(false);
  });

  test('success with a garbage (undecodable) id_token throws and writes nothing', async () => {
    const setSession = jest.fn();
    await expect(
      handleAuthResult(
        { type: 'success', params: { id_token: 'totally.not.ajwt!!!' } },
        setSession,
      ),
    ).rejects.toThrow(/no usable id_token/i);
    expect(setSession).not.toHaveBeenCalled();
    expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  // --- Finding: live sign-in and restore must share ONE trust model. A
  // `success` carrying an EXPIRED token must be rejected at sign-in time too,
  // not "valid enough to log in but purged on next launch".
  // FAILS if handleAuthResult stops gating on isSessionStillValid.
  test('success with an EXPIRED id_token is rejected (unified trust model)', async () => {
    const setSession = jest.fn();
    const expired = makeIdToken({
      exp: Math.floor(Date.now() / 1000) - 3600,
      iss: 'https://accounts.google.com',
    });
    await expect(
      handleAuthResult({ type: 'success', params: { id_token: expired } }, setSession),
    ).rejects.toThrow(/no usable id_token/i);
    expect(setSession).not.toHaveBeenCalled();
    expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  test('success with a FOREIGN-issuer id_token is rejected at sign-in', async () => {
    const setSession = jest.fn();
    const foreign = makeIdToken({ iss: 'https://evil.example.com' });
    await expect(
      handleAuthResult({ type: 'success', params: { id_token: foreign } }, setSession),
    ).rejects.toThrow(/no usable id_token/i);
    expect(setSession).not.toHaveBeenCalled();
    expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  // Mutation-check: if handleAuthResult accidentally skipped persisting the
  // session, the assertion below would still pass for user population but this
  // extra check fails. Guards against a common regression.
  test('mutation: success must persist BEFORE setSession returns', async () => {
    const setSession = jest.fn(() => {
      // At the moment setSession runs, the store must already be written.
      expect(mockSecureStore.setItemAsync).toHaveBeenCalled();
    });
    await handleAuthResult(
      {
        type: 'success',
        params: { id_token: fakeIdToken },
        authentication: { accessToken: 'at-1' },
      },
      setSession,
    );
    expect(setSession).toHaveBeenCalled();
  });
});

describe('AuthProvider lifecycle', () => {
  // Coverage instrumentation slows the async restore effect on loaded CI
  // runners, occasionally pushing this past Jest's default 5s and the default
  // 1s waitFor poll window. Give both an explicit, generous budget so
  // `jest --coverage` is stable, not flaky. (10s test / 4s waitFor.)
  test(
    'first render: user is null once loading finishes',
    async () => {
      let captured;
      render(
        <AuthProvider>
          <Probe onUser={(c) => (captured = c)} />
        </AuthProvider>,
      );
      await waitFor(() => expect(captured?.loading).toBe(false), { timeout: 4000 });
      expect(captured?.loading).toBe(false);
      expect(captured?.user).toBeNull();
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(STORAGE_KEY);
    },
    10000,
  );

  test('restores session from SecureStore on mount', async () => {
    mockMemStore.set(
      STORAGE_KEY,
      JSON.stringify({
        user: { email: 'restored@example.com', name: 'Restored', picture: null, sub: 'x' },
        tokens: { idToken: fakeIdToken, accessToken: 'a' },
      }),
    );
    let captured;
    render(
      <AuthProvider>
        <Probe onUser={(c) => (captured = c)} />
      </AuthProvider>,
    );
    await waitFor(() => expect(captured.loading).toBe(false), { timeout: 4000 });
    expect(captured.user?.email).toBe('restored@example.com');
  }, 10000);

  test('purges a corrupt SecureStore blob on mount (parse failure)', async () => {
    // Not valid JSON -> JSON.parse throws inside the restore effect.
    mockMemStore.set(STORAGE_KEY, '{not-json');
    let captured;
    render(
      <AuthProvider>
        <Probe onUser={(c) => (captured = c)} />
      </AuthProvider>,
    );
    await waitFor(() => expect(captured.loading).toBe(false), { timeout: 4000 });
    expect(captured.user).toBeNull();
    // The bad blob must be deleted so the next cold start doesn't re-fail.
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockMemStore.has(STORAGE_KEY)).toBe(false);
  }, 10000);

  test('signOut clears user + SecureStore', async () => {
    mockMemStore.set(
      STORAGE_KEY,
      JSON.stringify({
        user: { email: 'x@y.z', name: 'X', picture: null, sub: 's' },
        tokens: { idToken: fakeIdToken, accessToken: 'a' },
      }),
    );
    let captured;
    render(
      <AuthProvider>
        <Probe onUser={(c) => (captured = c)} />
      </AuthProvider>,
    );
    await waitFor(() => expect(captured.user?.email).toBe('x@y.z'), { timeout: 4000 });

    await act(async () => {
      await captured.signOut();
    });

    await waitFor(() => expect(captured.user).toBeNull(), { timeout: 4000 });
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(STORAGE_KEY);
  }, 10000);
});

describe('assertGoogleEnv / readGoogleClientIds', () => {
  // The throw used to be unreachable: env was read once at module load, so a
  // test could never exercise the missing-WEB path. With the env injected, the
  // guard is reachable. FAILS if assertGoogleEnv stops validating WEB.
  test('throws a helpful error when the web client ID is missing', () => {
    expect(() => assertGoogleEnv({})).toThrow(/EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/);
    expect(() => assertGoogleEnv({ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '' })).toThrow(
      /Missing/,
    );
  });

  test('does not throw when the web client ID is present', () => {
    expect(() =>
      assertGoogleEnv({ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web-123' }),
    ).not.toThrow();
  });

  test('readGoogleClientIds reflects the injected environment', () => {
    const ids = readGoogleClientIds({
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web-1',
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'ios-1',
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: 'and-1',
    });
    expect(ids).toEqual({
      webClientId: 'web-1',
      iosClientId: 'ios-1',
      androidClientId: 'and-1',
    });
    // Missing native IDs surface as undefined (web is the only hard requirement).
    expect(readGoogleClientIds({}).webClientId).toBeUndefined();
  });
});
