/**
 * PuniCodex — Extensions Audit Tests (v1 Type tool + v2 Authenticity Shield)
 *
 * Static contract checks for both packaged extensions: manifest sanity,
 * packaged icons, API endpoint targets, offline/fail-open wiring, brand
 * assets, and the deployed interstitial page.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }
  console.log(`\nExtensions Audit: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// Manifest checks (both extensions)

for (const dir of ['extension', 'extension-v2']) {
  test(`${dir}/manifest.json is valid MV3 with PuniCodex branding`, () => {
    const manifest = readJson(`${dir}/manifest.json`);
    assert.strictEqual(manifest.manifest_version, 3);
    assert.ok(manifest.name.includes('PuniCodex'), `name off-brand: ${manifest.name}`);
    assert.ok(manifest.description.length > 0);
    // No remotely hosted code: background/content/popup/options must be packaged files.
    const packaged = [
      manifest.background.service_worker,
      ...manifest.content_scripts.flatMap((cs) => cs.js),
    ];
    for (const file of packaged) {
      assert.ok(!file.startsWith('http'), `remote code in manifest: ${file}`);
      assert.ok(fs.existsSync(path.join(ROOT, dir, file)), `missing packaged file: ${file}`);
    }
  });

  test(`${dir}/manifest.json content scripts use classic script loading`, () => {
    const manifest = readJson(`${dir}/manifest.json`);
    for (const cs of manifest.content_scripts) {
      assert.strictEqual(cs.type, undefined, 'content_scripts do not support "type"');
    }
  });

  test(`${dir} icons referenced by the manifest exist on disk`, () => {
    const manifest = readJson(`${dir}/manifest.json`);
    const iconPaths = new Set([
      ...Object.values(manifest.icons || {}),
      ...Object.values(manifest.action?.default_icon || {}),
    ]);
    assert.ok(iconPaths.size > 0);
    for (const rel of iconPaths) {
      assert.ok(fs.existsSync(path.join(ROOT, dir, rel)), `missing icon: ${rel}`);
    }
  });

  test(`${dir} packaged icons match the new brand favicon set`, () => {
    const pairs = [
      ['icons/icon16.png', 'assets/brand/02-favicons/favicon-16x16.png'],
      ['icons/icon32.png', 'assets/brand/02-favicons/favicon-32x32.png'],
      ['icons/icon48.png', 'assets/brand/02-favicons/favicon-48x48.png'],
    ];
    for (const [icon, favicon] of pairs) {
      const a = fs.readFileSync(path.join(ROOT, dir, icon));
      const b = fs.readFileSync(path.join(ROOT, favicon));
      assert.ok(a.equals(b), `${dir}/${icon} differs from the brand favicon set`);
    }
    // 128px has no favicon counterpart; just require a plausible PNG.
    const png = fs.readFileSync(path.join(ROOT, dir, 'icons/icon128.png'));
    assert.strictEqual(png.readUInt32BE(0), 0x89504e47, 'icon128 is not a PNG');
    assert.strictEqual(png.readUInt32BE(16), 128, 'icon128 width is not 128');
  });
}

// Permission checks

test('extension-v2 requests only permissions it uses', () => {
  const manifest = readJson('extension-v2/manifest.json');
  const used = ['storage', 'activeTab'];
  for (const perm of manifest.permissions) {
    assert.ok(used.includes(perm), `unused permission: ${perm}`);
  }
});

test('extension (v1) requests only permissions it uses', () => {
  const manifest = readJson('extension/manifest.json');
  const used = ['storage', 'activeTab'];
  for (const perm of manifest.permissions) {
    assert.ok(used.includes(perm), `unused permission: ${perm}`);
  }
});

// Endpoint checks — the stable, documented Authenticity API is /api/v1.
// /api/v2/authenticity/* exists only via the optional [[...slug]] catch-all
// router (marked "local/tests"), and the old trailing-slash defaults produced
// double-slash URLs against it.

test('no extension source calls the undocumented v2 authenticity catch-all', () => {
  const sources = [
    'extension/background/background.js',
    'extension/content/content.js',
    'extension/popup/popup.js',
    'extension-v2/background/background.js',
    'extension-v2/popup/popup.js',
    'extension-v2/shared/storage.js',
    'platform/public/interstitial.html',
  ];
  for (const rel of sources) {
    const text = readText(rel);
    assert.ok(!text.includes('api/v2/authenticity'), `${rel} still targets /api/v2/authenticity`);
  }
});

test('extension-v2 default API endpoint is the v1 API without trailing slash', () => {
  const storage = readText('extension-v2/shared/storage.js');
  assert.ok(storage.includes("apiEndpoint: 'https://punicodex.com/api/v1'"));
});

test('extension-v2 fetches carry a timeout so a hung API fails open', () => {
  const bg = readText('extension-v2/background/background.js');
  assert.ok(bg.includes('AbortSignal.timeout('), 'checkUrl/reportVerdict must time out');
});

// Offline-first checks for the v1 type tool

test('extension (v1) remote calls are limited to the punicodex.com authenticity API', () => {
  const sources = [
    'extension/background/background.js',
    'extension/content/content.js',
    'extension/popup/popup.js',
  ];
  for (const rel of sources) {
    const text = readText(rel);
    const urls = text.match(/https?:\/\/[^\s`'")]+/g) || [];
    for (const url of urls) {
      assert.ok(
        url.startsWith('https://punicodex.com/'),
        `unexpected remote URL in ${rel}: ${url}`
      );
    }
    // Content scripts must not fetch cross-origin themselves (CORS-blocked);
    // the authenticity check goes through the service worker instead.
    if (rel === 'extension/content/content.js') {
      assert.ok(!text.includes('fetch('), 'content script must not call fetch directly');
    }
  }
});

// Shared lexicon sync

test('extension/shared/lexicon.js payload is byte-identical to the canonical lexicon', () => {
  const generated = readText('extension/shared/lexicon.js');
  const canonical = readText('type/js/lexicon.js');
  const headerEnd = generated.indexOf('/*');
  assert.ok(headerEnd > 0, 'generated header not found');
  assert.strictEqual(generated.slice(headerEnd), canonical);
});

// Interstitial deployment and branding

test('root interstitial.html exists and matches the canonical source', () => {
  const deployed = readText('interstitial.html');
  const canonical = readText('platform/public/interstitial.html');
  assert.strictEqual(deployed, canonical);
});

test('interstitial uses the v1 report API and the new brand assets', () => {
  const html = readText('platform/public/interstitial.html');
  assert.ok(html.includes('https://punicodex.com/api/v1/authenticity/report'));
  assert.ok(html.includes('/assets/brand/02-favicons/'));
  assert.ok(!html.includes('#4f46e5'), 'old indigo brand color still present');
});

test('extension-v2 default interstitial URL resolves to the deployed page', () => {
  const bg = readText('extension-v2/background/background.js');
  assert.ok(bg.includes('https://punicodex.com/interstitial.html'));
  assert.ok(fs.existsSync(path.join(ROOT, 'interstitial.html')));
});

run();
