const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'type', 'js', 'lexicon.js'), 'utf8');

// Wrap the const declaration into an export
const wrapped = content + '\nmodule.exports = LEXICON;';
fs.writeFileSync('_temp_lexicon.js', wrapped);

const lex = require(path.join(__dirname, '..', '_temp_lexicon.js'));
console.log('Total entries:', lex.length);
console.log('Fields:', Object.keys(lex[0]));
console.log('Sample:', JSON.stringify(lex[0], null, 2));
console.log('Pantheons:', [...new Set(lex.map(x => x.pantheon))].sort());
console.log('Tiers:', [...new Set(lex.map(x => x.tier))].sort());

// Clean up
fs.unlinkSync('_temp_lexicon.js');
