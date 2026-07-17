#!/usr/bin/env node
/**
 * PuniCodex — Blog index generator
 *
 * Builds the static root blog index at blog/index.html from the canonical
 * per-temple posts (platform/blog/content/{id}.json), the canonical lexicon,
 * and the flagship archetype list. The full card grid is baked into the HTML
 * at build time (no runtime fetches); a small JSON payload drives the
 * client-side search/filter/sort.
 *
 * Usage:
 *   node scripts/generate-blog-index.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'platform', 'blog', 'content');
const OUT_DIR = path.join(ROOT, 'blog');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(
  `(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`
);
const BUILT_IDS = ARCHETYPES.filter((a) => a.built)
  .map((a) => a.id)
  .sort();
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

function readMinutes(readingTime) {
  const m = String(readingTime || '').match(/(\d+)/);
  return m ? Number.parseInt(m[1], 10) : 0;
}

// ── Load posts ──────────────────────────────────────────────────────────────

const posts = [];
for (const id of BUILT_IDS) {
  const p = path.join(BLOG_DIR, `${id}.json`);
  if (!fs.existsSync(p)) {
    console.warn(`  skipping ${id}: no blog content JSON`);
    continue;
  }
  const post = JSON.parse(fs.readFileSync(p, 'utf8'));
  const entry = LEXICON_BY_ID.get(id) || {};
  const pantheon = entry.pantheon || '';
  posts.push({
    id,
    unicode: entry.unicode || id,
    ascii: entry.ascii || id,
    pantheon,
    pantheonDisplay: displayPantheon(pantheon),
    tier: entry.tier || '2',
    tierLabel: entry.tierLabel || `Tier ${entry.tier || '2'}`,
    title: post.title,
    description: post.description,
    tags: post.tags || [],
    keywords: post.keywords || [],
    readingTime: post.readingTime || '',
    readMin: readMinutes(post.readingTime),
    publishedAt: post.publishedAt || '',
  });
}
posts.sort((a, b) => a.unicode.localeCompare(b.unicode, 'en'));

// ── Stats ───────────────────────────────────────────────────────────────────

const pantheonCounts = new Map();
for (const p of posts) pantheonCounts.set(p.pantheon, (pantheonCounts.get(p.pantheon) || 0) + 1);
const pantheons = [...pantheonCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const tierCounts = { dual: 0, 1: 0, 2: 0 };
for (const p of posts) tierCounts[p.tier] = (tierCounts[p.tier] || 0) + 1;
const avgRead = posts.length
  ? Math.round(posts.reduce((a, p) => a + p.readMin, 0) / posts.length)
  : 0;

// ── Static cards (SEO-visible; JS only hides/reorders them) ────────────────

const cardsHtml = posts
  .map((p) => {
    const tags = p.tags
      .slice(0, 4)
      .map((t) => `<span class="blogi-card-tag">${escapeHtml(t)}</span>`)
      .join('');
    return `                <article class="blogi-card" data-id="${escapeHtml(p.id)}" data-pantheon="${escapeHtml(p.pantheon)}" data-tier="${escapeHtml(p.tier)}" data-read="${p.readMin}">
                    <div class="blogi-card-head">
                        <a class="blogi-card-unicode" href="/sites/${escapeHtml(p.id)}/">${escapeHtml(p.unicode)}</a>
                        <span class="blogi-card-badge">${escapeHtml(p.tierLabel)}</span>
                    </div>
                    <p class="blogi-card-pantheon">${escapeHtml(p.pantheonDisplay)}</p>
                    <h2 class="blogi-card-title"><a href="/sites/${escapeHtml(p.id)}/blog/">${escapeHtml(p.title)}</a></h2>
                    <p class="blogi-card-desc">${escapeHtml(p.description)}</p>
                    <div class="blogi-card-tags">${tags}</div>
                    <p class="blogi-card-meta">${escapeHtml(p.readingTime)} &middot; ${escapeHtml(p.publishedAt)}</p>
                </article>`;
  })
  .join('\n');

// ── Baked payload for search/sort (no runtime fetches) ─────────────────────

const payload = posts.map((p) => ({
  id: p.id,
  u: p.unicode,
  p: p.pantheon,
  t: p.tier,
  r: p.readMin,
  s: [p.unicode, p.ascii, p.title, p.description, p.pantheonDisplay, p.tierLabel, ...p.tags, ...p.keywords]
    .join(' ')
    .toLowerCase(),
}));
const payloadJson = JSON.stringify(payload).replace(/</g, '\\u003c');

// ── JSON-LD: CollectionPage + ItemList ──────────────────────────────────────

const jsonLd = JSON.stringify(
  {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'PuniCodex Blog — Unicode Restoration Essays',
    description:
      'Long-read essays on the restoration of flagship Unicode names: mythology, original scripts, pronunciation, archaeology, and the IDN engineering that brings ancient names to the address bar.',
    url: 'https://punicodex.com/blog/',
    isPartOf: { '@type': 'WebSite', name: 'PUNICODEX', url: 'https://punicodex.com' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: posts.length,
      itemListElement: posts.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://punicodex.com/sites/${p.id}/blog/`,
        name: p.title,
      })),
    },
  },
  null,
  2
).replace(/</g, '\\u003c');

const total = posts.length;
const pantheonCount = pantheons.length;

// ── Page ────────────────────────────────────────────────────────────────────

const html = `<!DOCTYPE html>
<!-- GENERATED FILE — do not edit by hand. Regenerate with: node scripts/generate-blog-index.js -->
<html lang="en">
<head>
<!-- PUNICODEX-ANALYTICS-START -->
<script src="/js/analytics-beacon.js" defer></script>
<!-- PUNICODEX-ANALYTICS-END -->

    <meta charset="UTF-8">
    <meta name="google" content="notranslate">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog — ${total} Unicode Restoration Essays | PUNICODEX</title>
    <meta name="description" content="Long-read essays on ${total} flagship Unicode restorations: mythology, original scripts, pronunciation, archaeology, and the IDN engineering behind ancient names.">
    <link rel="canonical" href="https://punicodex.com/blog/">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <!-- Open Graph -->
    <meta property="og:title" content="Blog — ${total} Unicode Restoration Essays | PUNICODEX">
    <meta property="og:description" content="Long-read essays on ${total} flagship Unicode restorations across ${pantheonCount} pantheons.">
    <meta property="og:url" content="https://punicodex.com/blog/">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="PUNICODEX">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Blog — ${total} Unicode Restoration Essays | PUNICODEX">
    <meta name="twitter:description" content="Long-read essays on ${total} flagship Unicode restorations across ${pantheonCount} pantheons.">

    <!-- Schema.org -->
    <script type="application/ld+json">
    ${jsonLd}
    </script>

    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/temple-base.css?v=perf17">
    <meta name="theme-color" content="#050505">
    <meta name="color-scheme" content="dark">
    <style>
        .blogi-hero { padding: 9rem 1.5rem 3.5rem; text-align: center; }
        .blogi-hero-title { font-family: var(--font-display, Cinzel, serif); font-size: clamp(2.4rem, 6vw, 4rem); color: var(--white, #fff); margin-bottom: 1rem; }
        .blogi-hero-subtitle { max-width: 720px; margin: 0 auto 2.5rem; color: var(--white-dim, #e8e4dc); line-height: 1.7; font-size: 1.05rem; }
        .blogi-stats { display: flex; flex-wrap: wrap; justify-content: center; gap: 2.5rem; }
        .blogi-stat { text-align: center; }
        .blogi-stat-value { display: block; font-family: var(--font-display, Cinzel, serif); font-size: 2rem; color: var(--primary, #d4af37); }
        .blogi-stat-label { font-size: 0.78rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--white-dim, #e8e4dc); opacity: 0.7; }
        .blogi-filters { padding: 0 1.5rem 2rem; }
        .blogi-panel { max-width: 1100px; margin: 0 auto; padding: 1.5rem; border-radius: 14px; border: 1px solid rgba(212,175,55,0.15); background: rgba(255,255,255,0.03); }
        .blogi-command { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; margin-bottom: 1.25rem; }
        .blogi-search { flex: 1 1 260px; display: flex; align-items: center; gap: 0.6rem; padding: 0.7rem 1rem; border-radius: 10px; border: 1px solid rgba(212,175,55,0.2); background: rgba(0,0,0,0.35); color: var(--white-dim, #e8e4dc); }
        .blogi-search input { flex: 1; background: none; border: none; outline: none; color: var(--white, #fff); font-size: 1rem; font-family: inherit; }
        .blogi-select { padding: 0.7rem 1rem; border-radius: 10px; border: 1px solid rgba(212,175,55,0.2); background: rgba(0,0,0,0.35); color: var(--white, #fff); font-size: 0.95rem; font-family: inherit; }
        .blogi-group { margin-bottom: 1rem; }
        .blogi-group-label { display: block; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--white-dim, #e8e4dc); opacity: 0.7; margin-bottom: 0.5rem; }
        .blogi-pills { display: flex; flex-wrap: wrap; gap: 0.45rem; }
        .blogi-pill { padding: 0.4rem 0.9rem; border-radius: 999px; border: 1px solid rgba(212,175,55,0.25); background: none; color: var(--white-dim, #e8e4dc); font-size: 0.85rem; font-family: inherit; cursor: pointer; transition: color 0.15s, border-color 0.15s, background 0.15s; }
        .blogi-pill:hover { color: var(--primary-bright, #f0d878); border-color: var(--primary-bright, #f0d878); }
        .blogi-pill.active { background: var(--primary, #d4af37); border-color: var(--primary, #d4af37); color: #0a0a0a; }
        .blogi-pill .count { opacity: 0.65; font-size: 0.78em; margin-left: 0.25em; }
        .blogi-meta { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 0.25rem; font-size: 0.85rem; color: var(--white-dim, #e8e4dc); }
        .blogi-reset { background: none; border: none; color: var(--primary, #d4af37); font-size: 0.85rem; font-family: inherit; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
        .blogi-grid { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem 4rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }
        .blogi-card { display: flex; flex-direction: column; padding: 1.4rem; border-radius: 14px; border: 1px solid rgba(212,175,55,0.15); background: rgba(255,255,255,0.03); transition: border-color 0.15s, transform 0.15s; }
        .blogi-card:hover { border-color: rgba(212,175,55,0.45); transform: translateY(-2px); }
        .blogi-card-head { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; }
        .blogi-card-unicode { font-family: var(--font-display, Cinzel, serif); font-size: 1.3rem; color: var(--primary, #d4af37); text-decoration: none; }
        .blogi-card-unicode:hover { color: var(--primary-bright, #f0d878); }
        .blogi-card-badge { font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.25rem 0.6rem; border-radius: 999px; border: 1px solid rgba(212,175,55,0.3); color: var(--primary, #d4af37); white-space: nowrap; }
        .blogi-card-pantheon { margin: 0.35rem 0 0.6rem; font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--white-dim, #e8e4dc); opacity: 0.65; }
        .blogi-card-title { font-family: var(--font-display, Cinzel, serif); font-size: 1.1rem; line-height: 1.35; margin: 0 0 0.6rem; }
        .blogi-card-title a { color: var(--white, #fff); text-decoration: none; }
        .blogi-card-title a:hover { color: var(--primary-bright, #f0d878); }
        .blogi-card-desc { flex: 1; margin: 0 0 0.9rem; font-size: 0.92rem; line-height: 1.6; color: var(--white-dim, #e8e4dc); }
        .blogi-card-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.8rem; }
        .blogi-card-tag { font-size: 0.72rem; padding: 0.2rem 0.6rem; border-radius: 999px; border: 1px solid rgba(212,175,55,0.2); color: var(--primary, #d4af37); }
        .blogi-card-meta { margin: 0; font-size: 0.78rem; color: var(--white-dim, #e8e4dc); opacity: 0.65; }
        .blogi-empty { max-width: 1100px; margin: 0 auto; padding: 3rem 1.5rem 5rem; text-align: center; color: var(--white-dim, #e8e4dc); }
        @media (max-width: 640px) { .blogi-hero { padding-top: 7rem; } .blogi-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="main-nav" id="main-nav">
        <div class="nav-inner">
            <a href="/" class="nav-logo">PUNICODEX</a>
            <div class="nav-links">
                <a href="/pantheon/" class="nav-link">Pantheon</a>
                <a href="/realms/" class="nav-link">Realms</a>
                <a href="/lexicon/" class="nav-link">Lexicon</a>
                <a href="/blog/" class="nav-link active">Blog</a>
                <a href="/type/" class="nav-link">Type</a>
                <a href="/search.html" class="nav-link">Search</a>
                <a href="/tiers/" class="nav-link">Tier System</a>
                <a href="/codex/" class="nav-link">Codex</a>
                <a href="/api/v1/docs/" class="nav-link">API</a>
                <a href="/store/" class="nav-link">Store</a>
                <a href="/about/" class="nav-link">About</a>
                <a href="/contact/" class="nav-link">Contact</a>
            </div>
            <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation">
                <span></span><span></span><span></span>
            </button>
        </div>
    </nav>

    <!-- Mobile Menu -->
    <div class="mobile-menu" id="mobile-menu">
        <div class="mobile-menu-section">
            <span class="mobile-menu-title">Explore</span>
            <div class="mobile-menu-group">
                <a href="/pantheon/">Pantheon</a>
                <a href="/realms/">Realms</a>
                <a href="/lexicon/">Lexicon</a>
                <a href="/blog/" class="active">Blog</a>
                <a href="/connections/">Connections</a>
            </div>
        </div>
        <div class="mobile-menu-section">
            <span class="mobile-menu-title">Tools</span>
            <div class="mobile-menu-group">
                <a href="/type/">Type</a>
                <a href="/search.html">Search</a>
                <a href="/tiers/">Tier System</a>
                <a href="/oracle.html">Oracle</a>
            </div>
        </div>
        <div class="mobile-menu-section">
            <span class="mobile-menu-title">Resources</span>
            <div class="mobile-menu-group">
                <a href="/codex/">Codex</a>
                <a href="/api/v1/docs/">API</a>
                <a href="/appraise/">Appraise</a>
                <a href="/store/">Store</a>
            </div>
        </div>
        <div class="mobile-menu-section">
            <span class="mobile-menu-title">About</span>
            <div class="mobile-menu-group">
                <a href="/about/">About</a>
                <a href="/contact/">Contact</a>
            </div>
        </div>
    </div>

    <!-- Hero -->
    <section class="blogi-hero">
        <h1 class="blogi-hero-title">The PuniCodex Blog</h1>
        <p class="blogi-hero-subtitle">Long-read essays on ${total} flagship Unicode restorations — the mythology, original scripts, pronunciation, archaeology, and IDN engineering behind the ancient names that now live in the address bar.</p>
        <div class="blogi-stats">
            <div class="blogi-stat">
                <span class="blogi-stat-value">${total}</span>
                <span class="blogi-stat-label">Essays</span>
            </div>
            <div class="blogi-stat">
                <span class="blogi-stat-value">${pantheonCount}</span>
                <span class="blogi-stat-label">Pantheons</span>
            </div>
            <div class="blogi-stat">
                <span class="blogi-stat-value">${tierCounts.dual}</span>
                <span class="blogi-stat-label">Dual-Tier</span>
            </div>
            <div class="blogi-stat">
                <span class="blogi-stat-value">${tierCounts[1]}</span>
                <span class="blogi-stat-label">Tier-1</span>
            </div>
            <div class="blogi-stat">
                <span class="blogi-stat-value">${avgRead} min</span>
                <span class="blogi-stat-label">Avg. Read</span>
            </div>
        </div>
    </section>

    <!-- Filters -->
    <section class="blogi-filters">
        <div class="blogi-panel">
            <div class="blogi-command">
                <div class="blogi-search">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <input type="text" id="blogi-search" placeholder="Search deities, titles, keywords..." autocomplete="off" aria-label="Search posts">
                </div>
                <select id="blogi-sort" class="blogi-select" aria-label="Sort posts">
                    <option value="alpha">Alphabetical</option>
                    <option value="pantheon">Pantheon</option>
                    <option value="reading">Reading time</option>
                </select>
            </div>
            <div class="blogi-group">
                <span class="blogi-group-label">Tier</span>
                <div class="blogi-pills" id="blogi-tier-pills">
                    <button class="blogi-pill active" data-tier="all">All</button>
                    <button class="blogi-pill" data-tier="dual">Dual<span class="count">${tierCounts.dual}</span></button>
                    <button class="blogi-pill" data-tier="1">Tier 1<span class="count">${tierCounts[1]}</span></button>
                    <button class="blogi-pill" data-tier="2">Tier 2<span class="count">${tierCounts[2]}</span></button>
                </div>
            </div>
            <div class="blogi-group">
                <span class="blogi-group-label">Pantheon</span>
                <div class="blogi-pills" id="blogi-pantheon-pills">
                    <button class="blogi-pill active" data-pantheon="all">All</button>
${pantheons
  .map(
    ([key, count]) =>
      `                    <button class="blogi-pill" data-pantheon="${escapeHtml(key)}">${escapeHtml(displayPantheon(key))}<span class="count">${count}</span></button>`
  )
  .join('\n')}
                </div>
            </div>
            <div class="blogi-meta">
                <span id="blogi-count">Showing ${total} of ${total} essays</span>
                <button type="button" class="blogi-reset" id="blogi-reset" hidden>Clear filters</button>
            </div>
        </div>
    </section>

    <!-- Grid -->
    <section class="section">
        <div class="blogi-grid" id="blogi-grid">
${cardsHtml}
        </div>
        <p class="blogi-empty" id="blogi-empty" hidden>No essays match those filters. <button type="button" class="blogi-reset" id="blogi-empty-reset">Clear filters</button></p>
    </section>

    <!-- Footer -->
    <footer class="main-footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <a href="/" class="footer-logo">PUNICODEX</a>
                    <p class="footer-tagline">Authentic unicode domains.<br>Real words. Real orthography. Real internet.</p>
                </div>
                <div class="footer-info">
                    <div class="footer-block">
                        <span class="footer-label">Essays</span>
                        <span class="footer-value">${total}</span>
                    </div>
                    <div class="footer-block">
                        <span class="footer-label">Pantheons</span>
                        <span class="footer-value">${pantheonCount}</span>
                    </div>
                    <div class="footer-block">
                        <span class="footer-label">Tier 1</span>
                        <span class="footer-value">${tierCounts[1]}</span>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <p class="footer-credit">The gods have returned &middot; The internet is merely the first temple</p>
            </div>
        </div>
    </footer>

    <script src="/js/px-core.js?v=perf8" defer></script>
    <script src="/js/temple-base.js?v=perf17" defer></script>
    <script>
    (function () {
        'use strict';
        var POSTS = ${payloadJson};
        var BY_ID = {};
        POSTS.forEach(function (p) { BY_ID[p.id] = p; });

        var grid = document.getElementById('blogi-grid');
        var cards = Array.prototype.slice.call(grid.querySelectorAll('.blogi-card'));
        var countEl = document.getElementById('blogi-count');
        var emptyEl = document.getElementById('blogi-empty');
        var resetBtn = document.getElementById('blogi-reset');
        var emptyResetBtn = document.getElementById('blogi-empty-reset');
        var searchEl = document.getElementById('blogi-search');
        var sortEl = document.getElementById('blogi-sort');
        var TOTAL = POSTS.length;

        var state = { q: '', pantheon: 'all', tier: 'all', sort: 'alpha' };

        function debounce(fn, ms) {
            var t;
            return function () {
                var args = arguments;
                clearTimeout(t);
                t = setTimeout(function () { fn.apply(null, args); }, ms);
            };
        }

        function apply() {
            var q = state.q.trim().toLowerCase();
            var visible = [];
            cards.forEach(function (card) {
                var p = BY_ID[card.getAttribute('data-id')];
                var ok =
                    (!q || p.s.indexOf(q) !== -1) &&
                    (state.pantheon === 'all' || p.p === state.pantheon) &&
                    (state.tier === 'all' || p.t === state.tier);
                card.style.display = ok ? '' : 'none';
                if (ok) visible.push(card);
            });

            visible.sort(function (a, b) {
                var pa = BY_ID[a.getAttribute('data-id')];
                var pb = BY_ID[b.getAttribute('data-id')];
                if (state.sort === 'reading') return pb.r - pa.r || pa.u.localeCompare(pb.u);
                if (state.sort === 'pantheon') {
                    return pa.p.localeCompare(pb.p) || pa.u.localeCompare(pb.u);
                }
                return pa.u.localeCompare(pb.u);
            });
            visible.forEach(function (card) { grid.appendChild(card); });

            countEl.textContent = 'Showing ' + visible.length + ' of ' + TOTAL + ' essays';
            emptyEl.hidden = visible.length !== 0;
            var filtered = q || state.pantheon !== 'all' || state.tier !== 'all';
            resetBtn.hidden = !filtered;
        }

        function reset() {
            state.q = '';
            state.pantheon = 'all';
            state.tier = 'all';
            searchEl.value = '';
            document.querySelectorAll('#blogi-tier-pills .blogi-pill').forEach(function (b) {
                b.classList.toggle('active', b.getAttribute('data-tier') === 'all');
            });
            document.querySelectorAll('#blogi-pantheon-pills .blogi-pill').forEach(function (b) {
                b.classList.toggle('active', b.getAttribute('data-pantheon') === 'all');
            });
            apply();
        }

        searchEl.addEventListener('input', debounce(function () {
            state.q = searchEl.value;
            apply();
        }, 150));
        sortEl.addEventListener('change', function () {
            state.sort = sortEl.value;
            apply();
        });
        document.getElementById('blogi-tier-pills').addEventListener('click', function (e) {
            var btn = e.target.closest('.blogi-pill');
            if (!btn) return;
            state.tier = btn.getAttribute('data-tier');
            this.querySelectorAll('.blogi-pill').forEach(function (b) { b.classList.toggle('active', b === btn); });
            apply();
        });
        document.getElementById('blogi-pantheon-pills').addEventListener('click', function (e) {
            var btn = e.target.closest('.blogi-pill');
            if (!btn) return;
            state.pantheon = btn.getAttribute('data-pantheon');
            this.querySelectorAll('.blogi-pill').forEach(function (b) { b.classList.toggle('active', b === btn); });
            apply();
        });
        resetBtn.addEventListener('click', reset);
        emptyResetBtn.addEventListener('click', reset);

        apply();
    })();
    </script>
</body>
</html>
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html, 'utf8');
console.log(`Blog index: blog/index.html written (${total} posts, ${pantheonCount} pantheons)`);
