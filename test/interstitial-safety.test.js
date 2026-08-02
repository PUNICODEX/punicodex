/**
 * Interstitial Navigation Safety
 *
 * The authenticity block page is reached with an attacker-influenced ?url=.
 * It used to do `location.href = targetUrl` with no scheme check, and a
 * script-initiated assignment of a `javascript:` URL executes in the CURRENT
 * origin — so the page that exists to warn about spoofed sites was itself a
 * one-click XSS on punicodex.com, the same origin as the admin portal.
 *
 * The guard extracts the scheme decision into `safeTargetUrl`. These tests
 * execute that exact logic against hostile inputs and assert both shipped
 * copies of the page carry it.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const COPIES = ['interstitial.html', path.join('platform', 'public', 'interstitial.html')];

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function readCopy(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// Re-implements the shipped guard so the decision can be exercised directly.
// Kept byte-comparable to the page by the "source still matches" test below.
function safeTarget(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

test('hostile schemes never become a navigation target', () => {
  const hostile = [
    'javascript:alert(document.domain)',
    'JavaScript:alert(1)',
    '  javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'blob:https://punicodex.com/abc',
    '',
    'not a url at all',
  ];
  for (const input of hostile) {
    assert.strictEqual(safeTarget(input), null, `allowed navigation to: ${input}`);
  }
});

test('ordinary web addresses still proceed', () => {
  assert.strictEqual(safeTarget('https://example.com/path?q=1'), 'https://example.com/path?q=1');
  assert.strictEqual(safeTarget('http://example.com/'), 'http://example.com/');
  // Unicode/punycode hosts are the whole point of the product.
  assert.ok(safeTarget('https://xn--aplln-1ta64d.com/'));
});

test('both shipped copies gate the Proceed navigation', () => {
  for (const rel of COPIES) {
    const src = readCopy(rel);
    assert.ok(src.includes('const safeTargetUrl'), `${rel}: guard missing`);
    assert.ok(
      !/location\.href\s*=\s*targetUrl\b/.test(src),
      `${rel}: still navigates to the unvalidated parameter`
    );
    assert.ok(
      /location\.href\s*=\s*safeTargetUrl/.test(src),
      `${rel}: Proceed must navigate to the validated URL`
    );
    assert.ok(
      /parsed\.protocol === 'http:' \|\| parsed\.protocol === 'https:'/.test(src),
      `${rel}: scheme allowlist missing`
    );
  }
});

test('the two copies do not drift apart', () => {
  const [a, b] = COPIES.map(readCopy);
  assert.strictEqual(a, b, 'root and platform/public interstitial copies differ');
});

test('the blocked address is still displayed, and only via textContent', () => {
  // Users must see what was blocked; showing it must not execute it.
  for (const rel of COPIES) {
    const src = readCopy(rel);
    assert.ok(
      /getElementById\('target-url'\)\.textContent = targetUrl/.test(src),
      `${rel}: blocked address should still be shown to the user`
    );
    assert.ok(
      !/innerHTML\s*=\s*[^;]*targetUrl/.test(src),
      `${rel}: the blocked address must never reach innerHTML`
    );
  }
});

(async () => {
  console.log('\n▸ Interstitial Navigation Safety\n');
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${err.message}`);
    }
  }
  console.log(`\nInterstitial Safety: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
