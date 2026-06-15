#!/usr/bin/env node
/**
 * PÚNYCODEX — Promote a base temple to a handcrafted flagship
 *
 * Usage:
 *   node scripts/promote-to-flagship.js <id> [--domain <domain>]
 *
 * Example:
 *   node scripts/promote-to-flagship.js kronos --domain kronos.com
 *
 * This script:
 *   1. Verifies the lexicon entry, site dir, and required assets exist.
 *   2. Sets hasAdSite: true in the lexicon entry.
 *   3. Adds/updates the archetype entry in js/archetypes-v2.js.
 *   4. Optionally adds the primary owned domain.
 *   5. Runs create-flagship.js and npm run generate.
 *   6. Runs all relevant validators.
 */

const fs = require('node:fs');
const path = require('node:path');
const {
  ROOT,
  normalizeDomain,
  punycode,
  loadLexicon,
  loadArchetypes,
  loadOwnedDomains,
  saveOwnedDomains,
  saveArchetypes,
  saveLexicon,
  loadLexiconSource,
  setLexiconField,
  upsertArchetype,
  updateArchetypeDomain,
  runGenerate,
  runCommand,
  runValidators,
} = require('./flywheel-utils');

function parseArgs(argv) {
  const id = argv[0];
  let domain = null;
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--domain' && argv[i + 1]) {
      domain = argv[i + 1];
      i++;
    }
  }
  return { id, domain };
}

function assetExists(dir, name, exts) {
  return exts.some(ext => fs.existsSync(path.join(dir, `${name}.${ext}`)));
}

function main() {
  const { id, domain } = parseArgs(process.argv.slice(2));

  if (!id) {
    console.error('Usage: node scripts/promote-to-flagship.js <id> [--domain <domain>]');
    process.exit(1);
  }

  const lexicon = loadLexicon();
  const entry = lexicon.find(e => e.id === id);
  if (!entry) {
    console.error(`Unknown lexicon id: ${id}`);
    process.exit(1);
  }

  const siteDir = path.join(ROOT, 'sites', id);
  if (!fs.existsSync(siteDir)) {
    console.error(`Site directory does not exist: sites/${id}/`);
    process.exit(1);
  }

  const assetsDir = path.join(siteDir, 'assets');
  const required = [
    [`${id}_mascot`, ['png', 'webp']],
    [`${id}_logolockup`, ['png', 'webp']],
    [`${id}_logomark`, ['png', 'webp']],
  ];
  for (const [name, exts] of required) {
    if (!assetExists(assetsDir, name, exts)) {
      console.error(`Missing asset: sites/${id}/assets/${name}.{png,webp}`);
      process.exit(1);
    }
  }

  // Ensure lexicon hasAdSite flag
  let lexiconSrc = loadLexiconSource();
  if (!entry.hasAdSite) {
    lexiconSrc = setLexiconField(lexiconSrc, id, 'hasAdSite', true);
    saveLexicon(lexiconSrc);
    console.log(`Set hasAdSite: true for ${id} in lexicon`);
  }

  // Build/update archetype
  const { src: archetypesSrc, list: archetypes } = loadArchetypes();
  const existing = archetypes.find(a => a.id === id);

  const domainUnicode = domain ? normalizeDomain(domain) : (existing?.domainUnicode || `${entry.ascii}.com`);
  const domainPuny = punycode(domainUnicode);

  const archetype = {
    id,
    name: entry.unicode,
    greek: entry.greek || '—',
    domain: entry.domain || `${entry.pantheon} deity`,
    tagline: entry.meaning ? `${entry.domain} · ${entry.meaning}` : `${entry.domain}`,
    tier: entry.tier,
    tierDetail: entry.tier === 'dual' ? 'dual-tier' : 'single-tier',
    pantheon: entry.pantheon,
    folder: id,
    domainUnicode,
    domainPunycode: domainPuny,
    domainAlt: existing?.domainAlt || [],
    colors: existing?.colors,
    mascotPath: `/sites/${id}/assets/${id}_mascot.webp`,
    mascotFallback: `/sites/${id}/assets/${id}_mascot.webp`,
    logomarkPath: `/sites/${id}/assets/${id}_logomark.webp`,
    built: true,
    hasAdSite: true,
    darkPunchline: false,
  };

  let newArchetypesSrc = upsertArchetype(archetypesSrc, archetype);

  if (domain) {
    const owned = loadOwnedDomains();
    const norm = normalizeDomain(domain);
    if (!owned.some(d => normalizeDomain(d) === norm)) {
      owned.push(domain.normalize('NFC').trim().toLowerCase());
      saveOwnedDomains(owned);
      console.log(`Added ${domain} to owned-domains.json`);
    }
    const { src: afterDomain } = updateArchetypeDomain(newArchetypesSrc, id, domain);
    newArchetypesSrc = afterDomain;
  }

  saveArchetypes(newArchetypesSrc);
  console.log(`Upserted archetype for ${id}`);

  // Generate flagship pages
  runCommand(`node scripts/create-flagship.js ${id}`);

  // Regenerate derived artifacts
  runGenerate();

  // Validate
  runValidators(['node scripts/validate-seo.js']);

  console.log(`\n✓ ${id} promoted to flagship`);
}

main();
