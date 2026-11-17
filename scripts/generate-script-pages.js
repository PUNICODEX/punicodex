#!/usr/bin/env node
/**
 * PuniCodex — per-name Original Script pages.
 *
 * Writes sites/{id}/script/index.html for every lexicon entry with a real
 * attested script (hasOriginalScript — the doctrine: "Original Script" only
 * when a genuine writing system exists; scriptless traditions get NO page
 * here, their transliteration stays on the temple). Each page renders the
 * attested specimen, per-sign breakdown, transmission steps, transliteration
 * scheme, and sources — the dedicated, indexable surface for "how do you
 * write X in Egyptian/Greek/runes" queries. Linked from each temple's
 * Original Script card / provenance section (no orphans).
 *
 * Usage: node scripts/generate-script-pages.js [--only id1,id2]
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { writeFileWithRetry } = require('./write-file-retry.js');
const { footerHtml } = require('./sync-footer.js');
const { templeTabNavHtml } = require('./lib/temple-tab-nav.js');
const { LEXICON } = require(path.join(__dirname, '..', 'type', 'js', 'lexicon.js'));
const {
  getOriginalScript,
  getScriptName,
  getOriginalScriptLabel,
  hasOriginalScript,
  getProvenance,
} = require(path.join(__dirname, '..', 'type', 'js', 'original-scripts.js'));

const ROOT = path.join(__dirname, '..');
const SITE_ORIGIN = 'https://punicodex.com';

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Provenance strings that mark the SPECIMEN itself as a scholarly reconstruction
// (not merely a reconstructed vocalisation on an attested script — Egyptian,
// Phoenician, Ugaritic and Sumerian specimens stay "the attested original script").
const RECONSTRUCTION_MARKERS = [
  /normalized phonetic reconstruction/i, // Norse Younger Futhark normalizations, wyrd
  /attestation or normalized reconstruction/i, // hedged Viking-Age forms
  /not attested in runic inscriptions/i, // sleipnir
  /no direct runic inscription/i, // mani
  /not an attested inscription/i, // wyrd
  /do not preserve the name directly/i, // bifrost
  /(?:is|as) a (?:normalized |scholarly )+reconstruction/i, // sigurd, jord, mani
  /the vowels are reconstructed/i, // nut (audit-verified reconstruction case)
];

function isReconstructedSpecimen(prov) {
  if (!prov) return false;
  const parts = [
    prov.phoneticReconstruction,
    prov.normalizedReading,
    prov.etymology,
    ...(Array.isArray(prov.steps) ? prov.steps : []),
    ...(Array.isArray(prov.uncertainties) ? prov.uncertainties : []),
  ].filter((s) => typeof s === 'string');
  const text = parts.join('\n');
  return RECONSTRUCTION_MARKERS.some((re) => re.test(text));
}

const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx > -1 ? new Set(process.argv[onlyIdx + 1].split(',')) : null;

const CSS = `
.wrap{max-width:900px;margin:0 auto;padding-left:max(1.25rem,env(safe-area-inset-left));padding-right:max(1.25rem,env(safe-area-inset-right))}
.sc-hero{text-align:center;padding:4.5rem 0 1.5rem}
.sc-hero h1{font-size:clamp(1.7rem,6vw,2.5rem);margin:.4rem 0 .6rem;overflow-wrap:anywhere}
.sc-hero .tag{max-width:60ch;margin:0 auto;color:var(--text-dim,#9a948a)}
.sc-pill{display:inline-block;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;border:1px solid rgba(212,175,55,.3);border-radius:999px;padding:.22rem .7rem;color:#d4af37;margin-bottom:1rem}
.sc-altar{border:1px solid rgba(212,175,55,.35);border-radius:16px;padding:3rem 1.5rem;margin:2rem 0;text-align:center;background:radial-gradient(ellipse at center,rgba(212,175,55,.07),transparent 70%)}
.sc-specimen{font-size:clamp(2.6rem,12vw,4.5rem);line-height:1.4;color:var(--ink);overflow-wrap:anywhere;font-family:'Noto Sans Egyptian Hieroglyphs','Noto Sans Cuneiform','Segoe UI Historic','Noto Sans',serif}
.sc-script-name{margin-top:.8rem;font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:var(--gold,#d4af37)}
.sc-translit{margin-top:1.2rem;font-size:1.1rem;color:var(--dim,#8a8577)}
.sc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:1rem;margin:2rem 0}
.sc-cell{border:1px solid var(--line);border-radius:12px;padding:1.2rem 1.3rem;background:var(--card)}
.sc-cell h2{font-size:.95rem;color:var(--gold,#d4af37);margin:0 0 .5rem;font-family:'Cinzel',serif}
.sc-cell p{font-size:.9rem;color:var(--text-dim);line-height:1.7;margin:0}
.sc-signs{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(150px,100%),1fr));gap:.8rem;margin:1.5rem 0}
.sc-sign{border:1px solid var(--line);border-radius:12px;padding:1rem;text-align:center;background:#0e0e12}
.sc-sign .glyph{font-size:2rem;line-height:1.5}
.sc-sign .name{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--gold,#d4af37);margin-top:.3rem}
.sc-sign .val{font-size:.8rem;color:var(--dim);margin-top:.2rem}
.sc-steps{margin:1.5rem 0 0;padding:0;list-style:none;counter-reset:step}
.sc-steps li{counter-increment:step;position:relative;padding:.8rem 0 .8rem 3rem;border-top:1px solid var(--line);color:var(--text-dim);line-height:1.7;font-size:.95rem}
.sc-steps li::before{content:counter(step,decimal-leading-zero);position:absolute;left:0;top:.9rem;font-size:.75rem;letter-spacing:.1em;color:var(--gold,#d4af37)}
.sc-sources{font-size:.85rem;color:var(--dim);line-height:1.9;margin:1.5rem 0 0;padding-top:1rem;border-top:1px solid var(--line)}
.sc-cta{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:1rem;margin:2.5rem 0 4rem}
.sc-mini{border:1px solid var(--line);border-radius:12px;padding:1.2rem 1.3rem;background:var(--card)}
.sc-mini h2{font-size:1rem;color:var(--gold,#d4af37);margin:0 0 .5rem;font-family:'Cinzel',serif}
.sc-mini p{font-size:.88rem;color:var(--text-dim);line-height:1.7;margin:0 0 .6rem}
.sc-mini a{color:var(--gold,#d4af37)}
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
  if (!hasOriginalScript(entry)) return null;
  const script = getOriginalScript(entry);
  const scriptName = getScriptName(entry);
  const label = getOriginalScriptLabel(entry); // "Original Script" or "Scholarly Transliteration"
  const prov = getProvenance(entry) || {};

  const name = entry.unicode;
  const reconstructed = isReconstructedSpecimen(prov);
  const badge = reconstructed ? 'Reconstructed Specimen' : label;
  const title = reconstructed
    ? `${name} in ${scriptName} — the reconstructed specimen | PUNICODEX`
    : `${name} in ${scriptName} — the attested original script | PUNICODEX`;
  const descSeed = reconstructed
    ? `${name} written in ${scriptName}: ${script}${prov.transliteration ? ` (${prov.transliteration})` : ''}. A reconstructed specimen — scholarly normalization, not a surviving inscription; signs and sources.`
    : `${name} written in ${scriptName}: ${script}${prov.transliteration ? ` (${prov.transliteration})` : ''}. The attested form, sign by sign, with sources and provenance.`;
  const desc = descSeed.length <= 160 ? descSeed : `${descSeed.slice(0, 157).replace(/\s+\S*$/, '')}…`;

  const templeCss = fs.existsSync(path.join(ROOT, 'sites', id, 'styles.css'))
    ? fs.readFileSync(path.join(ROOT, 'sites', id, 'styles.css'), 'utf8').replace(/\r\n/g, '\n')
    : '';
  const cssPin = crypto.createHash('md5').update(templeCss).digest('hex').slice(0, 10);

  const signs = Array.isArray(prov.signs) ? prov.signs : [];
  const signsHtml = signs
    .map(
      (s) => `<div class="sc-sign">
      <div class="glyph">${esc(s.sign || s.glyph || '')}</div>
      <div class="name">${esc(s.name || s.reading || '')}</div>
      ${s.value || s.meaning ? `<div class="val">${esc(s.value || s.meaning)}</div>` : ''}
    </div>`
    )
    .join('');
  const steps = Array.isArray(prov.steps) ? prov.steps : [];
  const stepsHtml = steps.map((s) => `<li>${esc(s)}</li>`).join('');
  const sources = Array.isArray(prov.sources) ? prov.sources : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description: desc,
    url: `${SITE_ORIGIN}/${id}/script/`,
    inLanguage: scriptName,
    about: {
      '@type': 'Thing',
      name,
      alternateName: [entry.ascii, script].filter((n, i, a) => n && n !== name && a.indexOf(n) === i),
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
      { '@type': 'ListItem', position: 4, name: badge, item: `${SITE_ORIGIN}/${id}/script/` },
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
<link rel="canonical" href="${SITE_ORIGIN}/${id}/script/">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE_ORIGIN}/${id}/script/">
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
            <li><span aria-current="page">${esc(badge)}</span></li>
        </ol>
    </nav>

<main class="wrap">
  <div class="sc-hero">
    <span class="sc-pill">${esc(badge)}</span>
    <h1>${esc(name)} in ${esc(scriptName)}</h1>
    <p class="tag">${
      reconstructed
        ? 'A reconstructed specimen — the spelling is a scholarly normalization, not a surviving inscription. Signs, steps, and sources below.'
        : 'The attested writing of the name — specimen, signs, and the road from ancient script to the modern address bar.'
    }</p>
  </div>

  <div class="sc-altar">
    <div class="sc-specimen">${esc(script)}</div>
    <div class="sc-script-name">${esc(scriptName)} · ${esc(badge)}</div>
    ${prov.transliteration ? `<div class="sc-translit">transliteration: ${esc(prov.transliteration)}</div>` : ''}
  </div>

  <div class="sc-grid">
    ${prov.transliterationScheme ? `<div class="sc-cell"><h2>Transliteration scheme</h2><p>${esc(prov.transliterationScheme)}</p></div>` : ''}
    ${prov.normalizedReading ? `<div class="sc-cell"><h2>Normalized reading</h2><p>${esc(prov.normalizedReading)}</p></div>` : ''}
    ${prov.phoneticReconstruction ? `<div class="sc-cell"><h2>Phonetic reconstruction</h2><p>${esc(prov.phoneticReconstruction)}</p></div>` : ''}
  </div>

  ${signsHtml ? `<h2 style="font-family:'Cinzel',serif;color:var(--gold,#d4af37);text-align:center;margin:2.5rem 0 .5rem">Sign by sign</h2><div class="sc-signs">${signsHtml}</div>` : ''}
  ${stepsHtml ? `<ol class="sc-steps">${stepsHtml}</ol>` : ''}
  ${
    sources.length
      ? `<div class="sc-sources">${sources
          .map((s) => (s.title ? esc(s.title) + (s.ref ? ` — ${esc(s.ref)}` : '') : esc(String(s))))
          .join('<br>')}</div>`
      : ''
  }

  <div class="sc-cta">
    <div class="sc-mini">
      <h2>The Temple</h2>
      <p>The full temple of ${esc(name)} — mythology, pronunciation, patterns, the Reliquary.</p>
      <a href="${SITE_ORIGIN}/${id}/">Enter the temple of ${esc(name)} →</a>
    </div>
    <div class="sc-mini">
      <h2>Pronunciation</h2>
      <p>${reconstructed ? 'How the reconstructed form is read' : 'How the attested form sounds'} — IPA, syllables, stress, mora timing.</p>
      <a href="${SITE_ORIGIN}/${id}/pronunciation/">How to pronounce ${esc(name)} →</a>
    </div>
    <div class="sc-mini">
      <h2>Check Before You Ink</h2>
      <p>Verifying attested scripts for tattoos — absence is not proof of error.</p>
      <a href="${SITE_ORIGIN}/ink/">The ink verifier →</a>
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
  const outDir = path.join(ROOT, 'sites', entry.id, 'script');
  fs.mkdirSync(outDir, { recursive: true });
  writeFileWithRetry(path.join(outDir, 'index.html'), html, 'utf8');
  wrote++;
}
console.log(`script pages: wrote ${wrote}, skipped ${skipped}`);
