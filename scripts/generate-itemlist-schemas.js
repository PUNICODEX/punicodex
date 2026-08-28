#!/usr/bin/env node
/**
 * ItemList JSON-LD baker (SEO wave 3).
 *
 * Bakes an ItemList of the first 50 entries (absolute URLs) into /lexicon/
 * and /pantheon/ between PUNICODEX-ITEMLIST markers, after each page's
 * existing schema block. Idempotent: strip-then-insert, so `npm run generate`
 * can re-run it as entries change.
 *
 * Usage: node scripts/generate-itemlist-schemas.js
 */

const fs = require('node:fs');
const path = require('node:path');

const { writeFileWithRetry } = require('./write-file-retry');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));

const START = '<!-- PUNICODEX-ITEMLIST-START -->';
const END = '<!-- PUNICODEX-ITEMLIST-END -->';

function itemListBlock(entries) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: entries.length,
    itemListElement: entries.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: e.unicode,
      url: `https://punicodex.com/${e.id}/`,
    })),
  };
  return `${START}\n<script type="application/ld+json">\n${JSON.stringify(json, null, 2)}\n</script>\n${END}`;
}

function bake(relPath, entries) {
  const file = path.join(ROOT, relPath);
  let html = fs.readFileSync(file, 'utf8');
  // Strip any prior block (idempotent). The insert phase writes
  // `    {block}\n` immediately before its anchor (see below), so the strip
  // must consume that same surrounding whitespace — otherwise every generate
  // leaves one extra blank line behind and the CI divergence gate
  // (npm run generate + git diff --exit-code) fails on a perpetually growing
  // file.
  const startIdx = html.indexOf(START);
  if (startIdx !== -1) {
    const endIdx = html.indexOf(END, startIdx);
    if (endIdx === -1) throw new Error(`${relPath}: unterminated ItemList marker`);
    let cutStart = startIdx;
    while (cutStart > 0 && (html[cutStart - 1] === ' ' || html[cutStart - 1] === '\t')) cutStart--;
    if (cutStart > 0 && html[cutStart - 1] === '\n') cutStart--;
    let cutEnd = endIdx + END.length;
    if (html[cutEnd] === '\n') cutEnd++;
    html = `${html.slice(0, cutStart)}\n${html.slice(cutEnd)}`;
  }
  const block = itemListBlock(entries);
  // Pipeline order is ItemList -> herald beacon -> cookie consent -> </head>
  // (the injectors run after this script and place their blocks last). When
  // run standalone AFTER those injectors — tests, evolve — inserting before
  // </head> would leapfrog their blocks and reorder the file, failing the
  // divergence gate. Anchor to the earliest downstream marker instead.
  const anchors = [
    html.indexOf('<!-- PUNICODEX-HERALD-BEACON-START -->'),
    html.indexOf('<!-- PUNICODEX-COOKIE-CONSENT-START -->'),
    html.indexOf('</head>'),
  ].filter((i) => i !== -1);
  if (anchors.length === 0) throw new Error(`${relPath}: no </head>`);
  const insertAt = Math.min(...anchors);
  html = `${html.slice(0, insertAt)}    ${block}\n${html.slice(insertAt)}`;
  writeFileWithRetry(file, html, 'utf8');
  console.log(`${relPath}: ItemList baked (${entries.length} items)`);
}

// Lexicon: first 50 entries, alphabetical by Unicode (the page's default sort).
const lexiconFirst50 = [...LEXICON]
  .sort((a, b) => a.unicode.localeCompare(b.unicode, 'en'))
  .slice(0, 50)
  .map((e) => ({ id: e.id, unicode: e.unicode }));

// Pantheon: first 50 flagship archetypes in canonical order.
const pantheonFirst50 = ARCHETYPES.slice(0, 50).map((a) => {
  const entry = LEXICON.find((e) => e.id === a.id);
  return { id: a.id, unicode: entry ? entry.unicode : a.id };
});

bake(path.join('lexicon', 'index.html'), lexiconFirst50);
bake(path.join('pantheon', 'index.html'), pantheonFirst50);
