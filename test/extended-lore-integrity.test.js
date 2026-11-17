#!/usr/bin/env node
/**
 * Extended-lore integrity regression tests.
 *
 * Guards the systemic defects found by the 2026-11 12-agent flagship audit
 * and fixed in the generator (create-flagship.js) + crosslink engine
 * (lib/crosslink.js):
 *  1. Script-less flagships must never link /{id}/script/ (the page does not
 *     exist — generate-script-pages.js gates on hasOriginalScript).
 *  2. The Script nav item must anchor to #original-script-note (the section
 *     id — #script-note scrolls nowhere).
 *  3. No literal [[id|Label]] wikilink wrappers may survive into rendered
 *     HTML (autoLink expands them before walking text nodes).
 *  4. No ASCII first-name crosslinks: scholar names (David Keightley, Diana
 *     Eck, Lata Mani) must not link to /david/, /diana/, /mani/ — the
 *     diacritic forms (Máni) still link and are not affected by this guard.
 *  5. The At-a-Glance cited counter must never show "0 cited" while a
 *     sources section exists (fallback: total cited works, relabeled).
 *  6. FAQPage JSON-LD must carry prose only: no pointer anchors
 *     ("…→") and no raw HTML entities.
 *  7. No pseudo-citation filler ("Material evidence — … for X and related
 *     cults.", "Primary sources in the … tradition for X.") — empty
 *     categories are omitted, not faked.
 *  8. Blog pages carry the canonical footer (pantheon name + "one of 983").
 *  9. Every flagship with a script page has a lore-catalog originalScriptNote
 *     (the audit's comprehensiveness bar).
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { hasOriginalScript } = require(path.join(ROOT, 'type', 'js', 'original-scripts.js'));
const ARCH = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
const CATALOG = require(path.join(ROOT, 'scripts', 'lore-catalog.json'));

const lexArr = Array.isArray(LEXICON) ? LEXICON : LEXICON.entries;
const byId = new Map(lexArr.map((e) => [e.id, e]));
const FLAGSHIPS = (ARCH.ARCHETYPES || []).filter((a) => a.built).map((a) => a.id);

function extendedHtml(id) {
  const p = path.join(ROOT, 'sites', id, 'lore', 'extended', 'index.html');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

test('flagships: every built temple has an extended lore page', () => {
  const missing = FLAGSHIPS.filter((id) => extendedHtml(id) === null);
  assert.deepStrictEqual(missing, []);
});

test('extended lore: script-less temples never link /{id}/script/', () => {
  const bad = [];
  for (const id of FLAGSHIPS) {
    const html = extendedHtml(id);
    if (html === null) continue;
    const entry = byId.get(id);
    if (entry && !hasOriginalScript(entry) && html.includes(`href="/${id}/script/"`)) {
      bad.push(id);
    }
  }
  assert.deepStrictEqual(bad, [], `dead /script/ links on: ${bad.slice(0, 8).join(', ')}`);
});

test('extended lore: Script nav anchors to #original-script-note', () => {
  const bad = [];
  for (const id of FLAGSHIPS) {
    const html = extendedHtml(id);
    if (html === null) continue;
    if (html.includes('href="#script-note"')) bad.push(id);
    // When a Script nav link exists, its target section must exist.
    if (
      html.includes('href="#original-script-note"') &&
      !html.includes('id="original-script-note"')
    ) {
      bad.push(`${id} (anchor without section)`);
    }
  }
  assert.deepStrictEqual(bad, []);
});

test('extended lore: no literal [[id|Label]] wikilink leaks', () => {
  const bad = [];
  for (const id of FLAGSHIPS) {
    const html = extendedHtml(id);
    if (html && /\[\[[a-z0-9-]+\|/.test(html)) bad.push(id);
  }
  assert.deepStrictEqual(bad, [], `wikilink leaks on: ${bad.slice(0, 8).join(', ')}`);
});

test('extended lore: no ASCII first-name crosslinks (David/Diana/Mani)', () => {
  const bad = [];
  for (const id of FLAGSHIPS) {
    const html = extendedHtml(id);
    if (html && />(David|Diana|Mani)<\/a>/.test(html)) bad.push(id);
  }
  assert.deepStrictEqual(bad, [], `first-name false links on: ${bad.slice(0, 8).join(', ')}`);
});

test('extended lore: cited counter never shows a bare "0 cited"', () => {
  const bad = [];
  for (const id of FLAGSHIPS) {
    const html = extendedHtml(id);
    if (html && /(^|[^0-9])0 cited/.test(html)) bad.push(id);
  }
  assert.deepStrictEqual(bad, [], `"0 cited" cards on: ${bad.slice(0, 8).join(', ')}`);
});

test('extended lore: FAQPage JSON-LD carries prose only', () => {
  const bad = [];
  for (const id of FLAGSHIPS) {
    const html = extendedHtml(id);
    if (!html) continue;
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      if (/→/.test(m[1]) || /&#39;|&quot;|&lt;[a-z]/.test(m[1])) {
        bad.push(id);
        break;
      }
    }
  }
  assert.deepStrictEqual(bad, [], `JSON-LD residue on: ${bad.slice(0, 8).join(', ')}`);
});

test('extended lore: no pseudo-citation filler cards', () => {
  const bad = [];
  for (const id of FLAGSHIPS) {
    const html = extendedHtml(id);
    if (!html) continue;
    if (
      /Material evidence — iconography, inscriptions, and temple archaeology — for/.test(html) ||
      /Primary sources in the \w+ tradition for/.test(html) ||
      /Lexical and philological sources for/.test(html)
    ) {
      bad.push(id);
    }
  }
  assert.deepStrictEqual(bad, [], `pseudo-citations on: ${bad.slice(0, 8).join(', ')}`);
});

test('blogs: canonical footer with live pantheon name and count', () => {
  const bad = [];
  for (const id of FLAGSHIPS) {
    const p = path.join(ROOT, 'sites', id, 'blog', 'index.html');
    if (!fs.existsSync(p)) continue;
    const html = fs.readFileSync(p, 'utf8');
    if (!html.includes('one of 983')) bad.push(id);
    if (/A temple of the —/.test(html)) bad.push(`${id} (empty pantheon)`);
    if (/one of 980/.test(html)) bad.push(`${id} (stale count)`);
  }
  assert.deepStrictEqual(bad, [], `blog footer defects on: ${bad.slice(0, 8).join(', ')}`);
});

test('catalog: every script-page flagship has an originalScriptNote', () => {
  const missing = [];
  for (const id of FLAGSHIPS) {
    if (!fs.existsSync(path.join(ROOT, 'sites', id, 'script', 'index.html'))) continue;
    if (!CATALOG[id] || !CATALOG[id].originalScriptNote) missing.push(id);
  }
  assert.deepStrictEqual(missing, [], `notes missing for: ${missing.slice(0, 8).join(', ')}`);
});

test('catalog: no nested foreign entries inside catalog entries', () => {
  // 2026-11 corruption: sarnath contained six complete foreign entries.
  const ids = new Set(Object.keys(CATALOG));
  const STANDARD = new Set([
    'pronunciation',
    'domains',
    'symbols',
    'mythology',
    'syncretism',
    'culturalLegacy',
    'extendedMeditation',
    'sources',
    'archaeology',
    'cult',
    'iconography',
    'reception',
    'originalScriptNote',
    'parallels',
    'modernWords',
    'places',
    'screenAppearances',
    'faq',
    'notes',
    'variants',
    'relatedNames',
    'etymology',
    'nameVariations',
    'scholarlySources',
  ]);
  const bad = [];
  for (const [id, entry] of Object.entries(CATALOG)) {
    for (const k of Object.keys(entry)) {
      if (!STANDARD.has(k) && ids.has(k)) bad.push(`${id}.${k}`);
    }
  }
  assert.deepStrictEqual(bad, [], `nested entries: ${bad.slice(0, 8).join(', ')}`);
});
