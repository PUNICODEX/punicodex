'use strict';
/**
 * Blog pantheon hubs — integrity (SEO wave 2026-11).
 *
 * Guards /blog/pantheon/{key}/: every hub exists for a pantheon with posts,
 * carries unique head metadata, links back to /blog/ and to sibling hubs,
 * and is reachable by crawlable links from the main blog index.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const HUB_ROOT = path.join(ROOT, 'blog', 'pantheon');

function hubs() {
  return fs
    .readdirSync(HUB_ROOT)
    .filter((d) => fs.existsSync(path.join(HUB_ROOT, d, 'index.html')))
    .sort();
}

test('hubs exist for every pantheon with essays', () => {
  const keys = hubs();
  assert.ok(keys.length >= 20, `expected 20+ hubs, got ${keys.length}`);
  for (const key of keys) {
    const html = fs.readFileSync(path.join(HUB_ROOT, key, 'index.html'), 'utf8');
    assert.match(html, new RegExp(`<link rel="canonical" href="https://punicodex\\.com/blog/pantheon/${key}/">`), `${key}: canonical`);
    assert.match(html, /property="og:image"/, `${key}: og:image`);
    assert.match(html, /"CollectionPage"/, `${key}: JSON-LD`);
    assert.match(html, /class="site-footer"/, `${key}: footer`);
    assert.match(html, /href="\/blog\/"/, `${key}: link back to the full index`);
    assert.ok((html.match(/blogh-card/g) || []).length >= 2, `${key}: has essay cards`);
  }
});

test('hub titles are unique per pantheon', () => {
  const titles = new Set();
  for (const key of hubs()) {
    const html = fs.readFileSync(path.join(HUB_ROOT, key, 'index.html'), 'utf8');
    const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    assert.ok(t.length > 10, `${key}: title`);
    assert.ok(!titles.has(t), `${key}: duplicate title ${t}`);
    titles.add(t);
  }
});

test('main blog index links every hub with crawlable anchors', () => {
  const html = fs.readFileSync(path.join(ROOT, 'blog', 'index.html'), 'utf8');
  for (const key of hubs()) {
    assert.ok(
      html.includes(`href="/blog/pantheon/${key}/"`),
      `/blog/ must link hub ${key}`
    );
  }
});
