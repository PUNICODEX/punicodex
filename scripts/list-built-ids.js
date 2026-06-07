const fs = require('fs');
const content = fs.readFileSync('./js/archetypes-v2.js', 'utf8');
const ids = [];
const regex = /id:\s*"([^"]+)"/g;
let match;
while ((match = regex.exec(content)) !== null) {
  const idx = content.lastIndexOf('built:', match.index);
  const builtLine = content.substring(idx, idx + 20);
  if (builtLine.includes('true')) {
    ids.push(match[1]);
  }
}
console.log(ids.sort().join('\n'));
