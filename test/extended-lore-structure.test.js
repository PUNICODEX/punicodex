/**
 * PuniCodex — Extended Lore Structure & Owned-Domain Display Tests
 *
 * Guards two display contracts of the flagship extended-lore pages:
 *
 *  1. Owned-domain completeness — every OWNED domain wired into a flagship
 *     archetype (domainUnicode / domainAlt) must be surfaced on the temple:
 *     in the footer "Owned Domains" block and/or the lore-page Name
 *     Variations cards. Regression guard for the gap where archetype-only
 *     forms (e.g. Nike's original-script νίκη.com) never appeared because
 *     getOwnedForms() only consulted lexicon unicode + variants.
 *
 *  2. Mobile-safe Unicode breakdown — every cell of the section-03 char table
 *     carries a data-label so the responsive CSS can restack rows as cards
 *     (no overflow / no cut-off Phonetic Role column on small screens).
 *
 * Run standalone: node test/extended-lore-structure.test.js
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
const OWNED = new Set(
  JSON.parse(fs.readFileSync(path.join(ROOT, 'platform', 'db', 'owned-domains.json'), 'utf8')).map(
    (d) => d.toLowerCase().normalize('NFC')
  )
);

const BUILT = ARCHETYPES.filter((a) => a.built);
const EXPECTED_LABELS = ['Character', 'Unicode', 'Name', 'Block', 'Phonetic Role'];

test('every owned archetype domain is surfaced on its temple', () => {
  const misses = [];
  for (const a of BUILT) {
    const wired = [a.domainUnicode, ...(a.domainAlt || [])].filter(
      (d) => typeof d === 'string' && OWNED.has(d.toLowerCase().normalize('NFC'))
    );
    if (!wired.length) continue;
    const idxPath = path.join(ROOT, 'sites', a.id, 'index.html');
    if (!fs.existsSync(idxPath)) {
      misses.push(`${a.id}: missing sites/${a.id}/index.html`);
      continue;
    }
    const idx = fs.readFileSync(idxPath, 'utf8').toLowerCase().normalize('NFC');
    const lorePath = path.join(ROOT, 'sites', a.id, 'lore', 'index.html');
    const lore = fs.existsSync(lorePath)
      ? fs.readFileSync(lorePath, 'utf8').toLowerCase().normalize('NFC')
      : '';
    for (const d of wired) {
      const needle = d.toLowerCase().normalize('NFC');
      if (!idx.includes(needle) && !lore.includes(needle)) {
        misses.push(`${a.id}: owned domain ${d} appears neither in footer nor Name Variations`);
      }
    }
  }
  assert.deepStrictEqual(misses, []);
});

test('extended-lore char-table cells carry data-labels for mobile restack', () => {
  const bad = [];
  for (const a of BUILT) {
    const extPath = path.join(ROOT, 'sites', a.id, 'lore', 'extended', 'index.html');
    if (!fs.existsSync(extPath)) {
      bad.push(`${a.id}: missing extended page`);
      continue;
    }
    const html = fs.readFileSync(extPath, 'utf8');
    const rows = html.match(/<tr class="reveal-up"[^>]*>.*?<\/tr>/g) || [];
    const tableRows = rows.filter((r) => r.includes('char-cell'));
    if (!tableRows.length) {
      bad.push(`${a.id}: extended page has no char-table rows`);
      continue;
    }
    for (const row of tableRows) {
      for (const label of EXPECTED_LABELS) {
        if (!row.includes(`data-label="${label}"`)) {
          bad.push(`${a.id}: row missing data-label="${label}"`);
          break;
        }
      }
    }
  }
  assert.deepStrictEqual(bad, []);
});

test('extended-lore stylesheet reference carries a cache-busting version', () => {
  const bad = [];
  for (const a of BUILT) {
    const extPath = path.join(ROOT, 'sites', a.id, 'lore', 'extended', 'index.html');
    if (!fs.existsSync(extPath)) continue;
    const html = fs.readFileSync(extPath, 'utf8');
    const m = html.match(/extended-lore\.css\?v=([A-Za-z0-9]+)/);
    if (!m) bad.push(`${a.id}: extended-lore.css loaded without ?v= cache-bust`);
  }
  assert.deepStrictEqual(bad, []);
});
