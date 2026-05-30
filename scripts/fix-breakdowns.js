const fs = require('fs');
const { generateBreakdown } = require('./generate-entries');

const FIXES = [
  { id: 'diancecht', ascii: 'diancecht', unicode: 'DiánCécht', pantheon: 'celtic' },
  { id: 'hiiaka', ascii: 'hiiaka', unicode: 'Hiiaka', pantheon: 'polynesian' },
  { id: 'babayaga', ascii: 'babayaga', unicode: 'BabaJagá', pantheon: 'slavic' },
  { id: 'zmeygorynych', ascii: 'zmeygorynych', unicode: 'ZméjGorynýč', pantheon: 'slavic' },
  { id: 'spentamainyu', ascii: 'spentamainyu', unicode: 'SpəntaMainyu', pantheon: 'zoroastrian' },
  { id: 'vohumanah', ascii: 'vohumanah', unicode: 'VohuManah', pantheon: 'zoroastrian' },
  { id: 'ashavahishta', ascii: 'ashavahishta', unicode: 'AšaVahišta', pantheon: 'zoroastrian' },
  { id: 'khshathravairya', ascii: 'khshathravairya', unicode: 'XšaθraVairya', pantheon: 'zoroastrian' },
  { id: 'spentaarmaiti', ascii: 'spentaarmaiti', unicode: 'SpəntaĀrmaiti', pantheon: 'zoroastrian' },
];

let content = fs.readFileSync('type/js/lexicon.js', 'utf8');

for (const fix of FIXES) {
  const bd = generateBreakdown(fix.ascii, fix.unicode, fix.pantheon);
  const bdJson = bd.map(b => `      { char: '${b.char}', to: '${b.to}', type: '${b.type}', note: '${b.note.replace(/'/g, "\\'")}' }`).join(',\n');
  
  // Find the entry by id
  const idMarker = `id: '${fix.id}',`;
  const idIdx = content.indexOf(idMarker);
  if (idIdx === -1) {
    console.log(`SKIP: ${fix.id} not found`);
    continue;
  }
  
  // Find breakdown start and end within this entry
  const bdStart = content.indexOf('breakdown: [', idIdx);
  const bdEnd = content.indexOf('\n  }', bdStart);
  if (bdStart === -1 || bdEnd === -1) {
    console.log(`SKIP: ${fix.id} breakdown not found`);
    continue;
  }
  
  const oldBlock = content.substring(bdStart, bdEnd);
  const newBlock = `breakdown: [\n${bdJson}`;
  
  content = content.replace(oldBlock, newBlock);
  console.log(`Fixed ${fix.id}`);
}

fs.writeFileSync('type/js/lexicon.js', content);
console.log('Done');
