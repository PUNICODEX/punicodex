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
const { preservationLabel } = require('./lib/preservation-label.js');
const vm = require('node:vm');
const { writeFileWithRetry } = require('./write-file-retry.js');
const { autoLink } = require('./lib/crosslink.js');
const { templeBreadcrumb } = require('./lib/breadcrumb.js');
const { templeFooterHtml } = require('./temple-footer.js');
const {
  getOriginalScript,
  getOriginalScriptLabel,
  hasOriginalScript,
} = require(path.join(__dirname, '..', 'type', 'js', 'original-scripts.js'));
const {
  escapeHtml,
  mdToHtml,
  buildTocHtml,
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

// Footer spec for the canonical temple footer (scripts/temple-footer.js):
// harvested from the temple home page's own footer so the blog can never
// drift from it. Handles both the current temple-footer <dt>/<dd> shape and
// the legacy footer-label spans; null when neither is present.
function extractFooterSpec(id) {
  const homePath = path.join(SITES_DIR, id, 'index.html');
  if (!fs.existsSync(homePath)) return null;
  const html = fs.readFileSync(homePath, 'utf8');
  const dt = html.match(/<dt>(Owned Domains|Domain Reference|Restoration)<\/dt><dd>([\s\S]*?)<\/dd>/);
  if (dt) return { label: dt[1], value: dt[2].trim() };
  const span = html.match(
    /<span class="footer-label">(Owned Domains|Domain Reference|Restoration)<\/span>\s*<span class="footer-value">([^<]+)<\/span>/
  );
  if (span) return { label: span[1], value: span[2].trim() };
  return null;
}

// Canonical temple footer via the shared hub-mirror builder — the same one
// sync-temple-footers.js, create-flagship.js and generate-temples.js use —
// so blog pages carry the pantheon name, the live lexicon count, the
// doctrine-correct script label, and the ASCII-canonical "recorded under its
// canonical spelling" wording instead of the stale legacy footer.
function buildTempleFooter(id, entry, footerSpec, classification) {
  const script = getOriginalScript(entry);
  const hasOriginal = hasOriginalScript(entry);
  return templeFooterHtml({
    name: entry?.unicode || id,
    pantheon: entry?.pantheon || '—',
    domainsLabel: footerSpec?.label || 'Restoration',
    domainsValue: footerSpec?.value || entry?.unicode || id,
    classification,
    scriptLabel: getOriginalScriptLabel(entry),
    script: hasOriginal ? script : entry?.unicode || id,
    logomarkSrc: `../assets/${id}_logomark.webp`,
    logomarkAlt: `${entry?.unicode || id} logomark`,
  });
}

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
  const footerSpec = extractFooterSpec(id);
  const domainsText = (footerSpec && footerSpec.value) || home.domainsText;

  const unicode = entry?.unicode || id;
  const greek = entry?.greek || '';
  const domain = entry?.domain || archetype?.domain || '';
  const tierLabel = preservationLabel(unicode);

  const outDir = path.join(SITES_DIR, id, 'blog');
  fs.mkdirSync(outDir, { recursive: true });

  const hasExtended = fs.existsSync(path.join(SITES_DIR, id, 'lore', 'extended', 'index.html'));
  const hasPatterns = fs.existsSync(path.join(SITES_DIR, id, 'patterns', 'index.html'));

  let html = TEMPLATE;

  // Doctrine (ACCURACY.md / original-scripts.js): only a name with a real
  // attested script may claim "the original script". Script-less traditions
  // get the scholarly-transliteration wording instead.
  const description = hasOriginalScript(entry)
    ? post.description
    : (post.description || '')
        .replace(/the original script/gi, 'the scholarly transliteration')
        .replace(/original script/gi, 'scholarly transliteration');

  // Doctrine (scripts/lib/ascii-editorial.js): a plain-ASCII canonical name
  // is not "restored". Guard against stale content JSONs that still say so.
  const asciiCanonical = [...unicode].every((c) => c.codePointAt(0) < 128);
  const body = asciiCanonical
    ? post.body.replace(/\*\*Restored name:\*\*/g, '**Canonical name:**')
    : post.body;

  const rendered = mdToHtml(body);
  rendered.html = autoLink(rendered.html, { selfId: id, allowAmbiguousAscii: true });

  const replacements = {
    TEMPLE_ID: id,
    UNICODE: escapeHtml(unicode),
    GREEK: escapeHtml(greek),
    ASCII: escapeHtml(entry?.ascii || id),
    DOMAIN: escapeHtml(domain),
    TIER_LABEL: escapeHtml(tierLabel),
    TIER_BADGES: `<span class="meta-badge">${escapeHtml(tierLabel)}</span>`,
    DOMAINS_TEXT: escapeHtml(domainsText),
    EFFECT: escapeHtml(home.effect),
    PRIMARY: escapeHtml(home.primary),
    SECONDARY: escapeHtml(home.secondary),
    POST_TITLE: escapeHtml(post.title),
    POST_TITLE_JSONLD: JSON.stringify(post.title),
    POST_DESCRIPTION_JSONLD: JSON.stringify(description),
    POST_DESCRIPTION: escapeHtml(description),
    POST_BODY_HTML: rendered.html,
    TOC_HTML: buildTocHtml(rendered.toc),
    POST_KEYWORDS_JSON: post.keywords.map((k) => JSON.stringify(k)).join(', '),
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
    FOOTER: buildTempleFooter(id, entry, footerSpec, tierLabel),
  };

  for (const [key, value] of Object.entries(replacements)) {
    html = html.split(`{{${key}}}`).join(value);
  }

  writeFileWithRetry(path.join(outDir, 'index.html'), html, 'utf8');
  created++;
}

console.log(`Blog pages: ${created} written (${skipped} skipped)`);
