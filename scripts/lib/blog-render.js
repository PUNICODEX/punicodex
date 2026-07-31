/**
 * PuniCodex — shared blog render machinery
 *
 * The markdown→HTML pipeline, TOC builder, footer/tab builders, and the
 * per-temple homepage extraction shared by the blog page generators
 * (generate-blog-pages.js, generate-blog-series-pages.js).
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const SITES_DIR = path.join(ROOT, 'sites');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const { getOriginalScript } = require(path.join(ROOT, 'type', 'js', 'original-scripts.js'));
const LEXICON_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));

const FLAGSHIP_DATA = (() => {
  try {
    return require(path.join(ROOT, 'scripts', 'flagship-data.json'));
  } catch {
    return {};
  }
})();

function displayPantheon(p) {
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : '';
}

// ── Deterministic canvas-effect fallback ────────────────────────────────────

function getCanvasEffect(entry) {
  const id = entry.id;
  if (FLAGSHIP_DATA.effectMap?.[id]) return FLAGSHIP_DATA.effectMap[id];

  const pantheon = entry.pantheon || '';
  const domain = (entry.domain || '').toLowerCase();
  const meaning = (entry.meaning || '').toLowerCase();
  const combined = `${domain} ${meaning}`;
  const has = (words) => words.some((w) => combined.includes(w));

  if (id === 'aither' || id === 'ouranos' || id === 'uranus' || has(['aether', 'upper air', 'bright upper']))
    return 'aurora';
  if (['varuna', 'praajapati', 'prajapati', 'rta', 'maat', 'vishnu'].includes(id)) return 'cosmicNet';
  if (id === 'anat' || id === 'baal' || id === 'enlil' || has(['desert storm', 'sumerian wind']))
    return 'sandstorm';
  if (
    ['apsu', 'ea', 'okeanos', 'pontos'].includes(id) ||
    has(['abyss', 'freshwater abyss', 'fresh water', 'primordial water'])
  )
    return 'abyssal';
  if (['ka', 'ba', 'akh'].includes(id) || has(['soul', 'life force', 'vital essence', 'double']))
    return 'soul';
  if (['trengtreng', 'typhon', 'ishtar', 'astart'].includes(id) || has(['volcanic', 'thunder war']))
    return 'volcanic';
  if (id === 'eros' || has(['desire', 'love', 'passion'])) return 'light';
  if (id === 'asherah' || id === 'inanna') return 'tree';
  if (['zeus', 'thor', 'jupiter', 'perun', 'adad', 'shu'].includes(id) || has(['thunder', 'storm', 'lightning']))
    return 'storm';
  if (
    ['kronos', 'cronus', 'chronos', 'saturn'].includes(id) ||
    has(['time', 'harvest', 'golden age'])
  )
    return 'time';
  if (
    ['hades', 'nott', 'hekate', 'kali', 'tartaros', 'chaos'].includes(id) ||
    has(['dark', 'void', 'night', 'death', 'underworld'])
  )
    return 'void';
  if (
    ['apollo', 'ra', 'helios', 'surya', 'savitr', 'amaterasu', 'int'].includes(id) ||
    has(['sun', 'light', 'dawn'])
  )
    return 'sun';
  if (['poseidon', 'aphrodite', 'loki', 'njor'].includes(id) || has(['water', 'sea', 'ocean', 'wave', 'river']))
    return 'water';
  if (
    ['gaia', 'rhea', 'demeter', 'cybele', 'inanna', 'asherah', 'anu', 'nut', 'geb'].includes(id) ||
    has(['earth', 'mountain', 'fertility', 'mother'])
  )
    return 'mountain';
  if (
    ['artemis', 'diana', 'selene', 'chandra', 'tsukuyomi'].includes(id) ||
    has(['moon', 'hunt', 'stars'])
  )
    return 'stars';
  if (
    ['odin', 'thoth', 'bragi', 'saraswati', 'ganesha', 'hanuman', 'hermes'].includes(id) ||
    has(['wisdom', 'knowledge', 'word', 'poetry', 'messenger'])
  )
    return 'light';
  if (['prometheus', 'hephaistos', 'logi', 'aguni', 'kali'].includes(id) || has(['fire', 'flame', 'forge']))
    return 'flame';
  if (['yggdrasil', 'silvanus', 'dionysos'].includes(id) || has(['tree', 'vine', 'forest'])) return 'tree';
  if (pantheon === 'norse' || pantheon === 'celtic' || pantheon === 'slavic') return 'stars';
  if (pantheon === 'egyptian') return 'sun';
  if (pantheon === 'mesopotamian') return 'sandstorm';
  return 'particles';
}

function extractFromHomePage(id, entry) {
  const defaults = {
    effect: getCanvasEffect(entry),
    primary: '#D4AF37',
    secondary: '#4169E1',
    domainsText: entry.unicode,
  };
  const homePath = path.join(SITES_DIR, id, 'index.html');
  if (!fs.existsSync(homePath)) return defaults;
  try {
    const html = fs.readFileSync(homePath, 'utf8');

    const effectMatch = html.match(/<canvas[^>]*data-effect="([^"]*)"[^>]*>/);
    if (effectMatch) defaults.effect = effectMatch[1];

    const primaryMatch = html.match(/<canvas[^>]*data-primary="([^"]*)"[^>]*>/);
    if (primaryMatch) defaults.primary = primaryMatch[1];

    const secondaryMatch = html.match(/<canvas[^>]*data-secondary="([^"]*)"[^>]*>/);
    if (secondaryMatch) defaults.secondary = secondaryMatch[1];

    const ownedMatch = html.match(
      /<span class="footer-label">Owned Domains<\/span>\s*<span class="footer-value">([^<]+)<\/span>/
    );
    if (ownedMatch) defaults.domainsText = ownedMatch[1].trim();
  } catch {
    // fall back to defaults
  }
  return defaults;
}

// ── HTML helpers ────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Slug for anchored headings: ASCII-folded, hyphenated, unique per document.
function slugify(text) {
  const base = String(text)
    .replace(/(\*\*|__|\*|`)/g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'section';
}

// URL-scheme allowlist plus a plausibility check: only http:, https:,
// mailto:, anchored relative URLs (/, ./, ../, #), and path-like targets
// (containing /, ., ?, or #) become links. Anything else — unknown schemes
// (javascript:, data:) or bracket notations from linguistic reconstructions
// such as *[g](r)ək — renders as literal text, never as an anchor.
function isSafeHref(url) {
  const u = String(url).trim();
  if (/^(https?:|mailto:)/i.test(u)) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return false;
  if (/^(\/|\.\/|\.\.\/|#)/.test(u)) return true;
  return /[\/.?#]/.test(u);
}

// Render the post markdown to HTML and collect the H2 table of contents.
// Returns { html, toc: [{ slug, text }] }.
function mdToHtml(md) {
  let html = escapeHtml(md);

  // Defense in depth: footnote markers are not rendered, drop them.
  html = html.replace(/\[\^\d+\]/g, '');

  // Inline links before formatting so escaped brackets are not an issue.
  // Non-plausible targets stay as literal source text (see isSafeHref).
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, url) => {
    if (!isSafeHref(url)) return m;
    return `<a href="${url}">${label}</a>`;
  });

  // Wikilinks [[entry-id|Label]] → <a href="/sites/{id}/">Label</a>.
  // Unknown ids degrade to the label text alone (no broken links).
  html = html.replace(/\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g, (m, id, label) => {
    if (LEXICON_BY_ID.has(id)) return `<a href="/sites/${id}/">${label}</a>`;
    return label;
  });
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  const usedSlugs = new Map();
  const toc = [];
  // Headings are already entity-escaped at this point; slugs should be
  // computed from the plain text, and the TOC reuses the escaped form.
  const unescape = (s) =>
    s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  const uniqueSlug = (text) => {
    const base = slugify(unescape(text));
    const seen = usedSlugs.get(base) || 0;
    usedSlugs.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  };

  html = html.replace(/^### (.+)$/gm, (m, text) => `<h3 id="${uniqueSlug(text)}">${text}</h3>`);
  html = html.replace(/^## (.+)$/gm, (m, text) => {
    const slug = uniqueSlug(text);
    toc.push({ slug, text: text.replace(/(\*\*|__|\*|`)/g, '') });
    return `<h2 id="${slug}">${text}</h2>`;
  });
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  const lines = html.split('\n');
  const out = [];
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.startsWith('- ')) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`  <li>${line.slice(2)}</li>`);
    } else {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      if (line.trim() === '') {
        continue;
      }
      if (/^<h[123]/.test(line)) {
        out.push(line);
      } else {
        out.push(`<p>${line}</p>`);
      }
    }
  }
  if (inList) out.push('</ul>');

  return { html: out.join('\n'), toc };
}

function buildTocHtml(toc) {
  if (!toc.length) return '';
  // toc text is already entity-escaped by mdToHtml; insert as-is.
  const items = toc
    .map((t) => `                <li><a href="#${t.slug}">${t.text}</a></li>`)
    .join('\n');
  return `<nav class="blog-toc reveal-up" aria-label="Table of contents">
            <h2 class="blog-toc-title">In this article</h2>
            <ol class="blog-toc-list">
${items}
            </ol>
        </nav>`;
}

function buildFooter(id, entry, domainsText, tierLabel, rel) {
  const script = getOriginalScript(entry) || entry?.greek || '—';
  const base = rel || '..';
  return `<footer class="main-footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <a href="https://punicodex.com/" class="footer-logo">PUNICODEX</a>
                    <p class="footer-tagline">Authentic unicode domains.<br>Real words. Real orthography. Real internet.</p>
                </div>
                <div class="footer-info">
                    <div class="footer-block">
                        <span class="footer-label">Owned Domains</span>
                        <span class="footer-value">${escapeHtml(domainsText)}</span>
                    </div>
                    <div class="footer-block">
                        <span class="footer-label">Classification</span>
                        <span class="footer-value">${escapeHtml(tierLabel)}</span>
                    </div>
                    <div class="footer-block">
                        <span class="footer-label">Original Script</span>
                        <span class="footer-value">${escapeHtml(script)}</span>
                    </div>
                </div>
            </div>
            <div class="footer-seal">
                <picture><source srcset="${base}/assets/${id}_logomark.webp" type="image/webp"><img src="${base}/assets/${id}_logomark.png" alt="${escapeHtml(entry?.unicode || id)} logomark" class="footer-logomark"></picture>
            </div>
            <div class="footer-bottom">
                <p class="footer-credit">The gods have returned &middot; The internet is merely the first temple</p>
            </div>
        </div>
    </footer>`;
}

function buildExtendedTab(id, hasExtended, rel) {
  if (!hasExtended) return '';
  const base = rel || '..';
  return `<a href="${base}/lore/extended/index.html" class="nav-link">Extended</a>`;
}

function buildPatternsTab(id, hasPatterns, rel) {
  if (!hasPatterns) return '';
  const base = rel || '..';
  return `<a href="${base}/patterns/index.html" class="nav-link">Patterns</a>`;
}

// The Restoration Files cross-link, rendered on each temple's founding post
// when its series file exists.
function buildSeriesLink(id) {
  const asides = [];
  const restorationPath = path.join(ROOT, 'platform', 'blog', 'series', 'restoration', `${id}.json`);
  if (fs.existsSync(restorationPath)) {
    const post = JSON.parse(fs.readFileSync(restorationPath, 'utf8'));
    asides.push(`<aside class="blog-series-nav reveal-up">
            <h2 class="blog-cta-title">The Restoration Files</h2>
            <p>A second dispatch from this temple, No. ${post.seriesNo} in the series: <a href="./restoration/">${escapeHtml(post.title)}</a> — the restoration, the temple, and the world it opens.</p>
        </aside>`);
  }
  const resonancePath = path.join(ROOT, 'platform', 'blog', 'series', 'resonance', `${id}.json`);
  if (fs.existsSync(resonancePath)) {
    const post = JSON.parse(fs.readFileSync(resonancePath, 'utf8'));
    asides.push(`<aside class="blog-series-nav reveal-up">
            <h2 class="blog-cta-title">The Resonance Files</h2>
            <p>The third dispatch, where the myths meet the markets: <a href="./resonance/">${escapeHtml(post.title)}</a> — the archetype at work in real industries.</p>
        </aside>`);
  }
  return asides.join('\n');
}

module.exports = {
  displayPantheon,
  getCanvasEffect,
  extractFromHomePage,
  escapeHtml,
  mdToHtml,
  buildTocHtml,
  buildFooter,
  buildExtendedTab,
  buildPatternsTab,
  buildSeriesLink,
};
