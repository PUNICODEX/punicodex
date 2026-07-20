/**
 * Applies manifest-3rd.js: 9 new lexicon entries, unicode fixes
 * (orpheus→Orpheús, hanuman→Hanumān+tier), and copies the 15 asset sets
 * into sites/{id}/assets/ with id-based names.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const MAT = path.join(
  ROOT,
  'extended flagship materials',
  'new domains 20-07-26',
  'Kimi_Agent_Srevol Domain Value Analysis (1)',
  'Kimi_Agent_Srevol Domain Value Analysis (1)',
  'punycodex'
);
const manifest = require(path.join(__dirname, 'manifest-3rd.js'));

// ── 1. Lexicon: append new entries ──
const LEX = path.join(ROOT, 'type', 'js', 'lexicon.js');
let lex = fs.readFileSync(LEX, 'utf8');

function entryBlock(e) {
  const sources = e.sources.map((s) => `"${s}"`).join(', ');
  return `  {
    "id": "${e.id}",
    "ascii": "${e.ascii}",
    "unicode": "${e.unicode}",
    "greek": "${e.greek}",
    "pantheon": "${e.pantheon}",
    "tier": "${e.tier}",
    "tierLabel": "${e.tierLabel}",
    "domain": "${e.domain}",
    "meaning": ${JSON.stringify(e.meaning)},
    "sources": [${sources}],
    "domainUnicode": "${e.domainUnicode}",
    "domainPunycode": "${e.domainPunycode}",
    "hasAdSite": true
  }`;
}

const newBlocks = [];
for (const e of manifest) {
  if (lex.includes(`"id": "${e.id}"`)) continue;
  newBlocks.push(entryBlock(e));
}

if (newBlocks.length) {
  const tail = lex.lastIndexOf(']');
  const lastEntryEnd = lex.lastIndexOf('}', tail);
  lex = `${lex.slice(0, lastEntryEnd + 1)},\n${newBlocks.join(',\n')}\n${lex.slice(tail)}`;
}

// ── 2. Unicode/tier fixes for existing entries ──
function patchEntry(id, fn) {
  const i = lex.indexOf(`"id": "${id}"`);
  if (i === -1) throw new Error(`missing ${id}`);
  const end = lex.indexOf('\n  },', i);
  let block = lex.slice(i, end);
  block = fn(block);
  lex = lex.slice(0, i) + block + lex.slice(end);
}

patchEntry('orpheus', (b) => b.replace('"unicode": "Orpheus"', '"unicode": "Orpheús"'));
patchEntry('hanuman', (b) =>
  b.replace('"unicode": "Hanumat"', '"unicode": "Hanumān"').replace('"tier": "2"', '"tier": "1"').replace('"tierLabel": "Tier 2"', '"tierLabel": "Tier 1"')
);

fs.writeFileSync(LEX, lex, 'utf8');
console.log(`lexicon: ${newBlocks.length} new entries + orpheus/hanuman fixes`);

// ── 3. Assets ──
const FOLDER_MAP = {
  guandi: 'Guandi', ganga: 'Ganga', hanuman: 'Hanuman', yamuna: 'Yamuna', gauri: 'Gauri',
  sani: 'Sani', orun: 'Orun', xiuhtecuhtli: 'Xiuhtecuhtli', pluto: 'Pluto', ceres: 'Ceres',
  orpheus: 'Orpheus', mixcoatl: 'Mixcoatl', oba: 'Oba', mazu: 'Mazu', kartikeya: 'Karttikeya',
};
const ALL_IDS = Object.keys(FOLDER_MAP);
for (const id of ALL_IDS) {
  const dir = path.join(ROOT, 'sites', id, 'assets');
  fs.mkdirSync(dir, { recursive: true });
  const src = path.join(MAT, FOLDER_MAP[id]);
  for (const kind of ['mascot', 'logomark', 'logolockup']) {
    // folder file name: {foldername_lower}_{kind}.png, except kartikeya uses 'karttikeya'
    const base = FOLDER_MAP[id].toLowerCase();
    const file = path.join(src, `${base}_${kind}.png`);
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(dir, `${id}_${kind}.png`));
    } else {
      console.error(`MISSING: ${file}`);
    }
  }
}
console.log(`assets copied for ${ALL_IDS.length} ids`);
