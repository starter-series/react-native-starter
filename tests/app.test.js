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
  const { execFileSync } = require('child_process');
  const os = require('os');

  // Run the bumper against a throwaway sandbox so we don't mutate the real
  // app.json. The script reads/writes from process.cwd(), so we cd into a
  // tmpdir seeded with a minimal app.json (and optionally a package.json).
  function runBumper({ type, appVersion, withPackageJson = false }) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bump-test-'));
    fs.writeFileSync(
      path.join(dir, 'app.json'),
      JSON.stringify({ expo: { version: appVersion } }) + '\n',
    );
    if (withPackageJson) {
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({ name: 'sandbox', version: appVersion }) + '\n',
      );
    }
    let err = null;
    let stdout = '';
    try {
      stdout = execFileSync(process.execPath, [bumperPath, type], {
        cwd: dir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (e) {
      err = e;
    }
    const finalApp = JSON.parse(fs.readFileSync(path.join(dir, 'app.json'), 'utf8'));
    const finalPkg = withPackageJson
      ? JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
      : null;
    return { stdout: stdout.trim(), err, app: finalApp, pkg: finalPkg };
  }

  test('patch bump increments only the patch component', () => {
    const r = runBumper({ type: 'patch', appVersion: '1.2.3' });
    expect(r.err).toBeNull();
    expect(r.app.expo.version).toBe('1.2.4');
    expect(r.stdout).toBe('1.2.4');
  });

  test('minor bump zeroes the patch component', () => {
    const r = runBumper({ type: 'minor', appVersion: '1.2.3' });
    expect(r.app.expo.version).toBe('1.3.0');
  });

  test('major bump zeroes minor and patch', () => {
    const r = runBumper({ type: 'major', appVersion: '1.2.3' });
    expect(r.app.expo.version).toBe('2.0.0');
  });

  test('mirrors the new version into package.json when present', () => {
    const r = runBumper({ type: 'patch', appVersion: '1.2.3', withPackageJson: true });
    expect(r.pkg.version).toBe('1.2.4');
  });

  test('rejects prerelease versions instead of writing NaN — regression', () => {
    // Before the second-pass audit (2026-05-21), `"1.2.3-beta.1".split('.')`
    // -> `Number('3-beta')` = NaN, producing `1.2.NaN` in app.json.
    const r = runBumper({ type: 'patch', appVersion: '1.2.3-beta.1' });
    expect(r.err).not.toBeNull();
    expect(r.app.expo.version).toBe('1.2.3-beta.1'); // unchanged
  });

  test('rejects 2-component versions instead of writing NaN — regression', () => {
    const r = runBumper({ type: 'patch', appVersion: '1.2' });
    expect(r.err).not.toBeNull();
    expect(r.app.expo.version).toBe('1.2'); // unchanged
  });

  test('rejects invalid bump type', () => {
    const r = runBumper({ type: 'wat', appVersion: '1.2.3' });
    expect(r.err).not.toBeNull();
    expect(r.app.expo.version).toBe('1.2.3'); // unchanged
  });
});
