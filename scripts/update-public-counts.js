const fs = require('fs');
const path = require('path');

const files = [
  'index.html',
  'about/index.html',
  'pantheon/index.html',
  'lexicon/index.html',
  'codex/building-the-temple/index.html',
  'codex/index.html',
  'extension/popup/popup.html',
  'extension/options/options.html',
  'type/test.html',
];

const replacements = [
  [/894 temples/g, '895 temples'],
  [/894 names/g, '895 names'],
  [/894 entries/g, '895 entries'],
  [/894 scholarly/g, '895 scholarly'],
  [/173 archetypes/g, '196 archetypes'],
  [/173 world archetypes/g, '196 world archetypes'],
  [/173 flagship/g, '196 flagship'],
  [/173 hand-crafted/g, '196 hand-crafted'],
  [/hand-crafting 173/g, 'hand-crafting 196'],
  [/\$4,911/g, '$4,120'],
  [/891 names/g, '895 names'],
];

for (const rel of files) {
  const filePath = path.join(__dirname, '..', rel);
  if (!fs.existsSync(filePath)) {
    console.log(`Skip missing: ${rel}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [regex, replacement] of replacements) {
    if (regex.test(content)) {
      content = content.replace(regex, replacement);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${rel}`);
  } else {
    console.log(`No changes in ${rel}`);
  }
}
