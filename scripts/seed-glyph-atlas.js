#!/usr/bin/env node
/**
 * PÚNYCODEX — Glyph Atlas Seeder
 *
 * Builds the canonical type/js/glyph-atlas.js from the original-script
 * specimens in type/js/original-scripts.js. Each entry records the Unicode
 * code points of its native script plus paleographic metadata (family,
 * direction, era, region) needed for model training and glyph-aware search.
 *
 * Run: node scripts/seed-glyph-atlas.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { getOriginalScript, getScriptName } = require(path.join(ROOT, 'type', 'js', 'original-scripts.js'));

function loadLexicon() {
  const lexiconPath = path.join(ROOT, 'type', 'js', 'lexicon.js');
  const code = fs.readFileSync(lexiconPath, 'utf8').replace('const LEXICON', 'var LEXICON');
  return new Function(`${code}; return LEXICON;`)();
}

const SCRIPT_METADATA = {
  'Greek': {
    family: 'Greek',
    writingDirection: 'LTR',
    timePeriod: 'c. 800 BCE – present',
    region: 'Greece, Mediterranean, Byzantine world',
  },
  'Hieroglyphs': {
    family: 'Egyptian hieroglyphs',
    writingDirection: 'LTR / boustrophedon historically',
    timePeriod: 'c. 3200 BCE – 394 CE',
    region: 'Nile Valley',
  },
  'Cuneiform': {
    family: 'Cuneiform',
    writingDirection: 'LTR historically',
    timePeriod: 'c. 3200 BCE – 100 CE',
    region: 'Mesopotamia, Anatolia, Elam',
  },
  'Hebrew': {
    family: 'Hebrew',
    writingDirection: 'RTL',
    timePeriod: 'c. 1000 BCE – present',
    region: 'Levant',
  },
  'Ugaritic / Phoenician': {
    family: 'Northwest Semitic',
    writingDirection: 'LTR',
    timePeriod: 'c. 1400 – 1200 BCE',
    region: 'Levant',
  },
  'Phoenician': {
    family: 'Phoenician',
    writingDirection: 'RTL',
    timePeriod: 'c. 1200 – 800 BCE',
    region: 'Levant, Mediterranean',
  },
  'Cuneiform / Luwian hieroglyphs': {
    family: 'Anatolian hieroglyphs / Cuneiform',
    writingDirection: 'LTR',
    timePeriod: 'c. 1400 – 700 BCE',
    region: 'Anatolia, Syria',
  },
  'Runes': {
    family: 'Runic',
    writingDirection: 'LTR',
    timePeriod: 'c. 150 – 1100 CE',
    region: 'Germanic Europe',
  },
  'Younger Futhark': {
    family: 'Runic',
    writingDirection: 'LTR',
    timePeriod: 'c. 800 – 1100 CE',
    region: 'Scandinavia, North Atlantic',
  },
  'Devanagari': {
    family: 'Brahmic',
    writingDirection: 'LTR',
    timePeriod: 'c. 7th c. CE – present',
    region: 'South Asia',
  },
  'Source-language script': {
    family: 'Indic / Buddhist source-language script',
    writingDirection: 'LTR',
    timePeriod: 'varies',
    region: 'South, East and Southeast Asia',
  },
  'Chinese characters': {
    family: 'CJK (Chinese)',
    writingDirection: 'LTR historically top-to-bottom',
    timePeriod: 'c. 1200 BCE – present',
    region: 'East Asia',
  },
  'Japanese characters': {
    family: 'CJK (Japanese)',
    writingDirection: 'LTR historically top-to-bottom',
    timePeriod: 'c. 800 CE – present',
    region: 'Japan',
  },
  'Taoist': {
    family: 'CJK (Chinese)',
    writingDirection: 'LTR historically top-to-bottom',
    timePeriod: 'c. 1200 BCE – present',
    region: 'East Asia',
  },
  'Korean script': {
    family: 'Hangul',
    writingDirection: 'LTR',
    timePeriod: 'c. 1443 CE – present',
    region: 'Korea',
  },
  'Avestan': {
    family: 'Avestan',
    writingDirection: 'RTL',
    timePeriod: 'c. 1000 BCE – present (manuscript tradition later)',
    region: 'Iran, Zoroastrian communities',
  },
  'Old Persian': {
    family: 'Old Persian cuneiform',
    writingDirection: 'LTR',
    timePeriod: 'c. 525 – 330 BCE',
    region: 'Achaemenid Persia',
  },
  'Avestan / Old Persian': {
    family: 'Iranian scripts',
    writingDirection: 'RTL / LTR',
    timePeriod: 'c. 1000 BCE – 330 BCE',
    region: 'Iran',
  },
};

function extractCodePoints(text) {
  if (!text) return [];
  const points = [];
  for (const ch of text.normalize('NFC')) {
    const cp = ch.codePointAt(0);
    points.push(`U+${cp.toString(16).toUpperCase().padStart(4, '0')}`);
  }
  return points;
}

function seed() {
  const lexicon = loadLexicon();
  const atlas = {};

  for (const entry of lexicon) {
    const script = getOriginalScript(entry);
    if (!script || script === '—') continue;

    const scriptName = getScriptName(entry);
    const meta = SCRIPT_METADATA[scriptName] || {
      family: 'Latin transcription',
      writingDirection: 'LTR',
      timePeriod: 'modern scholarly convention',
      region: entry.pantheon,
    };

    atlas[entry.id] = {
      scriptName,
      codePoints: extractCodePoints(script),
      specimen: script,
      family: meta.family,
      writingDirection: meta.writingDirection,
      timePeriod: meta.timePeriod,
      region: meta.region,
    };
  }

  const outputPath = path.join(ROOT, 'type', 'js', 'glyph-atlas.js');
  const header = `/**
 * PÚNYCODEX — Glyph Atlas
 *
 * Canonical Unicode code-point and paleographic metadata for every
 * original-script specimen in the lexicon. Generated by
 * scripts/seed-glyph-atlas.js from type/js/original-scripts.js.
 *
 * This is a canonical source. Edit by hand or re-run the seeder after
 * updating the original-script mappings.
 */

'use strict';

const GLYPH_ATLAS = `;
  const footer = `;

function getGlyphAtlas(id) {
  return GLYPH_ATLAS[id] || null;
}

function getAllGlyphAtlasIds() {
  return Object.keys(GLYPH_ATLAS);
}

module.exports = {
  GLYPH_ATLAS,
  getGlyphAtlas,
  getAllGlyphAtlasIds,
};
`;

  fs.writeFileSync(outputPath, `${header}${JSON.stringify(atlas, null, 2)};${footer}`);
  console.log(`✓ Wrote ${Object.keys(atlas).length} glyph entries to ${outputPath}`);
}

seed();
