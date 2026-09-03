#!/usr/bin/env node
/**
 * PuniCodex — Oracle Doctrine Corpus Tests
 *
 * Guards data/corpus/oracle-doctrine-examples.jsonl, produced by
 * scripts/generate-oracle-doctrine-corpus.js:
 *   - JSONL schema validity (OpenAI-style messages, served system prompt);
 *   - grounding spot-checks: sampled diacritic claims match the lexicon
 *     breakdown in entries.jsonl; script-honesty answers match the entry's
 *     originalScript label;
 *   - idempotency: regenerating produces a byte-identical file.
 */

'use strict';

const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CORPUS_DIR = path.join(ROOT, 'data', 'corpus');
const FILE = path.join(CORPUS_DIR, 'oracle-doctrine-examples.jsonl');
const ENTRIES_FILE = path.join(CORPUS_DIR, 'entries.jsonl');
const GENERATOR = path.join(ROOT, 'scripts', 'generate-oracle-doctrine-corpus.js');

const { ORACLE_SYSTEM_PROMPT } = require('../platform/api/oracle');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
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

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

let cache = null;
function examples() {
  if (!cache) cache = readJsonl(FILE);
  return cache;
}

let entryCache = null;
function entriesById() {
  if (!entryCache) {
    entryCache = new Map(readJsonl(ENTRIES_FILE).map((e) => [e.id, e]));
  }
  return entryCache;
}

test('oracle-doctrine-examples.jsonl exists and is non-empty valid JSONL', () => {
  assert.ok(
    fs.existsSync(FILE),
    'dataset file missing — run scripts/generate-oracle-doctrine-corpus.js'
  );
  assert.ok(examples().length >= 1000, `expected programmatic scale, got ${examples().length}`);
});

test('ids are unique', () => {
  const ids = new Set(examples().map((e) => e.id));
  assert.strictEqual(ids.size, examples().length);
});

test('every example has the served ORACLE_SYSTEM_PROMPT as its system message', () => {
  for (const ex of examples()) {
    assert.ok(
      Array.isArray(ex.messages) && ex.messages.length === 3,
      `${ex.id}: expected 3 messages`
    );
    assert.strictEqual(ex.messages[0].role, 'system', `${ex.id}: first message not system`);
    assert.strictEqual(
      ex.messages[0].content,
      ORACLE_SYSTEM_PROMPT,
      `${ex.id}: system message diverges from platform/api/oracle.js`
    );
    assert.strictEqual(ex.messages[1].role, 'user', `${ex.id}: second message not user`);
    assert.strictEqual(ex.messages[2].role, 'assistant', `${ex.id}: third message not assistant`);
    assert.ok(ex.messages[2].content.length > 0, `${ex.id}: empty assistant answer`);
  }
});

test('all four doctrine tasks are present', () => {
  const tasks = new Set(examples().map((e) => e.task));
  for (const task of [
    'diacritic_semantics',
    'script_honesty',
    'restoration_vs_ascii',
    'doctrine_boundary',
  ]) {
    assert.ok(tasks.has(task), `missing task ${task}`);
  }
});

test('diacritic_semantics answers are grounded in the entry breakdown', () => {
  const byId = entriesById();
  let checked = 0;
  for (const ex of examples().filter((e) => e.task === 'diacritic_semantics')) {
    const entry = byId.get(ex.entryId);
    assert.ok(entry, `${ex.id}: unknown entryId ${ex.entryId}`);
    const changed = (entry.breakdown || []).filter((b) => b.type !== 'same');
    assert.ok(changed.length > 0, `${ex.id}: entry has no non-same breakdown chars`);
    const answer = ex.messages[2].content;
    // Every marked letter and its canonical note must appear verbatim.
    for (const b of changed) {
      assert.ok(answer.includes(b.to), `${ex.id}: answer omits restored char "${b.to}"`);
      assert.ok(answer.includes(b.note), `${ex.id}: answer omits breakdown note "${b.note}"`);
    }
    checked++;
  }
  assert.ok(checked >= 500, `only ${checked} diacritic_semantics examples checked`);
});

test('restoration_vs_ascii answers name both forms and the lost marks', () => {
  const byId = entriesById();
  let checked = 0;
  for (const ex of examples().filter((e) => e.task === 'restoration_vs_ascii')) {
    const entry = byId.get(ex.entryId);
    assert.ok(entry, `${ex.id}: unknown entryId ${ex.entryId}`);
    const answer = ex.messages[2].content;
    assert.ok(answer.includes(entry.unicode), `${ex.id}: answer omits unicode form`);
    assert.ok(answer.includes(entry.ascii), `${ex.id}: answer omits ascii form`);
    assert.ok(answer.includes('lossy'), `${ex.id}: answer does not call ASCII a lossy fallback`);
    for (const b of (entry.breakdown || []).filter((x) => x.type !== 'same')) {
      assert.ok(answer.includes(b.to), `${ex.id}: answer omits lost mark "${b.to}"`);
    }
    checked++;
  }
  assert.ok(checked >= 500, `only ${checked} restoration_vs_ascii examples checked`);
});

test('script_honesty answers match the entry originalScript label', () => {
  const byId = entriesById();
  for (const ex of examples().filter((e) => e.task === 'script_honesty')) {
    const entry = byId.get(ex.entryId);
    assert.ok(entry?.originalScript?.label, `${ex.id}: entry lacks originalScript label`);
    const answer = ex.messages[2].content;
    if (entry.originalScript.label === 'Original Script') {
      assert.ok(
        answer.startsWith('<p>Yes.'),
        `${ex.id}: attested script answered as transliteration`
      );
      if (entry.originalScript.specimen) {
        assert.ok(
          answer.includes(entry.originalScript.specimen),
          `${ex.id}: answer omits specimen`
        );
      }
    } else {
      assert.ok(
        answer.startsWith('<p>No.'),
        `${ex.id}: transliteration answered as original script`
      );
      assert.ok(
        answer.includes('scholarly transliteration'),
        `${ex.id}: answer does not name the scholarly transliteration`
      );
    }
  }
});

test('doctrine_boundary refusals never strip diacritics or mislabel scripts', () => {
  const byId = entriesById();
  for (const ex of examples().filter((e) => e.task === 'doctrine_boundary')) {
    const answer = ex.messages[2].content;
    const boundary = ex.metadata?.boundary;
    if (boundary === 'strip_diacritics') {
      assert.ok(answer.includes("won't strip"), `${ex.id}: refusal does not decline stripping`);
      const entry = byId.get(ex.entryId);
      assert.ok(answer.includes(entry.unicode), `${ex.id}: refusal omits restored form`);
    }
    if (boundary === 'transliteration_not_original') {
      assert.ok(
        answer.includes('scholarly transliteration'),
        `${ex.id}: mislabels transliteration`
      );
    }
    if (boundary === 'egyptian_conventional_reading') {
      assert.strictEqual(byId.get(ex.entryId).pantheon, 'egyptian', `${ex.id}: non-egyptian entry`);
      assert.ok(answer.includes('conventional'), `${ex.id}: omits conventional-reading doctrine`);
    }
    if (boundary === 'iast_no_macron_on_e_o') {
      assert.strictEqual(byId.get(ex.entryId).pantheon, 'sanskrit', `${ex.id}: non-sanskrit entry`);
      assert.ok(answer.includes('IAST'), `${ex.id}: omits IAST doctrine`);
    }
  }
});

test('generator is idempotent (byte-identical rerun)', () => {
  const before = sha256(FILE);
  execFileSync(process.execPath, [GENERATOR], { cwd: ROOT, stdio: 'pipe' });
  const after = sha256(FILE);
  assert.strictEqual(after, before, 'rerun changed the dataset — generator is not deterministic');
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
  console.log(`\nOracle Doctrine Corpus Tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runSuite();
