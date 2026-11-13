#!/usr/bin/env node
/**
 * PuniCodex — per-temple Art room generator.
 *
 * Writes sites/{id}/art/index.html for every built flagship: the Art
 * Directory architecture (/store/art/) in a temple-scoped bespoke instance.
 * Pills: All Art · Temple Gallery · Creatives · The Commons — every
 * selection URL-addressable via ?view= with its own canonical/title so each
 * filtered state is indexable. Old /gallery/ and /creatives/ pages redirect
 * here (view=temple / view=creatives).
 *
 * Runs after create-flagship (the art room is an 11th temple page).
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { writeFileWithRetry } = require('./write-file-retry.js');
const { footerHtml } = require('./sync-footer.js');
const { ARCHETYPES } = require(path.join(__dirname, '..', 'js', 'archetypes-v2.js'));
const { LEXICON } = require(path.join(__dirname, '..', 'type', 'js', 'lexicon.js'));
const GALLERY_DATA = require(path.join(__dirname, 'gallery-data.json'));

const ROOT = path.join(__dirname, '..');
const SITE_ORIGIN = 'https://punicodex.com';
const COMMONS_DIR = path.join(ROOT, 'assets', 'ai-commons');
const FAMILIES = ['classic-gold', 'anime', 'tattoo', 'bw-engraving', 'realism', 'oil', 'geometric'];

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const LEX_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));
const built = ARCHETYPES.filter((a) => a.built);
console.log(`Temple art rooms: ${built.length} built flagships`);

const commonsIndex = new Map();
function addCommonsWork(id, work) {
  if (!commonsIndex.has(id)) commonsIndex.set(id, []);
  commonsIndex.get(id).push(work);
}
try {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(COMMONS_DIR, 'manifest.json'), 'utf8')
  );
  for (const item of manifest.items || []) addCommonsWork(item.templeId, item);
} catch {
  for (const f of fs.readdirSync(COMMONS_DIR).filter((x) => x.endsWith('.jpg'))) {
    const m = f.match(/^(.+?)-v(\d+\.\d+)\.jpg$/) || f.match(/^([a-z]+)\.jpg$/);
    if (!m) continue;
    let deity = m[1];
    const fam = FAMILIES.find((x) => deity.endsWith('-' + x));
    if (fam) deity = deity.slice(0, -(fam.length + 1));
    addCommonsWork(deity, {
      src: `/assets/ai-commons/${f}`,
      family: fam || 'classic-gold',
      title: `${deity} — study v${m[2] || 'studio'}`,
    });
  }
}

function commonsCards(id, entry) {
  const works = (commonsIndex.get(id) || []).sort((a, b) => a.src.localeCompare(b.src));
  return works
    .map((work) => {
      const family = work.family || 'classic-gold';
      const title = work.title || `${entry.unicode} — Commons study`;
      const tags = (work.tags || ['commons', family]).join(' ');
      const date = work.generatedAt || '';
      return `<figure class="art-card" data-kind="commons" data-art-id="${esc(work.id || '')}" data-title="${esc(title)} ${family.replace(/-/g, ' ')}" data-tags="${esc(tags)}" data-date="${esc(date)}" data-src="${esc(work.src)}" data-license="${esc(work.license || 'CC BY 4.0')}" data-model="${esc(work.model || 'Not recorded')}">
      <div class="imgbox"><img src="${esc(work.src)}" alt="${esc(title)} — PuniCodex studio ${family}" loading="lazy" width="512" height="512"></div>
      <div class="body"><div class="sub">The Commons · ${family.replace(/-/g, ' ')}</div><h3>${esc(title)}</h3>
      <div class="sub" style="text-transform:none;letter-spacing:0">${esc(work.license || 'CC BY 4.0')} · attribution required</div></div>
    </figure>`;
    })
    .join('\n    ');
}

function galleryWorks(id, entry) {
  return ((GALLERY_DATA[id] || {}).images || []).map((im, index) => {
    const title = String(im.caption || entry.unicode).replace(/<[^>]*>/g, '').split('.')[0].trim();
    const host = im.sourceUrl ? String(im.sourceUrl).replace(/^https?:\/\//, '').split('/')[0] : '';
    const creator = im.artist || host || 'Wikimedia Commons';
    const license = im.license || 'See source';
    const workId = `gallery-${id}-${index + 1}`;
    const canonicalUrl = `${SITE_ORIGIN}/${id}/art/?view=temple&art=${encodeURIComponent(workId)}`;
    return {
      id: workId,
      kind: 'temple',
      templeId: id,
      src: im.src,
      title,
      alt: im.alt || entry.unicode,
      creator,
      license,
      licenseUrl: im.sourceUrl || '',
      sourceUrl: im.sourceUrl || '',
      canonicalUrl,
      attribution: `${title} by ${creator}, ${license}, via ${im.sourceUrl || canonicalUrl}`,
      provenance: im.alt || String(im.caption || '').replace(/<[^>]*>/g, ''),
      aiAssisted: false,
      host,
    };
  });
}

function galleryCards(id, entry, works) {
  return works
    .map((work) => {
      const credit = [work.host, work.license].filter(Boolean).join(' · ');
      return `<figure class="art-card" data-kind="temple" data-art-id="${esc(work.id)}" data-title="${esc(work.title)} ${esc(entry.unicode)}" data-tags="historical" data-date="">
      <div class="imgbox"><img src="${esc(work.src)}" alt="${esc(work.alt)}" loading="lazy"></div>
      <div class="body"><div class="sub">Temple Gallery</div><h3>${esc(work.title)}</h3>
      <div class="sub" style="text-transform:none;letter-spacing:0">${esc(credit)}</div></div>
    </figure>`;
    })
    .join('\n    ');
}

function creativesEmpty(entry) {
  return `<div class="art-empty" data-kind="creatives">
      <p style="font-size:1.6rem;color:var(--gold);margin:0 0 .4rem">✦</p>
      <p><strong>The Creatives room for ${esc(entry.unicode)} is being gathered.</strong><br>
      Student and independent artists will license mythological work here — credited always, paid properly.<br>
      Open to university creators first: <a href="/university-sponsorship/" style="color:var(--gold)">the university door →</a></p>
    </div>`;
}

const VIEW_META = {
  all: { title: 'Art', desc: 'index' },
  temple: { title: 'Temple Gallery', desc: 'temple' },
  creatives: { title: 'Creatives', desc: 'creatives' },
  commons: { title: 'The Commons', desc: 'commons' },
};

const CSS = `
.wrap{max-width:1200px;margin:0 auto;padding-left:max(1.25rem,env(safe-area-inset-left));padding-right:max(1.25rem,env(safe-area-inset-right))}
.art-hero{text-align:center;padding:4.5rem 0 1.5rem}.art-hero h1{font-size:clamp(1.8rem,7vw,2.6rem);margin:.4rem 0 .6rem;overflow-wrap:anywhere}.art-hero .tag{max-width:64ch;margin:0 auto}.art-cats{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;padding:1rem 0 0}.art-cat{border:1px solid var(--line);background:none;color:var(--dim);border-radius:999px;padding:.4rem 1.1rem;font-size:.8rem;letter-spacing:.08em;cursor:pointer;font-family:inherit}.art-cat.active,.art-cat:hover{color:var(--gold);border-color:var(--gold)}.art-filters{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;padding:1.4rem 0 .6rem}.art-filters input,.art-filters select{background:#0e0e12;border:1px solid var(--line);border-radius:8px;color:var(--ink);padding:.55rem .8rem;font-size:.88rem;font-family:inherit}.art-filters input{min-width:220px;flex:1}.art-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1.25rem;padding:1.4rem 0 4rem}.art-grid[hidden]{display:none}.art-card{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;display:block;color:var(--ink);text-decoration:none;transition:transform .25s ease,border-color .25s ease;margin:0}.art-card:hover{transform:translateY(-4px);border-color:var(--gold)}.art-card .imgbox{aspect-ratio:1;background:#0c0c10;overflow:hidden}.art-card img{width:100%;height:100%;object-fit:cover;display:block}.art-card .body{padding:.8rem .95rem 1rem}.art-card h3{font-size:.95rem;color:var(--ink);font-family:'Spectral',Georgia,serif;margin:0 0 .15rem}.art-card .sub{font-size:.72rem;color:var(--dim);letter-spacing:.06em;text-transform:uppercase}.art-empty{border:1px dashed var(--line);border-radius:12px;padding:2.5rem 1.5rem;text-align:center;color:var(--dim);line-height:1.8;grid-column:1/-1}
@media(max-width:520px){.art-grid{grid-template-columns:repeat(auto-fill,minmax(min(220px,100%),1fr))}.art-filters input{min-width:0;width:100%}.art-filters select{max-width:100%}}
`;

function renderTempleArt(a) {
  const entry = LEX_BY_ID.get(a.id);
  const name = entry ? entry.unicode : a.name || a.id;
  const galleryWorkItems = galleryWorks(a.id, entry || { unicode: name });
  const gallery = galleryCards(a.id, entry || { unicode: name }, galleryWorkItems);
  const commonsWorks = commonsIndex.get(a.id) || [];
  const commons = commonsCards(a.id, entry || { unicode: name });
  const creatives = creativesEmpty(entry || { unicode: name });
  const all = [gallery, commons].filter(Boolean).join('\n    ');
  const templeCss = fs
    .readFileSync(path.join(ROOT, 'sites', a.id, 'styles.css'), 'utf8')
    .replace(/\r\n/g, '\n');
  const cssPin = crypto.createHash('md5').update(templeCss).digest('hex').slice(0, 10);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Art of ${name} — Temple Gallery, Creatives & the Commons`,
    url: `${SITE_ORIGIN}/${a.id}/art/`,
    isPartOf: { '@type': 'WebSite', name: 'PuniCodex', url: SITE_ORIGIN + '/' },
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Pantheon', item: `${SITE_ORIGIN}/pantheon/` },
      { '@type': 'ListItem', position: 3, name, item: `${SITE_ORIGIN}/${a.id}/` },
      { '@type': 'ListItem', position: 4, name: 'Art', item: `${SITE_ORIGIN}/${a.id}/art/` },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="google" content="notranslate">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title id="art-title">Art of ${esc(name)} — Temple Gallery, Creatives & the Commons | PUNICODEX</title>
<meta name="description" id="art-desc" content="Every visual thread of ${esc(name)} in one room — the temple's curated historical gallery, the growing Commons, and the Creatives marketplace opening to university artists.">
<link rel="canonical" href="${SITE_ORIGIN}/${a.id}/art/" id="art-canonical">
<meta property="og:type" content="website">
<meta property="og:title" content="Art of ${esc(name)} | PUNICODEX">
<meta property="og:description" content="The temple gallery, the Commons, and the Creatives room of ${esc(name)}.">
<meta property="og:url" content="${SITE_ORIGIN}/${a.id}/art/" id="art-og-url">
<meta property="og:image" content="${SITE_ORIGIN}/assets/og/${a.id}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE_ORIGIN}/assets/og/${a.id}.jpg">
<link rel="preload" href="/assets/fonts/cinzel-400-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/lato-400-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="icon" type="image/svg+xml" href="/assets/brand/02-favicons/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/02-favicons/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/assets/brand/02-favicons/favicon-16x16.png">
<link rel="icon" href="/assets/brand/02-favicons/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/assets/brand/02-favicons/apple-touch-icon.png">
<link rel="manifest" href="/assets/brand/06-code/site.webmanifest">
<meta name="theme-color" content="#0A0A0C">
<link rel="stylesheet" href="/assets/fonts/fonts.css?v=8c5b8a17eb">
<link rel="stylesheet" href="../styles.css?v=${cssPin}">
<link rel="stylesheet" href="/css/temple-base.css?v=perf24">
<link rel="stylesheet" href="/css/pc-fx.css?v=1">
<link rel="stylesheet" href="/css/commons-viewer.css?v=1">
<link rel="stylesheet" href="/css/footer.css?v=8">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
<style>
${CSS}
.temple-breadcrumb{position:relative;z-index:5;max-width:var(--container-max,1200px);margin:0 auto;padding:calc(var(--global-strip-height,54px) + var(--nav-height,110px) + .75rem) 1.5rem 0;font-size:.78rem;letter-spacing:.04em}.temple-breadcrumb-list{list-style:none;display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;margin:0;padding:0}.temple-breadcrumb-list li{display:flex;align-items:center;gap:.4rem;color:var(--white-dim,#a0a0a0)}.temple-breadcrumb-list li+li::before{content:'›';color:var(--primary,#d4af37);opacity:.55}.temple-breadcrumb-list a{color:var(--white-dim,#a0a0a0)}.temple-breadcrumb-list a:hover{color:var(--primary-bright,#f0d878)}.temple-breadcrumb-list [aria-current]{color:var(--primary,#d4af37)}
</style>
</head>
<body class="temple-page">
    <div class="global-strip">
        <div class="global-strip-inner">
            <a href="${SITE_ORIGIN}/" class="global-brand"><picture><source srcset="/assets/brand/01-logos/punicodex-wordmark-gold-solid.webp" type="image/webp"><img src="/assets/brand/01-logos/punicodex-wordmark-gold-solid.png" alt="PuniCodex" width="560" height="58"></picture></a>
            <div class="global-links">
                <a href="${SITE_ORIGIN}/world/">World</a>
                <a href="${SITE_ORIGIN}/culture/">Culture</a>
                <a href="${SITE_ORIGIN}/instruments/">Tools</a>
                <a href="${SITE_ORIGIN}/library/">Library</a>
                <a href="${SITE_ORIGIN}/relics/">Relics</a>
                <a href="${SITE_ORIGIN}/about/">About</a>
            </div>
        </div>
    </div>

    <!-- Tab Navigation -->
    <nav class="main-nav tab-nav" id="tab-nav">
        <div class="nav-inner">
            <a href="../index.html" class="nav-logo">
                <picture><source srcset="../assets/${a.id}_logolockup.webp" type="image/webp"><img src="../assets/${a.id}_logolockup.png" alt="${esc(name)}" class="nav-logo-img" width="1536" height="1024"></picture>
            </a>
            <div class="nav-links tab-nav-links">
                <a href="../index.html" class="nav-link">Home</a>
                <span class="nav-group">
                    <a href="../lore/index.html" class="nav-link">Lore</a>
                    <span class="nav-sub">
                        <a href="../lore/extended/index.html" class="nav-sub-link">Extended</a>
                    </span>
                </span>
                <span class="nav-group">
                    <a href="/store/${a.id}/" class="nav-link active">Store</a>
                    <span class="nav-sub">
                        <a href="/store/merch/${a.id}/" class="nav-sub-link">Merch</a>
                        <a href="./index.html" class="nav-sub-link active">Art</a>
                    </span>
                </span>
                <a href="../patterns/index.html" class="nav-link">Patterns</a>
                <a href="../scholars/index.html" class="nav-link">Scholars</a>
                <a href="../patron/index.html" class="nav-link">Patrons</a>
                <a href="../blog/index.html" class="nav-link">Blog</a>
            </div>
            <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation" aria-controls="temple-mobile-menu">
                <span></span><span></span><span></span>
            </button>
        </div>
    </nav>
    <div class="mobile-menu temple-mobile-menu" id="temple-mobile-menu" aria-hidden="true" inert>
        <a href="../index.html" class="nav-link">Home</a>
        <span class="nav-group">
            <a href="../lore/index.html" class="nav-link">Lore</a>
            <span class="nav-sub">
                <a href="../lore/extended/index.html" class="nav-sub-link">Extended</a>
            </span>
        </span>
        <span class="nav-group">
            <a href="/store/${a.id}/" class="nav-link active">Store</a>
            <span class="nav-sub">
                <a href="/store/merch/${a.id}/" class="nav-sub-link">Merch</a>
                <a href="./index.html" class="nav-sub-link active">Art</a>
            </span>
        </span>
        <a href="../patterns/index.html" class="nav-link">Patterns</a>
        <a href="../scholars/index.html" class="nav-link">Scholars</a>
        <a href="../patron/index.html" class="nav-link">Patrons</a>
        <a href="../blog/index.html" class="nav-link">Blog</a>
    </div>

    <nav class="temple-breadcrumb" aria-label="Breadcrumb">
        <ol class="temple-breadcrumb-list">
            <li><a href="${SITE_ORIGIN}/">Home</a></li>
            <li><a href="${SITE_ORIGIN}/pantheon/">Pantheon</a></li>
            <li><a href="${SITE_ORIGIN}/${a.id}/">${esc(name)}</a></li>
            <li><span aria-current="page">Art</span></li>
        </ol>
    </nav>

<main class="wrap">
  <div class="art-hero">
    <div class="pc-fx-stage pc-fx-muse-stage" role="img" aria-label="The Muse Flame — a living flame of inspiration">
      <canvas class="pc-fx-muse" aria-hidden="true"></canvas>
    </div>
    <span class="pill" style="display:inline-block;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;border:1px solid rgba(212,175,55,.3);border-radius:999px;padding:.22rem .7rem;color:#d4af37">The Art Room of the Temple</span>
    <h1>ART OF ${esc(name)}</h1>
    <p class="tag">Every visual thread of ${esc(name)} in one room — the temple's curated historical gallery, the house's Commons studies, and the Creatives marketplace as it opens.</p>
  </div>
  <div class="art-cats" role="tablist" aria-label="Art views">
    <button class="art-cat active" data-cat="all" role="tab">All Art</button>
    <button class="art-cat" data-cat="temple" role="tab">Temple Gallery</button>
    <button class="art-cat" data-cat="creatives" role="tab">Creatives</button>
    <button class="art-cat" data-cat="commons" role="tab">The Commons</button>
  </div>
  <div class="art-filters">
    <input id="art-q" type="search" placeholder="Search by title, myth, or style…" aria-label="Search artworks">
    <select id="art-tag" aria-label="Filter by tag">
      <option value="">All Tags</option>
      <option value="mascot">Mascots</option>
      <option value="tattoo">Tattoo-ready</option>
      <option value="anime">Anime</option>
      <option value="realism">Realism</option>
      <option value="bw-engraving">Black &amp; white engraving</option>
      <option value="oil">Oil painting</option>
      <option value="geometric">Geometric</option>
      <option value="classic-gold">Classic gold</option>
    </select>
    <select id="art-sort" aria-label="Sort artworks">
      <option value="newest">Newest First</option>
      <option value="oldest">Oldest First</option>
      <option value="az">A – Z</option>
    </select>
  </div>
  <div class="art-grid" id="art-grid-all">
    ${all || `<div class="art-empty">Works are being gathered for ${esc(name)}.</div>`}
  </div>
  <div class="art-grid" id="art-grid-temple" hidden>
    ${gallery || `<div class="art-empty">The curated historical collection for ${esc(name)} is being gathered.</div>`}
  </div>
  <div class="art-grid" id="art-grid-creatives" hidden>
    ${creatives}
  </div>
  <div class="art-grid" id="art-grid-commons" hidden>
    ${commons || `<div class="art-empty">Commons studies for ${esc(name)} are being forged.</div>`}
  </div>
</main>
${footerHtml()}
<script>window.__COMMONS_WORKS__ = ${JSON.stringify([...galleryWorkItems, ...commonsWorks]).replace(/</g, '\\u003c')};</script>
<script src="/js/commons-viewer.js?v=2" defer></script>
<script src="/js/temple-base.js?v=2903489bdd" defer></script>
<script src="/js/px-core.js?v=perf23" defer></script>
<script src="/js/pc-fx-core.js?v=1" defer></script>
<script src="/js/pc-fx-muse.js?v=1" defer></script>
<script>
(function () {
  var cats = Array.prototype.slice.call(document.querySelectorAll('.art-cat'));
  var grids = { all: 'art-grid-all', temple: 'art-grid-temple', creatives: 'art-grid-creatives', commons: 'art-grid-commons' };
  var meta = {
    all: { t: 'Art of ${esc(name)} — Temple Gallery, Creatives & the Commons | PUNICODEX', c: '${SITE_ORIGIN}/${a.id}/art/' },
    temple: { t: 'Temple Gallery of ${esc(name)} — curated historical works | PUNICODEX', c: '${SITE_ORIGIN}/${a.id}/art/?view=temple' },
    creatives: { t: 'Creatives for ${esc(name)} — licensed mythological art | PUNICODEX', c: '${SITE_ORIGIN}/${a.id}/art/?view=creatives' },
    commons: { t: 'The Commons — ${esc(name)} studies by the PuniCodex studio | PUNICODEX', c: '${SITE_ORIGIN}/${a.id}/art/?view=commons' }
  };
  var currentCat = 'all';
  function show(cat, push) {
    currentCat = cat;
    cats.forEach(function (b) {
      var selected = b.getAttribute('data-cat') === cat;
      b.classList.toggle('active', selected);
      b.setAttribute('aria-selected', String(selected));
    });
    Object.keys(grids).forEach(function (k) { document.getElementById(grids[k]).hidden = k !== cat; });
    if (meta[cat]) {
      document.title = meta[cat].t;
      var link = document.getElementById('art-canonical');
      if (link) link.setAttribute('href', meta[cat].c);
      var ogUrl = document.getElementById('art-og-url');
      if (ogUrl) ogUrl.setAttribute('content', meta[cat].c);
    }
    if (push !== false && history.replaceState) {
      history.replaceState(null, '', cat === 'all' ? location.pathname : '?view=' + cat);
      applyFilters();
    }
  }
  cats.forEach(function (b) {
    b.addEventListener('click', function () { show(b.getAttribute('data-cat')); });
  });
  var initial = 'all';
  try {
    var v = new URLSearchParams(location.search).get('view');
    if (v && grids[v]) initial = v;
  } catch (e) {}
  show(initial, false);

  // The jeweller's loupe: search, tag and sort over the visible room's cards.
  // No tradition filter — this room holds one temple only.
  function applyFilters() {
    var q = (document.getElementById('art-q').value || '').toLowerCase().trim();
    var tag = document.getElementById('art-tag').value;
    var sort = document.getElementById('art-sort').value;
    var grid = document.getElementById(grids[currentCat]);
    if (!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('figure.art-card'));
    cards.forEach(function (c) {
      var hay = (c.getAttribute('data-title') || c.textContent || '').toLowerCase();
      var tags = c.getAttribute('data-tags') || '';
      var okQ = !q || hay.indexOf(q) !== -1;
      var okT = !tag || tags.indexOf(tag) !== -1;
      c.style.display = okQ && okT ? '' : 'none';
    });
    var visible = cards.filter(function (c) { return c.style.display !== 'none'; });
    visible.sort(function (a, b) {
      if (sort === 'az') return (a.getAttribute('data-title') || '').localeCompare(b.getAttribute('data-title') || '');
      var da = a.getAttribute('data-date') || '0';
      var db = b.getAttribute('data-date') || '0';
      if (sort === 'oldest') return da < db ? -1 : da > db ? 1 : 0;
      return da > db ? -1 : da < db ? 1 : 0; // newest first
    });
    visible.forEach(function (c) { grid.appendChild(c); });
  }
  ['art-q', 'art-tag', 'art-sort'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(id === 'art-q' ? 'input' : 'change', applyFilters);
  });
})();
</script>
</body>
</html>
`;
}

let wrote = 0;
for (const a of built) {
  const outDir = path.join(ROOT, 'sites', a.id, 'art');
  fs.mkdirSync(outDir, { recursive: true });
  writeFileWithRetry(path.join(outDir, 'index.html'), renderTempleArt(a), 'utf8');
  wrote++;
}
console.log(`wrote ${wrote} temple art rooms`);
