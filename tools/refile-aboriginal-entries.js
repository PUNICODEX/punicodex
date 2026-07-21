/**
 * One-off: re-file 9 Australian Aboriginal entries misfiled under `yoruba`
 * into the `aboriginal` pantheon. Assertion-based: exactly one pantheon flip
 * per id, each entry must be tagged yoruba before the flip.
 */
const fs = require('node:fs');
const path = require('node:path');

const LEXICON = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');
const IDS = [
  'baiame',
  'daramulum',
  'altjira',
  'ngalyod',
  'wandjina',
  'wawalag',
  'yurlungur',
  'tjinimin',
  'mamaragan',
];

let text = fs.readFileSync(LEXICON, 'utf8');
let total = 0;
for (const id of IDS) {
  const idAnchor = `"id": "${id}",`;
  const idx = text.indexOf(idAnchor);
  if (idx === -1) throw new Error(`id not found: ${id}`);
  // Entry fields follow the id within a small window; the pantheon line of THIS
  // entry is the first one after the id anchor.
  const windowStart = idx + idAnchor.length;
  const windowText = text.slice(windowStart, windowStart + 600);
  const match = windowText.match(/"pantheon": "yoruba"/);
  if (!match) throw new Error(`entry ${id} is not tagged yoruba (or window too small)`);
  text = `${text.slice(0, windowStart + match.index)}"pantheon": "aboriginal"${text.slice(
    windowStart + match.index + '"pantheon": "yoruba"'.length
  )}`;
  total += 1;
}
if (total !== IDS.length) throw new Error(`expected ${IDS.length} flips, did ${total}`);
fs.writeFileSync(LEXICON, text);
console.log(`re-filed ${total} entries yoruba -> aboriginal`);

// Verify with the parsed module.
delete require.cache[require.resolve(LEXICON)];
const lex = require(LEXICON);
const entries = Array.isArray(lex) ? lex : lex.entries || Object.values(lex)[0];
const counts = {};
for (const e of entries) counts[e.pantheon] = (counts[e.pantheon] || 0) + 1;
console.log('yoruba:', counts.yoruba, 'aboriginal:', counts.aboriginal);
for (const id of IDS) {
  const e = entries.find((x) => x.id === id);
  if (!e || e.pantheon !== 'aboriginal') throw new Error(`verify failed for ${id}`);
}
console.log('verified: all 9 entries now aboriginal');
