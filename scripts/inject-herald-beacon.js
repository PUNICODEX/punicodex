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
  /^extension/,
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

const INJECT = `${START}
<link rel="stylesheet" href="/css/herald-beacon.css?v=1">
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

const files = execSync('git ls-files "*.html"', { encoding: 'utf8', cwd: ROOT })
  .split('\n')
  .filter(Boolean)
  .filter((f) => !EXCLUDE.some((re) => re.test(f)));

let injected = 0;
for (const rel of files) {
  const file = path.join(ROOT, rel);
  let html;
  try {
    html = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
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
}
console.log(`Herald beacon: injected into ${injected} pages (${files.length} eligible).`);
