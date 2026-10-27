#!/usr/bin/env node
/**
 * PuniCodex — mockup fleet LIVE audit.
 *
 * The local coverage guard (store-ops-contract) protects the disk copy;
 * this suite protects the HOST: punycodex-masters.vercel.app must serve a
 * photorealistic mockup for (essentially) every product. The 2026-10-27
 * wipe went undetected for hours because nothing checked the host against
 * the catalog — a sample of HEAD requests would have caught it on day one.
 *
 * Deterministic sample (seeded), network-tolerant: a handful of misses is
 * a warning threshold breach only when coverage drops well below the fleet.
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const https = require('node:https');

const ROOT = path.join(__dirname, '..');
const HOST = 'https://punycodex-masters.vercel.app';
const SAMPLE = 200;
const MIN_COVERAGE = 0.9; // ≥90% of the sampled mockups must be live

function head(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 12000 }, (res) => {
      res.resume();
      resolve(res.statusCode || 0);
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(0);
    });
    req.on('error', () => resolve(0));
    req.end();
  });
}

// Deterministic PRNG so every run samples the same products (mulberry32).
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test(`the masters host serves ≥${MIN_COVERAGE * 100}% of a ${SAMPLE}-product mockup sample`, async () => {
  const products = require(path.join(ROOT, 'store', 'products.json'));
  const list = Array.isArray(products.products)
    ? products.products
    : Object.values(products.products || {});
  assert.ok(list.length > 0, 'products catalog must not be empty');

  const rand = rng(20261027);
  const picked = [...list]
    .map((p) => ({ p, r: rand() }))
    .sort((a, b) => a.r - b.r)
    .slice(0, SAMPLE);

  let live = 0;
  const dead = [];
  const CONCURRENCY = 10;
  for (let i = 0; i < picked.length; i += CONCURRENCY) {
    const batch = picked.slice(i, i + CONCURRENCY);
    const codes = await Promise.all(batch.map(({ p }) => head(`${HOST}/mockups/${p.id}.jpg`)));
    codes.forEach((code, j) => {
      if (code === 200) live++;
      else dead.push(`${picked[i + j].p.id}=${code}`);
    });
  }

  const coverage = live / picked.length;
  assert.ok(
    coverage >= MIN_COVERAGE,
    `mockup fleet coverage on ${HOST} is ${(coverage * 100).toFixed(1)}% ` +
      `(${live}/${picked.length}) — expected ≥${MIN_COVERAGE * 100}%. ` +
      `First failures: ${dead.slice(0, 8).join(', ')}. ` +
      `The live fleet may have been wiped — run scripts/audit-mockup-fleet.js and redeploy via scripts/deploy-masters.sh.`
  );
});
