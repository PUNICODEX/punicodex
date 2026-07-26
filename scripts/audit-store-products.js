#!/usr/bin/env node
/**
 * Deep store audit:
 *  1. Every product carries mockupImage and the URL resolves (HTTP 200, image/*).
 *  2. Every product with variantPricing has prices >= flat price, whole-dollar,
 *     and every printfulVariants label is priced.
 *  3. Kind-level checks: canvas/print spreads exist (sizes price differently),
 *     tee labels carry a colour dimension after the fleet rollout.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CATALOG = require(path.join(ROOT, 'store', 'products.json'));

const CONCURRENCY = 12;
const TIMEOUT_MS = 12000;

let checked = 0;
let missingField = 0;
const notFound = [];
const badType = [];
const priceIssues = [];

async function head(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
    return { status: res.status, type: res.headers.get('content-type') || '' };
  } catch (err) {
    return { status: 0, type: '', error: err.message };
  } finally {
    clearTimeout(t);
  }
}

async function pool(items, worker) {
  let i = 0;
  const lanes = Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await worker(item);
    }
  });
  await Promise.all(lanes);
}

async function main() {
  const products = CATALOG.products;
  console.log(`Auditing ${products.length} products…`);

  // 1. mockupImage presence + resolution
  const withMockup = products.filter((p) => p.mockupImage);
  missingField = products.length - withMockup.length;
  await pool(withMockup, async (p) => {
    const r = await head(p.mockupImage);
    checked++;
    if (r.status !== 200) notFound.push({ id: p.id, status: r.status, url: p.mockupImage });
    else if (!r.type.startsWith('image/')) badType.push({ id: p.id, type: r.type });
    if (checked % 500 === 0) console.log(`  …${checked}/${withMockup.length}`);
  });

  // 2. variantPricing integrity
  for (const p of products) {
    if (!p.variantPricing) {
      priceIssues.push(`${p.id}: no variantPricing`);
      continue;
    }
    const labels = Object.keys(p.printfulVariants || {});
    for (const label of labels) {
      const cents = p.variantPricing[label];
      if (cents == null) priceIssues.push(`${p.id}: label "${label}" unpriced`);
      else if (!Number.isInteger(cents) || cents <= 0) priceIssues.push(`${p.id}: bad cents ${cents} for "${label}"`);
      else if (cents % 100 !== 0) priceIssues.push(`${p.id}: "${label}" not whole-dollar (${cents})`);
      else if (cents < Math.round(p.price * 100)) priceIssues.push(`${p.id}: "${label}" below flat price`);
    }
  }

  // 3. kind-level checks
  const kindSpread = {};
  for (const p of products) {
    const kind = p.id.split('-').pop();
    const prices = Object.values(p.variantPricing || {});
    if (!prices.length) continue;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    kindSpread[kind] = kindSpread[kind] || { min: Infinity, max: -Infinity, count: 0 };
    kindSpread[kind].min = Math.min(kindSpread[kind].min, min);
    kindSpread[kind].max = Math.max(kindSpread[kind].max, max);
    kindSpread[kind].count++;
  }
  const canvas = kindSpread.canvas;
  const teeLabels = Object.keys(
    (products.find((p) => p.id.endsWith('-tee')) || {}).printfulVariants || {}
  );
  const teeHasColour = teeLabels.some((l) => l.includes('/'));

  console.log('\n=== RESULTS ===');
  console.log(`products: ${products.length}`);
  console.log(`missing mockupImage field: ${missingField}`);
  console.log(`mockup URLs checked: ${checked}`);
  console.log(`  non-200: ${notFound.length}`);
  console.log(`  non-image content-type: ${badType.length}`);
  console.log(`price integrity issues: ${priceIssues.length}`);
  console.log(`canvas spread: $${canvas ? canvas.min / 100 : '?'} → $${canvas ? canvas.max / 100 : '?'}`);
  console.log(`tee colour dimension present: ${teeHasColour}`);
  if (notFound.length) console.log('non-200 sample:', notFound.slice(0, 10));
  if (priceIssues.length) console.log('price issues sample:', priceIssues.slice(0, 10));

  const failed = missingField > 0 || notFound.length > 0 || badType.length > 0 || priceIssues.length > 0 || !teeHasColour;
  console.log(failed ? '\nAUDIT FAILED' : '\nAUDIT PASSED');
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
