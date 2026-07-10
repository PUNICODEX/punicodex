#!/usr/bin/env node
/**
 * PÚNYCODEX — Model Corpus Regression Tests
 *
 * Guards the AI-training corpus artifacts so that `npm run generate`
 * always emits a complete, schema-valid, lexicon-consistent dataset.
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CORPUS_DIR = path.join(ROOT, 'data', 'corpus');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function readJsonl(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line, idx) => {
      try {
        return JSON.parse(line);
      } catch (err) {
        throw new Error(`Invalid JSON on line ${idx + 1} of ${filePath}: ${err.message}`);
      }
    });
}

function loadLexicon() {
  const lexiconPath = path.join(ROOT, 'type', 'js', 'lexicon.js');
  const code = fs.readFileSync(lexiconPath, 'utf8').replace('const LEXICON', 'var LEXICON');
  return new Function(`${code}; return LEXICON;`)();
}

test('entries.jsonl exists and is valid JSONL', () => {
  const entries = readJsonl(path.join(CORPUS_DIR, 'entries.jsonl'));
  assert.ok(entries.length > 0, 'entries.jsonl should not be empty');
});

test('entries.jsonl has one record per lexicon entry', () => {
  const lexicon = loadLexicon();
  const entries = readJsonl(path.join(CORPUS_DIR, 'entries.jsonl'));
  assert.strictEqual(
    entries.length,
    lexicon.length,
    `entries.jsonl count (${entries.length}) must match lexicon count (${lexicon.length})`
  );
});

test('sample entry contains required corpus fields', () => {
  const entries = readJsonl(path.join(CORPUS_DIR, 'entries.jsonl'));
  const entry = entries.find((e) => e.id === 'apollon') || entries[0];

  assert.ok(entry.id, 'entry has id');
  assert.ok(entry.ascii, 'entry has ascii');
  assert.ok(entry.unicode, 'entry has unicode');
  assert.ok(entry.pantheon, 'entry has pantheon');
  assert.ok(entry.tier, 'entry has tier');
  assert.ok(entry.tierLabel, 'entry has tierLabel');
  assert.ok(entry.meaning, 'entry has meaning');
  assert.ok(entry.originalScript, 'entry has originalScript block');
  assert.ok(entry.pronunciation || entry.pronunciation === null, 'entry has pronunciation block');
  assert.ok(Array.isArray(entry.breakdown), 'entry has breakdown array');
  assert.ok(Array.isArray(entry.variants), 'entry has variants array');
  assert.ok(entry.ownership, 'entry has ownership block');
  assert.ok(entry.flagship, 'entry has flagship block');
  assert.ok(entry.metadata, 'entry has metadata block');
  assert.ok(entry.metadata.dataVersion, 'entry has dataVersion');
});

test('manifest.json exists and matches entries count', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'manifest.json'), 'utf8'));
  const entries = readJsonl(path.join(CORPUS_DIR, 'entries.jsonl'));

  assert.ok(manifest.version, 'manifest has version');
  assert.ok(manifest.generatedAt, 'manifest has generatedAt');
  assert.strictEqual(
    manifest.counts.entries,
    entries.length,
    'manifest entries count matches file'
  );
  assert.ok(manifest.canonicalSources, 'manifest has canonicalSources');
  assert.ok(manifest.canonicalHashes, 'manifest has canonicalHashes');
});

test('instructions.jsonl exists and is valid JSONL', () => {
  const instructions = readJsonl(path.join(CORPUS_DIR, 'instructions.jsonl'));
  assert.ok(instructions.length > 0, 'instructions.jsonl should not be empty');
});

test('instructions-train.jsonl and eval.jsonl split from instructions.jsonl', () => {
  const all = readJsonl(path.join(CORPUS_DIR, 'instructions.jsonl'));
  const train = readJsonl(path.join(CORPUS_DIR, 'instructions-train.jsonl'));
  const evalSet = readJsonl(path.join(CORPUS_DIR, 'eval.jsonl'));

  assert.strictEqual(train.length + evalSet.length, all.length, 'train + eval must equal full set');

  const allIds = new Set(all.map((ex) => ex.id));
  const trainIds = new Set(train.map((ex) => ex.id));
  const evalIds = new Set(evalSet.map((ex) => ex.id));

  assert.strictEqual(trainIds.size, train.length, 'train ids must be unique');
  assert.strictEqual(evalIds.size, evalSet.length, 'eval ids must be unique');

  for (const id of evalIds) {
    assert.ok(allIds.has(id), `eval id ${id} must exist in full instructions`);
    assert.ok(!trainIds.has(id), `eval id ${id} must not leak into train`);
  }
});

async function runSuite() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${err.message.split('\n').join('\n    ')}`);
    }
  }
  console.log(`\nModel Corpus Tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runSuite();
