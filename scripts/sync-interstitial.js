/**
 * PuniCodex — Sync Interstitial Page
 *
 * Copies the canonical threat-interstitial page from
 * platform/public/interstitial.html to interstitial.html at the project root
 * so it is served at /interstitial.html in production. The Authenticity
 * extension (extension-v2) redirects blocked tabs to that URL by default.
 * The copy is idempotent: the destination is overwritten from the source.
 *
 * Run: node scripts/sync-interstitial.js
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'platform', 'public', 'interstitial.html');
const DESTINATION = path.join(ROOT, 'interstitial.html');

function syncInterstitial() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`✗ Interstitial source not found: ${SOURCE}`);
    process.exit(1);
  }

  const temporary = `${DESTINATION}.tmp.${process.pid}`;
  let lastError;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      fs.copyFileSync(SOURCE, temporary);
      fs.renameSync(temporary, DESTINATION);
      console.log(`✓ Interstitial synced to ${path.relative(ROOT, DESTINATION)}`);
      return;
    } catch (err) {
      lastError = err;
      if (!['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES'].includes(err.code)) throw err;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    }
  }
  try {
    fs.rmSync(temporary, { force: true });
  } catch {}
  throw lastError;
}

syncInterstitial();
