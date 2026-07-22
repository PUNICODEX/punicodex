/**
 * PUNICODEX — Sync canonical engine to extension and mobile shared copies
 *
 * type/js/engine.js is the single source of truth.
 * This script copies it to:
 *   - extension/shared/engine.js
 *   - mobile/shared/engine.js
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const canonical = path.join(root, 'type', 'js', 'engine.js');

const destinations = [
  path.join(root, 'extension', 'shared', 'engine.js'),
  path.join(root, 'mobile', 'shared', 'engine.js'),
];

// The engine resolves pantheon emoji from the canonical meta module at
// runtime (browser global / Node require), so the meta travels with it.
const metaCanonical = path.join(root, 'type', 'js', 'pantheon-meta.js');
const metaDestinations = [
  path.join(root, 'extension', 'shared', 'pantheon-meta.js'),
  path.join(root, 'mobile', 'shared', 'pantheon-meta.js'),
];

const content = fs.readFileSync(canonical, 'utf8');
const metaContent = fs.readFileSync(metaCanonical, 'utf8');

for (const dest of destinations) {
  // Unlink first so we never write through an existing hard link;
  // this keeps the two destinations as independent files on all platforms.
  if (fs.existsSync(dest)) {
    fs.unlinkSync(dest);
  }
  fs.writeFileSync(dest, content, 'utf8');
  console.log(`Synced ${path.relative(root, dest)}`);
}

for (const dest of metaDestinations) {
  if (fs.existsSync(dest)) {
    fs.unlinkSync(dest);
  }
  fs.writeFileSync(dest, metaContent, 'utf8');
  console.log(`Synced ${path.relative(root, dest)}`);
}
