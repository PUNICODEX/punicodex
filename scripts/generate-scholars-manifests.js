#!/usr/bin/env node
/**
 * Generate blank Scholarly Edition manifests for all 123 flagships.
 *
 * These manifests define the structure (sections) each Scholars tab will
 * contain, beginning empty and ready for university contributions.
 */

const fs = require('node:fs');
const path = require('node:path');
const { ARCHETYPES } = require('../js/archetypes-v2.js');
const { generateBlankManifest, validateManifest, getTaxonomyVersion } = require('../platform/scholars/taxonomy');

const OUT_DIR = path.join(__dirname, '..', 'platform', 'scholars', 'manifests');

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function withoutGeneratedAt(obj) {
  const clone = JSON.parse(JSON.stringify(obj));
  delete clone.generatedAt;
  return clone;
}

function writeJsonIfChanged(filePath, data) {
  let existing = null;
  if (fs.existsSync(filePath)) {
    try {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      existing = null;
    }
  }
  if (existing && deepEqual(withoutGeneratedAt(existing), withoutGeneratedAt(data))) {
    return false;
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return true;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const built = ARCHETYPES.filter((a) => a.built);
  const index = {
    taxonomyVersion: getTaxonomyVersion(),
    generatedAt: new Date().toISOString(),
    total: built.length,
    manifests: {},
  };

  let errors = 0;
  for (const archetype of built) {
    const manifest = generateBlankManifest(archetype.id);
    const validationErrors = validateManifest(manifest);
    if (validationErrors.length > 0) {
      console.error(`Validation failed for ${archetype.id}:`, validationErrors);
      errors += 1;
      continue;
    }

    const filePath = path.join(OUT_DIR, `${archetype.id}.json`);
    writeJsonIfChanged(filePath, manifest);
    index.manifests[archetype.id] = {
      name: archetype.name,
      pantheon: archetype.pantheon,
      tier: archetype.tier,
      path: `platform/scholars/manifests/${archetype.id}.json`,
      sectionCount: manifest.sections.length,
    };
  }

  writeJsonIfChanged(path.join(OUT_DIR, 'all.json'), index);

  console.log(`Generated ${Object.keys(index.manifests).length} blank Scholarly Edition manifests.`);
  console.log(`Index written to: platform/scholars/manifests/all.json`);
  if (errors > 0) {
    console.error(`${errors} manifest(s) failed validation.`);
    process.exit(1);
  }
}

main();
