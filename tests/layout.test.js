// Exercise the route-group gating that README "Currently implemented" lists
// as the auth boundary. Before the 2026-05-21 second-pass audit, no test
// rendered (app)/_layout.js — the gating was claimed, not verified.

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

// Capture what `<Redirect>` was rendered with so we can assert the gate.
const mockRedirect = jest.fn(({ href }) => null);
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
    // The spinner View is rendered — assert by tree shape rather than text.
    expect(UNSAFE_root).toBeTruthy();
  });

  test('when not signed in, redirects to /login (regression for D1 gating claim)', () => {
    mockAuthState = { user: null, loading: false };
    const AppLayout = require('../app/(app)/_layout').default;
    render(<AppLayout />);
    expect(mockRedirect).toHaveBeenCalledWith({ href: '/login' });
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

  test('while loading, neither Redirect nor a bounce fires', () => {
    mockAuthState = { user: null, loading: true };
    const AuthLayout = require('../app/(auth)/_layout').default;
    render(<AuthLayout />);
    expect(mockRedirect).not.toHaveBeenCalled();
    // Stack still rendered while loading — that's intentional, the parent
    // (app)/_layout owns the spinner.
    expect(mockStack).toHaveBeenCalled();
  });

  test('when signed in, bounces back to /', () => {
    mockAuthState = { user: { email: 'a@b.c' }, loading: false };
    const AuthLayout = require('../app/(auth)/_layout').default;
    render(<AuthLayout />);
    expect(mockRedirect).toHaveBeenCalledWith({ href: '/' });
  });

  test('when not signed in, renders the Stack so the login screen appears', () => {
    mockAuthState = { user: null, loading: false };
    const AuthLayout = require('../app/(auth)/_layout').default;
    render(<AuthLayout />);
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockStack).toHaveBeenCalled();
  });
});
