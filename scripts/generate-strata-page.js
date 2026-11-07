#!/usr/bin/env node
/**
 * PuniCodex — STRATA page generator (/pantheon/origins/).
 *
 * Reads the canonical chronicle data/pantheon-strata.json + the lexicon and
 * writes pantheon/origins/index.html — a geological excavation through the
 * pantheons: the surface is today, scrolling down digs deeper and older,
 * bedrock is the Aboriginal Dreamtime (~65,000 years), the finale is the
 * core sample. All layer content is server-rendered for SEO; JS only adds
 * atmosphere (sediment canvas, reveals, depth rail).
 *
 * Canonical: data/pantheon-strata.json. Regenerate: npm run generate.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { LEXICON } = require('../type/js/lexicon.js');

const ROOT = path.join(__dirname, '..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pantheon-strata.json'), 'utf8'));
const OUT_DIR = path.join(ROOT, 'pantheon', 'origins');
const OUT = path.join(OUT_DIR, 'index.html');

const entryById = new Map(LEXICON.map((e) => [e.id, e]));
const pantheonPath = (p) => (p === 'greek-location' ? '/atlas/' : `/${p}/`);

// Syncretism fault-lines drawn between successive strata. Keyed by the
// younger layer's pantheon: the note explains how the world passed from the
// layer below to this one.
const FAULTS = {
  mesopotamian: 'Below the oldest writing, older memory: the flood, the first temple, the first king-list — Sumer did not begin the story, only filed it.',
  egyptian: 'Two rivers, two answers: where Mesopotamia heard the gods in storms, Egypt saw them in the sun\'s reliability.',
  sanskrit: 'The steppe carried a language family from the Pontic grasslands into the Indus world — and the hymns met gods already there.',
  hittite: 'Anatolia was a crossroads before it was an empire: Hattic earth-gods, Hurrian storm-gods, Mesopotamian scribes — one register.',
  canaanite: 'From Hatti\'s tablets to Ugarit\'s alphabet, the Levant compressed two thousand years of exchange into twenty-two letters.',
  phoenician: 'The alphabet went to sea. Canaanite gods rode Phoenician hulls to Carthage and beyond.',
  zoroastrian: 'On the Iranian plateau the old Indo-Iranian gods were re-sorted into a single choice: truth, or the lie.',
  greek: 'The Mycenaean tablets remember Zeus three centuries before Homer — Greece inherited its gods and invented the argument about them.',
  roman: 'Rome read the Greek catalogue and adopted it wholesale — interpretatio romana, the greatest syncretism engine of the ancient world.',
  celtic: 'As Rome rose, the Celtic world held the West — La Tène art threading older Hallstatt gods through new forms.',
  norse: 'The Germanic tribes kept the steppe inheritance longest: Týr\'s name is literally the word for "god" in a dozen languages.',
  baltic: 'Christian Europe\'s frontier ran through sacred oak groves — Lithuania was still pagan when Oxford was teaching theology.',
  slavic: 'East of the frontier, dvoeverie — dual faith — let the old gods live inside the new calendar.',
  buddhist: 'The wheel turned outward: a teaching from the Ganges walked the Silk Road and became Asia\'s common tongue of the sacred.',
  chinese: 'Shang kings scratched their questions to Dì into bone — China\'s writing and China\'s theology were born together.',
  taoist: 'Against the empire\'s bureaucracy of heaven, the Dàodéjīng proposed the unnameable — and then built its own immortals.',
  korean: 'The peninsula carried China\'s script and kept its shamans — the three-sages myth kept a third voice alive.',
  japanese: 'Buddhism arrived and Shinto answered by organizing its kami into a mirror of the Buddhist court — absorption, not defeat.',
  polynesian: 'The greatest dispersal in human history sailed a tenth of the planet\'s water with the pantheon in memory alone.',
  nahuatl: 'On obsidian foundations older than their name, the Mexica built the last great state cult of the Americas.',
  incan: 'The Andes stacked three thousand years of cult before the Inca wove them into one state religion of stone.',
  yoruba: 'The orisha crossed the Middle Passage in the minds of the enslaved — the deepest survival in this excavation.',
  mapuche: 'The land\'s own covenant: volcanoes as thunder-spirits, hills as treaty ground — a theology of place still defended.',
  'greek-location': 'The youngest stratum of all: not a people but a move — the map itself joining the pantheon. This is where PuniCodex\'s work begins.'
};

// Material → texture class (CSS defined below). Colours keep the gold-on-void
// house register while letting each stratum carry its substance.
const MATERIAL_CLASS = {
  ochre: 'stx-tex-ochre',
  silt: 'stx-tex-silt',
  sandstone: 'stx-tex-sandstone',
  mantra: 'stx-tex-mantra',
  basalt: 'stx-tex-basalt',
  clay: 'stx-tex-clay',
  cedar: 'stx-tex-cedar',
  limestone: 'stx-tex-limestone',
  marble: 'stx-tex-marble',
  travertine: 'stx-tex-travertine',
  gold: 'stx-tex-gold',
  bog: 'stx-tex-bog',
  amber: 'stx-tex-amber',
  wood: 'stx-tex-wood',
  bronze: 'stx-tex-bronze',
  bone: 'stx-tex-bone',
  granite: 'stx-tex-granite',
  iron: 'stx-tex-iron',
  paper: 'stx-tex-paper',
  cypress: 'stx-tex-cypress',
  whalebone: 'stx-tex-whalebone',
  obsidian: 'stx-tex-obsidian',
  andesite: 'stx-tex-andesite',
  laterite: 'stx-tex-laterite',
  volcanic: 'stx-tex-volcanic',
  silver: 'stx-tex-silver',
  seaworn: 'stx-tex-seaworn',
};

function materialKey(material) {
  const m = material.toLowerCase();
  if (m.includes('ochre')) return 'ochre';
  if (m.includes('silt') || m.includes('tablet') || m.includes('clay')) return 'clay';
  if (m.includes('sandstone')) return 'sandstone';
  if (m.includes('mantra')) return 'mantra';
  if (m.includes('basalt') || m.includes('relief')) return 'basalt';
  if (m.includes('cedar') || m.includes('purple')) return 'cedar';
  if (m.includes('limestone') || m.includes('fire temple')) return 'limestone';
  if (m.includes('marble') && m.includes('parian')) return 'marble';
  if (m.includes('travertine') || m.includes('bronze') && m.includes('rome')) return 'travertine';
  if (m.includes('marble') && m.includes('sea')) return 'seaworn';
  if (m.includes('marble')) return 'marble';
  if (m.includes('torc') || m.includes('bog-oak') || m.includes('bog iron')) return 'bog';
  if (m.includes('amber') || m.includes('oak')) return 'amber';
  if (m.includes('carved wood') || m.includes('idol')) return 'wood';
  if (m.includes('gilt bronze') || m.includes('bronze') && m.includes('mirror')) return 'bronze';
  if (m.includes('oracle bone') || m.includes('bone')) return 'bone';
  if (m.includes('granite')) return 'granite';
  if (m.includes('cinnabar') || m.includes('talisman')) return 'paper';
  if (m.includes('white paper')) return 'paper';
  if (m.includes('cypress') || m.includes('mirror-bright')) return 'cypress';
  if (m.includes('whalebone') || m.includes('volcanic glass')) return 'whalebone';
  if (m.includes('obsidian') || m.includes('featherwork')) return 'obsidian';
  if (m.includes('andesite') || m.includes('masonry')) return 'andesite';
  if (m.includes('laterite') || m.includes('brass')) return 'laterite';
  if (m.includes('volcanic stone') || m.includes('silver') && m.includes('mapuche')) return 'volcanic';
  if (m.includes('silver')) return 'silver';
  return 'granite';
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function chip(id) {
  const e = entryById.get(id);
  if (!e) return '';
  return `<a class="stx-chip" href="/sites/${e.id}/" title="${esc(e.domain)}">${esc(e.unicode)}</a>`;
}

// Layers render newest-first (surface → bedrock): reverse the dataset order.
const layers = [...DATA.layers].sort((a, b) => b.order - a.order);

function layerScene(l, idx) {
  const tex = MATERIAL_CLASS[materialKey(l.material)] || 'stx-tex-granite';
  const num = String(l.order).padStart(2, '0');
  const depth = l.order === 1 ? 'bedrock' : `stratum ${num}`;
  const beings = l.beings.map(chip).join('');
  const survivals = l.survivals.map((s) => `<li>${esc(s)}</li>`).join('');
  const fault = FAULTS[l.pantheon] ? `<p class="stx-fault"><span class="stx-fault-line" aria-hidden="true"></span>${esc(FAULTS[l.pantheon])}</p>` : '';
  return `
<section class="stx-stratum ${tex}" id="stratum-${l.order}" data-order="${l.order}">
  <div class="stx-stratum-inner">
    <header class="stx-stratum-head">
      <span class="stx-depth-mark" aria-hidden="true">−${num}</span>
      <p class="stx-kicker">${depth} · ${esc(l.eraLabel)}</p>
      <h2 class="stx-name">${esc(l.name)}</h2>
      <p class="stx-attest">${esc(l.attestation)}</p>
    </header>
    <div class="stx-facts">
      <p><span>Region</span>${esc(l.region)}</p>
      <p><span>Tongue</span>${esc(l.languageFamily)}</p>
      <p><span>Script</span>${esc(l.scriptNote)}</p>
      <p><span>Substance</span>${esc(l.material)}</p>
    </div>
    <p class="stx-summary">${esc(l.summary)}</p>
    ${beings ? `<div class="stx-beings"><p class="stx-beings-label">Enter their temples</p><div class="stx-chips">${beings}</div></div>` : ''}
    ${survivals ? `<div class="stx-survivals"><p class="stx-beings-label">What survived</p><ul>${survivals}</ul></div>` : ''}
    <a class="stx-pantheon-link" href="${pantheonPath(l.pantheon)}">Open the ${esc(l.name)} pantheon →</a>
  </div>
  ${fault}
</section>`;
}

const scenes = layers.map(layerScene).join('\n');

const railDots = [
  `<button class="stx-rail-dot" data-goto="surface" aria-label="The surface — today"><span>◈</span></button>`,
  ...layers.map(
    (l) =>
      `<button class="stx-rail-dot" data-goto="stratum-${l.order}" aria-label="${esc(l.name)}"><span>${String(l.order).padStart(2, '0')}</span></button>`
  ),
  `<button class="stx-rail-dot" data-goto="core" aria-label="The core"><span>◆</span></button>`,
].join('\n');

const coreBands = [...DATA.layers]
  .sort((a, b) => b.order - a.order)
  .map((l) => {
    const tex = MATERIAL_CLASS[materialKey(l.material)] || 'stx-tex-granite';
    return `<button class="stx-core-band ${tex}" data-goto="stratum-${l.order}" title="${esc(l.name)}"><span>${String(l.order).padStart(2, '0')} · ${esc(l.name)}</span></button>`;
  })
  .join('\n');

const jsonld = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'STRATA — The Deep History of the Pantheons',
  url: 'https://punicodex.com/pantheon/origins/',
  description: DATA.subtitle,
  isPartOf: { '@type': 'WebSite', name: 'PuniCodex', url: 'https://punicodex.com/' },
  about: DATA.layers.map((l) => ({ '@type': 'Thing', name: l.name, alternateName: l.eraLabel })),
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#050505">
<title>STRATA — The Deep History of the Pantheons | PuniCodex</title>
<meta name="description" content="${esc(DATA.subtitle)}">
<link rel="canonical" href="https://punicodex.com/pantheon/origins/">
<meta property="og:type" content="website">
<meta property="og:title" content="STRATA — The Deep History of the Pantheons">
<meta property="og:description" content="${esc(DATA.subtitle)}">
<meta property="og:url" content="https://punicodex.com/pantheon/origins/">
<meta property="og:image" content="https://punicodex.com/assets/images/og-default.png">
<meta property="og:site_name" content="PuniCodex">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/assets/brand/02-favicons/favicon.svg">
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<style>
:root{--gold:#d4af37;--gold-dim:rgba(212,175,55,.35);--ivory:#f5f1e6;--dim:#b8b2a2;--void:#050505;--line:rgba(245,241,230,.12)}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--void);color:var(--ivory);font-family:'Cormorant Garamond',Georgia,serif;overflow-x:hidden}
#stx-fx{position:fixed;inset:0;z-index:0;pointer-events:none}
.stx-exit{position:fixed;top:1.1rem;left:1.25rem;z-index:50;opacity:.85;transition:opacity .25s}
.stx-exit:hover{opacity:1}
.stx-exit img{display:block;height:16px;width:auto}
.stx-rail{position:fixed;right:.8rem;top:50%;transform:translateY(-50%);z-index:40;display:flex;flex-direction:column;gap:3px;max-height:82vh;overflow-y:auto;scrollbar-width:none;padding:.3rem;background:rgba(5,5,5,.55);border:1px solid var(--line);border-radius:999px;backdrop-filter:blur(6px)}
.stx-rail::-webkit-scrollbar{display:none}
.stx-rail-dot{appearance:none;border:0;background:transparent;cursor:pointer;padding:2px}
.stx-rail-dot span{display:flex;align-items:center;justify-content:center;width:1.35rem;height:1.35rem;border-radius:50%;font-family:'Montserrat',sans-serif;font-size:.5rem;letter-spacing:.02em;color:var(--dim);border:1px solid transparent;transition:all .2s}
.stx-rail-dot:hover span{color:var(--ivory)}
.stx-rail-dot.active span{color:var(--void);background:var(--gold);font-weight:700}
.stx-stage{position:relative;z-index:1}
.stx-surface{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6rem 1.5rem 8rem;position:relative;background:radial-gradient(ellipse 120% 60% at 50% -10%,rgba(212,175,55,.14),transparent 60%),var(--void)}
.stx-surface-kicker{font-family:'Montserrat',sans-serif;font-size:.72rem;letter-spacing:.42em;text-transform:uppercase;color:var(--gold)}
.stx-surface h1{font-size:clamp(3rem,9vw,7rem);letter-spacing:.18em;margin:.6rem 0 1rem;font-weight:600}
.stx-surface-sub{max-width:62ch;color:var(--dim);font-size:clamp(1rem,1.6vw,1.2rem);line-height:1.7}
.stx-dig{margin-top:2.6rem;display:inline-flex;flex-direction:column;align-items:center;gap:.7rem;color:var(--gold);font-family:'Montserrat',sans-serif;font-size:.7rem;letter-spacing:.35em;text-transform:uppercase}
.stx-dig-shaft{width:1px;height:64px;background:linear-gradient(var(--gold),transparent);animation:stxSink 2.2s ease-in-out infinite}
@keyframes stxSink{0%,100%{transform:scaleY(.4);opacity:.4}50%{transform:scaleY(1);opacity:1}}
.stx-stratum{position:relative;padding:7rem 1.5rem 5rem;border-top:1px solid var(--line)}
.stx-stratum::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,transparent 0 46px,rgba(212,175,55,.028) 46px 48px);pointer-events:none}
.stx-stratum-inner{max-width:62rem;margin:0 auto;position:relative}
.stx-depth-mark{position:absolute;left:-.2rem;top:-4.6rem;font-size:clamp(3.4rem,7vw,5.6rem);font-weight:700;color:transparent;-webkit-text-stroke:1px var(--gold-dim);letter-spacing:.05em;font-family:'Montserrat',sans-serif;user-select:none}
.stx-kicker{font-family:'Montserrat',sans-serif;font-size:.68rem;letter-spacing:.34em;text-transform:uppercase;color:var(--gold);margin-bottom:.8rem}
.stx-name{font-size:clamp(2.1rem,5vw,3.6rem);line-height:1.05;margin-bottom:1.1rem;font-weight:600}
.stx-attest{color:var(--dim);font-style:italic;max-width:70ch;line-height:1.65;margin-bottom:1.6rem}
.stx-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.6rem 1.4rem;margin-bottom:1.6rem}
.stx-facts p{font-family:'Montserrat',sans-serif;font-size:.78rem;line-height:1.5;color:var(--ivory)}
.stx-facts span{display:block;font-size:.6rem;letter-spacing:.24em;text-transform:uppercase;color:var(--gold);margin-bottom:.25rem}
.stx-summary{font-size:clamp(1.05rem,1.7vw,1.25rem);line-height:1.75;max-width:66ch;margin-bottom:1.8rem}
.stx-beings-label{font-family:'Montserrat',sans-serif;font-size:.62rem;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);margin-bottom:.6rem}
.stx-chips{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1.6rem}
.stx-chip{font-family:'Montserrat',sans-serif;font-size:.8rem;color:var(--ivory);text-decoration:none;border:1px solid var(--gold-dim);border-radius:999px;padding:.42rem .95rem;transition:all .2s;background:rgba(212,175,55,.05)}
.stx-chip:hover{background:var(--gold);color:var(--void)}
.stx-survivals ul{list-style:none;display:grid;gap:.45rem;margin-bottom:1.8rem}
.stx-survivals li{color:var(--dim);line-height:1.6;padding-left:1.3rem;position:relative}
.stx-survivals li::before{content:"—";position:absolute;left:0;color:var(--gold)}
.stx-pantheon-link{display:inline-block;font-family:'Montserrat',sans-serif;font-size:.74rem;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);text-decoration:none;border-bottom:1px solid var(--gold-dim);padding-bottom:.3rem;transition:border-color .2s}
.stx-pantheon-link:hover{border-color:var(--gold)}
.stx-fault{max-width:62rem;margin:3.5rem auto 0;position:relative;padding-top:1.2rem;color:var(--dim);font-style:italic;font-size:.95rem;line-height:1.6}
.stx-fault-line{display:block;width:100%;height:1px;background:linear-gradient(90deg,transparent,var(--gold-dim),transparent);margin-bottom:.9rem}
/* stratum substances */
.stx-tex-ochre{background:linear-gradient(180deg,rgba(120,60,20,.12),rgba(60,28,10,.22))}
.stx-tex-clay{background:linear-gradient(180deg,rgba(140,90,60,.1),rgba(90,50,30,.18))}
.stx-tex-sandstone{background:linear-gradient(180deg,rgba(190,160,100,.09),rgba(120,95,50,.16))}
.stx-tex-mantra{background:linear-gradient(180deg,rgba(150,40,40,.09),rgba(80,20,20,.15))}
.stx-tex-basalt{background:linear-gradient(180deg,rgba(70,70,80,.16),rgba(30,30,38,.3))}
.stx-tex-cedar{background:linear-gradient(180deg,rgba(120,60,110,.1),rgba(70,30,70,.18))}
.stx-tex-limestone{background:linear-gradient(180deg,rgba(200,190,160,.08),rgba(130,120,95,.15))}
.stx-tex-marble{background:linear-gradient(180deg,rgba(220,220,215,.07),rgba(150,150,150,.13))}
.stx-tex-travertine{background:linear-gradient(180deg,rgba(210,180,140,.08),rgba(140,110,70,.15))}
.stx-tex-gold,.stx-tex-bronze{background:linear-gradient(180deg,rgba(212,175,55,.1),rgba(120,90,20,.16))}
.stx-tex-bog,.stx-tex-amber{background:linear-gradient(180deg,rgba(90,70,20,.14),rgba(50,38,10,.24))}
.stx-tex-wood{background:linear-gradient(180deg,rgba(110,70,40,.12),rgba(60,35,18,.22))}
.stx-tex-bone,.stx-tex-cypress{background:linear-gradient(180deg,rgba(215,205,180,.06),rgba(140,130,105,.12))}
.stx-tex-granite,.stx-tex-andesite{background:linear-gradient(180deg,rgba(90,90,95,.12),rgba(45,45,50,.24))}
.stx-tex-iron,.stx-tex-volcanic{background:linear-gradient(180deg,rgba(130,50,35,.1),rgba(70,25,18,.2))}
.stx-tex-paper{background:linear-gradient(180deg,rgba(200,60,50,.07),rgba(120,30,25,.13))}
.stx-tex-whalebone,.stx-tex-silver{background:linear-gradient(180deg,rgba(170,180,190,.07),rgba(100,108,120,.13))}
.stx-tex-obsidian{background:linear-gradient(180deg,rgba(30,25,45,.3),rgba(12,10,22,.5))}
.stx-tex-laterite{background:linear-gradient(180deg,rgba(150,60,30,.12),rgba(90,35,18,.22))}
.stx-tex-seaworn{background:linear-gradient(180deg,rgba(90,120,125,.08),rgba(40,70,75,.16))}
.stx-core{min-height:100vh;padding:8rem 1.5rem;text-align:center;position:relative;background:radial-gradient(ellipse 90% 55% at 50% 115%,rgba(212,175,55,.16),transparent 60%),var(--void)}
.stx-core h2{font-size:clamp(2rem,5vw,3.4rem);margin:.8rem 0 1.2rem}
.stx-core p{max-width:62ch;margin:0 auto 2.4rem;color:var(--dim);line-height:1.75}
.stx-core-sample{display:flex;flex-direction:column;max-width:46rem;margin:0 auto 2.6rem;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.stx-core-band{appearance:none;border:0;cursor:pointer;padding:.68rem 1rem;text-align:left;font-family:'Montserrat',sans-serif;font-size:.72rem;letter-spacing:.08em;color:var(--ivory);border-bottom:1px solid var(--line);transition:all .15s}
.stx-core-band:last-child{border-bottom:0}
.stx-core-band:hover{padding-left:1.5rem;color:var(--gold)}
.stx-core-cta{display:inline-flex;gap:1rem;flex-wrap:wrap;justify-content:center}
.stx-core-cta a{font-family:'Montserrat',sans-serif;font-size:.76rem;letter-spacing:.22em;text-transform:uppercase;text-decoration:none;padding:.85rem 1.7rem;border-radius:999px;border:1px solid var(--gold-dim);color:var(--gold);transition:all .2s}
.stx-core-cta a:hover{background:var(--gold);color:var(--void)}
.stx-reveal{opacity:0;transform:translateY(26px);transition:opacity .7s ease,transform .7s ease}
.stx-reveal.stx-in{opacity:1;transform:none}
@media (max-width:720px){
  .stx-rail{right:.35rem;gap:2px;padding:.2rem}
  .stx-rail-dot span{width:1.1rem;height:1.1rem;font-size:.44rem}
  .stx-stratum{padding:5.5rem 1.1rem 3.5rem}
  .stx-depth-mark{top:-3.4rem;font-size:2.8rem}
}
@media (prefers-reduced-motion:reduce){
  .stx-reveal{opacity:1;transform:none;transition:none}
  .stx-dig-shaft{animation:none}
  html{scroll-behavior:auto}
}
</style>
</head>
<body>
<canvas id="stx-fx" aria-hidden="true"></canvas>
<a class="stx-exit" href="/" aria-label="PuniCodex home"><img src="/assets/brand/01-logos/punicodex-wordmark-ivory-360.png" alt="PuniCodex" width="173" height="18"></a>
<nav class="stx-rail" aria-label="Strata">${railDots}</nav>
<main class="stx-stage">
<section class="stx-surface" id="surface">
  <p class="stx-surface-kicker reveal">The excavation begins at the surface</p>
  <h1 class="reveal">STRATA</h1>
  <p class="stx-surface-sub reveal">${esc(DATA.subtitle)}</p>
  <a class="stx-dig reveal" href="#stratum-25"><span>Begin the descent</span><span class="stx-dig-shaft" aria-hidden="true"></span></a>
</section>
${scenes}
<section class="stx-core" id="core">
  <p class="stx-surface-kicker reveal">The load-bearing truth</p>
  <h2 class="reveal">Every layer is still holding.</h2>
  <p class="reveal">Nothing in this excavation is dead weight. The days of the week are Norse. The alphabet is Phoenician. The flood is Sumerian. Yoga is Vedic, mindfulness is Buddhist, the obelisk is Egyptian, the map is Greek — and beneath them all, never once interrupted, the Dreamtime. The modern world is not built on the ruins of these strata. It is built of them. ${esc(DATA.note)}</p>
  <div class="stx-core-sample reveal" aria-label="The core sample — jump to any stratum">${coreBands}</div>
  <div class="stx-core-cta reveal">
    <a href="/pantheon/">Browse the full pantheon</a>
    <a href="/world/sacred/">Visit the Sacred Atlas</a>
  </div>
</section>
</main>
<script src="/js/newsletter.js" defer></script>
<script>
(function(){
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // reveals
  const io=new IntersectionObserver((es)=>{for(const e of es){if(e.isIntersecting){e.target.classList.add('stx-in');io.unobserve(e.target);}}},{threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>{el.classList.add('stx-reveal');io.observe(el);});
  // rail + goto
  const dots=[...document.querySelectorAll('.stx-rail-dot')];
  function goto(id){const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:reduce?'auto':'smooth'});}
  dots.forEach(d=>d.addEventListener('click',()=>goto(d.dataset.goto)));
  document.querySelectorAll('[data-goto]').forEach(el=>{if(el.classList.contains('stx-rail-dot'))return;el.addEventListener('click',()=>goto(el.dataset.goto));});
  // active rail dot
  const sections=[...document.querySelectorAll('[id^="stratum-"],#surface,#core')];
  const rail=new IntersectionObserver((es)=>{for(const e of es){if(e.isIntersecting){const id=e.target.id;dots.forEach(d=>d.classList.toggle('active',d.dataset.goto===id));}}},{rootMargin:'-45% 0px -45% 0px'});
  sections.forEach(s=>rail.observe(s));
  // sediment canvas — drifting gold motes rising toward the surface
  const cv=document.getElementById('stx-fx'),ctx=cv.getContext('2d');
  let W,H,parts=[];
  function resize(){W=cv.width=innerWidth;H=cv.height=innerHeight;}
  resize();addEventListener('resize',resize);
  const N=reduce?0:Math.min(90,Math.floor(innerWidth/14));
  for(let i=0;i<N;i++)parts.push({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.6+.4,s:Math.random()*.35+.08,a:Math.random()*.5+.15});
  let depthGlow=0;
  function frame(){
    ctx.clearRect(0,0,W,H);
    const max=document.documentElement.scrollHeight-innerHeight;
    const p=max>0?scrollY/max:0;
    depthGlow=p;
    for(const m of parts){
      m.y-=m.s;m.x+=Math.sin((m.y+m.r*100)*.008)*.18;
      if(m.y<-4){m.y=H+4;m.x=Math.random()*W;}
      const tw=m.a*(0.55+0.45*Math.sin(m.y*.02+m.r*40));
      ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,7);ctx.fillStyle='rgba(212,175,55,'+(tw*(0.5+depthGlow*.5)).toFixed(3)+')';ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  if(!reduce)requestAnimationFrame(frame);
})();
</script>
</body>
</html>
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`STRATA: wrote ${path.relative(ROOT, OUT)} (${layers.length} strata, ${html.length} bytes)`);
