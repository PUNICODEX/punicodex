/**
 * PUNICODEX — Apply authoritative meaning batch as senses
 *
 * Reads a merged batch of meaning suggestions and patches type/js/lexicon.js
 * so that:
 *   - entry.meaning becomes the new descriptive/encyclopedic gloss
 *   - the previous meaning is preserved as a sense of type 'etymology'
 *
 * This keeps both meanings instead of overwriting.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const LEXICON_PATH = process.argv[3] || path.join(__dirname, '..', 'type', 'js', 'lexicon.js');
const BATCH_PATH = process.argv[2] || path.join(__dirname, '..', 'data', 'authoritative', 'staging', 'merged', '2026-06-26-multi-v4.json');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function jsString(str) {
  return "'" + str.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

function unescapeStringLiteral(literal) {
  const quote = literal[0];
  const raw = literal.slice(1, -1);
  if (quote === "'") {
    return raw.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  }
  return raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function findEntryBlock(text, id) {
  const startRe = new RegExp(`\\r?\\n  \\{\\r?\\n    id: ['"]${escapeRegex(id)}['"],`);
  const startMatch = startRe.exec(text);
  if (!startMatch) {
    return null;
  }
  const start = startMatch.index;
  const endRe = /\r?\n  \},\r?\n/g;
  endRe.lastIndex = start + startMatch[0].length;
  const endMatch = endRe.exec(text);
  if (!endMatch) {
    return null;
  }
  return { start, end: endMatch.index + endMatch[0].length };
}

function buildPatchedBlock(block, oldMeaning, newMeaning) {
  const meaningRe = /\r?\n    meaning: ('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"),/;
  const m = meaningRe.exec(block);
  if (!m) {
    return null;
  }
  const found = unescapeStringLiteral(m[1]);
  if (found !== oldMeaning) {
    console.warn(`    meaning mismatch: expected ${JSON.stringify(oldMeaning)}, found ${JSON.stringify(found)}`);
    return null;
  }
  const insert = `\r\n    meaning: ${jsString(newMeaning)},\r\n    senses: [\r\n      {\r\n        type: 'etymology',\r\n        text: ${jsString(found)}\r\n      }\r\n    ],`;
  return block.slice(0, m.index) + insert + block.slice(m.index + m[0].length);
}

function main() {
  const batchPath = path.resolve(BATCH_PATH);
  const lexiconPath = path.resolve(LEXICON_PATH);

  if (!fs.existsSync(batchPath)) {
    console.error(`Batch file not found: ${batchPath}`);
    process.exit(1);
  }

  const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
  const meaningSuggestions = batch.suggestions.filter((s) => s.field === 'meaning');

  const { LEXICON } = require(lexiconPath);
  const byId = new Map(LEXICON.map((e) => [e.id, e]));

  let text = fs.readFileSync(lexiconPath, 'utf8');
  const patches = [];

  for (const suggestion of meaningSuggestions) {
    const entry = byId.get(suggestion.id);
    if (!entry) {
      console.warn(`Skipping ${suggestion.id}: not found in lexicon`);
      continue;
    }
    if (entry.senses) {
      console.warn(`Skipping ${suggestion.id}: already has senses`);
      continue;
    }
    const oldMeaning = entry.meaning;
    const newMeaning = suggestion.value;
    if (oldMeaning === newMeaning) {
      continue;
    }

    const block = findEntryBlock(text, suggestion.id);
    if (!block) {
      console.warn(`Skipping ${suggestion.id}: could not locate entry block`);
      continue;
    }

    const newBlock = buildPatchedBlock(text.slice(block.start, block.end), oldMeaning, newMeaning);
    if (!newBlock) {
      console.warn(`Skipping ${suggestion.id}: could not patch block`);
      continue;
    }

    patches.push({ id: suggestion.id, start: block.start, end: block.end, newBlock });
  }

  // Apply patches from the end of the file forward so earlier indices stay valid.
  patches.sort((a, b) => b.start - a.start);
  for (const patch of patches) {
    text = text.slice(0, patch.start) + patch.newBlock + text.slice(patch.end);
    console.log(`Patched ${patch.id}`);
  }

  fs.writeFileSync(lexiconPath, text, 'utf8');
  console.log(`\nPatched ${patches.length} entries in ${lexiconPath}`);
}

if (require.main === module) {
  main();
}
