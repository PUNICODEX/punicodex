#!/usr/bin/env node
/**
 * Inject analytics (GA4), Google Search Console verification tags, and the
 * first-party site analytics beacon.
 *
 * Reads:
 *   GA_MEASUREMENT_ID   — e.g. G-XXXXXXXXXX
 *   GSC_VERIFICATION    — e.g. abcdefg123456
 *
 * The first-party beacon (<script src="/js/analytics-beacon.js?v=1" defer>) is
 * ALWAYS injected. GA4/GSC tags are only added when the env vars are set.
 * Injection is idempotent: the previously injected block (between the
 * PUNICODEX-ANALYTICS markers) is stripped before re-injecting.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GA_ID = process.env.GA_MEASUREMENT_ID;
const GSC = process.env.GSC_VERIFICATION;

const MARKER_START = '<!-- PUNICODEX-ANALYTICS-START -->';
const MARKER_END = '<!-- PUNICODEX-ANALYTICS-END -->';
// Versioned asset ref: /js is immutable-cached for a year, so this ?v= MUST
// bump whenever js/analytics-beacon.js changes, or clients keep the stale file.
const BEACON_TAG = '<script src="/js/analytics-beacon.js?v=1" defer></script>';

function buildSnippet() {
  const parts = [];
  if (GSC) {
    parts.push(`<meta name="google-site-verification" content="${GSC}">`);
  }
  if (GA_ID) {
    parts.push(
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>`,
      `<script>`,
      `  window.dataLayer = window.dataLayer || [];`,
      `  function gtag(){dataLayer.push(arguments);}`,
      `  gtag('js', new Date());`,
      `  gtag('config', '${GA_ID}', { send_page_view: true });`,
      `</script>`
    );
  }
  parts.push(BEACON_TAG);
  return `\n${MARKER_START}\n${parts.join('\n')}\n${MARKER_END}\n`;
}

function walk(dir, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    // Skip dot-directories (.backup, .git, …): stale snapshots must never be
    // injected (their old markers would earn a second beacon block).
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, callback);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      callback(fullPath);
    }
  }
}

const snippet = buildSnippet();

const targets = [];
walk(path.join(ROOT, 'sites'), (p) => targets.push(p));
walk(path.join(ROOT, 'platform', 'public'), (p) => targets.push(p));

const rootPages = [
  'index.html',
  'search.html',
  'oracle.html',
  path.join('about', 'index.html'),
  path.join('contact', 'index.html'),
  path.join('codex', 'index.html'),
  path.join('store', 'index.html'),
  path.join('pantheon', 'index.html'),
  path.join('lexicon', 'index.html'),
  path.join('lexicon', 'cognates.html'),
  path.join('realms', 'index.html'),
  path.join('tiers', 'index.html'),
  path.join('type', 'index.html'),
  path.join('type', 'test.html'),
  path.join('terms', 'index.html'),
  path.join('terms', 'advertising', 'index.html'),
  path.join('terms', 'store', 'index.html'),
  path.join('terms', 'creatives', 'index.html'),
  path.join('terms', 'ink', 'index.html'),
  path.join('terms', 'appraise', 'index.html'),
  path.join('terms', 'game', 'index.html'),
  path.join('terms', 'api', 'index.html'),
  path.join('terms', 'authenticity', 'index.html'),
  path.join('terms', 'oracle', 'index.html'),
  path.join('privacy', 'index.html'),
  path.join('blog', 'index.html'),
  path.join('texts', 'index.html'),
  path.join('texts', 'theogony', 'index.html'),
  path.join('university-sponsorship', 'index.html'),
  path.join('game', 'index.html'),
  path.join('art', 'index.html'),
  path.join('creatives', 'index.html'),
  path.join('appraise', 'index.html'),
  path.join('connections', 'index.html'),
  path.join('authenticity', 'index.html'),
  path.join('extension', 'index.html'),
  path.join('app', 'index.html'),
  path.join('trending', 'index.html'),
  path.join('patterns', 'index.html'),
  path.join('patterns', 'methodology', 'index.html'),
  path.join('careers', 'index.html'),
  path.join('about', 'founder', 'index.html'),
  path.join('arbitrage', 'index.html'),
  path.join('pronunciation', 'index.html'),
  path.join('everyday', 'index.html'),
  path.join('ink', 'index.html'),
  'search-v2.html',
];
for (const p of rootPages) {
  const full = path.join(ROOT, p);
  if (fs.existsSync(full)) targets.push(full);
}

function withRetry(fn, attempts = 5, delayMs = 100) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        // Busy-wait to avoid setTimeout in the synchronous path. Windows
        // file locks (AV/indexer) on freshly written files are transient.
        const start = Date.now();
        while (Date.now() - start < delayMs) {}
      }
    }
  }
  throw lastErr;
}

function busyWait(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {}
}

function injectIntoFile(filePath) {
  let html = withRetry(() => fs.readFileSync(filePath, 'utf8'));

  // Committed convention: temple pages (sites/) carry the university block
  // before analytics; every other page carries analytics right after <head>.
  const UC_END = '<!-- PUNICODEX-UNIVERSITY-COLLABORATORS-HEAD-END -->';
  const ucIdx = html.indexOf(UC_END);
  const inSites = path.relative(ROOT, filePath).startsWith(`sites${path.sep}`);

  // Remove any previously injected snippet, plus adjacent newlines so blank
  // lines do not accumulate across repeated runs.
  const startIdx = html.indexOf(MARKER_START);
  const endIdx = html.indexOf(MARKER_END);
  if (startIdx !== -1 && endIdx !== -1) {
    let removeStart = startIdx;
    while (removeStart > 0 && html[removeStart - 1] === '\n') removeStart--;
    let removeEnd = endIdx + MARKER_END.length;
    while (removeEnd < html.length && html[removeEnd] === '\n') removeEnd++;
    html = html.slice(0, removeStart) + '\n' + html.slice(removeEnd);
  }

  let snippetOut = snippet;
  if (inSites && ucIdx !== -1) {
    const ucIdx2 = html.indexOf(UC_END);
    let insertPos = ucIdx2 + UC_END.length;
    while (insertPos < html.length && html[insertPos] === '\n') insertPos++;
    // Committed layout: exactly one blank line on each side of the block.
    // slice ends at UC_END itself so the skipped newlines are not retained.
    snippetOut = `\n\n${snippet.replace(/^\n+|\n+$/g, '')}\n\n`;
    html = html.slice(0, ucIdx2 + UC_END.length) + snippetOut + html.slice(insertPos);
  } else {
    const headMatch = html.match(/<head[^>]*>/i);
    if (!headMatch) return false;
    const insertPos = headMatch.index + headMatch[0].length;
    html = html.slice(0, insertPos) + snippetOut + html.slice(insertPos);
  }

  withRetry(() => fs.writeFileSync(filePath, html, 'utf8'));
  return true;
}

let injected = 0;
let pending = [];
for (const filePath of targets) {
  try {
    if (injectIntoFile(filePath)) injected++;
  } catch {
    pending.push(filePath);
  }
}

// Files locked by the OS (AV/indexer) during the main pass usually free up
// by the time it finishes — sweep them in a few extra passes.
for (let pass = 0; pass < 3 && pending.length > 0; pass++) {
  busyWait(500);
  const retry = pending;
  pending = [];
  for (const filePath of retry) {
    try {
      if (injectIntoFile(filePath)) injected++;
    } catch {
      pending.push(filePath);
    }
  }
}

for (const filePath of pending) {
  console.error(`Failed to inject into ${filePath}`);
}

console.log(`Injected analytics snippet into ${injected} HTML files (failed ${pending.length}).`);
if (pending.length > 0) process.exit(1);
