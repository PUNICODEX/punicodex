#!/usr/bin/env node
/**
 * PÚNYCODEX — Evaluation Benchmark Generator
 *
 * Splits the synthetic instruction data into a training set and a held-out
 * evaluation set. The split is deterministic (hash of example id) so it is
 * reproducible across runs and across machines.
 *
 * Outputs:
 *   - data/corpus/instructions-train.jsonl
 *   - data/corpus/eval.jsonl
 *
 * The existing data/corpus/instructions.jsonl is left untouched as the full
 * superset; training pipelines can use either instructions.jsonl minus eval
 * ids, or instructions-train.jsonl directly.
 *
 * Run: node scripts/generate-eval-benchmark.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const INSTRUCTIONS_PATH = path.join(ROOT, 'data', 'corpus', 'instructions.jsonl');
const TRAIN_PATH = path.join(ROOT, 'data', 'corpus', 'instructions-train.jsonl');
const EVAL_PATH = path.join(ROOT, 'data', 'corpus', 'eval.jsonl');

function hashString(str) {
  const hex = crypto.createHash('sha256').update(str).digest('hex');
  return parseInt(hex.slice(0, 8), 16);
}

function loadExamples() {
  return fs
    .readFileSync(INSTRUCTIONS_PATH, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function main() {
  const examples = loadExamples();
  const train = [];
  const evalSet = [];

  for (const ex of examples) {
    // 80% train, 20% eval
    if (hashString(ex.id) % 10 < 8) {
      train.push(ex);
    } else {
      evalSet.push(ex);
    }
  }

  fs.writeFileSync(TRAIN_PATH, train.map((ex) => JSON.stringify(ex)).join('\n') + '\n');
  fs.writeFileSync(EVAL_PATH, evalSet.map((ex) => JSON.stringify(ex)).join('\n') + '\n');

  console.log(`✓ Split ${examples.length} examples:`);
  console.log(`  train: ${train.length} → ${TRAIN_PATH}`);
  console.log(`  eval:  ${evalSet.length} → ${EVAL_PATH}`);
}

main();
