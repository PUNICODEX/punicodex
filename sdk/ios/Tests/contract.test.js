/**
 * PÚNYCODEX — iOS SDK contract validation
 *
 * The iOS SDK is written in Swift and is normally tested with XCTest inside
 * Xcode. In this repository we validate the public API contract from Node so
 * the mobile phase stays testable in CI without requiring the native toolchain.
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
  console.log(`\niOS SDK Contract: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

const swiftSource = fs.readFileSync(
  path.join(__dirname, '..', 'PunycodexAuthenticator.swift'),
  'utf8'
);

const packageManifest = fs.readFileSync(
  path.join(__dirname, '..', 'Package.swift'),
  'utf8'
);

test('Swift package declares the expected library target', () => {
  assert.ok(packageManifest.includes('name: "PunycodexAuthenticator"'));
  assert.ok(packageManifest.includes('.library'));
  assert.ok(packageManifest.includes('.testTarget'));
});

test('Swift SDK exposes the main Authenticator class', () => {
  assert.ok(swiftSource.includes('public final class PunycodexAuthenticator'));
  assert.ok(swiftSource.includes('public static let shared'));
});

test('Swift SDK exposes required classify methods', () => {
  assert.ok(swiftSource.includes('public func classify(_ input: String) -> AuthenticityVerdict'));
  assert.ok(swiftSource.includes('public func checkUrl(_ urlString: String) -> AuthenticityVerdict'));
});

test('Swift SDK exposes policy and attestation helpers', () => {
  assert.ok(swiftSource.includes('public func decideAction(_ verdict: AuthenticityVerdict'));
  assert.ok(swiftSource.includes('public func validateAttestation(_ token: Data) -> Bool'));
});

test('Swift SDK defines the shared verdict taxonomy', () => {
  for (const verdict of [
    'case canonical',
    'case styled',
    'case homographSpoof',
    'case mixedScriptSpoof',
    'case unsafe',
    'case unknown',
  ]) {
    assert.ok(
      swiftSource.includes(verdict),
      `Missing verdict enum case: ${verdict}`
    );
  }
});

test('Swift SDK defines severity and action enums', () => {
  assert.ok(swiftSource.includes('enum Severity'));
  assert.ok(swiftSource.includes('enum ActionType'));
  assert.ok(swiftSource.includes('case critical'));
  assert.ok(swiftSource.includes('case block'));
});

test('Swift SDK carries an offline brand/confusable seed', () => {
  assert.ok(swiftSource.includes('BrandSeed'));
  assert.ok(swiftSource.includes('ConfusableSeed'));
  assert.ok(swiftSource.includes('Cyrillic'));
  assert.ok(swiftSource.includes('Greek'));
});

test('Swift SDK matches the JS mobile classifier contract', () => {
  const jsSource = fs.readFileSync(
    path.join(__dirname, '..', '..', 'js', 'src', 'mobile-classifier.js'),
    'utf8'
  );
  assert.ok(jsSource.includes('HOMOGRAPH_SPOOF'));
  assert.ok(jsSource.includes('MIXED_SCRIPT_SPOOF'));
  assert.ok(jsSource.includes('UNSAFE'));
  assert.ok(jsSource.includes('BRANDS'));
  assert.ok(jsSource.includes('CONFUSABLES'));
});

run();
