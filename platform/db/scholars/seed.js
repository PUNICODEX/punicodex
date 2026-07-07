/**
 * Seed the Scholarly Edition database from generated manifests.
 *
 * Usage:
 *   node platform/db/scholars/seed.js
 *
 * Idempotent: safe to run multiple times. Existing temples/sections are skipped.
 */

const fs = require('node:fs');
const path = require('node:path');
const {
  createTemple,
  createSection,
  getTempleByEntryId,
  getSectionByTempleAndKey,
} = require('./index');

const MANIFESTS_DIR = path.join(__dirname, '..', '..', 'scholars', 'manifests');
const ALL_MANIFEST = path.join(MANIFESTS_DIR, 'all.json');

function readManifest(entryId) {
  const file = path.join(MANIFESTS_DIR, `${entryId}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function seedTemple(manifest) {
  let temple = getTempleByEntryId(manifest.entryId);
  if (temple) {
    return { temple, created: false };
  }
  const result = createTemple({
    entryId: manifest.entryId,
    name: manifest.name,
    pantheon: manifest.pantheon,
    tier: manifest.tier,
    manifestVersion: manifest.taxonomyVersion,
  });
  temple = getTempleByEntryId(manifest.entryId);
  return { temple, created: true };
}

function seedSections(temple, manifest) {
  let created = 0;
  let skipped = 0;
  for (const section of manifest.sections) {
    const existing = getSectionByTempleAndKey(temple.id, section.key);
    if (existing) {
      skipped++;
      continue;
    }
    createSection({
      templeId: temple.id,
      key: section.key,
      label: section.label,
      body: section.body || '',
      sources: section.sources || [],
      media: section.media || [],
      editorNotes: section.editorNotes || '',
      status: section.status || 'empty',
    });
    created++;
  }
  return { created, skipped };
}

function main() {
  if (!fs.existsSync(ALL_MANIFEST)) {
    console.error(`Missing aggregate manifest: ${ALL_MANIFEST}`);
    console.error('Run: node scripts/generate-scholars-manifests.js');
    process.exit(1);
  }

  const all = JSON.parse(fs.readFileSync(ALL_MANIFEST, 'utf8'));
  const entryIds = Object.keys(all.manifests).sort();

  let templesCreated = 0;
  let templesSkipped = 0;
  let sectionsCreated = 0;
  let sectionsSkipped = 0;

  for (const entryId of entryIds) {
    const manifest = readManifest(entryId);
    const { temple, created } = seedTemple(manifest);
    if (created) templesCreated++;
    else templesSkipped++;

    const sectionResult = seedSections(temple, manifest);
    sectionsCreated += sectionResult.created;
    sectionsSkipped += sectionResult.skipped;
  }

  console.log('Scholarly Edition seed complete.');
  console.log(`  Temples: ${templesCreated} created, ${templesSkipped} already existed`);
  console.log(`  Sections: ${sectionsCreated} created, ${sectionsSkipped} already existed`);
}

main();
