#!/usr/bin/env node
/**
 * PuniCodex — Evaluation Benchmark Suite Generator (Phase 8)
 *
 * Emits a held-out evaluation benchmark with known answers across all tasks.
 * This is separate from the train/eval split and is designed for repeatable
 * model evaluation before deployment.
 *
 * Output: data/corpus/benchmark.jsonl
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const ENTRIES_PATH = path.join(ROOT, 'data', 'corpus', 'entries.jsonl');
const SAFETY_PATH = path.join(ROOT, 'data', 'corpus', 'safety-examples.jsonl');
const OUT_PATH = path.join(ROOT, 'data', 'corpus', 'benchmark.jsonl');

function loadEntries() {
  const text = fs.readFileSync(ENTRIES_PATH, 'utf8');
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function loadSafety() {
  if (!fs.existsSync(SAFETY_PATH)) return [];
  const text = fs.readFileSync(SAFETY_PATH, 'utf8');
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function makeId(entryId, task, index) {
  return `bench-${entryId}-${task}-${String(index).padStart(4, '0')}`;
}

function deterministicSample(arr, n, seed) {
  const sorted = arr.slice().sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const out = [];
  let hash = crypto.createHash('sha256').update(seed).digest('hex');
  for (let i = 0; i < n && sorted.length; i++) {
    const idx = parseInt(hash.slice(0, 8), 16) % sorted.length;
    out.push(sorted[idx]);
    sorted.splice(idx, 1);
    hash = crypto.createHash('sha256').update(hash).digest('hex');
  }
  return out;
}

function buildRestorationBenchmark(entry, index) {
  return {
    id: makeId(entry.id, 'restoration', index),
    entryId: entry.id,
    task: 'benchmark_restoration',
    type: 'exact_match',
    question: `What is the Unicode restoration of ${entry.ascii}?`,
    input: entry.ascii,
    answer: entry.unicode,
    acceptable: [entry.unicode, entry.unicode.toLowerCase()],
    metadata: { pantheon: entry.pantheon, tier: entry.tier },
  };
}

function buildPronunciationBenchmark(entry, index) {
  const p = entry.pronunciation;
  if (!p?.ipa) return null;
  return {
    id: makeId(entry.id, 'pronunciation', index),
    entryId: entry.id,
    task: 'benchmark_pronunciation',
    type: 'contains',
    question: `How is ${entry.unicode} pronounced in IPA?`,
    input: entry.unicode,
    answer: p.ipa,
    acceptable: [p.ipa],
    metadata: { confidence: p.confidence },
  };
}

function buildMeaningBenchmark(entry, index) {
  return {
    id: makeId(entry.id, 'meaning', index),
    entryId: entry.id,
    task: 'benchmark_meaning',
    type: 'contains',
    question: `What does ${entry.unicode} mean?`,
    input: entry.unicode,
    answer: entry.meaning,
    acceptable: [entry.meaning],
    metadata: { pantheon: entry.pantheon },
  };
}

function buildTierBenchmark(entry, index) {
  return {
    id: makeId(entry.id, 'tier', index),
    entryId: entry.id,
    task: 'benchmark_tier',
    type: 'exact_match',
    question: `What tier is ${entry.unicode}?`,
    input: entry.unicode,
    answer: entry.tierLabel,
    acceptable: [entry.tierLabel, entry.tierLabel.toLowerCase()],
    metadata: { tier: entry.tier },
  };
}

function buildPunycodeBenchmark(entry, index) {
  if (!entry.punycodeDomain) return null;
  return {
    id: makeId(entry.id, 'punycode', index),
    entryId: entry.id,
    task: 'benchmark_punycode',
    type: 'exact_match',
    question: `What is the punycode domain for ${entry.unicodeDomain}?`,
    input: entry.unicodeDomain,
    answer: entry.punycodeDomain,
    acceptable: [entry.punycodeDomain],
    metadata: { owned: entry.ownership.isOwned },
  };
}

function buildSafetyBenchmark(safety, index) {
  return {
    id: `bench-${safety.id}`,
    entryId: safety.entryId,
    task: 'benchmark_safety',
    type: 'contains',
    question: safety.instruction,
    input: safety.input,
    answer: safety.output,
    acceptable: [safety.output],
    metadata: { family: safety.metadata.family, expectedVerdict: safety.metadata.expectedVerdict },
  };
}

function buildOriginalScriptBenchmark(entry, index) {
  const os = entry.originalScript;
  if (!os?.specimen) return null;
  return {
    id: makeId(entry.id, 'original_script', index),
    entryId: entry.id,
    task: 'benchmark_original_script',
    type: 'contains',
    question: `What is the original script specimen for ${entry.unicode}?`,
    input: entry.unicode,
    answer: os.specimen,
    acceptable: [os.specimen],
    metadata: { scriptName: os.scriptName },
  };
}

function main() {
  const entries = loadEntries();
  const safety = loadSafety();
  const examples = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    examples.push(
      buildRestorationBenchmark(entry, i + 1),
      buildPronunciationBenchmark(entry, i + 1),
      buildMeaningBenchmark(entry, i + 1),
      buildTierBenchmark(entry, i + 1),
      buildPunycodeBenchmark(entry, i + 1),
      buildOriginalScriptBenchmark(entry, i + 1)
    );
  }

  const safetyBench = deterministicSample(safety, 1000, 'safety-benchmark-v1');
  for (const s of safetyBench) {
    examples.push(buildSafetyBenchmark(s, 0));
  }

  const validExamples = examples.filter(Boolean);
  const lines = validExamples.map((ex) => JSON.stringify(ex));
  fs.writeFileSync(OUT_PATH, lines.join('\n') + '\n');

  const byTask = {};
  for (const ex of validExamples) {
    byTask[ex.task] = (byTask[ex.task] || 0) + 1;
  }

  console.log(`✓ Generated ${validExamples.length} benchmark examples to ${OUT_PATH}`);
  console.log(`  by task: ${JSON.stringify(byTask, null, 2)}`);
}

main();
