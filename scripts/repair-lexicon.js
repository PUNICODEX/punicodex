const fs = require('fs');
const path = require('path');

const LEXICON_PATH = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');
const content = fs.readFileSync(LEXICON_PATH, 'utf8');
const lines = content.split('\n');

// Find the line with the corruption pattern: breakdown element followed by entry start
let corruptIdx = -1;
for (let i = 0; i < lines.length - 1; i++) {
  if (lines[i].trim().startsWith("{ char:") && lines[i].includes('},,')) {
    corruptIdx = i;
    break;
  }
}

if (corruptIdx === -1) {
  console.log('No corruption pattern found.');
  process.exit(0);
}

console.log('Found corruption at line', corruptIdx + 1);

// The corruption point is inside phlegethon's breakdown.
// We need to find where the "real" phlegethon entry starts and rebuild it.
// Let's find the phlegethon entry header that precedes the corruption.
let entryStart = -1;
for (let i = corruptIdx; i >= 0; i--) {
  if (lines[i].includes("id: 'phlegethon'")) {
    entryStart = i;
    break;
  }
}

if (entryStart === -1) {
  console.log('Could not find phlegethon entry start.');
  process.exit(1);
}

console.log('Phlegethon entry starts at line', entryStart + 1);

// Rebuild the file: everything before entryStart, then proper phlegethon entry, then close
const before = lines.slice(0, entryStart).join('\n');

const phlegethonEntry = `  {
    id: 'phlegethon',
    ascii: 'phlegethon',
    unicode: 'Phlégethōn',
    greek: 'Φλέγεθων',
    pantheon: 'greek',
    tier: '1',
    tierLabel: 'Tier 1',
    domain: 'River of Fire',
    meaning: 'Flaming',
    sources: ['Plato', 'LSJ'],
    breakdown: [
      { char: 'p', to: 'P', type: 'same', note: 'P uppercase' },
      { char: 'h', to: 'h', type: 'same', note: 'h same' },
      { char: 'l', to: 'l', type: 'same', note: 'l same' },
      { char: 'e', to: 'é', type: 'stress', note: 'Acute on e' },
      { char: 'g', to: 'g', type: 'same', note: 'g same' },
      { char: 'e', to: 'e', type: 'same', note: 'e same' },
      { char: 't', to: 't', type: 'same', note: 't same' },
      { char: 'h', to: 'h', type: 'same', note: 'h same' },
      { char: 'o', to: 'ō', type: 'length', note: 'Macron: long vowel' },
      { char: 'n', to: 'n', type: 'same', note: 'n same' }
    ]
  }
];

// Node.js export for build scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LEXICON };
}`;

const fixed = before + '\n' + phlegethonEntry;
fs.writeFileSync(LEXICON_PATH, fixed);
console.log('Repaired lexicon file.');

// Validate
const wrapped = fixed + '\nmodule.exports = LEXICON;';
const tempPath = path.join(__dirname, '_temp_lex.js');
fs.writeFileSync(tempPath, wrapped);
try {
  const lex = require(tempPath);
  console.log('Entries after repair:', lex.length);
} catch (e) {
  console.error('Parse error:', e.message);
} finally {
  fs.unlinkSync(tempPath);
}
