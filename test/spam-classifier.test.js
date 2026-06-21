/**
 * Spam Classifier Tests
 */

const assert = require('node:assert');
const { classifySite, listSpamSites, setSiteSpam } = require('../platform/api/spam-classifier');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }

  console.log(`\nSpam Classifier: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('classifies a known flagship site', () => {
  const result = classifySite('xn--rs-lia5r.com'); // ares.com punycode
  assert.ok(result);
  assert.ok(typeof result.spamScore === 'number');
  assert.ok(Array.isArray(result.signals));
});

test('lists spam sites (may be empty)', () => {
  const sites = listSpamSites({ limit: 10 });
  assert.ok(Array.isArray(sites));
});

test('manually marks a site as spam then ham', () => {
  const spam = setSiteSpam('xn--rs-lia5r.com', true, 'test spam');
  assert.ok(spam);
  assert.strictEqual(spam.status, 'spam');

  const ham = setSiteSpam('xn--rs-lia5r.com', false);
  assert.strictEqual(ham.status, 'active');
});

run();
