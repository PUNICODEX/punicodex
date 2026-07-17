#!/usr/bin/env node
/**
 * PuniCodex — Export Flagship Lore Catalog
 *
 * Reads the canonical scripts/lore-catalog.json and produces clean,
 * consumer-specific JSON artifacts with HTML stripped from narrative fields.
 *
 * Generated outputs:
 *   - platform/browser/renderer/lore-catalog.json  (API / server-side search)
 *   - extension/shared/lore-catalog.json           (browser extension)
 *   - mobile/shared/lore-catalog.json              (mobile PWA)
 *   - type/js/lore-catalog.json                    (type tool)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'scripts', 'lore-catalog.json');

const OUTPUTS = [
  path.join(ROOT, 'platform', 'browser', 'renderer', 'lore-catalog.json'),
  path.join(ROOT, 'extension', 'shared', 'lore-catalog.json'),
  path.join(ROOT, 'mobile', 'shared', 'lore-catalog.json'),
  path.join(ROOT, 'type', 'js', 'lore-catalog.json'),
];

function stripHtml(html) {
  if (typeof html !== 'string') return html;
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanValue(value, key) {
  if (typeof value === 'string') {
    // Strip HTML from narrative text fields; leave short labels/citations as-is
    const stripKeys = ['lead', 'text', 'desc', 'syncretism', 'culturalLegacy', 'archaeology', 'note', 'meaning'];
    if (stripKeys.includes(key)) {
      return stripHtml(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => cleanValue(item, key));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = cleanValue(v, k);
    }
    return out;
  }
  return value;
}

function buildCleanCatalog() {
  const raw = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  const out = {};
  for (const [id, entry] of Object.entries(raw)) {
    if (id.startsWith('_')) continue; // skip metadata/schema keys
    out[id] = cleanValue(entry, id);
  }
  return out;
}

function main() {
  const catalog = buildCleanCatalog();
  const json = JSON.stringify(catalog, null, 2) + '\n';

  for (const dest of OUTPUTS) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, json, 'utf8');
  }

  console.log(`✓ Exported ${Object.keys(catalog).length} flagship lore entries to ${OUTPUTS.length} consumers.`);
}

main();
