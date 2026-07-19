#!/usr/bin/env node
/**
 * Merges the 2026-07-20 lore batches into scripts/lore-catalog.json.
 * Never overwrites an entry that already has non-empty content.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const catalogPath = path.join(ROOT, 'scripts', 'lore-catalog.json');

const batches = ['lore-a.js', 'lore-b.js'];

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
let added = 0;
let skipped = 0;
for (const file of batches) {
  const batch = require(path.join(__dirname, file));
  for (const [id, entry] of Object.entries(batch)) {
    if (catalog[id] && catalog[id].mythology && catalog[id].mythology.lead) {
      skipped++;
      continue;
    }
    catalog[id] = entry;
    added++;
  }
}
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
console.log(`lore-catalog.json: added ${added}, skipped existing ${skipped}, total ${Object.keys(catalog).length}`);
