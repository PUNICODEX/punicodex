#!/usr/bin/env node
/**
 * PuniCodex — per-name Etymology pages.
 *
 * Writes sites/{id}/etymology/index.html for every lexicon entry with a
 * built temple: a dedicated, indexable surface for "what does X mean" and
 * "origin of the name X" queries. Entries with structured etymology data
 * (proto-form, derivation chain, cognates) render the full apparatus;
 * entries without it render meaning, variants, and sources — so every page
 * is unique. Linked from each temple's Etymology section (no orphans).
 *
 * Usage: node scripts/generate-etymology-pages.js [--only id1,id2]
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { writeFileWithRetry } = require('./write-file-retry.js');
const { footerHtml } = require('./sync-footer.js');
const { templeNavHtml } = require('./lib/temple-tab-nav.js');
const { LEXICON } = require(path.join(__dirname, '..', 'type', 'js', 'lexicon.js'));

const ROOT = path.join(__dirname, '..');
const SITE_ORIGIN = 'https://punicodex.com';

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx > -1 ? new Set(process.argv[onlyIdx + 1].split(',')) : null;

const PROTO_LABELS = {
  'proto-indo-european': 'Proto-Indo-European',
  'proto-germanic': 'Proto-Germanic',
  'proto-afro-asiatic': 'Proto-Afro-Asiatic',
  'proto-polynesian': 'Proto-Polynesian',
  'proto-uto-aztecan': 'Proto-Uto-Aztecan',
  'proto-sino-tibetan': 'Proto-Sino-Tibetan',
  'proto-mayan': 'Proto-Mayan',
  isolate: 'Language isolate',
  unknown: 'Unknown',
};
const protoLabel = (l) => PROTO_LABELS[l] || (l ? l.charAt(0).toUpperCase() + l.slice(1) : '');

const CSS = `
.wrap{max-width:900px;margin:0 auto;padding-left:max(1.25rem,env(safe-area-inset-left));padding-right:max(1.25rem,env(safe-area-inset-right))}
.et-hero{text-align:center;padding:4.5rem 0 1.5rem}
.et-hero h1{font-size:clamp(1.7rem,6vw,2.5rem);margin:.4rem 0 .6rem;overflow-wrap:anywhere}
.et-hero .tag{max-width:60ch;margin:0 auto;color:var(--text-dim,#9a948a)}
.et-pill{display:inline-block;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;border:1px solid rgba(212,175,55,.3);border-radius:999px;padding:.22rem .7rem;color:#d4af37;margin-bottom:1rem}
.et-card{border:1px solid var(--line);border-radius:14px;padding:2rem 1.5rem;margin:2rem 0;background:var(--card)}
.et-meaning-big{font-size:clamp(1.3rem,4vw,1.8rem);color:var(--ink);font-family:'Spectral',Georgia,serif;margin:0 0 .6rem}
.et-proto{display:flex;flex-wrap:wrap;gap:.6rem;align-items:baseline;justify-content:center;margin:1.2rem 0 .4rem}
.et-proto-form{font-size:1.5rem;color:var(--gold,#d4af37);font-family:'Spectral',Georgia,serif}
.et-proto-gloss{color:var(--dim,#8a8577)}
.et-badge{font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;border:1px solid rgba(212,175,55,.4);border-radius:999px;padding:.2rem .7rem;color:#d4af37}
.et-derivation{color:var(--text-dim);line-height:1.8;margin:.8rem 0 0}
.et-table{width:100%;border-collapse:collapse;margin:1rem 0 0}
.et-table th,.et-table td{text-align:left;padding:.6rem .8rem;border-top:1px solid var(--line);font-size:.92rem}
.et-table th{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);border-top:none}
.et-table td{color:var(--text-dim)}
.et-cog-form{color:var(--gold,#d4af37);font-family:'Spectral',Georgia,serif;font-size:1.05rem}
.et-note{display:block;font-size:.8rem;color:var(--dim);margin-top:.15rem}
.et-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:1rem;margin:2.5rem 0 4rem}
.et-mini{border:1px solid var(--line);border-radius:12px;padding:1.2rem 1.3rem;background:var(--card)}
.et-mini h2{font-size:1rem;color:var(--gold,#d4af37);margin:0 0 .5rem;font-family:'Cinzel',serif}
.et-mini p{font-size:.88rem;color:var(--text-dim);line-height:1.7;margin:0 0 .6rem}
.et-mini a{color:var(--gold,#d4af37)}
.et-variants{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin:1rem 0 0}
.et-var{border:1px solid var(--line);border-radius:10px;padding:.4rem .9rem;font-size:.95rem;background:#0e0e12;color:var(--ink)}
.et-var small{display:block;color:var(--dim);font-size:.7rem;letter-spacing:.06em;text-transform:uppercase}
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
  const name = entry.unicode;
  const etym = entry.etymology || null;
  const hasStructured = etym && typeof etym === 'object';

  const meaningLead = entry.meaning ? entry.meaning.split(/(?<=[.!?])\s/)[0] : '';
  const title = hasStructured
    ? `The name ${name} — origin, meaning & cognates | PUNICODEX`
    : `What does ${name} mean? — name origin | PUNICODEX`;
  const descSeed = hasStructured && etym.protoForm
    ? `${name} comes from ${protoLabel(etym.protoLanguage)} ${etym.protoForm}${etym.protoGloss ? ` "${etym.protoGloss}"` : ''} — derivation, cognates, and the evidence behind the name.`
    : `${name}: the meaning and origin of the ${entry.pantheon || 'mythological'} name ${meaningLead ? `— ${meaningLead.charAt(0).toLowerCase()}${meaningLead.slice(1)}` : ''}, with attested variants and sources.`;
  const desc = descSeed.length <= 160 ? descSeed : `${descSeed.slice(0, 157).replace(/\s+\S*$/, '')}…`;

  const templeCss = fs.existsSync(path.join(ROOT, 'sites', id, 'styles.css'))
    ? fs.readFileSync(path.join(ROOT, 'sites', id, 'styles.css'), 'utf8').replace(/\r\n/g, '\n')
    : '';
  const cssPin = crypto.createHash('md5').update(templeCss).digest('hex').slice(0, 10);
  const hasTempleCss = fs.existsSync(path.join(ROOT, 'sites', id, 'styles.css'));

  const variants = Array.isArray(entry.variants) ? entry.variants.filter((v) => v.unicode) : [];
  const variantsHtml = variants.length
    ? `<div class="et-variants">${variants
        .map((v) => `<span class="et-var">${esc(v.unicode)}<small>${esc(v.type || 'variant')}</small></span>`)
        .join('')}</div>`
    : '';
  const sources = Array.isArray(entry.sources) ? entry.sources : [];

  const cognates = hasStructured && Array.isArray(etym.cognates) ? etym.cognates : [];
  const cogRows = cognates
    .map(
      (c) => `<tr>
        <td>${esc(protoLabel(c.language) || c.language)}</td>
        <td class="et-cog-form">${esc(c.form)}</td>
        <td>${esc(c.relationship || 'cognate')}${c.note ? `<span class="et-note">${esc(c.note)}</span>` : ''}</td>
      </tr>`
    )
    .join('');

  const body = hasStructured
    ? `
  <div class="et-card">
    <div class="et-proto">
      ${etym.protoLanguage ? `<span class="et-badge">${esc(protoLabel(etym.protoLanguage))}</span>` : ''}
      ${etym.protoForm ? `<span class="et-proto-form">${esc(etym.protoForm)}</span>` : ''}
      ${etym.protoGloss ? `<span class="et-proto-gloss">“${esc(etym.protoGloss)}”</span>` : ''}
    </div>
    ${etym.certainty ? `<div class="et-proto"><span class="et-badge" style="opacity:.8">${esc(etym.certainty)}</span></div>` : ''}
    ${etym.derivation ? `<p class="et-derivation">${esc(etym.derivation)}</p>` : ''}
    ${cogRows ? `<table class="et-table"><thead><tr><th>Language</th><th>Form</th><th>Relationship</th></tr></thead><tbody>${cogRows}</tbody></table>` : ''}
    ${variantsHtml}
  </div>`
    : `
  <div class="et-card">
    <p class="et-meaning-big">${esc(entry.meaning || entry.domain || '')}</p>
    <p class="et-derivation">The deep proto-form of <strong>${esc(name)}</strong> is not securely reconstructed in the PUNICODEX record; the attested ${esc(entry.pantheon || '')} tradition and its scholarly sources carry what is known.</p>
    ${variantsHtml}
  </div>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description: desc,
    url: `${SITE_ORIGIN}/${id}/etymology/`,
    about: {
      '@type': 'Thing',
      name,
      alternateName: [entry.ascii].filter((n) => n !== name),
      ...(meaningLead ? { description: meaningLead } : {}),
    },
    isPartOf: { '@type': 'WebSite', name: 'PuniCodex', url: `${SITE_ORIGIN}/` },
  };
  if (hasStructured && etym.protoForm) {
    jsonLd.about.etymology = { '@type': 'Text', text: `${protoLabel(etym.protoLanguage)} ${etym.protoForm}${etym.protoGloss ? ` "${etym.protoGloss}"` : ''}` };
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Pantheon', item: `${SITE_ORIGIN}/pantheon/` },
      { '@type': 'ListItem', position: 3, name, item: `${SITE_ORIGIN}/${id}/` },
      { '@type': 'ListItem', position: 4, name: 'Etymology', item: `${SITE_ORIGIN}/${id}/etymology/` },
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
<link rel="canonical" href="${SITE_ORIGIN}/${id}/etymology/">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE_ORIGIN}/${id}/etymology/">
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
${hasTempleCss ? '<link rel="stylesheet" href="../styles.css?v=${cssPin}">' : ''}
<link rel="stylesheet" href="/css/temple-base.css?v=perf26">
<link rel="stylesheet" href="/css/footer.css?v=8">
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c')}</script>
<style>
${CSS}
</style>
</head>
<body class="temple-page">
${templeNavHtml(id, name, '')}
    <nav class="temple-breadcrumb" aria-label="Breadcrumb">
        <ol class="temple-breadcrumb-list">
            <li><a href="${SITE_ORIGIN}/">Home</a></li>
            <li><a href="${SITE_ORIGIN}/pantheon/">Pantheon</a></li>
            <li><a href="${SITE_ORIGIN}/${id}/">${esc(name)}</a></li>
            <li><span aria-current="page">Etymology</span></li>
        </ol>
    </nav>

<main class="wrap">
  <div class="et-hero">
    <span class="et-pill">${hasStructured ? 'Etymology & word family' : 'Name meaning'}</span>
    <h1>${hasStructured ? `The name ${esc(name)}` : `What does “${esc(name)}” mean?`}</h1>
    <p class="tag">${esc(entry.pantheon ? entry.pantheon.charAt(0).toUpperCase() + entry.pantheon.slice(1) : 'Mythological')} — ${esc(entry.domain || '')}</p>
  </div>
${body}
  <div class="et-grid">
    <div class="et-mini">
      <h2>The Temple</h2>
      <p>The full temple of ${esc(name)} — original script, pronunciation, patterns, the Reliquary.</p>
      <a href="${SITE_ORIGIN}/${id}/">Enter the temple of ${esc(name)} →</a>
    </div>
    <div class="et-mini">
      <h2>Pronunciation</h2>
      <p>How the name sounds — IPA, syllables, stress, derived from the restored orthography.</p>
      <a href="${SITE_ORIGIN}/${id}/pronunciation/">How to pronounce ${esc(name)} →</a>
    </div>
    ${
      sources.length
        ? `<div class="et-mini">
      <h2>Sources</h2>
      <p>${sources.slice(0, 4).map((s) => esc(s)).join(' · ')}</p>
      <a href="${SITE_ORIGIN}/${id}/">The full source record lives on the temple →</a>
    </div>`
        : ''
    }
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
  if (!entry.meaning && !entry.etymology) { skipped++; continue; }
  const outDir = path.join(ROOT, 'sites', entry.id, 'etymology');
  fs.mkdirSync(outDir, { recursive: true });
  writeFileWithRetry(path.join(outDir, 'index.html'), renderPage(entry), 'utf8');
  wrote++;
}
console.log(`etymology pages: wrote ${wrote}, skipped ${skipped}`);
