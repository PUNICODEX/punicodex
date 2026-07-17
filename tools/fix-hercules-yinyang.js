const fs = require('fs');
const path = require('path');
const url = require('url');
const {
  loadLexicon,
  loadArchetypes,
  saveArchetypes,
  upsertArchetype,
} = require('../scripts/flywheel-utils');

// 1. Fix lexicon
const lexFile = path.join(__dirname, '../type/js/lexicon.js');
const lexicon = require(lexFile).LEXICON;

const hIdx = lexicon.findIndex(e => e.id === 'hercules');
if (hIdx >= 0) {
  lexicon.splice(hIdx, 1);
  console.log('Removed hercules lexicon entry');
}

const yy = lexicon.find(e => e.id === 'yinyang');
if (yy) {
  yy.unicode = 'Yīnyáng';
  yy.ascii = 'yinyang';
  yy.breakdown = [
    { char: 'y', to: 'Y', type: 'same', note: 'Same, capitalized' },
    { char: 'i', to: 'ī', type: 'length', note: 'Macron: level tone' },
    { char: 'n', to: 'n', type: 'same', note: 'Same' },
    { char: 'y', to: 'y', type: 'same', note: 'Same' },
    { char: 'a', to: 'á', type: 'stress', note: 'Second tone' },
    { char: 'n', to: 'n', type: 'same', note: 'Same' },
    { char: 'g', to: 'g', type: 'same', note: 'Same' }
  ];
  console.log('Fixed yinyang entry');
}

const body = JSON.stringify(lexicon, null, 2);
const out = `/*\n * PUNICODEX Lexicon\n * ${lexicon.length} validated entries across multiple pantheons\n */\n\nconst LEXICON = ${body};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = { LEXICON };\n}\n`;
fs.writeFileSync(lexFile, out.replace(/\r\n/g, '\n'), 'utf8');

// 2. Fix archetypes: remove hercules, add herakles
let { src } = loadArchetypes();

// Remove hercules block
src = src.replace(/,\s*\{\s*id:\s*['"]hercules['"][\s\S]*?darkPunchline:\s*false\s*\}/, '');
console.log('Removed hercules archetype block');

const heraklesEntry = lexicon.find(e => e.id === 'herakles');
if (heraklesEntry) {
  const domainUnicode = 'hēraklēs.com';
  src = upsertArchetype(src, {
    id: 'herakles',
    name: heraklesEntry.unicode,
    greek: heraklesEntry.greek || '—',
    domain: heraklesEntry.domain || 'greek deity',
    tagline: heraklesEntry.meaning ? `${heraklesEntry.domain} · ${heraklesEntry.meaning}` : heraklesEntry.domain,
    tier: heraklesEntry.tier === 'dual' ? 'dual-tier' : heraklesEntry.tier === '1' ? 'tier-1' : 'tier-2',
    tierDetail: heraklesEntry.tier === 'dual' ? 'dual-tier' : 'single-tier',
    pantheon: heraklesEntry.pantheon,
    folder: 'herakles',
    domainUnicode,
    domainPunycode: url.domainToASCII(domainUnicode),
    domainAlt: [],
    colors: { primary: '#D4AF37', secondary: '#4169E1', glow: 'rgba(212,175,55,0.3)' },
    mascotPath: '/sites/herakles/assets/herakles_mascot.png',
    mascotFallback: '/sites/herakles/assets/herakles_mascot.png',
    logomarkPath: '/sites/herakles/assets/herakles_logomark.png',
    built: false,
    hasAdSite: false,
    darkPunchline: false,
  });
  console.log('Added herakles archetype');
}

saveArchetypes(src);

// 3. Update flagshipIds
const initFile = path.join(__dirname, '../platform/db/init.js');
let initSrc = fs.readFileSync(initFile, 'utf8');
const re = /const flagshipIds = new Set\(\[([\s\S]*?)\]\);/;
const match = initSrc.match(re);
const ids = match[1]
  .split('\n')
  .map(l => l.trim().replace(/['",]/g, ''))
  .filter(Boolean)
  .filter(id => id !== 'hercules');
if (!ids.includes('herakles')) ids.push('herakles');
ids.sort();
const formatted = ids.map(id => `  '${id}',`).join('\n');
initSrc = initSrc.replace(re, `const flagshipIds = new Set([\n${formatted}\n]);`);
fs.writeFileSync(initFile, initSrc, 'utf8');
console.log('Updated flagshipIds');

// 4. Fix engine test counts
const testFile = path.join(__dirname, '../type/js/test-engine.js');
let testSrc = fs.readFileSync(testFile, 'utf8');
testSrc = testSrc.replace(/assert\.strictEqual\(counts\.greek,\s*\d+,\s*'Greek count'\);/, "assert.strictEqual(counts.greek, 252, 'Greek count');");
testSrc = testSrc.replace(/assert\.strictEqual\(counts\.taoist,\s*\d+,\s*'Taoist count'\);/, "assert.strictEqual(counts.taoist, 12, 'Taoist count');");
fs.writeFileSync(testFile, testSrc, 'utf8');
console.log('Updated engine test counts');
