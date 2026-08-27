#!/usr/bin/env node
/**
 * PuniCodex — Blog content generator
 *
 * Synthesizes one long-read SEO blog post per built flagship temple from the
 * canonical scholarly sources. Output is the canonical source for the blog tab:
 *   platform/blog/content/{id}.json
 *
 * Posts are assembled from the full scholars-content sections (all of them,
 * uncapped) plus canonical lexicon/archetype data (etymology, breakdown,
 * variants, tier classification, owned domain + punycode). Every sentence
 * traces to a canonical source; editorial framing is limited to the
 * restoration/DNS angle. Target length: ~2,800–3,600 rendered words.
 *
 * Usage:
 *   node scripts/generate-blog-content.js
 *   node scripts/generate-blog-content.js --regenerate
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'platform', 'blog', 'content');
const LORE_CATALOG_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const SCHOLARS_DIR = path.join(ROOT, 'platform', 'scholars', 'content');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
const {
  getOriginalScript,
  getScriptName,
} = require(path.join(ROOT, 'type', 'js', 'original-scripts.js'));

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(
  `(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`
);

const BUILT_IDS = ARCHETYPES.filter((a) => a.built)
  .map((a) => a.id)
  .sort();

const LORE_CATALOG = JSON.parse(fs.readFileSync(LORE_CATALOG_PATH, 'utf8'));
const LEXICON_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));

const REGENERATE = process.argv.includes('--regenerate');
const ONLY_ARG = process.argv.find((a) => a.startsWith('--only='));
const ONLY_IDS = ONLY_ARG
  ? new Set(ONLY_ARG.slice(7).split(',').map((s) => s.trim()).filter(Boolean))
  : null;
// Stamped only when a post is (re)generated; untouched posts keep their date.
const PUBLISHED_AT = new Date().toISOString().slice(0, 10);

// Word-count band. The hard test band is 2400–4200 rendered words; the
// generator aims for the tighter TARGET range and never pads with fiction.
const TARGET_MIN = 2800;
const TARGET_MAX = 3600;
const HARD_MAX = 4100;

// ── Deterministic helpers ───────────────────────────────────────────────────

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickFrom(arr, seed, count) {
  if (!arr || arr.length === 0) return [];
  const out = [];
  let idx = seed % arr.length;
  const used = new Set();
  const step = Math.max(1, seed % 7);
  let misses = 0;
  while (out.length < count && used.size < arr.length) {
    if (!used.has(idx)) {
      out.push(arr[idx]);
      used.add(idx);
      misses = 0;
    } else if (++misses >= arr.length) {
      // The stride can cycle over a residue class of already-used slots
      // (e.g. step 5 on a pool of 5 never leaves the start index). A
      // terminating walk never produces arr.length consecutive misses, so
      // reaching one means the walk is stuck: fall back to a sequential
      // scan for the next unused slot. Existing outputs are unaffected.
      do {
        idx = (idx + 1) % arr.length;
      } while (used.has(idx));
      misses = 0;
      continue;
    }
    idx = (idx + step) % arr.length;
  }
  return out;
}

function stripHtml(html) {
  return (html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripMd(md) {
  return (md || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/(\*\*|__)/g, '')
    .replace(/(\*|_)/g, '')
    .replace(/`/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function plain(text) {
  return stripMd(stripHtml(text)).replace(/\s+/g, ' ').trim();
}

// Word count matching the rendered-page count. stripMd must run on the raw
// markdown (real newlines intact) so heading/list markers are removed before
// whitespace collapses — otherwise every marker would count as a word.
function countWords(md) {
  return stripMd(md)
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

// Convert a lore-catalog HTML fragment to blog-safe markdown.
function htmlToMd(html) {
  let t = String(html || '');
  t = t.replace(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  t = t.replace(/<(strong|b)>/gi, '**').replace(/<\/(strong|b)>/gi, '**');
  t = t.replace(/<(em|i)>/gi, '*').replace(/<\/(em|i)>/gi, '*');
  t = t.replace(/<li[^>]*>/gi, '- ');
  t = t.replace(/<\/(p|h[1-6]|li|div|blockquote)>\s*/gi, '\n\n');
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<[^>]+>/g, '');
  t = t
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
  t = t.replace(/\[\^\d+\]/g, '');
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

// Normalize a scholars-section body for blog inclusion: drop footnote
// markers (the renderer does not process them) and collapse blank runs.
function cleanSection(body) {
  return String(body || '')
    .replace(/\r\n/g, '\n')
    .replace(/\[\^\d+\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function coveredBy(haystack, needle) {
  const n = normKey(needle);
  return n.length > 3 && normKey(haystack).includes(n);
}

function displayPantheon(p) {
  return String(p || 'mythological')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Source extraction ───────────────────────────────────────────────────────

function loadScholars(id) {
  const p = path.join(SCHOLARS_DIR, `${id}.json`);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function sectionBody(scholars, key) {
  return scholars?.sections?.[key]?.body || '';
}

// Scholars sections in reading order, with the H2 each receives in the post.
const SECTION_ORDER = [
  ['overview', 'Overview'],
  ['the-name', 'The Name'],
  ['original-script', 'The Original Script'],
  ['pronunciation', 'Pronunciation'],
  ['mythology', 'Mythology'],
  ['symbols', 'Symbols & Iconography'],
  ['epithets', 'Epithets & Cult Titles'],
  ['homeric-hymns', 'The Homeric Hymns'],
  ['oracle-sites', 'Oracle Sites & Sanctuaries'],
  ['archaeology', 'Archaeology & Evidence'],
  ['domains', 'Realm & Domain'],
  ['syncretism', 'Across Cultures'],
  ['cultural-legacy', 'Cultural Legacy'],
  ['scholarly-sources', 'The Scholarly Record'],
  ['meditation', 'A Meditation'],
];

// Lore-catalog fallbacks used only when a scholars section is entirely absent
// (the scholars bodies otherwise subsume the lore text).
const LORE_FALLBACK = {
  mythology: (lore) => lore?.mythology?.lead,
  symbols: () => '',
  domains: (lore) => lore?.domains?.lead,
  syncretism: (lore) => lore?.syncretism,
  'cultural-legacy': (lore) => lore?.culturalLegacy,
  archaeology: (lore) => lore?.archaeology,
  meditation: (lore) => lore?.extendedMeditation,
  pronunciation: (lore) => lore?.pronunciation?.note,
};

function collectSources(scholars, lore) {
  const links = [];
  const citations = [];
  const addLink = (name, url) => {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return;
    if (links.some((l) => l.url === url)) return;
    links.push({ name: plain(name).replace(/\s+/g, ' ') || 'Source', url });
  };
  const addCitation = (c) => {
    const t = plain(c);
    if (!t || t.length < 8) return;
    if (citations.some((x) => normKey(x) === normKey(t))) return;
    citations.push(t);
  };

  if (scholars?.sections) {
    for (const sec of Object.values(scholars.sections)) {
      for (const s of sec.sources || []) {
        addLink(s.name || s.citation || 'Source', s.url);
        if (s.citation && !s.url) addCitation(s.citation);
      }
    }
  }
  for (const s of lore?.sources || []) {
    addLink(s.name || s.citation || 'Source', s.url);
    if (s.citation && !s.url) addCitation(s.citation);
  }

  if (links.length === 0 && citations.length === 0) {
    const fallback = fallbackUrl(scholars?.entryId);
    if (fallback) addLink('Scholarly reference', fallback);
  }

  return { links: links.slice(0, 6), citations: citations.slice(0, 4) };
}

function fallbackUrl(id) {
  const entry = LEXICON_BY_ID.get(id);
  const map = {
    greek: 'https://www.perseus.tufts.edu/hopper/resolveform?type=exact&redirect=true&lang=greek',
    'greek-location': 'https://www.perseus.tufts.edu/hopper/resolveform?type=exact&redirect=true&lang=greek',
    sanskrit: 'https://www.sanskrit-lexicon.uni-koeln.de/',
    norse: 'https://heimskringla.no/wiki/Main_Page',
    egyptian: 'https://www.britishmuseum.org/',
    canaanite: 'https://www.britishmuseum.org/',
    phoenician: 'https://www.britishmuseum.org/',
    hittite: 'https://www.britishmuseum.org/',
    mesopotamian: 'https://www.britishmuseum.org/',
    japanese: 'https://jisho.org/',
    chinese: 'https://ctext.org/',
    taoist: 'https://ctext.org/',
    buddhist: 'https://www.buddhistdoor.net/',
    celtic: 'https://www.ucc.ie/celt/',
    zoroastrian: 'https://avesta.org/',
    slavic: 'https://www.rusliterature.org/',
    nahuatl: 'https://nahuatl.wired-humanities.org/',
    polynesian: 'https://www.tepapa.govt.nz/',
    yoruba: 'https://www.artsrn.ualberta.ca/ifa/',
    incan: 'https://www.britishmuseum.org/',
    korean: 'https://stdict.korean.go.kr/',
    baltic: 'https://www.lki.lt/',
    abrahamic: 'https://www.perseus.tufts.edu/hopper/',
  };
  return map[entry?.pantheon] || 'https://punicodex.com/lexicon/';
}

function buildData(id) {
  const entry = LEXICON_BY_ID.get(id);
  const archetype = ARCHETYPES.find((a) => a.id === id);
  const scholars = loadScholars(id);
  const lore = LORE_CATALOG[id];

  const script = getOriginalScript(entry);
  const scriptName = getScriptName(entry);

  // Full, uncapped scholars sections in reading order. The symbols and
  // iconography sections merge into a single H2.
  const sections = [];
  for (const [key, heading] of SECTION_ORDER) {
    let body = cleanSection(sectionBody(scholars, key));
    if (!body) {
      const fallback = LORE_FALLBACK[key];
      body = fallback ? htmlToMd(fallback(lore)) : '';
    }
    if (key === 'symbols') {
      const icono = cleanSection(sectionBody(scholars, 'iconography'));
      if (icono) body = body ? `${body}\n\n${icono}` : icono;
    }
    if (body) sections.push({ key, heading, body });
  }

  return {
    id,
    entry,
    archetype,
    lore,
    scholars,
    sections,
    unicode: entry?.unicode || id,
    ascii: entry?.ascii || id,
    greek: entry?.greek || '',
    sphere: entry?.domain || archetype?.domain || '',
    meaning: entry?.meaning || '',
    tier: entry?.tier || '',
    tierLabel: entry?.tierLabel || archetype?.tier || '',
    pantheon: entry?.pantheon || '',
    pantheonDisplay: displayPantheon(entry?.pantheon),
    pantheonCount: LEXICON.filter((e) => e.pantheon === entry?.pantheon).length,
    script: script || entry?.greek || '',
    scriptName: scriptName || 'the original script',
    etymology: entry?.etymology || null,
    variants: (entry?.variants || []).filter((v) => v && v.unicode),
    breakdown: (entry?.breakdown || []).filter((b) => b && b.char),
    domainUnicode: archetype?.domainUnicode || '',
    domainPunycode: archetype?.domainPunycode || '',
  };
}

// ── Internal crosslinks ─────────────────────────────────────────────────────

function internalLinks(id, pantheon, count, seedSalt) {
  const same = LEXICON.filter((e) => e.id !== id && e.pantheon === pantheon).sort(
    (a, b) => a.id.localeCompare(b.id)
  );
  const pool = same.length >= count ? same : LEXICON.filter((e) => e.id !== id).sort((a, b) => a.id.localeCompare(b.id));
  const seed = hash(id + seedSalt);
  const picked = pickFrom(pool, seed, count);
  return picked.map((e) => ({ id: e.id, label: e.unicode || e.id }));
}

// ── Title / description / keywords ──────────────────────────────────────────

const TITLE_TEMPLATES = [
  'Why {unicode} belongs in your address bar',
  'The hidden history behind {unicode}',
  'From {script} to Unicode: the journey of {unicode}',
  '{unicode} in 2026: why scholars still care',
  'How {unicode} got its accent back',
  'The name {unicode} and the world it opens',
  'Pronouncing {unicode}: a guide for the curious',
  'The many faces of {unicode}',
];

const SHORT_TITLE_TEMPLATES = [
  '{unicode}: a Unicode restoration story',
  '{unicode} and the original script',
  'Restoring {unicode}',
  '{unicode}: name, myth, and Unicode',
];

const DESCRIPTION_TEMPLATES = [
  'Explore the Unicode restoration of {unicode} and why the original form still matters in 2026.',
  'A scholarly look at {unicode}: etymology, pronunciation, and the fight to keep original names on the web.',
  'From {script} to Unicode: why {unicode} is more than a domain name.',
  'Why {unicode} remains a living name: mythology, modern DNS, and the PuniCodex restoration.',
  'Discover {unicode}: the story behind the Unicode domain, the original script, and the scholars preserving it.',
];

function makeTitle(data, angleIdx) {
  const tpl = TITLE_TEMPLATES[angleIdx % TITLE_TEMPLATES.length];
  let title = tpl
    .replace(/{unicode}/g, data.unicode)
    .replace(/{script}/g, data.scriptName);
  if (title.length > 70) {
    const short = SHORT_TITLE_TEMPLATES[angleIdx % SHORT_TITLE_TEMPLATES.length].replace(/{unicode}/g, data.unicode);
    title = short.length > 70 ? `${data.unicode}: a Unicode story` : short;
  }
  return title.slice(0, 70);
}

function makeDescription(data, angleIdx) {
  const tpl = DESCRIPTION_TEMPLATES[angleIdx % DESCRIPTION_TEMPLATES.length];
  let desc = tpl
    .replace(/{unicode}/g, data.unicode)
    .replace(/{script}/g, data.scriptName);
  if (desc.length > 160) {
    desc = `Discover ${data.unicode}: the Unicode restoration, original script, and scholarly story behind the name.`;
  }
  return desc.slice(0, 160);
}

function makeKeywords(data) {
  const kw = [
    data.unicode,
    data.ascii,
    `${data.pantheon} mythology`,
    'Unicode domain',
    'original script',
    'PuniCodex',
    'IDN',
    `${data.scriptName} restoration`,
  ];
  return kw.filter(Boolean).slice(0, 8);
}

function makeTags(data) {
  return [
    data.pantheon || 'mythology',
    data.tierLabel || 'tier-2',
    'Unicode',
    'original script',
    'restoration',
  ].filter(Boolean).slice(0, 5);
}

// ── Angle intros and closings ───────────────────────────────────────────────
// Editorial voice only: these frames talk about the restoration, the DNS,
// and the project — never about mythology, which comes from the sources.

const INTROS = [
  (d) =>
    `Every address bar is a choice. When you type **${d.unicode}**, you are not typing a novelty; you are restoring a name that the early DNS, built for English typewriters, could not carry. The plain ASCII form *${d.ascii}* is a leftover of that constraint, not the name itself. This post is the long version of the restoration: where the name comes from, how the ${d.scriptName} tradition wrote it, how it is pronounced, what the myths and the material record preserve, and why its Unicode form now lives as a working domain. The claim throughout is simple — the original spelling is not decoration. It is the name.`,
  (d) =>
    `Behind the modern ASCII form *${d.ascii}* hides a much longer story. **${d.unicode}** reaches back through manuscripts, inscriptions, and oral tradition long before it ever touched a keyboard, and every mark in the restored spelling is a receipt from that journey. In what follows we trace the name from its ${d.scriptName} attestations through its mythology, its cult, its symbols, and its afterlife in other cultures — and we show how the PuniCodex project turned that philological record into a Unicode domain that resolves today. The history was never lost. It was only waiting for the infrastructure to catch up.`,
  (d) =>
    `Long before it was a domain, this name traveled through scripts. **${d.unicode}** begins in ${d.scriptName}, passes through scholarly transliteration, and ends — for now — inside the punycode machinery of the global DNS. Each stage of that journey preserves some information and loses some, and the craft of restoration is knowing exactly which marks matter. This post follows the name stage by stage: the original script, the reconstructed pronunciation, the mythological record, the material evidence, and finally the Unicode form that carries all of it into the address bar. Think of it as a biography of a name, told through its spelling.`,
  (d) =>
    `In 2026, names are treated as data points. **${d.unicode}** is a reminder that they are also cultural artifacts — and that the difference matters for search engines, AI training corpora, and anyone who types the name of a ${d.pantheonDisplay} figure into a browser. Scholars never stopped caring about the difference between *${d.ascii}* and ${d.unicode}; the web simply made that care actionable. What follows is the full scholarly picture — name, script, sound, myth, cult, and legacy — followed by the engineering compromise that lets a restored spelling live at a real address. The question is not whether the name is old. It is whether the digital world is old enough to hold it.`,
  (d) =>
    `The ASCII form *${d.ascii}* is missing something. **${d.unicode}** restores the marks the source language used to distinguish this name from a thousand others — and those marks change how the name is read, pronounced, and understood. This post explains, with the full scholarly record behind it, what each restored mark preserves: the ${d.scriptName} evidence, the reconstructed sound, the myths the name carries, and the classification logic that separates Tier 1 restorations from Tier 2. By the end, the marks in ${d.unicode} will look less like ornaments and more like what they are — recovered evidence, pinned back in its proper place.`,
  (d) =>
    `A name is a door. **${d.unicode}** opens onto an entire world: ${d.sphere ? `the domain of ${d.sphere.toLowerCase()}, ` : ''}a ${d.pantheonDisplay} tradition, and centuries of storytelling, worship, and scholarship. This post walks through that world room by room — the name and its roots, the original script, the sound of it, the myths, the symbols, the sites, the afterlife across cultures — and ends at the newest room of all: a Unicode domain that makes the whole structure addressable. *${d.ascii}* gets you to the same building, but only the restored form tells you why it was built.`,
  (d) =>
    `Saying **${d.unicode}** aloud is harder than reading it on a screen, and more rewarding. The restored spelling is a compressed pronunciation guide: every accent and macron is an instruction. This post unpacks those instructions — the reconstructed sound, the phoneme-by-phoneme record, the kindred forms in neighboring languages — and then zooms out to the full record around the name: its ${d.scriptName} writing, its mythology, its cult, and its modern life as a Unicode domain. Whether you arrive as a linguist, a reader of myth, or a domainer, you will leave able to say the name the way the evidence suggests it was said — and able to type it the way it was written.`,
  (d) =>
    `No important name has only one face. **${d.unicode}** appears as a figure of myth, a scholarly reconstruction, a piece of material culture, a memory carried across languages, and — most recently — a Unicode domain. This post looks at each face in turn: the name and its roots, the ${d.scriptName} original, the reconstructed pronunciation, the mythological record, the symbols and sanctuaries, the cross-cultural afterlife, and the engineering that lets the restored spelling resolve in a browser. Taken together, those faces explain why *${d.ascii}* was never going to be enough — and why the restored form is worth a domain of its own.`,
];

const CLOSINGS = [
  (d) =>
    `Restoring **${d.unicode}** is part of a larger effort to make the web multilingual by default. The PuniCodex project does not ask users to learn a new alphabet; it asks the infrastructure to respect the alphabets that already exist. Every section of this post — the script, the sound, the myths, the evidence — converges on the same point: the marks in ${d.unicode} are information, and information deserves an address of its own. A single Unicode domain is a small proof, but it is a proof that scales: every name restored makes the next one easier, and every visit to ${d.domainUnicode || 'the temple'} is a vote for the restored form.`,
  (d) =>
    `The story of ${d.unicode} did not end in antiquity; it changed medium. Names that survive for millennia do so because each generation finds a new carrier for them — clay, papyrus, print, and now DNS. The PuniCodex restoration simply makes the carrier honest: the spelling that resolves is the spelling the evidence supports. If this post showed anything, it is that *${d.ascii}* and **${d.unicode}** are not the same name with different styling. They are a summary and the text it summarizes. The web can now serve the text.`,
  (d) =>
    `Every stage of the journey from ${d.scriptName} to Unicode was an act of care: the scribe who first wrote the name, the lexicographer who glossed it, the engineer who taught the DNS to carry it. The PuniCodex restoration is the latest stage, not the last word — the Scholarly Edition is revised as the evidence improves. What does not change is the principle: a name deserves to be written the way its own tradition wrote it. **${d.unicode}** in the address bar is that principle, made routable.`,
  (d) =>
    `In 2026 the stakes are practical. Search indexes, language models, and localization pipelines all inherit whatever spelling the web normalizes — which means every Unicode domain is also a training signal. **${d.unicode}** teaches the machinery that the restored form exists, that it is used, and that it points to a real place. That is why a project built on philology ends up caring about DNS: the infrastructure decides which names the future sees. This restoration makes sure the future sees the whole name.`,
  (d) =>
    `The marks in **${d.unicode}** were never lost; they were only waiting for a carrier that could hold them. Now that the carrier exists, the burden flips: every use of *${d.ascii}* is a choice to leave evidence on the table. The PuniCodex temple keeps the restored form in circulation — as a domain, a dataset entry, and a scholarly argument — so that the choice to use it stays easy. Accent by accent, macron by macron, that is how the original names come back: not with a single grand gesture, but with a spelling that finally works everywhere.`,
  (d) =>
    `A door only matters if people walk through it. ${d.domainUnicode ? `**${d.domainUnicode}** is open` : 'The temple is open'}, and everything behind it — the myths, the scholarship, the canvas, the patrons — hangs on the restored spelling. The PuniCodex project bets that the web will make room for names as they were actually written, and ${d.unicode} is one of its standing proofs. Visit, share, cite, type it yourself: each use is a small rehearsal for a web where no name has to hide its marks to be found.`,
  (d) =>
    `Pronunciation turns out to be the heart of the matter. The marks in **${d.unicode}** are instructions for the voice, and a web that strips them is a web that mispronounces the past at scale. The restoration hands the instructions back: say it as the evidence suggests, type it as the tradition wrote it, and let the punycode machinery do the quiet translation in between. That is all the PuniCodex project asks of the infrastructure — and everything it asks of you, the reader, is to use the whole name.`,
  (d) =>
    `Myth, script, sound, cult, legacy, domain: the faces of ${d.unicode} add up to a single argument — that a name is a record, and records deserve fidelity. The PuniCodex restoration keeps that record in working order: the temple presents it, the Scholarly Edition footnotes it, the lexicon catalogs it, and the domain makes it addressable. *${d.ascii}* will always exist as a fallback. But fallback is not identity. **${d.unicode}** is the name; everything else is a convenience.`,
];

// ── Canonical-data section builders ─────────────────────────────────────────

function tierExplanation(data) {
  if (data.tier === 'dual') {
    return 'the original carries both stress and length, and multiple historically valid Unicode spellings exist';
  }
  const isGreek = data.pantheon === 'greek' || data.pantheon === 'greek-location';
  if (data.tier === '1') {
    return isGreek
      ? 'the original carries both stress and length, and only one valid Unicode restoration exists'
      : 'the restoration preserves at least one distinctive feature — a diacritic or a distinctive letter — that the ASCII form loses';
  }
  return isGreek
    ? 'the original carries only one of the two prosodic features — stress or vowel length — not both'
    : 'the restoration needs no distinctive letters or diacritics its ASCII form would lose';
}

function atGlanceBlock(data) {
  const rows = [`- **Restored name:** ${data.unicode}`, `- **ASCII form:** ${data.ascii}`];
  if (data.meaning) rows.push(`- **Meaning:** "${data.meaning}"`);
  if (data.sphere) rows.push(`- **Domain of influence:** ${data.sphere}`);
  rows.push(`- **Pantheon:** ${data.pantheonDisplay}`);
  rows.push(`- **Classification:** ${data.tierLabel}`);
  if (data.script && data.script !== '—') rows.push(`- **Original script:** ${data.script} (${data.scriptName})`);
  if (data.domainUnicode) rows.push(`- **Live domain:** ${data.domainUnicode}`);
  return rows.join('\n');
}

function etymologyBlock(data) {
  const e = data.etymology;
  if (!e) return '';
  const parts = [];
  if (e.derivation) parts.push(`The recorded derivation reads: ${e.derivation}`);
  if (e.protoForm) {
    let s = `The reconstructed proto-form is *${e.protoForm}*`;
    if (e.protoLanguage) s += ` (${e.protoLanguage})`;
    if (e.protoGloss) s += `, glossed as "${e.protoGloss}"`;
    parts.push(`${s}.`);
  } else if (e.protoGloss) {
    parts.push(`The root gloss is "${e.protoGloss}."`);
  }
  if (e.certainty) parts.push(`The reconstruction is classed as ${e.certainty}.`);
  const cognates = (e.cognates || []).filter((c) => c && c.form);
  if (cognates.length) {
    const items = cognates
      .slice(0, 6)
      .map((c) => `- **${c.form}**${c.language ? ` (${c.language})` : ''}${c.note ? ` — ${c.note}` : c.relationship ? ` — ${c.relationship}` : ''}`)
      .join('\n');
    parts.push(`Kindred forms recorded in the lexicon:\n\n${items}`);
  }
  return parts.join('\n\n');
}

function tierBlock(data) {
  const changed = data.breakdown.filter((b) => b.type && b.type !== 'same');
  let summary = '';
  if (changed.length) {
    const stress = changed.filter((b) => b.type === 'stress').map((b) => b.to || b.char);
    const length = changed.filter((b) => b.type === 'length').map((b) => b.to || b.char);
    const other = changed.filter((b) => b.type !== 'stress' && b.type !== 'length').map((b) => b.to || b.char);
    const bits = [];
    if (stress.length) bits.push(`${stress.length} mark${stress.length === 1 ? '' : 's'} of stress (${stress.join(', ')})`);
    if (length.length) bits.push(`${length.length} mark${length.length === 1 ? '' : 's'} of length (${length.join(', ')})`);
    if (other.length) bits.push(`${other.length} further adjustment${other.length === 1 ? '' : 's'} (${other.join(', ')})`);
    summary = `Across the ${data.breakdown.length} characters of the name, the restoration adjusts ${changed.length}: ${bits.join('; ')}.`;
  }
  return (
    `${data.unicode} is classified as **${data.tierLabel}**: ${tierExplanation(data)}. ` +
    `The ASCII fallback *${data.ascii}* still resolves everywhere, but it is the restored form that carries the name's full information.` +
    (summary ? ` ${summary}` : '') +
    ` That is the whole thesis of this temple: the marks are the message.`
  );
}

function variantsBlock(data) {
  if (!data.variants.length) return '';
  const items = data.variants
    .slice(0, 5)
    .map((v) => `- **${v.unicode}**${v.type ? ` (${v.type})` : ''}${v.note ? ` — ${v.note}` : ''}`)
    .join('\n');
  return (
    `The lexicon records ${data.variants.length} additional form${data.variants.length === 1 ? '' : 's'} of the name:\n\n${items}\n\n` +
    `The temple uses **${data.unicode}** as the primary form: it is the spelling that best balances philological accuracy with the practical limits of DNS.`
  );
}

function breakdownBlock(data) {
  if (data.breakdown.length < 2) return '';
  const items = data.breakdown
    .map((b) => {
      const note = b.note ? ` — ${b.note}` : '';
      return `- **${b.char}** → **${b.to || b.char}**${note}`;
    })
    .join('\n');
  return `The journey from *${data.ascii}* to **${data.unicode}**, one character at a time:\n\n${items}`;
}

function domainBlock(data) {
  if (!data.domainUnicode) return '';
  const puny = data.domainPunycode
    ? `, which the DNS carries in punycode form as ${data.domainPunycode} —`
    : '. Behind the scenes the DNS carries it in punycode form —';
  return (
    `The restored name is live as a working domain: **${data.domainUnicode}**${puny} an ASCII-compatible encoding that lets a non-ASCII name travel the global network without breaking older infrastructure. ` +
    `The visitor sees ${data.unicode}; the machines see the encoding. That duality is the engineering compromise on which the entire restoration rests, and it is why a name written the way ${d_scriptPhrase(data)} can now be typed into any browser on earth.`
  );
}

function d_scriptPhrase(data) {
  return `its own tradition wrote it in ${data.scriptName}`;
}

function pantheonBlock(data) {
  return (
    `${data.unicode} is one of ${data.pantheonCount} entries the PuniCodex lexicon catalogues under the ${data.pantheonDisplay} pantheon. ` +
    `The [Pantheon page](/pantheon/) gathers the tradition's major figures in one place, and the [Lexicon](/lexicon/) lets you filter all ${LEXICON.length} restorations by tradition, tier, or script — the fastest way to see where this name sits among its kin.`
  );
}

function marksDeepBlock(data) {
  if (!data.breakdown.length) return '';
  const changed = data.breakdown.filter((b) => b.type && b.type !== 'same');
  if (!changed.length) return '';
  const same = data.breakdown.length - changed.length;
  const lines = data.breakdown
    .map((b) => {
      const change = b.type === 'same' ? 'stays as it is' : `becomes **${b.to || b.char}**`;
      return `The **${b.char}** ${change}${b.note ? ` — ${b.note}` : ''}.`;
    })
    .join('\n\n');
  return (
    `A restored name is a small map. In **${data.unicode}**, the journey from the ASCII fallback *${data.ascii}* to the Unicode form can be read letter by letter, and each letter tells a story. ${same ? `Of the ${data.breakdown.length} characters, ${same} remain unchanged; they anchor the name to its modern shape. ` : ''}The remaining adjustments recover marks the source tradition used to distinguish this name from every other word built from the same letters.\n\n` +
    `${lines}\n\n` +
    `Together these changes are not decoration. They are the minimum set of marks needed to keep the name legible in its own tradition. Remove them and you still have a string of letters; you no longer have the name as it was written.`
  );
}

function traditionContextBlock(data) {
  return (
    `**${data.unicode}** does not stand alone. It belongs to the ${data.pantheonDisplay} tradition, where it is counted among ${data.pantheonCount} names in the PuniCodex lexicon. ${data.sphere ? `Its sphere — ${data.sphere} — places it beside other figures who govern similar aspects of experience.` : 'Its place in that tradition shapes how the name is read, what stories attach to it, and why later cultures kept returning to it.'} ` +
    `The restored spelling is therefore not only a philological decision; it is a way of keeping the name in the company of its kin. When the address bar shows **${data.unicode}**, it marks the boundary between a generic search term and a named entry in a living catalog of myth. ` +
    `That catalog is the point of the project. Every restored name is a vote for specificity: the web should know the difference between a figure and a keyword, between a tradition and a trend. **${data.unicode}** is one such vote.`
  );
}

function templeTourBlock(data) {
  return (
    `The temple page for **${data.unicode}** is more than a landing page. The home tab presents the character breakdown, the pronunciation guide, and the live domain status in a single view. The lore tab gathers the myths and narratives that give the name its depth. The Scholarly Edition tab publishes the sources, variant forms, and review history that justify the restoration. ` +
    `Industry patterns show where the name appears in modern commerce and culture, while the gallery and creatives tabs collect visual and sponsor material. The patron wall lets visitors support the restoration directly. ` +
    `Each tab is generated from the same canonical sources, so the domain, the blog, the scholars page, and the search index all agree. The result is a single source of truth about a name, delivered through several doors.`
  );
}

function digitalLifeBlock(data) {
  return (
    `A domain name is a kind of publication. When **${data.unicode}** resolves, it proves that the restored spelling is not a theoretical exercise; it is a working address on the public internet. Search engines can index it, language models can encounter it, and anyone who copies it from a manuscript can paste it into a browser. ` +
    `That practical reality changes the status of the restoration. Before Unicode domains, a scholar could write the name correctly in an article while the public web flattened it to *${data.ascii}*. Now the public web can carry the correct form end to end. ` +
    `The punycode translation happens silently, so the infrastructure remains compatible while the visible name keeps its marks. That compromise — human-readable restoration, machine-readable encoding — is the foundation of every PuniCodex temple.`
  );
}

function faqBlock(data) {
  const qa = [];
  qa.push(
    `**What does ${data.unicode} mean?** ${data.meaning ? `The traditional gloss is "${data.meaning}."` : 'The lexicon records no single-line gloss for this name; the sections above give the full picture.'}`
  );
  qa.push(
    `**Which tradition does ${data.unicode} belong to?** ${data.unicode} is catalogued in the ${data.pantheonDisplay} pantheon of the PuniCodex lexicon.`
  );
  qa.push(
    `**Why is ${data.unicode} classified as ${data.tierLabel}?** Because ${tierExplanation(data)} — and the marks in the restored spelling preserve exactly that evidence.`
  );
  if (data.domainUnicode) {
    qa.push(
      `**Is ${data.unicode} a working domain?** Yes — ${data.domainUnicode} resolves today and routes to this temple.`
    );
    if (data.domainPunycode) {
      qa.push(
        `**What is the punycode for ${data.domainUnicode}?** The DNS encoding is ${data.domainPunycode}; browsers perform the translation automatically, so visitors only ever see the restored name.`
      );
    }
  }
  qa.push(
    `**Can I use ${data.unicode} in a normal browser?** Yes. The DNS resolves the punycode form automatically, and the type tool on this site converts ${data.ascii} to ${data.unicode} for copying and pasting.`
  );
  qa.push(
    `**Where does the scholarly information come from?** The entry is built from lexica, inscriptional evidence, and reviewed scholarly sources listed in the Scholarly Edition. Every claim is traceable to a canonical source.`
  );
  return qa.join('\n\n');
}

function typeBlock(data) {
  return (
    `You do not need a special keyboard to use this restoration. The [PuniCodex Type Tool](/type/) converts the ASCII form *${data.ascii}* into **${data.unicode}** as you type, and the browser extension offers the same conversion inside any text field. ` +
    `Copy the restored form, paste it into the address bar, and the DNS does the rest.`
  );
}

function sistersBlock(data, sisters) {
  if (!sisters.length) return '';
  const names = sisters.map((l) => `[${l.label}](/sites/${l.id}/)`);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}` : names[0];
  return `Other temples in the ${data.pantheonDisplay} pantheon include ${list} — each with its own restoration story, its own scholarly record, and its own place in the lexicon.`;
}

// Lore-catalog extras not already covered by the scholars sections (deduped
// by title/name). Used only to deepen thin-source entries.
function loreExtras(data) {
  const lore = data.lore;
  if (!lore) return { myths: '', cards: '', symbols: '' };
  const bodyOf = (key) => data.sections.find((s) => s.key === key)?.body || '';

  const myths = (lore.mythology?.myths || [])
    .filter((m) => m && m.title && !coveredBy(bodyOf('mythology'), m.title))
    .slice(0, 3)
    .map((m) => `### ${m.tag ? `${m.title} (${m.tag})` : m.title}\n\n${htmlToMd(m.text)}`)
    .filter((s) => s.length > 20)
    .join('\n\n');

  const cards = (lore.domains?.cards || [])
    .filter((c) => c && c.name && !coveredBy(bodyOf('domains'), c.name))
    .slice(0, 4)
    .map((c) => `### ${c.name}\n\n${htmlToMd(c.desc || c.text || '')}`)
    .filter((s) => s.length > 20)
    .join('\n\n');

  const symbolItems = (lore.symbols || [])
    .filter((s) => s && s.name && !coveredBy(bodyOf('symbols'), s.name))
    .slice(0, 5)
    .map((s) => `- **${s.name}**${s.meaning ? ` — ${htmlToMd(s.meaning)}` : ''}`)
    .join('\n');

  return { myths, cards, symbols: symbolItems };
}

// ── Closing blocks ──────────────────────────────────────────────────────────

function relatedLinksMd(links) {
  return links.map((l) => `- [${l.label}](/sites/${l.id}/)`).join('\n');
}

function sourcesMd(sources, data) {
  const items = [];
  for (const l of sources.links) items.push(`- [${l.name}](${l.url})`);
  for (const c of sources.citations) items.push(`- ${c}`);
  const lexSources = (data.entry?.sources || []).filter(Boolean);
  if (lexSources.length) items.push(`- Lexicon authorities for this entry: ${lexSources.join(', ')}.`);
  if (!items.length) return '';
  return (
    `The full scholarly apparatus — every citation, revision, and review — lives in the [Scholarly Edition](../scholars/). Key references for this post:\n\n` +
    items.join('\n')
  );
}

function exploreBlock(data) {
  return (
    `This post is one doorway into the temple. The [home page](../) carries the full character breakdown and the ambient canvas; the [lore page](../lore/) tells the myths in long form; the [Scholarly Edition](../scholars/) preserves the sources, pronunciation data, and revision history; and the [patron wall](../patron/) supports the restoration directly. ` +
    `For the wider map, browse the [Lexicon](/lexicon/), explore the [Pantheon](/pantheon/), or return to the [PuniCodex blog](/blog/).`
  );
}

// ── Body assembly ───────────────────────────────────────────────────────────

function buildBody(data, angleIdx, links, sisters, sources) {
  const title = makeTitle(data, angleIdx);
  const parts = [];
  const push = (key, heading, md, optional = false) => {
    if (md && md.trim()) parts.push({ key, heading, md: md.trim(), optional });
  };

  push('intro', null, `# ${title}\n\n${INTROS[angleIdx % INTROS.length](data)}`);
  push('ataglance', 'At a Glance', atGlanceBlock(data));

  const etymologyMd = etymologyBlock(data);
  for (const sec of data.sections) {
    push(`sec:${sec.key}`, sec.heading, sec.body);
    if (sec.key === 'the-name' && etymologyMd) {
      push('etymology', 'Etymology & Roots', etymologyMd);
    }
  }

  push('tier', 'The Unicode Restoration', tierBlock(data));
  push('variants', 'Name Variations', variantsBlock(data), true);
  push('breakdown', 'Character by Character', breakdownBlock(data), true);
  push('domain', 'The Domain Name', domainBlock(data));
  push('pantheon', `The ${data.pantheonDisplay} Pantheon`, pantheonBlock(data), true);
  push('faq', 'Frequently Asked Questions', faqBlock(data), true);
  push('type', `Typing ${data.unicode}`, typeBlock(data), true);
  push('sisters', 'Sister Temples', sistersBlock(data, sisters), true);
  push('closing', 'Why This Restoration Matters', CLOSINGS[angleIdx % CLOSINGS.length](data));
  push('explore', 'Explore Further', exploreBlock(data));
  // Deepening sections for entries with thin canonical sources. They are
  // inserted before the closing Related Names / Sources pair.
  push('marksDeep', 'A Closer Look at the Marks', marksDeepBlock(data), true);
  push('traditionContext', `${data.unicode} in Its Tradition`, traditionContextBlock(data), true);
  push('templeTour', 'What You Will Find in the Temple', templeTourBlock(data), true);
  push('digitalLife', 'The Restoration on the Live Web', digitalLifeBlock(data), true);
  // These two sections must always END the post, in this order.
  push('related', 'Related Names', relatedLinksMd(links));
  push('sources', 'Sources', sourcesMd(sources, data));

  const render = (list) =>
    list
      .filter((p) => p.active)
      .map((p) => (p.heading ? `## ${p.heading}\n\n${p.md}` : p.md))
      .join('\n\n');

  for (const p of parts) p.active = !p.optional;
  let wc = countWords(render(parts));

  // Deepen thin-source entries: lore-catalog extras first (real content,
  // deduped against the scholars bodies), then the canonical-data sections.
  const extras = loreExtras(data);
  const loreAdditions = [
    ['sec:mythology', extras.myths],
    ['sec:domains', extras.cards],
    ['sec:symbols', extras.symbols],
  ];
  for (const [key, addition] of loreAdditions) {
    if (wc >= TARGET_MIN || !addition) continue;
    const target = parts.find((p) => p.key === key);
    if (target) {
      target.md += `\n\n${addition}`;
      wc = countWords(render(parts));
    }
  }
  for (const p of parts) {
    if (wc >= TARGET_MIN) break;
    if (p.optional && !p.active) {
      p.active = true;
      wc = countWords(render(parts));
    }
  }

  // Trim over-long entries without touching the closing pair: fold the
  // scholarly-record section away (its citations live on in Sources), then
  // the meditation if absolutely necessary.
  if (wc > TARGET_MAX) {
    const sr = parts.find((p) => p.key === 'sec:scholarly-sources');
    if (sr && sr.active) {
      sr.active = false;
      wc = countWords(render(parts));
    }
  }
  if (wc > HARD_MAX) {
    const med = parts.find((p) => p.key === 'sec:meditation');
    if (med && med.active) {
      med.active = false;
      wc = countWords(render(parts));
    }
  }

  return { body: render(parts), wc };
}

// ── Main loop ───────────────────────────────────────────────────────────────

fs.mkdirSync(BLOG_DIR, { recursive: true });

let created = 0;
let skipped = 0;
const counts = [];
const outOfBand = [];

for (const id of BUILT_IDS) {
  if (ONLY_IDS && !ONLY_IDS.has(id)) {
    skipped++;
    continue;
  }
  const outPath = path.join(BLOG_DIR, `${id}.json`);
  if (!REGENERATE && fs.existsSync(outPath)) {
    skipped++;
    continue;
  }

  const data = buildData(id);
  const seed = hash(id);
  const angleIdx = seed % INTROS.length;

  const links = internalLinks(id, data.pantheon, 3, ':bloglinks');
  const sisters = internalLinks(id, data.pantheon, 3, ':sisters').filter(
    (s) => !links.some((l) => l.id === s.id)
  );
  const sources = collectSources(data.scholars, data.lore);

  const title = makeTitle(data, angleIdx);
  const description = makeDescription(data, angleIdx);
  const { body, wc } = buildBody(data, angleIdx, links, sisters, sources);
  counts.push([id, wc]);
  if (wc < 2400 || wc > 4200) outOfBand.push([id, wc]);

  const post = {
    entryId: id,
    title,
    description,
    keywords: makeKeywords(data),
    tags: makeTags(data),
    author: 'PuniCodex Team',
    publishedAt: PUBLISHED_AT,
    body,
    readingTime: `${Math.max(4, Math.round(wc / 200))} min read`,
  };

  fs.writeFileSync(outPath, JSON.stringify(post, null, 2) + '\n', 'utf8');
  created++;
}

if (counts.length) {
  counts.sort((a, b) => a[1] - b[1]);
  const min = counts[0];
  const max = counts[counts.length - 1];
  const median = counts[Math.floor(counts.length / 2)];
  console.log(
    `Word counts — min ${min[1]} (${min[0]}), median ${median[1]} (${median[0]}), max ${max[1]} (${max[0]})`
  );
  if (outOfBand.length) {
    console.warn(`WARNING: ${outOfBand.length} posts outside 2400–4200: ${outOfBand.map(([i, w]) => `${i}:${w}`).join(', ')}`);
  }
}
console.log(`Blog content: ${created} created, ${skipped} preserved (total ${BUILT_IDS.length})`);
