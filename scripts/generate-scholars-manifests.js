#!/usr/bin/env node
/**
 * Generate Scholarly Edition manifests for all 123 flagships.
 *
 * These manifests define the structure (sections) each Scholars tab will
 * contain. Sections with canonical content in
 * `platform/scholars/content/{id}.json` (produced by
 * `scripts/generate-scholars-content.js`) are merged in as published
 * sections; the rest begin empty and ready for university contributions.
 */

const fs = require('node:fs');
const path = require('node:path');
const { ARCHETYPES } = require('../js/archetypes-v2.js');
const { generateBlankManifest, validateManifest, getTaxonomyVersion } = require('../platform/scholars/taxonomy');

const OUT_DIR = path.join(__dirname, '..', 'platform', 'scholars', 'manifests');
const CONTENT_DIR = path.join(__dirname, '..', 'platform', 'scholars', 'content');

const ADMIN_NAME = 'PÚNYCODEX Admin';
const ADMIN_NOTE = 'Synthesized from canonical sources by PÚNYCODEX Admin.';

function loadContent(entryId) {
  const file = path.join(CONTENT_DIR, `${entryId}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

function mergeContentIntoManifest(manifest, content) {
  if (!content || !content.sections) return manifest;
  for (const section of manifest.sections) {
    const entry = content.sections[section.key];
    if (!entry || typeof entry.body !== 'string' || entry.body.trim() === '') continue;
    section.body = entry.body;
    section.sources = Array.isArray(entry.sources) ? entry.sources : [];
    section.status = 'published';
    section.editorNotes = ADMIN_NOTE;
    section.lastModifiedBy = ADMIN_NAME;
    // The database tracks real timestamps; manifests stay deterministic.
    section.lastModifiedAt = null;
  }
  return manifest;
}

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
  let sectionsPublished = 0;
  for (const archetype of built) {
    const content = loadContent(archetype.id);
    const manifest = mergeContentIntoManifest(generateBlankManifest(archetype.id), content);
    const validationErrors = validateManifest(manifest);
    if (validationErrors.length > 0) {
      console.error(`Validation failed for ${archetype.id}:`, validationErrors);
      errors += 1;
      continue;
    }

    const filePath = path.join(OUT_DIR, `${archetype.id}.json`);
    writeJsonIfChanged(filePath, manifest);
    sectionsPublished += manifest.sections.filter((s) => s.status === 'published').length;
    index.manifests[archetype.id] = {
      name: archetype.name,
      pantheon: archetype.pantheon,
      tier: archetype.tier,
      path: `platform/scholars/manifests/${archetype.id}.json`,
      sectionCount: manifest.sections.length,
    };
  }

  writeJsonIfChanged(path.join(OUT_DIR, 'all.json'), index);

  console.log(`Generated ${Object.keys(index.manifests).length} Scholarly Edition manifests.`);
  console.log(`Merged canonical content into ${sectionsPublished} published sections.`);
  console.log(`Index written to: platform/scholars/manifests/all.json`);
  if (errors > 0) {
    console.error(`${errors} manifest(s) failed validation.`);
    process.exit(1);
  }
}

main();
