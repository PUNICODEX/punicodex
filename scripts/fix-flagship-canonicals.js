/**
 * PUNYCODEX — Fix stale canonical/OG URLs on flagship home pages
 *
 * Many flagships were generated with canonical URLs like
 * https://punycodex.com/{id}/ instead of https://punycodex.com/sites/{id}/
 * This script updates those self-references in all built flagships.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const archetypesPath = path.join(root, 'js', 'archetypes-v2.js');

const archetypesContent = fs.readFileSync(archetypesPath, 'utf8');
const builtIds = new Set();
const idRegex = /id:\s*"([^"]+)"/g;
let match;
while ((match = idRegex.exec(archetypesContent)) !== null) {
  const id = match[1];
  const after = archetypesContent.slice(match.index, match.index + 800);
  if (after.includes('built: true')) {
    builtIds.add(id);
  }
}

let updated = 0;
let unchanged = 0;

for (const id of builtIds) {
  const filePath = path.join(root, 'sites', id, 'index.html');
  if (!fs.existsSync(filePath)) {
    console.log(`  skipping ${id}: no index.html`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const oldUrl = `https://punycodex.com/${id}/`;
  const newUrl = `https://punycodex.com/sites/${id}/`;

  if (!content.includes(oldUrl)) {
    unchanged++;
    continue;
  }

  content = content.split(oldUrl).join(newUrl);
  fs.writeFileSync(filePath, content, 'utf8');
  updated++;
}

console.log(`Fixed stale canonical/OG URLs in ${updated} flagship home pages`);
console.log(`${unchanged} flagships already correct`);
