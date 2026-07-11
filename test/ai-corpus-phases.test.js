#!/usr/bin/env node
/**
 * PÚNYCODEX — AI Corpus Phases Regression Tests (Phases 3-9)
 *
 * Guards the dialogue, tool-use, multimodal, preference, reasoning, benchmark,
 * and data-card artifacts produced by `npm run generate`.
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

function loadManifest() {
  return JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'manifest.json'), 'utf8'));
}

const CORPORA = [
  { file: 'dialogue-examples.jsonl', key: 'dialogueExamples' },
  { file: 'tool-use-examples.jsonl', key: 'toolUseExamples' },
  { file: 'multimodal-examples.jsonl', key: 'multimodalExamples' },
  { file: 'preference-examples.jsonl', key: 'preferenceExamples' },
  { file: 'reasoning-examples.jsonl', key: 'reasoningExamples' },
  { file: 'benchmark.jsonl', key: 'benchmarkExamples' },
];

for (const { file, key } of CORPORA) {
  test(`${file} exists and is valid JSONL`, () => {
    const examples = readJsonl(path.join(CORPUS_DIR, file));
    assert.ok(examples.length > 0, `${file} should not be empty`);
  });

  test(`${file} examples have unique ids`, () => {
    const examples = readJsonl(path.join(CORPUS_DIR, file));
    const ids = new Set(examples.map((e) => e.id));
    assert.strictEqual(ids.size, examples.length, `${file} ids must be unique`);
  });

  test(`${file} count is reflected in manifest`, () => {
    const manifest = loadManifest();
    const examples = readJsonl(path.join(CORPUS_DIR, file));
    assert.strictEqual(
      manifest.counts[key],
      examples.length,
      `manifest count ${key} must match ${file}`
    );
  });
}

test('dialogue examples have OpenAI-compatible messages', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'dialogue-examples.jsonl'));
  const sample = examples[0];
  assert.ok(Array.isArray(sample.messages), 'dialogue example has messages array');
  assert.ok(sample.messages.length >= 2, 'dialogue has at least two turns');
  for (const m of sample.messages) {
    assert.ok(
      ['user', 'assistant', 'system', 'tool'].includes(m.role),
      `message has valid role: ${m.role}`
    );
    assert.ok(typeof m.content === 'string', 'message content is a string');
  }
});

test('dialogue tasks cover expected categories', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'dialogue-examples.jsonl'));
  const tasks = new Set(examples.map((e) => e.task));
  const expected = [
    'dialogue_restoration',
    'dialogue_pronunciation',
    'dialogue_mythology',
    'dialogue_etymology',
    'dialogue_safety',
    'dialogue_variants',
  ];
  for (const task of expected) {
    assert.ok(tasks.has(task), `dialogue corpus missing task: ${task}`);
  }
});

test('tool-use examples include tools array and tool_calls', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'tool-use-examples.jsonl'));
  const sample = examples.find((e) => e.task === 'tool_convert') || examples[0];
  assert.ok(Array.isArray(sample.tools), 'tool-use example has tools array');
  assert.ok(sample.tools.length > 0, 'tools array is not empty');
  const assistantMsg = sample.messages.find((m) => m.role === 'assistant');
  assert.ok(assistantMsg, 'tool-use example has assistant message');
  assert.ok(
    Array.isArray(assistantMsg.tool_calls) || assistantMsg.content,
    'assistant message has tool_calls or content'
  );
});

test('tool-use tasks cover expected categories', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'tool-use-examples.jsonl'));
  const tasks = new Set(examples.map((e) => e.task));
  const expected = [
    'tool_convert',
    'tool_check',
    'tool_search',
    'tool_get_entry',
    'tool_analyze_url',
  ];
  for (const task of expected) {
    assert.ok(tasks.has(task), `tool-use corpus missing task: ${task}`);
  }
});

test('multimodal examples reference valid image assets or glyphs', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'multimodal-examples.jsonl'));
  const imageExamples = examples.filter((e) => e.image);
  for (const ex of imageExamples.slice(0, 20)) {
    const relPath = ex.image.replace(/^\//, '');
    assert.ok(
      fs.existsSync(path.join(ROOT, relPath)),
      `multimodal image asset must exist: ${ex.image}`
    );
  }
});

test('multimodal tasks cover expected categories', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'multimodal-examples.jsonl'));
  const tasks = new Set(examples.map((e) => e.task));
  const expected = [
    'multimodal_mascot',
    'multimodal_logomark',
    'multimodal_script',
    'multimodal_glyph',
  ];
  for (const task of expected) {
    assert.ok(tasks.has(task), `multimodal corpus missing task: ${task}`);
  }
});

test('preference examples have chosen and rejected responses', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'preference-examples.jsonl'));
  const sample = examples[0];
  assert.ok(typeof sample.chosen === 'string', 'preference example has chosen string');
  assert.ok(typeof sample.rejected === 'string', 'preference example has rejected string');
  assert.notStrictEqual(sample.chosen, sample.rejected, 'chosen and rejected must differ');
});

test('preference tasks cover scholarly and safety dimensions', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'preference-examples.jsonl'));
  const tasks = new Set(examples.map((e) => e.task));
  const expected = [
    'preference_restoration',
    'preference_pronunciation',
    'preference_safety',
    'preference_sources',
    'preference_variants',
  ];
  for (const task of expected) {
    assert.ok(tasks.has(task), `preference corpus missing task: ${task}`);
  }
});

test('reasoning examples contain chain-of-thought structure', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'reasoning-examples.jsonl'));
  const sample = examples[0];
  assert.ok(sample.output.includes('.'), 'reasoning output contains sentences');
  assert.ok(
    /\b(1\.|Step|Therefore|because|Reasoning)\b/i.test(sample.output),
    'reasoning output has explicit structure'
  );
});

test('reasoning tasks cover expected categories', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'reasoning-examples.jsonl'));
  const tasks = new Set(examples.map((e) => e.task));
  const expected = [
    'reasoning_breakdown',
    'reasoning_tier',
    'reasoning_etymology',
    'reasoning_safety',
    'reasoning_original_script',
  ];
  for (const task of expected) {
    assert.ok(tasks.has(task), `reasoning corpus missing task: ${task}`);
  }
});

test('benchmark examples have known answers and types', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'benchmark.jsonl'));
  const sample = examples[0];
  assert.ok(sample.question, 'benchmark has question');
  assert.ok(sample.answer, 'benchmark has answer');
  assert.ok(['exact_match', 'contains'].includes(sample.type), 'benchmark has valid type');
  assert.ok(Array.isArray(sample.acceptable), 'benchmark has acceptable answers array');
});

test('benchmark covers scholarly and safety tasks', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'benchmark.jsonl'));
  const tasks = new Set(examples.map((e) => e.task));
  const expected = [
    'benchmark_restoration',
    'benchmark_pronunciation',
    'benchmark_meaning',
    'benchmark_tier',
    'benchmark_punycode',
    'benchmark_original_script',
    'benchmark_safety',
  ];
  for (const task of expected) {
    assert.ok(tasks.has(task), `benchmark missing task: ${task}`);
  }
});

test('data card exists and documents all corpora', () => {
  const md = fs.readFileSync(path.join(CORPUS_DIR, 'DATA_CARD.md'), 'utf8');
  assert.ok(md.includes('Phase 1'), 'data card mentions Phase 1');
  assert.ok(md.includes('Phase 9'), 'data card mentions Phase 9');
  for (const { file } of CORPORA) {
    assert.ok(md.includes(file), `data card mentions ${file}`);
  }
});

test('manifest includes by-task breakdowns for all new corpora', () => {
  const manifest = loadManifest();
  assert.ok(manifest.counts.dialogueByTask, 'manifest has dialogueByTask');
  assert.ok(manifest.counts.toolUseByTask, 'manifest has toolUseByTask');
  assert.ok(manifest.counts.multimodalByTask, 'manifest has multimodalByTask');
  assert.ok(manifest.counts.preferenceByTask, 'manifest has preferenceByTask');
  assert.ok(manifest.counts.reasoningByTask, 'manifest has reasoningByTask');
  assert.ok(manifest.counts.benchmarkByTask, 'manifest has benchmarkByTask');
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
  console.log(`\nAI Corpus Phases Tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runSuite();
