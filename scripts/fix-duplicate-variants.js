const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const lexiconPath = path.join(ROOT, 'type', 'js', 'lexicon.js');

const IDS = [
  'tian','mictlantecutli','itzpapalotl','ourania','oya','tlaloc','python',
  'thanatos','jizo','kanaloa','leto','koios','vali','sati','sphinx','mnemosyne'
];

const content = fs.readFileSync(lexiconPath, 'utf8');
const startMarker = 'const LEXICON = ';
const start = content.indexOf(startMarker);
if (start === -1) throw new Error('Could not find LEXICON start');
const arrayStart = start + startMarker.length;
const arrayEnd = content.lastIndexOf('];');
if (arrayEnd === -1) throw new Error('Could not find LEXICON end');

const arrayText = content.substring(arrayStart, arrayEnd + 2);
const LEXICON = new Function('return ' + arrayText)();
let changed = false;

for (const entry of LEXICON) {
  if (!IDS.includes(entry.id)) continue;
  if (!Array.isArray(entry.variants)) continue;
  const parent = entry.unicode;
  const original = entry.variants;
  const filtered = original.filter((v) => v.unicode !== parent);
  if (filtered.length !== original.length) {
    entry.variants = filtered;
    changed = true;
    console.log(`${entry.id}: removed ${original.length - filtered.length} duplicate variant(s)`);
  }
}

if (!changed) {
  console.log('No duplicate variants found.');
  process.exit(0);
}

const newJson = JSON.stringify(LEXICON, null, 2);
const newContent = content.substring(0, arrayStart) + newJson + content.substring(arrayEnd + 2);
fs.writeFileSync(lexiconPath, newContent, 'utf8');
console.log('Wrote updated lexicon.js');
