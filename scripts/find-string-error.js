const fs = require('fs');
const c = fs.readFileSync('type/js/lexicon.js', 'utf8');
const lines = c.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let inString = false;
  let stringChar = '';
  let quoteCount = 0;
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (!inString && (ch === "'" || ch === '"')) {
      inString = true;
      stringChar = ch;
      quoteCount++;
    } else if (inString && ch === stringChar && line[j - 1] !== '\\') {
      inString = false;
    }
  }
  if (inString) {
    console.log('UNCLOSED STRING at line', i + 1, ':', line.substring(0, 120));
  }
}
console.log('Done checking strings.');
