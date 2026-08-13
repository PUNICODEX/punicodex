#!/usr/bin/env node
/**
 * PuniCodex — asset version stamping (cache-busting).
 *
 * The CDN serves /css, /js and /assets as immutable for a year, so any
 * content change to those files MUST change their URL. The `?v=` pins on
 * data-driven scripts (archetypes, lookups, owned entries) were manual
 * integers and were forgotten on content waves — stale pins shipped stale
 * data (e.g. /pantheon showing 271 of 282 archetypes on repeat visits).
 *
 * This script rewrites the `?v=` query of the listed assets in every
 * tracked HTML file to the first 10 hex chars of the file's sha256.
 * Content-addressed pins are self-busting: unchanged content keeps its pin
 * (cache stays warm), changed content gets a new URL (stale copies die).
 * Idempotent — a second run writes zero files.
 *
 * Usage: node scripts/stamp-asset-versions.js
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

// Content-addressed assets. Only files whose content changes through the
// flywheel or canonical edits belong here; hand-tuned perf pins (main.css
// etc.) stay manual.
const ASSETS = [
  '/js/archetypes-v2.js',
  '/js/original-script-lookup.js',
  '/js/owned-entries.js',
];

// Historical reports are snapshots, not pages — never rewrite them.
const SKIP = /^(docs\/lighthouse\/|Marketing\/|New material)/;

function assetHash(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex').slice(0, 10);
}

function main() {
  const pins = new Map();
  for (const asset of ASSETS) {
    const hash = assetHash(asset);
    if (hash) pins.set(asset, hash);
  }

  const files = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter((f) => !SKIP.test(f));

  let written = 0;
  for (const file of files) {
    const abs = path.join(ROOT, file);
    let text;
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    let out = text;
    for (const [asset, hash] of pins) {
      // Match the asset reference with an existing ?v= pin, or none at all.
      const withPin = new RegExp(
        `${asset.replace(/[./]/g, '\\$&')}\\?v=[A-Za-z0-9_-]+`,
        'g'
      );
      out = out.replace(withPin, `${asset}?v=${hash}`);
      const bare = new RegExp(`${asset.replace(/[./]/g, '\\$&')}(?!\\?v=)`, 'g');
      out = out.replace(bare, `${asset}?v=${hash}`);
    }
    if (out !== text) {
      fs.writeFileSync(abs, out);
      written++;
    }
  }
  console.log(`Asset versions: ${written} file(s) stamped (${pins.size} content-addressed assets).`);
}

main();
