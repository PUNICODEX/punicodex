#!/usr/bin/env node
/**
 * PuniCodex — blog series page generator (Restoration Files + Resonance Files)
 *
 * Renders every series dispatch per flagship temple as an individually
 * addressable page with prev/next series navigation, the founding-post
 * backlink, and the cross-series link. Series config below; adding a series
 * means adding one entry here and its content generator to generate.js.
 *
 * Usage:
 *   node scripts/generate-blog-series-pages.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { writeFileWithRetry } = require('./write-file-retry.js');
const { autoLink } = require('./lib/crosslink.js');
const {
  escapeHtml,
  mdToHtml,
  buildTocHtml,
  buildFooter,
  buildExtendedTab,
  buildPatternsTab,
  extractFromHomePage,
} = require('./lib/blog-render.js');

const ROOT = path.join(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT, 'templates', 'flagship', 'blog', 'index.html');
const SITES_DIR = path.join(ROOT, 'sites');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(
  `(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`
);
const BUILT_IDS = ARCHETYPES.filter((a) => a.built).map((a) => a.id).sort();
const LEXICON_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));

const TEMPLATE = fs.readFileSync(TEMPLATE_PATH, 'utf8');

// ── Series registry ─────────────────────────────────────────────────────────

const SERIES = [
  {
    id: 'restoration',
    contentDir: path.join(ROOT, 'platform', 'blog', 'series', 'restoration'),
    urlPath: 'blog/restoration/',
    titleSuffix: 'The Restoration Files',
    masthead: 'The Restoration Files',
    cross: { urlPath: 'blog/resonance/', masthead: 'The Resonance Files' },
  },
  {
    id: 'resonance',
    contentDir: path.join(ROOT, 'platform', 'blog', 'series', 'resonance'),
    urlPath: 'blog/resonance/',
    titleSuffix: 'The Resonance Files',
    masthead: 'The Resonance Files',
    cross: { urlPath: 'blog/restoration/', masthead: 'The Restoration Files' },
  },
];

function buildSeriesNav(id, series) {
  const idx = BUILT_IDS.indexOf(id);
  const prev = idx > 0 ? BUILT_IDS[idx - 1] : null;
  const next = idx < BUILT_IDS.length - 1 ? BUILT_IDS[idx + 1] : null;
  const prevEntry = prev && LEXICON_BY_ID.get(prev);
  const nextEntry = next && LEXICON_BY_ID.get(next);
  const links = [];
  if (prevEntry) {
    links.push(
      `<a href="../../../${prev}/${series.urlPath}" class="series-nav-prev">← ${escapeHtml(prevEntry.unicode)}</a>`
    );
  }
  links.push('<a href="../" class="series-nav-home">The founding dispatch</a>');
  links.push(
    `<a href="../../${series.cross.urlPath}" class="series-nav-cross">${series.cross.masthead} for this temple</a>`
  );
  if (nextEntry) {
    links.push(
      `<a href="../../../${next}/${series.urlPath}" class="series-nav-next">${escapeHtml(nextEntry.unicode)} →</a>`
    );
  }
  return `<nav class="blog-series-nav reveal-up" aria-label="${series.masthead} series navigation">
            <h2 class="blog-cta-title">${series.masthead}</h2>
            <div class="series-nav-links">${links.join('\n            ')}</div>
        </nav>`;
}

// ── Main loops ──────────────────────────────────────────────────────────────

for (const series of SERIES) {
  let created = 0;

  for (const id of BUILT_IDS) {
    const contentPath = path.join(series.contentDir, `${id}.json`);
    if (!fs.existsSync(contentPath)) {
      console.warn(`  skipping ${id}: no ${series.id} content JSON`);
      continue;
    }

    const post = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
    const entry = LEXICON_BY_ID.get(id);
    const archetype = ARCHETYPES.find((a) => a.id === id);
    const home = extractFromHomePage(id, entry);

    const unicode = entry?.unicode || id;
    const greek = entry?.greek || '';
    const domain = entry?.domain || archetype?.domain || '';
    const tierLabel = entry?.tierLabel || `Tier ${entry?.tier || '2'}`;

    const outDir = path.join(SITES_DIR, id, 'blog', series.id);
    fs.mkdirSync(outDir, { recursive: true });

    const hasExtended = fs.existsSync(path.join(SITES_DIR, id, 'lore', 'extended', 'index.html'));
    const hasPatterns = fs.existsSync(path.join(SITES_DIR, id, 'patterns', 'index.html'));

    let html = TEMPLATE;

    const rendered = mdToHtml(post.body);
    rendered.html = autoLink(rendered.html, { selfId: id });

    const replacements = {
      TEMPLE_ID: id,
      UNICODE: escapeHtml(unicode),
      GREEK: escapeHtml(greek),
      ASCII: escapeHtml(entry?.ascii || id),
      DOMAIN: escapeHtml(domain),
      TIER_LABEL: escapeHtml(tierLabel),
      TIER_BADGES:
        entry?.tier === 'dual'
          ? '<span class="meta-badge">Tier-1</span> <span class="meta-badge">Tier-2</span>'
          : `<span class="meta-badge">${escapeHtml(tierLabel)}</span>`,
      DOMAINS_TEXT: escapeHtml(home.domainsText),
      EFFECT: escapeHtml(home.effect),
      PRIMARY: escapeHtml(home.primary),
      SECONDARY: escapeHtml(home.secondary),
      POST_TITLE: escapeHtml(post.title),
      POST_DESCRIPTION: escapeHtml(post.description),
      POST_BODY_HTML: rendered.html,
      TOC_HTML: buildTocHtml(rendered.toc),
      POST_KEYWORDS_JSON: post.keywords.map((k) => `"${escapeHtml(k)}"`).join(', '),
      POST_TAGS_HTML: post.tags.map((t) => `<span class="blog-tag">${escapeHtml(t)}</span>`).join(''),
      READING_TIME: escapeHtml(post.readingTime),
      PUBLISHED_AT: escapeHtml(post.publishedAt),
      AUTHOR: escapeHtml(post.author),
      POST_PATH: series.urlPath,
      REL: '../..',
      BLOG_URL: '../',
      TITLE_SUFFIX: series.titleSuffix,
      EYEBROW: `${series.masthead} · No. ${post.seriesNo}`,
      SERIES_NAV_HTML: buildSeriesNav(id, series),
      EXTENDED_TAB: buildExtendedTab(id, hasExtended, '../..'),
      PATTERNS_TAB: buildPatternsTab(id, hasPatterns, '../..'),
      FOOTER: buildFooter(id, entry, home.domainsText, tierLabel, '../..'),
    };

    for (const [key, value] of Object.entries(replacements)) {
      html = html.split(`{{${key}}}`).join(value);
    }

    writeFileWithRetry(path.join(outDir, 'index.html'), html, 'utf8');
    created++;
  }

  console.log(`${series.masthead}: ${created} pages written`);
}
