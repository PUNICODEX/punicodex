const fs = require('fs');
const content = fs.readFileSync('type/js/lexicon.js', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes("domain: '") || line.includes("meaning: '") || line.includes("note: '")) {
    const match = line.match(/^\s+(domain|meaning|note):\s+'(.*)'/);
    if (match) {
      const inner = match[2];
      if (inner.includes("'") && !inner.includes("\\'")) {
        console.log('Line ' + (i+1) + ' UNESCAPED: ' + line.trim());
      }
    }
  }
}
