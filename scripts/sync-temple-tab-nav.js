#!/usr/bin/env node
/**
 * Sync the canonical temple tab-nav (scripts/lib/temple-tab-nav.js) into
 * temple tab pages still carrying the legacy "Logo injected by JS" nav —
 * the injection no longer exists, so those pages render a blank where the
 * temple logolockup belongs.
 *
 * Targets sites/{id}/patterns/index.html and sites/{id}/patron/index.html
 * (the two tab families generated from stale templates). Idempotent: pages
 * whose nav already carries the inline logolockup (`nav-logo-img`) are
 * skipped.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { writeFileWithRetry } = require('./write-file-retry.js');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { templeTabNavHtml } = require('./lib/temple-tab-nav.js');

const entryById = new Map(LEXICON.map((e) => [e.id, e]));

const TAB_PAGES = [
  ['patterns/index.html', 'patterns'],
  ['patron/index.html', 'patron'],
];

// Walk <div> nesting from `start` (which points at `<div class="global-strip">`)
// and return the index just past the matching </div>.
function balancedDivEnd(html, start) {
  let depth = 0;
  let i = start;
  while (i < html.length) {
    const open = html.indexOf('<div', i);
    const close = html.indexOf('</div>', i);
    if (close === -1) return -1;
    if (open !== -1 && open < close) {
      depth++;
      i = open + 4;
    } else {
      depth--;
      i = close + 6;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function syncHtml(html, id, active) {
  if (html.includes('nav-logo-img') || !html.includes('Logo injected by JS')) {
    return html;
  }
  const entry = entryById.get(id);
  const name = entry ? entry.unicode : id;
  const start = html.indexOf('<div class="global-strip">');
  const menuOpen = html.indexOf('<div class="mobile-menu temple-mobile-menu"');
  if (start === -1 || menuOpen === -1) return html;
  const end = balancedDivEnd(html, menuOpen);
  if (end === -1) return html;
  const fresh = templeTabNavHtml(id, name, active);
  return html.slice(0, start) + fresh.trimEnd() + '\n' + html.slice(end);
}

function syncFile(filePath, id, active) {
  const html = fs.readFileSync(filePath, 'utf8');
  const next = syncHtml(html, id, active);
  if (next === html) return html.includes('nav-logo-img') ? 'already' : 'no-legacy-nav';
  writeFileWithRetry(filePath, next);
  return 'synced';
}

function main() {
  const sitesDir = path.join(ROOT, 'sites');
  const counts = {};
  for (const id of fs.readdirSync(sitesDir).sort()) {
    const dir = path.join(sitesDir, id);
    if (!fs.existsSync(path.join(dir, 'index.html'))) continue;
    for (const [rel, active] of TAB_PAGES) {
      const file = path.join(dir, rel);
      if (!fs.existsSync(file)) continue;
      try {
        const r = syncFile(file, id, active);
        counts[r] = (counts[r] || 0) + 1;
      } catch (err) {
        counts.error = (counts.error || 0) + 1;
        console.error(`  ERROR ${id}/${rel}: ${err.message}`);
      }
    }
  }
  console.log(`Temple tab-nav sync: ${JSON.stringify(counts)}`);
  if (counts.error) process.exit(1);
}

if (require.main === module) main();
module.exports = { syncFile, syncHtml };
