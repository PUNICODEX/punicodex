'use strict';
/**
 * Etymology + Original Script pages — family integrity (SEO wave 2026-11).
 *
 * Guards the two new per-name surfaces:
 *  - sites/{id}/etymology/ — every page: complete head, engine data match,
 *    no-orphan temple link.
 *  - sites/{id}/script/ — only for genuinely attested scripts (doctrine:
 *    "Original Script" label only when a real writing system exists);
 *    specimen matches getOriginalScript(); provenance present.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { getOriginalScript, hasOriginalScript } = require(
  path.join(ROOT, 'type', 'js', 'original-scripts.js')
);

const SAMPLE = ['zeus', 'anubis', 'aengus', 'enlil', 'freya'].filter((id) =>
  fs.existsSync(path.join(ROOT, 'sites', id, 'index.html'))
);

test('etymology pages: complete head + chrome on samples', () => {
  assert.ok(SAMPLE.length >= 3);
  for (const id of SAMPLE) {
    const file = path.join(ROOT, 'sites', id, 'etymology', 'index.html');
    assert.ok(fs.existsSync(file), `${id}: etymology page missing`);
    const html = fs.readFileSync(file, 'utf8');
    assert.match(
      html,
      new RegExp(`<link rel="canonical" href="https://punicodex\\.com/${id}/etymology/">`),
      `${id}: canonical`
    );
    assert.match(html, /property="og:image"/, `${id}: og:image`);
    assert.match(html, /"BreadcrumbList"/, `${id}: breadcrumb JSON-LD`);
    assert.match(html, /class="main-nav tab-nav"/, `${id}: tab nav`);
    assert.match(html, /class="site-footer"/, `${id}: footer`);
    assert.match(
      html,
      new RegExp(`href="https://punicodex\\.com/${id}/"`),
      `${id}: temple link (no orphan)`
    );
  }
});

test('etymology pages: structured data matches the lexicon', () => {
  for (const id of SAMPLE) {
    const entry = LEXICON.find((e) => e.id === id);
    if (!entry) continue;
    const file = path.join(ROOT, 'sites', id, 'etymology', 'index.html');
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    if (entry.etymology && entry.etymology.protoForm) {
      assert.ok(html.includes(entry.etymology.protoForm), `${id}: proto form on page`);
    }
    const meaningLead = entry.meaning ? entry.meaning.split(/(?<=[.!?])\s/)[0] : '';
    if (meaningLead)
      assert.ok(html.includes(meaningLead.slice(0, 40)), `${id}: meaning lead on page`);
  }
});

test('etymology coverage: every meaning-bearing entry with a temple has a page', () => {
  let checked = 0;
  for (const entry of LEXICON) {
    if (!fs.existsSync(path.join(ROOT, 'sites', entry.id, 'index.html'))) continue;
    if (!entry.meaning && !entry.etymology) continue;
    assert.ok(
      fs.existsSync(path.join(ROOT, 'sites', entry.id, 'etymology', 'index.html')),
      `${entry.id}: meaning/etymology exists but no page`
    );
    checked++;
  }
  assert.ok(checked > 900, `expected ~983 etymology pages (got ${checked})`);
});

test('script pages: doctrine — only genuinely attested scripts get pages', () => {
  let withScript = 0;
  for (const entry of LEXICON) {
    if (!fs.existsSync(path.join(ROOT, 'sites', entry.id, 'index.html'))) continue;
    const page = path.join(ROOT, 'sites', entry.id, 'script', 'index.html');
    if (hasOriginalScript(entry)) {
      withScript++;
      assert.ok(fs.existsSync(page), `${entry.id}: has original script but no page`);
      const html = fs.readFileSync(page, 'utf8');
      const specimen = getOriginalScript(entry);
      assert.ok(html.includes(specimen), `${entry.id}: specimen ${specimen} on page`);
      assert.match(
        html,
        /Original Script|Scholarly Transliteration|Reconstructed Specimen/,
        `${entry.id}: honest label`
      );
      assert.match(
        html,
        new RegExp(`href="https://punicodex\\.com/${entry.id}/"`),
        `${entry.id}: temple link`
      );
    } else {
      assert.ok(!fs.existsSync(page), `${entry.id}: scriptless entry must NOT have a script page`);
    }
  }
  assert.ok(
    withScript > 700,
    `expected the bulk of entries to carry attested scripts (got ${withScript})`
  );
});

test('sitemap registers etymology, script, and blog-hub families', () => {
  const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const ety = (xml.match(/\/etymology\/<\/loc>/g) || []).length;
  const scr = (xml.match(/\/script\/<\/loc>/g) || []).length;
  const hubs = (xml.match(/\/blog\/pantheon\/[a-z-]+\/<\/loc>/g) || []).length;
  assert.ok(ety >= 900, `etymology URLs in sitemap: ${ety}`);
  assert.ok(scr >= 700, `script URLs in sitemap: ${scr}`);
  assert.ok(hubs >= 20, `blog pantheon hubs in sitemap: ${hubs}`);
});
