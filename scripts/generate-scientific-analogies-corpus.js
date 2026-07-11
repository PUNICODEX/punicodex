#!/usr/bin/env node
/**
 * PÚNYCODEX — Scientific & Philosophical Analogy Corpus Generator (Phase 13)
 *
 * Builds a training corpus that teaches the AI to bridge ancient mythological
 * figures with modern scientific and philosophical concepts. Every analogy is
 * tagged with confidence, discipline, and a rationale that emphasizes analogy
 * over equivalence.
 *
 * Canonical source: scripts/scientific-analogies.json
 * Input: data/corpus/entries.jsonl
 * Output: data/corpus/scientific-analogies.jsonl
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createRng } = require('./rng');

Math.random = createRng();

const ROOT = path.join(__dirname, '..');
const ENTRIES_PATH = path.join(ROOT, 'data', 'corpus', 'entries.jsonl');
const SCIENCE_PATH = path.join(ROOT, 'scripts', 'scientific-analogies.json');
const OUT_PATH = path.join(ROOT, 'data', 'corpus', 'scientific-analogies.jsonl');

function loadEntries() {
  const text = fs.readFileSync(ENTRIES_PATH, 'utf8');
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function loadScience() {
  return JSON.parse(fs.readFileSync(SCIENCE_PATH, 'utf8'));
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

function disciplineLabel(discipline, scienceData) {
  return scienceData.disciplines[discipline]?.label || discipline;
}

function collectMappings(entry, scienceData) {
  const explicit = (scienceData.explicitMappings || []).filter((m) => m.entryId === entry.id);
  const inferred = inferMappings(entry, scienceData);
  const all = [...explicit];
  const seen = new Set(explicit.map((m) => `${m.discipline}:${m.concept}`));
  for (const m of inferred) {
    const key = `${m.discipline}:${m.concept}`;
    if (!seen.has(key)) {
      all.push(m);
      seen.add(key);
    }
  }
  return all;
}

function inferMappings(entry, scienceData) {
  const rules = Object.values(scienceData.heuristicRules || {});
  const mappings = [];
  const text = `${(entry.meaning || '').toLowerCase()} ${(entry.lore?.mythologyLead || '').toLowerCase()} ${(entry.lore?.domainsLead || '').toLowerCase()}`;

  for (const rule of rules) {
    const regex = new RegExp(rule.pattern, 'i');
    if (regex.test(text)) {
      mappings.push({
        entryId: entry.id,
        discipline: rule.discipline,
        concept: rule.concept,
        confidence: rule.confidence || 'low',
        rationale: `Inferred from domain keywords matching "${rule.pattern}".`,
      });
    }
  }
  return mappings;
}

function groupByDiscipline(mappings, scienceData) {
  const grouped = {};
  for (const m of mappings) {
    if (!grouped[m.discipline]) grouped[m.discipline] = [];
    grouped[m.discipline].push(m);
  }
  return grouped;
}

function buildLookupExamples(entries, scienceData, count, rng) {
  const examples = [];
  const sample = pick(entries, Math.min(count, entries.length), rng);
  for (let i = 0; i < sample.length; i++) {
    const e = sample[i];
    const mappings = collectMappings(e, scienceData);
    const grouped = groupByDiscipline(mappings, scienceData);
    const disciplines = Object.keys(grouped);

    let output;
    if (disciplines.length === 0) {
      output = `${e.unicode} does not yet have curated scientific or philosophical analogies in the PÚNYCODEX corpus. This is not a deficit; many figures resist modern translation without distorting their original meaning. We prefer silence over forced equivalence.`;
    } else {
      const lines = disciplines.map((d) => {
        const ms = grouped[d];
        const labels = ms.map((m) => `${m.concept} (${m.confidence} confidence)`);
        return `- **${disciplineLabel(d, scienceData)}**: ${sentenceList(labels)}`;
      });
      output = `${e.unicode} (“${e.meaning}”) resonates with modern thought in the following ways:\n${lines.join('\n')}\n\nThese are analogies, not identities. The ancient figure and the modern concept attempt to name similar patterns from different cultural and methodological starting points.`;
    }

    examples.push({
      id: makeId(e.id, 'science_analogy_lookup', i + 1),
      entryId: e.id,
      task: 'science_analogy_lookup',
      instruction: `What modern scientific or philosophical concepts does ${e.unicode} map onto?`,
      input: e.unicode,
      output,
      metadata: { entryId: e.id, mappingCount: mappings.length, disciplines },
    });
  }
  return examples;
}

function buildExplainExamples(entries, scienceData, count, rng) {
  const examples = [];
  const withMappings = entries.filter((e) => collectMappings(e, scienceData).length > 0);
  for (let i = 0; i < count && withMappings.length; i++) {
    const e = pickOne(withMappings, rng);
    const mappings = collectMappings(e, scienceData);
    const m = pickOne(mappings, rng);
    examples.push({
      id: makeId(e.id, 'science_analogy_explain', i + 1),
      entryId: e.id,
      task: 'science_analogy_explain',
      instruction: `How does ${e.unicode} relate to ${m.concept} in ${disciplineLabel(m.discipline, scienceData)}?`,
      input: `${e.unicode} → ${m.discipline}:${m.concept}`,
      output: `${e.unicode} can be read alongside ${m.concept} in ${disciplineLabel(m.discipline, scienceData)} with ${m.confidence} confidence. ${m.rationale} This is an analogy: the myth encodes in narrative what ${m.concept} encodes in equations or concepts. The two are not the same, but they converge on a shared structural intuition about how reality is organized.`,
      metadata: { entryId: e.id, discipline: m.discipline, concept: m.concept, confidence: m.confidence },
    });
  }
  return examples;
}

function buildCompareExamples(entries, scienceData, count, rng) {
  const examples = [];
  const withMappings = entries.filter((e) => collectMappings(e, scienceData).length > 0);
  for (let i = 0; i < count && withMappings.length >= 2; i++) {
    const pair = pick(withMappings, 2, rng);
    const [a, b] = pair;
    const aMaps = collectMappings(a, scienceData);
    const bMaps = collectMappings(b, scienceData);
    const aConcepts = new Set(aMaps.map((m) => m.concept));
    const shared = bMaps.filter((m) => aConcepts.has(m.concept)).slice(0, 3);

    let output;
    if (shared.length > 0) {
      output = `${a.unicode} and ${b.unicode} both speak to modern thought through concepts such as ${sentenceList(shared.map((m) => m.concept))}. Yet they approach these patterns from different traditions: ${a.unicode} means “${a.meaning}” in the ${a.pantheon} context, while ${b.unicode} means “${b.meaning}” in the ${b.pantheon} context. Shared structure does not mean shared origin.`;
    } else {
      output = `${a.unicode} and ${b.unicode} do not currently share any mapped modern concepts. ${a.unicode} resonates most strongly with ${aMaps[0].concept} (${disciplineLabel(aMaps[0].discipline, scienceData)}), whereas ${b.unicode} resonates with ${bMaps[0].concept} (${disciplineLabel(bMaps[0].discipline, scienceData)}). Their modern analogies are distinct, which highlights how different cultures patterned the world differently.`;
    }

    examples.push({
      id: makeId(a.id, 'science_analogy_compare', i + 1),
      entryId: a.id,
      task: 'science_analogy_compare',
      instruction: `Compare the modern scientific/philosophical resonances of ${a.unicode} and ${b.unicode}.`,
      input: `${a.unicode} + ${b.unicode}`,
      output,
      metadata: { ids: [a.id, b.id], sharedConcepts: shared.map((m) => m.concept) },
    });
  }
  return examples;
}

function buildSynthesizeExamples(entries, scienceData, count, rng) {
  const examples = [];
  const withMappings = entries.filter((e) => collectMappings(e, scienceData).length >= 2);
  const sample = pick(withMappings, Math.min(count, withMappings.length), rng);
  for (let i = 0; i < sample.length; i++) {
    const e = sample[i];
    const mappings = collectMappings(e, scienceData);
    const grouped = groupByDiscipline(mappings, scienceData);
    const themes = Object.entries(grouped).map(([d, ms]) => {
      return `${disciplineLabel(d, scienceData)} (${ms.map((m) => m.concept).join(', ')})`;
    });

    examples.push({
      id: makeId(e.id, 'science_analogy_synthesize', i + 1),
      entryId: e.id,
      task: 'science_analogy_synthesize',
      instruction: `Synthesize a modern analogical profile for ${e.unicode}.`,
      input: e.unicode,
      output: `${e.unicode} (“${e.meaning}”) is not merely an ancient figure; it is a pattern detector for the modern mind. Across disciplines, the figure maps onto: ${sentenceList(themes)}. These analogies do not reduce ${e.unicode} to science, nor science to myth. Instead, they show that human beings have been trying to name the same deep structures—chaos and order, creation and dissolution, time and pattern—using the symbolic and conceptual tools available to them.`,
      metadata: { entryId: e.id, disciplineCount: Object.keys(grouped).length },
    });
  }
  return examples;
}

function buildCautionExamples(entries, scienceData, count, rng) {
  const examples = [];
  const withLow = entries
    .map((e) => ({ e, mappings: collectMappings(e, scienceData).filter((m) => m.confidence === 'low') }))
    .filter((x) => x.mappings.length > 0);

  for (let i = 0; i < count && withLow.length; i++) {
    const { e, mappings } = pickOne(withLow, rng);
    const m = pickOne(mappings, rng);
    examples.push({
      id: makeId(e.id, 'science_analogy_caution', i + 1),
      entryId: e.id,
      task: 'science_analogy_caution',
      instruction: `Is ${e.unicode} actually the same as ${m.concept}?`,
      input: `${e.unicode} → ${m.discipline}:${m.concept}`,
      output: `No. ${e.unicode} is not ${m.concept}. This mapping is marked **low confidence** in the corpus because ${m.rationale.toLowerCase()} The value of the analogy is heuristic: it helps the modern mind find a foothold in ancient symbolism. But presenting it as scientific evidence or historical fact would be a category error. Use analogies to open questions, not to close them.`,
      metadata: { entryId: e.id, discipline: m.discipline, concept: m.concept },
    });
  }
  return examples;
}

function buildPatternBridgeExamples(entries, scienceData, count, rng) {
  const examples = [];
  const withMappings = entries.filter((e) => collectMappings(e, scienceData).length > 0);
  for (let i = 0; i < count && withMappings.length; i++) {
    const e = pickOne(withMappings, rng);
    const mappings = collectMappings(e, scienceData);
    const m = pickOne(mappings, rng);
    examples.push({
      id: makeId(e.id, 'science_pattern_bridge', i + 1),
      entryId: e.id,
      task: 'science_pattern_bridge',
      instruction: `Connect the ancient pattern embodied by ${e.unicode} to the modern pattern of ${m.concept}.`,
      input: `${e.unicode} → ${m.concept}`,
      output: `The ancient pattern is this: ${e.unicode} means “${e.meaning}” and functions in the ${e.pantheon} tradition as ${m.rationale} The modern pattern is ${m.concept} in ${disciplineLabel(m.discipline, scienceData)}. The bridge between them is structural, not historical: both are attempts to articulate how a particular force or regularity shapes reality. The ancient mind used story and deity; the modern mind uses measurement and model. Neither cancels the other; they are complementary descriptions of the same pattern-family.`,
      metadata: { entryId: e.id, discipline: m.discipline, concept: m.concept },
    });
  }
  return examples;
}

function main() {
  const entries = loadEntries();
  const scienceData = loadScience();

  const counts = {
    science_analogy_lookup: 400,
    science_analogy_explain: 300,
    science_analogy_compare: 300,
    science_analogy_synthesize: 200,
    science_analogy_caution: 150,
    science_pattern_bridge: 150,
  };

  const examples = [];
  examples.push(...buildLookupExamples(entries, scienceData, counts.science_analogy_lookup, Math.random));
  examples.push(...buildExplainExamples(entries, scienceData, counts.science_analogy_explain, Math.random));
  examples.push(...buildCompareExamples(entries, scienceData, counts.science_analogy_compare, Math.random));
  examples.push(...buildSynthesizeExamples(entries, scienceData, counts.science_analogy_synthesize, Math.random));
  examples.push(...buildCautionExamples(entries, scienceData, counts.science_analogy_caution, Math.random));
  examples.push(...buildPatternBridgeExamples(entries, scienceData, counts.science_pattern_bridge, Math.random));

  const lines = examples.map((ex) => JSON.stringify(ex));
  fs.writeFileSync(OUT_PATH, lines.join('\n') + '\n');

  const byTask = {};
  for (const ex of examples) {
    byTask[ex.task] = (byTask[ex.task] || 0) + 1;
  }

  console.log(`✓ Generated ${examples.length} scientific/philosophical analogy examples to ${OUT_PATH}`);
  console.log(`  by task: ${JSON.stringify(byTask, null, 2)}`);
}

main();
