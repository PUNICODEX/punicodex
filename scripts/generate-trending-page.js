#!/usr/bin/env node
/**
 * PuniCodex — Trending page generator.
 *
 * Builds /trending/index.html — the live ranking engine: which temples and
 * pages are most visited, from the first-party analytics aggregates served
 * at /api/analytics/trending/. The page embeds a static temple registry
 * (id → unicode/pantheon/mascot) baked at generation time from the canonical
 * archetypes; rankings are joined client-side against that registry, so the
 * page works even when the API serves from an ephemeral instance.
 *
 * Canonical chrome comes from the shared builders (same pattern as
 * scripts/generate-blog-index.js). Idempotent: byte-stable when inputs are
 * unchanged.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
const { fullNavHtml } = require('./sync-desktop-nav.js');
const { menuForPage } = require('./sync-mobile-menu.js');
const { footerHtml } = require('./sync-footer.js');
const { writeFileWithRetry } = require('./write-file-retry.js');

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function templeRegistry() {
  const map = {};
  for (const a of ARCHETYPES.filter((x) => x.built)) {
    map[a.id] = {
      unicode: a.name,
      pantheon: a.pantheon,
      mascot: a.mascotPath || a.mascotFallback || '',
    };
  }
  return map;
}

function render() {
  const registry = templeRegistry();
  const registryJson = JSON.stringify(registry).replace(/<\//g, '<\\/');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<!-- PUNICODEX-ANALYTICS-START -->
<script src="/js/analytics-beacon.js?v=1" defer></script>
<!-- PUNICODEX-ANALYTICS-END -->

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="google" content="notranslate">
<title>Trending — The Living Ranking | PUNICODEX</title>
<meta name="description" content="The most visited temples and pages of the Unicode Pantheon, ranked live from PuniCodex first-party analytics. No cookies sold, no trackers — just counts.">
<link rel="canonical" href="https://punicodex.com/trending/">
<link rel="icon" type="image/svg+xml" href="/assets/brand/02-favicons/favicon.svg">
<link rel="icon" href="/assets/brand/02-favicons/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/assets/brand/02-favicons/apple-touch-icon.png">
<link rel="mask-icon" href="/assets/brand/02-favicons/mask-icon.svg" color="#D4AF37">
<link rel="manifest" href="/assets/brand/06-code/site.webmanifest">
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<link rel="stylesheet" href="/css/main.css?v=perf23">
<link rel="stylesheet" href="/css/pc-fx.css?v=1">
<style>
.trend-hero{text-align:center;padding:5.5rem 1rem 2rem}
.trend-hero .pc-fx-stage{margin:0 auto 1.5rem}
.trend-hero h1{font-size:2.4rem;margin:.4rem 0 .6rem}
.trend-hero .tag{max-width:64ch;margin:0 auto;color:var(--text-dim,#9a948a)}
.trend-live{display:inline-flex;align-items:center;gap:.45rem;font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;border:1px solid rgba(212,175,55,.4);border-radius:999px;padding:.3rem .9rem;color:#d4af37;margin-bottom:1rem}
.trend-live .dot{width:7px;height:7px;border-radius:50%;background:#d4af37}
@media (prefers-reduced-motion: no-preference){.trend-live .dot{animation:trendPulse 2s ease-in-out infinite}}
@keyframes trendPulse{0%,100%{opacity:1}50%{opacity:.35}}
.trend-wrap{max-width:1100px;margin:0 auto;padding:1rem 1.25rem 4rem}
.trend-controls{display:flex;gap:.5rem;justify-content:center;margin-bottom:2rem;flex-wrap:wrap}
.trend-btn{background:#121216;border:1px solid rgba(212,175,55,.25);color:#b9b3a8;border-radius:999px;padding:.4rem 1.1rem;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;font-family:inherit}
.trend-btn.active{color:#0a0a0c;background:#d4af37;border-color:#d4af37}
.trend-grid{display:grid;grid-template-columns:1fr;gap:.6rem}
.trend-row{display:grid;grid-template-columns:3rem 3.4rem 1fr auto;align-items:center;gap:1rem;background:#121216;border:1px solid rgba(212,175,55,.14);border-radius:12px;padding:.7rem 1rem;text-decoration:none;color:inherit;transition:border-color .2s}
.trend-row:hover{border-color:rgba(212,175,55,.5)}
.trend-rank{font-family:'Cinzel',serif;font-size:1.3rem;color:#d4af37;text-align:right;opacity:.85}
.trend-row:nth-child(1) .trend-rank{font-size:1.8rem;opacity:1}
.trend-mascot{width:3.4rem;height:3.4rem;border-radius:50%;object-fit:cover;border:1px solid rgba(212,175,55,.35);background:#0a0a0c}
.trend-name{font-family:'Cinzel',serif;font-size:1.05rem;color:#e8e4dc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.trend-sub{font-size:.74rem;color:#8a8577;letter-spacing:.08em;text-transform:uppercase;margin-top:.15rem}
.trend-meta{display:flex;flex-direction:column;min-width:0;justify-content:center}
.trend-views{text-align:right}
.trend-views b{display:block;font-size:1.1rem;color:#d4af37;font-weight:600}
.trend-views span{font-size:.68rem;color:#8a8577;letter-spacing:.1em;text-transform:uppercase}
.trend-section-title{font-family:'Cinzel',serif;color:#d4af37;font-size:1.3rem;margin:2.5rem 0 1rem;text-align:center}
.trend-empty{text-align:center;color:#9a948a;padding:3rem 1rem;border:1px dashed rgba(212,175,55,.25);border-radius:12px;max-width:640px;margin:0 auto}
.trend-note{text-align:center;color:#6a6659;font-size:.74rem;margin-top:2.5rem;letter-spacing:.04em}
.trend-note b{color:#9a948a;font-weight:600}
@media(max-width:640px){.trend-row{grid-template-columns:2.2rem 2.8rem 1fr auto;gap:.6rem}.trend-mascot{width:2.8rem;height:2.8rem}.trend-hero{padding-top:4rem}}
</style>
<!-- PUNICODEX-HERALD-BEACON-START -->
<link rel="stylesheet" href="/css/herald-beacon.css?v=1" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/css/herald-beacon.css?v=1"></noscript>
<script src="/js/herald-beacon.js?v=1" defer></script>
<!-- PUNICODEX-HERALD-BEACON-END -->
<!-- PUNICODEX-COOKIE-CONSENT-START -->
<link rel="stylesheet" href="/css/cookie-consent.css?v=1" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/css/cookie-consent.css?v=1"></noscript>
<script src="/js/cookie-consent.js?v=1" defer></script>
<!-- PUNICODEX-COOKIE-CONSENT-END -->
</head>
<body>
    <!-- Navigation (canonical — built by scripts/sync-desktop-nav.js) -->
    ${fullNavHtml('/trending/')}

    <!-- Mobile Menu (canonical — built by scripts/sync-mobile-menu.js) -->
    ${menuForPage('/trending/')}

<div class="trend-hero">
  <div class="pc-fx-stage pc-fx-lens-stage" role="img" aria-label="The Lens — a golden lens ring focusing light into a single bright point">
    <canvas class="pc-fx-lens" aria-hidden="true"></canvas>
  </div>
  <span class="trend-live"><span class="dot" aria-hidden="true"></span> Live Ranking</span>
  <h1>THE LIVING PANTHEON</h1>
  <p class="tag">Which temples does the world actually visit? This board ranks the pantheon by real, first-party page views — our analytics in action, in public. Counts only: no trackers, no fingerprints, nothing per-visitor.</p>
</div>

<div class="trend-wrap">
  <div class="trend-controls" role="group" aria-label="Ranking period">
    <button class="trend-btn active" data-days="7">7 days</button>
    <button class="trend-btn" data-days="30">30 days</button>
  </div>

  <h2 class="trend-section-title">MOST VISITED TEMPLES</h2>
  <div class="trend-grid" id="temple-board" aria-live="polite"></div>

  <h2 class="trend-section-title">MOST VISITED PAGES</h2>
  <div class="trend-grid" id="page-board" aria-live="polite"></div>

  <h2 class="trend-section-title">VISITORS BY COUNTRY</h2>
  <div class="trend-grid" id="country-board" aria-live="polite"></div>

  <p class="trend-note" id="trend-note">First-party PuniCodex analytics · human views only · bots filtered · updated <b id="trend-updated">just now</b></p>
</div>

    <!-- Footer (canonical — built by scripts/sync-footer.js) -->
    ${footerHtml()}

<script src="/js/px-core.js?v=perf21" defer></script>
<script src="/js/pc-fx-core.js?v=2" defer></script>
<script src="/js/pc-fx-lens.js?v=1" defer></script>
<script>
window.TRENDING_REGISTRY = ${registryJson};
</script>
<script src="/js/trending.js?v=1" defer></script>
</body>
</html>
`;
}

const out = path.join(ROOT, 'trending', 'index.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
const next = render();
if (fs.existsSync(out) && fs.readFileSync(out, 'utf8') === next) {
  console.log('Trending page: unchanged.');
} else {
  writeFileWithRetry(out, next, 'utf8');
  console.log('Trending page: trending/index.html written.');
}
