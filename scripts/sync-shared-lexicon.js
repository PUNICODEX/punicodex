/**
 * PUNYCODEX — Sync canonical lexicon to extension and mobile shared copies
 *
 * type/js/lexicon.js is the single source of truth.
 * This script copies it to:
 *   - extension/shared/lexicon.js
 *   - mobile/shared/lexicon.js
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const canonical = path.join(root, 'type', 'js', 'lexicon.js');

const destinations = [
  path.join(root, 'extension', 'shared', 'lexicon.js'),
  path.join(root, 'mobile', 'shared', 'lexicon.js'),
];

const content = fs.readFileSync(canonical, 'utf8');

for (const dest of destinations) {
  fs.writeFileSync(dest, content, 'utf8');
  console.log(`Synced ${path.relative(root, dest)}`);
}
