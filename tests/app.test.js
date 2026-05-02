const fs = require('fs');
const path = require('path');

describe('Project structure', () => {
  const root = path.resolve(__dirname, '..');

  test('app entry files exist', () => {
    expect(fs.existsSync(path.join(root, 'app', '_layout.js'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'app', '(app)', '_layout.js'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'app', '(app)', 'index.js'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'app', '(app)', 'about.js'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'app', '(app)', 'profile.js'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'app', '(auth)', '_layout.js'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'app', '(auth)', 'login.js'))).toBe(true);
  });

  test('auth lib files exist', () => {
    expect(fs.existsSync(path.join(root, 'lib', 'auth-context.js'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'lib', 'env.js'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.env.example'))).toBe(true);
  });

  test('package.json has required fields + auth deps', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.name).toBeDefined();
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.start).toBeDefined();
    expect(pkg.scripts.test).toBeDefined();
    expect(pkg.dependencies['expo-auth-session']).toBeDefined();
    expect(pkg.dependencies['expo-crypto']).toBeDefined();
    expect(pkg.dependencies['expo-secure-store']).toBeDefined();
    expect(pkg.dependencies['expo-web-browser']).toBeDefined();
  });

  test('app.json has expo config with required fields', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    expect(appJson.expo).toBeDefined();
    expect(appJson.expo.name).toBeDefined();
    expect(appJson.expo.slug).toBeDefined();
    expect(appJson.expo.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(appJson.expo.ios).toBeDefined();
    expect(appJson.expo.android).toBeDefined();
    expect(appJson.expo.plugins).toContain('expo-router');
    expect(appJson.expo.plugins).toContain('expo-secure-store');
    expect(appJson.expo.scheme).toBeTruthy();
  });

  test('app.json declares iOS privacy manifest (App Store gate)', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    const pm = appJson.expo.ios.privacyManifests;
    expect(pm).toBeDefined();
    expect(Array.isArray(pm.NSPrivacyAccessedAPITypes)).toBe(true);
    expect(pm.NSPrivacyAccessedAPITypes.length).toBeGreaterThan(0);
    // Tracking should default to false; flipping it requires populating
    // NSPrivacyTrackingDomains and a deliberate compliance review.
    expect(pm.NSPrivacyTracking).toBe(false);
    // Each declared API must carry at least one approved reason code.
    for (const api of pm.NSPrivacyAccessedAPITypes) {
      expect(typeof api.NSPrivacyAccessedAPIType).toBe('string');
      expect(Array.isArray(api.NSPrivacyAccessedAPITypeReasons)).toBe(true);
      expect(api.NSPrivacyAccessedAPITypeReasons.length).toBeGreaterThan(0);
    }
  });

  test('app.json declares Android 14 partial photo permission', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    const perms = appJson.expo.android.permissions || [];
    // READ_MEDIA_VISUAL_USER_SELECTED is the fallback granted when a user
    // picks "Selected photos" on Android 14+. Always include it.
    expect(perms).toContain('READ_MEDIA_VISUAL_USER_SELECTED');
  });
});

describe('Version bumper', () => {
  const bumperPath = path.resolve(__dirname, '..', 'scripts', 'bump-version.js');

  test('bump script exists', () => {
    expect(fs.existsSync(bumperPath)).toBe(true);
  });
});
