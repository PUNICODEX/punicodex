const fs = require('fs');
const path = require('path');

// 1. Fix Cain ascii and breakdown
const lexFile = path.join(__dirname, '../type/js/lexicon.js');
const lexicon = require(lexFile).LEXICON;

const cain = lexicon.find(e => e.id === 'cain');
if (cain) {
  cain.ascii = 'qayin';
  cain.breakdown = [
    { char: 'q', to: 'Q', type: 'same', note: 'Same, capitalized' },
    { char: 'a', to: 'ā', type: 'length', note: 'Macron: long vowel' },
    { char: 'y', to: 'y', type: 'same', note: 'Same' },
    { char: 'i', to: 'ī', type: 'length', note: 'Macron: long vowel' },
    { char: 'n', to: 'n', type: 'same', note: 'Same' }
  ];
  console.log('Fixed cain entry');
}

const body = JSON.stringify(lexicon, null, 2);
const out = `/*\n * PUNICODEX Lexicon\n * ${lexicon.length} validated entries across multiple pantheons\n */\n\nconst LEXICON = ${body};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = { LEXICON };\n}\n`;
fs.writeFileSync(lexFile, out.replace(/\r\n/g, '\n'), 'utf8');

// 2. Fix yinyang archetype name
const archFile = path.join(__dirname, '../js/archetypes-v2.js');
let src = fs.readFileSync(archFile, 'utf8');
src = src.replace(
  /(id:\s*['"]yinyang['"][\s\S]*?name:\s*['"])Yīn-yáng(['"])/,
  '$1Yīnyáng$2'
);
fs.writeFileSync(archFile, src, 'utf8');
console.log('Fixed yinyang archetype name');
