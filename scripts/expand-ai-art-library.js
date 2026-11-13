#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ARCHETYPES } = require('../js/archetypes-v2.js');
const { LEXICON } = require('../type/js/lexicon.js');
const { writeFileWithRetry } = require('./write-file-retry.js');

const ROOT = path.join(__dirname, '..');
const LIB_PATH = path.join(ROOT, 'data', 'ai-art', 'prompt-library.json');
const lib = JSON.parse(fs.readFileSync(LIB_PATH, 'utf8'));

const traditionAliases = {
  abrahamic: 'abrahamic',
  chthonic: 'greek',
  'greek-location': 'greek',
  olympian: 'greek',
  titan: 'greek',
};

const guidance = {
  aboriginal: 'community-specific visual evidence only; no generic dot painting, no imitation of restricted sacred symbols, no pseudo-script',
  abrahamic: 'early Christian and Byzantine visual composition, period-appropriate garments and objects only, no pseudo-script',
  baltic: 'Baltic amber, solar wheels and natural motifs only when relevant to the entry',
  buddhist: 'Himalayan compositional balance and serene iconographic posture, no pseudo-script',
  canaanite: 'Levantine Bronze Age regalia and profile composition, no pseudo-script',
  celtic: 'La Tene spiral and interlace ornament, anatomically coherent figures',
  chinese: 'Chinese flowing clouds, drapery and cloud-scroll rhythm, no characters or seal script',
  egyptian: 'ancient Egyptian profile composition and period-appropriate regalia, no pseudo-hieroglyphs',
  greek: 'classical Greek drapery, contrapposto and entry-specific attributes, no pseudo-inscriptions',
  hittite: 'Anatolian Bronze Age regalia and profile composition, no pseudo-script',
  incan: 'Andean goldwork and highland geometric rhythm, no pseudo-script',
  japanese: 'ukiyo-e-inspired flowing contour rhythm, no characters or seals',
  korean: 'Korean folk-painting rhythm and celestial or natural motifs, no characters',
  mapuche: 'Mapuche silverwork and entry-specific natural references, no generic tribal markings',
  mesopotamian: 'Mesopotamian cylinder-seal visual rhythm, no pseudo-cuneiform',
  nahuatl: 'Mixtec manuscript geometry and featherwork only when relevant, no pseudo-glyphs',
  norse: 'Norse knotwork rhythm and entry-specific animal, weapon or navigation motifs, no pseudo-runes',
  phoenician: 'Levantine maritime and metalwork references, no pseudo-alphabet',
  polynesian: 'Pacific navigation, ocean and textile geometry without copying protected tribal patterns',
  roman: 'classical Roman contrapposto, drapery and entry-specific attributes, no pseudo-inscriptions',
  sanskrit: 'Indian miniature-inspired ornament, posture and entry-specific attributes, no pseudo-script',
  slavic: 'Slavic folk ornament and entry-specific natural or solar motifs, no pseudo-script',
  taoist: 'Chinese celestial drapery and cosmological geometry only when relevant, no characters',
  yoruba: 'Yoruba brass, crown and bead iconography when relevant, no generic tribal markings',
  zoroastrian: 'Achaemenid profile composition and entry-specific solar or winged motifs, no pseudo-inscriptions',
};

for (const tradition of new Set([...Object.keys(guidance), ...Object.values(traditionAliases)])) {
  const existing = lib.traditions[tradition] || { wins: 0, losses: 0, notes: [] };
  lib.traditions[tradition] = {
    ...existing,
    styleDna:
      tradition === 'aboriginal'
        ? `respectful Australian Aboriginal visual references, ${guidance.aboriginal}`
        : existing.styleDna || `museum-quality figurative illustration, ${guidance[tradition]}`,
    iconography: guidance[tradition],
  };
}

const lexiconById = new Map(LEXICON.map((entry) => [entry.id, entry]));
let demand = {};
try {
  demand = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ai-art', 'temple-demand.json'), 'utf8'));
} catch {}
let added = 0;
for (const archetype of ARCHETYPES.filter((entry) => entry.built)) {
  if (lib.deities[archetype.id]) continue;
  const entry = lexiconById.get(archetype.id);
  const tradition = traditionAliases[archetype.pantheon] || archetype.pantheon;
  const attributes = String(entry?.meaning || archetype.tagline || archetype.domain || '')
    .split(/[;,]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 4);
  lib.deities[archetype.id] = {
    tradition,
    attributes: attributes.length ? attributes : [archetype.tagline || archetype.domain || archetype.name],
    promptVersion: 1,
    wins: 0,
    losses: 0,
    activeMutations: [],
    demandTier: demand[archetype.id]?.tier || 3,
  };
  added++;
}

lib.families.tattoo = {
  ...lib.families.tattoo,
  dna: 'museum-quality blackwork tattoo illustration, bold confident contours, intricate fine-line detail, dotwork and controlled crosshatching, single coherent silhouette, balanced negative space, clean stencil-friendly edges, isolated on a plain white background, no background scene, no text, no letters, no pseudo-script, no watermark, no border, no frame',
  notes: [
    ...new Set([
      ...(lib.families.tattoo.notes || []),
      '2026-11-13: stencil-first blackwork, isolated for transparent Commons and Pinterest derivatives',
    ]),
  ],
};

writeFileWithRetry(LIB_PATH, `${JSON.stringify(lib, null, 2)}\n`);
console.log(`AI art library: ${added} flagship deities added; ${Object.keys(lib.deities).length} total; ${Object.keys(lib.traditions).length} traditions.`);
