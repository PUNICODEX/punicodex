#!/usr/bin/env node
/**
 * PuniCodex — extend the AI-art prompt library to the next demand ring.
 *
 *   node scripts/extend-ai-art-library.js --count 40
 *
 * Registers unregistered temple-demand ids as library deities so
 * generate-ai-art.js can produce for them. Demand ordering: throne tier
 * asc, then throneCents desc — the sponsorship market's own valuation.
 * Traditions missing from the library gain a styleDna in the evolved
 * house register (gold on void, explicit negative constraints — the
 * garbled-text/stone-slab failure classes taught the generator to forbid
 * inscriptions, glyphs, and borders outright).
 *
 * Idempotent: already-registered ids and traditions are left untouched.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const LIB_PATH = path.join(ROOT, 'data', 'ai-art', 'prompt-library.json');
const DEMAND_PATH = path.join(ROOT, 'data', 'ai-art', 'temple-demand.json');

const countIdx = process.argv.indexOf('--count');
const COUNT = countIdx !== -1 ? Number(process.argv[countIdx + 1]) : 40;

const lib = JSON.parse(fs.readFileSync(LIB_PATH, 'utf8'));
const demand = JSON.parse(fs.readFileSync(DEMAND_PATH, 'utf8'));

// pantheon → tradition key; pantheons sharing a visual register collapse.
const PANTHEON_TRADITION = {
  greek: 'greek',
  'greek-location': 'greek',
  roman: 'roman',
  norse: 'norse',
  egyptian: 'egyptian',
  japanese: 'japanese',
  buddhist: 'buddhist',
  taoist: 'taoist',
  chinese: 'chinese',
  mesopotamian: 'mesopotamian',
  canaanite: 'canaanite',
  phoenician: 'phoenician',
  hittite: 'hittite',
  zoroastrian: 'zoroastrian',
  sanskrit: 'sanskrit',
  korean: 'korean',
  celtic: 'celtic',
  slavic: 'slavic',
  baltic: 'baltic',
  yoruba: 'yoruba',
  nahuatl: 'nahuatl',
  incan: 'incan',
  mapuche: 'incan',
  aboriginal: 'aboriginal',
  polynesian: 'polynesian',
};

// House register: gold on pure black, engraved line, and the negative
// constraints the failure log earned (no text/glyphs/borders/stone).
const TRADITION_DNA = {
  canaanite:
    'ancient Canaanite gold repoussé figure on pure black background, Levantine bronze-age iconography, crisp engraved line detail, no inscriptions, no border',
  phoenician:
    'Phoenician gold figure on pure black background, Levantine ivory-carving elegance, Egyptianizing profile, crisp clean edges, no inscriptions, no border',
  hittite:
    'Hittite gold relief figure on pure black background, Anatolian bronze-age iconography, regal pointed-hat profile, crisp clean edges, no hieroglyphs, no border',
  zoroastrian:
    'ancient Persian gold relief figure on pure black background, Achaemenid profile elegance, winged sun-disc accents, crisp clean edges, no inscriptions, no cuneiform, no border',
  sanskrit:
    'Indian gold line art on pure black background, Pahari miniature elegance, intricate jewelry detail, serene figure, crisp clean edges, no text, no script',
  korean:
    'Korean gold line art on pure black background, Joseon-era folk-painting elegance, refined flowing drapery, no text, no hanja, no seal',
  chinese:
    'Chinese gold line art on pure black background, Dunhuang mural elegance, cloud-scroll motifs, flowing celestial ribbons, no characters, no seal script',
  taoist:
    'Chinese Taoist gold line art on pure black background, bagua halo geometry, celestial robe with flowing ribbons, no characters, no trigram text',
  celtic:
    'Celtic La Tène gold knotwork on pure black background, interlaced spiral animal ornament, crisp clean edges, no border',
  slavic:
    'Slavic gold line art on pure black background, medieval manuscript illumination elegance, interlaced knotwork, solar wheel motifs, no text',
  baltic:
    'Baltic gold line art on pure black background, Latvian folk-ornament elegance, solar wheel and woven-band motifs, no text',
  yoruba:
    'Yoruba brass-cast figure in engraved gold line on pure black background, West African bronze sculpture elegance, beaded crown regalia, crisp clean edges, no text',
  nahuatl:
    'Aztec gold figure on pure black background, Mixtec gold-leaf manuscript elegance, featherwork regalia, crisp clean edges, no glyphs, no calendar symbols',
  incan:
    'Incan gold figure on pure black background, Andean metalwork elegance, geometric textile patterns, crisp clean edges, no glyphs',
  aboriginal:
    'Australian Aboriginal Dreaming motif in metallic gold on pure black background, concentric circle and journey-line dot work, crisp clean edges, no text',
  polynesian:
    'Polynesian gold line art on pure black background, Maori kowhaiwhai spiral elegance, tiki figure stylization, crisp clean edges, no text',
};

const candidates = Object.keys(demand)
  .filter((id) => !lib.deities[id])
  .sort((a, b) => {
    const da = demand[a];
    const db = demand[b];
    if (da.tier !== db.tier) return da.tier - db.tier;
    return db.throneCents - da.throneCents;
  })
  .slice(0, COUNT);

let addedTraditions = 0;
let addedDeities = 0;
const skipped = [];

for (const id of candidates) {
  const d = demand[id];
  const tradition = PANTHEON_TRADITION[d.pantheon];
  if (!tradition) {
    skipped.push(`${id} (unmapped pantheon ${d.pantheon})`);
    continue;
  }
  if (!lib.traditions[tradition] && TRADITION_DNA[tradition]) {
    lib.traditions[tradition] = {
      styleDna: TRADITION_DNA[tradition],
      wins: 0,
      losses: 0,
      notes: ['bootstrap DNA — evolve via curation rejects'],
    };
    addedTraditions++;
  }
  if (!lib.traditions[tradition]) {
    skipped.push(`${id} (no DNA for ${tradition})`);
    continue;
  }
  lib.deities[id] = {
    tradition,
    attributes: String(d.domain || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 4),
    promptVersion: 1,
    wins: 0,
    losses: 0,
    activeMutations: [],
    demandTier: d.tier,
  };
  addedDeities++;
}

fs.writeFileSync(LIB_PATH, JSON.stringify(lib, null, 2) + '\n');
console.log(
  `registered: ${addedDeities} deities | traditions added: ${addedTraditions} | library: ${Object.keys(lib.deities).length} deities`
);
if (skipped.length) console.log('skipped:', skipped.join('; '));
