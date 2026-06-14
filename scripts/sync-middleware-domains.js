/**
 * Sync middleware.js DOMAIN_MAP with the domain fields in js/archetypes-v2.js.
 * Adds missing unicode/punycode/domainAlt entries (and www. variants) without
 * removing any existing mappings.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { domainToASCII } = require('url');

const ROOT = path.join(__dirname, '..');
const ARCHETYPES_PATH = path.join(ROOT, 'js', 'archetypes-v2.js');
const MIDDLEWARE_PATH = path.join(ROOT, 'middleware.js');
const BACKUP_PATH = path.join(ROOT, 'middleware.js.backup');

function puny(d) {
  try {
    return domainToASCII(d).toLowerCase();
  } catch (e) {
    return null;
  }
}

function normalizeDomain(d) {
  return d.toLowerCase().trim();
}

// Load archetypes
const archetypesSrc = fs.readFileSync(ARCHETYPES_PATH, 'utf8');
const archetypes = vm.runInNewContext(`(function(){\n${archetypesSrc}\nreturn ARCHETYPES;\n})()`);

// Build desired domain -> /sites/{id} map from archetypes
const desired = new Map();
for (const a of archetypes) {
  const id = a.id;
  const target = `/sites/${id}`;
  const variants = [
    a.domainUnicode,
    a.domainPunycode,
    ...(a.domainAlt || [])
  ].filter(Boolean);

  for (const raw of variants) {
    const d = normalizeDomain(raw);
    if (!d) continue;
    desired.set(d, target);
    desired.set('www.' + d, target);

    // If the variant is Unicode, also add its punycode form if different
    const p = puny(d);
    if (p && p !== d) {
      desired.set(p, target);
      desired.set('www.' + p, target);
    }
  }
}

// Read current middleware
const original = fs.readFileSync(MIDDLEWARE_PATH, 'utf8');
fs.writeFileSync(BACKUP_PATH, original);

// Extract current DOMAIN_MAP object literal
const mapMatch = original.match(/(const DOMAIN_MAP = \{)([\s\S]*?)(\n\};)/);
if (!mapMatch) {
  throw new Error('Could not find DOMAIN_MAP in middleware.js');
}

const currentMapSrc = mapMatch[2];
const currentMap = {};
// Parse simple 'key': 'value', lines
const lineRegex = /^\s*'([^']+)':\s*'([^']+)',?/gm;
let m;
while ((m = lineRegex.exec(currentMapSrc)) !== null) {
  currentMap[m[1]] = m[2];
}

// Replace map entirely from archetypes (current map is backed up)
const merged = new Map(desired);

// Sort domains alphabetically (case-insensitive) for stable output
const sorted = Array.from(merged.entries()).sort((a, b) => a[0].localeCompare(b[0], 'en'));

const maxKeyLen = Math.max(...sorted.map(([k]) => k.length));
const mapBody = sorted.map(([k, v]) => `  '${k}':${' '.repeat(maxKeyLen - k.length + 1)}'${v}',`).join('\n');

const newMiddleware = original.replace(mapMatch[0], `${mapMatch[1]}\n${mapBody}\n};`);

fs.writeFileSync(MIDDLEWARE_PATH, newMiddleware);
console.log(`✓ middleware.js synced`);
console.log(`  Current domains: ${Object.keys(currentMap).length}`);
console.log(`  Desired domains: ${desired.size}`);
console.log(`  Merged domains:  ${merged.size}`);
console.log(`  Added:           ${merged.size - Object.keys(currentMap).length}`);
console.log(`  Backup:          ${BACKUP_PATH}`);
