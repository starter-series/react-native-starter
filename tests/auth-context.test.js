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
// Expose promptAsync + response settors so tests can drive the auth pipeline
// end-to-end (response → useEffect → handleAuthResult → setSession/setError),
// not just verify the pure handler. The previous mock created a fresh jest.fn
// on every render, which made it impossible to assert `promptAsync` was
// actually invoked from signIn — flagged by the 2026-05-21 post-fix review.
const mockPromptAsync = jest.fn(async () => ({ type: 'cancel' }));
let mockUseAuthRequestResponse = null;
jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: () => [{ state: 'ready' }, mockUseAuthRequestResponse, mockPromptAsync],
}));

// Stub lib/env so assertGoogleEnv is a no-op for the happy-path suite. The
// error path (assertGoogleEnv throws) lives in tests/signin-error.test.js
// where the same module is mocked the other way. The previous
// `process.env.EXPO_PUBLIC_... = ...` approach worked while no test invoked
// signIn(), but env.js reads process.env at module-load time — the load
// order vs. the assignment is fragile under jest-expo's preset hoisting.
const mockAssertGoogleEnv = jest.fn();
jest.mock('../lib/env', () => ({
  googleClientIds: {
    webClientId: 'test-web-client-id',
    iosClientId: undefined,
    androidClientId: undefined,
  },
  assertGoogleEnv: mockAssertGoogleEnv,
}));

// --- Fixture: a Google id_token (not signature-verified, only decoded) ---
// header.payload.signature where payload is base64url(JSON)
const claims = {
  iss: 'https://accounts.google.com',
  sub: 'goog-123',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  picture: 'https://example.com/ada.png',
  // Far-future exp so isSessionStillValid() accepts it across CI runs.
  exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10,
};
const payloadB64 = Buffer.from(JSON.stringify(claims))
  .toString('base64')
  .replace(/=+$/, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');
const fakeIdToken = `eyJhbGciOiJSUzI1NiJ9.${payloadB64}.sig`;

// --- Consumer probe -----------------------------------------------------

const {
  AuthProvider,
  useAuth,
  handleAuthResult,
  decodeIdToken,
  isSessionStillValid,
  STORAGE_KEY,
} = require('../lib/auth-context');

// Build a JWT with arbitrary claims for the negative-path probes below.
// Signature is never verified by this client — only the payload is decoded.
function makeFakeJwt(claimsOverride) {
  const payload = Buffer.from(JSON.stringify(claimsOverride))
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `eyJhbGciOiJSUzI1NiJ9.${payload}.sig`;
}

function Probe({ onUser }) {
  const ctx = useAuth();
  onUser(ctx);
  return <Text>{ctx.user ? `user:${ctx.user.email}` : 'anon'}</Text>;
}

beforeEach(() => {
  mockMemStore.clear();
  mockSecureStore.getItemAsync.mockClear();
  mockSecureStore.setItemAsync.mockClear();
  mockSecureStore.deleteItemAsync.mockClear();
  mockPromptAsync.mockClear();
  mockAssertGoogleEnv.mockClear();
  mockUseAuthRequestResponse = null;
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

describe('isSessionStillValid — issuer + expiry boundary', () => {
  const future = Math.floor(Date.now() / 1000) + 3600;
  const past = Math.floor(Date.now() / 1000) - 3600;

  test('accepts a fresh Google-issued token', () => {
    const tok = makeFakeJwt({
      iss: 'https://accounts.google.com',
      sub: 'goog-1',
      exp: future,
    });
    expect(isSessionStillValid({ tokens: { idToken: tok } })).toBe(true);
  });

  test('rejects a token whose iss is missing — regression for the second-pass audit', () => {
    // Without this check, an attacker who can write to SecureStore (e.g. on a
    // rooted/jailbroken device or via a shared-keychain entitlement bug) could
    // craft an iss-less blob and ride the session indefinitely. See
    // lib/auth-context.js — `iss` is REQUIRED, not optional.
    const tok = makeFakeJwt({ sub: 'x', exp: future });
    expect(isSessionStillValid({ tokens: { idToken: tok } })).toBe(false);
  });

  test('rejects a token issued by a non-Google IdP', () => {
    const tok = makeFakeJwt({
      iss: 'https://evil.example.com',
      sub: 'x',
      exp: future,
    });
    expect(isSessionStillValid({ tokens: { idToken: tok } })).toBe(false);
  });

  test('rejects an expired token even with a valid iss', () => {
    const tok = makeFakeJwt({
      iss: 'https://accounts.google.com',
      sub: 'x',
      exp: past,
    });
    expect(isSessionStillValid({ tokens: { idToken: tok } })).toBe(false);
  });

  test('rejects when exp is missing entirely', () => {
    const tok = makeFakeJwt({ iss: 'https://accounts.google.com', sub: 'x' });
    expect(isSessionStillValid({ tokens: { idToken: tok } })).toBe(false);
  });

  test('rejects when no idToken is present', () => {
    expect(isSessionStillValid({ tokens: {} })).toBe(false);
    expect(isSessionStillValid({})).toBe(false);
    expect(isSessionStillValid(null)).toBe(false);
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

  test('success without id_token throws and does NOT persist — regression', async () => {
    // Before the second-pass audit (2026-05-21), this path silently wrote
    // `{user:null,tokens:{idToken:null,accessToken:null}}` to SecureStore.
    // Self-healing on next mount, but a real state-corruption bug.
    const setSession = jest.fn();
    const store = {
      setItemAsync: jest.fn(),
      getItemAsync: jest.fn(),
      deleteItemAsync: jest.fn(),
    };
    await expect(
      handleAuthResult(
        { type: 'success', params: {}, authentication: {} },
        setSession,
        { store },
      ),
    ).rejects.toThrow(/missing id_token/);
    expect(store.setItemAsync).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
  });

  test('success with non-Google iss throws and does NOT persist — regression for acquisition-side asymmetry', async () => {
    // 2026-05-21 post-fix review: isSessionStillValid now strictly rejects
    // missing/non-Google iss on rehydration, but the acquisition path used
    // to persist the same token, flip UI to signed-in, and only reject on
    // the next cold start. Acquisition must also enforce.
    const setSession = jest.fn();
    const store = { setItemAsync: jest.fn(), getItemAsync: jest.fn(), deleteItemAsync: jest.fn() };
    const evilToken = makeFakeJwt({
      iss: 'https://evil.example.com',
      sub: 'x',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    await expect(
      handleAuthResult(
        { type: 'success', params: { id_token: evilToken } },
        setSession,
        { store },
      ),
    ).rejects.toThrow(/not Google-issued/);
    expect(store.setItemAsync).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
  });

  test('success with iss-less id_token throws and does NOT persist', async () => {
    const setSession = jest.fn();
    const store = { setItemAsync: jest.fn(), getItemAsync: jest.fn(), deleteItemAsync: jest.fn() };
    const issLessToken = makeFakeJwt({
      sub: 'x',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    await expect(
      handleAuthResult(
        { type: 'success', params: { id_token: issLessToken } },
        setSession,
        { store },
      ),
    ).rejects.toThrow(/not Google-issued/);
    expect(store.setItemAsync).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
  });

  // `dismiss` shares the unknown-type fall-through with everything other
  // than success/error/cancel. We don't have a behavioural change to assert
  // here — only an explicit pin so a future "throw on unknown type" refactor
  // is a CONSCIOUS choice rather than a silent regression.
  test('explicitly: dismiss and other unknown types fall through (no setSession, no persist)', async () => {
    const setSession = jest.fn();
    const store = { setItemAsync: jest.fn(), getItemAsync: jest.fn(), deleteItemAsync: jest.fn() };
    for (const t of ['dismiss', 'opener', 'locked']) {
      await handleAuthResult({ type: t }, setSession, { store });
    }
    expect(setSession).not.toHaveBeenCalled();
    expect(store.setItemAsync).not.toHaveBeenCalled();
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
  test('first render: user is null once loading finishes', async () => {
    let captured;
    render(
      <AuthProvider>
        <Probe onUser={(c) => (captured = c)} />
      </AuthProvider>,
    );
    await waitFor(() => expect(captured.loading).toBe(false));
    expect(captured.user).toBeNull();
    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(STORAGE_KEY);
  });

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
    await waitFor(() => expect(captured.loading).toBe(false));
    expect(captured.user?.email).toBe('restored@example.com');
  });

  test('handleAuthResult throw via useEffect surfaces to context.error (integration)', async () => {
    // The 2026-05-21 post-fix review flagged that the new throw in
    // handleAuthResult was only tested by direct invocation — never via
    // the useEffect → .catch(setError) integration the security claim
    // depends on. This test feeds a malformed success response through
    // the mocked useAuthRequest channel and asserts the user-visible
    // error state.
    mockUseAuthRequestResponse = {
      type: 'success',
      params: {}, // intentionally no id_token
      authentication: {},
    };
    let captured;
    render(
      <AuthProvider>
        <Probe onUser={(c) => (captured = c)} />
      </AuthProvider>,
    );
    await waitFor(() => expect(captured.error).toBeInstanceOf(Error));
    expect(captured.error.message).toMatch(/missing id_token/);
    expect(captured.user).toBeNull();
  });

  test('signIn (happy path) actually invokes assertGoogleEnv and promptAsync', async () => {
    // The prior version only checked `captured.error === null`, which is
    // the initial state AND the value set by signIn's first line — so the
    // assertion passed even if signIn was a no-op. Flagged by the
    // 2026-05-21 post-fix review as a tautological coverage gap. Now we
    // probe both dependencies (env check + auth prompt) directly.
    let captured;
    render(
      <AuthProvider>
        <Probe onUser={(c) => (captured = c)} />
      </AuthProvider>,
    );
    await waitFor(() => expect(captured.loading).toBe(false));
    await act(async () => {
      await captured.signIn();
    });
    expect(mockAssertGoogleEnv).toHaveBeenCalledTimes(1);
    expect(mockPromptAsync).toHaveBeenCalledTimes(1);
    expect(captured.error).toBeNull();
  });

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
    await waitFor(() => expect(captured.user?.email).toBe('x@y.z'));

    await act(async () => {
      await captured.signOut();
    });

    await waitFor(() => expect(captured.user).toBeNull());
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(STORAGE_KEY);
  });
});
