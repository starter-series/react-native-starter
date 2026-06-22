const { findStoreReadinessIssues } = require('../scripts/check-store-readiness');

describe('Store readiness preflight', () => {
  test('flags starter placeholder app identity before store deploy', () => {
    const issues = findStoreReadinessIssues({
      name: 'My App',
      slug: 'my-app',
      scheme: 'myapp',
      ios: { bundleIdentifier: 'com.example.myapp' },
      android: { package: 'com.example.myapp' },
    });

    expect(issues.map((issue) => issue.field)).toEqual([
      'expo.name',
      'expo.slug',
      'expo.scheme',
      'expo.ios.bundleIdentifier',
      'expo.android.package',
    ]);
  });

  test('allows a production app identity', () => {
    const issues = findStoreReadinessIssues({
      name: 'Launch Desk',
      slug: 'launch-desk',
      scheme: 'launchdesk',
      ios: { bundleIdentifier: 'app.launchdesk.mobile' },
      android: { package: 'app.launchdesk.mobile' },
    });

    expect(issues).toEqual([]);
  });
});
