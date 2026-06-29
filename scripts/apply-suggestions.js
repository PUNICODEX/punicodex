#!/usr/bin/env node
/**
 * PÚNYCODEX — Apply a suggestion batch to canonical sources.
 *
 * This script is the only automated path that may mutate canonical sources
 * from the authoritative import framework. It performs conservative edits and
 * records provenance for every change.
 *
 * Usage:
 *   node scripts/apply-suggestions.js data/authoritative/staging/suggestions/wikidata/2026-06-26T10-00-00Z.json
 */

const fs = require('node:fs');
const path = require('node:path');

const {
  loadLexicon,
  saveLexicon,
  updateLexiconScalar,
  loadSourceCatalog,
  saveSourceCatalog,
  updateSourceCatalog,
  loadOriginalScripts,
  saveOriginalScripts,
  updateOriginalScript,
} = require('./import-utils');

const ROOT = path.resolve(__dirname, '..');
const APPLIED_DIR = path.join(ROOT, 'data', 'authoritative', 'staging', 'applied');

// Suggestions below this confidence are not applied automatically.
const AUTO_APPLY_MIN_CONFIDENCE = 0.5;

// ═════════════════════════════════════════════════════════════════════════════
// CLI helpers
// ═════════════════════════════════════════════════════════════════════════════

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// ═════════════════════════════════════════════════════════════════════════════
// Apply logic per field
// ═════════════════════════════════════════════════════════════════════════════

const handlers = {
  meaning: (src, s) => updateLexiconScalar(src, s.id, 'meaning', s.value, 'domain'),
  greek: (src, s) => updateLexiconScalar(src, s.id, 'greek', s.value, 'unicode'),
  domain: (src, s) => updateLexiconScalar(src, s.id, 'domain', s.value, 'meaning'),

  sourceCatalog: (src, s) => {
    if (!s.key) throw new Error('sourceCatalog suggestion missing key');
    if (typeof s.value !== 'object') throw new Error('sourceCatalog value must be an object');
    return updateSourceCatalog(src, s.key, s.value);
  },

  originalScript: (src, s) => {
    if (typeof s.value !== 'object') throw new Error('originalScript value must be an object');
    return updateOriginalScript(src, s.id, s.value);
  },

  // These fields require more complex block editing and are not yet supported
  // automatically. The importer should flag them for manual review.
  etymology: (_src, s) => {
    throw new Error(
      `etymology suggestions are not yet auto-applied; review suggestion for ${s.id} manually`
    );
  },
  variant: (_src, s) => {
    throw new Error(
      `variant suggestions are not yet auto-applied; review suggestion for ${s.id} manually`
    );
  },
  lore: (_src, s) => {
    throw new Error(
      `lore suggestions are not yet auto-applied; review suggestion for ${s.id} manually`
    );
  },
};

function applySuggestion(sources, s) {
  if (s.confidence != null && s.confidence < AUTO_APPLY_MIN_CONFIDENCE) {
    throw new Error(
      `confidence ${s.confidence} is below auto-apply threshold ${AUTO_APPLY_MIN_CONFIDENCE}`
    );
  }

  const handler = handlers[s.field];
  if (!handler) throw new Error(`Unsupported field: ${s.field}`);

  if (s.field === 'sourceCatalog') {
    return { ...sources, sourceCatalog: handler(sources.sourceCatalogSrc, s) };
  }
  if (s.field === 'originalScript') {
    return { ...sources, originalScripts: handler(sources.originalScriptsSrc, s) };
  }
  return { ...sources, lexicon: handler(sources.lexiconSrc, s) };
}

// ═════════════════════════════════════════════════════════════════════════════
// Main
// ═════════════════════════════════════════════════════════════════════════════

function main() {
  const batchPath = process.argv[2];
  if (!batchPath) {
    console.error('Usage: node scripts/apply-suggestions.js <suggestion-batch.json>');
    process.exit(1);
  }

  if (!fs.existsSync(batchPath)) {
    fail(`Suggestion batch not found: ${batchPath}`);
  }

  const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
  if (!Array.isArray(batch.suggestions)) {
    fail('Suggestion batch must contain a suggestions array');
  }

  let sources = {
    lexiconSrc: loadLexicon(),
    sourceCatalogSrc: loadSourceCatalog(),
    originalScriptsSrc: loadOriginalScripts(),
  };

  const applied = [];
  const skipped = [];

  for (let i = 0; i < batch.suggestions.length; i++) {
    const s = batch.suggestions[i];
    try {
      sources = applySuggestion(sources, s);
      applied.push({
        index: i,
        id: s.id,
        field: s.field,
        confidence: s.confidence,
        authorityTier: s.authorityTier,
      });
      console.log(`  applied ${s.field} → ${s.id}`);
    } catch (err) {
      skipped.push({
        index: i,
        id: s.id,
        field: s.field,
        confidence: s.confidence,
        authorityTier: s.authorityTier,
        reason: err.message,
      });
      console.log(`  skipped ${s.field} → ${s.id}: ${err.message}`);
    }
  }

  // Write canonical files
  saveLexicon(sources.lexiconSrc);
  saveSourceCatalog(sources.sourceCatalogSrc);
  saveOriginalScripts(sources.originalScriptsSrc);

  // Record what was applied
  ensureDir(APPLIED_DIR);
  const appliedRecord = {
    batchPath: path.relative(ROOT, batchPath),
    source: batch.source,
    runId: batch.runId,
    appliedAt: new Date().toISOString(),
    applied,
    skipped,
  };
  const appliedPath = path.join(APPLIED_DIR, `${batch.source}-${batch.runId}.json`);
  fs.writeFileSync(appliedPath, `${JSON.stringify(appliedRecord, null, 2)}\n`, 'utf8');

  console.log('');
  console.log(`✓ Applied ${applied.length} suggestion(s)`);
  if (skipped.length > 0) {
    console.log(`✗ Skipped ${skipped.length} suggestion(s); see ${appliedPath}`);
  }
}

main();
