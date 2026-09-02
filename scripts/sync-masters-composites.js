#!/usr/bin/env node
/**
 * PuniCodex — Sync merch composites + logolockups to .masters/
 *
 * The Printful mockup pipeline and store pages fetch print designs from
 * https://punycodex-masters.vercel.app/{id}_comp-{kind}.png. This script copies
 * those PNGs from sites/{id}/assets/ (where generate-merch-composites.js writes
 * them) into the .masters/ root so they are deployed alongside mascots/logomarks.
 *
 * Progress is logged every 50 files so CI logs never look frozen. Compression
 * runs with a bounded worker pool; PUNICODEX_SYNC_MASTERS_CONCURRENCY overrides
 * the default. PUNICODEX_SYNC_MASTERS_COMPRESSION_LEVEL tunes PNG compression
 * (default 6; 9 is slower but slightly smaller).
 *
 * Usage: node scripts/sync-masters-composites.js
 */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SITES_ROOT = path.join(ROOT, 'sites');
const MASTERS_ROOT = path.join(ROOT, '.masters');
const PATTERN = /_(comp-(canvas|mug|tote|sticker|notebook)|logolockup)\.png$/;
const CONCURRENCY = Math.max(1, Number(process.env.PUNICODEX_SYNC_MASTERS_CONCURRENCY) || 8);
const COMPRESSION_LEVEL = Math.max(0, Math.min(9, Number(process.env.PUNICODEX_SYNC_MASTERS_COMPRESSION_LEVEL) || 6));
const PROGRESS_EVERY = 50;
const FILE_TIMEOUT_MS = Math.max(1000, Number(process.env.PUNICODEX_SYNC_MASTERS_FILE_TIMEOUT_MS) || 60000);

function shouldCopy(name) {
  return PATTERN.test(name);
}

function colorsFor(name) {
  return name.includes('_comp-') ? 128 : 256;
}

async function compressPng(file) {
  const tmp = `${file}.compressed`;
  await sharp(file)
    .png({
      compressionLevel: COMPRESSION_LEVEL,
      adaptiveFiltering: true,
      palette: true,
      colors: colorsFor(path.basename(file)),
    })
    .toFile(tmp);
  fs.renameSync(tmp, file);
}

function collectJobs() {
  const jobs = [];
  if (!fs.existsSync(SITES_ROOT)) return jobs;

  for (const id of fs.readdirSync(SITES_ROOT)) {
    const assetsDir = path.join(SITES_ROOT, id, 'assets');
    if (!fs.existsSync(assetsDir)) continue;

    for (const name of fs.readdirSync(assetsDir)) {
      if (!shouldCopy(name)) continue;
      const src = path.join(assetsDir, name);
      const dst = path.join(MASTERS_ROOT, name);

      if (!fs.existsSync(src)) {
        jobs.push({ src, dst, missing: true });
        continue;
      }

      let needsCopy = false;
      if (!fs.existsSync(dst)) {
        needsCopy = true;
      } else {
        const srcStat = fs.statSync(src);
        const dstStat = fs.statSync(dst);
        if (srcStat.mtime > dstStat.mtime) {
          needsCopy = true;
        }
      }

      jobs.push({ src, dst, needsCopy });
    }
  }
  return jobs;
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms: ${label}`)), ms)),
  ]);
}

async function processJob(job) {
  if (job.missing) {
    return { type: 'missing', src: job.src };
  }
  if (!job.needsCopy) {
    return { type: 'skipped' };
  }

  try {
    fs.copyFileSync(job.src, job.dst);
    await withTimeout(compressPng(job.dst), FILE_TIMEOUT_MS, job.dst);
    const srcStat = fs.statSync(job.src);
    const dstStat = fs.statSync(job.dst);
    return {
      type: dstStat.mtime >= srcStat.mtime ? 'updated' : 'copied',
    };
  } catch (err) {
    return { type: 'error', src: job.src, err };
  }
}

async function runWithConcurrency(jobs, concurrency, onProgress) {
  const results = [];
  let index = 0;
  let completed = 0;

  async function worker() {
    while (index < jobs.length) {
      const job = jobs[index++];
      const result = await processJob(job);
      results.push(result);
      completed++;
      if (completed % PROGRESS_EVERY === 0 || completed === jobs.length) {
        onProgress(completed, jobs.length);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, jobs.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  if (!fs.existsSync(MASTERS_ROOT)) {
    fs.mkdirSync(MASTERS_ROOT, { recursive: true });
  }

  const jobs = collectJobs();
  console.log(`sync-masters-composites: ${jobs.length} candidate file(s), concurrency ${CONCURRENCY}, compression level ${COMPRESSION_LEVEL}`);

  let copied = 0;
  let updated = 0;
  let skipped = 0;
  let compressed = 0;
  let missing = 0;
  const errors = [];

  const results = await runWithConcurrency(jobs, CONCURRENCY, (done, total) => {
    console.log(`  progress: ${done}/${total} files processed`);
  });

  for (const result of results) {
    switch (result.type) {
      case 'copied':
        copied++;
        compressed++;
        break;
      case 'updated':
        updated++;
        compressed++;
        break;
      case 'skipped':
        skipped++;
        break;
      case 'missing':
        missing++;
        console.warn(`  ! missing source composite, skipping: ${result.src}`);
        break;
      case 'error':
        errors.push(result);
        console.error(`  ✗ failed to sync ${result.src}: ${result.err && result.err.message}`);
        break;
      default:
        break;
    }
  }

  console.log(`sync-masters-composites complete:`);
  console.log(`  copied:     ${copied}`);
  console.log(`  updated:    ${updated}`);
  console.log(`  compressed: ${compressed}`);
  console.log(`  skipped:    ${skipped}`);
  console.log(`  missing:    ${missing}`);
  console.log(`  errors:     ${errors.length}`);

  if (errors.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
