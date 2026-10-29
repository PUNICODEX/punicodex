#!/usr/bin/env node
/**
 * PuniCodex — Reasoning / Chain-of-Thought Corpus Generator (Phase 7)
 *
 * Emits step-by-step reasoning traces for breakdowns, restoration-preservation analysis,
 * etymology, and safety verdicts. The model learns to show its work.
 *
 * Output: data/corpus/reasoning-examples.jsonl
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { preservationLabel } = require('./lib/preservation-label.js');

const ROOT = path.join(__dirname, '..');
const ENTRIES_PATH = path.join(ROOT, 'data', 'corpus', 'entries.jsonl');
const OUT_PATH = path.join(ROOT, 'data', 'corpus', 'reasoning-examples.jsonl');

function loadEntries() {
  const text = fs.readFileSync(ENTRIES_PATH, 'utf8');
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function makeId(entryId, task, index) {
  return `${entryId}-${task}-${String(index).padStart(4, '0')}`;
}

function buildBreakdownReasoning(entry, index) {
  if (!entry.breakdown?.length) return null;
  const steps = entry.breakdown
    .map((b, i) => `${i + 1}. The character “${b.char}” becomes “${b.to}” (${b.type}${b.note ? ` — ${b.note}` : ''}).`)
    .join(' ');
  return {
    id: makeId(entry.id, 'reasoning_breakdown', index),
    entryId: entry.id,
    task: 'reasoning_breakdown',
    instruction: `Show step-by-step how "${entry.ascii}" transforms into "${entry.unicode}".`,
    input: entry.ascii,
    output: `To convert ${entry.ascii} into ${entry.unicode}: ${steps} Therefore, the Unicode restoration is ${entry.unicode}.`,
    metadata: { pantheon: entry.pantheon, stepCount: entry.breakdown.length },
  };
}

function buildPreservationReasoning(entry, index) {
  return {
    id: makeId(entry.id, 'reasoning_preservation', index),
    task: 'reasoning_preservation',
    instruction: `What does the Unicode restoration ${entry.unicode} preserve, and how can you tell?`,
    output: `${entry.unicode} ${preservationLabel(entry.unicode).toLowerCase()}. Reasoning: inspect the displayed form itself — a circumflex fuses stress and length, a macron marks vowel length, an acute marks stress, and distinctive letters (þ, ð, ꜣ, …) survive where ASCII flattens them. The description is computed from the form, so it can never overclaim it.`,
    metadata: { pantheon: entry.pantheon },
  };
}

function buildEtymologyReasoning(entry, index) {
  if (!entry.etymology) return null;
  const et = entry.etymology;
  return {
    id: makeId(entry.id, 'reasoning_etymology', index),
    entryId: entry.id,
    task: 'reasoning_etymology',
    instruction: `Explain the etymology of ${entry.unicode} step by step.`,
    input: entry.unicode,
    output: `1. The name ${entry.unicode} descends from ${et.protoLanguage}. 2. The reconstructed proto-form is *${et.protoForm}* with the core meaning “${et.protoGloss}”. 3. ${et.derivation} 4. The certainty level is ${et.certainty}. Therefore, ${entry.unicode} carries the semantic heritage recorded in the corpus.`,
    metadata: { protoLanguage: et.protoLanguage, certainty: et.certainty },
  };
}

function buildSafetyReasoning(entry, index) {
  if (!entry.punycodeDomain) return null;
  const spoof = `${entry.ascii}-verify.com`;
  return {
    id: makeId(entry.id, 'reasoning_safety', index),
    entryId: entry.id,
    task: 'reasoning_safety',
    instruction: `Is ${spoof} a safe canonical domain for ${entry.unicode}? Show your reasoning.`,
    input: spoof,
    output: `1. The canonical punycode domain for ${entry.unicode} is ${entry.punycodeDomain}. 2. ${spoof} has a different registrable domain (verify.com) and only borrows the keyword “${entry.ascii}”. 3. The added word “verify” is a common phishing signal. 4. Therefore, ${spoof} is a lookalike domain and not safe.`,
    metadata: { pantheon: entry.pantheon, owned: entry.ownership.isOwned },
  };
}

function buildOriginalScriptReasoning(entry, index) {
  const os = entry.originalScript;
  if (!os?.specimen) return null;
  return {
    id: makeId(entry.id, 'reasoning_original_script', index),
    entryId: entry.id,
    task: 'reasoning_original_script',
    instruction: `How do we know the original script of ${entry.unicode}?`,
    input: entry.unicode,
    output: `1. The corpus identifies the original script as ${os.scriptName} (${os.family}). 2. The specimen is ${os.specimen}. 3. The transliteration is ${os.transliteration}. 4. Provenance: ${os.provenanceSteps?.join(' ') || 'recorded in the PuniCodex original-script atlas.'} 5. Therefore, the original writing system is ${os.scriptName}.`,
    metadata: { scriptName: os.scriptName, family: os.family },
  };
}

function generateForEntry(entry, index) {
  return [
    buildBreakdownReasoning(entry, index),
    buildPreservationReasoning(entry, index),
    buildEtymologyReasoning(entry, index),
    buildSafetyReasoning(entry, index),
    buildOriginalScriptReasoning(entry, index),
  ].filter(Boolean);
}

function main() {
  const entries = loadEntries();
  const examples = [];
  for (let i = 0; i < entries.length; i++) {
    examples.push(...generateForEntry(entries[i], i + 1));
  }

  const lines = examples.map((ex) => JSON.stringify(ex));
  fs.writeFileSync(OUT_PATH, lines.join('\n') + '\n');

  const byTask = {};
  for (const ex of examples) {
    byTask[ex.task] = (byTask[ex.task] || 0) + 1;
  }

  console.log(`✓ Generated ${examples.length} reasoning examples to ${OUT_PATH}`);
  console.log(`  by task: ${JSON.stringify(byTask, null, 2)}`);
}

main();
