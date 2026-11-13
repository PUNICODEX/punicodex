#!/usr/bin/env node
/**
 * PuniCodex — AI art curation: record a verdict, evolve the library.
 *
 *   node scripts/curate-ai-art.js ai-art/zeus-v1.1.jpg keep
 *   node scripts/curate-ai-art.js ai-art/zeus-v1.2.jpg reject garbled-text
 *
 * keep   — marks the generation kept; bumps the deity's and tradition's wins.
 * reject — bumps losses and ATTACHES the named mutation operator to the
 *          deity's activeMutations, so the next compilePrompt() produces an
 *          evolved prompt. Repeated failures escalate: 3 losses with the
 *          same operator auto-mutates the promptVersion and rotates the
 *          operator.
 */
const fs = require('fs');
const path = require('path');
const { writeFileWithRetry } = require('./write-file-retry.js');

const ROOT = path.join(__dirname, '..');
const LIB_PATH = path.join(ROOT, 'data', 'ai-art', 'prompt-library.json');
const LOG_PATH = path.join(ROOT, 'data', 'ai-art', 'generation-log.jsonl');

const [file, verdict, reason] = process.argv.slice(2);
if (!file || !['keep', 'reject'].includes(verdict)) {
  console.error('usage: curate-ai-art.js <file> keep|reject [reason]');
  process.exit(1);
}
if (verdict === 'reject' && !reason) {
  console.error('a reject needs a reason (see mutationOperators in the library)');
  process.exit(1);
}

const lib = JSON.parse(fs.readFileSync(LIB_PATH, 'utf8'));
const base = path.basename(file);
let deity = base.split('-v')[0];
const spec0 = lib.deities[deity];
if (!spec0 && lib.families) {
  // Family-tagged files: <deity>-<family>-vN.M.jpg — strip the family tag.
  for (const fam of Object.keys(lib.families)) {
    if (deity.endsWith('-' + fam)) {
      deity = deity.slice(0, -(fam.length + 1));
      break;
    }
  }
}
const spec = lib.deities[deity];
if (!spec) {
  console.error(`unknown deity "${deity}"`);
  process.exit(1);
}

// Mark the generation-log entry — either a pending entry, or flip an
// already-recorded verdict (the human second pass promotes from review).
const lines = fs.readFileSync(LOG_PATH, 'utf8').trim().split('\n');
let entry = null;
for (let i = lines.length - 1; i >= 0 && !entry; i--) {
  const e = JSON.parse(lines[i]);
  if (!e.file || !e.file.endsWith(base)) continue;
  if (e.verdict === 'pending' || e.verdict !== verdict) {
    entry = e;
    lines[i] = JSON.stringify({ ...e, verdict, reason: reason || null });
  }
}
if (!entry) {
  console.error(`no generation-log entry for ${base}`);
  process.exit(1);
}
writeFileWithRetry(LOG_PATH, lines.join('\n') + '\n');

if (verdict === 'keep') {
  if (entry && entry.verdict === 'reject') {
    // Human second-pass promotion: correct the stats (the reject was wrong).
    spec.wins++;
    spec.losses = Math.max(0, spec.losses - 1);
    lib.traditions[spec.tradition].wins++;
    lib.traditions[spec.tradition].losses = Math.max(0, lib.traditions[spec.tradition].losses - 1);
  } else {
    spec.wins++;
    lib.traditions[spec.tradition].wins++;
  }
  // Move the file into the keepers folder from the inbox or review. Rejected
  // work stays in review for human second-pass curation; nothing is deleted.
  const inReview = path.join(ROOT, 'ai-art', 'review', path.basename(file));
  const inbox = path.join(ROOT, 'ai-art', path.basename(file));
  const keeperDest = path.join(ROOT, 'ai-art', 'keepers', path.basename(file));
  const source = fs.existsSync(inReview) ? inReview : inbox;
  if (fs.existsSync(source) && source !== keeperDest) {
    fs.mkdirSync(path.dirname(keeperDest), { recursive: true });
    fs.renameSync(source, keeperDest);
    console.log(`  ↑ promoted to ai-art/keepers/${path.basename(file)}`);
  }
} else {
  spec.losses++;
  lib.traditions[spec.tradition].losses++;
  // A human-curated rejection is already reliable evidence. Evolve before the
  // next paid attempt instead of waiting for repeated failures.
  spec.activeMutations = [...new Set([...(spec.activeMutations || []), reason])];
  spec.promptVersion++;
  spec.mutationHistory = [];
  console.log(`  ↻ "${reason}" — promptVersion → ${spec.promptVersion}`);
}

writeFileWithRetry(LIB_PATH, JSON.stringify(lib, null, 2) + '\n');
console.log(`${deity}: ${verdict}${reason ? ` (${reason})` : ''} — wins ${spec.wins} / losses ${spec.losses}, promptVersion ${spec.promptVersion}`);
