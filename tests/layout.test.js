// Exercise the route-group gating that README "Currently implemented" lists
// as the auth boundary. Before the 2026-05-21 second-pass audit, no test
// rendered (app)/_layout.js — the gating was claimed, not verified.
//
// Assertions use `expect.objectContaining` rather than strict deep equality
// on props, so adding e.g. `<Redirect href="/login" replace />` or a
// React 19 JSX-runtime metadata key won't false-alarm the gate test.

import React from 'react';
import { render } from '@testing-library/react-native';

const mockRedirect = jest.fn(() => null);
const mockStack = jest.fn(() => null);

jest.mock('expo-router', () => ({
  Redirect: (props) => mockRedirect(props),
  Stack: (props) => mockStack(props),
}));

// Mock useAuth per-test by re-requiring after redefining the mock factory.
let mockAuthState;
jest.mock('../lib/auth-context', () => ({
  useAuth: () => mockAuthState,
}));

describe('(app)/_layout — protected route group', () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockStack.mockClear();
  });

  test('while loading, shows the spinner (no redirect, no Stack)', () => {
    mockAuthState = { user: null, loading: true };
    const AppLayout = require('../app/(app)/_layout').default;
    const { UNSAFE_root } = render(<AppLayout />);
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockStack).not.toHaveBeenCalled();
    expect(UNSAFE_root).toBeTruthy();
  });

  test('when not signed in, redirects to /login (regression for D1 gating claim)', () => {
    mockAuthState = { user: null, loading: false };
    const AppLayout = require('../app/(app)/_layout').default;
    render(<AppLayout />);
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: '/login' }),
    );
    expect(mockStack).not.toHaveBeenCalled();
  });

  test('when signed in, renders the Stack (protected zone is accessible)', () => {
    mockAuthState = { user: { email: 'a@b.c' }, loading: false };
    const AppLayout = require('../app/(app)/_layout').default;
    render(<AppLayout />);
    expect(mockStack).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

describe('(auth)/_layout — bounce when already signed in', () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockStack.mockClear();
  });

  test('while loading, neither Redirect nor Stack fires (own spinner)', () => {
    // Regression for the 2026-05-21 review: previously this layout rendered
    // <Stack> during loading, flashing the login UI before the redirect
    // when restoring a signed-in session into a /login deep link. Now it
    // owns its own spinner — the (app)/_layout's spinner doesn't cover
    // this case because the route IS underneath (auth), not (app).
    mockAuthState = { user: null, loading: true };
    const AuthLayout = require('../app/(auth)/_layout').default;
    render(<AuthLayout />);
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockStack).not.toHaveBeenCalled();
  });

  test('when signed in, bounces back to /', () => {
    mockAuthState = { user: { email: 'a@b.c' }, loading: false };
    const AuthLayout = require('../app/(auth)/_layout').default;
    render(<AuthLayout />);
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: '/' }),
    );
  });

  test('when not signed in, renders the Stack so the login screen appears', () => {
    mockAuthState = { user: null, loading: false };
    const AuthLayout = require('../app/(auth)/_layout').default;
    render(<AuthLayout />);
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockStack).toHaveBeenCalled();
  });
});
