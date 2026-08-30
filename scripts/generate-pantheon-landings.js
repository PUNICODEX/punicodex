#!/usr/bin/env node
/**
 * PuniCodex — Per-pantheon landing-page generator.
 *
 * Sources of truth:
 *   - type/js/pantheon-meta.js (pantheon labels, colors, story, themes, texts, featured)
 *   - type/js/lexicon.js (entry data)
 *   - js/archetypes-v2.js (built flagships)
 *   - platform/texts/registry.json (Sacred Texts registry)
 *
 * Outputs:
 *   - /{pantheon}/index.html for every pantheon in PANTHEON_META
 *
 * The generator uses the canonical nav / mobile-menu / footer builders so the
 * output matches the rest of the public site. Injectors (analytics, herald,
 * cookie-consent, university collaborators) run later in the master generate
 * sequence and will add their own blocks.
 *
 * Idempotent and byte-deterministic for unchanged inputs.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

const { PANTHEON_META } = require(path.join(ROOT, 'type', 'js', 'pantheon-meta.js'));
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(
  `(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`
);

const BUILT_ARCHETYPES = ARCHETYPES.filter((a) => a.built);
const BUILT_IDS = new Set(BUILT_ARCHETYPES.map((a) => a.id));
const ARCHETYPE_BY_ID = new Map(BUILT_ARCHETYPES.map((a) => [a.id, a]));
const LEXICON_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));

const TEXT_REGISTRY = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'platform', 'texts', 'registry.json'), 'utf8')
);
const TEXT_BY_ID = new Map(TEXT_REGISTRY.texts.map((t) => [t.id, t]));

const ORIGINAL_SCRIPT_LOOKUP = require(path.join(ROOT, 'js', 'original-script-lookup.js'));

const { fullNavHtml } = require('./sync-desktop-nav.js');
const { menuForPage } = require('./sync-mobile-menu.js');
const { footerHtml } = require('./sync-footer.js');
const { writeFileWithRetry } = require('./write-file-retry.js');

const BASE_URL = 'https://punicodex.com';
const OG_IMAGE = `${BASE_URL}/assets/images/og-default.png`;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fileExists(rel) {
  try {
    return fs.statSync(path.join(ROOT, rel)).isFile();
  } catch {
    return false;
  }
}

function ogImageUrl(_pantheonId) {
  // Per-pantheon OG cards can be added later; until then use the site default.
  return OG_IMAGE;
}

function storyParagraphs(story) {
  return String(story || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function featuredEntries(pantheon) {
  const ids = (pantheon.featured || []).filter((id) => ARCHETYPE_BY_ID.has(id));
  return ids.slice(0, 12).map((id) => ARCHETYPE_BY_ID.get(id));
}

function browseEntries(pantheonId) {
  return BUILT_ARCHETYPES.filter((a) => a.pantheon === pantheonId).sort((a, b) =>
    (a.name || a.id).localeCompare(b.name || b.id)
  );
}

function textEntries(pantheon) {
  return (pantheon.texts || [])
    .filter((id) => TEXT_BY_ID.has(id))
    .map((id) => TEXT_BY_ID.get(id));
}

function badgeText(tier) {
  if (tier === 'tier-1') return 'Tier 1';
  if (tier === 'tier-2') return 'Tier 2';
  if (tier === 'dual-tier') return 'Dual';
  return tier;
}

function scriptLabelHtml(archetype) {
  const info = ORIGINAL_SCRIPT_LOOKUP[archetype.id];
  const originalScript = info ? info.originalScript : archetype.greek;
  const scriptName = info ? info.scriptName : 'Greek';
  if (originalScript && originalScript !== '—') {
    return `<span class="card-script-name">${escapeHtml(scriptName)}</span>${escapeHtml(originalScript)}`;
  }
  return '<span class="card-script-name">Scholarly transliteration</span>';
}

function templeCardHtml(archetype) {
  const url = archetype.hasAdSite ? `/${archetype.id}/lore/` : `/${archetype.id}/`;
  const thumbPath = `/assets/images/mascots/thumbs/small/${archetype.id}_thumb.webp?v=78`;
  const fallback = archetype.mascotFallback || archetype.mascotPath || '';
  return `<a class="archetype-card" href="${url}">
                <div class="card-portrait">
                    <img src="${thumbPath}" alt="${escapeHtml(archetype.name)} — ${escapeHtml(archetype.domain)}" data-fallback="${escapeHtml(fallback)}" width="120" height="120" loading="lazy" decoding="async" class="card-portrait-img">
                </div>
                <p class="card-name">${escapeHtml(archetype.name)}</p>
                <p class="card-greek">${scriptLabelHtml(archetype)}</p>
                <p class="card-domain">${escapeHtml(archetype.domain)}</p>
                <p class="card-punycode">${escapeHtml(archetype.domainUnicode)} &rarr; ${escapeHtml(archetype.domainPunycode)}</p>
                <span class="card-badge ${escapeHtml(archetype.tier)}">${escapeHtml(badgeText(archetype.tier))}</span>
            </a>`;
}

function textCardHtml(text) {
  return `<a class="pl-card pl-card--text" href="/texts/${text.id}/">
                <div class="pl-card-body">
                    <h3>${escapeHtml(text.title)}</h3>
                    <p class="pl-card-meta">${escapeHtml(text.author || '')} · ${escapeHtml(text.composed || '')}</p>
                    <p class="pl-card-summary">${escapeHtml(text.summary || '')}</p>
                </div>
            </a>`;
}

function breadcrumbJsonLd(id, label) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${BASE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Pantheon',
        item: `${BASE_URL}/pantheon/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${label} Pantheon`,
        item: `${BASE_URL}/${id}/`,
      },
    ],
  };
  return JSON.stringify(data, null, 2);
}

function collectionJsonLd(id, label, summary, featured, builtCount) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${label} Pantheon — PuniCodex`,
    description: summary,
    url: `${BASE_URL}/${id}/`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'PuniCodex',
      url: BASE_URL,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: featured.length,
      itemListElement: featured.map((entry, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: entry.name || entry.id,
        url: `${BASE_URL}/${entry.id}/`,
      })),
    },
    about: {
      '@type': 'Thing',
      name: `${label} Pantheon`,
      description: `${builtCount} restored flagship temples`,
    },
  };
  return JSON.stringify(data, null, 2);
}

function pantheonPageHtml(id, pantheon) {
  const label = pantheon.label || id;
  const title = `${label} Pantheon — PuniCodex`;
  const summary = pantheon.summary || `${label} pantheon on PuniCodex.`;
  const canonical = `${BASE_URL}/${id}/`;
  const og = ogImageUrl(id);
  const featured = featuredEntries(pantheon);
  const browse = browseEntries(id);
  const texts = textEntries(pantheon);
  const themes = (pantheon.themes || [])
    .slice()
    .sort((a, b) => a.localeCompare(b));

  const storyParts = storyParagraphs(pantheon.story)
    .map((p) => `                <p>${escapeHtml(p)}</p>`)
    .join('\n');

  const featuredGrid = featured.length
    ? `            <div class="pantheon-grid-large">
${featured.map(templeCardHtml).join('\n')}
            </div>`
    : `            <p class="pl-empty">Featured temples for this pantheon are being restored.</p>`;

  const browseGrid = browse.length
    ? `            <div class="pantheon-grid-large">
${browse.map(templeCardHtml).join('\n')}
            </div>`
    : `            <p class="pl-empty">No built temples in this pantheon yet.</p>`;

  const textsGrid = texts.length
    ? `            <div class="pl-grid pl-grid--texts">
${texts.map(textCardHtml).join('\n')}
            </div>`
    : '';

  const themesHtml = themes.length
    ? `            <div class="pl-theme-chips">
${themes.map((t) => `                <span class="pl-theme-chip">${escapeHtml(t)}</span>`).join('\n')}
            </div>`
    : '';

  return `<!DOCTYPE html>
<!-- GENERATED FILE — do not edit by hand. Regenerate with: node scripts/generate-pantheon-landings.js -->
<html lang="en">
<head>
<!-- PUNICODEX-ANALYTICS-START -->
<script src="/js/analytics-beacon.js?v=1" defer></script>
<!-- PUNICODEX-ANALYTICS-END -->

    <meta charset="UTF-8">
    <meta name="google" content="notranslate">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(summary)}">
    <meta name="theme-color" content="${pantheon.color || '#050505'}">
    <meta name="color-scheme" content="dark">
    <link rel="canonical" href="${canonical}">

    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(summary)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${og}">
    <meta name="twitter:image" content="${og}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="PuniCodex">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(summary)}">

    <!-- Schema.org -->
    <script type="application/ld+json">
    ${collectionJsonLd(id, label, summary, featured, browse.length)}
    </script>
    <script type="application/ld+json">
    ${breadcrumbJsonLd(id, label)}
    </script>

    <link rel="icon" type="image/svg+xml" href="/assets/brand/02-favicons/favicon.svg">
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/02-favicons/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/assets/brand/02-favicons/favicon-16x16.png">
    <link rel="icon" href="/assets/brand/02-favicons/favicon.ico" sizes="any">
    <link rel="apple-touch-icon" href="/assets/brand/02-favicons/apple-touch-icon.png">
    <link rel="mask-icon" href="/assets/brand/02-favicons/mask-icon.svg" color="#D4AF37">
    <link rel="manifest" href="/assets/brand/06-code/site.webmanifest">

    <link rel="stylesheet" href="/assets/fonts/fonts.css">
    <link rel="stylesheet" href="/css/main.css?v=perf24">
    <link rel="stylesheet" href="/css/pantheon.css?v=perf22">
    <link rel="stylesheet" href="/css/pantheon-landing.css?v=1">
</head>
<body>

    ${fullNavHtml('/pantheon/')}

    ${menuForPage('/pantheon/')}

    <main class="page-pantheon-landing" data-pantheon="${id}">
        <section class="pl-hero">
            <canvas class="pc-fx-pantheon" data-pantheon="${id}" data-color="${pantheon.color || '#D4AF37'}" data-emoji="${escapeHtml(pantheon.emoji || '✦')}" aria-hidden="true"></canvas>
            <div class="pl-hero-overlay">
                <div class="container">
                    <p class="pl-eyebrow">${escapeHtml(label)} ${escapeHtml(pantheon.emoji || '')}</p>
                    <h1 class="pl-hero-title">${escapeHtml(label)} Pantheon</h1>
                    <p class="pl-hero-lead">${escapeHtml(summary)}</p>
                    <p class="pl-hero-meta"><span>${escapeHtml(pantheon.era || '')}</span> · <span>${escapeHtml(pantheon.region || '')}</span></p>
                </div>
            </div>
        </section>

        <section class="pl-section pl-section--story">
            <div class="container">
                <h2 class="pl-section-title">The story of ${escapeHtml(label)}</h2>
                <div class="pl-prose">
${storyParts}
                </div>
            </div>
        </section>

        ${themesHtml ? `<section class="pl-section pl-section--themes">
            <div class="container">
                <h2 class="pl-section-title">Themes</h2>
${themesHtml}
            </div>
        </section>` : ''}

        <section class="pl-section pl-section--featured">
            <div class="container">
                <h2 class="pl-section-title">Featured temples</h2>
                <p class="pl-section-subtitle">${featured.length} restored names to explore.</p>
${featuredGrid}
            </div>
        </section>

        ${textsGrid ? `<section class="pl-section pl-section--texts">
            <div class="container">
                <h2 class="pl-section-title">Sacred texts</h2>
                <p class="pl-section-subtitle">Primary sources behind the ${escapeHtml(label)} pantheon.</p>
${textsGrid}
            </div>
        </section>` : ''}

        <section class="pl-section pl-section--browse">
            <div class="container">
                <h2 class="pl-section-title">Browse all ${escapeHtml(label)} temples</h2>
                <p class="pl-section-subtitle">${browse.length} restored flagship temples.</p>
${browseGrid}
            </div>
        </section>

        <section class="pl-section pl-section--cta">
            <div class="container">
                <a class="pl-cta" href="/pantheon/">Explore the full pantheon <span aria-hidden="true">→</span></a>
            </div>
        </section>
    </main>

    ${footerHtml()}

    <script src="/js/px-core.js?v=perf21" defer></script>
    <script src="/js/main.js?v=perf20" defer></script>
    <script src="/js/pc-fx-pantheon.js?v=1" defer></script>
</body>
</html>
`;
}

function main() {
  // Guard against collisions with lexicon ids — the middleware would otherwise
  // rewrite the pantheon landing URL to a temple page.
  const lexiconIds = new Set(LEXICON.map((e) => e.id));
  for (const id of Object.keys(PANTHEON_META)) {
    if (lexiconIds.has(id)) {
      throw new Error(`Pantheon id "${id}" collides with a lexicon entry; cannot create landing page.`);
    }
  }

  let generated = 0;
  const ids = Object.keys(PANTHEON_META).sort((a, b) => a.localeCompare(b));
  for (const id of ids) {
    const pantheon = PANTHEON_META[id];
    const outDir = path.join(ROOT, id);
    fs.mkdirSync(outDir, { recursive: true });
    const html = pantheonPageHtml(id, pantheon);
    writeFileWithRetry(path.join(outDir, 'index.html'), html, 'utf8');
    generated++;
  }
  console.log(`Pantheon landing pages generated: ${generated}`);
}

if (require.main === module) main();

module.exports = { pantheonPageHtml, featuredEntries, browseEntries, textEntries };
