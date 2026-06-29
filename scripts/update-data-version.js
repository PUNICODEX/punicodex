#!/usr/bin/env node
/**
 * Update data-version.json from canonical sources.
 * Run automatically by `npm run generate`.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..');
const versionPath = path.join(root, 'data-version.json');

const CANONICAL_FILES = {
  lexicon: 'type/js/lexicon.js',
  originalScripts: 'type/js/original-scripts.js',
  sourceCatalog: 'type/js/source-catalog.js',
  archetypes: 'js/archetypes-v2.js',
  ownedDomains: 'platform/db/owned-domains.json',
  loreCatalog: 'scripts/lore-catalog.json',
};

function hashFile(rel) {
  const full = path.join(root, rel);
  const content = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(content).digest('hex');
}

function loadLexicon() {
  const lexiconPath = path.join(root, 'type/js/lexicon.js');
  const code = fs.readFileSync(lexiconPath, 'utf8').replace('const LEXICON', 'var LEXICON');
  return new Function(`${code}; return LEXICON;`)();
}

function loadArchetypes() {
  const archPath = path.join(root, 'js/archetypes-v2.js');
  const code = fs.readFileSync(archPath, 'utf8').replace('const ARCHETYPES', 'var ARCHETYPES');
  return new Function(`${code}; return ARCHETYPES;`)();
}

function countPantheons(lexicon) {
  return new Set(lexicon.map((e) => e.pantheon)).size;
}

function countOriginalScripts() {
  const osPath = path.join(root, 'type/js/original-scripts.js');
  const code = fs.readFileSync(osPath, 'utf8');
  const match = code.match(/const ORIGINAL_SCRIPTS = \{([\s\S]*?)\n\};/);
  if (!match) return 0;
  const sandbox = { ORIGINAL_SCRIPTS: {} };
  require('node:vm').createContext(sandbox);
  require('node:vm').runInContext(`ORIGINAL_SCRIPTS = {${match[1]}};`, sandbox);
  return Object.keys(sandbox.ORIGINAL_SCRIPTS).length;
}

function countSourceCatalog() {
  const { SOURCE_CATALOG } = require(path.join(root, 'type/js/source-catalog.js'));
  return Object.keys(SOURCE_CATALOG).length;
}

const lexicon = loadLexicon();
const archetypes = loadArchetypes();
const flagshipIds = new Set(archetypes.filter((a) => a.built).map((a) => a.id));

const hashes = {};
for (const [key, rel] of Object.entries(CANONICAL_FILES)) {
  hashes[key] = hashFile(rel);
}

const existing = fs.existsSync(versionPath)
  ? JSON.parse(fs.readFileSync(versionPath, 'utf8'))
  : { version: '1.0.0', schema: { major: 1, minor: 0, patch: 0 } };

// Bump patch if canonical hashes changed; keep major/minor as manual.
const oldHashes = existing.canonicalHashes || {};
let patch = existing.schema?.patch || 0;
const hashesChanged = JSON.stringify(oldHashes) !== JSON.stringify(hashes);
if (hashesChanged) {
  patch += 1;
}

const major = existing.schema?.major || 1;
const minor = existing.schema?.minor || 0;

const licenseSpdx = process.env.PUNYCODEX_LICENSE || existing.license?.spdx || 'TBD';
const licenseUrl = process.env.PUNYCODEX_LICENSE_URL || existing.license?.url || '';
const licenseChanged =
  licenseSpdx !== (existing.license?.spdx || 'TBD') || licenseUrl !== (existing.license?.url || '');

const counts = {
  entries: lexicon.length,
  pantheons: countPantheons(lexicon),
  flagships: flagshipIds.size,
  originalScripts: countOriginalScripts(),
  sourceCatalogEntries: countSourceCatalog(),
};
const countsChanged = JSON.stringify(existing.counts) !== JSON.stringify(counts);

// A license change is material enough to record, even when hashes/counts
// are stable. Bump the patch when the license changes.
if (licenseChanged && !hashesChanged && !countsChanged) {
  patch += 1;
}
const version = `${major}.${minor}.${patch}`;

// Only rewrite the file when something material changed. This keeps
// `npm run generate` idempotent and avoids timestamp-only diffs in CI.
if (!hashesChanged && !countsChanged && !licenseChanged && existing.version === version) {
  console.log(`data-version.json unchanged: ${version}`);
  process.exit(0);
}

const versionDoc = {
  version,
  releasedAt: new Date().toISOString(),
  dataSet: existing.dataSet || 'PÚNYCODEX Lexicon, Original Scripts, and Source Catalog',
  canonicalSources: CANONICAL_FILES,
  canonicalHashes: hashes,
  counts,
  schema: { major, minor, patch },
  license: {
    spdx: licenseSpdx,
    url: licenseUrl,
    note:
      licenseSpdx === 'TBD'
        ? 'License not yet chosen. See AGENTS.md Phase 2.6.'
        : `Data released under ${licenseSpdx}.`,
  },
};

fs.writeFileSync(versionPath, `${JSON.stringify(versionDoc, null, 2)}\n`);
console.log(`data-version.json updated: ${version}`);
