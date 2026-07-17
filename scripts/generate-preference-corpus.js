#!/usr/bin/env node
/**
 * PuniCodex — Preference / RLHF Corpus Generator (Phase 6)
 *
 * Emits chosen vs rejected response pairs for scholarly and safety queries.
 * The chosen response is grounded, concise, and cites sources; the rejected
 * response is either hallucinated, unsafe, or unhelpful.
 *
 * Output: data/corpus/preference-examples.jsonl
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const ENTRIES_PATH = path.join(ROOT, 'data', 'corpus', 'entries.jsonl');
const OUT_PATH = path.join(ROOT, 'data', 'corpus', 'preference-examples.jsonl');

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

function buildRestorationPreference(entry, index) {
  return {
    id: makeId(entry.id, 'pref_restoration', index),
    entryId: entry.id,
    task: 'preference_restoration',
    instruction: 'Answer the user question with a grounded, accurate response.',
    input: `What is the Unicode restoration of ${entry.ascii}?`,
    chosen: `${entry.unicode} is the Unicode restoration of ${entry.ascii}. It means “${entry.meaning}” and belongs to the ${entry.pantheon} pantheon.`,
    rejected: `${entry.ascii} is probably spelled ${entry.ascii} in Unicode too. It doesn't really matter for most people.`,
    metadata: { pantheon: entry.pantheon, reason: 'chosen is grounded and explanatory; rejected is dismissive and incorrect' },
  };
}

function buildPronunciationPreference(entry, index) {
  const p = entry.pronunciation;
  if (!p?.ipa) return null;
  return {
    id: makeId(entry.id, 'pref_pronunciation', index),
    entryId: entry.id,
    task: 'preference_pronunciation',
    instruction: 'Answer the user question with a grounded, accurate response.',
    input: `How is ${entry.unicode} pronounced?`,
    chosen: `${entry.unicode} is pronounced ${p.ipa} (${p.ipaLabel || 'reconstructed'}), roughly “${p.approximation || 'no approximation available'}”.`,
    rejected: `Just say it like it looks in English: “${entry.ascii}”. Ancient pronunciation doesn't matter today.`,
    metadata: { confidence: p.confidence, reason: 'chosen gives IPA and context; rejected is anglicized and dismissive' },
  };
}

function buildSafetyPreference(entry, index) {
  if (!entry.punycodeDomain) return null;
  const spoof = `${entry.ascii}-login.com`;
  return {
    id: makeId(entry.id, 'pref_safety', index),
    entryId: entry.id,
    task: 'preference_safety',
    instruction: 'Answer the user question with a safe, accurate response.',
    input: `I received a link to ${spoof}. Is this the official ${entry.unicode} domain?`,
    chosen: `No. ${spoof} is not the official domain. The canonical registrable form is ${entry.punycodeDomain} (${entry.unicodeDomain}). The added word “login” and the non-owned registrable domain are warning signs.`,
    rejected: `Yes, that looks like the ${entry.unicode} login page. You can safely enter your credentials there.`,
    metadata: { reason: 'chosen warns and identifies the real domain; rejected is dangerous' },
  };
}

function buildSourcePreference(entry, index) {
  if (!entry.sources?.length) return null;
  const sourceList = entry.sources.slice(0, 2).map((s) => s.key?.title || s.full?.title || s.key || s.full).join(', ');
  return {
    id: makeId(entry.id, 'pref_sources', index),
    entryId: entry.id,
    task: 'preference_sources',
    instruction: 'Answer the user question with a grounded, accurate response.',
    input: `What sources attest ${entry.unicode}?`,
    chosen: `The entry for ${entry.unicode} is attested by ${sourceList} and other scholarly references in the PuniCodex source catalog.`,
    rejected: `There are no real sources; these names were made up for the internet.`,
    metadata: { reason: 'chosen cites sources; rejected is a false hallucination' },
  };
}

function buildVariantPreference(entry, index) {
  if (!entry.variants?.length) return null;
  const ideal = entry.variants.find((v) => v.type === 'ideal') || entry.variants[0];
  return {
    id: makeId(entry.id, 'pref_variants', index),
    entryId: entry.id,
    task: 'preference_variants',
    instruction: 'Answer the user question with a grounded, accurate response.',
    input: `What is the most accurate Unicode form of ${entry.ascii}?`,
    chosen: `The ideal scholarly form is ${ideal.unicode}. It preserves the marks and length distinctions that the ASCII form loses.`,
    rejected: `The plain ASCII form ${entry.ascii} is the most accurate because everyone uses it.`,
    metadata: { reason: 'chosen explains scholarly value; rejected ignores Unicode restoration' },
  };
}

function generateForEntry(entry, index) {
  return [
    buildRestorationPreference(entry, index),
    buildPronunciationPreference(entry, index),
    buildSafetyPreference(entry, index),
    buildSourcePreference(entry, index),
    buildVariantPreference(entry, index),
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

  console.log(`✓ Generated ${examples.length} preference examples to ${OUT_PATH}`);
  console.log(`  by task: ${JSON.stringify(byTask, null, 2)}`);
}

main();
