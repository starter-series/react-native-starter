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
// header.payload.signature where payload is base64url(JSON)
const claims = {
  sub: 'goog-123',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  picture: 'https://example.com/ada.png',
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
  STORAGE_KEY,
} = require('../lib/auth-context');

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
        tokens: { idToken: 't', accessToken: 'a' },
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

  test('signOut clears user + SecureStore', async () => {
    mockMemStore.set(
      STORAGE_KEY,
      JSON.stringify({
        user: { email: 'x@y.z', name: 'X', picture: null, sub: 's' },
        tokens: { idToken: 't', accessToken: 'a' },
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
