const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../type/js/lexicon.js');
const lexicon = require(file).LEXICON;

for (const entry of lexicon) {
  if (['moses','david','solomon','noah','cain','abel'].includes(entry.id)) {
    entry.pantheon = 'canaanite';
  }
  if (entry.id === 'yinyang') {
    entry.ascii = 'yin-yang';
  }
}

const body = JSON.stringify(lexicon, null, 2);
const out = `/*\n * PUNICODEX Lexicon\n * ${lexicon.length} validated entries across multiple pantheons\n */\n\nconst LEXICON = ${body};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = { LEXICON };\n}\n`;
fs.writeFileSync(file, out.replace(/\r\n/g, '\n'), 'utf8');
console.log('Fixed pantheons and yinyang ascii');
