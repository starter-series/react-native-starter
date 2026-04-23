import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Mock expo-router's Link so screens can render in isolation.
jest.mock('expo-router', () => {
  const ReactLib = require('react');
  return {
    Link: ({ children }) => ReactLib.createElement(ReactLib.Fragment, null, children),
    Stack: () => null,
    Redirect: () => null,
  };
});

// Shim the auth hook — the screens only need a user/signOut shape.
jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    user: { email: 'ada@example.com', name: 'Ada', picture: null },
    signOut: jest.fn(),
  }),
}));

describe('Home screen', () => {
  test('renders title, greeting, and navigation buttons', () => {
    const HomeScreen = require('../app/(app)/index').default;
    render(<HomeScreen />);

    expect(screen.getByText('My App')).toBeTruthy();
    expect(screen.getByText(/Hi, Ada/)).toBeTruthy();
    expect(screen.getByText('About')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();
  });
});

describe('About screen', () => {
  test('renders title and description text', () => {
    const AboutScreen = require('../app/(app)/about').default;
    render(<AboutScreen />);

    expect(screen.getByText('About')).toBeTruthy();
    expect(screen.getByText(/Built with Expo/)).toBeTruthy();
  });
});

describe('Profile screen', () => {
  test('renders name, email, and sign-out button', () => {
    const ProfileScreen = require('../app/(app)/profile').default;
    render(<ProfileScreen />);

    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.getByText('ada@example.com')).toBeTruthy();
    expect(screen.getByText('Sign out')).toBeTruthy();
  });
});
