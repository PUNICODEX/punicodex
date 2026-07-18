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

  fs.copyFileSync(SOURCE, DESTINATION);
  console.log(`✓ Interstitial synced to ${path.relative(ROOT, DESTINATION)}`);
}

syncInterstitial();
