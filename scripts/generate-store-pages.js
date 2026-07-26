#!/usr/bin/env node
/**
 * PuniCodex — Reliquary store page generator.
 *
 * Builds the three-tier static store from store/products.json:
 *   store/index.html                  — collections grid (one card per temple)
 *   store/{templeId}/index.html       — collection page (all pieces of a temple)
 *   store/{templeId}/{kind}/index.html — product page (variant/colour selection)
 *
 * Card imagery prefers Printful mockups (products.json `mockupImage`) and
 * falls back to the temple mascot while the mockup batch is in flight.
 * Idempotent: rewrites are byte-stable when inputs are unchanged.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CATALOG = require(path.join(ROOT, 'store', 'products.json'));
const { ARCHETYPES } = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
const LORE = require(path.join(ROOT, 'scripts', 'lore-catalog.json'));
// Canonical chrome builders — never fork the nav/menu/footer item lists.
const { fullNavHtml } = require('./sync-desktop-nav.js');
const { menuForPage } = require('./sync-mobile-menu.js');
const { footerHtml } = require('./sync-footer.js');

const KIND_ORDER = [
  'tee',
  'hoodie',
  'crewneck',
  'print',
  'canvas',
  'sticker',
  'pin',
  'mug',
  'tumbler',
  'tote',
  'phonecase',
  'cap',
  'notebook',
];

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (n) => `$${Number(n).toFixed(2)}`;

function collections() {
  const byTemple = new Map();
  for (const p of CATALOG.products) {
    const key = p.temple || 'punicodex';
    if (!byTemple.has(key)) byTemple.set(key, []);
    byTemple.get(key).push(p);
  }
  return byTemple;
}

function templeMeta(id) {
  if (id === 'punicodex') {
    return {
      id,
      name: 'PuniCodex',
      tagline: 'The House Collection · Wordmark, Emblem & Glyph',
      pantheon: 'House',
      mascotPath: '/assets/brand/01-logos/punicodex-emblem-gold.webp',
      url: '/',
    };
  }
  const a = ARCHETYPES.find((x) => x.id === id);
  const lore = LORE[id];
  return {
    id,
    name: a ? a.name : id,
    tagline: a ? a.tagline : '',
    pantheon: a ? a.pantheon : '',
    greek: a ? a.greek : '',
    mascotPath: a ? a.mascotPath : '',
    url: `/sites/${id}/`,
    rentalTier: a ? a.rentalTier : null,
    meditation: lore ? lore.extendedMeditation : null,
  };
}

function cardImage(p, meta) {
  return p.mockupImage || meta.mascotPath || p.image;
}

function priceRange(products) {
  const prices = products.map((p) => p.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  return lo === hi ? money(lo) : `${money(lo)} – ${money(hi)}`;
}

function kindLabel(kind) {
  return {
    tee: 'Temple Tee',
    hoodie: 'Hoodie',
    crewneck: 'Crewneck',
    print: 'Art Print',
    canvas: 'Canvas',
    sticker: 'Sticker Set',
    pin: 'Enamel Pin',
    mug: 'Mug',
    tumbler: 'Tumbler',
    tote: 'Tote',
    phonecase: 'Phone Case',
    cap: 'Cap',
    notebook: 'Notebook',
  }[kind] || kind;
}

// Split a Printful variant label into colour/size dimensions.
function parseVariants(product) {
  const labels = Object.keys(product.printfulVariants || {});
  const COLOR_WORDS = new Set([
    'white', 'black', 'camel', 'navy', 'red', 'royal', 'heather', 'charcoal',
    'grey', 'gray', 'glossy', 'clear', 'natural', 'forest', 'maroon', 'gold',
  ]);
  const colors = new Set();
  const sizes = new Set();
  for (const label of labels) {
    if (label.includes(' / ')) {
      const [c, s] = label.split(' / ');
      colors.add(c);
      sizes.add(s);
    } else if (COLOR_WORDS.has(label.toLowerCase())) {
      colors.add(label);
    } else {
      sizes.add(label);
    }
  }
  if (sizes.size === 0) sizes.add('One size');
  if (colors.size === 0 && labels.some((l) => !l.includes(' / ') && !sizes.has(l))) {
    // Single-token labels that are all sizes (e.g. S/M/L) — no colour dimension.
  }
  const hasColorDimension = labels.some((l) => l.includes(' / '));
  const SIZE_RANK = { XS: 0, S: 1, M: 2, L: 3, XL: 4, '2XL': 5, '3XL': 6, '4XL': 7, '5XL': 8, 'One size': 99 };
  const sizeList = [...sizes].sort((a, b) => {
    const ra = SIZE_RANK[a] ?? 50;
    const rb = SIZE_RANK[b] ?? 50;
    return ra !== rb ? ra - rb : String(a).localeCompare(String(b), 'en', { numeric: true });
  });
  return {
    labels,
    colors: [...colors].sort(),
    sizes: sizeList,
    hasColorDimension,
    labelFor: (color, size) => {
      if (color && labels.includes(`${color} / ${size}`)) return `${color} / ${size}`;
      if (color && labels.includes(color)) return color;
      if (labels.includes(size)) return size;
      return labels[0];
    },
  };
}

const BASE_CSS = `
:root{--obsidian:#0A0A0C;--gold:#D4AF37;--gold-bright:#F0D878;--ink:#E8E4DC;--dim:#9a948a;--line:rgba(212,175,55,.18);--card:#121216}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--obsidian);color:var(--ink);font-family:'Spectral',Georgia,serif;line-height:1.6}
h1,h2,h3,.display{font-family:'Cinzel',serif;color:var(--gold)}
a{color:var(--gold);text-decoration:none}
a:hover{color:var(--gold-bright)}
.wrap{max-width:1200px;margin:0 auto;padding:0 1.25rem}
.crumbs{font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);padding:1.25rem 0 0}
.crumbs a{color:var(--dim)}
.crumbs a:hover{color:var(--gold)}
.hero{display:grid;grid-template-columns:280px 1fr;gap:2.5rem;align-items:center;padding:2.5rem 0;border-bottom:1px solid var(--line)}
.hero img{width:100%;border-radius:14px;border:1px solid var(--line);background:#0e0e12}
.hero h1{font-size:2.2rem;margin:.2rem 0 .4rem}
.hero .tag{color:var(--dim);font-size:1.02rem;max-width:56ch}
.pill{display:inline-block;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;border:1px solid var(--line);border-radius:999px;padding:.22rem .7rem;color:var(--gold);margin-right:.4rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1.25rem;padding:2rem 0 4rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;transition:transform .25s ease,border-color .25s ease;display:block;color:var(--ink)}
.card:hover{transform:translateY(-4px);border-color:var(--gold);color:var(--ink)}
.card .imgbox{aspect-ratio:1;background:#0c0c10;overflow:hidden}
.card img{width:100%;height:100%;object-fit:cover;display:block}
.card .body{padding:.85rem .95rem 1rem}
.card h3{font-size:.98rem;color:var(--ink);font-family:'Spectral',Georgia,serif;margin:0 0 .15rem}
.card .sub{font-size:.74rem;color:var(--dim);letter-spacing:.06em;text-transform:uppercase}
.card .price{color:var(--gold);font-family:'Cinzel',serif;margin-top:.35rem;font-size:1.02rem}
.filters{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;padding:1.5rem 0 .5rem}
.filters input{background:#0e0e12;border:1px solid var(--line);border-radius:8px;color:var(--ink);padding:.55rem .9rem;font-size:.9rem;min-width:220px;font-family:inherit}
.fpill{border:1px solid var(--line);background:none;color:var(--dim);border-radius:999px;padding:.35rem .9rem;font-size:.78rem;letter-spacing:.06em;cursor:pointer;font-family:inherit}
.fpill.active,.fpill:hover{color:var(--gold);border-color:var(--gold)}
.pdp{display:grid;grid-template-columns:minmax(0,520px) 1fr;gap:3rem;padding:2.5rem 0 4rem}
.pdp .stage{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#0c0c10}
.pdp .stage img{width:100%;display:block}
.pdp h1{font-size:1.9rem;margin:.2rem 0 .5rem}
.pdp .price{font-family:'Cinzel',serif;font-size:1.6rem;color:var(--gold);margin:.4rem 0 1rem}
.opt-group{margin:1.2rem 0}
.opt-group .lbl{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);margin-bottom:.45rem}
.opts{display:flex;flex-wrap:wrap;gap:.45rem}
.opt{border:1px solid var(--line);background:none;color:var(--ink);border-radius:8px;padding:.45rem .85rem;font-size:.85rem;cursor:pointer;font-family:inherit}
.opt.active{border-color:var(--gold);color:var(--gold);background:rgba(212,175,55,.08)}
.opt:hover{border-color:var(--gold)}
.qty{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.qty button{background:none;border:none;color:var(--gold);width:2.4rem;height:2.4rem;font-size:1.2rem;cursor:pointer}
.qty span{min-width:2.2rem;text-align:center}
.buy{display:block;width:100%;margin-top:1.6rem;background:var(--gold);color:#0a0a0c;border:none;border-radius:10px;padding:1rem;font-family:'Cinzel',serif;font-size:1rem;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;font-weight:700}
.buy:hover{background:var(--gold-bright)}
.buy:disabled{opacity:.6;cursor:wait}
.story{margin-top:1.8rem;border-top:1px solid var(--line);padding-top:1.2rem}
.story h3{font-size:.95rem;margin-bottom:.5rem}
.story li{color:var(--dim);font-size:.92rem;margin:.25rem 0;list-style:none}
.story li::before{content:'◆ ';color:var(--gold);font-size:.6rem;vertical-align:middle}
.section-head{padding:2.2rem 0 1rem;border-bottom:1px solid var(--line)}
.section-head h2{font-size:1.45rem;margin-bottom:.3rem}
.section-head p{color:var(--dim);max-width:64ch;font-size:.95rem}
.group-head{display:flex;align-items:baseline;gap:.7rem;padding:1.7rem 0 .1rem}
.group-head h3{font-size:1.02rem}
.group-head .count{color:var(--dim);font-size:.74rem;letter-spacing:.1em;text-transform:uppercase}
.grid--group{padding:.9rem 0 0}
.creator-editions{padding:2.5rem 0 1.5rem}
.ce-empty{border:1px dashed var(--line);border-radius:12px;padding:1.6rem;color:var(--dim);text-align:center;font-size:.92rem;line-height:1.8}
.ce-by{font-size:.74rem;color:var(--dim);letter-spacing:.06em;text-transform:uppercase;margin-top:.2rem}
@media(max-width:820px){
  .hero{grid-template-columns:1fr;text-align:center}
  .hero img{max-width:260px;margin:0 auto}
  .pdp{grid-template-columns:1fr;gap:1.5rem}
  .grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))}
}
`;

function head({ title, description, path: pagePath, css = '', collaborators = false }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<!-- PUNICODEX-ANALYTICS-START -->
<script src="/js/analytics-beacon.js" defer></script>
<!-- PUNICODEX-ANALYTICS-END -->
${
  collaborators
    ? `
<!-- PUNICODEX-UNIVERSITY-COLLABORATORS-HEAD-START -->
<link rel="stylesheet" href="/css/university-collaborators.css?v=3">
<script src="/js/university-collaborators.js?v=3" defer></script>
<!-- PUNICODEX-UNIVERSITY-COLLABORATORS-HEAD-END -->

`
    : ''
}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="google" content="notranslate">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="https://punicodex.com${pagePath}">
<link rel="icon" type="image/svg+xml" href="/assets/brand/02-favicons/favicon.svg">
<link rel="icon" href="/assets/brand/02-favicons/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/assets/brand/02-favicons/apple-touch-icon.png">
<link rel="mask-icon" href="/assets/brand/02-favicons/mask-icon.svg" color="#D4AF37">
<link rel="manifest" href="/assets/brand/06-code/site.webmanifest">
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<link rel="stylesheet" href="/css/main.css?v=perf22">
<style>${BASE_CSS}${css}</style>
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
    ${fullNavHtml('/store/')}
    ${menuForPage('/store/')}
    <script src="/js/px-core.js?v=perf21" defer></script>
    <script src="/js/main.js?v=perf12" defer></script>`;
}

// ─── Collections index ───
function renderStoreIndex(colls) {
  const cards = [...colls.entries()]
    .map(([id, products]) => {
      const meta = templeMeta(id);
      const sorted = products.slice().sort((a, b) => KIND_ORDER.indexOf(a.id.split('-').pop()) - KIND_ORDER.indexOf(b.id.split('-').pop()));
      const img = cardImage(sorted[0], meta);
      return `<a class="card" href="/store/${id}/" data-pantheon="${esc(meta.pantheon)}" data-name="${esc(meta.name.toLowerCase())}">
  <div class="imgbox"><img src="${esc(img)}" alt="${esc(meta.name)} collection" loading="lazy"></div>
  <div class="body">
    <div class="sub">${esc(meta.pantheon)}${meta.rentalTier ? ` · Tier ${meta.rentalTier}` : ''}</div>
    <h3>${esc(meta.name)}</h3>
    <div class="sub" style="text-transform:none;letter-spacing:0">${products.length} pieces · ${priceRange(products)}</div>
  </div>
</a>`;
    })
    .join('\n');

  const pantheons = [...new Set([...colls.values()].map((_, i) => i))];
  const pills = ['All', ...new Set([...colls.keys()].map((id) => templeMeta(id).pantheon).filter(Boolean))].sort();

  return `${head({
    title: 'The Reliquary — Collections | PUNICODEX',
    description: `Print-on-demand relics of the Unicode Pantheon — ${colls.size} temple collections, each with its own line of apparel, prints, drinkware and relics.`,
    path: '/store/',
    css: `.store-hero{text-align:center;padding:5.5rem 0 2.5rem}.store-hero .pc-fx-stage{margin:0 auto 1.5rem}.store-hero h1{font-size:2.6rem;margin:.4rem 0 .6rem}.store-hero .tag{max-width:62ch;margin:0 auto}`,
    collaborators: true,
  })}
<link rel="stylesheet" href="/css/pc-fx.css?v=1">
<div class="wrap">
  <div class="store-hero">
    <div class="pc-fx-stage pc-fx-brilliant-stage" role="img" aria-label="The Golden Brilliant — a faceted gem cut in gold, its facets catching the light">
      <canvas class="pc-fx-brilliant" aria-hidden="true"></canvas>
    </div>
    <span class="pill">Orders Open</span>
    <h1>THE RELIQUARY</h1>
    <p class="tag">Sacred artifacts from the Pantheon, printed on demand. Every temple keeps a collection — choose one, and its whole line of apparel, prints, drinkware and relics opens to you.</p>
  </div>
  <div class="filters" id="filters">
    <input id="q" type="search" placeholder="Search the collections…" aria-label="Search collections">
    ${pills.map((p, i) => `<button class="fpill${i === 0 ? ' active' : ''}" data-f="${esc(p === 'All' ? 'all' : p)}">${esc(p)}</button>`).join('\n    ')}
  </div>
  <div class="grid" id="grid">
${cards}
  </div>
</div>
<script src="/js/pc-fx-core.js?v=1" defer></script>
<script src="/js/pc-fx-brilliant.js?v=1" defer></script>
<script>
(function(){
  var q = document.getElementById('q');
  var pills = Array.prototype.slice.call(document.querySelectorAll('.fpill'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('#grid .card'));
  var filter = 'all';
  function apply(){
    var needle = (q.value || '').toLowerCase();
    cards.forEach(function(c){
      var okPan = filter === 'all' || c.getAttribute('data-pantheon') === filter;
      var okQ = !needle || c.getAttribute('data-name').indexOf(needle) !== -1;
      c.style.display = okPan && okQ ? '' : 'none';
    });
  }
  pills.forEach(function(p){ p.addEventListener('click', function(){
    pills.forEach(function(x){ x.classList.remove('active'); });
    p.classList.add('active');
    filter = p.getAttribute('data-f');
    apply();
  }); });
  q.addEventListener('input', apply);
})();
</script>
    
<!-- PUNICODEX-UNIVERSITY-COLLABORATORS-BODY-START -->
<div id="university-collaborators-strip" role="complementary" aria-label="Academic Collaborators"></div>
<!-- PUNICODEX-UNIVERSITY-COLLABORATORS-BODY-END -->
${footerHtml()}
</body></html>
`;
}

// ─── Collection page ───
// Curated kind groups give the collection structure. A future product kind
// joins an existing group or lands in "More from the Collection" — a fresh
// batch is a data change, never a redesign.
const KIND_GROUPS = [
  { label: 'Wearables', kinds: ['tee', 'hoodie', 'crewneck', 'cap', 'tote'] },
  { label: 'Art & Prints', kinds: ['print', 'canvas'] },
  { label: 'Relics & Objects', kinds: ['mug', 'tumbler', 'sticker', 'pin', 'notebook', 'phonecase'] },
];

function renderCollection(id, products) {
  const meta = templeMeta(id);
  const sorted = products
    .slice()
    .sort((a, b) => KIND_ORDER.indexOf(a.id.split('-').pop()) - KIND_ORDER.indexOf(b.id.split('-').pop()));
  const cardHtml = (p) => {
    const kind = p.id.split('-').pop();
    return `<a class="card" href="/store/${id}/${kind}/">
  <div class="imgbox"><img src="${esc(cardImage(p, meta))}" alt="${esc(p.name)}" loading="lazy"></div>
  <div class="body">
    <div class="sub">${esc(kindLabel(kind))}</div>
    <h3>${esc(p.name)}</h3>
    <div class="price">${money(p.price)}</div>
  </div>
</a>`;
  };

  const groups = [];
  const claimed = new Set();
  for (const g of KIND_GROUPS) {
    const members = sorted.filter((p) => g.kinds.includes(p.id.split('-').pop()));
    for (const p of members) claimed.add(p.id);
    if (members.length) groups.push({ label: g.label, members });
  }
  const rest = sorted.filter((p) => !claimed.has(p.id));
  if (rest.length) groups.push({ label: 'More from the Collection', members: rest });

  const groupsHtml = groups
    .map(
      (g) => `  <div class="group-head"><h3>${esc(g.label)}</h3><span class="count">${g.members.length} piece${g.members.length === 1 ? '' : 's'}</span></div>
  <div class="grid grid--group">
${g.members.map(cardHtml).join('\n')}
  </div>`
    )
    .join('\n');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${meta.name} Collection — PuniCodex Reliquary`,
    url: `https://punicodex.com/store/${id}/`,
    hasPart: sorted.map((p) => ({
      '@type': 'Product',
      name: p.name,
      url: `https://punicodex.com/store/${id}/${p.id.split('-').pop()}/`,
      offers: { '@type': 'Offer', price: p.price.toFixed(2), priceCurrency: 'USD' },
    })),
  };

  return `${head({
    title: `${meta.name} Collection | PUNICODEX Reliquary`,
    description: `The complete ${meta.name} line — ${products.length} print-on-demand pieces: ${esc(meta.tagline)}`,
    path: `/store/${id}/`,
  })}
<div class="wrap crumbs"><a href="/store/">The Reliquary</a> · <span style="color:var(--gold)">${esc(meta.name)}</span></div>
<div class="wrap">
  <div class="hero">
    <img src="${esc(meta.mascotPath || cardImage(sorted[0], meta))}" alt="${esc(meta.name)} mascot">
    <div>
      <span class="pill">${esc(meta.pantheon)}</span>${meta.greek ? ` <span class="pill">${esc(meta.greek)}</span>` : ''}
      <h1>${esc(meta.name)}</h1>
      <p class="tag">${esc(meta.tagline)}</p>
      <p class="sub" style="color:var(--dim);font-size:.8rem;margin-top:.8rem;letter-spacing:.06em;text-transform:uppercase">${products.length} pieces · ${priceRange(products)} · printed on demand</p>
    </div>
  </div>
  <div class="section-head">
    <h2>The Foundation Collection</h2>
    <p>${products.length} pieces built from the temple's own materials — the mascot, the temple seal and the name lockup — printed to order.</p>
  </div>
${groupsHtml}
  <section class="creator-editions" aria-label="Creator Editions">
    <div class="section-head" style="border-bottom:none">
      <h2>Creator Editions</h2>
      <p>Designs by verified university creators, inspired by ${esc(meta.name)} and sold with their consent — half of every sale goes to the creator.</p>
    </div>
    <div id="ce-grid">
      <div class="ce-empty">No creator editions for ${esc(meta.name)} yet. When a verified creator publishes work inspired by this temple, it appears here.<br><a href="/creatives/">The Creative Marketplace →</a></div>
    </div>
  </section>
  <p class="wrap" style="padding-bottom:3rem;color:var(--dim);font-size:.85rem">Every piece is printed to order and shipped worldwide. Curious about the name itself? <a href="${esc(meta.url)}">Enter the ${esc(meta.name)} temple →</a></p>
</div>
<script>
(function(){
  var templeId = ${JSON.stringify(id)};
  var grid = document.getElementById('ce-grid');
  if (!grid || !window.fetch) return;
  fetch('/api/store/products').then(function(r){ return r.ok ? r.json() : null; }).then(function(data){
    if (!data || !data.products) return;
    var editions = data.products.filter(function(p){ return p.temple === templeId; });
    if (!editions.length) return;
    grid.innerHTML = '<div class="grid grid--group">' + editions.map(function(p){
      var by = p.creator && p.creator.name ? p.creator.name + (p.creator.university ? ' · ' + p.creator.university : '') : 'Verified creator';
      return '<a class="card" href="/creatives/">' +
        '<div class="imgbox"><img src="' + p.image + '" alt="' + p.name.replace(/"/g, '&quot;') + '" loading="lazy"></div>' +
        '<div class="body"><div class="sub">Creator Edition</div><h3>' + p.name + '</h3>' +
        '<div class="ce-by">' + by + '</div>' +
        '<div class="price">$' + Number(p.price).toFixed(2).replace(/\\.00$/, '') + '</div></div></a>';
    }).join('') + '</div>';
  }).catch(function(){ /* the honest empty state stays */ });
})();
</script>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    ${footerHtml()}
</body></html>
`;
}

// ─── Product page ───
function renderProduct(id, kind, product) {
  const meta = templeMeta(id);
  const v = parseVariants(product);
  const placements = product.design.placements
    .map((pl) => {
      const assetName = {
        mascot: 'the deity',
        logomark: 'the temple seal',
        logolockup: 'the name lockup',
        compSticker: 'a triad of seals',
        compCanvas: 'the deity with corner seal',
        compTote: 'the lockup with mascot tag',
        compMug: 'seal-and-deity wrap',
        compNotebook: 'lockup with seal footer',
        wordmark: 'the PuniCodex wordmark',
        wordmarkSolid: 'the solid wordmark',
        emblem: 'the emblem',
        glyph: 'the glyph',
        lockupH: 'the horizontal lockup',
        lockupS: 'the stacked lockup',
        compPoster: 'wordmark over glyph',
      }[pl.asset] || pl.asset;
      const area = { front: 'front', back: 'back' }[pl.area] || pl.area;
      return `<li>${esc(pl.note)} — ${assetName}, ${area}</li>`;
    })
    .join('\n');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: cardImage(product, meta),
    description: product.blurb,
    brand: { '@type': 'Brand', name: 'PuniCodex' },
    offers: {
      '@type': 'Offer',
      price: product.price.toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  };

  const colorBlock =
    v.colors.length > 1 || (v.colors.length > 0 && v.hasColorDimension)
      ? `<div class="opt-group"><div class="lbl">Colour</div><div class="opts" id="opts-color">${v.colors
          .map((c, i) => `<button class="opt${i === 0 ? ' active' : ''}" data-c="${esc(c)}">${esc(c)}</button>`)
          .join('')}</div></div>`
      : '';
  const sizeBlock =
    v.sizes.length > 1
      ? `<div class="opt-group"><div class="lbl">${v.sizes.some((s) => /iPhone|oz|″|cm|A\d/.test(s)) ? 'Option' : 'Size'}</div><div class="opts" id="opts-size">${v.sizes
          .map((s, i) => `<button class="opt${i === 0 ? ' active' : ''}" data-s="${esc(s)}">${esc(s)}</button>`)
          .join('')}</div></div>`
      : '';

  // Per-variant pricing: bake the slice of the catalog's variantPricing map
  // that this product can actually sell (its printfulVariants labels). The
  // page opens on "from $X" when the variant prices spread, and the client
  // swaps in the exact price as the customer picks a variant.
  const pricing = product.variantPricing || null;
  const pricedLabels = pricing ? Object.keys(pricing).filter((l) => v.labels.includes(l)) : [];
  let bakedPrices = null;
  let fromCents = null;
  if (pricedLabels.length) {
    bakedPrices = {};
    for (const l of pricedLabels) bakedPrices[l] = pricing[l];
    const cents = pricedLabels.map((l) => pricing[l]);
    if (Math.max(...cents) > Math.min(...cents)) fromCents = Math.min(...cents);
  }
  const colourNote =
    v.colors.length > 1
      ? `<p style="color:var(--dim);font-size:.82rem;margin-top:.6rem">Shown in Black — the design prints the same on every colour.</p>`
      : '';

  return `${head({
    title: `${product.name} | PUNICODEX Reliquary`,
    description: `${product.blurb} — ${product.name}, printed on demand. ${priceRange([product])} USD.`,
    path: `/store/${id}/${kind}/`,
  })}
<div class="wrap crumbs"><a href="/store/">The Reliquary</a> · <a href="/store/${id}/">${esc(meta.name)}</a> · <span style="color:var(--gold)">${esc(kindLabel(kind))}</span></div>
<div class="wrap pdp">
  <div><div class="stage"><img id="stage-img" src="${esc(cardImage(product, meta))}" alt="${esc(product.name)}"></div>${colourNote}</div>
  <div>
    <span class="pill">${esc(kindLabel(kind))}</span> <span class="pill">${esc(meta.name)}</span>
    <h1>${esc(product.name)}</h1>
    <p style="color:var(--dim)">${esc(product.blurb)}</p>
    <div class="price"${bakedPrices ? ' id="pdp-price"' : ''}>${fromCents ? `from ${money(fromCents / 100)}` : money(product.price)}</div>
    ${colorBlock}
    ${sizeBlock}
    <div class="opt-group">
      <div class="lbl">Quantity</div>
      <div class="qty"><button type="button" id="q-down" aria-label="Decrease quantity">−</button><span id="q-val">1</span><button type="button" id="q-up" aria-label="Increase quantity">+</button></div>
    </div>
    <button class="buy" id="buy">Buy — printed for you</button>
    <div class="story">
      <h3>The Design</h3>
      <ul>
${placements}
      </ul>
      <p style="color:var(--dim);font-size:.82rem;margin-top:1rem">Printed on demand and shipped worldwide. Part of the <a href="/store/${id}/">${esc(meta.name)} collection</a> · <a href="${esc(meta.url)}">the temple itself</a>.</p>
    </div>
  </div>
</div>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<script>
(function(){
  var colors = Array.prototype.slice.call(document.querySelectorAll('#opts-color .opt'));
  var sizes = Array.prototype.slice.call(document.querySelectorAll('#opts-size .opt'));
  var qtyEl = document.getElementById('q-val');
  var qty = 1;
  function pick(list, el){ list.forEach(function(x){ x.classList.remove('active'); }); el.classList.add('active'); }
  colors.forEach(function(b){ b.addEventListener('click', function(){ pick(colors, b); updatePrice(); }); });
  sizes.forEach(function(b){ b.addEventListener('click', function(){ pick(sizes, b); updatePrice(); }); });
  document.getElementById('q-down').addEventListener('click', function(){ qty = Math.max(1, qty - 1); qtyEl.textContent = qty; });
  document.getElementById('q-up').addEventListener('click', function(){ qty = Math.min(5, qty + 1); qtyEl.textContent = qty; });
  var LABELS = ${JSON.stringify(v.labels)};
  function currentLabel(){
    var c = document.querySelector('#opts-color .opt.active');
    var s = document.querySelector('#opts-size .opt.active');
    var color = c ? c.getAttribute('data-c') : null;
    var size = s ? s.getAttribute('data-s') : (LABELS[0] || 'One size');
    if (color && LABELS.indexOf(color + ' / ' + size) !== -1) return color + ' / ' + size;
    if (color && LABELS.indexOf(color) !== -1) return color;
    if (LABELS.indexOf(size) !== -1) return size;
    return LABELS[0];
  }
  var PRICES = ${bakedPrices ? JSON.stringify(bakedPrices) : 'null'};
  var FLAT_PRICE = ${JSON.stringify(money(product.price))};
  function updatePrice(){
    var el = document.getElementById('pdp-price');
    if (!PRICES || !el) return;
    var cents = PRICES[currentLabel()];
    el.textContent = cents ? '$' + (cents / 100).toFixed(2) : FLAT_PRICE;
  }
  var buy = document.getElementById('buy');
  buy.addEventListener('click', async function(){
    buy.disabled = true;
    buy.textContent = 'Opening checkout…';
    try {
      var res = await fetch('/api/store/checkout/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: ${JSON.stringify(product.id)}, variantLabel: currentLabel(), quantity: qty })
      });
      var json = await res.json().catch(function(){ return {}; });
      if (!res.ok) throw new Error(json.error || ('checkout failed (' + res.status + ')'));
      window.location.href = json.sessionUrl;
    } catch (err) {
      buy.disabled = false;
      buy.textContent = err.message || 'Buy — printed for you';
    }
  });
})();
</script>
    ${footerHtml()}
</body></html>
`;
}

function writeIfChanged(file, content) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return true;
}

function main() {
  const colls = collections();
  let written = 0;
  written += writeIfChanged(path.join(ROOT, 'store', 'index.html'), renderStoreIndex(colls)) ? 1 : 0;
  for (const [id, products] of colls) {
    written += writeIfChanged(path.join(ROOT, 'store', id, 'index.html'), renderCollection(id, products)) ? 1 : 0;
    for (const p of products) {
      const kind = p.id.split('-').pop();
      written += writeIfChanged(
        path.join(ROOT, 'store', id, kind, 'index.html'),
        renderProduct(id, kind, p)
      )
        ? 1
        : 0;
    }
  }
  console.log(`Store pages: ${written} written (${colls.size} collections, ${CATALOG.count} products).`);
}

if (require.main === module) main();

module.exports = { parseVariants };
