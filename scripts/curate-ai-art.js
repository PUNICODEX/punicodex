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
const deity = base.split('-v')[0];
const spec = lib.deities[deity];
if (!spec) {
  console.error(`unknown deity "${deity}"`);
  process.exit(1);
}

// Mark the generation-log entry.
const lines = fs.readFileSync(LOG_PATH, 'utf8').trim().split('\n');
let hit = false;
const out = lines.map((l) => {
  const e = JSON.parse(l);
  if (!hit && e.file && e.file.endsWith(base) && e.verdict === 'pending') {
    hit = true;
    return JSON.stringify({ ...e, verdict, reason: reason || null });
  }
  return l;
});
fs.writeFileSync(LOG_PATH, out.join('\n') + '\n');

if (verdict === 'keep') {
  spec.wins++;
  lib.traditions[spec.tradition].wins++;
} else {
  spec.losses++;
  lib.traditions[spec.tradition].losses++;
  spec.activeMutations = [...new Set([...(spec.activeMutations || []), reason])];
  const same = (spec.mutationHistory || []).filter((r) => r === reason).length;
  spec.mutationHistory = [...(spec.mutationHistory || []), reason];
  if (same >= 2) {
    // Escalation: this operator failed repeatedly — rotate it out, bump version.
    spec.activeMutations = spec.activeMutations.filter((m) => m !== reason);
    spec.promptVersion++;
    spec.mutationHistory = [];
    console.log(`  ↻ "${reason}" failed 3x — promptVersion → ${spec.promptVersion}, operator rotated out`);
  }
}

fs.writeFileSync(LIB_PATH, JSON.stringify(lib, null, 2) + '\n');
console.log(`${deity}: ${verdict}${reason ? ` (${reason})` : ''} — wins ${spec.wins} / losses ${spec.losses}, promptVersion ${spec.promptVersion}`);
