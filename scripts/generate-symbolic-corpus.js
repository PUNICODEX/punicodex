#!/usr/bin/env node
/**
 * PÚNYCODEX — Symbolic & Hermetic Correspondence Corpus Generator (Phase 12)
 *
 * Builds a training corpus that teaches the AI to map mythological figures to
 * symbolic systems (planetary, elemental, alchemical, tarot, chakras, sefirot,
 * runes, wuxing, directions, metals, gemstones, colors, animals) with explicit
 * confidence levels and cultural provenance.
 *
 * Canonical source: scripts/symbolic-correspondences.json
 * Input: data/corpus/entries.jsonl
 * Output: data/corpus/symbolic-correspondences.jsonl
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createRng } = require('./rng');

Math.random = createRng();

const ROOT = path.join(__dirname, '..');
const ENTRIES_PATH = path.join(ROOT, 'data', 'corpus', 'entries.jsonl');
const SYMBOLS_PATH = path.join(ROOT, 'scripts', 'symbolic-correspondences.json');
const OUT_PATH = path.join(ROOT, 'data', 'corpus', 'symbolic-correspondences.jsonl');

function loadEntries() {
  const text = fs.readFileSync(ENTRIES_PATH, 'utf8');
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function loadSymbols() {
  return JSON.parse(fs.readFileSync(SYMBOLS_PATH, 'utf8'));
}

function pick(arr, n, rng = Math.random) {
  const copy = arr.slice();
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

function pickOne(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)];
}

function makeId(entryId, task, index) {
  return `${entryId}-${task}-${String(index).padStart(4, '0')}`;
}

function sentenceList(items, conj = 'and') {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conj} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, ${conj} ${items.at(-1)}`;
}

function collectMappings(entry, symbolsData) {
  const explicit = (symbolsData.explicitMappings || []).filter((m) => m.entryId === entry.id);
  const inferred = inferMappings(entry, symbolsData);
  const all = [...explicit];
  const seen = new Set(explicit.map((m) => `${m.system}:${m.symbol}`));
  for (const m of inferred) {
    const key = `${m.system}:${m.symbol}`;
    if (!seen.has(key)) {
      all.push(m);
      seen.add(key);
    }
  }
  return all;
}

function inferMappings(entry, symbolsData) {
  const rules = symbolsData.heuristicRules || {};
  const pantheonRules = rules[entry.pantheon];
  if (!pantheonRules || !pantheonRules.byDomain) return [];

  const mappings = [];
  const meaning = (entry.meaning || '').toLowerCase();
  const domains = (entry.lore?.domainsCards || []).map((c) => (c.title || '').toLowerCase()).join(' ');
  const text = `${meaning} ${domains}`;

  for (const [pattern, mapping] of Object.entries(pantheonRules.byDomain)) {
    const regex = new RegExp(pattern.replace(/\|/g, '|'), 'i');
    if (regex.test(text)) {
      mappings.push({
        entryId: entry.id,
        system: mapping.system,
        symbol: mapping.symbol,
        confidence: mapping.confidence || 'low',
        rationale: `Inferred from ${entry.pantheon} domain keywords matching "${pattern}".`,
      });
    }
  }
  return mappings;
}

function groupBySystem(mappings, symbolsData) {
  const grouped = {};
  for (const m of mappings) {
    if (!grouped[m.system]) grouped[m.system] = [];
    grouped[m.system].push(m);
  }
  return grouped;
}

function systemLabel(system, symbolsData) {
  return symbolsData.systems[system]?.label || system;
}

function buildLookupExamples(entries, symbolsData, count, rng) {
  const examples = [];
  const sample = pick(entries, Math.min(count, entries.length), rng);
  for (let i = 0; i < sample.length; i++) {
    const e = sample[i];
    const mappings = collectMappings(e, symbolsData);
    const grouped = groupBySystem(mappings, symbolsData);
    const systems = Object.keys(grouped);

    let output;
    if (systems.length === 0) {
      output = `${e.unicode} does not yet have established symbolic correspondences in the PÚNYCODEX corpus. This may be because the figure's domain is too local, too obscure, or because explicit scholarly mappings are still being curated. When in doubt, we prefer silence over invention.`;
    } else {
      const lines = systems.map((sys) => {
        const ms = grouped[sys];
        const labels = ms.map((m) => `${m.symbol} (${m.confidence} confidence)`);
        return `- **${systemLabel(sys, symbolsData)}**: ${sentenceList(labels)}`;
      });
      output = `${e.unicode} (“${e.meaning}”) maps to the following symbolic systems:\n${lines.join('\n')}\n\nEach correspondence is tagged with a confidence level. High-confidence mappings come from explicit historical identifications (e.g., deity-planet equations). Lower-confidence mappings are inferred from domain keywords and should be treated as provisional.`;
    }

    examples.push({
      id: makeId(e.id, 'symbolic_lookup', i + 1),
      entryId: e.id,
      task: 'symbolic_lookup',
      instruction: `List the symbolic correspondences for ${e.unicode}.`,
      input: e.unicode,
      output,
      metadata: { entryId: e.id, mappingCount: mappings.length, systems: systems },
    });
  }
  return examples;
}

function buildCompareExamples(entries, symbolsData, count, rng) {
  const examples = [];
  const withMappings = entries.filter((e) => collectMappings(e, symbolsData).length > 0);
  for (let i = 0; i < count && withMappings.length >= 2; i++) {
    const pair = pick(withMappings, 2, rng);
    const [a, b] = pair;
    const aMaps = collectMappings(a, symbolsData);
    const bMaps = collectMappings(b, symbolsData);
    const aSystems = new Set(aMaps.map((m) => m.system));
    const shared = bMaps.filter((m) => aSystems.has(m.system));

    let output;
    if (shared.length > 0) {
      const sharedLines = shared.map((m) => `- Both connect to **${systemLabel(m.system, symbolsData)}** (${m.symbol} for ${b.unicode}; ${aMaps.find((x) => x.system === m.system)?.symbol || 'a related symbol'} for ${a.unicode}).`).slice(0, 4);
      output = `${a.unicode} and ${b.unicode} share symbolic territory:\n${sharedLines.join('\n')}\n\nYet they express it differently: ${a.unicode} means “${a.meaning}” in the ${a.pantheon} tradition, while ${b.unicode} means “${b.meaning}” in the ${b.pantheon} tradition. Shared structures do not erase cultural specificity.`;
    } else {
      output = `${a.unicode} and ${b.unicode} do not share any mapped symbolic systems in the current corpus. ${a.unicode} is anchored in ${a.pantheon} symbolism, and ${b.unicode} in ${b.pantheon} symbolism. Their symbolic vocabularies are distinct, which is itself meaningful: not all traditions map neatly onto the same grid.`;
    }

    examples.push({
      id: makeId(a.id, 'symbolic_compare', i + 1),
      entryId: a.id,
      task: 'symbolic_compare',
      instruction: `Compare the symbolic correspondences of ${a.unicode} and ${b.unicode}.`,
      input: `${a.unicode} + ${b.unicode}`,
      output,
      metadata: { ids: [a.id, b.id], sharedSystems: shared.map((m) => m.system) },
    });
  }
  return examples;
}

function buildExplainExamples(entries, symbolsData, count, rng) {
  const examples = [];
  const withMappings = entries.filter((e) => collectMappings(e, symbolsData).length > 0);
  for (let i = 0; i < count && withMappings.length; i++) {
    const e = pickOne(withMappings, rng);
    const mappings = collectMappings(e, symbolsData);
    const m = pickOne(mappings, rng);
    examples.push({
      id: makeId(e.id, 'symbolic_explain', i + 1),
      entryId: e.id,
      task: 'symbolic_explain',
      instruction: `Why does ${e.unicode} correspond to ${m.symbol} in the ${systemLabel(m.system, symbolsData)} system?`,
      input: `${e.unicode} → ${m.system}:${m.symbol}`,
      output: `${e.unicode} is mapped to **${m.symbol}** under **${systemLabel(m.system, symbolsData)}** with ${m.confidence} confidence. ${m.rationale} This correspondence is valid within its own symbolic grammar; it does not mean ${e.unicode} *is* ${m.symbol}, but that ${m.symbol} is one lens through which the figure's domain becomes visible.`,
      metadata: { entryId: e.id, system: m.system, symbol: m.symbol, confidence: m.confidence },
    });
  }
  return examples;
}

function buildSynthesizeExamples(entries, symbolsData, count, rng) {
  const examples = [];
  const withMappings = entries.filter((e) => collectMappings(e, symbolsData).length >= 2);
  const sample = pick(withMappings, Math.min(count, withMappings.length), rng);
  for (let i = 0; i < sample.length; i++) {
    const e = sample[i];
    const mappings = collectMappings(e, symbolsData);
    const grouped = groupBySystem(mappings, symbolsData);
    const themes = Object.entries(grouped).map(([sys, ms]) => {
      return `${systemLabel(sys, symbolsData)} (${ms.map((m) => m.symbol).join(', ')})`;
    });

    examples.push({
      id: makeId(e.id, 'symbolic_synthesize', i + 1),
      entryId: e.id,
      task: 'symbolic_synthesize',
      instruction: `Synthesize a unified symbolic profile for ${e.unicode}.`,
      input: e.unicode,
      output: `${e.unicode} (“${e.meaning}”) presents a multi-layered symbolic profile. Across the systems we track, the figure appears in: ${sentenceList(themes)}. These mappings are not random decorations; they converge on the figure's core domain. The highest-confidence correspondences should be treated as primary; lower-confidence mappings are suggestive analogies that invite further exploration rather than fixed dogma.`,
      metadata: { entryId: e.id, systemCount: Object.keys(grouped).length },
    });
  }
  return examples;
}

function buildCautionExamples(entries, symbolsData, count, rng) {
  const examples = [];
  const lowConfidence = entries
    .map((e) => ({ e, mappings: collectMappings(e, symbolsData).filter((m) => m.confidence === 'low') }))
    .filter((x) => x.mappings.length > 0);

  for (let i = 0; i < count && lowConfidence.length; i++) {
    const { e, mappings } = pickOne(lowConfidence, rng);
    const m = pickOne(mappings, rng);
    examples.push({
      id: makeId(e.id, 'symbolic_caution', i + 1),
      entryId: e.id,
      task: 'symbolic_caution',
      instruction: `Is it correct to say ${e.unicode} corresponds to ${m.symbol} in ${systemLabel(m.system, symbolsData)}?`,
      input: `${e.unicode} → ${m.system}:${m.symbol}`,
      output: `This correspondence is marked as **low confidence** in the PÚNYCODEX corpus. ${m.rationale} It is best treated as a suggestive analogy or a late interpretive overlay rather than an ancient, attested equivalence. When discussing ${e.unicode} with others, lead with high-confidence mappings and clearly label speculative ones to avoid presenting modern esoteric synthesis as historical fact.`,
      metadata: { entryId: e.id, system: m.system, symbol: m.symbol },
    });
  }
  return examples;
}

function main() {
  const entries = loadEntries();
  const symbolsData = loadSymbols();

  const counts = {
    symbolic_lookup: 400,
    symbolic_compare: 300,
    symbolic_explain: 300,
    symbolic_synthesize: 300,
    symbolic_caution: 200,
  };

  const examples = [];
  examples.push(...buildLookupExamples(entries, symbolsData, counts.symbolic_lookup, Math.random));
  examples.push(...buildCompareExamples(entries, symbolsData, counts.symbolic_compare, Math.random));
  examples.push(...buildExplainExamples(entries, symbolsData, counts.symbolic_explain, Math.random));
  examples.push(...buildSynthesizeExamples(entries, symbolsData, counts.symbolic_synthesize, Math.random));
  examples.push(...buildCautionExamples(entries, symbolsData, counts.symbolic_caution, Math.random));

  const lines = examples.map((ex) => JSON.stringify(ex));
  fs.writeFileSync(OUT_PATH, lines.join('\n') + '\n');

  const byTask = {};
  for (const ex of examples) {
    byTask[ex.task] = (byTask[ex.task] || 0) + 1;
  }

  console.log(`✓ Generated ${examples.length} symbolic correspondence examples to ${OUT_PATH}`);
  console.log(`  by task: ${JSON.stringify(byTask, null, 2)}`);
}

main();
