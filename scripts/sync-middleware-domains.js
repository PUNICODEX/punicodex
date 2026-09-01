/**
 * PUNICODEX — Sync middleware.js DOMAIN_MAP with js/archetypes-v2.js
 *
 * Sources of truth: js/archetypes-v2.js (owned domains), type/js/lexicon.js
 * (all temple ids — clean /{id}/ URLs are sitewide), and the
 * LEGACY_REDIRECTS table below (superseded first-segment paths).
 *
 * GENERATED SECTIONS — DO NOT EDIT THE DOMAIN_MAP BLOCK OR THE
 * LEXICON_IDS / LEGACY_REDIRECTS BLOCK BY HAND.
 * Run `npm run generate` to regenerate.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { domainToASCII } = require('url');

const ROOT = path.join(__dirname, '..');
const ARCHETYPES_PATH = path.join(ROOT, 'js', 'archetypes-v2.js');
const LEXICON_PATH = path.join(ROOT, 'type', 'js', 'lexicon.js');
const MIDDLEWARE_PATH = path.join(ROOT, 'middleware.js');
const BACKUP_PATH = path.join(ROOT, 'middleware.js.backup');

// Legacy first-segment paths that have been superseded; each 301s to the
// current canonical temple id. Every target MUST exist in the lexicon —
// verified below after the lexicon loads.
const LEGACY_REDIRECTS = {
  '/steh': '/seth', // renamed entry id
  '/achilles': '/achilleus',
  '/aether': '/aither',
  '/delphi': '/delphoi',
  '/enki': '/ea',
  '/europa': '/europe',
  '/hercules': '/herakles',
  '/jason': '/iason',
  '/khaos': '/chaos',
  '/oceanus': '/okeanos',
  '/pegasus': '/pegasos',
};

const IDS_BEGIN = '// === BEGIN GENERATED LEXICON_IDS + LEGACY_REDIRECTS (scripts/sync-middleware-domains.js) ===';
const IDS_END = '// === END GENERATED LEXICON_IDS + LEGACY_REDIRECTS ===';

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

// Load the canonical lexicon — every id gets a clean /{id}/ URL.
const lexiconSrc = fs.readFileSync(LEXICON_PATH, 'utf8');
const lexicon = vm.runInNewContext(`(function(){\n${lexiconSrc}\nreturn LEXICON;\n})()`);
const lexiconIds = lexicon.map((e) => e.id);
if (new Set(lexiconIds).size !== lexiconIds.length) {
  throw new Error('Duplicate ids in type/js/lexicon.js');
}

// Every legacy redirect target must be a real lexicon entry.
const lexiconIdSet = new Set(lexiconIds);
for (const [legacyPath, target] of Object.entries(LEGACY_REDIRECTS)) {
  if (!lexiconIdSet.has(target.slice(1))) {
    throw new Error(`LEGACY_REDIRECTS target ${target} (from ${legacyPath}) is not a lexicon id`);
  }
}

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

// Owned domains for base temples (not covered by a flagship archetype) are
// routed to their /sites/{id} page when the canonical Unicode form matches a
// lexicon entry. This keeps every acquired domain linked without forcing every
// owned name to become a full flagship.
const OWNED_DOMAINS_PATH = path.join(ROOT, 'platform', 'db', 'owned-domains.json');
const ownedDomains = JSON.parse(fs.readFileSync(OWNED_DOMAINS_PATH, 'utf8'));
const lexiconByDomain = new Map();
for (const e of lexicon) {
  if (!e.unicode) continue;
  const key = normalizeDomain(`${e.unicode}.com`);
  if (key) lexiconByDomain.set(key, e.id);
  const p = puny(key);
  if (p && p !== key) lexiconByDomain.set(p, e.id);
}

for (const raw of ownedDomains) {
  const d = normalizeDomain(raw);
  if (!d || desired.has(d)) continue;
  const id = lexiconByDomain.get(d) || lexiconByDomain.get(puny(d));
  if (id) {
    const target = `/sites/${id}`;
    desired.set(d, target);
    desired.set('www.' + d, target);
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

// Sort domains alphabetically (case-insensitive) for stable output
const sorted = Array.from(desired.entries()).sort((a, b) => a[0].localeCompare(b[0], 'en'));

const maxKeyLen = Math.max(...sorted.map(([k]) => k.length));
const mapBody = sorted.map(([k, v]) => `  '${k}':${' '.repeat(maxKeyLen - k.length + 1)}'${v}',`).join('\n');

const generatedNotice = `
  // GENERATED BY scripts/sync-middleware-domains.js — DO NOT EDIT BY HAND
  // Source of truth: js/archetypes-v2.js + platform/db/owned-domains.json
  // Run \`npm run generate\` to regenerate.
`;

const newMiddleware = original.replace(mapMatch[0], `${mapMatch[1]}${generatedNotice}\n${mapBody}\n};`);

// ─── LEXICON_IDS + LEGACY_REDIRECTS block ────────────────────────────────────
// Plain code-unit sort: fully deterministic across hosts/ICU versions, which
// the CI divergence gate depends on.
const sortedIds = [...lexiconIds].sort();
const idsBody = sortedIds.map((id) => `  '${id}',`).join('\n');
const legacyBody = Object.entries(LEGACY_REDIRECTS)
  .map(([from, to]) => `  '${from}': '${to}',`)
  .join('\n');

const idsBlock = `${IDS_BEGIN}
// Source of truth: type/js/lexicon.js (ids) + the LEGACY_REDIRECTS table in
// scripts/sync-middleware-domains.js. Run \`npm run generate\` to regenerate.

// Every lexicon-entry id: clean /{id}/* URLs rewrite to /sites/{id}/* and
// legacy /sites/{id}/* page requests 301 to the clean form.
const LEXICON_IDS = new Set([
${idsBody}
]);

// Legacy canonical paths that have been superseded; redirect to the new path.
const LEGACY_REDIRECTS = {
${legacyBody}
};
${IDS_END}`;

const idsRe = new RegExp(
  `${IDS_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${IDS_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
);
if (!idsRe.test(newMiddleware)) {
  throw new Error('Could not find the LEXICON_IDS / LEGACY_REDIRECTS generated block in middleware.js');
}
const finalMiddleware = newMiddleware.replace(idsRe, idsBlock);

const atomicWrite = (filePath, data) => {
  const tmp = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, data, 'utf8');
  fs.renameSync(tmp, filePath);
};

atomicWrite(MIDDLEWARE_PATH, finalMiddleware.replace(/\r\n/g, '\n'));
console.log(`✓ middleware.js synced`);
console.log(`  Previous domains: ${Object.keys(currentMap).length}`);
console.log(`  Desired domains:  ${desired.size}`);
console.log(`  Added:            ${desired.size - Object.keys(currentMap).length}`);
console.log(`  Lexicon ids:      ${lexiconIds.length}`);
console.log(`  Legacy redirects: ${Object.keys(LEGACY_REDIRECTS).length}`);
console.log(`  Backup:           ${BACKUP_PATH}`);
