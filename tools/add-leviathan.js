const fs = require('fs');
const path = require('path');

const LEXICON_PATH = path.join(__dirname, '../type/js/lexicon.js');
const lexicon = require(LEXICON_PATH).LEXICON;

if (lexicon.find(e => e.id === 'leviathan')) {
  console.log('leviathan already exists');
  process.exit(0);
}

lexicon.push({
  id: 'leviathan',
  ascii: 'leviathan',
  unicode: 'Liwyāṯān',
  greek: '—',
  pantheon: 'canaanite',
  tier: '2',
  tierLabel: 'Tier 2',
  domain: 'Sea Serpent, Chaos',
  meaning: 'Coiled sea serpent',
  sources: ['Hebrew Bible', 'Ugaritic texts'],
  breakdown: [
    { char: 'l', to: 'L', type: 'same', note: 'Same, capitalized' },
    { char: 'e', to: 'i', type: 'special', note: 'Hebrew i vowel' },
    { char: 'v', to: 'w', type: 'special', note: 'Semivowel w' },
    { char: 'i', to: 'y', type: 'special', note: 'Semivowel y' },
    { char: 'a', to: 'ā', type: 'length', note: 'Macron: long vowel' },
    { char: 't', to: 'ṯ', type: 'special', note: 'T with line below: emphatic tav' },
    { char: 'h', to: '', type: 'drop', note: 'Dropped: silent in Hebrew' },
    { char: 'a', to: 'ā', type: 'length', note: 'Macron: long vowel' },
    { char: 'n', to: 'n', type: 'same', note: 'Same' }
  ]
});

const body = JSON.stringify(lexicon, null, 2);
const out = `/*\n * PUNYCODEX Lexicon\n * ${lexicon.length} validated entries across multiple pantheons\n */\n\nconst LEXICON = ${body};\n`;
fs.writeFileSync(LEXICON_PATH, out.replace(/\r\n/g, '\n'), 'utf8');
console.log(`Added leviathan entry. Total entries: ${lexicon.length}`);
