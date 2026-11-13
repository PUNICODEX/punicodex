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

const familyDefinitions = {
  tattoo: {
    dna: 'museum-quality blackwork tattoo illustration, bold confident contours, intricate fine-line detail, dotwork and controlled crosshatching, single coherent silhouette, balanced negative space, clean stencil-friendly edges, full-length subject fully contained within the canvas: head-to-toe depiction for anthropomorphic beings with feet fully visible, complete object or emblem for non-anthropomorphic subjects, generous white margin on every side, no cropped anatomy, no cropped wings or attributes, isolated on a plain white background, no background scene, no text, no letters, no pseudo-script, no watermark, no border, no frame',
    mutationOperators: {
      'garbled-text': 'append: no text, no letters, no inscription, no watermark',
      'wrong-attributes': 'reorder: lead with the missed attribute; drop the misread one',
      'cropped-subject': 'strengthen: full-length subject with the entire silhouette and every extremity inside the frame, generous white margin on every side, no cropped anatomy or attributes',
      'weak-composition': 'alternate layout: single central subject, complete and fully contained, centered, generous white space',
      anatomy: 'append: anatomically correct hands and faces, clean linework',
      'busy-background': 'strengthen: plain white isolated background, no landscape, no scene, no border',
      'off-style': 'prepend the style dna twice and append: strictly black linework on white only',
    },
    notes: ['2026-11-13: stencil-first blackwork, isolated for transparent Commons and Pinterest derivatives'],
  },
  'bw-engraving': {
    dna: 'museum-quality black and white copperplate engraving in the tradition of Gustave Doré, precise burin line, rich controlled crosshatching, sculptural chiaroscuro, full-length subject fully contained within the plate, complete figure or object with elegant negative space, printed on warm ivory paper, no border, no plate mark, no caption, no letters, no pseudo-script, no watermark',
    mutationOperators: {
      'garbled-text': 'append: no caption, no letters, no inscription, no watermark',
      'wrong-attributes': 'reorder: lead with the missed attribute; drop the misread one',
      'cropped-subject': 'strengthen: full plate composition with the entire subject and all attributes inside the frame, generous ivory margin on every side',
      'weak-composition': 'alternate layout: single monumental central subject, complete and fully contained, balanced engraved negative space',
      anatomy: 'append: anatomically correct hands and faces, disciplined burin linework',
      'busy-background': 'strengthen: warm ivory paper background, no landscape, no scene, no border',
      'off-style': 'prepend the style dna twice and append: strictly monochrome copperplate engraving only',
    },
    notes: ['2026-11-13: plate-first ivory-paper engraving with full-subject margins'],
  },
  geometric: {
    dna: 'elite sacred-geometry art print, precise low-poly facets, golden-ratio construction, harmonious radial symmetry, jewel-like gold deep indigo and weathered stone palette, crisp vector-clean edges, dimensional yet minimalist, full emblem or subject fully contained with generous margins, no text, no letters, no pseudo-script, no watermark, no border, no frame',
    mutationOperators: {
      'garbled-text': 'append: no symbols that resemble letters, no inscription, no watermark',
      'wrong-attributes': 'reorder: construct the missed attribute as the dominant geometric form; drop the misread one',
      'cropped-subject': 'strengthen: complete radial emblem fully inside the frame with generous margins on every side, no cropped points or facets',
      'weak-composition': 'alternate layout: centered radial construction, complete and symmetrical, balanced negative space',
      anatomy: 'append: coherent anatomy translated into clean geometric planes',
      'busy-background': 'strengthen: restrained geometric background, no landscape, no scene, no border',
      'off-style': 'prepend the style dna twice and append: strictly precise low-poly sacred geometry with a gold, indigo and stone palette',
    },
    notes: ['2026-11-13: radial sacred-geometry print language for premium art derivatives'],
  },
  realism: {
    dna: 'museum-grade cinematic realism, breathtakingly detailed, physically accurate anatomy and materials, natural skin, hair, metal and fabric texture, painterly photographic finish, dramatic volumetric light, rich cinematic colour grading, full subject fully contained with breathing room, tasteful dark museum backdrop only when it serves the subject, no text, no letters, no pseudo-script, no watermark, no border, no frame',
    mutationOperators: {
      'garbled-text': 'append: no text, no letters, no inscription, no watermark',
      'wrong-attributes': 'reorder: make the missed attribute physically prominent and unmistakable; drop the misread one',
      'cropped-subject': 'strengthen: complete full-length subject inside the frame with generous negative space on every side, no cropped anatomy, wings or attributes',
      'weak-composition': 'alternate layout: cinematic full-subject portrait, complete and fully contained, balanced negative space',
      anatomy: 'append: physically accurate anatomy, hands, faces and material behaviour',
      'busy-background': 'strengthen: restrained dark museum backdrop, no landscape clutter, no scene details competing with the subject',
      'off-style': 'prepend the style dna twice and append: strictly cinematic realism, no illustration or cartoon styling',
    },
    notes: ['2026-11-13: museum-grade realism lane for premium Commons and print derivatives'],
  },
  masterpiece: {
    dna: 'elite collector-grade digital masterpiece, hyper-detailed cinematic fantasy realism, intricate jewelry and material microtexture, dramatic volumetric lighting, museum-quality composition, rich layered colour depth, awe-inspiring presence, full subject fully contained with elegant negative space, no text, no letters, no pseudo-script, no watermark, no border, no frame',
    mutationOperators: {
      'garbled-text': 'append: no text, no letters, no inscription, no watermark',
      'wrong-attributes': 'reorder: make the missed attribute an unmistakable hero detail; drop the misread one',
      'cropped-subject': 'strengthen: complete monumental subject fully inside the frame with elegant negative space on every side',
      'weak-composition': 'alternate layout: single monumental hero subject, complete and fully contained, cinematic balance',
      anatomy: 'append: masterful anatomy, hands, faces, eyes and material microtexture',
      'busy-background': 'strengthen: elegant atmospheric depth without clutter, no competing scene elements',
      'off-style': 'prepend the style dna twice and append: strictly collector-grade cinematic realism, no illustration styling',
    },
    notes: ['2026-11-13: reserved premium lane for curated high-detail PNG-worthy masterpieces'],
  },
};

for (const [family, definition] of Object.entries(familyDefinitions)) {
  lib.families[family] = {
    ...lib.families[family],
    dna: definition.dna,
    mutationOperators: definition.mutationOperators,
    notes: [...new Set([...(lib.families[family]?.notes || []), ...definition.notes])],
  };
}

writeFileWithRetry(LIB_PATH, `${JSON.stringify(lib, null, 2)}\n`);
console.log(`AI art library: ${added} flagship deities added; ${Object.keys(lib.deities).length} total; ${Object.keys(lib.traditions).length} traditions.`);
