#!/usr/bin/env node
/**
 * PuniCodex — Safety Corpus Regression Tests
 *
 * Guards the Phase 2 adversarial/safety instruction corpus.
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

test('safety-examples.jsonl exists and is valid JSONL', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'safety-examples.jsonl'));
  assert.ok(examples.length > 0, 'safety-examples.jsonl should not be empty');
});

test('safety examples contain required fields', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'safety-examples.jsonl'));
  const sample = examples.find((e) => e.task === 'safety_classify') || examples[0];

  assert.ok(sample.id, 'example has id');
  assert.ok(sample.entryId, 'example has entryId');
  assert.ok(sample.task, 'example has task');
  assert.ok(sample.instruction, 'example has instruction');
  assert.ok(sample.input, 'example has input');
  assert.ok(sample.output, 'example has output');
  assert.ok(sample.metadata, 'example has metadata');
  assert.ok(sample.metadata.family, 'metadata has family');
  assert.ok(sample.metadata.expectedVerdict, 'metadata has expectedVerdict');
});

test('safety corpus covers all adversarial families', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'safety-examples.jsonl'));
  const families = new Set(examples.map((e) => e.metadata.family));

  const expectedFamilies = [
    'single-confusable',
    'multi-confusable',
    'invisible-injection',
    'normalization-attack',
    'etld-subdomain',
    'path-query-homograph',
    'mixed-script-legitimate',
    'mixed-script-attack',
    'brand-disambiguation',
  ];

  for (const family of expectedFamilies) {
    assert.ok(families.has(family), `safety corpus missing family: ${family}`);
  }
});

test('safety corpus includes both deceptive and non-deceptive verdicts', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'safety-examples.jsonl'));
  const deceptiveFamilies = new Set([
    'single-confusable',
    'multi-confusable',
    'invisible-injection',
    'normalization-attack',
    'mixed-script-attack',
    'etld-subdomain',
    'path-query-homograph',
  ]);
  const nonDeceptiveFamilies = new Set(['mixed-script-legitimate', 'brand-disambiguation']);

  const hasDeceptive = examples.some((e) => deceptiveFamilies.has(e.metadata.family));
  const hasNonDeceptive = examples.some((e) => nonDeceptiveFamilies.has(e.metadata.family));

  assert.ok(hasDeceptive, 'safety corpus has deceptive examples');
  assert.ok(hasNonDeceptive, 'safety corpus has non-deceptive examples');
});

test('safety examples have unique ids', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'safety-examples.jsonl'));
  const ids = new Set(examples.map((e) => e.id));
  assert.strictEqual(ids.size, examples.length, 'safety example ids must be unique');
});

test('brand disambiguation examples are present', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'safety-examples.jsonl'));
  const brandExamples = examples.filter((e) => e.metadata.family === 'brand-disambiguation');
  assert.ok(brandExamples.length >= 10, 'expected at least 10 brand disambiguation examples');
});

test('punycode and URL analysis examples are present', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'safety-examples.jsonl'));
  const punycodeExamples = examples.filter((e) => e.task === 'safety_punycode');
  const urlExamples = examples.filter((e) => e.task === 'safety_url_analysis');
  assert.ok(punycodeExamples.length >= 100, 'expected at least 100 punycode examples');
  assert.ok(urlExamples.length >= 100, 'expected at least 100 URL analysis examples');
  for (const ex of punycodeExamples.slice(0, 10)) {
    assert.ok(ex.input.startsWith('xn--'), `punycode input must start with xn--: ${ex.input}`);
  }
});

test('train and eval splits include safety examples', () => {
  const train = readJsonl(path.join(CORPUS_DIR, 'instructions-train.jsonl'));
  const evalSet = readJsonl(path.join(CORPUS_DIR, 'eval.jsonl'));

  const trainSafety = train.filter((e) => String(e.task).startsWith('safety_'));
  const evalSafety = evalSet.filter((e) => String(e.task).startsWith('safety_'));

  assert.ok(trainSafety.length > 0, 'train split must contain safety examples');
  assert.ok(evalSafety.length > 0, 'eval split must contain safety examples');

  const trainFamilies = new Set(trainSafety.map((e) => e.metadata.family));
  const evalFamilies = new Set(evalSafety.map((e) => e.metadata.family));
  assert.ok(trainFamilies.size >= 5, 'train safety should cover multiple families');
  assert.ok(evalFamilies.size >= 5, 'eval safety should cover multiple families');
});

test('manifest.json includes safety corpus counts', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'manifest.json'), 'utf8'));
  assert.ok(manifest.counts.safetyExamples > 0, 'manifest must count safety examples');
  assert.ok(manifest.counts.safetyByTask, 'manifest must include safety by-task breakdown');
  assert.ok(
    Object.keys(manifest.counts.safetyByTask).length > 0,
    'safety by-task breakdown must not be empty'
  );
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
  console.log(`\nSafety Corpus Tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runSuite();
