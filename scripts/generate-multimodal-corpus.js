#!/usr/bin/env node
/**
 * PuniCodex — Multimodal Corpus Generator (Phase 5)
 *
 * Emits vision-language instruction examples grounded in the flagship mascot,
 * logomark, and original-script assets. Each example pairs an image URL with
 * a scholarly description, glyph analysis, or brand-style caption.
 *
 * Output: data/corpus/multimodal-examples.jsonl
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const ENTRIES_PATH = path.join(ROOT, 'data', 'corpus', 'entries.jsonl');
const OUT_PATH = path.join(ROOT, 'data', 'corpus', 'multimodal-examples.jsonl');

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

function assetExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function buildMascotExample(entry, index) {
  if (!entry.flagship?.isFlagship) return null;
  const mascotPath = entry.flagship.mascotPath || `assets/images/mascots/webp/${entry.id}_mascot.webp`;
  if (!assetExists(mascotPath)) return null;
  return {
    id: makeId(entry.id, 'multimodal_mascot', index),
    entryId: entry.id,
    task: 'multimodal_mascot',
    image: `/${mascotPath}`,
    instruction: `Describe the mascot image for ${entry.unicode} and explain how it reflects the deity's domain.`,
    input: entry.unicode,
    output: `${entry.unicode} is the ${entry.pantheon} deity of ${entry.domain}. The mascot visual captures attributes associated with this identity: ${entry.meaning}. Tier: ${entry.tierLabel}.`,
    metadata: { pantheon: entry.pantheon, tier: entry.tier, asset: mascotPath },
  };
}

function buildLogomarkExample(entry, index) {
  if (!entry.flagship?.isFlagship) return null;
  const logomarkPath = entry.flagship.logomarkPath || `assets/images/logomarks/${entry.id}_logomark.svg`;
  if (!assetExists(logomarkPath)) return null;
  return {
    id: makeId(entry.id, 'multimodal_logomark', index),
    entryId: entry.id,
    task: 'multimodal_logomark',
    image: `/${logomarkPath}`,
    instruction: `What name does this logomark represent, and what is its scholarly Unicode restoration?`,
    input: entry.ascii,
    output: `The logomark represents ${entry.unicode} (${entry.ascii}), a ${entry.tierLabel} ${entry.pantheon} name meaning “${entry.meaning}”.`,
    metadata: { pantheon: entry.pantheon, tier: entry.tier, asset: logomarkPath },
  };
}

function buildScriptExample(entry, index) {
  const os = entry.originalScript;
  if (!os?.specimen || os.label !== 'Original Script') return null;
  return {
    id: makeId(entry.id, 'multimodal_script', index),
    entryId: entry.id,
    task: 'multimodal_script',
    image: null,
    instruction: `Given the original script specimen “${os.specimen}” for ${entry.unicode}, identify the writing system, direction, and region.`,
    input: os.specimen,
    output: `${os.specimen} is written in ${os.scriptName} (${os.family}), a ${os.writingDirection} script used in ${os.region}${os.timePeriod ? ` during ${os.timePeriod}` : ''}. It represents the name ${entry.unicode}.`,
    metadata: {
      scriptName: os.scriptName,
      family: os.family,
      writingDirection: os.writingDirection,
      region: os.region,
    },
  };
}

function buildGlyphExample(entry, index) {
  const os = entry.originalScript;
  if (!os?.codePoints?.length) return null;
  return {
    id: makeId(entry.id, 'multimodal_glyph', index),
    entryId: entry.id,
    task: 'multimodal_glyph',
    image: null,
    instruction: `List the Unicode code points for the original script form of ${entry.unicode}.`,
    input: os.specimen || entry.unicode,
    output: `The original script form of ${entry.unicode} is encoded as: ${os.codePoints.join(' ')}.`,
    metadata: { codePoints: os.codePoints.length, scriptName: os.scriptName },
  };
}

function generateForEntry(entry, index) {
  return [
    buildMascotExample(entry, index),
    buildLogomarkExample(entry, index),
    buildScriptExample(entry, index),
    buildGlyphExample(entry, index),
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

  console.log(`✓ Generated ${examples.length} multimodal examples to ${OUT_PATH}`);
  console.log(`  by task: ${JSON.stringify(byTask, null, 2)}`);
}

main();
