#!/usr/bin/env node
/**
 * PÚNYCODEX — Synthetic Instruction-Tuning Data Generator
 *
 * Reads data/corpus/entries.jsonl and emits high-quality, fully-grounded
 * question/answer pairs for every entry. Every answer is derived directly
 * from the canonical corpus fields; no external knowledge is invented.
 *
 * Output: data/corpus/instructions.jsonl
 *
 * Run: node scripts/generate-synthetic-qa.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const ENTRIES_PATH = path.join(ROOT, 'data', 'corpus', 'entries.jsonl');
const OUT_PATH = path.join(ROOT, 'data', 'corpus', 'instructions.jsonl');

function loadEntries() {
  const text = fs.readFileSync(ENTRIES_PATH, 'utf8');
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function makeId(entryId, task, index) {
  return `${entryId}-${task}-${String(index).padStart(3, '0')}`;
}

const TEMPLATES = {
  restoration: (e) => ({
    instruction: `What is the Unicode restoration of the mythological name "${e.ascii}"?`,
    input: e.ascii,
    output: `${e.unicode} is the Unicode restoration of "${e.ascii}". Greek/original script: ${e.greek || '—'}. Meaning: ${e.meaning}. Pantheon: ${e.pantheon}. Tier: ${e.tierLabel}.`,
  }),

  punycode: (e) =>
    e.punycodeDomain
      ? {
          instruction: `What is the punycode domain for the Unicode name "${e.unicode}"?`,
          input: e.unicode,
          output: `The punycode domain for ${e.unicode} is ${e.punycodeDomain}. The Unicode form is ${e.unicodeDomain}.`,
        }
      : null,

  original_script: (e) => {
    const os = e.originalScript;
    if (!os || !os.specimen) return null;
    const steps = os.provenanceSteps?.length ? ` Provenance: ${os.provenanceSteps.join(' ')}` : '';
    return {
      instruction: `What is the original script for "${e.unicode}"?`,
      input: e.unicode,
      output: `The original script for ${e.unicode} is ${os.scriptName}: ${os.specimen} (${os.transliteration || e.unicode}).${steps} Family: ${os.family || 'unknown'}; direction: ${os.writingDirection || 'unknown'}; region: ${os.region || 'unknown'}.`,
    };
  },

  pronunciation: (e) => {
    const p = e.pronunciation;
    if (!p || !p.ipa) return null;
    return {
      instruction: `How is "${e.unicode}" pronounced?`,
      input: e.unicode,
      output: `${e.unicode} is pronounced ${p.ipa}${p.approximation ? ` — approximately "${p.approximation}"` : ''}. ${p.ipaLabel || ''}${p.note ? ` Note: ${p.note}` : ''}`.trim(),
    };
  },

  etymology: (e) => {
    const et = e.etymology;
    if (!et) return null;
    const cognates = et.cognates?.length
      ? ` Cognates: ${et.cognates.map((c) => `${c.language} ${c.form} (${c.relationship})`).join('; ')}.`
      : '';
    return {
      instruction: `What is the etymology of "${e.unicode}"?`,
      input: e.unicode,
      output: `${e.unicode} comes from ${et.protoLanguage} *${et.protoForm}* meaning "${et.protoGloss}". ${et.derivation} Certainty: ${et.certainty}.${cognates}`,
    };
  },

  meaning: (e) => ({
    instruction: `What does the name "${e.unicode}" mean?`,
    input: e.unicode,
    output: `${e.unicode} means: ${e.meaning}. Domain: ${e.domain}. Pantheon: ${e.pantheon}.`,
  }),

  tier: (e) => {
    const rules = {
      dual: 'It is Dual-Tier because the Greek original has both stress and length, and there are multiple historically valid Unicode spellings.',
      '1': 'It is Tier 1 because the Greek original has both stress and length, but only one historically valid Unicode restoration.',
      '2': 'It is Tier 2 because the Greek original preserves only one scholarly feature (stress or length), or neither.',
    };
    return {
      instruction: `What tier is "${e.unicode}" and why?`,
      input: e.unicode,
      output: `${e.unicode} is classified as ${e.tierLabel}. ${rules[e.tier] || ''}`,
    };
  },

  mythology: (e) => {
    if (!e.lore || !e.lore.mythologyMyths?.length) return null;
    const myths = e.lore.mythologyMyths
      .map((m) => `${m.tag ? `[${m.tag}] ` : ''}${m.title}: ${stripHtml(m.text || '')}`)
      .join(' ');
    return {
      instruction: `Tell me a myth about "${e.unicode}".`,
      input: e.unicode,
      output: `${e.lore.mythologyLead ? stripHtml(e.lore.mythologyLead) + ' ' : ''}${myths}`,
    };
  },

  breakdown: (e) => {
    if (!e.breakdown?.length) return null;
    const steps = e.breakdown.map((b) => `"${b.char}" → "${b.to}" (${b.type}${b.note ? `, ${b.note}` : ''})`).join('; ');
    return {
      instruction: `How does "${e.ascii}" transform into "${e.unicode}" character by character?`,
      input: e.ascii,
      output: `The ASCII form "${e.ascii}" becomes "${e.unicode}" through the following changes: ${steps}.`,
    };
  },

  variants: (e) => {
    if (!e.variants?.length) return null;
    const list = e.variants.map((v) => `${v.unicode} (${v.type})${v.note ? `: ${v.note}` : ''}`).join('; ');
    return {
      instruction: `What are the documented Unicode variants of "${e.unicode}"?`,
      input: e.unicode,
      output: `Documented variants of ${e.unicode}: ${list}.`,
    };
  },

  sources: (e) => {
    if (!e.sources?.length) return null;
    const list = e.sources.map((s) => `${s.key} — ${s.full}${s.url ? ` (${s.url})` : ''}`).join('; ');
    return {
      instruction: `What scholarly sources attest the name "${e.unicode}"?`,
      input: e.unicode,
      output: `The entry for ${e.unicode} is attested by: ${list}.`,
    };
  },

  homograph_safety: (e) => {
    if (!e.punycodeDomain) return null;
    const isSafe = e.ownership.isOwned || e.flagship.isFlagship || e.availability?.status === 'live';
    const domain = e.punycodeDomain;
    return {
      instruction: `Is the domain "${domain}" a safe canonical domain for "${e.unicode}"?`,
      input: domain,
      output: isSafe
        ? `Yes, ${domain} is a canonical or owned domain for ${e.unicode} (${e.ascii}). It is listed in the PÚNYCODEX collection.`
        : `${domain} resolves to the Unicode form ${e.unicode}, but always verify the registrant. It is not flagged as a spoof in the PÚNYCODEX corpus.`,
    };
  },
};

function generateForEntry(entry, indexBase) {
  const examples = [];
  let idx = indexBase;
  for (const [task, fn] of Object.entries(TEMPLATES)) {
    const generated = fn(entry);
    if (!generated) continue;
    examples.push({
      id: makeId(entry.id, task, idx++),
      entryId: entry.id,
      task,
      instruction: generated.instruction,
      input: generated.input,
      output: generated.output,
      sources: (entry.sources || []).map((s) => s.key),
      confidence: entry.pronunciation?.confidence || 'canonical',
    });
  }
  return examples;
}

function main() {
  const entries = loadEntries();
  const examples = [];
  for (const entry of entries) {
    examples.push(...generateForEntry(entry, 1));
  }

  const lines = examples.map((ex) => JSON.stringify(ex));
  fs.writeFileSync(OUT_PATH, lines.join('\n') + '\n');

  const byTask = {};
  for (const ex of examples) {
    byTask[ex.task] = (byTask[ex.task] || 0) + 1;
  }

  console.log(`✓ Generated ${examples.length} instruction examples to ${OUT_PATH}`);
  console.log(`  by task: ${JSON.stringify(byTask, null, 2)}`);
}

main();
