/**
 * Merge expansion entries into the canonical lexicon.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { NEW_ENTRIES } = require('./lexicon-expansion-entries.js');

const LEXICON_PATH = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');

function main() {
  let content = fs.readFileSync(LEXICON_PATH, 'utf8');

  // Load existing lexicon to check duplicates and count
  const lexiconCode = content.replace('const LEXICON', 'var LEXICON');
  const lexiconFn = new Function(`${lexiconCode}; return LEXICON;`);
  const existing = lexiconFn();

  const existingIds = new Set(existing.map((e) => e.id));
  const existingUnicodes = new Set(existing.map((e) => e.unicode));

  const toAdd = NEW_ENTRIES.filter((e) => !existingIds.has(e.id) && !existingUnicodes.has(e.unicode));
  const skipped = NEW_ENTRIES.filter((e) => existingIds.has(e.id) || existingUnicodes.has(e.unicode));
  if (skipped.length > 0) {
    console.log('Skipping already-existing entries:');
    skipped.forEach((e) => console.log(`  - ${e.id} (${e.unicode})`));
  }

  if (toAdd.length === 0) {
    console.log('No new entries to add.');
    return;
  }

  // Serialize new entries with consistent indentation
  const newBlock = toAdd.map((entry) => {
    const json = JSON.stringify(entry, null, 2);
    return '  ' + json.replace(/\n/g, '\n  ');
  }).join(',\n');

  // Find the closing of the array: the last `}` before `];`
  const closingPattern = /(\n\s*\}\s*)\n\];/;
  const match = content.match(closingPattern);
  if (!match) {
    console.error('Could not find lexicon array closing pattern');
    process.exit(1);
  }

  const insertIndex = match.index + match[1].length;
  content = content.slice(0, insertIndex) + ',\n' + newBlock + content.slice(insertIndex);

  // Update header count
  const newCount = existing.length + toAdd.length;
  content = content.replace(
    /(\*\s*PUNICODEX Lexicon\s*\n\s*\*\s*)\d+\s+validated entries/,
    `$1${newCount} validated entries`
  );

  fs.writeFileSync(LEXICON_PATH, content, 'utf8');
  console.log(`Merged ${toAdd.length} new entries. Total lexicon size: ${newCount}`);
}

main();
