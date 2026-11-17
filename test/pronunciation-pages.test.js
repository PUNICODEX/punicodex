'use strict';
/**
 * Pronunciation pages — family integrity (SEO wave 2026-11).
 *
 * Guards the per-name pronunciation surface (sites/{id}/pronunciation/):
 * every page carries canonical/OG/JSON-LD, its IPA matches the canonical
 * engine's live derivation, and the sitemap registers the whole family.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { derivePronunciation } = require(path.join(ROOT, 'type', 'js', 'pronunciation-rules.js'));

const SAMPLE_IDS = ['zeus', 'athenai', 'aengus', 'ymir', 'quincunx'].filter((id) =>
  fs.existsSync(path.join(ROOT, 'sites', id, 'index.html'))
);

test('sample pages exist with complete head + chrome', () => {
  assert.ok(SAMPLE_IDS.length >= 3, 'expected at least 3 sample temples');
  for (const id of SAMPLE_IDS) {
    const file = path.join(ROOT, 'sites', id, 'pronunciation', 'index.html');
    assert.ok(fs.existsSync(file), `${id}: pronunciation page missing`);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(
      html,
      new RegExp(`<link rel="canonical" href="https://punicodex\\.com/${id}/pronunciation/">`),
      `${id}: canonical`
    );
    assert.match(html, /property="og:image"/, `${id}: og:image`);
    assert.match(html, /application\/ld\+json/, `${id}: JSON-LD`);
    assert.match(html, /"BreadcrumbList"/, `${id}: breadcrumb JSON-LD`);
    assert.match(html, /class="main-nav tab-nav"/, `${id}: canonical tab nav`);
    assert.match(html, /class="site-footer"/, `${id}: canonical footer`);
    assert.match(html, /<h1>How to pronounce /, `${id}: h1`);
  }
});

test('IPA on each page matches the canonical engine derivation', () => {
  for (const id of SAMPLE_IDS) {
    const entry = LEXICON.find((e) => e.id === id);
    if (!entry) continue;
    let derived;
    try {
      derived = derivePronunciation(entry);
    } catch {
      continue; // engine-less traditions have no page by design
    }
    const file = path.join(ROOT, 'sites', id, 'pronunciation', 'index.html');
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const ipaDiv = html.match(/<div class="pr-ipa">([^<]*)<\/div>/);
    assert.ok(ipaDiv, `${id}: .pr-ipa div`);
    assert.equal(ipaDiv[1].trim(), derived.ipa, `${id}: page IPA must equal engine IPA`);
  }
});

test('family coverage: every temple with a pronunciation-derived entry has a page', () => {
  const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
  const flagshipIds = new Set(ARCHETYPES.filter((a) => a.built).map((a) => a.id));
  let checked = 0;
  for (const entry of LEXICON) {
    if (!fs.existsSync(path.join(ROOT, 'sites', entry.id, 'index.html'))) continue;
    let derived = null;
    try {
      derived = derivePronunciation(entry);
    } catch {
      continue;
    }
    if (!derived || !derived.ipa) continue;
    assert.ok(
      fs.existsSync(path.join(ROOT, 'sites', entry.id, 'pronunciation', 'index.html')),
      `${entry.id}: engine derives IPA but no pronunciation page`
    );
    checked++;
  }
  assert.ok(checked > 500, `expected the bulk of the lexicon to carry pages (got ${checked})`);
  assert.ok(flagshipIds.size >= 500, 'flagship set sanity');
});

test('sitemap registers the pronunciation family', () => {
  const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const count = (
    xml.match(/<loc>https:\/\/punicodex\.com\/[a-z0-9-]+\/pronunciation\/<\/loc>/g) || []
  ).length;
  assert.ok(count >= 900, `expected ~983 pronunciation URLs in sitemap, got ${count}`);
  assert.match(
    xml,
    /<loc>https:\/\/punicodex\.com\/pronunciation\/<\/loc>/,
    'methodology hub in sitemap'
  );
});

test('no orphan pages: every pronunciation page links back to its temple', () => {
  for (const id of SAMPLE_IDS) {
    const html = fs.readFileSync(
      path.join(ROOT, 'sites', id, 'pronunciation', 'index.html'),
      'utf8'
    );
    assert.match(html, new RegExp(`href="https://punicodex\\.com/${id}/"`), `${id}: temple link`);
  }
});
