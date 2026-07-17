#!/usr/bin/env node
/**
 * Audit owned domains against archetypes/flagships and lexicon entries.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
const ownedDomains = JSON.parse(fs.readFileSync(path.join(ROOT, 'platform', 'db', 'owned-domains.json'), 'utf8'));

function normalizeAscii(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\.com$/, '');
}

function findLexiconId(domain) {
  const ascii = normalizeAscii(domain);
  // Try exact unicode match first
  const exact = LEXICON.find((e) => e.unicode.toLowerCase() === ascii || e.ascii.toLowerCase() === ascii);
  if (exact) return exact.id;
  // Try normalized match
  const norm = LEXICON.find((e) => normalizeAscii(e.unicode) === ascii || normalizeAscii(e.ascii) === ascii);
  return norm ? norm.id : null;
}

const report = {
  total: ownedDomains.length,
  missingArchetype: [],
  notFlagship: [],
  duplicateGroups: {},
  ok: [],
};

for (const domain of ownedDomains) {
  const id = findLexiconId(domain);
  const archetype = ARCHETYPES.find((a) => a.id === id);
  const isFlagship = archetype && archetype.built;
  const entry = LEXICON.find((e) => e.id === id);

  if (!id) {
    report.missingArchetype.push({ domain, reason: 'no lexicon match' });
  } else if (!isFlagship) {
    report.notFlagship.push({ domain, id, reason: archetype ? 'archetype not built' : 'no archetype' });
  } else {
    report.ok.push({ domain, id });
  }

  // Group by normalized name
  const key = normalizeAscii(domain);
  if (!report.duplicateGroups[key]) report.duplicateGroups[key] = [];
  report.duplicateGroups[key].push({ domain, id, isFlagship });
}

console.log('=== Owned Domain Audit ===\n');
console.log(`Total owned domains: ${report.total}`);
console.log(`OK (flagship): ${report.ok.length}`);
console.log(`Missing archetype / not flagship: ${report.notFlagship.length + report.missingArchetype.length}`);

if (report.missingArchetype.length) {
  console.log('\n--- No lexicon match ---');
  for (const item of report.missingArchetype) console.log(item.domain);
}

if (report.notFlagship.length) {
  console.log('\n--- Lexicon match but not a built flagship ---');
  for (const item of report.notFlagship) console.log(`${item.domain} -> ${item.id} (${item.reason})`);
}

const duplicates = Object.entries(report.duplicateGroups).filter(([_, vals]) => vals.length > 1);
if (duplicates.length) {
  console.log('\n--- Duplicate / variant groups ---');
  for (const [key, vals] of duplicates) {
    console.log(`\n${key}:`);
    for (const v of vals) {
      console.log(`  ${v.domain} -> ${v.id || '?'} (flagship: ${v.isFlagship ? 'yes' : 'no'})`);
    }
  }
}

// Check extended materials folder
const materialsDir = path.join(ROOT, 'extended flagship materials', 'punicodex');
const materialFolders = fs.existsSync(materialsDir) ? fs.readdirSync(materialsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
const materialIds = materialFolders.map((f) => f.toLowerCase().replace(/[^a-z0-9]/g, ''));
console.log('\n--- Extended materials folders not matching a built flagship ---');
for (const folder of materialFolders) {
  const guess = folder.toLowerCase().replace(/[^a-z0-9]/g, '');
  const archetype = ARCHETYPES.find((a) => a.id === guess);
  if (!archetype) {
    console.log(`${folder} -> no matching archetype (guessed id: ${guess})`);
  } else if (!archetype.built) {
    console.log(`${folder} -> archetype ${guess} exists but not built`);
  }
}
