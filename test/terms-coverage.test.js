/**
 * Terms Coverage Tests — every liability-bearing feature has terms, and the
 * feature pages make them visible.
 *
 * Guards two contracts:
 *   - Each sensitive feature (script verification, appraisal, the game,
 *     the API, authenticity verdicts, the oracle) has a dedicated terms page
 *     carrying the non-negotiables: an effective date, an Australian Consumer
 *     Law preservation clause, NSW governing law, contact, and related-docs.
 *   - Each feature page surfaces its specific terms at the point of use —
 *     not just a footer link three screens down.
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const TERMS_PAGES = ['ink', 'appraise', 'game', 'api', 'authenticity', 'oracle'];

// feature page → the terms page its users must see
const FEATURE_LINKS = [
  ['ink/index.html', '/terms/ink/'],
  ['appraise/index.html', '/terms/appraise/'],
  ['game/index.html', '/terms/game/'],
  ['authenticity/index.html', '/terms/authenticity/'],
  ['oracle.html', '/terms/oracle/'],
];

test('every sensitive feature has a dedicated terms page with the mandatory clauses', () => {
  for (const slug of TERMS_PAGES) {
    const html = read(path.join('terms', slug, 'index.html'));
    assert.ok(html.includes('Effective Date:'), `terms/${slug}: missing effective date`);
    assert.ok(html.includes('Australian Consumer Law'), `terms/${slug}: missing ACL preservation`);
    assert.ok(html.includes('New South Wales'), `terms/${slug}: missing governing law`);
    assert.ok(html.includes('support@punicodex.com'), `terms/${slug}: missing contact`);
    assert.ok(html.includes('Related Documents'), `terms/${slug}: missing related documents`);
    assert.ok(
      html.includes(`<link rel="canonical" href="https://punicodex.com/terms/${slug}/">`),
      `terms/${slug}: canonical mismatch`
    );
    assert.ok(html.includes('Plain-English summary') || slug === 'api', `terms/${slug}: missing plain-English summary`);
  }
});

test('feature pages surface their specific terms at the point of use', () => {
  for (const [page, termsHref] of FEATURE_LINKS) {
    const html = read(page);
    assert.ok(
      html.includes(`href="${termsHref}"`),
      `${page}: no visible link to ${termsHref} at the point of use`
    );
  }
});

test('the terms hub links every feature terms page', () => {
  const hub = read('terms/index.html');
  for (const slug of TERMS_PAGES) {
    assert.ok(hub.includes(`href="/terms/${slug}/"`), `terms hub missing /terms/${slug}/`);
  }
});

test('protective terms match their risk: ink disclaims permanence, game discloses odds + no cash value', () => {
  const ink = read('terms/ink/index.html');
  assert.ok(/permanent/i.test(ink), 'ink terms must address permanence');
  assert.ok(/not a guarantee/i.test(ink), 'ink terms must disclaim guarantee');
  const game = read('terms/game/index.html');
  assert.ok(/no cash value/i.test(game), 'game terms: Ink must have no cash value');
  assert.ok(/randomized/i.test(game), 'game terms: packs must disclose randomization');
  assert.ok(/Gambling Help Online/i.test(game), 'game terms: AU gambling help line');
  assert.ok(/18 or older/i.test(game), 'game terms: purchase age guidance');
  const appraise = read('terms/appraise/index.html');
  assert.ok(/not (a|be) professional valuation|not valuations/i.test(appraise), 'appraise: not-a-valuation clause');
  const auth = read('terms/authenticity/index.html');
  assert.ok(/false positive/i.test(auth), 'authenticity: false-positive disclosure');
});

test('no new terms page is an orphan: sitemap + nav coverage', () => {
  const sitemap = read('scripts/gen-sitemap.js');
  for (const slug of TERMS_PAGES) {
    assert.ok(sitemap.includes(`/terms/${slug}/`), `sitemap missing /terms/${slug}/`);
  }
  const { TARGETS } = require('../scripts/sync-desktop-nav.js');
  const pages = new Set(TARGETS.map((t) => t.page));
  for (const slug of TERMS_PAGES) {
    assert.ok(pages.has(path.join('terms', slug, 'index.html')), `desktop-nav TARGETS missing terms/${slug}`);
  }
});

async function runSuite() {
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
      console.error(`    ${String(err.message || err).split('\n').slice(0, 6).join('\n    ')}`);
    }
  }
  console.log(`\nTerms Coverage: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runSuite();
