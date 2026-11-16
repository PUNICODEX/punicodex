#!/usr/bin/env node
/**
 * PuniCodex — per-name Pronunciation pages.
 *
 * Writes sites/{id}/pronunciation/index.html for every lexicon entry with a
 * built temple: a dedicated, indexable surface for "how to pronounce X"
 * queries — IPA, respelling, syllable stress, mora timing, per-sound notes,
 * SSML. Each page links back to its temple (no orphan pages), carries the
 * canonical tab-nav chrome, and rides the /{id}/* middleware rewrite.
 *
 * Data comes from the canonical engine (type/js/pronunciation-rules.js) — the
 * same derivation the temple "Say it right" panels and the API serve.
 *
 * Usage: node scripts/generate-pronunciation-pages.js [--only id1,id2]
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { writeFileWithRetry } = require('./write-file-retry.js');
const { footerHtml } = require('./sync-footer.js');
const { templeTabNavHtml } = require('./lib/temple-tab-nav.js');
const { LEXICON } = require(path.join(__dirname, '..', 'type', 'js', 'lexicon.js'));
const { derivePronunciation } = require(path.join(__dirname, '..', 'type', 'js', 'pronunciation-rules.js'));

const ROOT = path.join(__dirname, '..');
const SITE_ORIGIN = 'https://punicodex.com';

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx > -1 ? new Set(process.argv[onlyIdx + 1].split(',')) : null;

const CSS = `
.wrap{max-width:900px;margin:0 auto;padding-left:max(1.25rem,env(safe-area-inset-left));padding-right:max(1.25rem,env(safe-area-inset-right))}
.pr-hero{text-align:center;padding:4.5rem 0 1.5rem}
.pr-hero h1{font-size:clamp(1.7rem,6vw,2.5rem);margin:.4rem 0 .6rem;overflow-wrap:anywhere}
.pr-hero .tag{max-width:60ch;margin:0 auto;color:var(--text-dim,#9a948a)}
.pr-pill{display:inline-block;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;border:1px solid rgba(212,175,55,.3);border-radius:999px;padding:.22rem .7rem;color:#d4af37;margin-bottom:1rem}
.pr-ipa-card{border:1px solid var(--line);border-radius:14px;padding:2rem 1.5rem;margin:2rem 0;text-align:center;background:var(--card)}
.pr-ipa{font-size:clamp(1.8rem,7vw,2.8rem);color:var(--gold,#d4af37);font-family:'Spectral',Georgia,serif;margin:.2rem 0 .4rem}
.pr-ipa-label{font-size:.78rem;color:var(--dim,#8a8577);letter-spacing:.04em}
.pr-respelling{font-size:1.05rem;letter-spacing:.14em;color:var(--ink);margin:.8rem 0 .2rem}
.pr-syll{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin:1.4rem 0 .6rem}
.pr-syl{border:1px solid var(--line);border-radius:10px;padding:.5rem .9rem;font-size:1.05rem;background:#0e0e12}
.pr-syl.stressed{border-color:var(--gold,#d4af37);color:var(--gold,#d4af37)}
.pr-syl .str::before{content:'ˈ';opacity:.7}
.pr-meta{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin:.6rem 0 0}
.pr-chip{font-size:.74rem;color:var(--dim);border:1px solid var(--line);border-radius:999px;padding:.25rem .8rem}
.pr-notes{list-style:none;margin:1.6rem auto 0;padding:0;max-width:640px;text-align:left}
.pr-notes li{padding:.7rem 0;border-top:1px solid var(--line);color:var(--text-dim);line-height:1.7;font-size:.95rem}
.pr-notes li:first-child{border-top:none}
.pr-notes code{color:var(--gold,#d4af37);font-size:.9em}
.pr-rule{margin-top:1.4rem;font-size:.82rem;color:var(--dim);font-style:italic}
.pr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:1rem;margin:2.5rem 0 4rem}
.pr-card{border:1px solid var(--line);border-radius:12px;padding:1.2rem 1.3rem;background:var(--card)}
.pr-card h2{font-size:1rem;color:var(--gold,#d4af37);margin:0 0 .5rem;font-family:'Cinzel',serif}
.pr-card p{font-size:.88rem;color:var(--text-dim);line-height:1.7;margin:0 0 .6rem}
.pr-card a{color:var(--gold,#d4af37)}
.pr-card code{display:block;background:#0a0a0c;border:1px solid var(--line);border-radius:8px;padding:.6rem .8rem;font-size:.78rem;color:#c8c2b6;overflow-x:auto;white-space:pre-wrap;word-break:break-all}
details.pr-ssml{margin:0 0 0}
details.pr-ssml summary{cursor:pointer;color:var(--gold,#d4af37);font-size:.85rem;letter-spacing:.06em}
.temple-breadcrumb{position:relative;z-index:5;max-width:var(--container-max,1200px);margin:0 auto;padding:calc(var(--global-strip-height,54px) + var(--nav-height,110px) + .75rem) 1.5rem 0;font-size:.78rem;letter-spacing:.04em}
.temple-breadcrumb-list{list-style:none;display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;margin:0;padding:0}
.temple-breadcrumb-list li{display:flex;align-items:center;gap:.4rem;color:var(--white-dim,#a0a0a0)}
.temple-breadcrumb-list li+li::before{content:'›';color:var(--primary,#d4af37);opacity:.55}
.temple-breadcrumb-list a{color:var(--white-dim,#a0a0a0)}
.temple-breadcrumb-list a:hover{color:var(--primary-bright,#f0d878)}
.temple-breadcrumb-list [aria-current]{color:var(--primary,#d4af37)}
`;

function renderPage(entry) {
  const id = entry.id;
  let derived;
  try {
    derived = derivePronunciation(entry);
  } catch {
    return null; // engine has no inventory for this tradition — no page, no orphan
  }
  if (!derived || !derived.ipa) return null;

  const name = entry.unicode;
  const timing = derived.timing || {};
  const syllables = derived.syllables || [];
  const stressIndex = derived.stressIndex ?? 0;
  const syllHtml = syllables
    .map((s, i) => `<span class="pr-syl${i === stressIndex ? ' stressed' : ''}">${i === stressIndex ? `<span class="str"></span>` : ''}${esc(s)}</span>`)
    .join('');
  const notes = (derived.notes || [])
    .map((n) => {
      const idx = n.indexOf(' — ');
      const bit = idx > 0 ? `<code>${esc(n.slice(0, idx))}</code>${esc(n.slice(idx))}` : esc(n);
      return `<li>${bit}</li>`;
    })
    .join('');
  const ssml = derived.ssml || '';

  const title = `How to pronounce ${name} — IPA, syllables & stress | PUNICODEX`;
  const descSeed = `Pronounce ${name} (${entry.ascii}): IPA ${derived.ipa}${syllables.length ? `, ${syllables.length} syllable${syllables.length > 1 ? 's' : ''}` : ''}${derived.conventional ? ' — conventional reading' : ' — derived from restored orthography'}.`;
  const desc = descSeed.length <= 160 ? descSeed : `Pronounce ${name} (${entry.ascii}): IPA ${derived.ipa}, derived from restored orthography by the PuniCodex engine.`;

  const templeCss = fs.existsSync(path.join(ROOT, 'sites', id, 'styles.css'))
    ? fs.readFileSync(path.join(ROOT, 'sites', id, 'styles.css'), 'utf8').replace(/\r\n/g, '\n')
    : '';
  const cssPin = crypto.createHash('md5').update(templeCss).digest('hex').slice(0, 10);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description: desc,
    url: `${SITE_ORIGIN}/${id}/pronunciation/`,
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.pr-ipa', '.pr-respelling'] },
    about: {
      '@type': 'Thing',
      name,
      alternateName: [entry.ascii].filter((n) => n !== name),
    },
    isPartOf: { '@type': 'WebSite', name: 'PuniCodex', url: `${SITE_ORIGIN}/` },
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Pantheon', item: `${SITE_ORIGIN}/pantheon/` },
      { '@type': 'ListItem', position: 3, name, item: `${SITE_ORIGIN}/${id}/` },
      { '@type': 'ListItem', position: 4, name: 'Pronunciation', item: `${SITE_ORIGIN}/${id}/pronunciation/` },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="google" content="notranslate">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE_ORIGIN}/${id}/pronunciation/">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE_ORIGIN}/${id}/pronunciation/">
<meta property="og:image" content="${SITE_ORIGIN}/assets/og/${id}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE_ORIGIN}/assets/og/${id}.jpg">
<link rel="icon" type="image/svg+xml" href="/assets/brand/02-favicons/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/02-favicons/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/assets/brand/02-favicons/favicon-16x16.png">
<link rel="icon" href="/assets/brand/02-favicons/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/assets/brand/02-favicons/apple-touch-icon.png">
<link rel="manifest" href="/assets/brand/06-code/site.webmanifest">
<meta name="theme-color" content="#0A0A0C">
<link rel="stylesheet" href="/assets/fonts/fonts.css?v=8c5b8a17eb">
<link rel="stylesheet" href="../styles.css?v=${cssPin}">
<link rel="stylesheet" href="/css/temple-base.css?v=perf25">
<link rel="stylesheet" href="/css/footer.css?v=8">
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c')}</script>
<style>
${CSS}
</style>
</head>
<body class="temple-page">
${templeTabNavHtml(id, name, '')}
    <nav class="temple-breadcrumb" aria-label="Breadcrumb">
        <ol class="temple-breadcrumb-list">
            <li><a href="${SITE_ORIGIN}/">Home</a></li>
            <li><a href="${SITE_ORIGIN}/pantheon/">Pantheon</a></li>
            <li><a href="${SITE_ORIGIN}/${id}/">${esc(name)}</a></li>
            <li><span aria-current="page">Pronunciation</span></li>
        </ol>
    </nav>

<main class="wrap">
  <div class="pr-hero">
    <span class="pr-pill">${derived.conventional ? 'Conventional reading' : 'Derived from restored orthography'}</span>
    <h1>How to pronounce ${esc(name)}</h1>
    <p class="tag">${esc(entry.pantheon ? entry.pantheon.charAt(0).toUpperCase() + entry.pantheon.slice(1) : 'Mythological')} name — ${esc(entry.domain || '')}${entry.meaning ? ` · “${esc(entry.meaning.split(/(?<=[.!?])\\s/)[0])}”` : ''}</p>
  </div>

  <div class="pr-ipa-card">
    <div class="pr-ipa">${esc(derived.ipa)}</div>
    <div class="pr-ipa-label">${esc(derived.ipaLabel || '')}</div>
    <div class="pr-respelling">${esc(derived.respelling || '')}</div>
    ${syllHtml ? `<div class="pr-syll">${syllHtml}</div>` : ''}
    <div class="pr-meta">
      ${timing.beats ? `<span class="pr-chip">rhythm ${esc(timing.beats)}</span>` : ''}
      ${timing.totalMorae ? `<span class="pr-chip">${timing.totalMorae} morae</span>` : ''}
      ${timing.durationMs ? `<span class="pr-chip">≈${timing.durationMs} ms</span>` : ''}
      ${timing.model ? `<span class="pr-chip">${esc(timing.model)}</span>` : ''}
    </div>
    ${notes ? `<ul class="pr-notes">${notes}</ul>` : ''}
    <p class="pr-rule">Derived by the PuniCodex pronunciation engine — rule-based, per-pantheon phoneme inventories; method at <a href="/pronunciation/">The Pronunciation Standard</a>.</p>
    ${ssml ? `<details class="pr-ssml"><summary>SSML for voice engines</summary><code>${esc(ssml)}</code></details>` : ''}
  </div>

  <div class="pr-grid">
    <div class="pr-card">
      <h2>The Temple</h2>
      <p>${esc(name)}'s full temple — original script, mythology, industry patterns, the Reliquary.</p>
      <a href="${SITE_ORIGIN}/${id}/">Enter the temple of ${esc(name)} →</a>
    </div>
    <div class="pr-card">
      <h2>The Lore</h2>
      <p>The myths and sources behind the name, and why its spelling matters.</p>
      <a href="${SITE_ORIGIN}/${id}/lore/">Read the lore of ${esc(name)} →</a>
    </div>
    <div class="pr-card">
      <h2>The API</h2>
      <p>This same derivation, machine-readable — IPA, respelling, syllables, SSML.</p>
      <a href="${SITE_ORIGIN}/api/v1/names/${id}/pronunciation"><code>GET /api/v1/names/${id}/pronunciation</code></a>
    </div>
  </div>
</main>
${footerHtml()}
<script src="/js/temple-base.js?v=2903489bdd" defer></script>
</body>
</html>
`;
}

let wrote = 0;
let skipped = 0;
for (const entry of LEXICON) {
  if (only && !only.has(entry.id)) continue;
  if (!fs.existsSync(path.join(ROOT, 'sites', entry.id, 'index.html'))) { skipped++; continue; }
  const html = renderPage(entry);
  if (!html) { skipped++; continue; }
  const outDir = path.join(ROOT, 'sites', entry.id, 'pronunciation');
  fs.mkdirSync(outDir, { recursive: true });
  writeFileWithRetry(path.join(outDir, 'index.html'), html, 'utf8');
  wrote++;
}
console.log(`pronunciation pages: wrote ${wrote}, skipped ${skipped}`);
