/**
 * PÚNYCODEX — Android SDK contract validation
 *
 * The Android SDK is written in Kotlin and is normally tested with JUnit inside
 * Android Studio. In this repository we validate the public API contract from
 * Node so the mobile phase stays testable in CI without requiring the Android
 * toolchain.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

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
  console.log(`\nAndroid SDK Contract: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

const sdkSource = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    '..',
    'lib',
    'src',
    'main',
    'kotlin',
    'com',
    'punycodex',
    'authenticity',
    'AuthenticitySDK.kt'
  ),
  'utf8'
);

const shareSource = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    '..',
    'lib',
    'src',
    'main',
    'kotlin',
    'com',
    'punycodex',
    'authenticity',
    'ShareExtensionActivity.kt'
  ),
  'utf8'
);

test('Android SDK exposes the main AuthenticitySDK class', () => {
  assert.ok(sdkSource.includes('class AuthenticitySDK'));
  assert.ok(sdkSource.includes('val shared: AuthenticitySDK'));
});

test('Android SDK exposes required classify methods', () => {
  assert.ok(sdkSource.includes('fun classify(input: String)'));
  assert.ok(sdkSource.includes('fun checkUrl(urlString: String)'));
});

test('Android SDK exposes policy and attestation helpers', () => {
  assert.ok(sdkSource.includes('fun decideAction(verdict: AuthenticityVerdict'));
  assert.ok(sdkSource.includes('fun validateAttestation(token: ByteArray)'));
});

test('Android SDK defines the shared verdict taxonomy', () => {
  for (const verdict of [
    'CANONICAL("canonical")',
    'STYLED("styled")',
    'HOMOGRAPH_SPOOF("homograph-spoof")',
    'MIXED_SCRIPT_SPOOF("mixed-script-spoof")',
    'UNSAFE("unsafe")',
    'UNKNOWN("unknown")',
  ]) {
    assert.ok(sdkSource.includes(verdict), `Missing verdict enum case: ${verdict}`);
  }
});

test('Android SDK defines severity and action enums', () => {
  assert.ok(sdkSource.includes('enum class Severity'));
  assert.ok(sdkSource.includes('enum class ActionType'));
  assert.ok(sdkSource.includes('CRITICAL("critical")'));
  assert.ok(sdkSource.includes('BLOCK("block")'));
});

test('Android SDK carries an offline brand/confusable seed', () => {
  assert.ok(sdkSource.includes('BrandSeed'));
  assert.ok(sdkSource.includes('ConfusableSeed'));
  assert.ok(sdkSource.includes('"Cyrillic"'));
  assert.ok(sdkSource.includes('"Greek"'));
});

test('Android share extension activity handles ACTION_SEND', () => {
  assert.ok(shareSource.includes('Intent.ACTION_SEND'));
  assert.ok(shareSource.includes('classifyUrl'));
  assert.ok(shareSource.includes('Toast'));
});

test('Android SDK matches the JS mobile classifier contract', () => {
  const jsSource = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'js',
      'src',
      'mobile-classifier.js'
    ),
    'utf8'
  );
  assert.ok(jsSource.includes('HOMOGRAPH_SPOOF'));
  assert.ok(jsSource.includes('MIXED_SCRIPT_SPOOF'));
  assert.ok(jsSource.includes('UNSAFE'));
  assert.ok(jsSource.includes('BRANDS'));
  assert.ok(jsSource.includes('CONFUSABLES'));
});

run();
