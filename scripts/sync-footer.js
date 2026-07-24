#!/usr/bin/env node
/**
 * Sync the canonical site footer across all non-temple pages.
 *
 * Sister to sync-desktop-nav.js / sync-mobile-menu.js: the footer drifted
 * the same way the nav did (custom minimal footers on realms/lexicon/blog,
 * none at all on search + terms/data-use + terms/advertising). This script
 * replaces any existing <footer> block with the canonical one and inserts
 * it where missing. Idempotent. The blog index generator consumes the same
 * builder — never fork the markup.
 *
 * Canonical footer: camel wordmark (horizontal, compact), tagline, three
 * columns (Explore / Resources / Connect), legal line. Mobile compaction
 * lives in css/footer.css (linked on pages without main.css).
 */

const fs = require('node:fs');
const path = require('node:path');
const { writeFileWithRetry } = require('./write-file-retry.js');

const ROOT = path.join(__dirname, '..');

const EXPLORE = [
  ['/pantheon/', 'Pantheon'],
  ['/realms/', 'Realms'],
  ['/lexicon/', 'Lexicon'],
  ['/connections/', 'Connections'],
  ['/patterns/', 'Patterns'],
  ['/trending/', 'Trending'],
  ['/tiers/', 'Tier System'],
  ['/type/', 'Type'],
  ['/search.html', 'Search'],
];
const RESOURCES = [
  ['/codex/', 'Codex'],
  ['/blog/', 'Blog'],
  ['/texts/', 'Texts'],
  ['/creatives/', 'Creatives'],
  ['/scholars/', 'Scholars'],
  ['/api/v1/docs/', 'API'],
  ['/appraise/', 'Appraise'],
  ['/authenticity/', 'Authenticity'],
  ['/oracle.html', 'Oracle'],
  ['/arbitrage/', 'Arbitrage'],
];
const CONNECT = [
  ['/about/', 'About'],
  ['/about/founder/', 'Founder'],
  ['/careers/', 'Careers'],
  ['/contact/', 'Contact'],
  ['/privacy/', 'Privacy'],
  ['/terms/', 'Terms'],
];

// game/ and entry.html are full-screen app surfaces — no footer by design.
const TARGETS = [
  'index.html',
  '404.html',
  'oracle.html',
  'search.html',
  'search-v2.html',
  path.join('about', 'index.html'),
  path.join('about', 'authenticity.html'),
  path.join('appraise', 'index.html'),
  path.join('art', 'index.html'),
  path.join('authenticity', 'index.html'),
  path.join('blog', 'index.html'),
  path.join('texts', 'index.html'),
  path.join('texts', 'theogony', 'index.html'),
  path.join('trending', 'index.html'),
  path.join('patterns', 'index.html'),
  path.join('patterns', 'methodology', 'index.html'),
  path.join('careers', 'index.html'),
  path.join('about', 'founder', 'index.html'),
  path.join('arbitrage', 'index.html'),
  path.join('codex', 'index.html'),
  path.join('codex', 'anatomy-of-a-punycode-domain', 'index.html'),
  path.join('codex', 'building-the-temple', 'index.html'),
  path.join('codex', 'why-greek-accents-matter', 'index.html'),
  path.join('connections', 'index.html'),
  path.join('contact', 'index.html'),
  path.join('creatives', 'index.html'),
  path.join('lexicon', 'index.html'),
  path.join('lexicon', 'cognates.html'),
  path.join('pantheon', 'index.html'),
  path.join('privacy', 'index.html'),
  path.join('realms', 'index.html'),
  path.join('store', 'index.html'),
  path.join('terms', 'index.html'),
  path.join('terms', 'data-use', 'index.html'),
  path.join('terms', 'advertising', 'index.html'),
  path.join('tiers', 'index.html'),
  path.join('type', 'index.html'),
  path.join('university-sponsorship', 'index.html'),
  path.join('scholars', 'index.html'),
];

function columnHtml(title, links) {
  const items = links.map(([href, label]) => `<a href="${href}">${label}</a>`).join('\n                    ');
  return `<div class="footer-column">
                    <h2 class="footer-heading">${title}</h2>
                    ${items}
                </div>`;
}

function footerHtml() {
  return `<footer class="site-footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <a href="/" class="footer-wordmark"><picture><source srcset="/assets/brand/01-logos/punicodex-wordmark-camel-gold.webp" type="image/webp"><img src="/assets/brand/01-logos/punicodex-wordmark-camel-gold.png" alt="PuniCodex — The Unicode Pantheon" width="680" height="119"></picture></a>
                    <p class="footer-tagline">Restoring the original names of the gods to the digital realm.</p>
                </div>
                ${columnHtml('Explore', EXPLORE)}
                ${columnHtml('Resources', RESOURCES)}
                ${columnHtml('Connect', CONNECT)}
            </div>
            <div class="footer-bottom">
                <p>© 2026 PuniCodex. All rites reserved.</p>
            </div>
        </div>
    </footer>`;
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
    html = ensureCssLink(html, '/css/footer.css?v=1');
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

module.exports = { TARGETS, EXPLORE, RESOURCES, CONNECT, footerHtml };
