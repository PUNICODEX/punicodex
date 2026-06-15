#!/usr/bin/env node
/**
 * PÚNYCODEX — Add an owned domain
 *
 * Usage:
 *   node scripts/add-owned-domain.js <id> <domain>
 *
 * Example:
 *   node scripts/add-owned-domain.js athena athēnā.com
 *
 * This script:
 *   1. Appends the domain to platform/db/owned-domains.json
 *   2. Injects it into the matching archetype's domain set
 *   3. Regenerates middleware routing and derived consumers
 *   4. Runs the flywheel validator
 */

const path = require('node:path');
const {
  ROOT,
  normalizeDomain,
  loadLexicon,
  loadArchetypes,
  loadOwnedDomains,
  saveOwnedDomains,
  saveArchetypes,
  updateArchetypeDomain,
  runGenerate,
  runValidators,
} = require('./flywheel-utils');

function main() {
  const [id, rawDomain] = process.argv.slice(2);

  if (!id || !rawDomain) {
    console.error('Usage: node scripts/add-owned-domain.js <id> <domain>');
    process.exit(1);
  }

  const lexicon = loadLexicon();
  const entry = lexicon.find(e => e.id === id);
  if (!entry) {
    console.error(`Unknown lexicon id: ${id}`);
    process.exit(1);
  }

  const { src: archetypesSrc, list: archetypes } = loadArchetypes();
  const archetype = archetypes.find(a => a.id === id);
  if (!archetype) {
    console.error(`No archetype for ${id}. Owned domains must map to a flagship archetype.`);
    process.exit(1);
  }

  const norm = normalizeDomain(rawDomain);
  const owned = loadOwnedDomains();

  if (owned.some(d => normalizeDomain(d) === norm)) {
    console.log(`Domain ${rawDomain} is already in owned-domains.json`);
  } else {
    owned.push(rawDomain.normalize('NFC').trim().toLowerCase());
    saveOwnedDomains(owned);
    console.log(`Added ${rawDomain} to owned-domains.json`);
  }

  const { src: updatedSrc, changed } = updateArchetypeDomain(archetypesSrc, id, rawDomain);
  if (changed) {
    saveArchetypes(updatedSrc);
    console.log(`Updated archetype ${id} domain set`);
  } else {
    console.log(`Archetype ${id} already covers ${rawDomain}`);
  }

  runGenerate();
  runValidators();

  console.log(`\n✓ Owned domain ${rawDomain} is wired for ${id}`);
}

main();
