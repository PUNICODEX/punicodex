#!/usr/bin/env node
/**
 * Sync the canonical DESKTOP navigation across all non-temple pages.
 *
 * Sister script to sync-mobile-menu.js: the desktop nav was historically
 * hand-maintained per page and drifted into seven different item sets
 * (Connections/Oracle/Appraise appearing and disappearing at random).
 * This script makes the nav canonical everywhere:
 *
 *   Primary : Pantheon, Realms, Lexicon, Connections, Type, Search
 *   More ▾  : Tier System, Oracle, Extension, App, Texts, Codex, Blog,
 *             Creatives, Scholars, API, Appraise, Store, About, Contact
 *   CTA     : Enter
 *
 * Per page it normalizes the wordmark (horizontal gold lockup), replaces
 * the .nav-links block, marks the page's own item aria-current="page",
 * guarantees the Enter CTA + nav-toggle, and links the shared component
 * stylesheets (css/nav-more.css, css/mobile-menu.css) and px-core.js on
 * pages that don't already load them. Idempotent.
 *
 * Excluded by design: game/ + entry.html (full-screen app surfaces),
 * sites/ + platform/public/ (temple strip nav lives elsewhere).
 */

const fs = require('node:fs');
const path = require('node:path');
const { writeFileWithRetry } = require('./write-file-retry.js');

const ROOT = path.join(__dirname, '..');
const { PANTHEON_META } = require(path.join(ROOT, 'type', 'js', 'pantheon-meta.js'));

const PRIMARY = [
  ['/pantheon/', 'Pantheon'],
  ['/realms/', 'Realms'],
  ['/lexicon/', 'Lexicon'],
  ['/connections/', 'Connections'],
  ['/type/', 'Type'],
  ['/search/', 'Search'],
];
const MORE = [
  ['/patterns/', 'Patterns'],
  ['/everyday/', 'Words'],
  ['/ink/', 'Ink'],
  ['/cards/', 'Cards'],
  ['/innovation/', 'Innovation'],
  ['/texts/', 'Texts'],
  ['/trending/', 'Trending'],
  ['/codex/', 'Codex'],
  ['/blog/', 'Blog'],
  ['/creatives/', 'Creatives'],
  ['/scholars/', 'Scholars'],
  ['/api/v1/docs/', 'API'],
  ['/appraise/', 'Appraise'],
  ['/herald/', 'Herald'],
  ['/store/', 'Store'],
  ['/about/', 'About'],
  ['/contact/', 'Contact'],
];

// Every root page carrying the canonical nav. `active` marks the page's own
// link (aria-current). null → no item is current on that page.
const TARGETS = [
  { page: 'index.html', active: null },
  { page: '404.html', active: null },
  { page: path.join('oracle', 'index.html'), active: '/innovation/' },
  { page: path.join('search', 'index.html'), active: '/search/', chrome: 'search' },
  { page: path.join('search-v2', 'index.html'), active: '/search/', chrome: 'search' },
  { page: path.join('about', 'index.html'), active: '/about/' },
  { page: path.join('about', 'authenticity.html'), active: null, replaceNav: true },
  { page: path.join('appraise', 'index.html'), active: '/appraise/' },
  { page: path.join('art', 'index.html'), active: null },
  { page: path.join('authenticity', 'index.html'), active: null },
  { page: path.join('blog', 'index.html'), active: '/blog/' },
  { page: path.join('texts', 'index.html'), active: '/texts/' },
  { page: path.join('texts', 'theogony', 'index.html'), active: '/texts/' },
  { page: path.join('rulebook', 'index.html'), active: '/rulebook/' },
  { page: path.join('pronunciation', 'index.html'), active: '/pronunciation/', insertNav: true },
  { page: path.join('everyday', 'index.html'), active: '/everyday/', insertNav: true },
  { page: path.join('ink', 'index.html'), active: '/ink/', insertNav: true },
  { page: path.join('cards', 'index.html'), active: '/cards/' },
  { page: path.join('trending', 'index.html'), active: '/trending/' },
  { page: path.join('patterns', 'index.html'), active: '/patterns/' },
  { page: path.join('patterns', 'methodology', 'index.html'), active: '/patterns/' },
  { page: path.join('careers', 'index.html'), active: null },
  { page: path.join('about', 'founder', 'index.html'), active: '/about/' },
  { page: path.join('arbitrage', 'index.html'), active: null },
  { page: path.join('codex', 'index.html'), active: '/codex/' },
  { page: path.join('codex', 'anatomy-of-a-punycode-domain', 'index.html'), active: '/codex/' },
  { page: path.join('codex', 'building-the-temple', 'index.html'), active: '/codex/' },
  { page: path.join('codex', 'why-greek-accents-matter', 'index.html'), active: '/codex/' },
  { page: path.join('connections', 'index.html'), active: '/connections/' },
  { page: path.join('contact', 'index.html'), active: '/contact/' },
  { page: path.join('creatives', 'index.html'), active: null, insertNav: true },
  { page: path.join('lexicon', 'index.html'), active: '/lexicon/' },
  { page: path.join('lexicon', 'cognates.html'), active: '/lexicon/' },
  { page: path.join('pantheon', 'index.html'), active: '/pantheon/' },
  { page: path.join('privacy', 'index.html'), active: null },
  { page: path.join('realms', 'index.html'), active: '/realms/' },
  { page: path.join('store', 'index.html'), active: '/store/' },
  { page: path.join('terms', 'index.html'), active: null },
  { page: path.join('terms', 'data-use', 'index.html'), active: null },
  { page: path.join('terms', 'advertising', 'index.html'), active: null, insertNav: true },
  { page: path.join('terms', 'store', 'index.html'), active: null },
  { page: path.join('terms', 'creatives', 'index.html'), active: null },
  { page: path.join('terms', 'ink', 'index.html'), active: null },
  { page: path.join('terms', 'appraise', 'index.html'), active: null },
  { page: path.join('terms', 'game', 'index.html'), active: null },
  { page: path.join('terms', 'api', 'index.html'), active: null },
  { page: path.join('terms', 'authenticity', 'index.html'), active: null },
  { page: path.join('terms', 'oracle', 'index.html'), active: null },
  { page: path.join('extension', 'index.html'), active: '/innovation/' },
  { page: path.join('app', 'index.html'), active: '/innovation/' },
  { page: path.join('innovation', 'index.html'), active: '/innovation/' },
  { page: path.join('tiers', 'index.html'), active: '/tiers/' },
  { page: path.join('type', 'index.html'), active: '/type/' },
  { page: path.join('university-sponsorship', 'index.html'), active: null },
  { page: path.join('screen', 'index.html'), active: null },
];

// Per-pantheon landing pages are not in the top nav, but the Pantheon item is
// marked active so visitors know where they are.
for (const id of Object.keys(PANTHEON_META).sort((a, b) => a.localeCompare(b))) {
  TARGETS.push({ page: path.join(id, 'index.html'), active: '/pantheon/' });
}

// Wordmark dims are the TRUE intrinsic size of punicodex-wordmark-ivory.png
// (3600x374). They must match reality: with CSS `height:24px;width:auto` the
// attribute ratio drives the pre-load layout box, so a wrong ratio (the old
// 680x119 was copied from the camel-gold footer mark) caused a nav CLS shift.
// Hardcoding the real dims also keeps `npm run generate` byte-deterministic on
// every platform — the nav syncer runs AFTER convert-images-to-webp, so a
// PIL-measured value must never be what a fresh generate depends on.
// The srcset/sizes pairs serve right-sized variants (720w/1080w baked from the
// 3600w master) — the nav renders the mark at ~173-231px, so shipping the
// 3600px original wasted ~77 KB per page (Lighthouse mobile image audit).
const WORDMARK = `<a href="/" class="nav-wordmark"><picture><source srcset="/assets/brand/01-logos/punicodex-wordmark-ivory-360.webp 360w, /assets/brand/01-logos/punicodex-wordmark-ivory-720.webp 720w, /assets/brand/01-logos/punicodex-wordmark-ivory-1080.webp 1080w, /assets/brand/01-logos/punicodex-wordmark-ivory.webp 3600w" sizes="(max-width: 640px) 173px, 231px" type="image/webp"><img src="/assets/brand/01-logos/punicodex-wordmark-ivory.png" srcset="/assets/brand/01-logos/punicodex-wordmark-ivory-360.png 360w, /assets/brand/01-logos/punicodex-wordmark-ivory-720.png 720w, /assets/brand/01-logos/punicodex-wordmark-ivory-1080.png 1080w, /assets/brand/01-logos/punicodex-wordmark-ivory.png 3600w" sizes="(max-width: 640px) 173px, 231px" alt="PuniCodex — The Unicode Pantheon" width="3600" height="374"></picture></a>`;
const CTA = `<a href="/pantheon/" class="nav-cta"><span>Enter</span></a>`;
const TOGGLE = `<button class="nav-toggle" id="nav-toggle" aria-label="Toggle menu" aria-controls="mobile-menu">
                <span></span>
                <span></span>
                <span></span>
            </button>`;

function linkHtml([href, label], active) {
  const cls = href === active ? 'nav-link active' : 'nav-link';
  const current = href === active ? ' aria-current="page"' : '';
  return `<a href="${href}" class="${cls}"${current}>${label}</a>`;
}

function navLinksHtml(active) {
  const primary = PRIMARY.map((l) => linkHtml(l, active)).join('\n                ');
  const more = MORE.map((l) => linkHtml(l, active)).join('\n                        ');
  return `<div class="nav-links">
                ${primary}
                <div class="nav-more">
                    <button class="nav-more-toggle" aria-haspopup="true" aria-expanded="false">More</button>
                    <div class="nav-more-menu">
                        ${more}
                    </div>
                </div>
            </div>`;
}

function fullNavHtml(active) {
  return `<nav class="main-nav" id="main-nav">
        <div class="nav-inner">
            ${WORDMARK}
            ${navLinksHtml(active)}
            ${CTA}
            ${TOGGLE}
        </div>
    </nav>`;
}

// Find the end index (exclusive) of the element opening at startIdx,
// balancing nested same-tag pairs.
function findBalancedEnd(html, startIdx, tag) {
  let depth = 0;
  let i = startIdx;
  const open = `<${tag}`;
  const close = `</${tag}>`;
  for (;;) {
    const nextOpen = html.indexOf(open, i);
    const nextClose = html.indexOf(close, i);
    if (nextClose === -1) return -1;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + open.length;
    } else {
      depth--;
      i = nextClose + close.length;
      if (depth === 0) return i;
    }
  }
}

function ensureCssLink(html, href) {
  if (html.includes(href)) return html;
  return html.replace('</head>', `    <link rel="stylesheet" href="${href}">\n</head>`);
}

function ensureScript(html, src) {
  if (html.includes(src)) return html;
  return html.replace('</body>', `    <script src="${src}" defer></script>\n</body>`);
}

function syncPage(rel, { active, insertNav, chrome, replaceNav }) {
  const filePath = path.join(ROOT, rel);
  if (!fs.existsSync(filePath)) return 'missing';
  let html = fs.readFileSync(filePath, 'utf8');

  if (insertNav && !/class="main-nav[^"]*"/.test(html)) {
    // Pages with no nav at all: insert the full canonical nav after <body>.
    const bodyMatch = html.match(/<body[^>]*>/i);
    if (!bodyMatch) return 'no-body';
    html = html.replace(bodyMatch[0], `${bodyMatch[0]}\n    ${fullNavHtml(active)}`);
  } else if (insertNav || replaceNav) {
    if (replaceNav) {
      // Pages with a bespoke nav element: swap the whole element for canonical.
      const navStart = html.indexOf('<nav');
      if (navStart === -1) return 'no-nav';
      const navEnd = findBalancedEnd(html, navStart, 'nav');
      if (navEnd === -1) return 'unbalanced';
      html = html.slice(0, navStart) + fullNavHtml(active) + html.slice(navEnd);
    } else {
      // insertNav pages whose nav now exists: run the standard normalization.
      const wmMatch = html.match(/<a href="\/" class="nav-(?:wordmark|logo)">[\s\S]*?<\/a>/);
      if (wmMatch) html = html.replace(wmMatch[0], WORDMARK);
      const linksMatch = html.match(/<div class="nav-links"[^>]*>/);
      if (!linksMatch) return 'no-nav-links';
      const linksStart = linksMatch.index;
      const linksEnd = findBalancedEnd(html, linksStart, 'div');
      if (linksEnd === -1) return 'unbalanced';
      html = html.slice(0, linksStart) + navLinksHtml(active) + html.slice(linksEnd);
    }
  } else if (chrome === 'search') {
    // Search pages keep their compact chrome but swap in the canonical links.
    const navOpen = html.indexOf('class="cn-global-nav"');
    if (navOpen === -1) return 'no-cn-nav';
    const navTagStart = html.lastIndexOf('<nav', navOpen);
    const navEnd = findBalancedEnd(html, navTagStart, 'nav');
    if (navEnd === -1) return 'unbalanced';
    const cnNav = html.slice(navTagStart, navEnd);
    const innerOpen = cnNav.indexOf('>') + 1;
    const innerClose = cnNav.lastIndexOf('</nav>');
    const newNav = `${cnNav.slice(0, innerOpen)}\n          ${navLinksHtml(active).split('\n').join('\n          ')}\n        ${cnNav.slice(innerClose)}`;
    html = html.slice(0, navTagStart) + newNav + html.slice(navEnd);
  } else {
    // Standard pages: normalize wordmark, replace .nav-links, ensure CTA+toggle.
    if (!/class="main-nav[^"]*"/.test(html)) return 'no-main-nav';

    // 1. Wordmark (nav-logo or nav-wordmark variants → canonical lockup).
    const wmMatch = html.match(/<a href="\/" class="nav-(?:wordmark|logo)">[\s\S]*?<\/a>/);
    if (wmMatch) html = html.replace(wmMatch[0], WORDMARK);

    // 2. .nav-links block (balanced; may carry extra attributes).
    const linksMatch = html.match(/<div class="nav-links"[^>]*>/);
    if (!linksMatch) return 'no-nav-links';
    const linksStart = linksMatch.index;
    const linksEnd = findBalancedEnd(html, linksStart, 'div');
    if (linksEnd === -1) return 'unbalanced';
    html = html.slice(0, linksStart) + navLinksHtml(active) + html.slice(linksEnd);

    // 3. CTA + toggle.
    if (!html.includes('class="nav-cta"')) {
      if (html.includes('id="nav-toggle"')) {
        html = html.replace(/(\s*)<button class="nav-toggle" id="nav-toggle"/, `\n            ${CTA}$1<button class="nav-toggle" id="nav-toggle"`);
      } else {
        const navInnerClose = html.indexOf('</div>', html.indexOf('class="nav-inner"'));
        html = `${html.slice(0, navInnerClose)}            ${CTA}\n            ${TOGGLE}\n        ${html.slice(navInnerClose)}`;
      }
    } else {
      html = html.replace(/<a href="[^"]*" class="nav-cta">[\s\S]*?<\/a>/, CTA);
    }
  }

  // Shared stylesheets + behavior: nav-more.css (dropdown/CTA) when main.css
  // is absent; mobile-menu.css when the page carries the overlay without
  // main.css; px-core.js for dropdown/toggle behavior.
  if (!html.includes('/css/main.css')) {
    // Normalize component-CSS versions (immutable-cached URLs must change
    // when the files change), then ensure they're linked.
    html = html.replace(/\/css\/nav-more\.css\?v=\d+/g, '/css/nav-more.css?v=4');
    html = ensureCssLink(html, '/css/nav-more.css?v=4');
    if (html.includes('class="mobile-menu"')) html = ensureCssLink(html, '/css/mobile-menu.css?v=3');
  }
  if (!html.includes('/js/px-core.js')) {
    html = ensureScript(html, '/js/px-core.js?v=perf9');
  }

  writeFileWithRetry(filePath, html, 'utf8');
  return 'synced';
}

function main() {
  const counts = {};
  for (const { page, ...opts } of TARGETS) {
    try {
      const result = syncPage(page, opts);
      counts[result] = (counts[result] || 0) + 1;
      if (result !== 'synced' && result !== 'already') {
        console.log(`  ${result}: ${page}`);
      }
    } catch (err) {
      console.error(`  ERROR ${page}: ${err.message}`);
      counts.error = (counts.error || 0) + 1;
    }
  }
  console.log(
    `Desktop nav sync: ${counts.synced || 0} synced, ${counts.already || 0} already canonical, ${counts.error || 0} errors.`
  );
  if (counts.error) process.exit(1);
}

if (require.main === module) main();

module.exports = { TARGETS, PRIMARY, MORE, navLinksHtml, fullNavHtml };
