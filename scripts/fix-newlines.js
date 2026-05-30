const fs = require('fs');
const content = fs.readFileSync('type/js/lexicon.js', 'utf8');
// Fix literal \n characters that got embedded in a single line
const fixed = content.replace(/  },\\n  \{\\n    id: 'phlegethon',/g, "  },\n  {\n    id: 'phlegethon',");
fs.writeFileSync('type/js/lexicon.js', fixed);
console.log('Fixed newlines.');
