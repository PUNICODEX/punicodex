#!/usr/bin/env node
/**
 * PuniCodex — Sacred Atlas page generator (/world/sacred/).
 *
 * Reads the canonical data/sacred-sites.json + the lexicon and writes
 * world/sacred/index.html: a geometric gold-on-void world map with every
 * sacred site plotted, a dossier panel per site, and a server-rendered
 * register beneath (SEO + mobile-first fallback). Images land via the
 * gallery curator into each site's images array in the dataset.
 *
 * Canonical: data/sacred-sites.json. Regenerate: npm run generate.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { LEXICON } = require('../type/js/lexicon.js');

const ROOT = path.join(__dirname, '..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'sacred-sites.json'), 'utf8'));
const OUT_DIR = path.join(ROOT, 'world', 'sacred');
const OUT = path.join(OUT_DIR, 'index.html');

const entryById = new Map(LEXICON.map((e) => [e.id, e]));

// ---- world geometry: deliberately low-poly. Recognizable at abstraction,
// unmistakably PuniCodex. Points are [lon, lat].
const LAND = {
  northAmerica: [[-168,66],[-140,70],[-125,72],[-110,73],[-95,72],[-85,70],[-80,73],[-70,62],[-65,60],[-55,52],[-65,45],[-75,40],[-80,32],[-81,26],[-84,30],[-90,20],[-97,16],[-105,20],[-110,24],[-114,30],[-120,34],[-124,40],[-124,48],[-130,55],[-135,58],[-145,60],[-152,58],[-160,55],[-165,60],[-168,66]],
  greenland: [[-45,60],[-40,65],[-30,68],[-22,70],[-20,75],[-25,80],[-35,82],[-50,80],[-55,75],[-53,68],[-45,60]],
  southAmerica: [[-80,10],[-75,11],[-70,12],[-60,8],[-50,0],[-44,-3],[-38,-5],[-35,-8],[-38,-15],[-40,-22],[-48,-27],[-52,-32],[-58,-35],[-62,-39],[-65,-42],[-68,-48],[-70,-52],[-73,-50],[-73,-44],[-72,-37],[-70,-30],[-70,-20],[-75,-15],[-80,-5],[-80,0],[-80,5],[-80,10]],
  africa: [[-17,15],[-16,20],[-10,28],[-5,32],[0,35],[10,35],[20,32],[30,31],[35,28],[40,15],[43,11],[51,11],[48,5],[42,0],[40,-5],[38,-15],[35,-20],[32,-26],[28,-33],[24,-34],[19,-34],[15,-27],[12,-18],[12,-10],[8,-5],[4,0],[-4,3],[-8,4],[-13,8],[-17,12],[-17,15]],
  eurasia: [[-10,36],[-8,43],[-2,48],[0,50],[5,58],[8,63],[10,68],[15,70],[20,70],[28,71],[35,68],[40,66],[50,68],[60,69],[70,72],[80,73],[90,75],[100,77],[110,74],[120,73],[130,71],[140,72],[150,70],[160,69],[170,66],[178,65],[178,62],[170,60],[162,56],[158,52],[150,45],[142,42],[140,35],[135,34],[129,33],[126,38],[122,38],[120,32],[115,23],[110,20],[108,12],[105,9],[103,5],[100,8],[98,12],[95,16],[92,21],[88,22],[85,20],[82,15],[80,13],[78,8],[77,8],[73,20],[70,21],[66,25],[60,25],[56,26],[52,25],[50,29],[48,30],[44,29],[40,32],[35,36],[36,38],[33,36],[28,37],[26,38],[23,37],[20,40],[15,38],[10,38],[5,37],[0,36],[-2,37],[-6,36],[-10,36]],
  britain: [[-5,50],[-3,53],[-5,56],[-3,58],[0,58],[1,52],[0,50],[-5,50]],
  iceland: [[-22,64],[-14,64],[-13,66],[-18,66],[-22,66],[-22,64]],
  japan: [[130,31],[133,33],[137,35],[140,36],[141,39],[142,43],[143,45],[141,42],[139,38],[136,35],[132,33],[130,31]],
  australia: [[113,-22],[113,-28],[115,-33],[118,-35],[125,-33],[130,-32],[132,-32],[135,-35],[136,-33],[138,-35],[140,-38],[145,-38],[147,-38],[150,-37],[153,-32],[153,-27],[151,-23],[146,-19],[142,-15],[142,-11],[136,-12],[132,-11],[126,-14],[122,-17],[116,-20],[113,-22]],
  tasmania: [[145,-41],[148,-41],[148,-43],[145,-43],[145,-41]],
  newZealand: [[167,-45],[170,-43],[173,-40],[175,-37],[176,-38],[174,-42],[171,-46],[167,-47],[167,-45]],
  madagascar: [[44,-12],[50,-12],[50,-16],[47,-25],[44,-20],[44,-12]],
  newGuinea: [[131,-1],[138,-3],[145,-6],[150,-9],[147,-8],[140,-8],[133,-4],[131,-2],[131,-1]],
  indonesia: [[95,5],[105,0],[115,-3],[125,-5],[135,-3],[140,0],[135,3],[125,5],[115,5],[105,5],[95,5]],
  philippines: [[120,18],[122,14],[124,10],[126,7],[124,8],[122,12],[120,16],[120,18]],
  sriLanka: [[80,9],[82,9],[82,6],[80,6],[80,9]],
};

const W = 1000;
const H = 520;
const px = (lon) => ((lon + 180) / 360) * W;
const py = (lat) => ((90 - lat) / 180) * H;

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const landPaths = Object.entries(LAND)
  .map(
    ([name, pts]) =>
      `<path class="atx-land" data-land="${name}" d="M${pts.map(([lo, la]) => `${px(lo).toFixed(1)},${py(la).toFixed(1)}`).join('L')}Z"/>`
  )
  .join('\n      ');

const graticule = [];
for (let lon = -150; lon <= 150; lon += 30) graticule.push(`<line class="atx-grat" x1="${px(lon)}" y1="0" x2="${px(lon)}" y2="${H}"/>`);
for (let lat = -60; lat <= 60; lat += 30) graticule.push(`<line class="atx-grat" x1="0" y1="${py(lat)}" x2="${W}" y2="${py(lat)}"/>`);

function marker(site) {
  const cx = px(site.lon).toFixed(1);
  const cy = py(site.lat).toFixed(1);
  const n = site.deities.length;
  const r = n > 1 ? 7 : n === 1 ? 6 : 4.5;
  return `<button class="atx-marker${n ? '' : ' atx-marker--quiet'}" style="left:${(cx / W) * 100}%;top:${(cy / H) * 100}%" data-site="${site.id}" aria-label="${esc(site.name)}"><span style="width:${r * 2}px;height:${r * 2}px"></span></button>`;
}

function dossier(site) {
  const beings = site.deities
    .map((d) => {
      const e = entryById.get(d.id);
      if (!e) return '';
      return `<a class="atx-chip" href="/${e.id}/">${esc(e.unicode)}</a><p class="atx-depict">${esc(d.depiction)}</p>`;
    })
    .join('');
  const note = site.deityNote ? `<p class="atx-note">${esc(site.deityNote)}</p>` : '';
  const imgs = (site.images || [])
    .map(
      (im) => `<figure class="atx-fig"><img src="${esc(im.src)}" alt="${esc(im.title || site.name)}" loading="lazy" decoding="async">
<figcaption>${esc(im.title || '')}${im.license ? ` · <span class="atx-lic">${esc(im.license)}</span>` : ''}${im.artist ? ` · ${esc(im.artist)}` : ''}</figcaption></figure>`
    )
    .join('');
  const srcs = (site.sources || []).map((s) => `<li>${esc(s)}</li>`).join('');
  return `<article class="atx-site" id="site-${site.id}" data-tradition="${esc(site.tradition)}" data-name="${esc(site.name.toLowerCase())}">
  <header class="atx-site-head">
    <h3>${esc(site.name)}</h3>
    ${site.nativeName ? `<p class="atx-native">${esc(site.nativeName)}</p>` : ''}
  </header>
  <p class="atx-meta">${esc(site.place)} · ${esc(site.country)} · ${esc(site.era)} · <a href="/${site.tradition === 'greek-location' ? 'atlas' : esc(site.tradition)}/">${esc(site.tradition)}</a></p>
  <p class="atx-summary">${esc(site.summary || '')}</p>
  ${beings ? `<div class="atx-beings"><p class="atx-label">Digital temples of its beings</p>${beings}</div>` : ''}
  ${note}
  ${imgs ? `<div class="atx-gallery">${imgs}</div>` : ''}
  ${srcs ? `<div class="atx-sources"><p class="atx-label">Sources</p><ul>${srcs}</ul></div>` : ''}
</article>`;
}

const markers = DATA.sites.map(marker).join('\n      ');
const dossiers = DATA.sites.map(dossier).join('\n');
const withDeity = DATA.sites.filter((s) => s.deities.length).length;
const jsonld = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'The Sacred Atlas',
  url: 'https://punicodex.com/world/sacred/',
  description: DATA.subtitle,
  isPartOf: { '@type': 'WebSite', name: 'PuniCodex', url: 'https://punicodex.com/' },
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#050505">
<title>The Sacred Atlas — Where the Physical World Meets the Digital Temples | PuniCodex</title>
<meta name="description" content="${esc(DATA.subtitle)}">
<link rel="canonical" href="https://punicodex.com/world/sacred/">
<meta property="og:type" content="website">
<meta property="og:title" content="The Sacred Atlas">
<meta property="og:description" content="${esc(DATA.subtitle)}">
<meta property="og:url" content="https://punicodex.com/world/sacred/">
<meta property="og:image" content="https://punicodex.com/assets/images/og-default.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="/assets/brand/02-favicons/favicon.svg">
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<style>
:root{--gold:#d4af37;--gold-dim:rgba(212,175,55,.35);--ivory:#f5f1e6;--dim:#b8b2a2;--void:#050505;--line:rgba(245,241,230,.12)}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--void);color:var(--ivory);font-family:'Cormorant Garamond',Georgia,serif}
a{color:var(--gold)}
.atx-hero{padding:6.5rem 1.5rem 2.5rem;text-align:center;background:radial-gradient(ellipse 100% 60% at 50% -10%,rgba(212,175,55,.12),transparent 60%)}
.atx-kicker{font-family:'Montserrat',sans-serif;font-size:.7rem;letter-spacing:.4em;text-transform:uppercase;color:var(--gold)}
.atx-hero h1{font-size:clamp(2.6rem,7vw,5rem);letter-spacing:.14em;margin:.7rem 0 1rem}
.atx-hero p{max-width:64ch;margin:0 auto;color:var(--dim);line-height:1.7}
.atx-stats{display:flex;gap:2.2rem;justify-content:center;margin-top:1.8rem;font-family:'Montserrat',sans-serif;font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:var(--dim);flex-wrap:wrap}
.atx-stats b{display:block;font-size:1.5rem;color:var(--gold);letter-spacing:0}
.atx-mapwrap{position:relative;max-width:1080px;margin:2.5rem auto 0;padding:0 1rem}
.atx-map{display:block;width:100%;height:auto;background:linear-gradient(180deg,rgba(212,175,55,.03),transparent 40%),var(--void);border:1px solid var(--line);border-radius:14px}
.atx-grat{stroke:rgba(245,241,230,.06);stroke-width:1}
.atx-land{fill:rgba(245,241,230,.045);stroke:rgba(212,175,55,.28);stroke-width:1;stroke-linejoin:round}
.atx-marker{position:absolute;transform:translate(-50%,-50%);appearance:none;border:0;background:transparent;cursor:pointer;padding:6px}
.atx-marker span{display:block;border-radius:50%;background:var(--gold);box-shadow:0 0 10px rgba(212,175,55,.7);transition:transform .15s}
.atx-marker:hover span{transform:scale(1.5)}
.atx-marker--quiet span{background:transparent;border:1.5px solid var(--gold-dim);box-shadow:none}
.atx-marker.active span{transform:scale(1.6);outline:2px solid var(--ivory);outline-offset:2px}
.atx-panel{position:fixed;top:0;right:0;height:100vh;width:min(30rem,94vw);background:#0a0a0c;border-left:1px solid var(--gold-dim);z-index:60;overflow-y:auto;padding:2rem 1.6rem;transform:translateX(102%);transition:transform .3s ease;overscroll-behavior:contain}
.atx-panel.open{transform:none}
.atx-panel-close{position:sticky;top:0;float:right;appearance:none;border:1px solid var(--gold-dim);background:var(--void);color:var(--gold);border-radius:50%;width:2.2rem;height:2.2rem;font-size:1rem;cursor:pointer}
.atx-panel h2{font-size:1.9rem;margin:.4rem 0 .2rem}
.atx-panel .atx-native{color:var(--gold);font-size:1.1rem;margin-bottom:.8rem}
.atx-panel .atx-meta,.atx-panel .atx-summary{color:var(--dim);line-height:1.65;margin-bottom:1rem}
.atx-panel .atx-depict{color:var(--dim);font-style:italic;font-size:.95rem;margin:.3rem 0 .8rem;line-height:1.55}
.atx-panel .atx-note{color:var(--dim);font-size:.9rem;border-left:2px solid var(--gold-dim);padding-left:.8rem;margin-bottom:1rem;line-height:1.6}
.atx-panel .atx-sources ul{list-style:none}
.atx-panel .atx-sources li{color:var(--dim);font-size:.85rem;padding-left:1.1rem;position:relative;margin-bottom:.3rem}
.atx-panel .atx-sources li::before{content:"—";position:absolute;left:0;color:var(--gold)}
.atx-label{font-family:'Montserrat',sans-serif;font-size:.6rem;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);margin-bottom:.5rem}
.atx-chip{display:inline-block;font-family:'Montserrat',sans-serif;font-size:.82rem;color:var(--ivory);text-decoration:none;border:1px solid var(--gold-dim);border-radius:999px;padding:.35rem .9rem;margin:0 .4rem .5rem 0;transition:all .2s}
.atx-chip:hover{background:var(--gold);color:var(--void)}
.atx-fig{margin:.8rem 0}
.atx-fig img{width:100%;border-radius:10px;border:1px solid var(--line)}
.atx-fig figcaption{font-size:.8rem;color:var(--dim);margin-top:.35rem}
.atx-lic{color:var(--gold)}
.atx-register{max-width:62rem;margin:4rem auto;padding:0 1.2rem}
.atx-register h2{font-size:2rem;margin-bottom:.4rem}
.atx-register>p{color:var(--dim);margin-bottom:1.6rem}
.atx-filter{display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.6rem}
.atx-filter button{appearance:none;font-family:'Montserrat',sans-serif;font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);background:transparent;border:1px solid var(--line);border-radius:999px;padding:.42rem .95rem;cursor:pointer;transition:all .2s}
.atx-filter button.active,.atx-filter button:hover{color:var(--void);background:var(--gold);border-color:var(--gold)}
.atx-site{border:1px solid var(--line);border-radius:12px;padding:1.4rem 1.5rem;margin-bottom:1.1rem;scroll-margin-top:5.5rem}
.atx-site:target{border-color:var(--gold-dim)}
.atx-site h3{font-size:1.5rem}
.atx-native{color:var(--gold);margin-bottom:.5rem}
.atx-meta{font-family:'Montserrat',sans-serif;font-size:.74rem;color:var(--dim);letter-spacing:.05em;margin-bottom:.7rem}
.atx-summary{line-height:1.65;color:var(--ivory);margin-bottom:1rem}
.atx-note{color:var(--dim);font-size:.92rem;border-left:2px solid var(--gold-dim);padding-left:.8rem;margin:1rem 0;line-height:1.6}
.atx-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.8rem;margin:1rem 0}
.atx-sources ul{list-style:none;margin-top:.3rem}
.atx-sources li{color:var(--dim);font-size:.85rem;padding-left:1.1rem;position:relative;margin-bottom:.25rem}
.atx-sources li::before{content:"—";position:absolute;left:0;color:var(--gold)}
@media (max-width:720px){
  .atx-hero{padding-top:5rem}
  .atx-panel{width:100vw;border-left:0}
}
@media (prefers-reduced-motion:reduce){.atx-panel{transition:none}.atx-marker span{transition:none}}
</style>
</head>
<body>
<header class="atx-hero">
  <p class="atx-kicker">The Sacred Atlas</p>
  <h1>WHERE THE GODS LEFT STONE</h1>
  <p>${esc(DATA.subtitle)}</p>
  <div class="atx-stats" role="list">
    <span role="listitem"><b>${DATA.sites.length}</b>Sacred sites</span>
    <span role="listitem"><b>${withDeity}</b>Linked to digital temples</span>
    <span role="listitem"><b>25</b>Pantheon traditions</span>
  </div>
</header>
<div class="atx-mapwrap">
  <svg class="atx-map" viewBox="0 0 ${W} ${H}" role="img" aria-label="Geometric world map of sacred sites">
    ${graticule.join('\n    ')}
    ${landPaths}
  </svg>
  ${markers}
</div>
<aside class="atx-panel" id="atx-panel" aria-label="Site dossier" aria-hidden="true">
  <button class="atx-panel-close" id="atx-close" aria-label="Close">&times;</button>
  <div id="atx-panel-body"></div>
</aside>
<section class="atx-register" id="register">
  <h2>The Register</h2>
  <p>${esc(DATA.note)}</p>
  <div class="atx-filter" id="atx-filter" role="group" aria-label="Filter by tradition"></div>
  ${dossiers}
</section>
<script src="/js/newsletter.js" defer></script>
<script>
(function(){
  const SITES=${JSON.stringify(DATA.sites)};
  const UNICODE=${JSON.stringify(Object.fromEntries(LEXICON.map((e) => [e.id, e.unicode])))};
  const byId=Object.fromEntries(SITES.map(s=>[s.id,s]));
  const panel=document.getElementById('atx-panel'),body=document.getElementById('atx-panel-body'),closeBtn=document.getElementById('atx-close');
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function open(id){
    const s=byId[id];if(!s)return;
    document.querySelectorAll('.atx-marker.active').forEach(m=>m.classList.remove('active'));
    const mk=document.querySelector('.atx-marker[data-site="'+id+'"]');if(mk)mk.classList.add('active');
    const beings=(s.deities||[]).map(d=>'<a class="atx-chip" href="/'+d.id+'/">'+esc(UNICODE[d.id]||d.id)+'</a><p class="atx-depict">'+esc(d.depiction)+'</p>').join('');
    const note=s.deityNote?'<p class="atx-note">'+esc(s.deityNote)+'</p>':'';
    const srcs=(s.sources||[]).map(x=>'<li>'+esc(x)+'</li>').join('');
    body.innerHTML='<h2>'+esc(s.name)+'</h2>'+(s.nativeName?'<p class="atx-native">'+esc(s.nativeName)+'</p>':'')+
      '<p class="atx-meta">'+esc(s.place)+' · '+esc(s.country)+' · '+esc(s.era)+'</p>'+
      (s.summary?'<p class="atx-summary">'+esc(s.summary)+'</p>':'')+
      (beings?'<p class="atx-label">Digital temples of its beings</p>'+beings:'')+note+
      (srcs?'<div class="atx-sources"><p class="atx-label">Sources</p><ul>'+srcs+'</ul></div>':'')+
      '<p><a class="atx-chip" href="#site-'+s.id+'">Open the full dossier below ↓</a></p>';
    panel.classList.add('open');panel.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }
  function close(){panel.classList.remove('open');panel.setAttribute('aria-hidden','true');document.body.style.overflow='';document.querySelectorAll('.atx-marker.active').forEach(m=>m.classList.remove('active'));}
  document.querySelectorAll('.atx-marker').forEach(m=>m.addEventListener('click',()=>open(m.dataset.site)));
  closeBtn.addEventListener('click',close);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  // register: hash-open, filter, in-page search via native anchor
  const traditions=[...new Set(SITES.map(s=>s.tradition))].sort();
  const filter=document.getElementById('atx-filter');
  filter.innerHTML='<button class="active" data-t="all">All · '+SITES.length+'</button>'+traditions.map(t=>{
    const n=SITES.filter(s=>s.tradition===t).length;
    return '<button data-t="'+t+'">'+t+' · '+n+'</button>';}).join('');
  filter.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    filter.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
    const t=b.dataset.t;
    document.querySelectorAll('.atx-site').forEach(el=>{el.style.display=(t==='all'||el.dataset.tradition===t)?'':'none';});
  });
  if(location.hash.startsWith('#site-')){const el=document.querySelector(location.hash);if(el)el.scrollIntoView();}
})();
</script>
</body>
</html>
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`Sacred Atlas: wrote ${path.relative(ROOT, OUT)} (${DATA.sites.length} sites, ${withDeity} with deity links, ${html.length} bytes)`);
