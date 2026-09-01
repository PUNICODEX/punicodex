/**
 * Apply Greek acute-accent audit results to the canonical lexicon.
 *
 * - Group A (acute on short vowel):
 *   - Unowned names: update canonical unicode to the corrected acute form.
 *   - Owned names: keep canonical unicode, add corrected form as an "ideal" variant.
 * - Group B (acute on long vowel):
 *   - All names: keep canonical macron-only unicode, add stacked macron+acute as "ideal" variant.
 *
 * Owned domains are never renamed, so existing domain→temple routing stays intact.
 */

const fs = require('fs');
const path = require('path');

const lexPath = path.resolve(__dirname, '../type/js/lexicon.js');
const auditPath = path.resolve(__dirname, '../.superpowers/greek-acute-audit.json');
const ownedPath = path.resolve(__dirname, '../platform/db/owned-domains.json');

const lexJs = fs.readFileSync(lexPath, 'utf8');
const start = lexJs.indexOf('[');
const end = lexJs.lastIndexOf(']');
const lex = eval(lexJs.slice(start, end + 1));

const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const owned = new Set(JSON.parse(fs.readFileSync(ownedPath, 'utf8')));

function ownedForUnicode(u) {
  return owned.has(`${u.toLowerCase()}.com`);
}

function addVariant(entry, unicode, type, note) {
  if (!entry.variants) entry.variants = [];
  const exists = entry.variants.some((v) => v.unicode === unicode);
  if (exists) return;
  entry.variants.push({
    unicode,
    type,
    note,
    sources: ['LSJ', 'Smyth', 'Beekes']
  });
}

let changedCanonical = 0;
let addedVariant = 0;

for (const item of audit.groupA) {
  const entry = lex.find((e) => e.id === item.id);
  if (!entry) {
    console.warn('Missing lexicon entry:', item.id);
    continue;
  }
  if (ownedForUnicode(item.unicode)) {
    addVariant(
      entry,
      item.corrected,
      'ideal',
      `Acute on the stressed short vowel, matching Greek ${item.greek}; preserves stress where the canonical macron-only form records length only.`
    );
    addedVariant++;
  } else {
    entry.unicode = item.corrected;
    changedCanonical++;
  }
}

for (const item of audit.groupB) {
  const entry = lex.find((e) => e.id === item.id);
  if (!entry) {
    console.warn('Missing lexicon entry:', item.id);
    continue;
  }
  addVariant(
    entry,
    item.ideal,
    'ideal',
    `Stacked macron+acute on the stressed long vowel, matching Greek ${item.greek}; philologically ideal but often untypeable on phones.`
  );
  addedVariant++;
}

const header = lexJs.slice(0, start);
const footer = lexJs.slice(end + 1);
const newBody = JSON.stringify(lex, null, 2);
const newLex = header + newBody + footer;
fs.writeFileSync(lexPath, newLex);

console.log(`Updated ${changedCanonical} canonical unicode forms.`);
console.log(`Added ${addedVariant} variants.`);
console.log('Wrote lexicon to', lexPath);
