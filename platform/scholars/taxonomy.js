/**
 * PÚNYCODEX — Scholarly Edition Taxonomy Engine
 *
 * Canonical section registry for the 123 flagship Scholarly Editions.
 * Structure-first: defines what sections every temple may contain,
 * which are universal, which are pantheon-specific, and how they are
 * validated. The taxonomy is loaded from the authoritative JSON artifact
 * produced during Phase 1 archaeology.
 */

const fs = require('node:fs');
const path = require('node:path');

const TAXONOMY_PATH = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'scholarly-edition',
  'scholarly-section-taxonomy-v0.1.json'
);

const ARCHETYPES_PATH = path.join(__dirname, '..', '..', 'js', 'archetypes-v2.js');

let cachedTaxonomy = null;
let cachedArchetypes = null;

function loadTaxonomy() {
  if (cachedTaxonomy) return cachedTaxonomy;
  const raw = fs.readFileSync(TAXONOMY_PATH, 'utf8');
  cachedTaxonomy = JSON.parse(raw);
  return cachedTaxonomy;
}

function loadArchetypes() {
  if (cachedArchetypes) return cachedArchetypes;
  const { ARCHETYPES } = require(ARCHETYPES_PATH);
  cachedArchetypes = ARCHETYPES;
  return cachedArchetypes;
}

function resolveArchetype(entry) {
  if (entry && typeof entry === 'object' && entry.id) return entry;
  const id = String(entry);
  const archetypes = loadArchetypes();
  return archetypes.find((a) => a.id === id) || null;
}

function getUniversalSections() {
  return loadTaxonomy().taxonomy.universal.sections;
}

function getCommonSections() {
  return loadTaxonomy().taxonomy.common.sections;
}

function getOptionalSections() {
  return loadTaxonomy().taxonomy.optional.sections;
}

function getDeprecatedSections() {
  return loadTaxonomy().taxonomy.deprecated.sections;
}

function getPantheonKit(pantheon) {
  const kits = loadTaxonomy().taxonomy.pantheonKits.kits;
  const kit = kits[pantheon];
  if (!kit) return [];
  return kit.sections || [];
}

function getAllSectionKeys() {
  const tax = loadTaxonomy().taxonomy;
  const keys = new Set();
  for (const bucket of [tax.universal, tax.common, tax.optional]) {
    for (const section of bucket.sections) keys.add(section.key);
  }
  for (const pantheon of Object.keys(tax.pantheonKits.kits)) {
    for (const section of tax.pantheonKits.kits[pantheon].sections) {
      keys.add(section.key);
    }
  }
  return Array.from(keys);
}

function validateSectionKey(key) {
  const all = new Set(getAllSectionKeys());
  return all.has(String(key));
}

function isPantheonKitSection(pantheon, key) {
  return getPantheonKit(pantheon).some((s) => s.key === key);
}

function isDeprecatedSection(key) {
  return getDeprecatedSections().some((s) => s.key === key);
}

function getSectionSchema() {
  return loadTaxonomy().sectionSchema;
}

function getSectionDefinition(key) {
  const tax = loadTaxonomy().taxonomy;
  for (const bucket of [tax.universal, tax.common, tax.optional]) {
    const found = bucket.sections.find((s) => s.key === key);
    if (found)
      return {
        ...found,
        bucket:
          bucket === tax.universal ? 'universal' : bucket === tax.common ? 'common' : 'optional',
      };
  }
  for (const pantheon of Object.keys(tax.pantheonKits.kits)) {
    const found = tax.pantheonKits.kits[pantheon].sections.find((s) => s.key === key);
    if (found) return { ...found, bucket: 'pantheon-kit', pantheon };
  }
  const deprecated = tax.deprecated.sections.find((s) => s.key === key);
  if (deprecated) return { ...deprecated, bucket: 'deprecated' };
  return null;
}

function getSectionsForEntry(entry) {
  const archetype = resolveArchetype(entry);
  if (!archetype) {
    throw new Error(`Could not resolve archetype for entry: ${JSON.stringify(entry)}`);
  }
  const universal = getUniversalSections();
  const kit = getPantheonKit(archetype.pantheon);
  return [
    ...universal.map((s) => ({ ...s, required: true, source: 'universal' })),
    ...kit.map((s) => ({
      ...s,
      required: true,
      source: 'pantheon-kit',
      pantheon: archetype.pantheon,
    })),
  ];
}

function generateBlankSection(key) {
  const def = getSectionDefinition(key);
  if (!def) {
    throw new Error(`Unknown scholarly section key: ${key}`);
  }
  return {
    key: def.key,
    label: def.label,
    purpose: def.purpose || null,
    body: '',
    sources: [],
    media: [],
    editorNotes: '',
    status: 'empty',
    taxonomyVersion: loadTaxonomy().version,
    lastModifiedAt: null,
    lastModifiedBy: null,
  };
}

function generateBlankManifest(entry) {
  const archetype = resolveArchetype(entry);
  if (!archetype) {
    throw new Error(`Could not resolve archetype for entry: ${JSON.stringify(entry)}`);
  }
  const sections = getSectionsForEntry(archetype);
  return {
    entryId: archetype.id,
    name: archetype.name,
    pantheon: archetype.pantheon,
    tier: archetype.tier,
    taxonomyVersion: loadTaxonomy().version,
    generatedAt: new Date().toISOString(),
    sections: sections.map((s) => generateBlankSection(s.key)),
  };
}

function validateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object') {
    errors.push('Manifest must be an object.');
    return errors;
  }
  if (!manifest.entryId) errors.push('Manifest missing entryId.');
  if (!manifest.taxonomyVersion) errors.push('Manifest missing taxonomyVersion.');
  if (!Array.isArray(manifest.sections)) {
    errors.push('Manifest sections must be an array.');
    return errors;
  }
  const seen = new Set();
  for (const section of manifest.sections) {
    if (!section.key) {
      errors.push('Section missing key.');
      continue;
    }
    if (seen.has(section.key)) {
      errors.push(`Duplicate section key: ${section.key}`);
    }
    seen.add(section.key);
    if (!validateSectionKey(section.key)) {
      errors.push(`Invalid section key: ${section.key}`);
    }
    if (isDeprecatedSection(section.key)) {
      errors.push(`Deprecated section key used: ${section.key}`);
    }
  }
  return errors;
}

function getTaxonomyVersion() {
  return loadTaxonomy().version;
}

function getEmpirical() {
  return loadTaxonomy().empirical;
}

module.exports = {
  loadTaxonomy,
  getUniversalSections,
  getCommonSections,
  getOptionalSections,
  getDeprecatedSections,
  getPantheonKit,
  getAllSectionKeys,
  validateSectionKey,
  isPantheonKitSection,
  isDeprecatedSection,
  getSectionSchema,
  getSectionDefinition,
  getSectionsForEntry,
  generateBlankSection,
  generateBlankManifest,
  validateManifest,
  getTaxonomyVersion,
  getEmpirical,
};
