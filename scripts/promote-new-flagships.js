#!/usr/bin/env node
/**
 * Promote the 2026-07-12 domain batch entries to flagships.
 *
 * This is a single-process batched promotion: it edits the canonical sources
 * (lexicon + archetypes + owned-domains) once in memory and writes them once,
 * then runs create-flagship.js for each entry.  This avoids the Windows file-lock
 * storms caused by spawning one promote-to-flagship.js process per entry.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const {
  ROOT,
  normalizeDomain,
  punycode,
  loadLexicon,
  loadLexiconSource,
  saveLexicon,
  setLexiconField,
  loadArchetypes,
  saveArchetypes,
  loadOwnedDomains,
  saveOwnedDomains,
  upsertArchetype,
  updateArchetypeDomain,
} = require('./flywheel-utils');

const PROMOTIONS = [
  ['adamas', 'adámas.com'],
  ['amitabha', 'amitābha.com'],
  ['amun', 'ꜣmun.com'],
  ['andromeda', 'andromedē.com'],
  ['apep', 'ꜥpp.com'],
  ['arachne', 'arachnē.com'],
  ['dagan', 'dāgan.com'],
  ['dazhbog', 'dažbog.com'],
  ['thoth', 'ḏḥwty.com'],
  ['eggther', 'eggþér.com'],
  ['ge', 'gē.com'],
  ['hydra', 'hýdra.com'],
  ['hygieia', 'hygíeia.com'],
  ['hypnos', 'hýpnos.com'],
  ['iris', 'íris.com'],
  ['jormungandr', 'jǫrmungandr.com'],
  ['laozi', 'lǎozǐ.com'],
  ['manannan', 'manannán.com'],
  ['modi', 'móði.com'],
  ['papatuanuku', 'papatūānuku.com'],
  ['phoenix', 'phoînix.com'],
  ['shapash', 'šāpšu.com'],
  ['surya', 'sūrya.com'],
  ['taishang', 'tàishàng.com'],
  ['tane', 'tāne.com'],
  ['theia', 'theía.com'],
  ['tiandi', 'tiāndì.com'],
  ['yam', 'yām.com'],
  ['yinyang', 'yīnyáng.com'],
];

function assetExists(dir, name, exts) {
  return exts.some(ext => fs.existsSync(path.join(dir, `${name}.${ext}`)));
}

function createFlagship(id, attempt = 1) {
  const maxAttempts = 5;
  try {
    console.log(`\n▸ node scripts/create-flagship.js ${id}`);
    execSync(`node scripts/create-flagship.js ${id}`, { cwd: ROOT, stdio: 'inherit' });
    console.log(`✓ ${id}: flagship generated`);
    return true;
  } catch (err) {
    if (attempt < maxAttempts) {
      const delay = attempt * 800;
      console.warn(`⚠ ${id}: create-flagship failed (attempt ${attempt}/${maxAttempts}); retrying in ${delay}ms…`);
      try {
        execSync(`node -e "setTimeout(()=>{},${delay})"`);
      } catch {}
      return createFlagship(id, attempt + 1);
    }
    console.error(`✗ ${id}: create-flagship failed after ${maxAttempts} attempts`);
    return false;
  }
}

function main() {
  const lexicon = loadLexicon();
  let lexiconSrc = loadLexiconSource();
  let { src: archetypesSrc, list: archetypes } = loadArchetypes();
  const owned = loadOwnedDomains();

  const failedIds = [];

  // 1. Batch-edit canonical sources in memory.
  for (const [id, domain] of PROMOTIONS) {
    const entry = lexicon.find(e => e.id === id);
    if (!entry) {
      console.error(`Unknown lexicon id: ${id}`);
      failedIds.push(id);
      continue;
    }

    const siteDir = path.join(ROOT, 'sites', id);
    if (!fs.existsSync(siteDir)) {
      console.error(`Site directory does not exist: sites/${id}/`);
      failedIds.push(id);
      continue;
    }

    const assetsDir = path.join(siteDir, 'assets');
    const required = [
      [`${id}_mascot`, ['png', 'webp']],
      [`${id}_logolockup`, ['png', 'webp']],
      [`${id}_logomark`, ['png', 'webp']],
    ];
    let missingAsset = false;
    for (const [name, exts] of required) {
      if (!assetExists(assetsDir, name, exts)) {
        console.error(`Missing asset: sites/${id}/assets/${name}.{png,webp}`);
        missingAsset = true;
      }
    }
    if (missingAsset) {
      failedIds.push(id);
      continue;
    }

    // Lexicon flag
    if (!entry.hasAdSite) {
      lexiconSrc = setLexiconField(lexiconSrc, id, 'hasAdSite', true);
      console.log(`Set hasAdSite: true for ${id} in lexicon`);
    }

    // Archetype
    const existing = archetypes.find(a => a.id === id);
    const domainUnicode = normalizeDomain(domain);
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

    archetypesSrc = upsertArchetype(archetypesSrc, archetype);

    // Owned domains
    const norm = normalizeDomain(domain);
    if (!owned.some(d => normalizeDomain(d) === norm)) {
      owned.push(domain.normalize('NFC').trim().toLowerCase());
      console.log(`Added ${domain} to owned-domains.json`);
    }

    // Primary domain wiring
    const { src: afterDomain } = updateArchetypeDomain(archetypesSrc, id, domain);
    archetypesSrc = afterDomain;
  }

  // 2. Write canonical sources once.
  console.log('\n▸ Saving canonical sources');
  saveLexicon(lexiconSrc);
  saveArchetypes(archetypesSrc);
  saveOwnedDomains(owned);

  // 3. Generate each flagship with retries.
  console.log('\n▸ Generating flagship pages');
  for (const [id] of PROMOTIONS) {
    if (failedIds.includes(id)) continue;
    const ok = createFlagship(id);
    if (!ok) failedIds.push(id);
  }

  // 4. Add the alternative Egyptological spelling of Thoth as a domain alt.
  console.log('\n▸ Adding ḏḥwtj.com as Thoth domain alt');
  ({ src: archetypesSrc } = loadArchetypes());
  const { src: updatedArchetypesSrc } = updateArchetypeDomain(archetypesSrc, 'thoth', 'ḏḥwtj.com');
  saveArchetypes(updatedArchetypesSrc);

  if (failedIds.length > 0) {
    console.error(`\n✗ ${failedIds.length} promotion(s) failed: ${failedIds.join(', ')}`);
    process.exit(1);
  }

  console.log('\n✓ All promotions complete. Run npm run generate to sync derived artifacts.');
}

main();
