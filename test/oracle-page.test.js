/**
 * PuniCodex — Oracle page smoke tests
 * Verifies that /oracle/ has the required structure, nav, sections,
 * interactive demo wiring, and footer expected by the global layout.
 */

const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const assert = require('node:assert');

const filePath = path.join(__dirname, '..', 'oracle/index.html');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

let html;
let $;

try {
  html = fs.readFileSync(filePath, 'utf8');
  $ = cheerio.load(html);
} catch (err) {
  console.error(`Failed to load ${filePath}: ${err.message}`);
  process.exit(1);
}

console.log('Oracle Page Tests');

test('page has exactly one <title>', () => {
  assert.strictEqual($('title').length, 1, 'expected one <title>');
  const title = $('title').text();
  assert.ok(title.includes('Oracle'), 'title should mention Oracle');
});

test('page has canonical URL', () => {
  const canonical = $('link[rel="canonical"]').attr('href');
  assert.strictEqual(canonical, 'https://punicodex.com/oracle/');
});

test('page has meta description', () => {
  const desc = $('meta[name="description"]').attr('content');
  assert.ok(desc && desc.length > 20, 'expected a meta description');
});

test('page has Open Graph and Twitter Card tags', () => {
  assert.ok($('meta[property="og:title"]').length > 0, 'expected og:title');
  assert.ok($('meta[property="og:description"]').length > 0, 'expected og:description');
  assert.ok($('meta[property="og:url"]').length > 0, 'expected og:url');
  assert.ok($('meta[property="og:image"]').length > 0, 'expected og:image');
  assert.ok($('meta[name="twitter:card"]').length > 0, 'expected twitter:card');
});

test('page links required stylesheets', () => {
  const styles = $('link[rel="stylesheet"]')
    .map((_, el) => $(el).attr('href'))
    .get();
  assert.ok(styles.includes('/css/design-system.css'), 'expected design-system.css');
  assert.ok(
    styles.some((s) => s.startsWith('/css/oracle.css')),
    'expected oracle.css (any ?v= pin)'
  );
});

test('page links oracle.js', () => {
  const scripts = $('script[src]')
    .map((_, el) => $(el).attr('src'))
    .get();
  assert.ok(
    scripts.some((s) => s.startsWith('/js/oracle.js')),
    'expected /js/oracle.js (any ?v= pin)'
  );
});

test('main nav exists with expected links', () => {
  assert.strictEqual($('#main-nav').length, 1, 'expected #main-nav');
  const links = $('#main-nav .nav-links a')
    .map((_, el) => $(el).attr('href'))
    .get();
  assert.ok(links.includes('/oracle/'), 'expected Oracle link in nav');
  assert.ok(links.includes('/pantheon/'), 'expected Pantheon link in nav');
  assert.ok(links.includes('/lexicon/'), 'expected Lexicon link in nav');
});

test('Oracle nav link is marked active', () => {
  const oracleLink = $('#main-nav .nav-links a[href="/oracle/"]');
  assert.strictEqual(oracleLink.length, 1);
  assert.ok(oracleLink.hasClass('active'), 'expected Oracle nav link to be active');
});

test('mobile menu toggle exists and is wired', () => {
  const toggle = $('#nav-toggle');
  assert.strictEqual(toggle.length, 1, 'expected #nav-toggle');
  assert.strictEqual(toggle.attr('aria-expanded'), 'false');
  assert.strictEqual($('#mobile-menu').length, 1, 'expected #mobile-menu');
});

test('mobile menu contains Oracle link', () => {
  const link = $('#mobile-menu a[href="/oracle/"]');
  assert.strictEqual(link.length, 1);
  assert.ok(link.hasClass('active'), 'expected Oracle mobile link active');
});

test('hero section exists with canvas and fallback', () => {
  assert.strictEqual($('.oracle-hero').length, 1, 'expected hero section');
  assert.strictEqual($('#oracle-canvas').length, 1, 'expected canvas');
  assert.strictEqual($('#heroFallback').length, 1, 'expected fallback');
});

test('page contains all required content sections', () => {
  const required = [
    '.oracle-statement',
    '.os-stats',
    '.pillar-grid',
    '.oracle-console',
    '#oracle-demo',
    '.forge-timeline',
    '.safety-grid',
    '.oracle-cta-section',
  ];
  for (const selector of required) {
    assert.strictEqual($(selector).length, 1, `expected ${selector}`);
  }
});

test('interactive demo has query buttons mapped to sample data', () => {
  const queries = $('#oracle-demo .demo-query');
  assert.ok(queries.length >= 6, 'expected at least 6 demo queries');
  for (const el of queries.toArray()) {
    const key = $(el).attr('data-query');
    assert.ok(key && key.length > 0, 'expected each demo query to have data-query');
  }
});

test('footer exists with site columns', () => {
  assert.strictEqual($('.site-footer').length, 1, 'expected footer');
  const explore = $('.site-footer .footer-column:contains("Explore")');
  const resources = $('.site-footer .footer-column:contains("Resources")');
  assert.ok(explore.length >= 1, 'expected Explore footer column');
  assert.ok(resources.length >= 1, 'expected Resources footer column');
});

test('footer includes Oracle link', () => {
  const oracleFooterLink = $('.site-footer a[href="/oracle/"]');
  assert.strictEqual(oracleFooterLink.length, 1, 'expected Oracle link in footer');
});

if (!process.exitCode) {
  console.log('\n✓ All Oracle page tests passed');
} else {
  console.log('\n✗ Some Oracle page tests failed');
  process.exit(1);
}
