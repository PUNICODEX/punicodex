#!/usr/bin/env node
/**
 * Inject the Academic Collaborators strip into every public HTML page.
 *
 * The strip is inserted immediately before the first <footer> tag. If no
 * <footer> exists, it falls back to insertion before </body>.
 *
 * Runs idempotently via marker comments.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const HEAD_MARKER_START = '<!-- PUNICODEX-UNIVERSITY-COLLABORATORS-HEAD-START -->';
const HEAD_MARKER_END = '<!-- PUNICODEX-UNIVERSITY-COLLABORATORS-HEAD-END -->';
const BODY_MARKER_START = '<!-- PUNICODEX-UNIVERSITY-COLLABORATORS-BODY-START -->';
const BODY_MARKER_END = '<!-- PUNICODEX-UNIVERSITY-COLLABORATORS-BODY-END -->';

const CSS_PATH = '/css/university-collaborators.css?v=3';
const JS_PATH = '/js/university-collaborators.js?v=3';

function buildHeadSnippet() {
  return `\n${HEAD_MARKER_START}\n<link rel="stylesheet" href="${CSS_PATH}">\n<script src="${JS_PATH}" defer></script>\n${HEAD_MARKER_END}\n`;
}

function buildBodySnippet() {
  return `\n${BODY_MARKER_START}\n<div id="university-collaborators-strip" role="complementary" aria-label="Academic Collaborators"></div>\n${BODY_MARKER_END}\n`;
}

const SKIP_DIRS = new Set([
  '.backup',
  '.git',
  '.github',
  '.vercel',
  'node_modules',
  '.venv',
  '.venv_hieropy',
]);

function shouldSkipDir(dirName) {
  return SKIP_DIRS.has(dirName) || dirName.startsWith('.venv');
}

function walk(dir, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      walk(fullPath, callback);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      callback(fullPath);
    }
  }
}

function removeMarkedBlock(html, startMarker, endMarker) {
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx !== -1 && endIdx !== -1) {
    let removeStart = startIdx;
    while (removeStart > 0 && html[removeStart - 1] === '\n') removeStart--;
    let removeEnd = endIdx + endMarker.length;
    while (removeEnd < html.length && html[removeEnd] === '\n') removeEnd++;
    return html.slice(0, removeStart) + '\n' + html.slice(removeEnd);
  }
  return html;
}

function withRetry(fn, attempts = 3, delayMs = 50) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        try {
          const start = Date.now();
          while (Date.now() - start < delayMs) {
            // Busy-wait to avoid setTimeout in synchronous path.
          }
        } catch {}
      }
    }
  }
  throw lastErr;
}

function injectIntoFile(filePath, headSnippet, bodySnippet) {
  const html = withRetry(() => fs.readFileSync(filePath, 'utf8'));

  // Already present and consistent (same marker block AND current versioned
  // asset URLs) — nothing to do. Older snippet versions are re-injected below.
  if (
    html.includes(HEAD_MARKER_START) &&
    html.includes(BODY_MARKER_START) &&
    html.includes(`href="${CSS_PATH}"`) &&
    html.includes(`src="${JS_PATH}"`)
  ) {
    return true;
  }

  // Remove any previously injected snippets.
  let cleaned = removeMarkedBlock(html, HEAD_MARKER_START, HEAD_MARKER_END);
  cleaned = removeMarkedBlock(cleaned, BODY_MARKER_START, BODY_MARKER_END);  // Inject head resources after <head>.
  const headMatch = cleaned.match(/<head[^>]*>/i);
  if (!headMatch) return false;
  const headInsertPos = headMatch.index + headMatch[0].length;
  cleaned = cleaned.slice(0, headInsertPos) + headSnippet + cleaned.slice(headInsertPos);

  // Inject body placeholder before the first <footer> if present.
  const footerMatch = cleaned.match(/<footer[\s>]/i);
  if (footerMatch) {
    cleaned = cleaned.slice(0, footerMatch.index) + bodySnippet + cleaned.slice(footerMatch.index);
  } else {
    // Fallback: insert before closing </body>.
    const bodyCloseMatch = cleaned.match(/<\/body>/i);
    if (bodyCloseMatch) {
      cleaned = cleaned.slice(0, bodyCloseMatch.index) + bodySnippet + cleaned.slice(bodyCloseMatch.index);
    } else {
      return false;
    }
  }

  withRetry(() => fs.writeFileSync(filePath, cleaned, 'utf8'));
  return true;
}

// Pages that must NEVER carry the strip (e.g. the sponsorship landing page,
// whose empty slots would link back to itself). Any marked blocks found in
// these files are stripped instead of injected.
const EXCLUDED_PAGES = new Set([path.join('university-sponsorship', 'index.html')]);

// App surfaces that must never carry the marketing strip: search, the
// browser shell, the game, the entry point, and the mobile PWA. Any marked
// blocks found in these files are stripped instead of injected.
const EXCLUDED_APP_PAGES = new Set([
  'search.html',
  'search-v2.html',
  'browser.html',
  'entry.html',
]);
const EXCLUDED_APP_DIRS = [path.join('game'), path.join('mobile')];

function isExcludedAppSurface(filePath) {
  const rel = path.relative(ROOT, filePath).split(path.sep).join('/');
  if (EXCLUDED_APP_PAGES.has(rel)) return true;
  for (const dir of EXCLUDED_APP_DIRS) {
    if (rel === dir.split(path.sep).join('/') || rel.startsWith(`${dir.split(path.sep).join('/')}/`))
      return true;
  }
  return false;
}

// Admin surfaces must never carry the marketing strip: the unified admin
// portal (canonical platform/public/admin-portal/ plus the generated root
// admin-portal/ sync copy), the legacy admin-* dashboards under
// platform/public, and the crawler admin pages. Any marked blocks found in
// these files are stripped instead of injected.
const EXCLUDED_ADMIN_DIRS = [
  'platform/public/admin-portal',
  'admin-portal',
  'platform/public/scholars/admin',
  'scholars/admin',
  'platform/public/scholars/dept-admin',
  'scholars/dept-admin',
];
const EXCLUDED_ADMIN_FILES = new Set(['admin.html', 'platform/public/admin.html']);

function isExcludedAdminSurface(filePath) {
  const rel = path.relative(ROOT, filePath).split(path.sep).join('/');
  for (const dir of EXCLUDED_ADMIN_DIRS) {
    if (rel === dir || rel.startsWith(`${dir}/`)) return true;
  }
  if (EXCLUDED_ADMIN_FILES.has(rel)) return true;
  // Legacy admin-* dashboards (admin-api-keys.html, admin-bookings.html, …).
  return /^platform\/public\/admin-[^/]+\.html$/.test(rel);
}

function stripFromFile(filePath) {
  const html = withRetry(() => fs.readFileSync(filePath, 'utf8'));
  let cleaned = removeMarkedBlock(html, HEAD_MARKER_START, HEAD_MARKER_END);
  cleaned = removeMarkedBlock(cleaned, BODY_MARKER_START, BODY_MARKER_END);
  if (cleaned !== html) {
    withRetry(() => fs.writeFileSync(filePath, cleaned, 'utf8'));
    return true;
  }
  return false;
}

function main() {
  const headSnippet = buildHeadSnippet();
  const bodySnippet = buildBodySnippet();
  const targets = [];

  for (const rel of EXCLUDED_PAGES) {
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full) && stripFromFile(full)) {
      console.log(`Stripped Academic Collaborators strip from excluded page: ${rel}`);
    }
  }

  walk(path.join(ROOT, 'sites'), (p) => targets.push(p));
  walk(path.join(ROOT, 'platform', 'public'), (p) => targets.push(p));
  // game/ and mobile/ are walked so the app-surface exclusion strips any
  // previously injected blocks from them on every run (deterministic).
  walk(path.join(ROOT, 'game'), (p) => targets.push(p));
  if (fs.existsSync(path.join(ROOT, 'mobile'))) {
    walk(path.join(ROOT, 'mobile'), (p) => targets.push(p));
  }

  const rootPages = [
    'index.html',
    'search.html',
    'search-v2.html',
    'oracle.html',
    'browser.html',
    'entry.html',
    'admin.html',
    path.join('about', 'index.html'),
    path.join('about', 'authenticity.html'),
    path.join('appraise', 'index.html'),
    path.join('art', 'index.html'),
    path.join('authenticity', 'index.html'),
    path.join('codex', 'index.html'),
    path.join('connections', 'index.html'),
    path.join('contact', 'index.html'),
    path.join('creatives', 'index.html'),
    path.join('game', 'index.html'),
    path.join('lexicon', 'index.html'),
    path.join('lexicon', 'cognates.html'),
    path.join('pantheon', 'index.html'),
    path.join('privacy', 'index.html'),
    path.join('realms', 'index.html'),
    path.join('store', 'index.html'),
    path.join('terms', 'index.html'),
    path.join('terms', 'advertising', 'index.html'),
    path.join('terms', 'data-use', 'index.html'),
    path.join('tiers', 'index.html'),
    path.join('type', 'index.html'),
    path.join('type', 'test.html'),
  ];

  for (const p of rootPages) {
    const full = path.join(ROOT, p);
    if (fs.existsSync(full)) targets.push(full);
  }

  let injected = 0;
  let skipped = 0;
  let stripped = 0;

  // The generated root admin-portal/ copy is not part of the injection
  // targets gathered above; strip any previously injected blocks explicitly.
  const syncedPortalDir = path.join(ROOT, 'admin-portal');
  if (fs.existsSync(syncedPortalDir)) {
    walk(syncedPortalDir, (p) => {
      try {
        if (stripFromFile(p)) {
          stripped++;
          console.log(
            `Stripped Academic Collaborators strip from admin page: ${path.relative(ROOT, p)}`
          );
        }
      } catch (err) {
        console.error(`Failed to strip ${p}:`, err.message);
      }
    });
  }

  // Same for the generated root scholars/admin + scholars/dept-admin copies:
  // sync-scholars-portal re-copies the canonical tree BEFORE this injector
  // runs, so the synced copies must be stripped on every run to stay
  // deterministic.
  for (const syncedScholarsAdminDir of [
    path.join(ROOT, 'scholars', 'admin'),
    path.join(ROOT, 'scholars', 'dept-admin'),
  ]) {
    if (fs.existsSync(syncedScholarsAdminDir)) {
      walk(syncedScholarsAdminDir, (p) => {
        try {
          if (stripFromFile(p)) {
            stripped++;
            console.log(
              `Stripped Academic Collaborators strip from admin page: ${path.relative(ROOT, p)}`
            );
          }
        } catch (err) {
          console.error(`Failed to strip ${p}:`, err.message);
        }
      });
    }
  }

  for (const filePath of targets) {
    try {
      if (isExcludedAdminSurface(filePath) || isExcludedAppSurface(filePath)) {
        if (stripFromFile(filePath)) {
          stripped++;
          console.log(
            `Stripped Academic Collaborators strip from excluded page: ${path.relative(ROOT, filePath)}`
          );
        }
        continue;
      }
      const ok = injectIntoFile(filePath, headSnippet, bodySnippet);
      if (ok) injected++;
      else skipped++;
    } catch (err) {
      console.error(`Failed to inject into ${filePath}:`, err.message);
      skipped++;
    }
  }

  console.log(
    `Injected Academic Collaborators strip into ${injected} HTML files (skipped ${skipped}, stripped ${stripped} excluded files).`
  );
}

main();
