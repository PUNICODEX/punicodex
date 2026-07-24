#!/usr/bin/env node
/**
 * PuniCodex — Pattern Atlas page generator.
 *
 * Builds /patterns/index.html — the universal industry-pattern experience:
 * the whole pattern graph in one map, a Find Your Pattern industry
 * autocomplete backed by /api/v1/industry-patterns/match/ (with a fully
 * client-side fallback against the embedded alias index), and the sector
 * atlas. Also builds /patterns/methodology/index.html — the public account
 * of how industries and temples are matched.
 *
 * Reads the generated graph (platform/api/industry-patterns.json, produced
 * by scripts/generate-industry-patterns.js earlier in the pipeline) and
 * embeds it, slimmed of byEntry and member ascii fields, as
 * window.PATTERN_GRAPH alongside a {id:{unicode,mascot,pantheon}} temple
 * registry baked from the canonical archetypes. The client engine is the
 * static asset /js/patterns-atlas.js (hand-maintained, like js/trending.js).
 *
 * Canonical chrome comes from the shared builders (same pattern as
 * scripts/generate-trending-page.js). Idempotent: byte-stable when inputs
 * are unchanged.
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

function loadGraph() {
  const raw = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'platform', 'api', 'industry-patterns.json'), 'utf8')
  );
  // Slim the graph for embedding: drop byEntry and member ascii fields.
  return {
    meta: raw.meta,
    sectors: raw.sectors,
    industries: raw.industries.map((g) => ({
      industry: g.industry,
      name: g.name,
      sector: g.sector,
      tagline: g.tagline,
      note: g.note,
      members: g.members.map((m) => ({
        id: m.id,
        unicode: m.unicode,
        pantheon: m.pantheon,
        pantheonLabel: m.pantheonLabel,
        domain: m.domain,
        weight: m.weight,
        why: m.why,
      })),
    })),
    aliases: raw.aliases || {},
  };
}

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

const FAVICON_CLUSTER = `<link rel="icon" type="image/svg+xml" href="/assets/brand/02-favicons/favicon.svg">
<link rel="icon" href="/assets/brand/02-favicons/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/assets/brand/02-favicons/apple-touch-icon.png">
<link rel="mask-icon" href="/assets/brand/02-favicons/mask-icon.svg" color="#D4AF37">
<link rel="manifest" href="/assets/brand/06-code/site.webmanifest">`;

const MARKER_BLOCKS = `<!-- PUNICODEX-HERALD-BEACON-START -->
<link rel="stylesheet" href="/css/herald-beacon.css?v=1">
<script src="/js/herald-beacon.js?v=1" defer></script>
<!-- PUNICODEX-HERALD-BEACON-END -->
<!-- PUNICODEX-COOKIE-CONSENT-START -->
<link rel="stylesheet" href="/css/cookie-consent.css?v=1">
<script src="/js/cookie-consent.js?v=1" defer></script>
<!-- PUNICODEX-COOKIE-CONSENT-END -->`;

const ATLAS_CSS = `
.pa-hero{text-align:center;padding:5.5rem 1rem 2rem}
.pa-hero .pc-fx-stage{margin:0 auto 1.5rem}
.pa-hero h1{font-size:2.4rem;margin:.4rem 0 .6rem}
.pa-hero .tag{max-width:64ch;margin:0 auto;color:var(--text-dim,#9a948a)}
.pa-badge{display:inline-flex;align-items:center;gap:.45rem;font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;border:1px solid rgba(212,175,55,.4);border-radius:999px;padding:.3rem .9rem;color:#d4af37;margin-bottom:1rem}
.pa-wrap{max-width:1200px;margin:0 auto;padding:1rem 1.25rem 4rem}
.pa-section-title{font-family:'Cinzel',serif;color:#d4af37;font-size:1.5rem;margin:3rem 0 .5rem;text-align:center}
.pa-section-sub{text-align:center;color:#8a8577;font-size:.85rem;max-width:60ch;margin:0 auto 2rem}
.pfp-box{max-width:760px;margin:0 auto 1rem;text-align:center}
.pfp-label{display:block;font-family:'Cinzel',serif;font-size:1.35rem;color:#e8e4dc;margin-bottom:1rem}
.pfp-inputwrap{position:relative}
.pfp-input{width:100%;background:#121216;border:1px solid rgba(212,175,55,.35);border-radius:14px;color:#e8e4dc;font-family:inherit;font-size:1.05rem;padding:1rem 1.25rem;outline:none}
.pfp-input:focus{border-color:#d4af37;box-shadow:0 0 0 3px rgba(212,175,55,.15)}
.pfp-dropdown{position:absolute;left:0;right:0;top:calc(100% + .4rem);background:#121216;border:1px solid rgba(212,175,55,.3);border-radius:12px;max-height:22rem;overflow-y:auto;display:none;text-align:left;z-index:60;box-shadow:0 18px 40px rgba(0,0,0,.55)}
.pfp-dropdown.visible{display:block}
.pfp-option{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:.6rem;align-items:center;padding:.7rem 1rem;cursor:pointer;border-bottom:1px solid rgba(212,175,55,.08)}
.pfp-option:last-child{border-bottom:none}
.pfp-option.active{background:rgba(212,175,55,.1)}
.pfp-dot{width:9px;height:9px;border-radius:50%;grid-row:1/3}
.pfp-opt-name{color:#e8e4dc;font-size:.95rem}
.pfp-opt-meta{color:#8a8577;font-size:.72rem;letter-spacing:.05em;text-transform:uppercase}
.pfp-empty{padding:1rem;color:#8a8577;font-size:.85rem}
.pfp-chips{margin-top:.9rem;font-size:.8rem;color:#8a8577}
.pfp-chip{background:none;border:1px solid rgba(212,175,55,.3);color:#d4af37;border-radius:999px;padding:.25rem .8rem;margin:.15rem;font-family:inherit;font-size:.78rem;cursor:pointer}
.pfp-chip:hover{border-color:#d4af37}
.pfp-panel{max-width:960px;margin:1.5rem auto 0}
.pfp-result{background:#121216;border:1px solid rgba(212,175,55,.2);border-top:3px solid var(--sector-color,#d4af37);border-radius:16px;padding:1.75rem}
.pfp-sector-tag{display:inline-block;color:#0a0a0c;font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;border-radius:999px;padding:.25rem .8rem;margin-bottom:.75rem}
.pfp-result-name{font-family:'Cinzel',serif;color:#e8e4dc;font-size:1.6rem;margin:.1rem 0 .3rem}
.pfp-result-tagline{color:#9a948a;margin:.1rem 0 .4rem}
.pfp-result-count{color:#6a6659;font-size:.75rem;letter-spacing:.1em;text-transform:uppercase}
.pfp-result-note{color:#b9b3a8;font-style:italic;border-left:2px solid var(--sector-color,#d4af37);padding-left:1rem;margin:1.25rem 0}
.pfp-cards,.pa-ind-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:.7rem}
.pt-card{display:grid;grid-template-columns:3.5rem 1fr;gap:.8rem;background:#0d0d10;border:1px solid rgba(212,175,55,.14);border-radius:12px;padding:.8rem;text-decoration:none;color:inherit;transition:border-color .2s;align-items:start}
.pt-card:hover{border-color:rgba(212,175,55,.5)}
.pt-mascot{width:3.5rem;height:3.5rem;border-radius:50%;object-fit:cover;border:1px solid rgba(212,175,55,.35);background:#0a0a0c}
.pt-body{display:flex;flex-direction:column;gap:.2rem;min-width:0}
.pt-line{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
.pt-name{font-family:'Cinzel',serif;color:#e8e4dc;font-size:1rem}
.pt-badge{font-size:.62rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border-radius:999px;padding:.12rem .55rem}
.pt-badge.primary{color:#0a0a0c;background:#d4af37}
.pt-badge.resonant{color:#d4af37;border:1px solid rgba(212,175,55,.45)}
.pt-pantheon{color:#8a8577;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase}
.pt-why{color:#9a948a;font-size:.8rem;line-height:1.45}
.pfp-result-method{margin-top:1.25rem;font-size:.8rem;color:#8a8577}
.pfp-result-method a{color:#d4af37}
.pa-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;max-width:820px;margin:2.5rem auto 0}
.pa-stat{background:#121216;border:1px solid rgba(212,175,55,.16);border-radius:12px;text-align:center;padding:1rem .5rem}
.pa-stat b{display:block;font-family:'Cinzel',serif;font-size:1.7rem;color:#d4af37}
.pa-stat span{font-size:.7rem;color:#8a8577;letter-spacing:.12em;text-transform:uppercase}
.pa-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;align-items:start}
.pa-sector{background:#121216;border:1px solid rgba(212,175,55,.14);border-radius:14px;padding:1.1rem}
.pa-sector-name{font-family:'Cinzel',serif;color:var(--sector-color,#d4af37);font-size:1.05rem;margin:0 0 .3rem}
.pa-sector-stats{display:block;color:#8a8577;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;margin-bottom:.55rem}
.pa-strip{display:block;width:100%;height:4px;border-radius:2px;overflow:hidden;margin-bottom:.9rem;background:rgba(255,255,255,.06)}
.pa-ind{border-top:1px solid rgba(212,175,55,.1)}
.pa-ind-toggle{display:block;width:100%;background:none;border:none;font-family:inherit;text-align:left;padding:.7rem .2rem;cursor:pointer;color:inherit}
.pa-ind-name{display:block;color:#e8e4dc;font-size:.92rem}
.pa-ind-toggle:hover .pa-ind-name{color:var(--sector-color,#d4af37)}
.pa-ind-toggle::after{content:'+';float:right;color:#8a8577;font-size:1rem;line-height:1.1}
.pa-ind-toggle[aria-expanded='true']::after{content:'–'}
.pa-ind-tagline{display:block;color:#8a8577;font-size:.74rem;margin-top:.1rem}
.pa-ind-count{display:block;color:#6a6659;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;margin-top:.25rem}
.pa-ind-panel{padding:.3rem 0 .9rem}
.pa-ind-cards{grid-template-columns:1fr}
.pa-method{max-width:760px;margin:3.5rem auto 0;text-align:center;background:#121216;border:1px solid rgba(212,175,55,.2);border-radius:16px;padding:2rem 1.5rem}
.pa-method h2{font-family:'Cinzel',serif;color:#d4af37;font-size:1.4rem;margin:0 0 .7rem}
.pa-method p{color:#9a948a;max-width:58ch;margin:0 auto 1.2rem}
.pa-method-link{display:inline-block;color:#0a0a0c;background:#d4af37;border-radius:999px;padding:.55rem 1.6rem;text-decoration:none;font-size:.82rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
@media(max-width:1100px){.pa-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:700px){.pa-grid{grid-template-columns:1fr}.pa-stats{grid-template-columns:repeat(2,1fr)}.pa-hero{padding-top:4rem}.pa-hero h1{font-size:1.9rem}}
@media(prefers-reduced-motion:reduce){.pt-card,.pfp-input{transition:none!important}}
`;

function atlasSectorsHtml(graph) {
  return graph.sectors
    .map((s) => {
      const inds = graph.industries
        .filter((g) => g.sector === s.id)
        .sort((a, b) => b.members.length - a.members.length || a.name.localeCompare(b.name));
      const primary = inds.reduce((n, g) => n + g.members.filter((m) => m.weight === 2).length, 0);
      const resonant = inds.reduce((n, g) => n + g.members.filter((m) => m.weight === 1).length, 0);
      const total = primary + resonant || 1;
      const pW = Math.round((primary / total) * 1000) / 10;
      const list = inds
        .map((g) => {
          const p = g.members.filter((m) => m.weight === 2).length;
          return `      <div class="pa-ind">
        <button type="button" class="pa-ind-toggle" aria-expanded="false" aria-controls="pa-panel-${esc(g.industry)}" data-industry="${esc(g.industry)}">
          <span class="pa-ind-name">${esc(g.name)}</span>
          <span class="pa-ind-tagline">${esc(g.tagline)}</span>
          <span class="pa-ind-count">${g.members.length} temples · ${p} primary</span>
        </button>
        <div class="pa-ind-panel" id="pa-panel-${esc(g.industry)}" role="region" aria-label="${esc(g.name)} temples" hidden></div>
      </div>`;
        })
        .join('\n');
      return `    <section class="pa-sector" style="--sector-color:${esc(s.color)}">
      <header class="pa-sector-head">
        <h3 class="pa-sector-name">${esc(s.name)}</h3>
        <span class="pa-sector-stats">${inds.length} industries · ${primary} primary · ${resonant} resonant</span>
        <svg class="pa-strip" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect x="0" y="0" width="${pW}" height="4" fill="${esc(s.color)}"></rect><rect x="${pW}" y="0" width="${Math.round((100 - pW) * 10) / 10}" height="4" fill="${esc(s.color)}" opacity="0.3"></rect></svg>
      </header>
      <div class="pa-ind-list">
${list}
      </div>
    </section>`;
    })
    .join('\n');
}

function renderAtlas(graph, registry) {
  const graphJson = JSON.stringify(graph).replace(/<\//g, '<\\/');
  const registryJson = JSON.stringify(registry).replace(/<\//g, '<\\/');
  const chips = ['plumber', 'poet', 'entrepreneur', 'church', 'dentist', 'winemaker']
    .map((q) => `<button type="button" class="pfp-chip" data-q="${q}">${q}</button>`)
    .join(' ·\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<!-- PUNICODEX-ANALYTICS-START -->
<script src="/js/analytics-beacon.js" defer></script>
<!-- PUNICODEX-ANALYTICS-END -->

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="google" content="notranslate">
<title>The Pattern Atlas — Every Industry the Pantheon Answers To | PUNICODEX</title>
<meta name="description" content="The whole PuniCodex pattern graph in one map: ${graph.meta.industryCount} industries, ${graph.meta.sectorCount} sectors, ${graph.meta.entryCount} temples, and a ${graph.meta.aliasCount}-term alias vocabulary. Type your trade and find the temples that carry it.">
<link rel="canonical" href="https://punicodex.com/patterns/">
${FAVICON_CLUSTER}
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<link rel="stylesheet" href="/css/main.css?v=perf12">
<link rel="stylesheet" href="/css/pc-fx.css?v=1">
<style>${ATLAS_CSS}</style>
${MARKER_BLOCKS}
</head>
<body>
    <!-- Navigation (canonical — built by scripts/sync-desktop-nav.js) -->
    ${fullNavHtml('/patterns/')}

    <!-- Mobile Menu (canonical — built by scripts/sync-mobile-menu.js) -->
    ${menuForPage('/patterns/')}

<div class="pa-hero">
  <div class="pc-fx-stage pc-fx-lens-stage" role="img" aria-label="The Lens — a golden lens ring focusing light into a single bright point">
    <canvas class="pc-fx-lens" aria-hidden="true"></canvas>
  </div>
  <span class="pa-badge">The Full Pattern Graph</span>
  <h1>THE PATTERN ATLAS</h1>
  <p class="tag">Every industry the pantheon answers to, in one map. Type your trade and the atlas finds the temples that carry it — or browse all ${graph.meta.industryCount} industries below, sector by sector.</p>
</div>

<div class="pa-wrap">
  <div class="pfp-box">
    <label class="pfp-label" for="pfp-input">Find Your Pattern</label>
    <div class="pfp-inputwrap">
      <input type="text" id="pfp-input" class="pfp-input" placeholder="Type your trade — plumber, poet, founder, priest…" autocomplete="off" autocapitalize="off" spellcheck="false" role="combobox" aria-expanded="false" aria-controls="pfp-dropdown" aria-autocomplete="list">
      <div class="pfp-dropdown" id="pfp-dropdown" role="listbox" aria-label="Industry matches"></div>
    </div>
    <div class="pfp-chips">Try:
    ${chips}</div>
  </div>
  <div class="pfp-panel" id="pfp-panel" aria-live="polite"></div>

  <div class="pa-stats">
    <div class="pa-stat"><b>${graph.meta.industryCount}</b><span>industries</span></div>
    <div class="pa-stat"><b>${graph.meta.sectorCount}</b><span>sectors</span></div>
    <div class="pa-stat"><b>${graph.meta.entryCount}</b><span>temples</span></div>
    <div class="pa-stat"><b>${graph.meta.aliasCount}</b><span>aliases</span></div>
  </div>

  <h2 class="pa-section-title">THE ATLAS</h2>
  <p class="pa-section-sub">Seven sectors, ${graph.meta.industryCount} industries, ${graph.meta.primaryCount} primary and ${graph.meta.resonantCount} resonant temple seats. Open an industry to meet its temples.</p>
  <div class="pa-grid">
${atlasSectorsHtml(graph)}
  </div>

  <section class="pa-method">
    <h2>Scrutiny, in Public</h2>
    <p>Every pairing on this page is argued line by line from canonical sources — weights, why-lines, and a curated alias vocabulary. The full method, including how to challenge a match, is published.</p>
    <a class="pa-method-link" href="/patterns/methodology/">Read the Methodology</a>
  </section>
</div>

    <!-- Footer (canonical — built by scripts/sync-footer.js) -->
    ${footerHtml()}

<script src="/js/px-core.js?v=perf21" defer></script>
<script src="/js/pc-fx-core.js?v=2" defer></script>
<script src="/js/pc-fx-lens.js?v=1" defer></script>
<script>
window.PATTERN_GRAPH = ${graphJson};
window.PATTERN_TEMPLES = ${registryJson};
</script>
<script src="/js/patterns-atlas.js?v=1" defer></script>
</body>
</html>
`;
}

function renderMethodology(graph) {
  const meta = graph.meta;
  const whyOf = (industryId, memberId) => {
    const g = graph.industries.find((x) => x.industry === industryId);
    const m = g && g.members.find((x) => x.id === memberId);
    if (!m) throw new Error(`methodology quote source missing: ${industryId}/${memberId}`);
    return m;
  };
  const helios = whyOf('solar-energy', 'helios');
  const ganga = whyOf('water-utilities', 'ganga');
  const mazu = whyOf('faith', 'mazu');
  const moses = whyOf('faith', 'moses');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<!-- PUNICODEX-ANALYTICS-START -->
<script src="/js/analytics-beacon.js" defer></script>
<!-- PUNICODEX-ANALYTICS-END -->

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="google" content="notranslate">
<title>How the Pattern Atlas Is Made — Methodology | PUNICODEX</title>
<meta name="description" content="The public methodology of the PuniCodex Pattern Atlas: how 271 flagship temples are matched to 53 industries, how fragment professions map onto categories, and how to challenge a match.">
<link rel="canonical" href="https://punicodex.com/patterns/methodology/">
<meta property="og:title" content="How the Pattern Atlas Is Made — PuniCodex Methodology">
<meta property="og:description" content="The discipline, the alias layer, the editorial rules, and the corrections channel behind the PuniCodex pattern graph.">
<meta property="og:image" content="https://punicodex.com/assets/brand/05-social/punicodex-og-image-1200x630.png">
<meta property="og:url" content="https://punicodex.com/patterns/methodology/">
<meta property="og:type" content="article">
<meta property="og:site_name" content="PuniCodex">
<meta name="twitter:card" content="summary_large_image">
${FAVICON_CLUSTER}
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<link rel="stylesheet" href="/css/main.css?v=perf12">
<link rel="stylesheet" href="/css/codex.css?v=perf9">
<link rel="stylesheet" href="/css/punicodex-tokens.css">
<link rel="stylesheet" href="/css/brand-overrides.css">
${MARKER_BLOCKS}
</head>
<body>
    <!-- Navigation (canonical — built by scripts/sync-desktop-nav.js) -->
    ${fullNavHtml('/patterns/')}

    <!-- Mobile Menu (canonical — built by scripts/sync-mobile-menu.js) -->
    ${menuForPage('/patterns/')}

    <main class="page-codex codex-article">
        <header class="codex-article-hero">
            <div class="container">
                <div class="codex-article-meta">
                    <span class="codex-article-category">Methodology</span>
                    <span class="codex-article-date">July 2026</span>
                    <span class="codex-article-readtime">9 min read</span>
                </div>
                <h1 class="codex-article-title display-md">How the Pattern Atlas Is Made</h1>
                <p class="codex-article-lead body-lg">The Pattern Atlas pairs ${meta.entryCount} flagship temples with ${meta.industryCount} modern industries. This paper is the public account of how those pairings are argued, how a typed trade like “plumber” or “church” finds its category, and how to challenge a match.</p>
            </div>
        </header>

        <article class="codex-article-body container">
            <p class="lead">Nothing in the Atlas is generated by a model and nothing is inferred from traffic. Every pairing is a hand-written line in a canonical source file, argued from the same scholarly data that builds the temples themselves. This is what that discipline looks like.</p>

            <h2>The Discipline</h2>
            <p>The canonical source of the pattern graph is a single file, <code>type/js/industry-patterns.js</code>, which declares ${meta.sectorCount} sectors and ${meta.industryCount} industries. Each industry assigns temples one of two weights. A <strong>primary</strong> pairing (weight 2) means the industry is a direct expression of the entry's core canonical domain. A <strong>resonant</strong> pairing (weight 1) means a strong secondary association — a namesake the modern industry has adopted, or a domain the entry shares without owning it.</p>
            <p>The difference is easiest to see in the data's own words. Under <em>Solar &amp; Renewable Energy</em>, <a href="/sites/helios/">Hēlios</a> sits primary: “${esc(helios.why)}” Under <em>Freshwater &amp; Hydrology</em>, <a href="/sites/ganga/">Gaṅgā</a> sits primary: “${esc(ganga.why)}” A pairing that cannot be justified from canonical data is excluded outright.</p>
            <p>The current graph holds ${meta.primaryCount} primary and ${meta.resonantCount} resonant seats across all ${meta.entryCount} built flagships — every flagship answers to at least three industries, and no temple may hold more than three primary seats in the whole map.</p>

            <h2>The Alias Layer</h2>
            <p>Industries are categories; sponsors think in trades. The bridge between the two is a second canonical file, <code>type/js/industry-aliases.js</code>: ${meta.aliasCount} curated terms — professions, shop names, and search fragments — each assigned to exactly one industry with its own direct/adjacent weight. This is the vocabulary behind the Find Your Pattern bar and the <code>/api/v1/industry-patterns/match</code> endpoint.</p>
            <p>The doctrine is precision over recall. A plumber is water infrastructure, so <code>plumber</code> resolves to Freshwater &amp; Hydrology, whose why-lines already speak of sanitation and hydraulic works. A term with no honest home — <code>electrician</code>, today — is deliberately absent rather than force-fitted into an energy category that means generation, not wiring.</p>
            <p>When someone types <code>church</code>, the query resolves to <em>Faith &amp; Spiritual Organizations</em> — and the temples that answer are living ones: <a href="/sites/mazu/">Māzǔ</a>, “${esc(mazu.why)}”, and <a href="/sites/moses/">Mōšeh</a>, “${esc(moses.why)}”</p>

            <h2>The Editorial Rules</h2>
            <p>The map is defended by contract tests that run in CI on every change, so the rules below are enforced, not aspirational:</p>
            <ul>
                <li><strong>Every industry needs at least two temples and at least one primary seat.</strong> An industry that cannot field a real pair of patrons does not ship.</li>
                <li><strong>Every assignment carries a why-line of at least twenty characters</strong> that argues the resonance — “obvious” is not an argument.</li>
                <li><strong>Weights are only 1 or 2</strong>, and no temple may hold more than three primary seats across the whole map, which keeps “primary” meaningful.</li>
                <li><strong>Every built flagship answers to at least three industries</strong>, so no temple is a one-trick patron.</li>
                <li><strong>One alias, one home.</strong> A term may serve exactly one industry; ambiguous terms go to their best fit or nowhere.</li>
            </ul>
            <p>Changes move through the same curator review as the lexicon itself, and the generated JSON is byte-checked against the canonical sources in the divergence gate.</p>

            <h2>Data &amp; API</h2>
            <p>The whole graph is public, machine-readable, and versioned with the dataset. The full map with members and why-lines is at <a href="/api/v1/industry-patterns/"><code>/api/v1/industry-patterns/</code></a>; a directory view is at <code>/api/v1/industry-patterns/industries</code>; the alias matcher behind Find Your Pattern is at <code>/api/v1/industry-patterns/match/?q=</code>; and each temple's own profile is at <code>/api/v1/names/{id}/patterns</code>. Interactive documentation lives in the <a href="/api/v1/docs/">API portal</a>.</p>

            <h2>Corrections</h2>
            <p>A pairing is an argument, and arguments can be wrong. If a why-line overreaches, if a weight feels inverted, or if an industry is missing a temple the canon clearly supports, say so — every challenge is reviewed against the canonical sources by the same curators who wrote the map. The channel is <a href="/contact/">/contact/</a>; please name the industry, the temple, and the source that settles it.</p>

            <aside class="codex-article-cta">
                <a href="/patterns/" class="btn btn-primary"><span>Open the Pattern Atlas</span></a>
                <a href="/api/v1/docs/" class="btn btn-outline"><span>API Documentation</span></a>
            </aside>
        </article>
    </main>

    <!-- Footer (canonical — built by scripts/sync-footer.js) -->
    ${footerHtml()}

<script src="/js/px-core.js?v=perf21" defer></script>
</body>
</html>
`;
}

function writeIfChanged(rel, next) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (fs.existsSync(out) && fs.readFileSync(out, 'utf8') === next) {
    console.log(`Patterns pages: ${rel} unchanged.`);
  } else {
    writeFileWithRetry(out, next, 'utf8');
    console.log(`Patterns pages: ${rel} written.`);
  }
}

const graph = loadGraph();
const registry = templeRegistry();
writeIfChanged(path.join('patterns', 'index.html'), renderAtlas(graph, registry));
writeIfChanged(path.join('patterns', 'methodology', 'index.html'), renderMethodology(graph));
