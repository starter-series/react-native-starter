// Lock the env assertion contract that lib/env.js promises in its docstring.
// Previously uncovered (env.js:23-24 throw branch) — added in the 2026-05-21
// second-pass audit.
//
// Caveat: Expo's babel preset enables
// `babel-plugin-transform-inline-environment-variables` for EXPO_PUBLIC_*
// vars, which inlines `process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` at
// compile time. That means re-importing env.js after mutating process.env
// at runtime is a no-op — the compiled module captured whatever the env
// was when this test file was first transformed.
//
// Practical consequence: the positive-path ("does not throw when set",
// "exposes IDs") is covered indirectly by tests/auth-context.test.js (which
// mocks lib/env). The two tests below isolate just the throw branch by
// running env.js in an unset state — which is what happens when CI runs
// without dev secrets configured.

describe('assertGoogleEnv (throw branch only — see header comment)', () => {
  const KEY = 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID';
  let saved;

  beforeEach(() => {
    saved = process.env[KEY];
    delete process.env[KEY];
  });

  afterEach(() => {
    if (saved === undefined) delete process.env[KEY];
    else process.env[KEY] = saved;
  });

  test('throws a helpful error when the web client ID is missing', () => {
    jest.isolateModules(() => {
      const { assertGoogleEnv } = require('../lib/env');
      expect(() => assertGoogleEnv()).toThrow(/EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/);
    });
  });

  test('error message points the user at .env.example and the README', () => {
    jest.isolateModules(() => {
      const { assertGoogleEnv } = require('../lib/env');
      expect(() => assertGoogleEnv()).toThrow(/\.env\.example|README/);
    });
  });
});
