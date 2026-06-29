#!/usr/bin/env node
/**
 * PÚNYCODEX — Authoritative import runner
 *
 * Runs importer modules from `data/authoritative/importers/{source}.js`,
 * stores raw snapshots, and writes normalized suggestion batches.
 *
 * Usage:
 *   node scripts/import-runner.js
 *   node scripts/import-runner.js wikidata
 *   node scripts/import-runner.js wikidata --run-id 2026-06-26-wikidata
 *   node scripts/import-runner.js wikidata --dry-run
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const IMPORTERS_DIR = path.join(ROOT, 'data', 'authoritative', 'importers');
const SNAPSHOTS_DIR = path.join(ROOT, 'data', 'authoritative', 'snapshots');
const SUGGESTIONS_DIR = path.join(ROOT, 'data', 'authoritative', 'staging', 'suggestions');

const LEXICON_PATH = path.join(ROOT, 'type', 'js', 'lexicon.js');
const SOURCE_CATALOG_PATH = path.join(ROOT, 'type', 'js', 'source-catalog.js');

// ═════════════════════════════════════════════════════════════════════════════
// CLI helpers
// ═════════════════════════════════════════════════════════════════════════════

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  const arrays = new Set(['args']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        const val = argv[i + 1];
        flags[key] = arrays.has(key) ? [...(flags[key] || []), val] : val;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function getFlag(flags, key, fallback) {
  const val = flags[key];
  if (val === undefined) return fallback;
  return val;
}

function listImporters() {
  if (!fs.existsSync(IMPORTERS_DIR)) return [];
  return fs
    .readdirSync(IMPORTERS_DIR)
    .filter((f) => f.endsWith('.js'))
    .map((f) => f.replace(/\.js$/, ''));
}

// ═════════════════════════════════════════════════════════════════════════════
// Canonical source loaders
// ═════════════════════════════════════════════════════════════════════════════

function loadLexicon() {
  const code = fs.readFileSync(LEXICON_PATH, 'utf8').replace('const LEXICON', 'var LEXICON');
  return new Function(`${code}; return LEXICON;`)();
}

function loadSourceCatalog() {
  const { SOURCE_CATALOG } = require(SOURCE_CATALOG_PATH);
  return SOURCE_CATALOG;
}

// ═════════════════════════════════════════════════════════════════════════════
// Snapshot / suggestion I/O
// ═════════════════════════════════════════════════════════════════════════════

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function sanitizeRunId(id) {
  return String(id).replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function writeSnapshot(source, runId, data, contentType) {
  ensureDir(path.join(SNAPSHOTS_DIR, source));
  const ext = contentType?.includes('application/json') ? 'json' : 'bin';
  const filePath = path.join(SNAPSHOTS_DIR, source, `${runId}.${ext}`);
  if (Buffer.isBuffer(data)) {
    fs.writeFileSync(filePath, data);
  } else {
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }
  return filePath;
}

function writeSuggestions(batch) {
  ensureDir(path.join(SUGGESTIONS_DIR, batch.source));
  const filePath = path.join(SUGGESTIONS_DIR, batch.source, `${batch.runId}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(batch, null, 2)}\n`, 'utf8');
  return filePath;
}

function _loadLatestSuggestions(source) {
  const dir = path.join(SUGGESTIONS_DIR, source);
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  if (files.length === 0) return null;
  const latest = path.join(dir, files[files.length - 1]);
  return JSON.parse(fs.readFileSync(latest, 'utf8'));
}

// ═════════════════════════════════════════════════════════════════════════════
// Network helper
// ═════════════════════════════════════════════════════════════════════════════

async function fetchText(url, opts = {}) {
  const timeoutMs = opts.timeout ?? 15000;
  const signal =
    opts.signal ??
    (typeof AbortSignal !== 'undefined' && AbortSignal.timeout
      ? AbortSignal.timeout(timeoutMs)
      : undefined);
  const res = await fetch(url, { ...opts, signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const contentType = res.headers.get('content-type') || '';
  const buffer = Buffer.from(await res.arrayBuffer());
  const text = buffer.toString('utf8');
  let json = null;
  if (contentType.includes('application/json')) {
    try {
      json = JSON.parse(text);
    } catch {
      // leave json null
    }
  }
  return {
    ok: true,
    status: res.status,
    contentType,
    text,
    buffer,
    url,
    textAsync: async () => text,
    jsonAsync: async () => json,
    json: async () => json,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Validation
// ═════════════════════════════════════════════════════════════════════════════

const REQUIRED_SUGGESTION_FIELDS = new Set(['id', 'field', 'value', 'provenance']);
const SUPPORTED_FIELDS = new Set([
  'meaning',
  'greek',
  'domain',
  'etymology',
  'variant',
  'sourceCatalog',
  'originalScript',
  'lore',
]);

function validateSuggestion(s, index) {
  for (const field of REQUIRED_SUGGESTION_FIELDS) {
    if (!(field in s)) {
      throw new Error(`Suggestion #${index} missing required field: ${field}`);
    }
  }
  if (!SUPPORTED_FIELDS.has(s.field)) {
    throw new Error(`Suggestion #${index} has unsupported field: ${s.field}`);
  }
  if (!s.provenance || typeof s.provenance !== 'object') {
    throw new Error(`Suggestion #${index} provenance must be an object`);
  }
  if (!s.provenance.source || !s.provenance.retrievedAt) {
    throw new Error(`Suggestion #${index} provenance must include source and retrievedAt`);
  }
}

function summarizeBatch(batch) {
  const byField = {};
  for (const s of batch.suggestions) {
    byField[s.field] = (byField[s.field] || 0) + 1;
  }
  const ids = [...new Set(batch.suggestions.map((s) => s.id))];
  return {
    source: batch.source,
    runId: batch.runId,
    retrievedAt: batch.retrievedAt,
    license: batch.license,
    total: batch.suggestions.length,
    ids: ids.length,
    byField,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Main
// ═════════════════════════════════════════════════════════════════════════════

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const dryRun = flags['dry-run'] === true;

  if (positional.length === 0) {
    const importers = listImporters();
    console.log('PÚNYCODEX import runner');
    console.log('');
    if (importers.length === 0) {
      console.log('No importers found in data/authoritative/importers/');
    } else {
      console.log('Available importers:');
      for (const name of importers) {
        const mod = require(path.join(IMPORTERS_DIR, `${name}.js`));
        console.log(
          `  ${name.padEnd(20)} ${mod.name || ''} (${mod.requiresOnline ? 'online' : 'offline'})`
        );
      }
    }
    console.log('');
    console.log('Usage: node scripts/import-runner.js <source> [--run-id <id>] [--dry-run]');
    process.exit(0);
  }

  const source = positional[0];
  const importerPath = path.join(IMPORTERS_DIR, `${source}.js`);
  if (!fs.existsSync(importerPath)) {
    console.error(`Importer not found: ${source}`);
    process.exit(1);
  }

  const importer = require(importerPath);
  if (typeof importer.run !== 'function') {
    console.error(`Importer ${source} must export a run() function`);
    process.exit(1);
  }

  const runId = sanitizeRunId(
    getFlag(flags, 'run-id', new Date().toISOString().replace(/[:]/g, '-'))
  );
  const extraArgs = getFlag(flags, 'args', []);
  const argMap = {};
  for (const raw of Array.isArray(extraArgs) ? extraArgs : [extraArgs]) {
    const [k, ...rest] = String(raw).split('=');
    argMap[k] = rest.join('=');
  }

  const lexicon = loadLexicon();
  const sourceCatalog = loadSourceCatalog();

  const ctx = {
    lexicon,
    sourceCatalog,
    args: argMap,
    fetch: fetchText,
    writeSnapshot: (data, contentType) => writeSnapshot(source, runId, data, contentType),
    readSnapshot: () => {
      const snapshotDir = path.join(SNAPSHOTS_DIR, source);
      if (!fs.existsSync(snapshotDir)) return null;
      const files = fs.readdirSync(snapshotDir).filter((f) => f.startsWith(runId));
      if (files.length === 0) return null;
      const p = path.join(snapshotDir, files[0]);
      const buf = fs.readFileSync(p);
      if (p.endsWith('.json')) return JSON.parse(buf.toString('utf8'));
      return buf;
    },
  };

  console.log(`▸ Running importer: ${source} (runId: ${runId})`);
  if (dryRun) {
    console.log('  dry-run mode: no files will be written');
  }

  const result = await importer.run(ctx);
  const batch = {
    source: importer.source || source,
    runId,
    retrievedAt: new Date().toISOString(),
    license: importer.defaultLicense || result.license || 'unknown',
    url: result.url || '',
    suggestions: result.suggestions || [],
  };

  for (let i = 0; i < batch.suggestions.length; i++) {
    validateSuggestion(batch.suggestions[i], i);
  }

  if (dryRun) {
    const summary = summarizeBatch(batch);
    console.log('\nDry-run summary:');
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  }

  const suggestionPath = writeSuggestions(batch);
  console.log(`✓ Wrote ${batch.suggestions.length} suggestions to ${suggestionPath}`);

  if (result.snapshot) {
    const snapshotPath = writeSnapshot(source, runId, result.snapshot, result.snapshotContentType);
    console.log(`✓ Wrote snapshot to ${snapshotPath}`);
  }
}

main().catch((err) => {
  console.error('Import runner failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
