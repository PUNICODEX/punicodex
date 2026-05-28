const fs = require('fs');

let content = fs.readFileSync('type/js/lexicon.js', 'utf8');

// Fix unicode field: Zeus -> Zeús
content = content.replace(
    /id: "zeus", ascii: "zeus", unicode: "Zeus"/,
    'id: "zeus", ascii: "zeus", unicode: "Zeús"'
);

// Fix breakdown: u -> u (same) becomes u -> ú (stress)
// The Zeus entry is the 3rd entry in the lexicon
const zeusPattern = /(\{ id: "zeus"[\s\S]*?breakdown: \[[\s\S]*?)\{ char: "u", to: "u", type: "same", note: "Upsilon" \}([\s\S]*?\])/;
content = content.replace(zeusPattern, '$1{ char: "u", to: "ú", type: "stress", note: "Acute on upsilon" }$2');

fs.writeFileSync('type/js/lexicon.js', content, 'utf8');

// Verify
const { LEXICON } = require('../type/js/lexicon.js');
const zeus = LEXICON.find(e => e.id === 'zeus');
console.log('Zeus unicode:', zeus.unicode);
console.log('Zeus breakdown:');
zeus.breakdown.forEach(b => console.log(' ', b.char, '->', b.to, '|', b.type, '|', b.note));
