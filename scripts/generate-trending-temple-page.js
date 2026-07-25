#!/usr/bin/env node
/**
 * PuniCodex — Trending temple drill-down generator.
 *
 * Builds /trending/temple/index.html — the per-temple analytics dashboard
 * opened from the trending board: views and attention time over the period,
 * countries, referrers, sub-pages, devices, and sister-temple navigation
 * habits. Data is joined client-side from /api/analytics/temple/ against the
 * same baked temple registry as the board.
 *
 * Canonical chrome from the shared builders; idempotent (byte-stable).
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
const { fullNavHtml } = require('./sync-desktop-nav.js');
const { menuForPage } = require('./sync-mobile-menu.js');
const { footerHtml } = require('./sync-footer.js');
const { writeFileWithRetry } = require('./write-file-retry.js');

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
  const registryJson = JSON.stringify(templeRegistry()).replace(/<\//g, '<\\/');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<!-- PUNICODEX-ANALYTICS-START -->
<script src="/js/analytics-beacon.js" defer></script>
<!-- PUNICODEX-ANALYTICS-END -->

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="google" content="notranslate">
<meta name="robots" content="noindex">
<title>Temple Analytics — The Living Pantheon | PUNICODEX</title>
<meta name="description" content="Per-temple analytics from PuniCodex first-party data: visits over time, attention, regions, and navigation habits. Aggregates only.">
<link rel="canonical" href="https://punicodex.com/trending/temple/">
<link rel="icon" type="image/svg+xml" href="/assets/brand/02-favicons/favicon.svg">
<link rel="icon" href="/assets/brand/02-favicons/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/assets/brand/02-favicons/apple-touch-icon.png">
<link rel="mask-icon" href="/assets/brand/02-favicons/mask-icon.svg" color="#D4AF37">
<link rel="manifest" href="/assets/brand/06-code/site.webmanifest">
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<link rel="stylesheet" href="/css/main.css?v=perf12">
<style>
.tt-wrap{max-width:1080px;margin:0 auto;padding:5.5rem 1.25rem 4rem}
.tt-back{color:#8a8577;font-size:.8rem;text-decoration:none;letter-spacing:.06em;text-transform:uppercase}
.tt-back:hover{color:#d4af37}
.tt-head{display:flex;gap:1.2rem;align-items:center;margin:1.2rem 0 2rem}
.tt-mascot{width:4.6rem;height:4.6rem;border-radius:50%;object-fit:cover;border:1px solid rgba(212,175,55,.4);background:#0a0a0c}
.tt-head h1{font-family:'Cinzel',serif;font-size:2rem;color:#e8e4dc;margin:0}
.tt-sub{font-size:.74rem;color:#8a8577;letter-spacing:.1em;text-transform:uppercase;margin-top:.2rem}
.tt-sub a{color:#d4af37;text-decoration:none}
.tt-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.8rem;margin-bottom:2rem}
.tt-card{background:#121216;border:1px solid rgba(212,175,55,.16);border-radius:12px;padding:1rem 1.1rem}
.tt-card b{display:block;font-size:1.5rem;color:#d4af37;font-weight:600}
.tt-card span{font-size:.68rem;color:#8a8577;letter-spacing:.1em;text-transform:uppercase}
.tt-controls{display:flex;gap:.5rem;margin-bottom:2rem}
.tt-btn{background:#121216;border:1px solid rgba(212,175,55,.25);color:#b9b3a8;border-radius:999px;padding:.35rem 1rem;font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;font-family:inherit}
.tt-btn.active{color:#0a0a0c;background:#d4af37;border-color:#d4af37}
.tt-panel{background:#121216;border:1px solid rgba(212,175,55,.14);border-radius:14px;padding:1.2rem 1.3rem;margin-bottom:1.6rem}
.tt-panel h2{font-family:'Cinzel',serif;color:#d4af37;font-size:1.05rem;margin:0 0 1rem}
.tt-grid2{display:grid;grid-template-columns:1fr 1fr;gap:1.6rem}
@media(max-width:760px){.tt-grid2{grid-template-columns:1fr}}
.tt-canvas{width:100%;height:220px;display:block}
.tt-table{width:100%;border-collapse:collapse;font-size:.85rem}
.tt-table td{padding:.4rem .3rem;border-bottom:1px solid rgba(212,175,55,.08);color:#c9c2ae}
.tt-table tr:last-child td{border-bottom:none}
.tt-table td.num{text-align:right;color:#d4af37;font-variant-numeric:tabular-nums}
.tt-bar{height:4px;border-radius:2px;background:#d4af37;opacity:.5;margin-top:.3rem}
.tt-chips{display:flex;flex-wrap:wrap;gap:.45rem}
.tt-chip{font-size:.76rem;padding:.3rem .8rem;border-radius:999px;border:1px solid rgba(212,175,55,.3);color:#d4af37;text-decoration:none}
.tt-chip:hover{border-color:#f0d878;color:#f0d878}
.tt-chip span{color:#8a8577;font-size:.68rem;margin-left:.35rem}
.tt-note{color:#6a6659;font-size:.72rem;text-align:center;margin-top:2.5rem;letter-spacing:.04em}
.tt-note b{color:#9a948a;font-weight:600}
.tt-empty{color:#9a948a;font-size:.85rem;padding:.6rem 0}
.tt-dev{display:flex;gap:.5rem;align-items:flex-end;height:110px;margin-top:.5rem}
.tt-devcol{flex:1;display:flex;flex-direction:column;align-items:center;gap:.4rem}
.tt-devbar{width:100%;max-width:70px;background:linear-gradient(180deg,#d4af37,#8a6d1f);border-radius:4px 4px 0 0}
.tt-devlab{font-size:.68rem;color:#8a8577;text-transform:uppercase;letter-spacing:.08em}
.tt-devval{font-size:.8rem;color:#d4af37}
</style>
<!-- PUNICODEX-HERALD-BEACON-START -->
<link rel="stylesheet" href="/css/herald-beacon.css?v=1">
<script src="/js/herald-beacon.js?v=1" defer></script>
<!-- PUNICODEX-HERALD-BEACON-END -->
<!-- PUNICODEX-COOKIE-CONSENT-START -->
<link rel="stylesheet" href="/css/cookie-consent.css?v=1">
<script src="/js/cookie-consent.js?v=1" defer></script>
<!-- PUNICODEX-COOKIE-CONSENT-END -->
</head>
<body>
    <!-- Navigation (canonical — built by scripts/sync-desktop-nav.js) -->
    ${fullNavHtml('/trending/')}

    <!-- Mobile Menu (canonical — built by scripts/sync-mobile-menu.js) -->
    ${menuForPage('/trending/')}

<div class="tt-wrap">
  <a class="tt-back" href="/trending/">&larr; The Living Pantheon</a>
  <div class="tt-head" id="tt-head"></div>
  <div class="tt-controls" role="group" aria-label="Analytics period">
    <button class="tt-btn" data-days="7">7 days</button>
    <button class="tt-btn active" data-days="30">30 days</button>
  </div>
  <div class="tt-cards" id="tt-cards"></div>

  <div class="tt-panel">
    <h2>VISITS OVER TIME</h2>
    <canvas class="tt-canvas" id="tt-views-chart" role="img" aria-label="Daily page views over the selected period"></canvas>
  </div>

  <div class="tt-panel">
    <h2>ATTENTION — TIME ON PAGE</h2>
    <canvas class="tt-canvas" id="tt-attention-chart" role="img" aria-label="Average visible time per day over the selected period"></canvas>
    <p class="tt-empty" id="tt-attention-empty" hidden>Attention data is collected only after consent is granted — days without consented sessions show zero.</p>
  </div>

  <div class="tt-grid2">
    <div class="tt-panel">
      <h2>REGIONS</h2>
      <div id="tt-countries"></div>
    </div>
    <div class="tt-panel">
      <h2>ARRIVING FROM</h2>
      <div id="tt-referrers"></div>
    </div>
  </div>

  <div class="tt-grid2">
    <div class="tt-panel">
      <h2>WITHIN THE TEMPLE</h2>
      <div id="tt-subpages"></div>
    </div>
    <div class="tt-panel">
      <h2>DEVICES</h2>
      <div class="tt-dev" id="tt-devices"></div>
    </div>
  </div>

  <div class="tt-panel">
    <h2>NAVIGATION HABITS — VISITORS ALSO ENTERED</h2>
    <div class="tt-chips" id="tt-also"></div>
  </div>

  <p class="tt-note" id="tt-note">First-party PuniCodex analytics · aggregates only · bots filtered · nothing per-visitor</p>
</div>

    <!-- Footer (canonical — built by scripts/sync-footer.js) -->
    ${footerHtml()}

<script src="/js/px-core.js?v=perf21" defer></script>
<script>
window.TRENDING_REGISTRY = ${registryJson};
</script>
<script src="/js/trending-temple.js?v=1" defer></script>
</body>
</html>
`;
}

const out = path.join(ROOT, 'trending', 'temple', 'index.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
const next = render();
if (fs.existsSync(out) && fs.readFileSync(out, 'utf8') === next) {
  console.log('Trending temple page: unchanged.');
} else {
  writeFileWithRetry(out, next, 'utf8');
  console.log('Trending temple page: trending/temple/index.html written.');
}
