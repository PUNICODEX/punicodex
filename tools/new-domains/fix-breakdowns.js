// Fixes the five breakdown arrays whose unicode forms were corrected.
const fs = require('node:fs');
const path = require('node:path');
const FILE = path.join(__dirname, '..', '..', 'type', 'js', 'lexicon.js');

const FIXES = {
  anubis: { a: { to: 'ꜣ', type: 'special', note: 'Alef ꜣ: glottal stop' } },
  seshat: {
    e: { to: 'š', type: 'special', note: 'Sibilant š (palatal s)' },
    s: { to: 'ꜣ', type: 'special', note: 'Alef ꜣ: glottal stop' },
  },
  delos: { e: { to: 'ê', type: 'special', note: 'Circumflex: stress and length in one mark' } },
  troia: { a: { to: 'ā', type: 'length', note: 'Long final alpha' } },
  ogun: {
    o: { to: 'Ò', type: 'special', note: 'Low tone (Yoruba)' },
    u: { to: 'ú', type: 'special', note: 'High tone (Yoruba)' },
  },
};

function applyFix(src, id, fix) {
  const anchor = `"id": "${id}"`;
  const i = src.indexOf(anchor);
  if (i === -1) throw new Error(`entry not found: ${id}`);
  const entryStart = src.lastIndexOf('{', i);
  // find the entry's closing brace at the same indent (next '\n  },' after i)
  const end = src.indexOf('\n  },', i);
  if (end === -1) throw new Error(`entry end not found: ${id}`);
  let block = src.slice(entryStart, end);
  for (const [ch, f] of Object.entries(fix)) {
    // match the breakdown object for this char: { "char": "a", "to": "...", ... }
    const re = new RegExp(
      `\\{\\s*"char": "${ch}",\\s*"to": "[^"]*",\\s*"type": "[^"]*",\\s*"note": "[^"]*"\\s*\\}`,
      'm'
    );
    const replacement = `{ "char": "${ch}", "to": "${f.to}", "type": "${f.type}", "note": "${f.note}" }`;
    if (!re.test(block)) throw new Error(`breakdown char ${ch} not found in ${id}: ${block.slice(0, 200)}`);
    block = block.replace(re, replacement);
  }
  return src.slice(0, entryStart) + block + src.slice(end);
}

let src = fs.readFileSync(FILE, 'utf8');
for (const [id, fix] of Object.entries(FIXES)) src = applyFix(src, id, fix);
fs.writeFileSync(FILE, src, 'utf8');
console.log('breakdowns fixed');
