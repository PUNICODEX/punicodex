#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  hasHardQualityFlags,
  inspectArtifacts,
  scanArtwork,
  writeContactSheet,
} = require('./lib/ai-art-qc.js');
const { costPerImage, produced } = require('./generate-ai-art.js');
const { writeFileWithRetry } = require('./write-file-retry.js');

const ROOT = path.join(__dirname, '..');
const LIB_PATH = path.join(ROOT, 'data', 'ai-art', 'prompt-library.json');
const LOG_PATH = path.join(ROOT, 'data', 'ai-art', 'generation-log.jsonl');
const PLAN_PATH = path.join(ROOT, 'data', 'ai-art', 'pipeline-plan.json');
const REPORT_PATH = path.join(ROOT, 'data', 'ai-art', 'qc-report.json');
const STATE_PATH = path.join(ROOT, 'data', 'ai-art', 'pipeline-state.json');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function familyTag(family) {
  return family === 'classic-gold' ? '' : `${family}-`;
}

function artifactProduced(root, family, name, library) {
  const promptVersion = library.deities[name]?.promptVersion;
  if (!promptVersion) return false;
  return produced(name, family, path.join(root, 'ai-art'), promptVersion);
}

function loadDemand(root) {
  return readJson(path.join(root, 'data', 'ai-art', 'temple-demand.json'), {});
}

function demandSort(demand, library) {
  return (a, b) => {
    const da = demand[a]?.tier || 99;
    const db = demand[b]?.tier || 99;
    if (da !== db) return da - db;
    const sa = (library.deities[a]?.wins || 0) - (library.deities[a]?.losses || 0);
    const sb = (library.deities[b]?.wins || 0) - (library.deities[b]?.losses || 0);
    return sa - sb;
  };
}

function createPlan({ root = ROOT, family = 'tattoo', batch = 597, variants = 1, maxSpend = Infinity, model = process.env.FAL_MODEL || 'fal-ai/flux/schnell' } = {}) {
  const library = JSON.parse(fs.readFileSync(path.join(root, 'data', 'ai-art', 'prompt-library.json'), 'utf8'));
  if (!library.families[family]) throw new Error(`unknown art family "${family}"`);
  const demand = loadDemand(root);
  const all = Object.keys(library.deities).sort(demandSort(demand, library));
  const unproduced = all.filter((name) => !artifactProduced(root, family, name, library));
  const unitCost = costPerImage(model);
  const maxImages = Number.isFinite(maxSpend) ? Math.floor(maxSpend / unitCost) : Infinity;
  const plannedNames = unproduced.slice(0, Math.min(batch, maxImages));
  const plan = {
    version: 1,
    generatedAt: new Date().toISOString(),
    family,
    model,
    variants,
    maxSpend,
    unitCost,
    totalDeities: all.length,
    producedCount: all.length - unproduced.length,
    unproducedCount: unproduced.length,
    plannedCount: plannedNames.length,
    estimatedCost: Number((plannedNames.length * variants * unitCost).toFixed(4)),
    plannedNames,
    remainingNames: unproduced.slice(plannedNames.length),
  };
  writeFileWithRetry(path.join(root, 'data', 'ai-art', 'pipeline-plan.json'), `${JSON.stringify(plan, null, 2)}\n`);
  return plan;
}

function autoRejectArtifacts({ root, family, artifacts }) {
  const libraryPath = path.join(root, 'data', 'ai-art', 'prompt-library.json');
  const logPath = path.join(root, 'data', 'ai-art', 'generation-log.jsonl');
  const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
  const rejected = [];
  let libraryChanged = false;
  for (const artifact of artifacts) {
    if (artifact.state !== 'pending' || !hasHardQualityFlags(artifact.qualityFlags || [])) continue;
    const source = path.join(root, artifact.file);
    const base = path.basename(artifact.file);
    const destination = path.join(root, 'ai-art', 'review', base);
    fs.renameSync(source, destination);
    const spec = library.deities[artifact.deity];
    if (spec) {
      spec.losses = (spec.losses || 0) + 1;
      spec.activeMutations = [...new Set([...(spec.activeMutations || []), 'quality-gate'])];
      spec.promptVersion = (spec.promptVersion || 1) + 1;
      spec.mutationHistory = [];
      if (library.traditions[spec.tradition]) {
        library.traditions[spec.tradition].losses = (library.traditions[spec.tradition].losses || 0) + 1;
      }
      libraryChanged = true;
    }
    const reviewedFile = path.relative(root, destination).split(path.sep).join('/');
    fs.appendFileSync(
      logPath,
      `${JSON.stringify({
        ts: new Date().toISOString(),
        deity: artifact.deity,
        family,
        model: 'quality-gate',
        imageSize: null,
        prompt: '',
        file: reviewedFile,
        autoFlags: artifact.qualityFlags,
        verdict: 'auto-reject',
        reason: 'quality-gate',
      })}\n`
    );
    rejected.push({ ...artifact, file: reviewedFile, state: 'review', verdict: 'auto-reject', reason: 'quality-gate' });
  }
  if (libraryChanged) {
    writeFileWithRetry(libraryPath, `${JSON.stringify(library, null, 2)}\n`);
  }
  return rejected;
}

async function runQc({ root = ROOT, family = null } = {}) {
  const library = JSON.parse(fs.readFileSync(path.join(root, 'data', 'ai-art', 'prompt-library.json'), 'utf8'));
  const families = family ? [family] : Object.keys(library.families || {});
  const report = {
    generatedAt: new Date().toISOString(),
    families: {},
  };
  for (const currentFamily of families) {
    const artifacts = scanArtwork({
      root,
      family: currentFamily,
      libraryPath: path.join(root, 'data', 'ai-art', 'prompt-library.json'),
      logPath: path.join(root, 'data', 'ai-art', 'generation-log.jsonl'),
    });
    const initialInspection = await inspectArtifacts(root, currentFamily, artifacts);
    const autoRejected = autoRejectArtifacts({ root, family: currentFamily, artifacts: initialInspection });
    const inspected = autoRejected.length
      ? await inspectArtifacts(
          root,
          currentFamily,
          scanArtwork({
            root,
            family: currentFamily,
            libraryPath: path.join(root, 'data', 'ai-art', 'prompt-library.json'),
            logPath: path.join(root, 'data', 'ai-art', 'generation-log.jsonl'),
          })
        )
      : initialInspection;
    const pending = inspected.filter((item) => item.state === 'pending');
    const review = inspected.filter((item) => item.state === 'review');
    const keeper = inspected.filter((item) => item.state === 'keeper');
    const pages = [];
    if (pending.length) {
      pages.push(...(await writeContactSheet({ items: pending, output: path.join(root, 'ai-art', 'index.html'), title: `AI ART REVIEW · ${currentFamily} · PENDING`, root })));
    }
    if (review.length) {
      pages.push(...(await writeContactSheet({ items: review, output: path.join(root, 'ai-art', 'review', 'index.html'), title: `AI ART REVIEW · ${currentFamily} · REJECTED`, root })));
    }
    report.families[currentFamily] = {
      total: inspected.length,
      pending: pending.length,
      review: review.length,
      keeper: keeper.length,
      autoRejected: autoRejected.length,
      flagged: inspected.filter((item) => item.qualityFlags.length).length,
      pages,
      topPriority: inspected.slice(0, 25).map(({ file, state, verdict, qualityFlags, priority }) => ({ file, state, verdict, qualityFlags, priority })),
    };
  }
  writeFileWithRetry(path.join(root, 'data', 'ai-art', 'qc-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function promoteKeepers({ root = ROOT, family = 'tattoo' } = {}) {
  if (family !== 'tattoo') throw new Error('automated Commons promotion currently supports the tattoo family');
  const { promote } = require('./promote-ai-art-commons.js');
  const artifacts = scanArtwork({
    root,
    family,
    libraryPath: path.join(root, 'data', 'ai-art', 'prompt-library.json'),
    logPath: path.join(root, 'data', 'ai-art', 'generation-log.jsonl'),
  });
  const keepers = artifacts.filter((artifact) => artifact.state === 'keeper' && artifact.verdict === 'keep');
  const promoted = [];
  const failed = [];
  for (const artifact of keepers) {
    try {
      await promote(artifact.file);
      promoted.push(artifact.file);
    } catch (error) {
      failed.push({ file: artifact.file, error: error.message });
    }
  }
  const result = { family, promoted, failed, promotedCount: promoted.length, failedCount: failed.length };
  writeFileWithRetry(path.join(root, 'data', 'ai-art', 'promotion-report.json'), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

function runPlan({ root = ROOT } = {}) {
  const plan = readJson(path.join(root, 'data', 'ai-art', 'pipeline-plan.json'), null);
  if (!plan) throw new Error('pipeline plan missing — run `node scripts/ai-art-pipeline.js plan` first');
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, 'scripts', 'generate-ai-art.js'),
      '--family', plan.family,
      '--batch', String(plan.plannedCount),
      '--variants', String(plan.variants),
      '--max-spend', String(plan.maxSpend),
    ],
    { env: process.env, stdio: 'inherit' }
  );
  const state = {
    generatedAt: new Date().toISOString(),
    stage: 'generate',
    ok: result.status === 0,
    status: result.status,
    plan: {
      family: plan.family,
      plannedCount: plan.plannedCount,
      estimatedCost: plan.estimatedCost,
    },
  };
  writeFileWithRetry(path.join(root, 'data', 'ai-art', 'pipeline-state.json'), `${JSON.stringify(state, null, 2)}\n`);
  if (result.status !== 0) return state;
  return { ...state, qc: runQc({ root, family: plan.family }) };
}

function summarize({ root = ROOT } = {}) {
  const plan = readJson(path.join(root, 'data', 'ai-art', 'pipeline-plan.json'), null);
  const qc = readJson(path.join(root, 'data', 'ai-art', 'qc-report.json'), null);
  const promotion = readJson(path.join(root, 'data', 'ai-art', 'promotion-report.json'), null);
  const summary = { generatedAt: new Date().toISOString(), plan, qc, promotion };
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'report';
  const family = option(args, '--family', 'tattoo');
  if (command === 'plan') {
    const plan = createPlan({
      family,
      batch: Number(option(args, '--batch', 597)),
      variants: Number(option(args, '--variants', 1)),
      maxSpend: Number(option(args, '--max-spend', Infinity)),
      model: option(args, '--model', process.env.FAL_MODEL || 'fal-ai/flux/schnell'),
    });
    console.log(`planned ${plan.plannedCount} ${family} generations (~$${plan.estimatedCost.toFixed(3)}) from ${plan.unproducedCount} unproduced deities`);
    return;
  }
  if (command === 'run') return runPlan();
  if (command === 'qc' || command === 'review') {
    const report = await runQc({ family: args.includes('--family') ? family : null });
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (command === 'promote') {
    const result = await promoteKeepers({ family });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === 'report') return summarize();
  throw new Error(`unknown pipeline command "${command}" — use plan|run|qc|promote|report`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { autoRejectArtifacts, createPlan, promoteKeepers, runPlan, runQc, summarize };
