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
 *     blocklist (plain English words such as "long" or "set" never link).
 *     Never links: the page's own entry, inside existing anchors,
 *     headings, code, pronunciation/phoneme glosses, related-names chips,
 *     or more than once per entry per page (first mention wins). Optional
 *     citation linking (linkCitations) connects cited works — Hávamál,
 *     Gylfaginning 15, Ṛgveda 7.86 — to their /texts/ library page or
 *     deep anchor.
 */

const cheerio = require('cheerio');
const { LEXICON } = require('../../type/js/lexicon.js');

const entries = Array.isArray(LEXICON) ? LEXICON : LEXICON.entries;
const BY_ID = new Map(entries.map((e) => [e.id, e]));

// ASCII names that collide with common English words. Two tiers:
//  - NEVER_LINK: ordinary vocabulary (long, day, set…) — never linked, even
//    when a caller opts into ambiguous names. Unicode/diacritic forms of the
//    same entries still link.
//  - AMBIGUOUS_ASCII: names that ARE the deity when capitalized in
//    mythological prose (Nike, Atlas, Gaia, Hera…) — linked only when the
//    caller passes allowAmbiguousAscii.
const NEVER_LINK = new Set(['long', 'day', 'set', 'min', 'nut', 'ran', 'meme']);
const AMBIGUOUS_ASCII = new Set([
  'asia', 'nike', 'atlas', 'rhea', 'hera', 'io', 'ma', 'ba', 'ge', 'ea', 'ab',
  'anu', 'su', 'ki', 'ai', 'ra', 'sol', 'mot', 'ker', 'maat',
  'kore', 'achilles', 'cain', 'abel', 'noah', 'moses', 'david', 'solomon',
  'delos', 'kobe', 'osaka', 'kyoto', 'bagua', 'wuji', 'shango', 'utu',
  'abzu', 'aker', 'aiton', 'mana', 'tane', 'ropa', 'hina', 'erebus', 'europe',
  'hel', 'dis', 'ops', 'gaia', 'memphis', 'circe',
  'medea', 'hermia', 'helen', 'cassandra', 'electra', 'danae', 'europa',
]);

// Works in the public /texts/ library. Citations in prose (myth tags, in-text
// references, source lists) link to the text — deep-linked to the poem /
// chapter / tablet anchor where the library has one. Works NOT in the library
// (Iliad, Odyssey, Popol Vuh…) are deliberately absent: never dead-link.
// `re` must have exactly one capture group when `anchor` is a function.
const TEXTS_BASE = '/texts';
const TEXT_CITATIONS = [
  // Poetic Edda lays (Bellows-style anchors on the poetic-edda page)
  { key: 'voluspo', re: /Völuspá|Voluspa/g, href: `${TEXTS_BASE}/poetic-edda/#voluspo` },
  { key: 'hovamol', re: /Hávamál|Havamal|Hovamol/g, href: `${TEXTS_BASE}/poetic-edda/#hovamol` },
  { key: 'grimnismol', re: /Grímnismál|Grimnismal|Grimnismol/g, href: `${TEXTS_BASE}/poetic-edda/#grimnismol` },
  { key: 'skirnismol', re: /Skírnismál|Skirnismal|Skirnismol/g, href: `${TEXTS_BASE}/poetic-edda/#skirnismol` },
  { key: 'harbarthsljoth', re: /Hárbarðsljóð|Harbarthsljoth/g, href: `${TEXTS_BASE}/poetic-edda/#harbarthsljoth` },
  { key: 'hymiskvitha', re: /Hymiskviða|Hymiskvitha/g, href: `${TEXTS_BASE}/poetic-edda/#hymiskvitha` },
  { key: 'lokasenna', re: /Lokasenna/g, href: `${TEXTS_BASE}/poetic-edda/#lokasenna` },
  { key: 'thrymskvitha', re: /Þrymskviða|Thrymskvitha/g, href: `${TEXTS_BASE}/poetic-edda/#thrymskvitha` },
  { key: 'vafthruthnismol', re: /Vafþrúðnismál|Vafthruthnismal|Vafthruthnismol/g, href: `${TEXTS_BASE}/poetic-edda/#vafthruthnismol` },
  { key: 'alvissmol', re: /Alvíssmál|Alvissmal|Alvissmol/g, href: `${TEXTS_BASE}/poetic-edda/#alvissmol` },
  { key: 'baldrs-draumar', re: /Baldrs draumar|Baldr's dreams|Baldrs draumar/gi, href: `${TEXTS_BASE}/poetic-edda/#baldrs-draumar` },
  { key: 'rigsthula', re: /Rígsþula|Rigsthula|Rígþula/g, href: `${TEXTS_BASE}/poetic-edda/#rigsthula` },
  { key: 'hyndluljoth', re: /Hyndluljóð|Hyndluljoth/g, href: `${TEXTS_BASE}/poetic-edda/#hyndluljoth` },
  { key: 'sigrdrifumol', re: /Sigrdrífumál|Sigrdrifumal|Sigrdrifumol/g, href: `${TEXTS_BASE}/poetic-edda/#sigrdrifumol` },
  { key: 'fafnismol', re: /Fáfnismál|Fafnismal|Fafnismol/g, href: `${TEXTS_BASE}/poetic-edda/#fafnismol` },
  { key: 'reginsmol', re: /Reginsmál|Reginsmal|Reginsmol/g, href: `${TEXTS_BASE}/poetic-edda/#reginsmol` },
  { key: 'gripisspo', re: /Grípisspá|Gripisspa|Gripisspo/g, href: `${TEXTS_BASE}/poetic-edda/#gripisspo` },
  { key: 'volundarkvitha', re: /Völundarkviða|Volundarkvitha/g, href: `${TEXTS_BASE}/poetic-edda/#volundarkvitha` },
  { key: 'poetic-edda', re: /Elder Edda|Poetic Edda/g, href: `${TEXTS_BASE}/poetic-edda/` },
  // Prose Edda — chapter-level anchors (Gylfaginning 15 → #gylfaginning-15)
  {
    key: 'gylfaginning',
    re: /Gylfaginning\s+(\d{1,2})/g,
    anchor: (n) => `${TEXTS_BASE}/prose-edda/#gylfaginning-${String(n).padStart(2, '0')}`,
  },
  { key: 'gylfaginning', re: /Gylfaginning/g, href: `${TEXTS_BASE}/prose-edda/` },
  {
    key: 'skaldskaparmal',
    re: /Skáldskaparmál\s+(\d{1,2})|Skaldskaparmal\s+(\d{1,2})/g,
    anchor: (n) => `${TEXTS_BASE}/prose-edda/#skaldskaparmal-${String(n).padStart(2, '0')}`,
  },
  { key: 'skaldskaparmal', re: /Skáldskaparmál|Skaldskaparmal/g, href: `${TEXTS_BASE}/prose-edda/` },
  { key: 'prose-edda', re: /Prose Edda|Younger Edda/g, href: `${TEXTS_BASE}/prose-edda/` },
  { key: 'volsunga-saga', re: /Völsunga Saga|Volsunga Saga|Völsunga saga/g, href: `${TEXTS_BASE}/volsunga-saga/` },
  // Mesopotamia
  { key: 'enuma-elish', re: /Enūma Eliš|Enuma Elish/g, href: `${TEXTS_BASE}/enuma-elish/` },
  { key: 'gilgamesh-text', re: /Epic of Gilgamesh/g, href: `${TEXTS_BASE}/gilgamesh/` },
  // Greece & Rome
  { key: 'theogony', re: /Theogony/g, href: `${TEXTS_BASE}/theogony/` },
  { key: 'works-and-days', re: /Works and Days/g, href: `${TEXTS_BASE}/works-and-days/` },
  { key: 'metamorphoses', re: /Metamorphoses/g, href: `${TEXTS_BASE}/metamorphoses/` },
  { key: 'homeric-hymns', re: /Homeric Hymns|Homeric Hymn(?=\s+to)/g, href: `${TEXTS_BASE}/homeric-hymns/` },
  // Egypt
  { key: 'book-of-the-dead', re: /Book of the Dead/g, href: `${TEXTS_BASE}/book-of-the-dead/` },
  // India & Buddhism
  {
    key: 'rig-veda',
    re: /(?:Ṛgveda|Ṛg Veda|Rig Veda|Rigveda)(?:\s+Saṃhitā)?\s+(\d{1,2})[.,]/g,
    anchor: (n) => `${TEXTS_BASE}/rig-veda/#mandala-${String(n).padStart(2, '0')}`,
  },
  { key: 'rig-veda', re: /Ṛgveda Saṃhitā|Ṛgveda|Ṛg Veda|Rig Veda|Rigveda/g, href: `${TEXTS_BASE}/rig-veda/` },
  { key: 'ramayana', re: /Rāmāyaṇa|Ramayana/g, href: `${TEXTS_BASE}/ramayana/` },
  { key: 'lotus-sutra', re: /Lotus Sūtra|Lotus Sutra/g, href: `${TEXTS_BASE}/lotus-sutra/` },
  { key: 'sukhavativyuha', re: /Sukhāvatīvyūha|Sukhavativyuha/g, href: `${TEXTS_BASE}/sukhavativyuha/` },
  // China & Japan
  { key: 'tao-te-ching', re: /Tao Te Ching|Dao De Jing|Daodejing/g, href: `${TEXTS_BASE}/tao-te-ching/` },
  { key: 'kojiki', re: /Kojiki/g, href: `${TEXTS_BASE}/kojiki/` },
  { key: 'nihon-shoki', re: /Nihon Shoki|Nihongi/g, href: `${TEXTS_BASE}/nihon-shoki/` },
  // Persia, Polynesia, Africa
  { key: 'avesta', re: /Avesta|Yasna|Yasht(?=\s)/g, href: `${TEXTS_BASE}/avesta/` },
  { key: 'kumulipo', re: /Kumulipo/g, href: `${TEXTS_BASE}/kumulipo/` },
  // Bible
  { key: 'bible-kjv', re: /King James Bible|King James Version/g, href: `${TEXTS_BASE}/bible-kjv/` },
];

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function capitalize(s) {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

// Build the match tables once: [{ id, form }] sorted longest-first so
// overlapping names match the longest form first. Entry variants (Latinized /
// alternate forms registered on canonical entries) resolve to that entry.
//
// MATCHES is the conservative table: it skips ASCII forms that collide with
// common English words. MATCHES_WITH_AMBIGUOUS includes those forms too, so
// mythological callers (temple pages, scholars, blog) can opt into linking
// names such as Nike, Atlas, or Gaia where the context removes ambiguity.
const MATCHES = [];
const MATCHES_WITH_AMBIGUOUS = [];
function pushForm(id, form, { asciiLike = false } = {}) {
  if (!form || form.length < 2) return;
  if (/[^\x00-\x7F]/.test(form)) {
    MATCHES.push({ id, form });
    MATCHES_WITH_AMBIGUOUS.push({ id, form });
  } else if (asciiLike && form.length >= 4) {
    if (!NEVER_LINK.has(form.toLowerCase())) {
      MATCHES_WITH_AMBIGUOUS.push({ id, form });
      if (!AMBIGUOUS_ASCII.has(form.toLowerCase())) {
        MATCHES.push({ id, form });
      }
    }
  }
}
for (const e of entries) {
  if (e.unicode && e.unicode !== e.ascii) pushForm(e.id, e.unicode);
  if (e.ascii && /^[a-z][a-z-]+$/.test(e.ascii)) pushForm(e.id, capitalize(e.ascii), { asciiLike: true });
  for (const v of e.variants || []) {
    if (v && typeof v.unicode === 'string') pushForm(e.id, v.unicode, { asciiLike: true });
  }
}
MATCHES.sort((a, b) => b.form.length - a.form.length);
MATCHES_WITH_AMBIGUOUS.sort((a, b) => b.form.length - a.form.length);

function buildCombinedRegex(matchTable) {
  return new RegExp(
    `(?<![\\p{L}\\p{M}])(${matchTable.map((m) => escapeRe(m.form)).join('|')})(?![\\p{L}\\p{M}])`,
    'gu'
  );
}

// Combined alternations for candidate discovery (unicode-aware boundaries).
const COMBINED = buildCombinedRegex(MATCHES);
const COMBINED_WITH_AMBIGUOUS = buildCombinedRegex(MATCHES_WITH_AMBIGUOUS);
const FORM_TO_ID = new Map(MATCHES.map((m) => [m.form, m.id]));
const FORM_TO_ID_WITH_AMBIGUOUS = new Map(MATCHES_WITH_AMBIGUOUS.map((m) => [m.form, m.id]));

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
const SKIP_CLASS = /related|sister|chip|crosslink|toc|nav|footer|badge|pronunciation|phoneme/i;

/**
 * Explicit markers: [[entry-id|Label]] → <a class="crosslink">. Unknown ids
 * degrade to the label text alone (never a broken link).
 */
function transformWikilinks(html, { hrefFor = (id) => `/${id}/` } = {}) {
  return html.replace(/\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g, (m, id, label) => {
    if (BY_ID.has(id)) {
      return `<a href="${hrefFor(id)}" class="crosslink" data-crosslink="${id}">${label}</a>`;
    }
    return label;
  });
}

/**
 * Load HTML in document or fragment mode. Templates may start with comments
 * before the doctype, so scan the head of the document, not just its first
 * char.
 */
function loadHtml(html) {
  const isDocument = /<!doctype|<html[\s>]/i.test(html.slice(0, 1000));
  return cheerio.load(html, { decodeEntities: false }, isDocument);
}

/**
 * Walk every text node not inside skip zones and apply `transform`. The
 * transform returns replacement raw HTML, or null to leave the node as-is.
 * Skips: anchors, code/pre, script/style, headings, head, and skip-listed
 * classes (nav, related chips, pronunciation glosses…).
 */
function walkTextNodes($, transform) {
  $('*:not(head)')
    .contents()
    .each((_, node) => {
      if (node.type !== 'text' || !node.data || !node.data.trim()) return;
      // Skip ancestors: anchors/code/headings/related sections. Note that in
      // htmlparser2, <script> and <style> nodes have type 'script'/'style',
      // not 'tag' — walk by node name, not type.
      let p = node.parent;
      let skip = false;
      while (p && p.name) {
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
      const out = transform(node.data);
      if (out !== null && out !== undefined) $(node).replaceWith(out);
    });
}

/**
 * First-mention auto-linking over HTML text nodes. Returns new HTML.
 * Options:
 *   selfId   — the page's own entry (never self-linked)
 *   hrefFor  — href builder (default /{id}/)
 *   maxPerEntry — links per entry per page (default 1)
 *   allowAmbiguousAscii — link ASCII forms that collide with common English
 *                          words (e.g., Nike, Atlas, Gaia). Use only when the
 *                          surrounding context is unambiguously mythological.
 *   linkCitations — also link cited works (Hávamál, Gylfaginning 15, Ṛgveda
 *                   7.86…) to their /texts/ library page or deep anchor.
 */
function autoLink(
  html,
  {
    selfId,
    hrefFor = (id) => `/${id}/`,
    maxPerEntry = 1,
    allowAmbiguousAscii = false,
    linkCitations = false,
  } = {}
) {
  // Citation pass runs as its own DOM walk first, so deity-name linking in
  // the second pass naturally skips text already inside citation anchors
  // (no nested anchors, whatever order names appear in).
  if (linkCitations) {
    const citedCount = new Map();
    const $c = loadHtml(html);
    // Two rounds: deep-anchor patterns (Ṛgveda 7.86, Gylfaginning 15) get
    // first claim on their work across the whole document; page-level
    // patterns run only if no anchored occurrence exists.
    const rounds = [
      TEXT_CITATIONS.filter((c) => c.anchor),
      TEXT_CITATIONS.filter((c) => !c.anchor),
    ];
    for (const round of rounds) {
      walkTextNodes($c, (text) => {
        let out = text;
        let changed = false;
        for (const c of round) {
          if ((citedCount.get(c.key) || 0) >= 1) continue;
          c.re.lastIndex = 0;
          const m = c.re.exec(out);
          if (!m) continue;
          const href = c.anchor ? c.anchor(m[1]) : c.href;
          const label = m[0];
          out =
            out.slice(0, m.index) +
            `<a href="${href}" class="crosslink citation-link" data-citation="${c.key}">${label}</a>` +
            out.slice(m.index + label.length);
          citedCount.set(c.key, 1);
          changed = true;
        }
        return changed ? out : null;
      });
    }
    html = $c.root().html();
  }

  const linkedCount = new Map();
  const $ = loadHtml(html);
  const combined = allowAmbiguousAscii ? COMBINED_WITH_AMBIGUOUS : COMBINED;
  const formToId = allowAmbiguousAscii ? FORM_TO_ID_WITH_AMBIGUOUS : FORM_TO_ID;

  function canLink(id) {
    return id !== selfId && (linkedCount.get(id) || 0) < maxPerEntry;
  }

  walkTextNodes($, (text) => {
    combined.lastIndex = 0;
    let out = '';
    let cursor = 0;
    let changed = false;
    let m;
    while ((m = combined.exec(text)) !== null) {
      const form = m[1];
      const id = formToId.get(form);
      if (!id || !canLink(id)) continue;
      const href = hrefFor(id);
      out += text.slice(cursor, m.index);
      out += `<a href="${href}" class="crosslink" data-crosslink="${id}">${form}</a>`;
      cursor = m.index + form.length;
      linkedCount.set(id, (linkedCount.get(id) || 0) + 1);
      changed = true;
    }
    if (!changed) return null;
    out += text.slice(cursor);
    return out;
  });

  return $.root().html();
}

module.exports = {
  transformWikilinks,
  autoLink,
  AMBIGUOUS_ASCII,
  NEVER_LINK,
  TEXT_CITATIONS,
  BY_ID,
};
