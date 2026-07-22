/**
 * PuniCodex crosslink engine — turns deity mentions in prose into links to
 * their temples. Shared by every generator (blog, scholars, flagship lore,
 * extended lore) so the whole site crosslinks consistently.
 *
 * Two layers:
 *  1. transformWikilinks — explicit [[entry-id|Label]] markers → anchors.
 *  2. autoLink — conservative first-mention linking inside HTML text nodes:
 *     Unicode (diacritic) forms always match; ASCII forms match only when
 *     capitalized, whole-word, length ≥ 5, and not in the ambiguity
 *     blocklist. Never links: the page's own entry, inside existing anchors,
 *     headings, code, related-names chips, or more than once per entry per
 *     page (first mention wins).
 */

const cheerio = require('cheerio');
const { LEXICON } = require('../../type/js/lexicon.js');

const entries = Array.isArray(LEXICON) ? LEXICON : LEXICON.entries;
const BY_ID = new Map(entries.map((e) => [e.id, e]));

// ASCII names that collide with common English words (would false-positive
// constantly). Unicode/diacritic forms of the same entries still link.
const AMBIGUOUS_ASCII = new Set([
  'asia', 'nike', 'atlas', 'rhea', 'hera', 'io', 'ma', 'ba', 'ge', 'ea', 'ab',
  'anu', 'su', 'ki', 'ai', 'ra', 'sol', 'mot', 'day', 'ker', 'meme', 'maat',
  'kore', 'achilles', 'cain', 'abel', 'noah', 'moses', 'david', 'solomon',
  'delos', 'kobe', 'osaka', 'kyoto', 'long', 'bagua', 'wuji', 'shango', 'utu',
  'abzu', 'aker', 'aiton', 'mana', 'tane', 'ropa', 'hina', 'erebus', 'europe',
  'ran', 'hel', 'dis', 'set', 'min', 'nut', 'ops', 'gaia', 'memphis', 'circe',
  'medea', 'hermia', 'helen', 'cassandra', 'electra', 'danae', 'europa',
]);

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function capitalize(s) {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

// Build the match table once: [{ id, form }] sorted longest-first so
// overlapping names match the longest form first.
const MATCHES = [];
for (const e of entries) {
  if (e.unicode && e.unicode.length >= 2 && e.unicode !== e.ascii) {
    // Diacritic/native-script forms always match. Plain ASCII "unicode" forms
    // (capitalized spelling only) follow the same rules as ASCII mentions.
    if (/[^\x00-\x7F]/.test(e.unicode)) {
      MATCHES.push({ id: e.id, form: e.unicode });
    }
  }
  if (
    e.ascii &&
    /^[a-z][a-z-]+$/.test(e.ascii) &&
    e.ascii.length >= 4 &&
    !AMBIGUOUS_ASCII.has(e.ascii)
  ) {
    MATCHES.push({ id: e.id, form: capitalize(e.ascii) });
  }
}
MATCHES.sort((a, b) => b.form.length - a.form.length);

// One combined alternation for candidate discovery (unicode-aware boundaries).
const COMBINED = new RegExp(
  `(?<![\\p{L}\\p{M}])(${MATCHES.map((m) => escapeRe(m.form)).join('|')})(?![\\p{L}\\p{M}])`,
  'gu'
);
const FORM_TO_ID = new Map(MATCHES.map((m) => [m.form, m.id]));

const SKIP_TAGS = new Set([
  'a',
  'code',
  'pre',
  'script',
  'style',
  'textarea',
  'option',
  'head',
  'title',
  'meta',
  'link',
]);
const SKIP_CLASS = /related|sister|chip|crosslink|toc|nav|footer|badge/i;

/**
 * Explicit markers: [[entry-id|Label]] → <a class="crosslink">. Unknown ids
 * degrade to the label text alone (never a broken link).
 */
function transformWikilinks(html, { hrefFor = (id) => `/sites/${id}/` } = {}) {
  return html.replace(/\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g, (m, id, label) => {
    if (BY_ID.has(id)) {
      return `<a href="${hrefFor(id)}" class="crosslink" data-crosslink="${id}">${label}</a>`;
    }
    return label;
  });
}

/**
 * First-mention auto-linking over HTML text nodes. Returns new HTML.
 * Options:
 *   selfId   — the page's own entry (never self-linked)
 *   hrefFor  — href builder (default /sites/{id}/)
 *   maxPerEntry — links per entry per page (default 1)
 */
function autoLink(html, { selfId, hrefFor = (id) => `/sites/${id}/`, maxPerEntry = 1 } = {}) {
  const linkedCount = new Map();
  // Document mode for full pages (doctype/head intact), fragment mode for
  // partial HTML (section bodies).
  const isDocument = /^\s*<!doctype/i.test(html) || /^\s*<html[\s>]/i.test(html);
  const $ = cheerio.load(html, { decodeEntities: false }, isDocument);

  function canLink(id) {
    return id !== selfId && (linkedCount.get(id) || 0) < maxPerEntry;
  }

  $('*:not(head)')
    .contents()
    .each((_, node) => {
      if (node.type !== 'text' || !node.data || !node.data.trim()) return;
      // Skip ancestors: anchors/code/headings/related sections.
      let p = node.parent;
      let skip = false;
      while (p && p.type === 'tag') {
        if (SKIP_TAGS.has(p.name) || /^h[1-6]$/.test(p.name)) {
          skip = true;
          break;
        }
        const cls = (p.attribs && p.attribs.class) || '';
        if (cls && SKIP_CLASS.test(cls)) {
          skip = true;
          break;
        }
        p = p.parent;
      }
      if (skip) return;

      COMBINED.lastIndex = 0;
      const text = node.data;
      let out = '';
      let cursor = 0;
      let changed = false;
      let m;
      while ((m = COMBINED.exec(text)) !== null) {
        const form = m[1];
        const id = FORM_TO_ID.get(form);
        if (!id || !canLink(id)) continue;
        const href = hrefFor(id);
        out += text.slice(cursor, m.index);
        out += `<a href="${href}" class="crosslink" data-crosslink="${id}">${form}</a>`;
        cursor = m.index + form.length;
        linkedCount.set(id, (linkedCount.get(id) || 0) + 1);
        changed = true;
      }
      if (changed) {
        out += text.slice(cursor);
        // Replace the text node with raw HTML.
        $(node).replaceWith(out);
      }
    });

  return $.root().html();
}

module.exports = {
  transformWikilinks,
  autoLink,
  AMBIGUOUS_ASCII,
  BY_ID,
};
