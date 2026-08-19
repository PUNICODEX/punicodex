#!/usr/bin/env node
/**
 * Injects the Herald Beacon assets (css link + deferred script) into every
 * public HTML page. Idempotent: strips any previous injection between the
 * markers, then re-injects. Follows the analytics-beacon pattern.
 *
 * Skips admin/auth surfaces (where a capture widget has no business) and the
 * Herald page itself (it already pitches the subscription).
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const START = '<!-- PUNICODEX-HERALD-BEACON-START -->';
const END = '<!-- PUNICODEX-HERALD-BEACON-END -->';

const EXCLUDE = [
  /(^|\/)\.backup\//,
  /^docs\//,
  /^templates\//,
  /^platform\//,
  // The extension source tree is excluded, but extension/index.html is a
  // public teaser page and carries the beacon like every other public page.
  /^extension\/(?!index\.html$)/,
  /^extension-v2\//,
  /^mobile\//,
  /^android\//,
  /^tools\//,
  /^website\//,
  /^admin/,
  /^account\//,
  /^herald\//,
  /dashboard/,
  /404\.html$/,
  /^sites\/[^/]+\/assets\//,
  /^sites\/(achilles|khaos|delphi|europa|pegasus|hercules)\/index\.html$/, // redirect stubs
  /^interstitial\.html$/,
  /^type\/test\.html$/,
];

// The seal/card are JS-built on DOMContentLoaded, so the stylesheet is safe
// to load non-blocking (print-media swap + noscript fallback).
const INJECT = `${START}
<link rel="stylesheet" href="/css/herald-beacon.css?v=1" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/css/herald-beacon.css?v=1"></noscript>
<script src="/js/herald-beacon.js?v=1" defer></script>
${END}`;

function stripExisting(html) {
  const re = new RegExp(
    `${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    )}\\n?`,
    'g'
  );
  return html.replace(re, '');
}

function withRetry(fn, attempts = 5, delayMs = 100) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        // Windows file locks (AV/indexer) on freshly written files are transient.
        const start = Date.now();
        while (Date.now() - start < delayMs) {}
      }
    }
  }
  throw lastErr;
}

// --others --exclude-standard: newly generated pages (e.g. fresh flagship
// temples) are untracked until the post-generate commit, and they must still
// receive the block in the same run. Gitignored junk stays excluded.
const files = execSync('git ls-files --cached --others --exclude-standard "*.html"', {
  encoding: 'utf8',
  cwd: ROOT,
})
  .split('\n')
  .filter(Boolean)
  .filter((f) => !EXCLUDE.some((re) => re.test(f)));

let injected = 0;
let pending = [];

const processFile = (file) => {
  const html = withRetry(() => fs.readFileSync(file, 'utf8'));
  const stripped = stripExisting(html);
  let out;
  if (stripped.includes('</head>')) {
    out = stripped.replace('</head>', `${INJECT}\n</head>`);
  } else {
    out = `${INJECT}\n${stripped}`;
  }
  if (out !== html) {
    withRetry(() => fs.writeFileSync(file, out, 'utf8'));
    injected++;
  }
};

for (const rel of files) {
  try {
    processFile(path.join(ROOT, rel));
  } catch {
    pending.push(rel);
  }
}

// Files locked by the OS (AV/indexer) during the main pass usually free up
// by the time it finishes — sweep them in a few extra passes.
for (let pass = 0; pass < 3 && pending.length > 0; pass++) {
  const start = Date.now();
  while (Date.now() - start < 500) {}
  const retry = pending;
  pending = [];
  for (const rel of retry) {
    try {
      processFile(path.join(ROOT, rel));
    } catch {
      pending.push(rel);
    }
  }
}

for (const rel of pending) {
  console.error(`Failed to inject herald beacon into ${rel}`);
}
console.log(
  `Herald beacon: injected into ${injected} pages (${files.length} eligible, failed ${pending.length}).`
);
if (pending.length) process.exit(1);
