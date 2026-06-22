/**
 * PÚNYCODEX — Mobile share extension, keyboard, clipboard, and shield tests
 *
 * Mocks the iOS/Android share-extension flow, keyboard warning flow, clipboard
 * scan, and local history on top of the lightweight mobile classifier.
 */

const assert = require('node:assert');
const {
  classify,
  classifyUrl,
  VERDICTS,
  SEVERITIES,
} = require('../sdk/js/src/mobile-classifier.js');

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
  console.log(`\nMobile Share Extension: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

// ═════════════════════════════════════════════════════════════════════════════
// Mobile classifier core
// ═════════════════════════════════════════════════════════════════════════════

test('classify flags Cyrillic аpple as homograph-spoof', () => {
  const result = classify('аpple'); // U+0430 Cyrillic a
  assert.strictEqual(result.verdict, VERDICTS.HOMOGRAPH_SPOOF);
  assert.strictEqual(result.severity, SEVERITIES.HIGH);
  assert.ok(result.targetIdentity);
  assert.strictEqual(result.targetIdentity.name, 'Apple');
});

test('classify treats plain Apple as styled', () => {
  const result = classify('Apple');
  assert.strictEqual(result.verdict, VERDICTS.STYLED);
  assert.strictEqual(result.severity, SEVERITIES.LOW);
  assert.strictEqual(result.targetIdentity.name, 'Apple');
});

test('classify treats Hermès as styled', () => {
  const result = classify('Hermès');
  assert.strictEqual(result.verdict, VERDICTS.STYLED);
  assert.strictEqual(result.targetIdentity.name, 'Hermès');
});

test('classify flags blocked pattern as unsafe', () => {
  const result = classify('fake-hermes.com');
  assert.strictEqual(result.verdict, VERDICTS.UNSAFE);
  assert.strictEqual(result.severity, SEVERITIES.CRITICAL);
  assert.strictEqual(result.targetIdentity.name, 'Hermès');
});

test('classify flags mixed-script input', () => {
  const result = classify('helloα'); // Latin + Greek alpha
  assert.strictEqual(result.verdict, VERDICTS.MIXED_SCRIPT_SPOOF);
  assert.strictEqual(result.severity, SEVERITIES.HIGH);
});

test('classify returns unknown for random safe term', () => {
  const result = classify('xyzbrand');
  assert.strictEqual(result.verdict, VERDICTS.UNKNOWN);
  assert.strictEqual(result.severity, SEVERITIES.NONE);
});

test('classifyUrl extracts hostname and classifies it', () => {
  const result = classifyUrl('https://аpple.com/login');
  assert.strictEqual(result.verdict, VERDICTS.HOMOGRAPH_SPOOF);
  assert.ok(result.reasons.some((r) => r.includes('Analyzed host:')));
  assert.strictEqual(result.input, 'https://аpple.com/login');
});

test('classify detects invisible characters', () => {
  const result = classify('apple\u200B'); // zero-width space
  assert.strictEqual(result.verdict, VERDICTS.UNSAFE);
  assert.strictEqual(result.severity, SEVERITIES.CRITICAL);
});

// ═════════════════════════════════════════════════════════════════════════════
// Share extension simulation
// ═════════════════════════════════════════════════════════════════════════════

function shareExtensionReceive(input) {
  const result = input.includes('://') ? classifyUrl(input) : classify(input);
  return {
    input,
    verdict: result,
    allowOpen: result.severity !== SEVERITIES.HIGH && result.severity !== SEVERITIES.CRITICAL,
    toast: `${result.label}: ${input}`,
  };
}

test('share extension blocks a homograph URL', () => {
  const share = shareExtensionReceive('https://аpple.com');
  assert.strictEqual(share.verdict.verdict, VERDICTS.HOMOGRAPH_SPOOF);
  assert.strictEqual(share.allowOpen, false);
  assert.ok(share.toast.includes('Homograph Spoof'));
});

test('share extension allows a legitimate URL', () => {
  const share = shareExtensionReceive('https://apple.com');
  assert.strictEqual(share.verdict.verdict, VERDICTS.STYLED);
  assert.strictEqual(share.allowOpen, true);
});

// ═════════════════════════════════════════════════════════════════════════════
// Keyboard warning simulation
// ═════════════════════════════════════════════════════════════════════════════

function keyboardShouldWarn(text) {
  const result = classify(text);
  return {
    warn: result.severity === SEVERITIES.HIGH || result.severity === SEVERITIES.CRITICAL,
    result,
  };
}

test('keyboard warns before sending a spoof', () => {
  const check = keyboardShouldWarn('аpple.com');
  assert.strictEqual(check.warn, true);
  assert.strictEqual(check.result.verdict, VERDICTS.HOMOGRAPH_SPOOF);
});

test('keyboard does not warn for plain text', () => {
  const check = keyboardShouldWarn('Hello friend');
  assert.strictEqual(check.warn, false);
  assert.strictEqual(check.result.verdict, VERDICTS.UNKNOWN);
});

// ═════════════════════════════════════════════════════════════════════════════
// Clipboard scan simulation
// ═════════════════════════════════════════════════════════════════════════════

function scanClipboard(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const looksLikeUrl = /^https?:\/\//i.test(trimmed) || trimmed.includes('.');
  if (!looksLikeUrl) return null;
  return classifyUrl(trimmed);
}

test('clipboard scan detects a spoofed URL on app open', () => {
  const result = scanClipboard('  https://аpple.com/free-iphone  ');
  assert.ok(result);
  assert.strictEqual(result.verdict, VERDICTS.HOMOGRAPH_SPOOF);
});

test('clipboard scan ignores non-URL text', () => {
  const result = scanClipboard('Remember to buy milk');
  assert.strictEqual(result, null);
});

// ═════════════════════════════════════════════════════════════════════════════
// History simulation
// ═════════════════════════════════════════════════════════════════════════════

function createHistoryStore() {
  const items = [];
  return {
    add(input, verdict) {
      items.unshift({
        input,
        verdict: verdict.verdict,
        severity: verdict.severity,
        checkedAt: new Date().toISOString(),
      });
      if (items.length > 50) items.pop();
    },
    list() {
      return items;
    },
    clear() {
      items.length = 0;
    },
  };
}

test('shield history records checks', () => {
  const history = createHistoryStore();
  const result = classify('аpple');
  history.add('аpple', result);
  assert.strictEqual(history.list().length, 1);
  assert.strictEqual(history.list()[0].verdict, VERDICTS.HOMOGRAPH_SPOOF);
});

test('shield history can be cleared', () => {
  const history = createHistoryStore();
  history.add('аpple', classify('аpple'));
  history.clear();
  assert.strictEqual(history.list().length, 0);
});

// ═════════════════════════════════════════════════════════════════════════════
// App attestation simulation
// ═════════════════════════════════════════════════════════════════════════════

function validateAttestation(token) {
  // Production: verify Apple DeviceCheck / App Attest or Play Integrity.
  return token != null && token.length > 0;
}

test('app attestation rejects empty tokens', () => {
  assert.strictEqual(validateAttestation(''), false);
});

test('app attestation accepts non-empty tokens', () => {
  assert.strictEqual(validateAttestation('valid-token-123'), true);
});

run();
