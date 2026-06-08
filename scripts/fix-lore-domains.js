const fs = require('fs');
const path = require('path');

const SITES_DIR = path.join(__dirname, '..', 'sites');
const LEXICON_PATH = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');

// Read lexicon
const lexicon = fs.readFileSync(LEXICON_PATH, 'utf8');

function getLexiconEntry(id) {
  const idPattern = new RegExp(`id\\s*:\\s*['"\`]${id}['"\`]`, 'g');
  let match;
  while ((match = idPattern.exec(lexicon)) !== null) {
    const idx = match.index;
    // Find the opening brace
    let blockStart = idx;
    while (blockStart > 0 && lexicon[blockStart] !== '{') blockStart--;
    // Find the matching closing brace
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
    const variantsMatch = block.match(/variants\s*:\s*\[/);
    if (unicodeMatch) {
      return {
        unicode: unicodeMatch[1],
        ascii: asciiMatch ? asciiMatch[1] : id,
        hasVariants: !!variantsMatch,
      };
    }
  }
  return null;
}

// Get all flagships with lore pages
const dirs = fs.readdirSync(SITES_DIR).filter(d => {
  return fs.existsSync(path.join(SITES_DIR, d, 'lore', 'index.html'));
}).sort();

console.log('Checking lore pages for ASCII domain references...\n');

let fixedCount = 0;

for (const id of dirs) {
  const entry = getLexiconEntry(id);
  if (!entry) {
    console.log(`${id}: NOT FOUND in lexicon`);
    continue;
  }

  const lorePath = path.join(SITES_DIR, id, 'lore', 'index.html');
  let html = fs.readFileSync(lorePath, 'utf8');

  const unicodeDomain = entry.unicode + '.com';
  const asciiDomain = entry.ascii + '.com';
  const capitalizedAscii = entry.ascii.charAt(0).toUpperCase() + entry.ascii.slice(1) + '.com';

  let changed = false;

  // Replace ASCII domain with Unicode domain (case-insensitive for the base name)
  // Be careful to only replace actual domain references, not URL paths or other text
  // Pattern: word boundary + ascii name + .com
  const asciiPattern = new RegExp(`\\b${entry.ascii}\\.com`, 'gi');
  const matches = [...html.matchAll(asciiPattern)];

  if (matches.length > 0) {
    // Replace each match
    for (const m of matches) {
      const before = html.slice(Math.max(0, m.index - 20), m.index);
      const after = html.slice(m.index + m[0].length, m.index + m[0].length + 20);
      // Don't replace if it's inside a URL path like /sites/selene/ or punycodex.com
      if (before.includes('/') && !before.includes('href=') && !before.includes('content=')) {
        continue;
      }
      // Replace this specific occurrence
      html = html.slice(0, m.index) + unicodeDomain + html.slice(m.index + m[0].length);
      changed = true;
    }
  }

  // Also replace capitalized versions if different
  if (capitalizedAscii !== asciiDomain) {
    const capPattern = new RegExp(`\\b${entry.ascii.charAt(0).toUpperCase() + entry.ascii.slice(1)}\\.com`, 'g');
    const capMatches = [...html.matchAll(capPattern)];
    for (const m of capMatches) {
      html = html.slice(0, m.index) + unicodeDomain + html.slice(m.index + m[0].length);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(lorePath, html, 'utf8');
    console.log(`${id}: FIXED -> ${unicodeDomain}`);
    fixedCount++;
  } else {
    console.log(`${id}: OK (no ASCII domains found)`);
  }
}

console.log(`\nDone. Fixed ${fixedCount} lore pages.`);
