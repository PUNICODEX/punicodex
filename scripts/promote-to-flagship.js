#!/usr/bin/env node
/**
 * PuniCodex — Promote a base temple to a handcrafted flagship
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
  let skipGenerate = false;
  let skipValidate = false;
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--domain' && argv[i + 1]) {
      domain = argv[i + 1];
      i++;
    } else if (argv[i] === '--skip-generate') {
      skipGenerate = true;
    } else if (argv[i] === '--skip-validate') {
      skipValidate = true;
    }
  }
  return { id, domain, skipGenerate, skipValidate };
}

function assetExists(dir, name, exts) {
  return exts.some(ext => fs.existsSync(path.join(dir, `${name}.${ext}`)));
}

function main() {
  const { id, domain, skipGenerate, skipValidate } = parseArgs(process.argv.slice(2));

  if (!id) {
    console.error('Usage: node scripts/promote-to-flagship.js <id> [--domain <domain>] [--skip-generate] [--skip-validate]');
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
    tier: entry.tier === 'dual' ? 'dual-tier' : entry.tier === '1' ? 'tier-1' : 'tier-2',
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

  // Curate the gallery BEFORE create-flagship builds the pages: without a
  // curated entry in gallery-data.json the gallery tab silently falls back to
  // the temple's own brand assets (mascot/logolockup) instead of
  // art-historical depictions. Must run AFTER the archetype exists — the
  // curator filters on the archetype list.
  const galleryPath = path.join(__dirname, 'gallery-data.json');
  const galleryData = JSON.parse(fs.readFileSync(galleryPath, 'utf8'));
  if (!galleryData[id]) {
    console.log(`No curated gallery for ${id} — running WikiCommons curation…`);
    runCommand(`node scripts/curate-gallery-images.js --only ${id}`);
    const after = JSON.parse(fs.readFileSync(galleryPath, 'utf8'));
    if (!after[id]) {
      console.warn(
        `⚠ Curation produced no gallery for ${id} — the gallery tab will show the brand-asset fallback. Consider curating by hand.`
      );
    }
  }

  // Generate flagship pages
  runCommand(`node scripts/create-flagship.js ${id}`);

  // Regenerate derived artifacts
  if (!skipGenerate) {
    runGenerate();
  }

  // Validate
  if (!skipValidate) {
    runValidators(['node scripts/validate-seo.js']);
  }

  console.log(`\n✓ ${id} promoted to flagship`);

  // Post-promotion completeness report. The flywheel validator hard-fails on
  // any of these missing, so surface them here, while the fix is cheap.
  {
    const lore = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'lore-catalog.json'), 'utf8'),
    );
    const galleryNow = JSON.parse(fs.readFileSync(galleryPath, 'utf8'));
    const effects = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '..', 'templates', 'flagship', 'effects', 'effects.json'),
        'utf8',
      ),
    );
    const patternsSrc = fs.readFileSync(
      path.join(__dirname, '..', 'type', 'js', 'industry-patterns.js'),
      'utf8',
    );
    const scholars = fs.existsSync(
      path.join(__dirname, '..', 'platform', 'scholars', 'content', `${id}.json`),
    );
    const seats = (patternsSrc.match(new RegExp(`'${id}'`, 'g')) || []).length;
    const checks = [
      ['lore catalog (scripts/lore-catalog.json)', lore[id] && Object.keys(lore[id]).length > 0],
      ['rental tier (js/archetypes-v2.js)', /rentalTier:\s*"SSS|S|A|B|C"/.test(newArchetypesSrc.split(`id: "${id}"`)[1]?.slice(0, 400) || '')],
      ['bespoke hero effect (templates/flagship/effects/)', Boolean(effects[id])],
      [
        'curated gallery ≥2 images (scripts/gallery-data.json, or _honestZero)',
        ((galleryNow[id] && galleryNow[id].images) || []).length >= 2 ||
          (galleryNow._honestZero || []).includes(id),
      ],
      [`industry-pattern seats ≥3 (type/js/industry-patterns.js) — has ${seats}`, seats >= 3],
      ['scholars content (platform/scholars/content/)', scholars],
    ];
    console.log('\nIntegration checklist:');
    let gaps = 0;
    for (const [label, ok] of checks) {
      console.log(`  ${ok ? '✓' : '⚠ MISSING'}  ${label}`);
      if (!ok) gaps++;
    }
    if (gaps) {
      console.warn(
        `\n⚠ ${gaps} integration gap(s) — npm run validate-flywheel will fail until resolved.\n` +
          '  Remedies: lore → scripts/lore-catalog.json; gallery → node scripts/curate-gallery-images.js --only ' +
          id +
          ' (never ship the brand-asset fallback silently; if Commons genuinely has no coverage, add the id to _honestZero in gallery-data.json); effect → templates/flagship/effects/; seats → type/js/industry-patterns.js; tier → rentalTier in js/archetypes-v2.js.',
      );
    }
  }
}

main();
