/**
 * PUNICODEX — Sync hasAdSite flags with built flagships
 *
 * Reads js/archetypes-v2.js to find all built flagships,
 * then ensures type/js/lexicon.js and js/archetypes-v2.js
 * have hasAdSite: true for every built flagship.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const archetypesPath = path.join(root, 'js', 'archetypes-v2.js');
const lexiconPath = path.join(root, 'type', 'js', 'lexicon.js');

const archetypesContent = fs.readFileSync(archetypesPath, 'utf8');

// Extract built flagship IDs from archetypes
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
console.log(`Found ${builtIds.size} built flagships`);

// Sync archetypes: add hasAdSite: true after built: true when the object lacks it
let newArchetypesContent = archetypesContent.replace(
  /built: true,\n(\s+darkPunchline:)/g,
  (fullMatch, darkPunchlineLine, offset, string) => {
    const before = string.slice(Math.max(0, offset - 600), offset);
    const after = string.slice(offset, offset + 200);
    if (before.includes('hasAdSite: true') || after.includes('hasAdSite: true')) {
      return fullMatch;
    }
    return `built: true,\n        hasAdSite: true,\n${darkPunchlineLine}`;
  }
);

// Sync lexicon: add hasAdSite: true after id for each built flagship when missing
let lexiconContent = fs.readFileSync(lexiconPath, 'utf8');
for (const id of builtIds) {
  const entryStartRegex = new RegExp(`id: '${id}',`);
  let replaced = false;
  lexiconContent = lexiconContent.replace(entryStartRegex, (match, offset) => {
    if (replaced) return match;
    const body = lexiconContent.slice(offset, offset + 500);
    if (body.includes('hasAdSite: true')) {
      return match;
    }
    replaced = true;
    return `${match}\n    hasAdSite: true,`;
  });
}

fs.writeFileSync(archetypesPath, newArchetypesContent);
fs.writeFileSync(lexiconPath, lexiconContent);

console.log(`Synced hasAdSite: true for ${builtIds.size} entries`);
