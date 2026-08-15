#!/usr/bin/env node
/**
 * Injects the cookie-consent assets (css link + deferred script) into every
 * public HTML page. Idempotent: strips any previous injection between the
 * markers, then re-injects. Follows the herald-beacon injector pattern.
 *
 * Skips admin/auth surfaces and the Herald page (it already pitches).
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const START = '<!-- PUNICODEX-COOKIE-CONSENT-START -->';
const END = '<!-- PUNICODEX-COOKIE-CONSENT-END -->';

const EXCLUDE = [
  /(^|\/)\.backup\//,
  /^docs\//,
  /^templates\//,
  /^platform\//,
  // The extension source tree is excluded, but extension/index.html is a
  // public teaser page and must carry consent like every other public page.
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
  /^sites\/(achilles|khaos|delphi|europa|pegasus|hercules|jason)\/index\.html$/, // redirect stubs
  /^interstitial\.html$/,
  /^type\/test\.html$/,
];

// The banner is JS-built and hidden until the deferred script mounts it, so
// the stylesheet is safe to load non-blocking (print-media swap + noscript
// fallback); a late banner simply slides in once both are ready.
const INJECT = `${START}
<link rel="stylesheet" href="/css/cookie-consent.css?v=1" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/css/cookie-consent.css?v=1"></noscript>
<script src="/js/cookie-consent.js?v=1" defer></script>
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
  console.error(`Failed to inject cookie consent into ${rel}`);
}
console.log(
  `Cookie consent: injected into ${injected} pages (${files.length} eligible, failed ${pending.length}).`
);
if (pending.length) process.exit(1);
