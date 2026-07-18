/**
 * Vendored third-party library tests
 *
 * Guards the CDN-vendoring work (see vendor/INTEGRITY.md and
 * docs/security/csp-enforcement-plan-2026-07.md §7):
 *   (a) every vendored file exists, is non-empty, and matches its sha256
 *       recorded in vendor/INTEGRITY.md;
 *   (b) every page that used to load a CDN script now points at /vendor/...;
 *   (c) zero cdn.jsdelivr.net / cdnjs.cloudflare.com / d3js.org / unpkg.com
 *       references remain in served HTML/JS;
 *   (d) upstream license files are present next to each library.
 *
 * Run: node test/vendored-libs.test.js
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const VENDOR_DIR = path.join(ROOT, 'vendor');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// Parse the sha256sum-format block in vendor/INTEGRITY.md.
function integrityEntries() {
  const md = read('vendor/INTEGRITY.md');
  const entries = [];
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^([0-9a-f]{64}) {1,2}(\S.*)$/);
    if (m) entries.push({ sha256: m[1], rel: m[2].trim() });
  }
  return entries;
}

// (a) -----------------------------------------------------------------------

test('INTEGRITY.md records a sha256 for every vendored file', () => {
  const entries = integrityEntries();
  assert.ok(entries.length >= 10, `expected >= 10 integrity entries, got ${entries.length}`);
  const onDisk = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name !== 'INTEGRITY.md')
        onDisk.push(path.relative(VENDOR_DIR, full).split(path.sep).join('/'));
    }
  })(VENDOR_DIR);
  assert.deepStrictEqual(
    entries.map((e) => e.rel).sort(),
    onDisk.sort(),
    'INTEGRITY.md checksum list must match the files on disk exactly'
  );
});

test('every vendored file exists, is non-empty, and matches its recorded sha256', () => {
  for (const { sha256, rel } of integrityEntries()) {
    const file = path.join(VENDOR_DIR, rel);
    assert.ok(fs.existsSync(file), `missing vendored file: vendor/${rel}`);
    const buf = fs.readFileSync(file);
    assert.ok(buf.length > 0, `empty vendored file: vendor/${rel}`);
    const actual = crypto.createHash('sha256').update(buf).digest('hex');
    assert.strictEqual(actual, sha256, `sha256 mismatch: vendor/${rel}`);
  }
});

test('vendored JS/CSS payloads are real assets, not HTML error pages', () => {
  for (const { rel } of integrityEntries()) {
    if (!/\.(js|css)$/.test(rel)) continue;
    const head = fs.readFileSync(path.join(VENDOR_DIR, rel), 'utf8').slice(0, 512).toLowerCase();
    assert.ok(
      !head.includes('<!doctype html') && !head.includes('<html'),
      `vendor/${rel} looks like HTML`
    );
  }
});

// (b) -----------------------------------------------------------------------

const CONSUMERS = [
  ['templates/flagship/dashboard.html', ['/vendor/chartjs/chart.umd.min.js']],
  ['platform/public/admin-bookings.html', ['/vendor/chartjs/chart.umd.min.js']],
  ['platform/public/advertiser-panel.html', ['/vendor/chartjs/chart.umd.min.js']],
  ['platform/public/temple-3d.html', ['/vendor/three/three.min.js']],
  ['connections/index.html', ['/vendor/d3/d3.v7.min.js']],
  [
    'api/v1/docs/index.js',
    ['/vendor/swagger-ui/swagger-ui.css', '/vendor/swagger-ui/swagger-ui-bundle.js'],
  ],
  ['oracle.html', ['/vendor/three/three.module.js', '/vendor/three/addons/']],
];

test('every referencing page loads the vendored asset via /vendor/...', () => {
  for (const [rel, needles] of CONSUMERS) {
    const html = read(rel);
    for (const needle of needles) {
      assert.ok(html.includes(needle), `${rel} must reference ${needle}`);
    }
  }
});

// (c) -----------------------------------------------------------------------

// Hosts removed from the runtime supply chain. This test file is the only
// place these literals may appear; it is excluded from its own scan below.
const CDN_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'd3js.org', 'unpkg.com'];

// Directories that are not shipped source: dependencies, VCS/build output,
// session dumps, business source material, docs (prose, not served markup),
// and GENERATED output (sites/, scholars/) — generated dashboards pick up the
// vendored template on the next `npm run generate` and must never be edited
// by hand (AGENTS.md flywheel rules). vendor/ is excluded too: the vendored
// payloads legitimately carry upstream provenance comments (e.g. the d3
// banner "https://d3js.org v7.9.0") and INTEGRITY.md's source URLs — these
// are comments, not runtime loads, and their integrity is checked above.
const SCAN_EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  '.kimi',
  '.vercel',
  '.venv_hieropy',
  'docs',
  'sites',
  'scholars',
  'session-debug',
  'extended flagship materials',
  'Kimi_Agent_punicodex扩展',
  'vendor',
]);

function collectServedFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SCAN_EXCLUDE_DIRS.has(entry.name)) collectServedFiles(path.join(dir, entry.name), out);
    } else if (/\.(html|js)$/.test(entry.name)) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

test('zero CDN host references remain in served HTML/JS', () => {
  const offenders = [];
  for (const file of collectServedFiles(ROOT)) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (rel === 'test/vendored-libs.test.js') continue; // the patterns live here
    const text = fs.readFileSync(file, 'utf8');
    for (const host of CDN_HOSTS) {
      if (text.includes(host)) offenders.push(`${rel} references ${host}`);
    }
  }
  assert.deepStrictEqual(offenders, [], offenders.join('\n'));
});

// (d) -----------------------------------------------------------------------

test('upstream license files are present for every vendored library', () => {
  for (const rel of [
    'vendor/chartjs/LICENSE.md',
    'vendor/d3/LICENSE',
    'vendor/three/LICENSE',
    'vendor/swagger-ui/LICENSE',
    'vendor/swagger-ui/swagger-ui-bundle.js.LICENSE.txt',
  ]) {
    const file = path.join(ROOT, rel);
    assert.ok(fs.existsSync(file), `missing license file: ${rel}`);
    assert.ok(fs.statSync(file).size > 0, `empty license file: ${rel}`);
  }
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message.split('\n').join('\n    ')}`);
  }
}
console.log(`\nVendored Libs: ${tests.length - failed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
