// Cover the signIn error path (auth-context.js:174-177) — previously
// uncovered. The path: assertGoogleEnv() throws → catch → setError(e) → rethrow.
// Isolated in its own file so we can mock lib/env without disturbing the
// happy-path fixture in tests/auth-context.test.js.

import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

const mockMemStore = new Map();
const mockSecureStore = {
  getItemAsync: jest.fn(async (k) => (mockMemStore.has(k) ? mockMemStore.get(k) : null)),
  setItemAsync: jest.fn(async (k, v) => {
    mockMemStore.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k) => {
    mockMemStore.delete(k);
  }),
};

jest.mock('expo-secure-store', () => mockSecureStore);
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: () => [{ state: 'ready' }, null, jest.fn()],
}));

// Replace lib/env with a stub whose assertGoogleEnv always throws — this
// simulates the "developer forgot to set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"
// situation at the boundary of signIn() rather than at module load.
jest.mock('../lib/env', () => ({
  googleClientIds: { webClientId: undefined, iosClientId: undefined, androidClientId: undefined },
  assertGoogleEnv: () => {
    throw new Error('Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID. (test stub)');
  },
}));

const { AuthProvider, useAuth } = require('../lib/auth-context');

function Probe({ onUser }) {
  const ctx = useAuth();
  onUser(ctx);
  return <Text>{ctx.user ? 'user' : 'anon'}</Text>;
}

describe('signIn error path — env missing', () => {
  test('rethrows from signIn AND lights up context.error', async () => {
    let captured;
    render(
      <AuthProvider>
        <Probe onUser={(c) => (captured = c)} />
      </AuthProvider>,
    );
    await waitFor(() => expect(captured.loading).toBe(false));

    await expect(
      act(async () => {
        await captured.signIn();
      }),
    ).rejects.toThrow(/Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/);

    await waitFor(() => expect(captured.error).toBeInstanceOf(Error));
    expect(captured.error.message).toMatch(/Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/);
  });
});
