#!/usr/bin/env node
/**
 * Sync the canonical site footer across all non-temple pages.
 *
 * Sister to sync-desktop-nav.js / sync-mobile-menu.js: the footer is a
 * hub-mirror generated from scripts/nav-tree.js — six columns, one per hub,
 * with the hub page as the column heading, the hub's role line as
 * microcopy, its featured spokes, and an "All of {hub} →" escape. The
 * brand row carries the wordmark, tagline, and the Archē entry ("Begin the
 * Ascent"). Because menu, hubs, and footer all derive from nav-tree.js,
 * the surfaces cannot drift apart.
 *
 * This script replaces any existing <footer> block with the canonical one
 * and inserts it where missing. Idempotent. The blog index generator and
 * the hub page generator consume the same builder — never fork the markup.
 *
 * Canonical footer: camel wordmark (horizontal, compact), tagline, six hub
 * columns, legal line. Mobile compaction lives in css/footer.css (linked
 * on pages without main.css).
 */

const fs = require('node:fs');
const path = require('node:path');
const { writeFileWithRetry } = require('./write-file-retry.js');

const ROOT = path.join(__dirname, '..');
const { PANTHEON_META } = require(path.join(ROOT, 'type', 'js', 'pantheon-meta.js'));
const { HUB_ORDER, HUBS } = require('./nav-tree.js');

/* Featured spokes per hub, derived from the hub's own items (by label) so
 * a rename or removal in nav-tree.js fails loudly here at build time. */
function featuredLinks(hub) {
  return hub.footer.map((label) => {
    const item = hub.items.find((i) => i.label === label);
    if (!item) {
      throw new Error(`nav-tree: hub "${hub.label}" footer lists unknown item "${label}"`);
    }
    return { href: item.href, label: item.label };
  });
}

function columnHtml(hub) {
  const links = featuredLinks(hub)
    .map((l) => `<a href="${l.href}">${l.label}</a>`)
    .join('\n                    ');
  return `<div class="footer-column">
                    <h2 class="footer-heading"><a href="${hub.href}">${hub.label}</a></h2>
                    <p class="footer-role">${hub.role}</p>
                    ${links}
                    <a href="${hub.href}" class="footer-all">All of ${hub.label}</a>
                </div>`;
}

function footerHtml() {
  return `<footer class="site-footer">
        <div class="container">
            <div class="footer-brand">
                <a href="/" class="footer-wordmark"><picture><source srcset="/assets/brand/01-logos/punicodex-wordmark-camel-gold.webp" type="image/webp"><img src="/assets/brand/01-logos/punicodex-wordmark-camel-gold.png" alt="PuniCodex — The Unicode Pantheon" width="680" height="119"></picture></a>
                <p class="footer-tagline">Restoring the original names of the gods to the digital realm.</p>
                <a href="/genesis/" class="footer-begin">Begin the Ascent</a>
            </div>
            <div class="footer-grid">
                ${HUB_ORDER.map((id) => columnHtml(HUBS[id])).join('\n                ')}
            </div>
            <div class="footer-bottom">
                <p>© 2026 PuniCodex. All rites reserved.</p>
                <nav class="footer-legal" aria-label="Legal">
                    <a href="/privacy/">Privacy</a>
                    <a href="/terms/">Terms</a>
                </nav>
                <a href="https://hekaweb.com" target="_blank" rel="noopener" class="hekaweb-credit" aria-label="Proudly built and maintained by HEKAWEB">
                    <span class="hekaweb-by">Proudly built &amp; maintained by</span>
                    <span class="hekaweb-name">HEKAWEB</span>
                </a>
            </div>
        </div>
    </footer>`;
}

/* Every href the canonical footer links — the audits and tests consume
 * this instead of hardcoding column lists. */
function footerHrefs() {
  const hrefs = new Set(['/genesis/', '/privacy/', '/terms/']);
  for (const id of HUB_ORDER) {
    const hub = HUBS[id];
    hrefs.add(hub.href);
    for (const l of featuredLinks(hub)) hrefs.add(l.href);
  }
  return [...hrefs];
}

// game/ and entry.html are full-screen app surfaces — no footer by design.
const TARGETS = [
  'index.html',
  '404.html',
  path.join('oracle', 'index.html'),
  path.join('search', 'index.html'),
  path.join('search-v2', 'index.html'),
  path.join('about', 'index.html'),
  path.join('about', 'authenticity.html'),
  path.join('appraise', 'index.html'),
  path.join('art', 'index.html'),
  path.join('authenticity', 'index.html'),
  path.join('blog', 'index.html'),
  path.join('texts', 'index.html'),
  path.join('texts', 'theogony', 'index.html'),
  path.join('rulebook', 'index.html'),
  path.join('trending', 'index.html'),
  path.join('patterns', 'index.html'),
  path.join('patterns', 'methodology', 'index.html'),
  path.join('careers', 'index.html'),
  path.join('about', 'founder', 'index.html'),
  path.join('arbitrage', 'index.html'),
  path.join('codex', 'index.html'),
  path.join('codex', 'anatomy-of-a-punycode-domain', 'index.html'),
  path.join('codex', 'building-the-temple', 'index.html'),
  path.join('codex', 'restoring-the-names', 'index.html'),
  path.join('codex', 'why-greek-accents-matter', 'index.html'),
  path.join('connections', 'index.html'),
  path.join('contact', 'index.html'),
  path.join('creatives', 'index.html'),
  path.join('herald', 'edition', 'index.html'),
  path.join('lexicon', 'index.html'),
  path.join('lexicon', 'cognates.html'),
  path.join('pantheon', 'index.html'),
  path.join('privacy', 'index.html'),
  path.join('realms', 'index.html'),
  path.join('artifacts', 'index.html'),
  path.join('store', 'index.html'),
  path.join('innovation', 'index.html'),
  path.join('terms', 'index.html'),
  path.join('terms', 'data-use', 'index.html'),
  path.join('terms', 'advertising', 'index.html'),
  path.join('type', 'index.html'),
  path.join('university-sponsorship', 'index.html'),
  path.join('scholars', 'index.html'),
  path.join('platform', 'public', 'scholars', 'index.html'),
  path.join('pronunciation', 'index.html'),
  path.join('everyday', 'index.html'),
  path.join('ink', 'index.html'),
  path.join('screen', 'index.html'),
  path.join('engineering', 'index.html'),
  // Wing hub pages (scripts/generate-hubs.js emits this same builder).
  path.join('world', 'index.html'),
  path.join('culture', 'index.html'),
  path.join('instruments', 'index.html'),
  path.join('library', 'index.html'),
  path.join('relics', 'index.html'),
];

// Per-pantheon landing pages receive the canonical footer.
for (const id of Object.keys(PANTHEON_META).sort((a, b) => a.localeCompare(b))) {
  TARGETS.push(path.join(id, 'index.html'));
}

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

function syncPage(rel) {
  const filePath = path.join(ROOT, rel);
  if (!fs.existsSync(filePath)) return 'missing';
  let html = fs.readFileSync(filePath, 'utf8');

  const footerStart = html.search(/<footer[\s>]/i);
  if (footerStart !== -1) {
    const footerEnd = findBalancedEnd(html, footerStart, 'footer');
    if (footerEnd === -1) return 'unbalanced';
    html = html.slice(0, footerStart) + footerHtml() + html.slice(footerEnd);
  } else {
    // No footer: insert before the closing body tag.
    const bodyClose = html.lastIndexOf('</body>');
    if (bodyClose === -1) return 'no-body';
    html = `${html.slice(0, bodyClose)}    ${footerHtml()}\n${html.slice(bodyClose)}`;
  }

  if (!html.includes('/css/main.css')) {
    html = ensureCssLink(html, '/css/footer.css?v=3');
  }

  writeFileWithRetry(filePath, html, 'utf8');
  return 'synced';
}

function main() {
  const counts = {};
  for (const rel of TARGETS) {
    try {
      const result = syncPage(rel);
      counts[result] = (counts[result] || 0) + 1;
      if (result !== 'synced') console.log(`  ${result}: ${rel}`);
    } catch (err) {
      console.error(`  ERROR ${rel}: ${err.message}`);
      counts.error = (counts.error || 0) + 1;
    }
  }
  console.log(`Footer sync: ${counts.synced || 0} synced, ${counts.error || 0} errors.`);
  if (counts.error) process.exit(1);
}

if (require.main === module) main();

module.exports = { TARGETS, HUB_ORDER, HUBS, featuredLinks, footerHrefs, footerHtml, syncPage };
