#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_VALUES = {
  names: new Set(['My App', 'MyApp', 'React Native Starter']),
  slugs: new Set(['my-app', 'react-native-starter']),
  schemes: new Set(['myapp', 'my-app', 'react-native-starter']),
  bundleIdentifiers: new Set(['com.example.myapp', 'com.example.app']),
  androidPackages: new Set(['com.example.myapp', 'com.example.app']),
};

function isBlank(value) {
  return typeof value !== 'string' || value.trim() === '';
}

function normalized(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function hasPlaceholderToken(value) {
  const text = normalized(value);
  return /(^|[.\-_])example([.\-_]|$)/.test(text) || text.includes('placeholder') || text.includes('yourcompany');
}

function isDefaultAppName(value) {
  return DEFAULT_VALUES.names.has(typeof value === 'string' ? value.trim() : value);
}

function isDefaultSlug(value) {
  return DEFAULT_VALUES.slugs.has(normalized(value));
}

function isDefaultScheme(value) {
  return DEFAULT_VALUES.schemes.has(normalized(value)) || hasPlaceholderToken(value);
}

function isDefaultBundleIdentifier(value) {
  return DEFAULT_VALUES.bundleIdentifiers.has(normalized(value)) || hasPlaceholderToken(value);
}

function isDefaultAndroidPackage(value) {
  return DEFAULT_VALUES.androidPackages.has(normalized(value)) || hasPlaceholderToken(value);
}

function findStoreReadinessIssues(expo) {
  const issues = [];
  const ios = expo && expo.ios ? expo.ios : {};
  const android = expo && expo.android ? expo.android : {};

  if (isBlank(expo && expo.name) || isDefaultAppName(expo.name)) {
    issues.push({
      field: 'expo.name',
      value: expo && expo.name,
      hint: 'replace the default app name before store submission',
    });
  }

  if (isBlank(expo && expo.slug) || isDefaultSlug(expo.slug)) {
    issues.push({
      field: 'expo.slug',
      value: expo && expo.slug,
      hint: 'replace the default slug with the production app slug',
    });
  }

  if (isBlank(expo && expo.scheme) || isDefaultScheme(expo.scheme)) {
    issues.push({
      field: 'expo.scheme',
      value: expo && expo.scheme,
      hint: 'replace the default URL scheme with a production-safe scheme',
    });
  }

  if (isBlank(ios.bundleIdentifier) || isDefaultBundleIdentifier(ios.bundleIdentifier)) {
    issues.push({
      field: 'expo.ios.bundleIdentifier',
      value: ios.bundleIdentifier,
      hint: 'replace placeholder native bundle identifier',
    });
  }

  if (isBlank(android.package) || isDefaultAndroidPackage(android.package)) {
    issues.push({
      field: 'expo.android.package',
      value: android.package,
      hint: 'replace placeholder native package name',
    });
  }

  return issues;
}

function readExpoConfig(rootDir = process.cwd()) {
  const appJsonPath = path.join(rootDir, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  return appJson.expo || {};
}

function formatIssues(issues) {
  const lines = ['[react-native-starter] store readiness preflight failed.'];
  lines.push('Replace these placeholder/default app identifiers before running store deploy workflows:');
  for (const issue of issues) {
    lines.push(`- ${issue.field} = ${JSON.stringify(issue.value)} (${issue.hint})`);
  }
  return lines.join('\n');
}

function main() {
  const expo = readExpoConfig();
  const issues = findStoreReadinessIssues(expo);

  if (issues.length > 0) {
    console.error(formatIssues(issues));
    process.exit(1);
  }

  console.log('Store readiness preflight passed.');
}

if (require.main === module) {
  main();
}

module.exports = {
  findStoreReadinessIssues,
  formatIssues,
};
