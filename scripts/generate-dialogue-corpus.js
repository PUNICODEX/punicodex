#!/usr/bin/env node
/**
 * PÚNYCODEX — Dialogue / Conversation Corpus Generator (Phase 3)
 *
 * Emits multi-turn, grounded conversations for instruction-tuning chat models.
 * Every turn is anchored to canonical corpus fields so the model learns to
 * hold context, ask clarifying questions, and cite sources.
 *
 * Output: data/corpus/dialogue-examples.jsonl
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const ENTRIES_PATH = path.join(ROOT, 'data', 'corpus', 'entries.jsonl');
const OUT_PATH = path.join(ROOT, 'data', 'corpus', 'dialogue-examples.jsonl');

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

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function sample(arr, n, rng = Math.random) {
  const copy = arr.slice();
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

function buildRestorationDialogue(entry, index) {
  return {
    id: makeId(entry.id, 'dialogue_restoration', index),
    entryId: entry.id,
    task: 'dialogue_restoration',
    messages: [
      { role: 'user', content: `How do I type the scholarly Unicode form of ${entry.ascii}?` },
      {
        role: 'assistant',
        content: `The Unicode restoration is ${entry.unicode}. Greek/original script: ${entry.greek || entry.originalScript?.specimen || '—'}. It means “${entry.meaning}” and belongs to the ${entry.pantheon} pantheon.`,
      },
      { role: 'user', content: 'And what is the punycode domain?' },
      {
        role: 'assistant',
        content: entry.punycodeDomain
          ? `${entry.punycodeDomain} is the punycode encoding of ${entry.unicodeDomain}. ${entry.ownership.isOwned ? 'It is part of the PÚNYCODEX owned collection.' : 'Always verify the registrant before trusting it.'}`
          : `No punycode domain is recorded for ${entry.unicode} in the corpus.`,
      },
    ],
    metadata: { pantheon: entry.pantheon, tier: entry.tier },
  };
}

function buildPronunciationDialogue(entry, index) {
  const p = entry.pronunciation;
  if (!p?.ipa) return null;
  return {
    id: makeId(entry.id, 'dialogue_pronunciation', index),
    entryId: entry.id,
    task: 'dialogue_pronunciation',
    messages: [
      { role: 'user', content: `How do you pronounce ${entry.unicode}?` },
      {
        role: 'assistant',
        content: `${entry.unicode} is pronounced ${p.ipa} (${p.ipaLabel || 'reconstructed'}). In plain English, roughly “${p.approximation || 'no approximation available'}”.`,
      },
      { role: 'user', content: 'Can you break it down by sound?' },
      {
        role: 'assistant',
        content: p.phonemes?.length
          ? p.phonemes.map((ph) => `${ph.symbol}: ${ph.desc}`).join(' ')
          : `No phoneme breakdown is on file for ${entry.unicode}.`,
      },
    ],
    metadata: { confidence: p.confidence, pantheon: entry.pantheon },
  };
}

function buildMythologyDialogue(entry, index) {
  if (!entry.lore?.mythologyMyths?.length) return null;
  const myths = entry.lore.mythologyMyths.slice(0, 2);
  return {
    id: makeId(entry.id, 'dialogue_mythology', index),
    entryId: entry.id,
    task: 'dialogue_mythology',
    messages: [
      { role: 'user', content: `Tell me a myth about ${entry.unicode}.` },
      {
        role: 'assistant',
        content: entry.lore.mythologyLead
          ? stripHtml(entry.lore.mythologyLead)
          : `${entry.unicode} appears in several myths.`,
      },
      { role: 'user', content: 'Give me one specific story.' },
      {
        role: 'assistant',
        content: myths.map((m) => `${m.title}: ${stripHtml(m.text || '')}`).join(' '),
      },
    ],
    metadata: { pantheon: entry.pantheon, myths: myths.length },
  };
}

function buildEtymologyDialogue(entry, index) {
  if (!entry.etymology) return null;
  const et = entry.etymology;
  return {
    id: makeId(entry.id, 'dialogue_etymology', index),
    entryId: entry.id,
    task: 'dialogue_etymology',
    messages: [
      { role: 'user', content: `What is the etymology of ${entry.unicode}?` },
      {
        role: 'assistant',
        content: `${entry.unicode} comes from ${et.protoLanguage} *${et.protoForm}* meaning “${et.protoGloss}”. ${et.derivation} Certainty: ${et.certainty}.`,
      },
      { role: 'user', content: 'Are there cognates?' },
      {
        role: 'assistant',
        content: et.cognates?.length
          ? `Yes. ${et.cognates.map((c) => `${c.language} ${c.form} (${c.relationship})`).join('; ')}.`
          : `No cognates are listed for ${entry.unicode} in the current corpus.`,
      },
    ],
    metadata: { protoLanguage: et.protoLanguage, certainty: et.certainty },
  };
}

function buildSafetyDialogue(entry, index) {
  if (!entry.punycodeDomain) return null;
  const spoof = `${entry.ascii}-secure.com`;
  return {
    id: makeId(entry.id, 'dialogue_safety', index),
    entryId: entry.id,
    task: 'dialogue_safety',
    messages: [
      { role: 'user', content: `I saw the domain ${spoof}. Is it related to ${entry.unicode}?` },
      {
        role: 'assistant',
        content: `No. ${spoof} is a lookalike domain. The canonical registrable form in the PÚNYCODEX collection is ${entry.punycodeDomain} (${entry.unicodeDomain}). Always check the registrable domain, not just a subdomain or keyword.`,
      },
      { role: 'user', content: 'What should I look for to be safe?' },
      {
        role: 'assistant',
        content: `Look for the exact Unicode restoration ${entry.unicode} and its punycode form ${entry.punycodeDomain}. Be wary of added words like “secure”, “login”, or “verify”, and of letters replaced with visually similar characters from other alphabets.`,
      },
    ],
    metadata: { pantheon: entry.pantheon, owned: entry.ownership.isOwned },
  };
}

function buildVariantDialogue(entry, index) {
  if (!entry.variants?.length) return null;
  const variants = sample(entry.variants, Math.min(3, entry.variants.length));
  return {
    id: makeId(entry.id, 'dialogue_variants', index),
    entryId: entry.id,
    task: 'dialogue_variants',
    messages: [
      { role: 'user', content: `What are the valid Unicode variants of ${entry.unicode}?` },
      {
        role: 'assistant',
        content: `Documented variants include: ${variants.map((v) => `${v.unicode} (${v.type})`).join('; ')}.`,
      },
      { role: 'user', content: 'Which one is the primary owned form?' },
      {
        role: 'assistant',
        content: variants.find((v) => v.type === 'owned')
          ? `${variants.find((v) => v.type === 'owned').unicode} is the owned/primary form.`
          : `${entry.unicode} is the canonical form; the listed variants are scholarly alternates.`,
      },
    ],
    metadata: { variantCount: entry.variants.length },
  };
}

function generateForEntry(entry, index) {
  const examples = [
    buildRestorationDialogue(entry, index),
    buildPronunciationDialogue(entry, index),
    buildMythologyDialogue(entry, index),
    buildEtymologyDialogue(entry, index),
    buildSafetyDialogue(entry, index),
    buildVariantDialogue(entry, index),
  ].filter(Boolean);
  return examples;
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

  console.log(`✓ Generated ${examples.length} dialogue examples to ${OUT_PATH}`);
  console.log(`  by task: ${JSON.stringify(byTask, null, 2)}`);
}

main();
