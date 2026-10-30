#!/usr/bin/env node
/**
 * Sync the canonical mobile menu across all non-temple navigation pages.
 *
 * Every page that renders `.mobile-menu` must offer the same sectioned
 * menu (Explore / Tools / Resources / About):
 *   Explore: Pantheon (featured), Realms, Patterns, Trending, Store,
 *            Connections, Search, Words, Screen
 *   Tools:   Type, Ink, Oracle, App, Extension, API, Codex, Appraise
 *   Resources: Lexicon, Texts, Blog, Cards, Creatives, Scholars, Herald
 *   About:   About, Founder, Careers, Contact
 * This script replaces each page's `.mobile-menu` block with the canonical
 * markup. Idempotent: running it twice produces byte-identical files.
 *
 * Temple pages (sites/, platform/public/) are intentionally excluded —
 * they use the flagship temple strip navigation.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { PANTHEON_META } = require(path.join(ROOT, 'type', 'js', 'pantheon-meta.js'));

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

const { HUB_ORDER, HUBS, childrenOf } = require('./nav-tree.js');

function buildSubMenu(item, kids) {
  const kidLinks = [
    `<a href="${item.href}" class="mobile-link--featured">${item.label} — overview</a>`,
    ...kids.map((k) => `<a href="${k.href}">${k.label}</a>`),
  ].join('\n                    ');
  return `<details class="mobile-sub">
                <summary>${item.label}<span class="mobile-sub-caret">▾</span></summary>
                <div class="mobile-sub-group">
                    ${kidLinks}
                </div>
            </details>`;
}

function buildSection(id) {
  const hub = HUBS[id];
  const parts = [`<a href="${hub.href}" class="mobile-link--featured">${hub.label}</a>`];
  for (const item of hub.items) {
    const kids = childrenOf(item);
    parts.push(kids.length ? buildSubMenu(item, kids) : `<a href="${item.href}">${item.label}</a>`);
  }
  return `<div class="mobile-menu-section">
            <span class="mobile-menu-title">${hub.label}</span>
            <div class="mobile-menu-group">
                ${parts.join('\n                ')}
            </div>
        </div>`;
}

const CANONICAL_MENU = `<div class="mobile-menu" id="mobile-menu">
        ${HUB_ORDER.map(buildSection).join('\n        ')}
    </div>`;

const MENU_OPEN = '<div class="mobile-menu" id="mobile-menu">';

// Non-temple navigation pages that carry the standard .mobile-menu overlay.
// `active` marks the page's own link inside the menu (styled by main.css).
const TARGETS = [
  { page: '404.html', active: null },
  { page: 'index.html', active: null },
  { page: path.join('oracle', 'index.html'), active: '/oracle/' },
  { page: path.join('about', 'index.html'), active: '/about/' },
  { page: path.join('about', 'authenticity.html'), active: null },
  { page: path.join('appraise', 'index.html'), active: '/appraise/' },
  { page: path.join('art', 'index.html'), active: null },
  { page: path.join('authenticity', 'index.html'), active: null },
  { page: path.join('codex', 'index.html'), active: '/codex/' },
  { page: path.join('texts', 'index.html'), active: '/texts/' },
  { page: path.join('trending', 'index.html'), active: '/trending/' },
  { page: path.join('patterns', 'index.html'), active: '/patterns/' },
  { page: path.join('careers', 'index.html'), active: '/careers/' },
  { page: path.join('about', 'founder', 'index.html'), active: '/about/' },
  { page: path.join('arbitrage', 'index.html'), active: null },
  { page: path.join('connections', 'index.html'), active: '/connections/' },
  { page: path.join('contact', 'index.html'), active: '/contact/' },
  { page: path.join('creatives', 'index.html'), active: null },
  { page: path.join('herald', 'edition', 'index.html'), active: '/herald/' },
  { page: path.join('terms', 'index.html'), active: null },
  { page: path.join('terms', 'store', 'index.html'), active: null },
  { page: path.join('terms', 'creatives', 'index.html'), active: null },
  { page: path.join('terms', 'ink', 'index.html'), active: null },
  { page: path.join('terms', 'appraise', 'index.html'), active: null },
  { page: path.join('terms', 'game', 'index.html'), active: null },
  { page: path.join('terms', 'api', 'index.html'), active: null },
  { page: path.join('terms', 'authenticity', 'index.html'), active: null },
  { page: path.join('terms', 'oracle', 'index.html'), active: null },
  { page: path.join('extension', 'index.html'), active: '/extension/' },
  { page: path.join('app', 'index.html'), active: '/app/' },
  { page: path.join('innovation', 'index.html'), active: null },
  { page: path.join('lexicon', 'index.html'), active: '/lexicon/' },
  { page: path.join('lexicon', 'cognates.html'), active: '/lexicon/' },
  { page: path.join('pantheon', 'index.html'), active: '/pantheon/' },
  { page: path.join('realms', 'index.html'), active: '/realms/' },
  { page: path.join('artifacts', 'index.html'), active: null },
  { page: path.join('store', 'index.html'), active: '/store/' },
  { page: path.join('rulebook', 'index.html'), active: '/rulebook/' },
  { page: path.join('everyday', 'index.html'), active: '/everyday/' },
  { page: path.join('ink', 'index.html'), active: '/ink/' },
  { page: path.join('cards', 'index.html'), active: '/cards/' },
  { page: path.join('type', 'index.html'), active: '/type/' },
  { page: path.join('screen', 'index.html'), active: '/screen/' },
  // Wing hub pages carry the overlay too.
  { page: path.join('world', 'index.html'), active: '/world/' },
  { page: path.join('culture', 'index.html'), active: '/culture/' },
  { page: path.join('instruments', 'index.html'), active: '/instruments/' },
  { page: path.join('library', 'index.html'), active: '/library/' },
  { page: path.join('relics', 'index.html'), active: '/relics/' },
];

// Per-pantheon landing pages mark the Pantheon section active in the mobile menu.
for (const id of Object.keys(PANTHEON_META).sort((a, b) => a.localeCompare(b))) {
  TARGETS.push({ page: path.join(id, 'index.html'), active: '/pantheon/' });
}

/**
 * The canonical menu for one page, with the page's own link marked active.
 * The Pantheon link is always featured; when it is active it keeps the
 * featured class and adds the active class.
 */
function menuForPage(activeHref) {
  if (!activeHref) return CANONICAL_MENU;
  const plainNeedle = `<a href="${activeHref}">`;
  const featuredNeedle = `<a href="${activeHref}" class="mobile-link--featured">`;
  if (CANONICAL_MENU.includes(plainNeedle)) {
    return CANONICAL_MENU.replace(plainNeedle, `<a href="${activeHref}" class="active">`);
  }
  if (CANONICAL_MENU.includes(featuredNeedle)) {
    return CANONICAL_MENU.replace(
      featuredNeedle,
      `<a href="${activeHref}" class="mobile-link--featured active">`
    );
  }
  return CANONICAL_MENU;
}

/**
 * Find the end index (exclusive) of the element that opens at `startIdx`,
 * balancing nested <div> / </div> pairs.
 */
function findBalancedDivEnd(html, startIdx) {
  let depth = 0;
  let i = startIdx;
  for (;;) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose === -1) return -1;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      i = nextClose + 6;
      if (depth === 0) return i;
    }
  }
}

function syncFile(filePath, activeHref) {
  const html = fs.readFileSync(filePath, 'utf8');
  const expectedMenu = menuForPage(activeHref);
  const startIdx = html.indexOf(MENU_OPEN);
  if (startIdx === -1) {
    // No menu yet: insert the canonical one right after the main nav.
    const navClose = html.indexOf('</nav>');
    if (navClose === -1 || !html.includes('nav-toggle')) return 'absent';
    const insertAt = navClose + '</nav>'.length;
    const eol = html.includes('\r\n') ? '\r\n' : '\n';
    const menu = expectedMenu.split('\n').join(eol);
    const next = `${html.slice(0, insertAt)}${eol}${eol}    ${menu}${html.slice(insertAt)}`;
    withRetry(() => fs.writeFileSync(filePath, next, 'utf8'));
    return 'inserted';
  }

  const endIdx = findBalancedDivEnd(html, startIdx);
  if (endIdx === -1) {
    console.error(`  ✗ unbalanced <div> nesting in ${path.relative(ROOT, filePath)}`);
    return 'error';
  }

  const current = html.slice(startIdx, endIdx);
  if (current === expectedMenu) return 'unchanged';

  const next = html.slice(0, startIdx) + expectedMenu + html.slice(endIdx);
  withRetry(() => fs.writeFileSync(filePath, next, 'utf8'));
  return 'updated';
}

/**
 * Normalize one page's mobile menu to the canonical block. Exported so page
 * generators (generate-herald, generate-everyday-page) can emit canonical
 * output directly — without this, tests that run a single generator in
 * isolation leave a non-canonical menu behind until the next full sync, and
 * parallel test phases race on the shared file.
 */
function syncOne(filePath, activeHref) {
  return syncFile(filePath, activeHref);
}

function main() {
  let updated = 0;
  let unchanged = 0;
  const problems = [];

  for (const target of TARGETS) {
    const rel = target.page;
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) {
      problems.push(`${rel} (missing file)`);
      continue;
    }
    const result = syncFile(full, target.active);
    if (result === 'updated' || result === 'inserted') {
      updated++;
      console.log(`  ✓ ${rel} (${result})`);
    } else if (result === 'unchanged') {
      unchanged++;
    } else {
      problems.push(`${rel} (${result})`);
    }
  }

  console.log(
    `Mobile menu sync: ${updated} updated, ${unchanged} already canonical` +
      (problems.length ? `, PROBLEMS: ${problems.join('; ')}` : '')
  );
  if (problems.length) process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = { CANONICAL_MENU, MENU_OPEN, TARGETS, findBalancedDivEnd, menuForPage, syncOne };
