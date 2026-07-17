const fs = require('fs');
const path = require('path');

const SITES_DIR = path.join(__dirname, '..', 'sites');
const LEXICON_PATH = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');

const lexicon = fs.readFileSync(LEXICON_PATH, 'utf8');

// These are the only plain ASCII domains the user owns (canonical in ASCII form)
const ALLOWED_ASCII = new Set(['helheimr.com', 'muspellheimr.com', 'punicodex.com']);

function getLexiconEntry(id) {
  const idPattern = new RegExp(`id\\s*:\\s*['"\`]${id}['"\`]`, 'g');
  let match;
  while ((match = idPattern.exec(lexicon)) !== null) {
    const idx = match.index;
    let blockStart = idx;
    while (blockStart > 0 && lexicon[blockStart] !== '{') blockStart--;
    let blockEnd = blockStart + 1;
    let depth = 1;
    while (blockEnd < lexicon.length && depth > 0) {
      if (lexicon[blockEnd] === '{') depth++;
      if (lexicon[blockEnd] === '}') depth--;
      blockEnd++;
    }
    const block = lexicon.slice(blockStart, blockEnd);
    const unicodeMatch = block.match(/unicode\s*:\s*['"`]([^'"`]+)['"`]/);
    const asciiMatch = block.match(/ascii\s*:\s*['"`]([^'"`]+)['"`]/);
    if (unicodeMatch) {
      return {
        unicode: unicodeMatch[1],
        ascii: asciiMatch ? asciiMatch[1] : id,
      };
    }
  }
  return null;
}

const dirs = fs.readdirSync(SITES_DIR).filter(d => {
  return fs.existsSync(path.join(SITES_DIR, d, 'lore', 'index.html'));
}).sort();

console.log('Fixing remaining ASCII domains in lore pages...\n');

let fixedCount = 0;

for (const id of dirs) {
  const entry = getLexiconEntry(id);
  if (!entry) continue;

  const lorePath = path.join(SITES_DIR, id, 'lore', 'index.html');
  let html = fs.readFileSync(lorePath, 'utf8');
  const original = html;

  const unicodeDomain = entry.unicode + '.com';
  const asciiDomain = entry.ascii + '.com';

  // Skip if ASCII domain is allowed
  if (ALLOWED_ASCII.has(asciiDomain.toLowerCase())) {
    console.log(`${id}: SKIPPED (canonical ASCII domain)`);
    continue;
  }

  // Replace all occurrences of the ASCII domain (case-insensitive, no word boundary needed)
  // We need to be careful not to replace partial matches inside Unicode strings
  // Pattern: match the exact ASCII domain when it's not preceded by a Unicode letter
  const pattern = new RegExp(`(?<![\\u00C0-\\uFFFF])${entry.ascii.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\w)\\.com`, 'gi');

  html = html.replace(pattern, unicodeDomain);

  if (html !== original) {
    fs.writeFileSync(lorePath, html, 'utf8');
    console.log(`${id}: FIXED ${asciiDomain} -> ${unicodeDomain}`);
    fixedCount++;
  }
}

console.log(`\nDone. Fixed ${fixedCount} lore pages.`);
