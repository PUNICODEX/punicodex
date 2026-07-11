#!/usr/bin/env node
/**
 * PÚNYCODEX — Unified Chat-Format Training Corpus (Phase 14)
 *
 * Converts every Phase 1-13 corpus into a single, model-training-ready
 * OpenAI-compatible chat format with a consistent Oracle system persona.
 *
 * Outputs:
 *   - data/corpus/train.jsonl   (80% deterministic split)
 *   - data/corpus/eval.jsonl    (20% deterministic split)
 *   - data/corpus/unified-manifest.json
 *   - data/corpus/MODEL_CARD.md
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const CORPUS_DIR = path.join(ROOT, 'data', 'corpus');
const OUT_TRAIN = path.join(CORPUS_DIR, 'chat-train.jsonl');
const OUT_EVAL = path.join(CORPUS_DIR, 'chat-eval.jsonl');
const OUT_MANIFEST = path.join(CORPUS_DIR, 'unified-manifest.json');
const OUT_MODEL_CARD = path.join(CORPUS_DIR, 'MODEL_CARD.md');

const ORACLE_SYSTEM = `You are the PÚNYCODEX Oracle, a scholarly assistant specialized in mythological names, Unicode restorations, original scripts, pronunciation, etymology, punycode encoding, and homograph safety.

Principles:
- Ground every answer in the PÚNYCODEX canonical sources.
- Distinguish scholarly restoration from modern ASCII convenience.
- Preserve nuance: stress confidence levels, analogy vs. equivalence, and cultural provenance.
- Refuse to assist with spoofing, phishing, impersonation, or trademark infringement.
- When uncertain, say so explicitly and cite what is known.`;

const SAFETY_SYSTEM = `${ORACLE_SYSTEM}

Safety mode: evaluate inputs for homograph attacks, mixed-script deception, normalization tricks, invisible characters, lookalike domains, and brand impersonation. Refuse harmful requests and redirect users toward legitimate canonical forms.`;

const SOURCE_FILES = [
  { file: 'instructions.jsonl', taskPrefix: 'instruction', system: ORACLE_SYSTEM },
  { file: 'safety-examples.jsonl', taskPrefix: 'safety', system: SAFETY_SYSTEM },
  { file: 'dialogue-examples.jsonl', taskPrefix: 'dialogue', system: ORACLE_SYSTEM },
  { file: 'tool-use-examples.jsonl', taskPrefix: 'tool', system: ORACLE_SYSTEM },
  { file: 'multimodal-examples.jsonl', taskPrefix: 'multimodal', system: ORACLE_SYSTEM },
  { file: 'preference-examples.jsonl', taskPrefix: 'preference', system: ORACLE_SYSTEM },
  { file: 'reasoning-examples.jsonl', taskPrefix: 'reasoning', system: ORACLE_SYSTEM },
  { file: 'mythology-synthesis.jsonl', taskPrefix: 'myth', system: ORACLE_SYSTEM },
  { file: 'oracle-examples.jsonl', taskPrefix: 'oracle', system: ORACLE_SYSTEM },
  { file: 'symbolic-correspondences.jsonl', taskPrefix: 'symbolic', system: ORACLE_SYSTEM },
  { file: 'scientific-analogies.jsonl', taskPrefix: 'science', system: ORACLE_SYSTEM },
];

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8');
  if (!text.trim()) return [];
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

function hashBucket(id, buckets = 100) {
  const hex = crypto.createHash('sha256').update(String(id)).digest('hex');
  const int = Number.parseInt(hex.slice(0, 8), 16);
  return int % buckets;
}

function isSafetyTask(task) {
  return typeof task === 'string' && task.startsWith('safety');
}

function buildInstructionRecord(ex, source, systemPrompt) {
  const userParts = [ex.instruction || ex.question || ''];
  if (ex.input) userParts.push(`Input: ${ex.input}`);
  return {
    id: ex.id,
    entryId: ex.entryId || null,
    task: ex.task,
    sourceFile: source.file,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userParts.join('\n\n') },
      { role: 'assistant', content: ex.output || ex.answer || '' },
    ],
  };
}

function buildDialogueRecord(ex, source) {
  const messages = [{ role: 'system', content: source.system }];
  for (const m of ex.messages || []) {
    messages.push({ role: m.role, content: m.content });
  }
  return {
    id: ex.id,
    entryId: ex.entryId || null,
    task: ex.task,
    sourceFile: source.file,
    messages,
  };
}

function buildToolUseRecord(ex, source) {
  const messages = [{ role: 'system', content: source.system }];
  for (const m of ex.messages || []) {
    const copy = { role: m.role, content: m.content };
    if (m.tool_calls) copy.tool_calls = m.tool_calls;
    if (m.tool_call_id) copy.tool_call_id = m.tool_call_id;
    messages.push(copy);
  }
  return {
    id: ex.id,
    entryId: ex.entryId || null,
    task: ex.task,
    sourceFile: source.file,
    tools: ex.tools,
    messages,
  };
}

function buildMultimodalRecord(ex, source) {
  const userContent = ex.question || ex.instruction || ex.input || '';
  const record = {
    id: ex.id,
    entryId: ex.entryId || null,
    task: ex.task,
    sourceFile: source.file,
    messages: [
      { role: 'system', content: source.system },
      { role: 'user', content: userContent },
      { role: 'assistant', content: ex.output || ex.answer || '' },
    ],
  };
  if (ex.image) record.image = ex.image;
  return record;
}

function buildPreferenceRecord(ex, source) {
  const prompt = ex.instruction || ex.question || '';
  const chosen = ex.chosen || '';
  return {
    id: `${ex.id}-chosen`,
    entryId: ex.entryId || null,
    task: ex.task,
    sourceFile: source.file,
    messages: [
      { role: 'system', content: source.system },
      { role: 'user', content: prompt },
      { role: 'assistant', content: chosen },
    ],
    preference: {
      originalId: ex.id,
      label: 'chosen',
      rejected: ex.rejected || '',
      reason: ex.reason || '',
    },
  };
}

function convertExample(ex, source) {
  const systemPrompt = isSafetyTask(ex.task) ? SAFETY_SYSTEM : source.system;

  if (source.file === 'dialogue-examples.jsonl' || source.file === 'oracle-examples.jsonl') {
    // Oracle examples already include a system message; replace it with the canonical one.
    const stripped = (ex.messages || []).filter((m) => m.role !== 'system');
    return buildDialogueRecord({ ...ex, messages: stripped }, source);
  }
  if (source.file === 'tool-use-examples.jsonl') return buildToolUseRecord(ex, source);
  if (source.file === 'multimodal-examples.jsonl') return buildMultimodalRecord(ex, source);
  if (source.file === 'preference-examples.jsonl') return buildPreferenceRecord(ex, source);
  return buildInstructionRecord(ex, source, systemPrompt);
}

function validateRecord(record, sourceFile) {
  assert(record.id, `record from ${sourceFile} missing id`);
  assert(Array.isArray(record.messages) && record.messages.length >= 2, `record ${record.id} has too few messages`);
  assert(record.messages[0].role === 'system', `record ${record.id} missing system message`);
  for (let i = 0; i < record.messages.length; i++) {
    const m = record.messages[i];
    assert(typeof m.role === 'string', `record ${record.id} message ${i} missing role`);
    assert(
      ['system', 'user', 'assistant', 'tool'].includes(m.role),
      `record ${record.id} has invalid role ${m.role}`
    );
    if (m.role === 'assistant' && !m.tool_calls) {
      assert(typeof m.content === 'string' && m.content.length > 0, `record ${record.id} assistant message is empty`);
    }
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function writeJsonl(records, filePath) {
  const lines = records.map((r) => JSON.stringify(r));
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

function buildPretrainSection() {
  const p = path.join(CORPUS_DIR, 'pretrain-manifest.json');
  if (!fs.existsSync(p)) return '';
  const m = JSON.parse(fs.readFileSync(p, 'utf8'));
  return `## Continual Pretraining (Phase 15)

Before supervised fine-tuning, domain-adapt the base model on the raw scholarly corpus:

- \`data/corpus/pretrain.jsonl\` — ${m.counts.trainDocuments.toLocaleString()} training documents (${m.counts.trainTokens.toLocaleString()} whitespace tokens).
- \`data/corpus/pretrain-validation.jsonl\` — ${m.counts.validationDocuments.toLocaleString()} validation documents (${m.counts.validationTokens.toLocaleString()} whitespace tokens).
- HuggingFace-compatible splits in \`data/corpus/huggingface/\`.

Documents are drawn from structured entry records, flagship lore, original-script provenance, pronunciation notes, the source catalog, mythology synthesis, oracle reflections, symbolic correspondences, and scientific analogies. Strip HTML and normalize whitespace before tokenization. This step teaches the model the domain's scripts, diacritics, scholarly vocabulary, and canonical source style before chat-format SFT.`;
}

function main() {
  fs.mkdirSync(CORPUS_DIR, { recursive: true });

  let total = 0;
  let train = [];
  let evalSet = [];
  const bySource = {};
  const byTask = {};

  for (const source of SOURCE_FILES) {
    const examples = readJsonl(path.join(CORPUS_DIR, source.file));
    bySource[source.file] = { count: examples.length };

    for (const ex of examples) {
      const record = convertExample(ex, source);
      validateRecord(record, source.file);

      const bucket = hashBucket(record.id);
      if (bucket < 80) train.push(record);
      else evalSet.push(record);

      byTask[record.task] = (byTask[record.task] || 0) + 1;
      total++;
    }
  }

  writeJsonl(train, OUT_TRAIN);
  writeJsonl(evalSet, OUT_EVAL);

  const dataVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-version.json'), 'utf8'));
  const manifest = {
    version: dataVersion.version || 'unknown',
    generatedAt: dataVersion.releasedAt || new Date().toISOString(),
    counts: {
      total,
      train: train.length,
      eval: evalSet.length,
      bySource,
      byTask,
    },
    split: {
      method: 'deterministic_sha256_hash',
      trainBucketRange: '0-79',
      evalBucketRange: '80-99',
    },
  };
  fs.writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 2));

  const modelCard = `# PÚNYCODEX Oracle — Model Card

**Model family:** PÚNYCODEX Oracle (specialized language model)  
**Data version:** ${manifest.version}  
**Generated:** ${manifest.generatedAt}  
**License:** CC BY 4.0 for dataset; ISC for software (see root LICENSE).

## Intended Use

- Answer scholarly questions about mythological names, Unicode restorations, original scripts, pronunciation, etymology, and meaning.
- Convert between Unicode domain names and punycode (xn--) representations.
- Detect and explain homograph attacks, mixed-script deception, normalization tricks, and brand-impersonation risks.
- Engage in comparative mythology, symbolic correspondence, scientific analogy, and contemplative reflection.
- Support the PÚNYCODEX search engine, browser extension, mobile app, and API v1.

## Training Data

| Split | Examples | File |
|-------|----------|------|
| Train | ${train.length.toLocaleString()} | \`data/corpus/chat-train.jsonl\` |
| Evaluation | ${evalSet.length.toLocaleString()} | \`data/corpus/chat-eval.jsonl\` |
| **Total** | **${total.toLocaleString()}** | — |

Source corpora:
${Object.entries(bySource)
  .map(([file, { count }]) => `- \`${file}\`: ${count.toLocaleString()} examples`)
  .join('\n')}

## Training Recipe (recommended)

1. **Base model:** any modern decoder-only LLM with strong multilingual and Unicode support (e.g., Llama 3, Mistral, Qwen, or a domain-continued pretrained checkpoint).
2. **Continual pretraining (optional):** run a small number of epochs on the raw lore, source catalog, and extended provenance text to adapt tokenization to diacritics, Greek, and non-Latin scripts.
3. **Supervised fine-tuning:** train on \`chat-train.jsonl\` with full chat messages. Use a low learning rate (1e-5 to 5e-6) and train for 2-3 epochs.
4. **Safety tuning:** up-weight \`safety\` and \`oracle_safety\` examples in the final SFT epoch.
5. **Tool-use tuning:** fine-tune on \`tool-use-examples.jsonl\` after base SFT so the model learns the function-calling schema.
6. **RLHF / DPO:** use the \`preference\` records in \`chat-train.jsonl\` (\`preference.rejected\` is included for each chosen example) to train a reward model or run DPO.
7. **Evaluation:** score against \`eval.jsonl\`, \`benchmark.jsonl\`, and the per-task metrics before each release.

## Evaluation

- \`chat-eval.jsonl\`: held-out chat examples across all tasks.
- \`benchmark.jsonl\`: exact-match and contains-match benchmark questions.
- \`test/ai-corpus-phases.test.js\`: regression tests guarding corpus integrity.

## Hardware Guidance

- **Minimum viable SFT:** 24 GB VRAM (QLoRA on a 7B/8B model, rank 64, batch size 1-2).
- **Comfortable full fine-tune:** 80 GB VRAM (A100/H100) for 7B-13B dense models.
- **Preferred for production:** 2× H100 80 GB or equivalent for 70B-class models and larger batch sizes.

## Limitations

- Pronunciation and etymology are reconstructed where primary attestations are sparse; confidence levels are explicit.
- Original-script coverage is strongest for Greek, CJK, Devanagari, and major Near-Eastern scripts.
- Safety examples are heuristic; they do not replace legal review or human moderation.
- The model is not a registrar, lawyer, or trademark authority.

## Ethical Use

Do not use this model to generate deceptive domains, impersonate brands, or evade security controls. The PÚNYCODEX Oracle is designed to illuminate names, not to weaponize them.

${buildPretrainSection()}
`;
  fs.writeFileSync(OUT_MODEL_CARD, modelCard);

  console.log(`✓ Unified corpus generated`);
  console.log(`  train.jsonl: ${train.length.toLocaleString()} examples`);
  console.log(`  eval.jsonl:  ${evalSet.length.toLocaleString()} examples`);
  console.log(`  total:       ${total.toLocaleString()} examples`);
  console.log(`  tasks:       ${Object.keys(byTask).length}`);
  console.log(`  sources:     ${Object.keys(bySource).length}`);
}

main();
