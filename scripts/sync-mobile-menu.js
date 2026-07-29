#!/usr/bin/env node
/**
 * Sync the canonical mobile menu across all non-temple navigation pages.
 *
 * Every page that renders `.mobile-menu` must offer the same sectioned
 * enterprise menu (Explore / Tools / Resources / About). This script
 * replaces each page's `.mobile-menu` block with the canonical markup.
 * Idempotent: running it twice produces byte-identical files.
 *
 * Temple pages (sites/, platform/public/) are intentionally excluded —
 * they use the flagship temple strip navigation.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

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

const CANONICAL_MENU = `<div class="mobile-menu" id="mobile-menu">
        <div class="mobile-menu-section">
            <span class="mobile-menu-title">Explore</span>
            <div class="mobile-menu-group">
                <a href="/pantheon/">Pantheon</a>
                <a href="/realms/">Realms</a>
                <a href="/lexicon/">Lexicon</a>
                <a href="/connections/">Connections</a>
                <a href="/patterns/">Patterns</a>
                <a href="/trending/">Trending</a>
            </div>
        </div>
        <div class="mobile-menu-section">
            <span class="mobile-menu-title">Tools</span>
            <div class="mobile-menu-group">
                <a href="/type/">Type</a>
                <a href="/search.html">Search</a>
                <a href="/tiers/">Tier System</a>
                <a href="/rulebook/">Rulebook</a>
                <a href="/cards/">Cards</a>
                <a href="/oracle.html">Oracle</a>
                <a href="/extension/">Extension</a>
                <a href="/app/">App</a>
            </div>
        </div>
        <div class="mobile-menu-section">
            <span class="mobile-menu-title">Resources</span>
            <div class="mobile-menu-group">
                <a href="/texts/">Texts</a>
                <a href="/codex/">Codex</a>
                <a href="/blog/">Blog</a>
                <a href="/creatives/">Creatives</a>
                <a href="/scholars/">Scholars</a>
                <a href="/api/v1/docs/">API</a>
                <a href="/appraise/">Appraise</a>
                <a href="/store/">Store</a>
            </div>
        </div>
        <div class="mobile-menu-section">
            <span class="mobile-menu-title">About</span>
            <div class="mobile-menu-group">
                <a href="/about/">About</a>
                <a href="/about/founder/">Founder</a>
                <a href="/careers/">Careers</a>
                <a href="/contact/">Contact</a>
            </div>
        </div>
    </div>`;

const MENU_OPEN = '<div class="mobile-menu" id="mobile-menu">';

// Non-temple navigation pages that carry the standard .mobile-menu overlay.
// `active` marks the page's own link inside the menu (styled by main.css).
const TARGETS = [
  { page: '404.html', active: null },
  { page: 'index.html', active: null },
  { page: 'oracle.html', active: '/oracle.html' },
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
  { page: path.join('terms', 'index.html'), active: null },
  { page: path.join('terms', 'store', 'index.html'), active: null },
  { page: path.join('terms', 'creatives', 'index.html'), active: null },
  { page: path.join('extension', 'index.html'), active: '/extension/' },
  { page: path.join('app', 'index.html'), active: '/app/' },
  { page: path.join('lexicon', 'index.html'), active: '/lexicon/' },
  { page: path.join('lexicon', 'cognates.html'), active: '/lexicon/' },
  { page: path.join('pantheon', 'index.html'), active: '/pantheon/' },
  { page: path.join('realms', 'index.html'), active: '/realms/' },
  { page: path.join('store', 'index.html'), active: '/store/' },
  { page: path.join('rulebook', 'index.html'), active: '/rulebook/' },
  { page: path.join('cards', 'index.html'), active: '/cards/' },
  { page: path.join('tiers', 'index.html'), active: '/tiers/' },
  { page: path.join('type', 'index.html'), active: '/type/' },
];

/**
 * The canonical menu for one page, with the page's own link marked active.
 */
function menuForPage(activeHref) {
  if (!activeHref) return CANONICAL_MENU;
  const needle = `<a href="${activeHref}">`;
  if (!CANONICAL_MENU.includes(needle)) return CANONICAL_MENU;
  return CANONICAL_MENU.replace(needle, `<a href="${activeHref}" class="active">`);
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

module.exports = { CANONICAL_MENU, MENU_OPEN, TARGETS, findBalancedDivEnd, menuForPage };
