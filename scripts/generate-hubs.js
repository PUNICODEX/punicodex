/* Generates the six wing hub pages from scripts/nav-tree.js:
   /world/ (Atlas), /culture/, /tools/, /library/, /relics/.
   /about/ already exists as a page and is not overwritten — it only
   gains its dropdown through the nav syncers. */

const fs = require('node:fs');
const path = require('node:path');
const { writeFileWithRetry } = require('./write-file-retry.js');
const PINS = require('./asset-pins.js');
const { HUB_ORDER, HUBS, childrenOf } = require('./nav-tree.js');

const ROOT = path.join(__dirname, '..');
const { fullNavHtml } = require('./sync-desktop-nav.js');

// Per-hub deterministic seed — stable scenes across regenerations.
function seedFrom(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SIGIL = `<svg class="hub-sigil" width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
  <path d="M15 3 L27 25 L3 25 Z" stroke="#b87333" stroke-width="1.4"/>
  <path d="M15 10 L22 23 L8 23 Z" stroke="#d4af37" stroke-width="1"/>
</svg>`;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function cardHtml(item, active) {
  const kids = childrenOf(item);
  const blurb = item.blurb || '';
  const tag = item.tag ? `<span class="hub-card-tag">${esc(item.tag)}</span>` : '';
  return `<a class="hub-card hub-reveal" href="${item.href}"${item.href === active ? ' aria-current="page"' : ''} data-hub-card>
      <div class="hub-card-top"><h2 class="hub-card-title">${esc(item.label)}</h2>${tag}${SIGIL}</div>
      <p class="hub-card-blurb">${esc(blurb)}</p>
      <span class="hub-card-go">${kids.length ? `Explore ${kids.length} destinations` : 'Enter'}</span>
    </a>`;
}

function pageHtml(hubId, hub, active) {
  const title = `${hub.label} — PuniCodex`;
  const description = `${hub.tagline}. ${hub.blurb}`;
  const itemList = hub.items.map((it) => ({
    '@type': 'ListItem',
    name: it.label,
    url: `https://punicodex.com${it.href}`,
  }));
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${hub.label} — PuniCodex`,
    description: hub.tagline,
    itemListElement: itemList,
  };
  const cards = hub.items.map((it) => cardHtml(it, active)).join('\n        ');
  const seed = seedFrom(hubId);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <link rel="canonical" href="https://punicodex.com${hub.href}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="https://punicodex.com${hub.href}">
    <meta property="og:image" content="https://punicodex.com/assets/og/og-default.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <link rel="stylesheet" href="/assets/fonts/fonts.css">
    <link rel="stylesheet" href="/css/temple-base.css?v=perf22">
    <link rel="stylesheet" href="${PINS.NAV_MORE_CSS}">
    <link rel="stylesheet" href="${PINS.MOBILE_MENU_CSS}">
    <link rel="stylesheet" href="/css/hub.css?v=1">
    <link rel="stylesheet" href="/css/footer.css?v=2">
    <meta name="theme-color" content="#0e0b08">
    <meta name="color-scheme" content="dark">
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
    ${fullNavHtml(active)}
    <main>
        <section class="hub-hero">
            <canvas class="hub-hero-canvas" id="hub-canvas" aria-hidden="true"></canvas>
            <div class="hub-hero-veil"></div>
            <div class="hub-hero-copy">
                <p class="hub-kicker">PuniCodex · Wing of the Pantheon</p>
                <h1 class="hub-title">${esc(hub.label)}</h1>
                <p class="hub-tagline">${esc(hub.tagline)}</p>
                <p class="hub-blurb">${esc(hub.blurb)}</p>
            </div>
        </section>
        <section class="hub-section">
            <div class="hub-grid">
        ${cards}
            </div>
        </section>
    </main>
    <footer class="site-footer">
        <div class="footer-inner">
            <p class="footer-line"><a href="/">PuniCodex</a> — The Unicode Pantheon. 980 names, restored and defended.</p>
            <p class="footer-line"><a href="/about/">About</a> · <a href="/contact/">Contact</a> · <a href="/terms/">Terms</a> · <a href="/privacy/">Privacy</a></p>
        </div>
    </footer>
    <script src="/js/hub3d.js?v=1" defer></script>
    <script src="/js/px-core.js?v=perf23" defer></script>
    <script>
    window.addEventListener('DOMContentLoaded', function () {
        var canvas = document.getElementById('hub-canvas');
        var engine = window.Hub3D ? Hub3D.create(canvas, { scene: '${hub.scene}', seed: ${seed} }) : null;
        document.querySelectorAll('[data-hub-card]').forEach(function (card) {
            card.addEventListener('mouseenter', function () { if (engine) engine.pulse(0.55); });
            if (window.matchMedia('(pointer: fine)').matches) {
                card.addEventListener('pointermove', function (ev) {
                    var r = card.getBoundingClientRect();
                    var x = (ev.clientX - r.left) / r.width - 0.5;
                    var y = (ev.clientY - r.top) / r.height - 0.5;
                    card.style.setProperty('--ry', (x * 5) + 'deg');
                    card.style.setProperty('--rx', (-y * 5) + 'deg');
                });
                card.addEventListener('pointerleave', function () {
                    card.style.setProperty('--ry', '0deg');
                    card.style.setProperty('--rx', '0deg');
                });
            }
        });
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en, i) {
                if (en.isIntersecting) {
                    en.target.style.transitionDelay = (Math.min(i, 6) * 60) + 'ms';
                    en.target.classList.add('hub-revealed');
                    io.unobserve(en.target);
                }
            });
        }, { rootMargin: '0px 0px -8% 0px' });
        document.querySelectorAll('.hub-reveal').forEach(function (el) { io.observe(el); });
    });
    </script>
</body>
</html>
`;
}

// Map hub id → output directory. 'atlas' routes to /world/ because /atlas/
// is the Atlas temple's canonical URL (middleware LEXICON_IDS); 'tools'
// routes to /instruments/ because repo-root tools/ is the dev-scripts dir.
const OUT_DIRS = {
  atlas: 'world',
  culture: 'culture',
  tools: 'instruments',
  library: 'library',
  relics: 'relics',
};

function writeIfChanged(file, content) {
  try {
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
  } catch (e) { /* fall through and write */ }
  writeFileWithRetry(file, content);
  return true;
}

function main() {
  let written = 0;
  for (const hubId of HUB_ORDER) {
    const dir = OUT_DIRS[hubId];
    if (!dir) continue; // about — existing page, not regenerated
    const hub = HUBS[hubId];
    const outDir = path.join(ROOT, dir);
    fs.mkdirSync(outDir, { recursive: true });
    const file = path.join(outDir, 'index.html');
    const active = hub.items.some((it) => it.href === hub.href) ? null : hub.href;
    writeIfChanged(file, pageHtml(hubId, hub, active));
    written++;
    console.log(`  ${dir}/index.html written (${hub.items.length} destinations)`);
  }
  console.log(`Hubs: ${written} pages generated.`);
}

main();
