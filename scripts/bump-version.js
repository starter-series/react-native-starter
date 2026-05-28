const fs = require('fs');

const type = process.argv[2] || 'patch';
const valid = ['major', 'minor', 'patch'];
if (!valid.includes(type)) {
  console.error('Usage: node bump-version.js [major|minor|patch]');
  process.exit(1);
}

const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const current = appConfig.expo.version;

// Only accept strict MAJOR.MINOR.PATCH numerics. Prerelease/build-metadata
// (`1.2.3-beta.1`, `1.2.3+sha`) would parse to NaN under the naive split-Map,
// producing a corrupted `1.2.NaN` write — fail loudly instead.
if (!/^\d+\.\d+\.\d+$/.test(current)) {
  console.error(
    `Refusing to bump: app.json expo.version="${current}" is not strict ` +
      `MAJOR.MINOR.PATCH. Prerelease/build-metadata is not supported here — ` +
      `bump manually and commit, or strip suffixes first.`,
  );
  process.exit(1);
}

const v = current.split('.').map(Number);

if (type === 'major') { v[0]++; v[1] = 0; v[2] = 0; }
else if (type === 'minor') { v[1]++; v[2] = 0; }
else { v[2]++; }

const newVersion = v.join('.');
appConfig.expo.version = newVersion;
fs.writeFileSync('app.json', JSON.stringify(appConfig, null, 2) + '\n');

// Also update package.json if it exists
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = newVersion;
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
} catch (_e) {
  // package.json is optional
}

console.log(newVersion);
