#!/usr/bin/env node
/**
 * PuniCodex — Mythology Synthesis Corpus Generator
 *
 * Builds a training corpus that teaches the AI to think comparatively,
 * esoterically, and synthetically about mythological figures across
 * traditions, while bridging ancient symbols with modern science and
 * biblical narratives with older archetypes.
 *
 * Canonical source: scripts/mythology-themes.json
 * Input: data/corpus/entries.jsonl
 * Output: data/corpus/mythology-synthesis.jsonl
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createRng } = require('./rng');

Math.random = createRng();

const ROOT = path.join(__dirname, '..');
const ENTRIES_PATH = path.join(ROOT, 'data', 'corpus', 'entries.jsonl');
const THEMES_PATH = path.join(ROOT, 'scripts', 'mythology-themes.json');
const OUT_PATH = path.join(ROOT, 'data', 'corpus', 'mythology-synthesis.jsonl');

function loadEntries() {
  const text = fs.readFileSync(ENTRIES_PATH, 'utf8');
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function loadThemes() {
  return JSON.parse(fs.readFileSync(THEMES_PATH, 'utf8'));
}

function makeId(entryId, task, index) {
  return `${entryId}-${task}-${String(index).padStart(4, '0')}`;
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

function sentenceList(items, conj = 'and') {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conj} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, ${conj} ${items.at(-1)}`;
}

function buildThemeExamples(theme, existingIds, index) {
  const examples = [];

  // Collect valid entry ids across all pantheons for this theme.
  const allEntries = [];
  for (const [pantheon, ids] of Object.entries(theme.entries || {})) {
    for (const id of ids) {
      if (existingIds.has(id)) allEntries.push(id);
    }
  }
  if (allEntries.length < 2) return examples;

  const sampleIds = pick(allEntries, Math.min(5, allEntries.length));
  const names = sampleIds.map((id) => existingIds.get(id).unicode).filter(Boolean);
  if (names.length < 2) return examples;

  // comparative analysis
  examples.push({
    id: makeId(theme.id, 'myth_comparative_analysis', index),
    entryId: sampleIds[0],
    task: 'myth_comparative_analysis',
    instruction: `Compare the following figures from different traditions under the theme "${theme.label}": ${sentenceList(names)}.`,
    input: theme.label,
    output: `${theme.archetypal_summary} In this pattern we see ${sentenceList(names)} appearing as cultural expressions of the same underlying theme: ${theme.description} Modern resonances include ${sentenceList(theme.modern_parallels)}.`,
    metadata: { theme: theme.id, sampleIds },
  });

  // pattern recognition
  examples.push({
    id: makeId(theme.id, 'myth_pattern_recognition', index + 1),
    entryId: sampleIds[0],
    task: 'myth_pattern_recognition',
    instruction: `What recurring mythological pattern connects ${sentenceList(names)}?`,
    input: theme.label,
    output: `The recurring pattern is "${theme.label}". ${theme.description} This pattern appears independently in traditions that had no direct contact, suggesting it reflects a deep structural motif in human meaning-making: ${theme.archetypal_summary}`,
    metadata: { theme: theme.id, sampleIds },
  });

  // esoteric synthesis
  examples.push({
    id: makeId(theme.id, 'myth_esoteric_synthesis', index + 2),
    entryId: sampleIds[0],
    task: 'myth_esoteric_synthesis',
    instruction: `Offer an esoteric synthesis of "${theme.label}" that bridges ancient mind and modern mind.`,
    input: theme.label,
    output: `Esoterically, ${theme.label} is not merely a story but a map of consciousness. ${theme.archetypal_summary} The ancient mind encoded this as myth; the modern mind recognizes it in ${theme.modern_parallels[0] || 'emergent systems'}. Together they describe the same threshold: where the unformed becomes formed, and where the hidden becomes visible.`,
    metadata: { theme: theme.id },
  });

  // archetype mapping
  examples.push({
    id: makeId(theme.id, 'myth_archetype_mapping', index + 3),
    entryId: sampleIds[0],
    task: 'myth_archetype_mapping',
    instruction: `Map the figures ${sentenceList(names)} to the archetype "${theme.label}".`,
    input: theme.label,
    output: `Each of these figures is a local mask of the ${theme.label} archetype. ${theme.archetypal_summary} Their names differ, but their narrative function is identical: ${theme.description}`,
    metadata: { theme: theme.id, sampleIds },
  });

  // cross-tradition syncretism
  if (sampleIds.length >= 2) {
    const a = existingIds.get(sampleIds[0]);
    const b = existingIds.get(sampleIds[1]);
    examples.push({
      id: makeId(theme.id, 'myth_cross_tradition_syncretism', index + 4),
      entryId: sampleIds[0],
      task: 'myth_cross_tradition_syncretism',
      instruction: `How does ${a.unicode} (${a.pantheon}) relate to ${b.unicode} (${b.pantheon})?`,
      input: `${a.unicode} + ${b.unicode}`,
      output: `${a.unicode} and ${b.unicode} are cross-traditional expressions of ${theme.label}. ${a.unicode} means “${a.meaning}” in the ${a.pantheon} tradition, while ${b.unicode} means “${b.meaning}” in the ${b.pantheon} tradition. Both point to the same archetype: ${theme.archetypal_summary}`,
      metadata: { theme: theme.id, ids: [sampleIds[0], sampleIds[1]] },
    });
  }

  return examples;
}

function buildModernParallelExample(mapping, existingIds, index) {
  const entry = existingIds.get(mapping.entry);
  if (!entry) return null;
  return {
    id: makeId(mapping.entry, 'myth_modern_parallel', index),
    entryId: mapping.entry,
    task: 'myth_modern_parallel',
    instruction: `How does the ancient figure ${entry.unicode} resonate with the modern world?`,
    input: entry.unicode,
    output: `${entry.unicode} (“${entry.meaning}”) belongs to the ${entry.pantheon} tradition. In the modern mind, this figure maps onto ${sentenceList(mapping.parallels)}. The ancient symbol and the modern concept are both attempts to name the same force or pattern: ${mapping.parallels[0] ? mapping.parallels[0].toLowerCase() : 'a fundamental structure of reality'}.`,
    metadata: { entryId: mapping.entry, parallels: mapping.parallels },
  };
}

function buildBiblicalBridgeExample(bridge, existingIds, index) {
  const validParallels = (bridge.ancient_parallels || []).filter((p) => existingIds.has(p.entry));
  if (validParallels.length === 0) return null;

  const parallelNames = validParallels.map((p) => {
    const e = existingIds.get(p.entry);
    return `${e.unicode} (${e.pantheon})`;
  });

  return {
    id: makeId(bridge.biblical_figure.toLowerCase().replace(/[^a-z0-9]/g, '_'), 'myth_biblical_bridge', index),
    entryId: validParallels[0].entry,
    task: 'myth_biblical_bridge',
    instruction: `What ancient mythological patterns prefigure the biblical figure ${bridge.biblical_figure}?`,
    input: bridge.biblical_figure,
    output: `${bridge.biblical_figure} reflects the ancient pattern: “${bridge.pattern}.” This motif appears earlier in ${sentenceList(parallelNames)}. ${validParallels[0].relation} The biblical narrative is therefore a late but resonant iteration of a much older archetype, adapted to a new theological framework.`,
    metadata: { biblicalFigure: bridge.biblical_figure, pattern: bridge.pattern, parallels: validParallels.map((p) => p.entry) },
  };
}

function buildThematicConnectionExample(entry, themes, existingIds, index) {
  // Find themes that include this entry.
  const matched = [];
  for (const theme of themes) {
    const ids = Object.values(theme.entries || {}).flat();
    if (ids.includes(entry.id)) matched.push(theme);
  }
  if (matched.length === 0) return null;

  const theme = matched[0];
  const relatedThemes = pick(matched.slice(1), Math.min(2, matched.length - 1));

  return {
    id: makeId(entry.id, 'myth_thematic_connection', index),
    entryId: entry.id,
    task: 'myth_thematic_connection',
    instruction: `What universal themes does ${entry.unicode} connect to?`,
    input: entry.unicode,
    output: `${entry.unicode} (“${entry.meaning}”) is primarily an expression of ${theme.label}. ${theme.archetypal_summary}${relatedThemes.length ? ` It also resonates with ${sentenceList(relatedThemes.map((t) => t.label))}.` : ''} These connections show how a single name can participate in multiple layers of mythic patterning.`,
    metadata: { primaryTheme: theme.id, relatedThemes: relatedThemes.map((t) => t.id) },
  };
}

function main() {
  const entries = loadEntries();
  const existingIds = new Map(entries.map((e) => [e.id, e]));
  const themesData = loadThemes();

  const examples = [];
  let idx = 1;

  for (const theme of themesData.themes || []) {
    const themeExamples = buildThemeExamples(theme, existingIds, idx);
    examples.push(...themeExamples);
    idx += themeExamples.length + 1;
  }

  for (const mapping of themesData.modern_parallels || []) {
    const ex = buildModernParallelExample(mapping, existingIds, idx++);
    if (ex) examples.push(ex);
  }

  for (const bridge of themesData.biblical_bridges || []) {
    const ex = buildBiblicalBridgeExample(bridge, existingIds, idx++);
    if (ex) examples.push(ex);
  }

  for (const entry of entries) {
    const ex = buildThematicConnectionExample(entry, themesData.themes || [], existingIds, idx++);
    if (ex) examples.push(ex);
  }

  const lines = examples.map((ex) => JSON.stringify(ex));
  fs.writeFileSync(OUT_PATH, lines.join('\n') + '\n');

  const byTask = {};
  for (const ex of examples) {
    byTask[ex.task] = (byTask[ex.task] || 0) + 1;
  }

  console.log(`✓ Generated ${examples.length} mythology synthesis examples to ${OUT_PATH}`);
  console.log(`  by task: ${JSON.stringify(byTask, null, 2)}`);
}

main();
