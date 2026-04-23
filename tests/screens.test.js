import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Mock expo-router's Link so the Home screen can render in isolation.
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    Link: ({ children }) => React.createElement(React.Fragment, null, children),
    Stack: () => null,
  };
});

describe('Home screen', () => {
  test('renders title, subtitle, and About button', () => {
    const HomeScreen = require('../app/index').default;
    render(<HomeScreen />);

    expect(screen.getByText('My App')).toBeTruthy();
    expect(screen.getByText('Get Started')).toBeTruthy();
    expect(screen.getByText('About')).toBeTruthy();
  });
});

describe('About screen', () => {
  test('renders title and description text', () => {
    const AboutScreen = require('../app/about').default;
    render(<AboutScreen />);

    expect(screen.getByText('About')).toBeTruthy();
    expect(screen.getByText(/Built with Expo/)).toBeTruthy();
  });
});
