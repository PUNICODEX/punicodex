const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../platform/db/init.js');
let src = fs.readFileSync(file, 'utf8');

const re = /const flagshipIds = new Set\(\[([\s\S]*?)\]\);/;
const match = src.match(re);
if (!match) {
  console.error('Could not find flagshipIds');
  process.exit(1);
}

const ids = match[1]
  .split('\n')
  .map(l => l.trim().replace(/['",]/g, ''))
  .filter(Boolean);

const newIds = [
  'aseratu', 'ashur', 'erebus', 'leviathan', 'mot', 'quetzalcoatl', 'shamash',
  'njord', 'ankh', 'isis', 'sekhmet', 'bastet', 'wadjet', 'nht',
  'moses', 'david', 'solomon', 'noah', 'cain', 'abel',
  'hercules', 'hemera', 'long', 'taichi', 'yinyang', 'wuji', 'bagua', 'wuxing'
];
for (const id of newIds) {
  if (!ids.includes(id)) ids.push(id);
}
ids.sort();

const formatted = ids.map(id => `  '${id}',`).join('\n');
src = src.replace(re, `const flagshipIds = new Set([\n${formatted}\n]);`);
fs.writeFileSync(file, src, 'utf8');
console.log(`Updated flagshipIds with ${ids.length} entries`);
