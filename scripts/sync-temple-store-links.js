#!/usr/bin/env node
/**
 * PUNICODEX — Sync temple store links for the Phase B Reliquary restructure.
 *
 * The merch collections moved from /store/{id}/* to /store/merch/{id}/*.
 * Temple pages (sites/{id}/ and their tabs) carry an absolute Reliquary
 * collection link in their JSON-LD/footer baked at creation time — this
 * script rewrites those links in place. Idempotent: the pattern only
 * matches links WITHOUT the /merch/ segment, so a second run is a no-op.
 *
 * The site-root link https://punicodex.com/store/ (the entrance) is never
 * matched — the pattern requires an id segment.
 */

const fs = require('node:fs');
const path = require('node:path');
const { writeFileWithRetry } = require('./write-file-retry.js');

const ROOT = path.join(__dirname, '..');

// Absolute collection links only: https://punicodex.com/store/{id}/…
// Negative lookahead keeps an already-rewritten /store/merch/… link intact.
const LEGACY_LINK = /https:\/\/punicodex\.com\/store\/(?!merch\/)([a-z0-9-]+)\//g;

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.backup' || entry.name === 'assets') continue;
      yield* walk(full);
    } else if (entry.name.endsWith('.html')) {
      yield full;
    }
  }
}

function main() {
  const sitesDir = path.join(ROOT, 'sites');
  let updated = 0;
  let replacements = 0;
  for (const file of walk(sitesDir)) {
    const html = fs.readFileSync(file, 'utf8');
    if (!LEGACY_LINK.test(html)) continue;
    LEGACY_LINK.lastIndex = 0;
    const next = html.replace(LEGACY_LINK, 'https://punicodex.com/store/merch/$1/');
    replacements += (next.match(/https:\/\/punicodex\.com\/store\/merch\//g) || []).length;
    writeFileWithRetry(file, next, 'utf8');
    updated++;
  }
  console.log(`Temple store links: ${updated} files updated (${replacements} merch links).`);
}

main();
