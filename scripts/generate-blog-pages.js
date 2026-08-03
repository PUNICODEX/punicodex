#!/usr/bin/env node
/**
 * PuniCodex — Blog page generator
 *
 * Reads platform/blog/content/{id}.json and templates/flagship/blog/index.html,
 * then writes sites/{id}/blog/index.html for every built flagship.
 *
 * Usage:
 *   node scripts/generate-blog-pages.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { writeFileWithRetry } = require('./write-file-retry.js');
const { autoLink } = require('./lib/crosslink.js');
const { templeBreadcrumb } = require('./lib/breadcrumb.js');
const {
  escapeHtml,
  mdToHtml,
  buildTocHtml,
  buildFooter,
  buildExtendedTab,
  buildPatternsTab,
  buildSeriesLink,
  extractFromHomePage,
  serpTitle,
} = require('./lib/blog-render.js');

const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'platform', 'blog', 'content');
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

// ── Main loop ───────────────────────────────────────────────────────────────

let created = 0;
let skipped = 0;

for (const id of BUILT_IDS) {
  const contentPath = path.join(BLOG_DIR, `${id}.json`);
  if (!fs.existsSync(contentPath)) {
    console.warn(`  skipping ${id}: no blog content JSON`);
    skipped++;
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

  const outDir = path.join(SITES_DIR, id, 'blog');
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
    POST_PATH: 'blog/',
    REL: '..',
    BLOG_URL: './',
    BREADCRUMB_JSONLD: templeBreadcrumb(
      { id, unicode },
      { name: 'Blog', path: 'blog/' }
    ),
    TITLE_SUFFIX: `${escapeHtml(unicode)} Blog`,
    EYEBROW: `${escapeHtml(unicode)} — Blog`,
    SERP_TITLE: escapeHtml(serpTitle(post.title, `${unicode} Blog`)),
    SERIES_NAV_HTML: buildSeriesLink(id),
    EXTENDED_TAB: buildExtendedTab(id, hasExtended, '..'),
    PATTERNS_TAB: buildPatternsTab(id, hasPatterns, '..'),
    FOOTER: buildFooter(id, entry, home.domainsText, tierLabel, '..'),
  };

  for (const [key, value] of Object.entries(replacements)) {
    html = html.split(`{{${key}}}`).join(value);
  }

  writeFileWithRetry(path.join(outDir, 'index.html'), html, 'utf8');
  created++;
}

console.log(`Blog pages: ${created} written (${skipped} skipped)`);
