#!/usr/bin/env node
/**
 * PuniCodex — Blog pantheon hubs.
 *
 * Builds blog/pantheon/{key}/index.html for every pantheon that has at least
 * one essay: a topical cluster hub (unique title/description/intro, the
 * pantheon's essay cards, sibling-hub navigation) so the blog gains
 * crawlable, indexable structure beyond the single 4.4MB all-in-one index.
 * The main /blog/ page keeps its interactive filter UX unchanged.
 *
 * Linked FROM the blog index (crawlable section) and TO it; registered in
 * the sitemap. Run: node scripts/generate-blog-pantheon-hubs.js
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { preservationLabel } = require('./lib/preservation-label.js');
const vm = require('node:vm');
const PINS = require('./asset-pins.js');

const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'platform', 'blog', 'content');
const OUT_ROOT = path.join(ROOT, 'blog', 'pantheon');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { fullNavHtml } = require('./sync-desktop-nav.js');
const { menuForPage } = require('./sync-mobile-menu.js');
const { footerHtml } = require('./sync-footer.js');
const { writeFileWithRetry } = require('./write-file-retry.js');

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(`(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`);
const BUILT_IDS = ARCHETYPES.filter((a) => a.built).map((a) => a.id);
const LEXICON_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function displayPantheon(p) {
  return String(p || 'mythological')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Gather posts grouped by pantheon (founding + series dispatches) ─────────

const SERIES = [
  { dir: path.join(ROOT, 'platform', 'blog', 'series', 'restoration'), url: (id) => `/${id}/blog/restoration/`, badge: 'Restoration Files' },
  { dir: path.join(ROOT, 'platform', 'blog', 'series', 'resonance'), url: (id) => `/${id}/blog/resonance/`, badge: 'Resonance Files' },
  { dir: path.join(ROOT, 'platform', 'blog', 'series', 'canonical'), url: (id) => `/${id}/blog/canonical/`, badge: 'Canonical Register' },
];

const byPantheon = new Map();
function addPost(pantheon, post) {
  if (!byPantheon.has(pantheon)) byPantheon.set(pantheon, []);
  byPantheon.get(pantheon).push(post);
}

for (const id of BUILT_IDS) {
  const p = path.join(BLOG_DIR, `${id}.json`);
  if (!fs.existsSync(p)) continue;
  const post = JSON.parse(fs.readFileSync(p, 'utf8'));
  const entry = LEXICON_BY_ID.get(id) || {};
  addPost(entry.pantheon || 'unknown', {
    id,
    unicode: entry.unicode || id,
    pantheon: entry.pantheon || '',
    title: post.title,
    description: post.description,
    readingTime: post.readingTime || '',
    publishedAt: post.publishedAt || '',
    url: `/${id}/blog/`,
    badge: preservationLabel(entry.unicode || id),
    series: false,
  });
}
for (const series of SERIES) {
  for (const id of BUILT_IDS) {
    const p = path.join(series.dir, `${id}.json`);
    if (!fs.existsSync(p)) continue;
    const post = JSON.parse(fs.readFileSync(p, 'utf8'));
    const entry = LEXICON_BY_ID.get(id) || {};
    addPost(entry.pantheon || 'unknown', {
      id,
      unicode: entry.unicode || id,
      pantheon: entry.pantheon || '',
      title: post.title,
      description: post.description,
      readingTime: post.readingTime || '',
      publishedAt: post.publishedAt || '',
      url: series.url(id),
      badge: series.badge,
      series: true,
    });
  }
}

const byCodepoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const pantheons = [...byPantheon.keys()].sort((a, b) => byCodepoint(a, b));
const markedOf = (posts) => posts.filter((p) => p.badge !== 'ASCII-equivalent form').length;

// Data-driven but pantheon-specific lead lines; each hub's intro names its
// own names, so no two hubs share body copy.
function leadFor(key, posts) {
  const names = posts.filter((p) => !p.series).slice(0, 4).map((p) => p.unicode);
  const nameList =
    names.length > 1
      ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
      : names[0] || displayPantheon(key);
  return `Every essay in the ${displayPantheon(key)} tradition: the restorations behind ${nameList} — the original script, the marks ASCII deleted, the evidence, and the industries the names still govern.`;
}

function cardHtml(p) {
  return `                <article class="blogh-card${p.series ? ' blogh-card-series' : ''}">
                    <div class="blogh-card-head">
                        <a class="blogh-card-unicode" href="/${escapeHtml(p.id)}/">${escapeHtml(p.unicode)}</a>
                        <span class="blogh-card-badge">${escapeHtml(p.badge)}</span>
                    </div>
                    <h2 class="blogh-card-title"><a href="${escapeHtml(p.url)}">${escapeHtml(p.title)}</a></h2>
                    <p class="blogh-card-desc">${escapeHtml(p.description)}</p>
                    <p class="blogh-card-meta">${escapeHtml(p.readingTime)} &middot; ${escapeHtml(p.publishedAt)}</p>
                </article>`;
}

function renderHub(key, posts, allKeys) {
  const label = displayPantheon(key);
  const total = posts.length;
  const marked = markedOf(posts);
  const title = `${label} mythology essays — restorations & canonical names | PUNICODEX`;
  const desc = `${total} long-read essays on the ${label} names of the pantheon: original scripts, pronunciation, etymology, and the Unicode restorations — ${marked} carrying marks ASCII deletes.`;
  const canonical = `https://punicodex.com/blog/pantheon/${key}/`;

  const siblings = allKeys
    .filter((k) => k !== key)
    .map((k) => `<a class="blogh-pill" href="/blog/pantheon/${escapeHtml(k)}/">${escapeHtml(displayPantheon(k))}</a>`)
    .join('');

  const jsonLd = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description: desc,
      url: canonical,
      isPartOf: { '@type': 'WebSite', name: 'PUNICODEX', url: 'https://punicodex.com' },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: total,
        itemListElement: posts.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `https://punicodex.com${p.url}`,
          name: p.title,
        })),
      },
    },
    null,
    2
  ).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<!-- GENERATED FILE — do not edit by hand. Regenerate with: node scripts/generate-blog-pantheon-hubs.js -->
<html lang="en">
<head>
<!-- PUNICODEX-ANALYTICS-START -->
<script src="/js/analytics-beacon.js?v=1" defer></script>
<!-- PUNICODEX-ANALYTICS-END -->
    <meta charset="UTF-8">
    <meta name="google" content="notranslate">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(desc)}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(desc)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="https://punicodex.com/assets/brand/05-social/punicodex-og-image-1200x630.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="PUNICODEX">
    <script type="application/ld+json">
    ${jsonLd}
    </script>
    <link rel="stylesheet" href="/assets/fonts/fonts.css">
    <link rel="stylesheet" href="/css/temple-base.css?v=perf25">
    <link rel="stylesheet" href="${PINS.NAV_HUBS_CSS}">
    <link rel="stylesheet" href="${PINS.SITE_NAV_CSS}">
    <link rel="stylesheet" href="${PINS.MOBILE_MENU_CSS}">
    <link rel="stylesheet" href="/css/footer.css?v=8">
    <meta name="theme-color" content="#050505">
    <meta name="color-scheme" content="dark">
    <style>
        .blogh-hero { padding: 9rem 1.5rem 2.5rem; text-align: center; }
        .blogh-hero-title { font-family: var(--font-display, Cinzel, serif); font-size: clamp(2rem, 5vw, 3.2rem); color: var(--white, #fff); margin-bottom: 1rem; }
        .blogh-hero-subtitle { max-width: 680px; margin: 0 auto; color: var(--white-dim, #e8e4dc); line-height: 1.75; font-size: 1rem; }
        .blogh-stats { display: flex; flex-wrap: wrap; justify-content: center; gap: 2.5rem; margin-top: 2rem; }
        .blogh-stat-value { display: block; font-family: var(--font-display, Cinzel, serif); font-size: 1.8rem; color: var(--primary, #d4af37); }
        .blogh-stat-label { font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--white-dim, #e8e4dc); opacity: 0.7; }
        .blogh-pills { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem 1.5rem; display: flex; flex-wrap: wrap; gap: 0.45rem; }
        .blogh-pill { padding: 0.35rem 0.9rem; border-radius: 999px; border: 1px solid rgba(212,175,55,0.25); color: var(--white-dim, #e8e4dc); font-size: 0.82rem; text-decoration: none; }
        .blogh-pill:hover { color: var(--primary-bright, #f0d878); border-color: var(--primary-bright, #f0d878); }
        .blogh-grid { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem 4rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }
        .blogh-card { display: flex; flex-direction: column; padding: 1.4rem; border-radius: 14px; border: 1px solid rgba(212,175,55,0.15); background: rgba(255,255,255,0.03); }
        .blogh-card-series { border-color: rgba(212,175,55,0.4); background: linear-gradient(180deg, rgba(212,175,55,0.08), rgba(255,255,255,0.02)); }
        .blogh-card-head { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; }
        .blogh-card-unicode { font-family: var(--font-display, Cinzel, serif); font-size: 1.25rem; color: var(--primary, #d4af37); text-decoration: none; }
        .blogh-card-badge { font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.22rem 0.6rem; border-radius: 999px; border: 1px solid rgba(212,175,55,0.3); color: var(--primary, #d4af37); }
        .blogh-card-title { font-family: var(--font-display, Cinzel, serif); font-size: 1.05rem; line-height: 1.4; margin: 0.7rem 0 0.5rem; }
        .blogh-card-title a { color: var(--white, #fff); text-decoration: none; }
        .blogh-card-title a:hover { color: var(--primary-bright, #f0d878); }
        .blogh-card-desc { flex: 1; margin: 0 0 0.8rem; font-size: 0.9rem; line-height: 1.6; color: var(--white-dim, #e8e4dc); }
        .blogh-card-meta { margin: 0; font-size: 0.76rem; color: var(--white-dim, #e8e4dc); opacity: 0.65; }
        @media (max-width: 640px) { .blogh-hero { padding-top: 7rem; } .blogh-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    ${fullNavHtml(`/blog/pantheon/${key}/`)}
    ${menuForPage(`/blog/pantheon/${key}/`)}

    <section class="blogh-hero">
        <h1 class="blogh-hero-title">${escapeHtml(label)} Essays</h1>
        <p class="blogh-hero-subtitle">${escapeHtml(leadFor(key, posts))}</p>
        <div class="blogh-stats">
            <div class="blogh-stat"><span class="blogh-stat-value">${total}</span><span class="blogh-stat-label">Essays</span></div>
            <div class="blogh-stat"><span class="blogh-stat-value">${marked}</span><span class="blogh-stat-label">Carry Marks</span></div>
        </div>
    </section>

    <nav class="blogh-pills" aria-label="Essay hubs by pantheon">
        <a class="blogh-pill" href="/blog/">All essays</a>${siblings}
    </nav>

    <section class="section">
        <div class="blogh-grid">
${posts.map(cardHtml).join('\n')}
        </div>
    </section>

    ${footerHtml()}
    <script src="/js/px-core.js?v=perf23" defer></script>
    <script src="${PINS.NAV_HUBS_JS}" defer></script>
    <script src="/js/temple-base.js?v=perf20" defer></script>
</body>
</html>
`;
}

let wrote = 0;
for (const key of pantheons) {
  const posts = byPantheon.get(key).sort((a, b) => byCodepoint(a.unicode, b.unicode) || Number(a.series) - Number(b.series));
  const outDir = path.join(OUT_ROOT, key);
  fs.mkdirSync(outDir, { recursive: true });
  writeFileWithRetry(path.join(outDir, 'index.html'), renderHub(key, posts, pantheons), 'utf8');
  wrote++;
}
console.log(`Blog pantheon hubs: ${wrote} hubs written (${pantheons.map(displayPantheon).join(', ')})`);
