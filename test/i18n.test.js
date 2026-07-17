/**
 * PuniCodex — Authenticity i18n Tests
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  BUNDLES,
  AVAILABLE,
  resolveLocale,
  resolveLocaleFromRequest,
  getBundle,
  getAllLocales,
  t,
} = require('../i18n/authenticity/index.js');

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
  console.log(`\ni18n: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

const REQUIRED_KEYS = [
  'verdict.authentic',
  'verdict.verifiedVariant',
  'verdict.styled',
  'verdict.uncertain',
  'verdict.suspicious',
  'verdict.deceptive',
  'verdict.knownThreat',
  'explanation.cyrillicA',
  'explanation.mixedScript',
  'explanation.invisibleChars',
  'explanation.lookalikeDomain',
  'cta.safeAlternatives',
  'cta.report',
  'cta.proceed',
  'cta.backToSafety',
  'aria.warning',
];

test('all expected bundles load from disk', () => {
  const dir = path.join(__dirname, '..', 'i18n', 'authenticity');
  const expected = ['en', 'fr', 'de', 'es', 'ja', 'zh', 'ar', 'hi', 'ru'];
  for (const code of expected) {
    const file = path.join(dir, `${code}.json`);
    assert.ok(fs.existsSync(file), `missing ${code}.json`);
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.ok(json._name, `${code} missing _name`);
  }
});

test('all required keys are present in every bundle', () => {
  for (const code of AVAILABLE) {
    const bundle = BUNDLES[code];
    for (const key of REQUIRED_KEYS) {
      const value = t(bundle, key);
      assert.ok(value && value !== key, `${code} missing ${key}`);
    }
  }
});

test('Arabic bundle is marked RTL', () => {
  assert.strictEqual(BUNDLES.ar._rtl, true);
  assert.strictEqual(BUNDLES.en._rtl, false);
});

test('resolveLocale handles language codes and region variants', () => {
  assert.strictEqual(resolveLocale('fr-FR'), 'fr');
  assert.strictEqual(resolveLocale('en-US,en;q=0.9'), 'en');
  assert.strictEqual(resolveLocale('zh-CN'), 'zh');
  assert.strictEqual(resolveLocale('ar-SA'), 'ar');
  assert.strictEqual(resolveLocale('xx-YY'), 'en');
});

test('resolveLocaleFromRequest prefers query parameter', () => {
  const req = {
    query: { lang: 'ja' },
    headers: { 'accept-language': 'fr-FR,fr;q=0.9' },
  };
  assert.strictEqual(resolveLocaleFromRequest(req), 'ja');
});

test('resolveLocaleFromRequest falls back to Accept-Language', () => {
  const req = {
    query: {},
    headers: { 'accept-language': 'de-DE,de;q=0.9' },
  };
  assert.strictEqual(resolveLocaleFromRequest(req), 'de');
});

test('getBundle returns default for unknown locale', () => {
  const bundle = getBundle('zz');
  assert.strictEqual(bundle._name, BUNDLES.en._name);
});

test('getAllLocales returns metadata with RTL flag', () => {
  const locales = getAllLocales();
  assert.strictEqual(locales.length, 9);
  const ar = locales.find((l) => l.code === 'ar');
  assert.ok(ar);
  assert.strictEqual(ar.rtl, true);
});

test('t supports nested keys and fallback', () => {
  const bundle = BUNDLES.en;
  assert.strictEqual(t(bundle, 'cta.report'), 'Report mistake');
  assert.strictEqual(t(bundle, 'missing.key', 'fallback'), 'fallback');
  assert.strictEqual(t(bundle, 'missing.key'), 'missing.key');
});

run();
