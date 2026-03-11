const fs = require('fs');
const path = require('path');

describe('Project structure', () => {
  const root = path.resolve(__dirname, '..');

  test('app entry files exist', () => {
    expect(fs.existsSync(path.join(root, 'app', 'index.js'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'app', '_layout.js'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'app', 'about.js'))).toBe(true);
  });

  test('package.json has required fields', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.name).toBeDefined();
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.start).toBeDefined();
    expect(pkg.scripts.test).toBeDefined();
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
  });
});

describe('Version bumper', () => {
  const bumperPath = path.resolve(__dirname, '..', 'scripts', 'bump-version.js');

  test('bump script exists', () => {
    expect(fs.existsSync(bumperPath)).toBe(true);
  });
});
