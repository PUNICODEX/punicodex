#!/usr/bin/env node
/**
 * Fix breakdowns after the Greek acute-accent audit.
 *
 * The audit moved acute accents onto the correct vowels in many Greek
 * entries (e.g. Aias -> Aías, Daidalos -> Daídalos). The breakdown `to`
 * values must reconstruct exactly to the canonical `unicode` form.
 *
 * This script:
 *   1. Finds every entry whose breakdown reconstruction != unicode.
 *   2. If the unicode clusters 1:1 with breakdown steps, updates each
 *      step's `to` and `type` to match the cluster's diacritics.
 *   3. Removes variants that accidentally duplicate the primary unicode.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const lexiconPath = path.join(__dirname, '../type/js/lexicon.js');
const lexiconCode = fs.readFileSync(lexiconPath, 'utf8').replace('const LEXICON', 'var LEXICON');
const LEXICON = new Function(`${lexiconCode}; return LEXICON;`)();

const STRESS_MARKS = new Set(['\u0300', '\u0301', '\u0302']); // grave, acute, circumflex
const LENGTH_MARKS = new Set(['\u0304']); // macron

function nfdClusters(str) {
  const nfd = str.normalize('NFD');
  const clusters = [];
  for (const char of nfd) {
    const cp = char.codePointAt(0);
    if (cp >= 0x0300 && cp <= 0x036f) {
      if (clusters.length > 0) clusters[clusters.length - 1].marks.push(char);
    } else {
      clusters.push({ base: char, marks: [] });
    }
  }
  return clusters;
}

function clusterToString(c) {
  return (c.base + c.marks.join('')).normalize('NFC');
}

function typeForCluster(c) {
  const hasStress = c.marks.some((m) => STRESS_MARKS.has(m));
  const hasLength = c.marks.some((m) => LENGTH_MARKS.has(m));
  if (hasStress && hasLength) return 'dual';
  if (hasStress) return 'stress';
  if (hasLength) return 'length';
  return 'same';
}

let fixed = 0;
let manual = [];
let duplicateVariantsRemoved = 0;

for (const entry of LEXICON) {
  if (!entry.breakdown || !entry.unicode) continue;

  // Remove variants whose unicode equals the primary unicode
  if (entry.variants) {
    const before = entry.variants.length;
    entry.variants = entry.variants.filter((v) => {
      if (!v || typeof v.unicode !== 'string') return true;
      return v.unicode.normalize('NFC') !== entry.unicode.normalize('NFC');
    });
    duplicateVariantsRemoved += before - entry.variants.length;
  }

  const reconstructed = entry.breakdown.map((s) => s.to).join('').normalize('NFC');
  const target = entry.unicode.normalize('NFC');
  if (reconstructed === target) continue;

  const clusters = nfdClusters(target);
  if (clusters.length !== entry.breakdown.length) {
    manual.push({ id: entry.id, unicode: target, reconstructed, clusters: clusters.length, steps: entry.breakdown.length });
    continue;
  }

  entry.breakdown.forEach((step, i) => {
    const cluster = clusters[i];
    step.to = clusterToString(cluster);
    step.type = typeForCluster(cluster);
  });
  fixed++;
  console.log(`fixed: ${entry.id} -> ${target}`);
}

if (manual.length > 0) {
  console.log('\nManual review needed (cluster/step mismatch):');
  for (const m of manual) console.log(`  ${m.id}: unicode=${m.unicode} reconstructed=${m.reconstructed} clusters=${m.clusters} steps=${m.steps}`);
}

console.log(`\nFixed ${fixed} breakdown(s), removed ${duplicateVariantsRemoved} duplicate variant(s).`);

const write = process.argv.includes('--write');

if (!write) {
  console.log('\nDry run: pass --write to apply changes.');
  process.exit(manual.length > 0 ? 1 : 0);
}

// Preserve the file's existing wrapper exactly.
const wrapper = fs.readFileSync(lexiconPath, 'utf8');
const start = wrapper.indexOf('const LEXICON = [');
const end = wrapper.indexOf('\n];', start) + 3;
if (start === -1 || end === -1) throw new Error('Could not locate LEXICON array wrapper');

const json = JSON.stringify(LEXICON, null, 2);
const output = wrapper.slice(0, start) + 'const LEXICON = ' + json + wrapper.slice(end);

fs.writeFileSync(lexiconPath, output);
console.log(`Wrote ${lexiconPath}`);
