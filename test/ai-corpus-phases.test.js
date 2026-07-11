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
  { file: 'instructions.jsonl', key: 'instructions' },
  { file: 'safety-examples.jsonl', key: 'safetyExamples' },
  { file: 'dialogue-examples.jsonl', key: 'dialogueExamples' },
  { file: 'tool-use-examples.jsonl', key: 'toolUseExamples' },
  { file: 'multimodal-examples.jsonl', key: 'multimodalExamples' },
  { file: 'preference-examples.jsonl', key: 'preferenceExamples' },
  { file: 'reasoning-examples.jsonl', key: 'reasoningExamples' },
  { file: 'benchmark.jsonl', key: 'benchmarkExamples' },
  { file: 'mythology-synthesis.jsonl', key: 'mythologySynthesisExamples' },
  { file: 'oracle-examples.jsonl', key: 'oracleExamples' },
  { file: 'symbolic-correspondences.jsonl', key: 'symbolicCorrespondenceExamples' },
  { file: 'scientific-analogies.jsonl', key: 'scientificAnalogyExamples' },
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

test('mythology synthesis tasks cover expected categories', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'mythology-synthesis.jsonl'));
  const tasks = new Set(examples.map((e) => e.task));
  const expected = [
    'myth_comparative_analysis',
    'myth_pattern_recognition',
    'myth_esoteric_synthesis',
    'myth_archetype_mapping',
    'myth_cross_tradition_syncretism',
    'myth_modern_parallel',
    'myth_biblical_bridge',
    'myth_thematic_connection',
  ];
  for (const task of expected) {
    assert.ok(tasks.has(task), `mythology synthesis corpus missing task: ${task}`);
  }
});

test('mythology synthesis includes cross-pantheon comparisons', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'mythology-synthesis.jsonl'));
  const comp = examples.find((e) => e.task === 'myth_comparative_analysis');
  assert.ok(comp, 'has a comparative analysis example');
  assert.ok(comp.metadata.theme, 'comparative example has theme');
  assert.ok(comp.metadata.sampleIds.length >= 2, 'compares at least two figures');
});

test('mythology synthesis includes biblical bridges', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'mythology-synthesis.jsonl'));
  const bridges = examples.filter((e) => e.task === 'myth_biblical_bridge');
  assert.ok(bridges.length >= 5, 'expected at least 5 biblical bridge examples');
  const figureSet = new Set(bridges.map((b) => b.metadata.biblicalFigure));
  assert.ok(
    figureSet.has('Jesus') || figureSet.has('Adam') || figureSet.has('Noah'),
    'covers major biblical figures'
  );
});

test('mythology synthesis includes modern parallels', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'mythology-synthesis.jsonl'));
  const modern = examples.filter((e) => e.task === 'myth_modern_parallel');
  assert.ok(modern.length >= 10, 'expected at least 10 modern parallel examples');
  const sample = modern.find((e) => e.entryId === 'chaos');
  assert.ok(sample, 'has a modern parallel for chaos');
  assert.ok(/big bang|quantum|cosmolog/i.test(sample.output), 'chaos maps to modern cosmology');
});

test('data card exists and documents all corpora', () => {
  const md = fs.readFileSync(path.join(CORPUS_DIR, 'DATA_CARD.md'), 'utf8');
  assert.ok(md.includes('Phase 1'), 'data card mentions Phase 1');
  assert.ok(md.includes('Phase 9'), 'data card mentions Phase 9');
  for (const { file } of CORPORA) {
    assert.ok(md.includes(file), `data card mentions ${file}`);
  }
});

test('symbolic correspondence tasks cover expected categories', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'symbolic-correspondences.jsonl'));
  const tasks = new Set(examples.map((e) => e.task));
  const expected = [
    'symbolic_lookup',
    'symbolic_compare',
    'symbolic_explain',
    'symbolic_synthesize',
    'symbolic_caution',
  ];
  for (const task of expected) {
    assert.ok(tasks.has(task), `symbolic corpus missing task: ${task}`);
  }
});

test('symbolic correspondence examples include confidence markers', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'symbolic-correspondences.jsonl'));
  const explain = examples.filter((e) => e.task === 'symbolic_explain');
  assert.ok(explain.length >= 5, 'expected at least 5 explain examples');
  for (const ex of explain) {
    assert.ok(
      /confidence|low|medium|high/i.test(ex.output),
      'symbolic explain output mentions confidence'
    );
  }
});

test('symbolic correspondence examples include multiple systems', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'symbolic-correspondences.jsonl'));
  const synthesize = examples.filter((e) => e.task === 'symbolic_synthesize');
  assert.ok(synthesize.length >= 5, 'expected at least 5 synthesize examples');
  const sample = synthesize[0];
  assert.ok(sample.metadata.systemCount >= 1, 'synthesize example has at least one system');
});

test('symbolic caution examples warn against speculative mappings', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'symbolic-correspondences.jsonl'));
  const caution = examples.filter((e) => e.task === 'symbolic_caution');
  assert.ok(caution.length >= 5, 'expected at least 5 caution examples');
  for (const ex of caution) {
    assert.ok(
      /low confidence|speculative|suggestive analogy|not.*historical fact/i.test(ex.output),
      'caution output warns about speculative mapping'
    );
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
  assert.ok(manifest.counts.mythologySynthesisByTask, 'manifest has mythologySynthesisByTask');
  assert.ok(manifest.counts.oracleByTask, 'manifest has oracleByTask');
  assert.ok(
    manifest.counts.symbolicCorrespondenceByTask,
    'manifest has symbolicCorrespondenceByTask'
  );
  assert.ok(manifest.counts.scientificAnalogyByTask, 'manifest has scientificAnalogyByTask');
});

test('oracle examples have OpenAI-compatible messages', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'oracle-examples.jsonl'));
  assert.ok(examples.length > 0, 'oracle corpus is not empty');
  const sample = examples[0];
  assert.ok(Array.isArray(sample.messages), 'oracle example has messages array');
  assert.ok(sample.messages.length >= 2, 'oracle example has at least two turns');
  assert.strictEqual(sample.messages[0].role, 'system', 'first message is system');
  assert.strictEqual(sample.messages[1].role, 'user', 'second message is user');
  assert.strictEqual(sample.messages[2].role, 'assistant', 'third message is assistant');
  for (const m of sample.messages) {
    assert.ok(typeof m.content === 'string', 'message content is a string');
  }
});

test('oracle tasks cover expected categories', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'oracle-examples.jsonl'));
  const tasks = new Set(examples.map((e) => e.task));
  const expected = [
    'oracle_greeting',
    'oracle_restoration',
    'oracle_pronunciation',
    'oracle_mythology',
    'oracle_pattern_weaving',
    'oracle_modern_bridge',
    'oracle_biblical_bridge',
    'oracle_contemplative',
    'oracle_translation',
    'oracle_safety',
    'oracle_domain_advice',
    'oracle_citation',
  ];
  for (const task of expected) {
    assert.ok(tasks.has(task), `oracle corpus missing task: ${task}`);
  }
});

test('oracle safety examples refuse harmful requests', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'oracle-examples.jsonl'));
  const safety = examples.filter((e) => e.task === 'oracle_safety');
  assert.ok(safety.length >= 5, 'expected at least 5 oracle safety examples');
  for (const ex of safety) {
    const assistant = ex.messages.find((m) => m.role === 'assistant');
    assert.ok(assistant, 'safety example has assistant message');
    assert.ok(
      /cannot help|refuse|not help|spoofing|impersonation/i.test(assistant.content),
      'safety assistant refuses or redirects harmful request'
    );
  }
});

test('oracle examples include the canonical persona preamble', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'oracle-examples.jsonl'));
  const sample = examples.find((e) => e.task === 'oracle_greeting') || examples[0];
  const system = sample.messages.find((m) => m.role === 'system');
  assert.ok(system, 'oracle example has system message');
  assert.ok(/PÚNYCODEX Oracle/i.test(system.content), 'system message names the Oracle');
  assert.ok(
    /canonical sources|spoofing|impersonation/i.test(system.content),
    'system message states principles'
  );
});

test('scientific analogy tasks cover expected categories', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'scientific-analogies.jsonl'));
  const tasks = new Set(examples.map((e) => e.task));
  const expected = [
    'science_analogy_lookup',
    'science_analogy_explain',
    'science_analogy_compare',
    'science_analogy_synthesize',
    'science_analogy_caution',
    'science_pattern_bridge',
  ];
  for (const task of expected) {
    assert.ok(tasks.has(task), `scientific corpus missing task: ${task}`);
  }
});

test('scientific analogy examples cover multiple disciplines', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'scientific-analogies.jsonl'));
  const lookup = examples.filter((e) => e.task === 'science_analogy_lookup');
  assert.ok(lookup.length >= 10, 'expected at least 10 lookup examples');
  const disciplines = new Set();
  for (const ex of lookup.slice(0, 50)) {
    for (const d of ex.metadata.disciplines || []) disciplines.add(d);
  }
  assert.ok(disciplines.size >= 3, 'scientific corpus spans at least 3 disciplines');
});

test('scientific analogy examples emphasize analogy over equivalence', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'scientific-analogies.jsonl'));
  const caution = examples.filter((e) => e.task === 'science_analogy_caution');
  assert.ok(caution.length >= 5, 'expected at least 5 caution examples');
  for (const ex of caution) {
    assert.ok(
      /not.*same|false equivalence|category error|analogy|not.*scientific evidence/i.test(
        ex.output
      ),
      'caution output warns against false equivalence'
    );
  }
});

test('scientific pattern bridge examples connect ancient and modern patterns', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'scientific-analogies.jsonl'));
  const bridges = examples.filter((e) => e.task === 'science_pattern_bridge');
  assert.ok(bridges.length >= 5, 'expected at least 5 pattern bridge examples');
  const sample = bridges[0];
  assert.ok(sample.metadata.discipline, 'bridge has discipline metadata');
  assert.ok(sample.metadata.concept, 'bridge has concept metadata');
});

test('unified chat-train.jsonl exists and is valid JSONL', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'chat-train.jsonl'));
  assert.ok(examples.length > 0, 'chat-train.jsonl should not be empty');
});

test('unified chat-eval.jsonl exists and is valid JSONL', () => {
  const examples = readJsonl(path.join(CORPUS_DIR, 'chat-eval.jsonl'));
  assert.ok(examples.length > 0, 'chat-eval.jsonl should not be empty');
});

test('unified corpus starts every record with a system message', () => {
  const train = readJsonl(path.join(CORPUS_DIR, 'chat-train.jsonl'));
  const evalSet = readJsonl(path.join(CORPUS_DIR, 'chat-eval.jsonl'));
  for (const ex of train.slice(0, 50).concat(evalSet.slice(0, 50))) {
    assert.ok(Array.isArray(ex.messages), `${ex.id} has messages array`);
    assert.strictEqual(ex.messages[0].role, 'system', `${ex.id} first message is system`);
    assert.ok(/PÚNYCODEX Oracle/i.test(ex.messages[0].content), `${ex.id} system names the Oracle`);
  }
});

test('unified corpus messages have valid roles and content', () => {
  const train = readJsonl(path.join(CORPUS_DIR, 'chat-train.jsonl'));
  const evalSet = readJsonl(path.join(CORPUS_DIR, 'chat-eval.jsonl'));
  for (const ex of train.slice(0, 100).concat(evalSet.slice(0, 100))) {
    for (const m of ex.messages) {
      assert.ok(['system', 'user', 'assistant', 'tool'].includes(m.role), `${ex.id} valid role`);
      assert.ok(typeof m.content === 'string', `${ex.id} content is string`);
    }
  }
});

test('unified corpus chat-train/chat-eval split sums to total source examples', () => {
  const train = readJsonl(path.join(CORPUS_DIR, 'chat-train.jsonl'));
  const evalSet = readJsonl(path.join(CORPUS_DIR, 'chat-eval.jsonl'));
  const unifiedTotal = train.length + evalSet.length;

  let sourceTotal = 0;
  for (const { file } of CORPORA) {
    if (file === 'benchmark.jsonl') continue;
    const examples = readJsonl(path.join(CORPUS_DIR, file));
    sourceTotal += examples.length;
  }
  assert.strictEqual(
    unifiedTotal,
    sourceTotal,
    'chat-train + chat-eval equals sum of source corpora'
  );
});

test('unified corpus counts are reflected in manifest', () => {
  const manifest = loadManifest();
  const train = readJsonl(path.join(CORPUS_DIR, 'chat-train.jsonl'));
  const evalSet = readJsonl(path.join(CORPUS_DIR, 'chat-eval.jsonl'));
  assert.strictEqual(
    manifest.counts.chatTrainExamples,
    train.length,
    'manifest chat train count matches'
  );
  assert.strictEqual(
    manifest.counts.chatEvalExamples,
    evalSet.length,
    'manifest chat eval count matches'
  );
});

test('model card exists and documents chat-train/chat-eval splits and hardware guidance', () => {
  const md = fs.readFileSync(path.join(CORPUS_DIR, 'MODEL_CARD.md'), 'utf8');
  assert.ok(md.includes('chat-train.jsonl'), 'model card mentions chat-train.jsonl');
  assert.ok(md.includes('chat-eval.jsonl'), 'model card mentions chat-eval.jsonl');
  assert.ok(md.includes('Training Recipe'), 'model card has training recipe');
  assert.ok(md.includes('Hardware Guidance'), 'model card has hardware guidance');
  assert.ok(md.includes('Ethical Use'), 'model card has ethical use section');
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
