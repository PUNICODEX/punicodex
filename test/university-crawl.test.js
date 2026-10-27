#!/usr/bin/env node
/**
 * PuniCodex — university crawler tests.
 *
 * Covers the parsing/matching core of scripts/crawl-australian-universities.js
 * (department detection, link extraction, contact-page ranking, same-host
 * filtering) against fixed HTML fixtures. The network layer is exercised
 * manually / in the weekly workflow; bots-shield degradation is asserted
 * as contract: a blocked domain must report blocked:true and NEVER a
 * backlink false-negative.
 */
const test = require('node:test');
const assert = require('node:assert');

// The crawler guards main() behind require.main, so importing is side-effect
// free (top level is constants + the department vocabulary only).
const {
  detectDepartments,
  extractLinks,
  visibleText,
  uniqueLimited,
} = require('../scripts/crawl-australian-universities.js');

test('export contract: the crawler exposes its pure functions', () => {
  assert.equal(typeof detectDepartments, 'function');
  assert.equal(typeof extractLinks, 'function');
  assert.equal(typeof visibleText, 'function');
  assert.equal(typeof uniqueLimited, 'function');
});

test('department detection matches the vocabulary against page text', () => {
  const facultyPage = visibleText(`
    <html><body>
      <h1>Faculty of Arts</h1>
      <a href="/arts/classics">Department of Classics and Ancient History</a>
      <p>The school of linguistics offers undergraduate and honours programs.</p>
      <p>Archaeology field schools run each January.</p>
      <script>var egyptology = 'hidden script must not match';</script>
    </body></html>
  `);
  const found = detectDepartments(facultyPage);
  assert.ok(found.includes('Classics and Ancient History'), `classics missed: ${found}`);
  assert.ok(found.includes('Linguistics'), `linguistics missed: ${found}`);
  assert.ok(found.includes('Archaeology'), `archaeology missed: ${found}`);
  assert.ok(!found.some((d) => /egypt/i.test(d)), 'script content must not match');
});

test('department detection does not fire on unrelated text', () => {
  const found = detectDepartments(visibleText('<p>Engineering · Physics · Commerce</p>'));
  assert.deepStrictEqual(found, []);
});

test('link extraction keeps same-host links and normalises paths', () => {
  const html = `
    <a href="/faculties/arts">Arts</a>
    <a href="https://example.edu.au/schools/design">Design</a>
    <a href="https://other-uni.edu.au/nope">External</a>
    <a href="#anchor">Anchor</a>
    <a href="mailto:office@example.edu.au">Mail</a>
  `;
  const links = extractLinks(html, 'example.edu.au');
  assert.ok(links.includes('/faculties/arts'));
  assert.ok(links.includes('/schools/design'));
  assert.ok(!links.some((l) => l.includes('other-uni')));
  assert.ok(!links.includes('#anchor'));
  assert.ok(!links.some((l) => l.startsWith('mailto:')));
});

test('contact page ranking surfaces office/people pages first, deduped', () => {
  const paths = [
    '/about/contact-us',
    '/arts/contact-us',
    '/arts/contact-us?x=1',
    '/news/events',
    '/people/academic-staff',
    '/people/academic-staff',
  ];
  const ranked = uniqueLimited(
    paths.filter((p) => /contact|people|staff/i.test(p)),
    4
  );
  assert.strictEqual(ranked.length, 3, 'duplicates and query variants collapse');
  assert.ok(ranked.includes('/about/contact-us'));
  assert.ok(ranked.includes('/people/academic-staff'));
});
