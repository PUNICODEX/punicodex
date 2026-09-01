#!/usr/bin/env node
/**
 * PuniCodex — Store mockup consistency validator.
 *
 * Performs local consistency checks between store/products.json and
 * .masters/mockups/*.jpg. With --remote, HEAD-checks every mockupImage URL on
 * the masters origin (no API key required).
 *
 * Usage:
 *   node scripts/validate-store-mockups.js [--remote]
 * Exit code: 0 if clean, 1 on any mismatch.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CATALOG_FILE = path.join(ROOT, 'store', 'products.json');
const MOCKUPS_DIR = path.join(ROOT, '.masters', 'mockups');
const MASTERS_BASE = 'https://punycodex-masters.vercel.app';
const REMOTE = process.argv.slice(2).includes('--remote');

function loadCatalog() {
  return JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
}

function listLocalMockups() {
  if (!fs.existsSync(MOCKUPS_DIR)) return [];
  return fs
    .readdirSync(MOCKUPS_DIR)
    .filter((f) => f.endsWith('.jpg'))
    .map((f) => f.replace(/\.jpg$/, ''));
}

function localChecks(products) {
  const errors = [];
  const productIds = new Set(products.map((p) => p.id));
  const byId = new Map(products.map((p) => [p.id, p]));
  const localIds = new Set(listLocalMockups());
  const withMockup = products.filter((p) => p.mockupImage);

  for (const p of withMockup) {
    if (!p.mockupImage.startsWith(`${MASTERS_BASE}/mockups/`)) {
      errors.push(`${p.id}: mockupImage not on masters mockups host: ${p.mockupImage}`);
    }
    const basename = path.basename(p.mockupImage, '.jpg');
    if (basename !== p.id) {
      errors.push(`${p.id}: mockupImage basename "${basename}" does not match product id "${p.id}"`);
    }
    if (!localIds.has(p.id)) {
      errors.push(`${p.id}: mockupImage in catalog but .masters/mockups/${p.id}.jpg is missing`);
    }
  }

  for (const id of localIds) {
    if (!productIds.has(id)) {
      errors.push(`${id}.jpg: orphan mockup file (no matching product id)`);
      continue;
    }
    const p = byId.get(id);
    if (!p || !p.mockupImage) {
      errors.push(`${id}.jpg: mockup file exists but product has no mockupImage`);
    }
  }

  return errors;
}

async function checkOneRemote(p, attempt = 1) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let res = await fetch(p.mockupImage, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
    if (res.status === 405) {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 15000);
      res = await fetch(p.mockupImage, { method: 'GET', signal: controller2.signal() });
      clearTimeout(timeout2);
    }
    if (!res.ok) {
      return `${p.id}: ${p.mockupImage} → HTTP ${res.status}`;
    }
    return null;
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      return checkOneRemote(p, attempt + 1);
    }
    return `${p.id}: ${p.mockupImage} → ${err.message}`;
  }
}

async function remoteChecks(products) {
  const errors = [];
  const withMockup = products.filter((p) => p.mockupImage);
  const batchSize = 50;
  let checked = 0;

  for (let i = 0; i < withMockup.length; i += batchSize) {
    const batch = withMockup.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((p) => checkOneRemote(p)));
    for (const err of results) {
      if (err) errors.push(err);
    }
    checked += batch.length;
    process.stdout.write(`\r  checked ${checked}/${withMockup.length} mockups (${errors.length} issues)`);
  }
  if (withMockup.length > 0) process.stdout.write('\r');
  return errors;
}

async function main() {
  const catalog = loadCatalog();
  const products = catalog.products || [];
  const errors = [];

  console.log(`Validating ${products.length} products...`);

  errors.push(...localChecks(products));
  console.log(`Local checks: ${errors.length === 0 ? 'clean' : `${errors.length} issue(s)`}`);

  if (REMOTE) {
    const remoteErrors = await remoteChecks(products);
    errors.push(...remoteErrors);
    console.log(`Remote checks: ${remoteErrors.length === 0 ? 'clean' : `${remoteErrors.length} issue(s)`}`);
  }

  if (errors.length > 0) {
    console.error('\nFailures:');
    for (const err of errors.slice(0, 50)) {
      console.error(`  ✗ ${err}`);
    }
    if (errors.length > 50) {
      console.error(`  ... and ${errors.length - 50} more`);
    }
    process.exit(1);
  }

  console.log('All store mockup checks passed.');
}

main().catch((err) => {
  console.error(`Validation failed: ${err.message}`);
  process.exit(1);
});
