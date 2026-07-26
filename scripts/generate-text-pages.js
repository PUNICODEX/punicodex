#!/usr/bin/env node
/**
 * PuniCodex — Sacred Texts page generator
 *
 * Builds the public Sacred Texts section at /texts/ from the canonical
 * registry (platform/texts/registry.json) and the generated line corpora
 * (platform/texts/{id}/grc.json + eng.json, produced by
 * scripts/build-text-corpus.js):
 *
 *   texts/index.html          — the Library index (one card per registered text)
 *   texts/{id}/index.html     — the reading page (English / Greek / Parallel)
 *
 * Temple cross-links are baked in at generation time: a curated, hand-verified
 * table (XREF below) maps each entity's normalized Greek forms to a temple id.
 * Every form in the table was confirmed present as a capitalized whole word in
 * the Perseus Greek text (tools/verify-text-xref.js); lowercase occurrences
 * (common nouns) are deliberately never linked. Matching normalizes both sides
 * (NFD, strip combining marks, drop elision marks, lowercase) so inflected
 * forms match their lemma set.
 *
 * Chrome (nav / mobile menu / footer) comes from the canonical builders, the
 * same way generate-blog-index.js consumes them. Idempotent: byte-stable
 * output for unchanged inputs.
 *
 * Usage:
 *   node scripts/generate-text-pages.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const TEXTS_DIR = path.join(ROOT, 'platform', 'texts');
const OUT_DIR = path.join(ROOT, 'texts');

const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));
// Canonical navigation (single source of truth — never fork the item list).
const { fullNavHtml } = require('./sync-desktop-nav.js');
const { menuForPage } = require('./sync-mobile-menu.js');
const { footerHtml } = require('./sync-footer.js');
const { writeFileWithRetry } = require('./write-file-retry.js');

const archetypeSrc = fs.readFileSync(path.join(ROOT, 'js', 'archetypes-v2.js'), 'utf8');
const ARCHETYPES = vm.runInNewContext(
  `(function(){\n${archetypeSrc}\nreturn ARCHETYPES;\n})()`
);
const BUILT_IDS = new Set(ARCHETYPES.filter((a) => a.built).map((a) => a.id));
const LEXICON_BY_ID = new Map(LEXICON.map((e) => [e.id, e]));

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Greek normalization & capitalization ────────────────────────────────────
// Matching is form-tolerant: NFD, drop combining marks (accents, breathings,
// iota subscripts), drop elision marks, lowercase. The Greek text itself is
// rendered byte-faithfully from the corpus — normalization only feeds lookup.
function normGreek(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ͂ͅ]/g, '')
    .replace(/[ʼ]/g, '')
    .toLowerCase();
}

// Capital test: decompose, then inspect the base letter. Precomposed polytonic
// capitals decompose to a capital base + combining marks (Ἔ → Ε + oxia);
// lowercase polytonics decompose to lowercase bases. Only capitalized tokens
// are linked, so common nouns (ἔρος "love", ἠέλιον "sun") stay unlinked.
function isCapitalGreek(s) {
  const base = s.normalize('NFD').charAt(0);
  const cp = base.codePointAt(0);
  return (cp >= 0x391 && cp <= 0x3a9) || (cp >= 0x386 && cp <= 0x38f);
}

// ── Theogony → temple cross-reference table ─────────────────────────────────
// Curated mapping of normalized Greek forms (nominative + genitive + attested
// inflections and unambiguous epithets) to lexicon temple ids. EVERY form was
// verified present as a capitalized whole word in platform/texts/theogony/
// grc.json (see tools/verify-text-xref.js — 110 entities, 426 linkable
// occurrences, zero unverified forms). Deliberately excluded: ids pointing at
// a different bearer of the same name (elektra = Agamemnon's daughter, not the
// Oceanid; ladon = the Hesperian dragon, but the Theogony's only Λάδων is the
// Arcadian river), collective names without temples (Μοῦσαι, Τιτῆνες,
// Κύκλωπες, Ἑκατόγχειρες), and patronymics (Κρονίδης, Ὑπεριονίδης).
const XREF = [
  ['chaos', ['χαος', 'χαεος']],
  ['gaia', ['γαια', 'γαιης', 'γαιαν', 'γαιη', 'γης', 'γαι']],
  ['tartaros', ['ταρταρον', 'ταρταρα', 'ταρταρου']],
  ['eros', ['ερος']],
  ['erebus', ['ερεβος', 'ερεβει', 'ερεβευσφιν']],
  ['nyx', ['νυξ', 'νυκτος', 'νυκτα']],
  ['aither', ['αιθηρ']],
  ['hemera', ['ημερη']],
  ['ouranos', ['ουρανος', 'ουρανου', 'ουρανον', 'ουρανω']],
  ['pontos', ['ποντος', 'ποντον']],
  ['hypnos', ['υπνον', 'υπνος']],
  ['thanatos', ['θανατον', 'θανατος', 'θανατοιο']],
  ['momos', ['μωμον']],
  ['oizys', ['οιζυν']],
  ['moirai', ['μοιρας']],
  ['clotho', ['κλωθω']],
  ['lachesis', ['λαχεσιν']],
  ['atropos', ['ατροπον']],
  ['ker', ['κηρα', 'κηρας']],
  ['nemesis', ['νεμεσιν']],
  ['eris', ['εριν', 'ερις']],
  ['ponos', ['πονον']],
  ['lethe', ['ληθην']],
  ['limos', ['λιμον']],
  ['geras', ['γηρας']],
  ['iris', ['ιριν', 'ιρις']],
  ['harpyia', ['αρπυιας']],
  ['medousa', ['μεδουσα']],
  ['pegasos', ['πηγασος']],
  ['thetis', ['θετις']],
  ['tyche', ['τυχη']],
  ['calypso', ['καλυψω']],
  ['asia', ['ασιη']],
  ['erato', ['ερατω']],
  ['ourania', ['ουρανιη']],
  ['styx', ['στυξ', 'στυγος']],
  ['cerberus', ['κερβερον']],
  ['hydra', ['υδρην']],
  ['chimaira', ['χιμαιραν']],
  ['sphinx', ['φικ']],
  ['nemeanlion', ['νεμειαιον']],
  ['bellerophon', ['βελλεροφοντης']],
  ['okeanos', ['ωκεανοιο', 'ωκεανου', 'ωκεανον', 'ωκεανω']],
  ['tethys', ['τηθυς', 'τηθυν', 'τηθυος']],
  ['hyperion', ['υπεριονα', 'υπεριονος']],
  ['theia', ['θειαν']],
  ['kreios', ['κριον', 'κριω']],
  ['coeus', ['κοιον', 'κοιου']],
  ['iapetus', ['ιαπετον', 'ιαπετος', 'ιαπετοιο']],
  ['themis', ['θεμιν']],
  ['mnemosyne', ['μνημοσυνη', 'μνημοσυνην', 'μνημοσυνης']],
  ['phoebe', ['φοιβην']],
  ['kronos', ['κρονος', 'κρονου', 'κρονον', 'κρονω']],
  ['rhea', ['ρειαν', 'ρειη', 'ρεην']],
  ['helios', ['ηελιον', 'ηελιος', 'ηελιοιο', 'ηελιου']],
  ['selene', ['σεληνην']],
  ['eos', ['ηω', 'ηως', 'ηους', 'ηριγενεια']],
  ['boreas', ['βορεην', 'βορεω']],
  ['notos', ['νοτον', 'νοτου']],
  ['zephyros', ['ζεφυρον', 'ζεφυροιο']],
  ['leto', ['λητω']],
  ['hekate', ['εκατην', 'εκατη']],
  ['atlas', ['ατλαντα', 'ατλας']],
  ['prometheus', ['προμηθεα', 'προμηθευς']],
  ['epimetheus', ['επιμηθεα']],
  ['nike', ['νικην']],
  ['zeus', ['ζευς', 'διος', 'διι', 'δια', 'δι', 'ζηνος', 'ζηνα', 'ζηνι', 'ζην']],
  ['hera', ['ηρην', 'ηρη', 'ηρης']],
  [
    'poseidon',
    [
      'ποσειδαωνα',
      'ποσειδεων',
      'εννοσιγαιω',
      'εννοσιγαιον',
      'εννοσιγαιος',
      'εννοσιγαιου',
      'κυανοχαιτης',
    ],
  ],
  ['hades', ['αιδεω', 'αιδην', 'αιδης', 'αιδωνευς']],
  ['hestia', ['ιστιην']],
  ['demeter', ['δημητρα', 'δημητρος', 'δημητηρ']],
  ['athena', ['αθηνην', 'αθηνη', 'αθηναιης', 'ατρυτωνην', 'τριτογενειαν']],
  ['apollon', ['απολλωνα', 'απολλωνος', 'απολλωνι', 'φοιβον']],
  ['artemis', ['αρτεμιν']],
  ['aphrodite', ['αφροδιτην', 'αφροδιτης', 'αφροδιτη', 'κυθερειαν', 'κυθερεια', 'κυπρογενεα']],
  ['ares', ['αρηι', 'αρηα']],
  ['hephaistos', ['ηφαιστου', 'ηφαιστον', 'ηφαιστος']],
  ['hermes', ['ερμη', 'ερμην']],
  ['dionysos', ['διωνυσον', 'διωνυσος']],
  ['persephone', ['περσεφονην', 'περσεφονειης']],
  ['hebe', ['ηβην']],
  ['eileithyia', ['ειλειθυιαν']],
  ['olympos', ['ολυμπου', 'ολυμπον', 'ολυμπος', 'ουλυμποιο', 'ουλυμπω', 'ουλυμπονδε']],
  ['kleio', ['κλειω']],
  ['euterpe', ['ευτερπη']],
  ['thaleia', ['θαλεια']],
  ['melpomene', ['μελπομενη']],
  ['terpsichore', ['τερψιχορη']],
  ['polyhymnia', ['πολυμνια']],
  ['calliope', ['καλλιοπη']],
  ['typhon', ['τυφαονα', 'τυφωεα', 'τυφωεος']],
  ['herakles', ['ηρακληειη', 'ηρακλεης', 'ηρακληος', 'ηρακληειης', 'ηρακληειην']],
  ['phobos', ['φοβον']],
  ['deimos', ['δειμον']],
  ['eirene', ['ειρηνην']],
  ['cadmus', ['καδμος', 'καδμω']],
  ['alcmene', ['αλκμηνη', 'αλκμηνης']],
  ['ariadne', ['αριαδνην']],
  ['minos', ['μινωος']],
  ['circe', ['κιρκην', 'κιρκη']],
  ['aetes', ['αιητην', 'αιητης', 'αιηταο', 'αιητεω']],
  ['medea', ['μηδειαν']],
  ['iason', ['ιησονι']],
  ['peleus', ['πηλει']],
  ['aineias', ['αινειαν']],
  ['odysseus', ['οδυσσηος', 'οδυσηι']],
  ['phaethon', ['φαεθοντα']],
  ['chiron', ['χειρων']],
  ['agave', ['αγαυην']],
];

// Normalized form → temple id. The table stores normalized forms already.
const FORM_TO_ID = new Map();
for (const [id, forms] of XREF) {
  for (const form of forms) {
    if (FORM_TO_ID.has(form)) {
      throw new Error(`XREF collision: ${form} claimed by ${FORM_TO_ID.get(form)} and ${id}`);
    }
    FORM_TO_ID.set(form, id);
  }
}
for (const [id] of XREF) {
  if (!LEXICON_BY_ID.has(id)) throw new Error(`XREF temple id not in lexicon: ${id}`);
  if (!fs.existsSync(path.join(ROOT, 'sites', id, 'index.html'))) {
    throw new Error(`XREF temple page missing on disk: sites/${id}/index.html`);
  }
}

// ── Movements (section boundaries verified against the Greek text) ──────────
// L116 Χάος γένετʼ · L233 Νηρέα … Πόντος · L337 Τηθὺς δʼ Ὠκεανῷ Ποταμοὺς ·
// L617 Βριάρεῳ δʼ · L886 Ζεὺς δὲ θεῶν βασιλεὺς πρώτην ἄλοχον · L963 ὑμεῖς μὲν
// νῦν χαίρετʼ · L1022 Μοῦσαι Ὀλυμπιάδες.
const MOVEMENTS = [
  { anchor: 'proem', label: 'Proem', sub: 'The hymn to the Muses of Helicon', from: 1, to: 115 },
  {
    anchor: 'first-gods',
    label: 'The First Gods',
    sub: 'Chaos, Gaia, Ouranos, and the children of Night',
    from: 116,
    to: 232,
  },
  {
    anchor: 'sea-deities',
    label: 'Sea Deities',
    sub: 'Nereus, the Oceanids, and the monsters of Phorkys and Keto',
    from: 233,
    to: 336,
  },
  {
    anchor: 'titans',
    label: 'The Titans',
    sub: 'Rivers and Oceanids, the hymn to Hekate, the birth of Zeus, Prometheus',
    from: 337,
    to: 616,
  },
  {
    anchor: 'titanomachy',
    label: 'Titanomachy & Typhoeus',
    sub: 'The war for Olympus, Tartarus, and the last monster',
    from: 617,
    to: 885,
  },
  {
    anchor: 'marriages',
    label: 'Olympian Marriages',
    sub: 'The unions of Zeus and the other Olympians',
    from: 886,
    to: 962,
  },
  {
    anchor: 'epilogue',
    label: 'Goddesses & Mortals',
    sub: 'The catalogue of unions with mortal men',
    from: 963,
    to: 1022,
  },
];

// ── Matching engine ─────────────────────────────────────────────────────────
// Trimmable punctuation around a token. The elision mark ʼ stays inside the
// core and is dropped by normGreek (Γαῖʼ → γαι, Φῖκʼ → φικ, Δίʼ → δι).
const EDGE_PUNCT = /^[,;.·†—]+|[,;.·†—]+$/gu;

// Movement assignment. The scholarly boundaries above are fixed, but the
// English translation is chunked in ~5-line blocks whose edges rarely align
// with them (e.g. chunk [115–119] straddles the Proem/First-Gods seam).
// A chunk is assigned to the movement containing its LAST line, so no
// post-seam content is ever stranded under the previous movement; each
// movement's DISPLAYED range is then the union of its assigned chunks —
// snapped to real chunk edges, recomputed from the actual anchors.
function scholarlyMovementIndex(n) {
  for (let i = 0; i < MOVEMENTS.length; i++) {
    if (n >= MOVEMENTS[i].from && n <= MOVEMENTS[i].to) return i;
  }
  return MOVEMENTS.length - 1;
}

function analyzeGreekLine(text) {
  // Returns { html, ids } — html with temple links baked in (original text
  // preserved byte-faithfully inside the tags), ids = temple ids matched in
  // this line in first-appearance order.
  const ids = [];
  const parts = [];
  for (const raw of text.split(' ')) {
    const stripped = raw.replace(EDGE_PUNCT, '');
    const leadLen = raw.length - raw.replace(/^[,;.·†—]+/u, '').length;
    const pre = raw.slice(0, leadLen);
    const post = raw.slice(leadLen + stripped.length);
    const id = stripped && isCapitalGreek(stripped) ? FORM_TO_ID.get(normGreek(stripped)) : undefined;
    if (id) {
      if (!ids.includes(id)) ids.push(id);
      parts.push(
        `${escapeHtml(pre)}<a class="tx-x" href="/sites/${id}/">${escapeHtml(stripped)}</a>${escapeHtml(post)}`
      );
    } else {
      parts.push(escapeHtml(raw));
    }
  }
  return { html: parts.join(' '), ids };
}

// ── Corpus loading + per-text computation ───────────────────────────────────

const registry = JSON.parse(fs.readFileSync(path.join(TEXTS_DIR, 'registry.json'), 'utf8'));

function loadCorpus(text) {
  const grcPath = path.join(TEXTS_DIR, text.id, 'grc.json');
  const engPath = path.join(TEXTS_DIR, text.id, 'eng.json');
  if (!fs.existsSync(grcPath) || !fs.existsSync(engPath)) return null;
  return {
    grc: JSON.parse(fs.readFileSync(grcPath, 'utf8')),
    eng: JSON.parse(fs.readFileSync(engPath, 'utf8')),
  };
}

function computeText(text, corpus) {
  // Per-chunk chips: entities matched in the chunk's Greek line range, in
  // first-appearance order. Ranges (not display sequence) drive every
  // pairing, so transposed chunks (427 before 426, 434 before 430) still
  // attach to their true Greek lines.
  const chunkShells = corpus.eng.chunks.map((c) => ({
    from: c.from,
    to: c.to,
    text: c.text,
    movement: scholarlyMovementIndex(c.to),
  }));

  // Snapped display ranges: the union of the chunks assigned to each
  // movement. Chunks tile the poem contiguously and assignment is by last
  // line, so the ranges tile too (displayTo of one movement is displayFrom
  // of the next minus one).
  const displayRanges = MOVEMENTS.map(() => ({ from: Infinity, to: -Infinity }));
  for (const c of chunkShells) {
    const r = displayRanges[c.movement];
    r.from = Math.min(r.from, c.from);
    r.to = Math.max(r.to, c.to);
  }

  // Per-line analysis. Greek lines group into the same snapped display
  // ranges so all three views agree on section membership.
  const movementOfLine = (n) => {
    for (let i = 0; i < displayRanges.length; i++) {
      if (n >= displayRanges[i].from && n <= displayRanges[i].to) return i;
    }
    return displayRanges.length - 1;
  };
  const lines = corpus.grc.lines.map((l) => {
    const a = analyzeGreekLine(l.text);
    return { n: l.n, text: l.text, html: a.html, ids: a.ids, movement: movementOfLine(l.n) };
  });

  const chunks = chunkShells.map((c) => {
    const seen = [];
    for (const l of lines) {
      if (l.n < c.from || l.n > c.to) continue;
      for (const id of l.ids) if (!seen.includes(id)) seen.push(id);
    }
    return { ...c, ids: seen };
  });

  // Mentioned-in-this-text index: every cross-linked temple, ordered by first
  // appearance (XREF order breaks same-line ties).
  const firstLine = new Map();
  const counts = new Map();
  for (const l of lines) {
    for (const id of l.ids) {
      counts.set(id, (counts.get(id) || 0) + 1);
      if (!firstLine.has(id)) firstLine.set(id, l.n);
    }
  }
  const xrefOrder = new Map(XREF.map(([id], i) => [id, i]));
  const mentioned = [...firstLine.keys()].sort(
    (a, b) => firstLine.get(a) - firstLine.get(b) || xrefOrder.get(a) - xrefOrder.get(b)
  );

  return { lines, chunks, mentioned, firstLine, counts, displayRanges };
}

// ── Shared CSS (both pages) ─────────────────────────────────────────────────

const TEXTS_CSS = `
        :root { --tx-serif: 'Cormorant Garamond', Georgia, 'Times New Roman', serif; }
        .tx-hero { padding: 9rem 1.5rem 3rem; text-align: center; }
        .tx-eyebrow { font-size: 0.78rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--primary, #d4af37); margin: 0 0 1rem; }
        .tx-hero-native { font-family: var(--tx-serif); font-size: clamp(2.9rem, 8vw, 5rem); color: var(--white, #fff); line-height: 1.12; margin: 0 0 0.4rem; }
        .tx-hero-title { font-family: var(--font-display, Cinzel, serif); font-size: clamp(1.5rem, 3.4vw, 2.1rem); color: var(--primary, #d4af37); margin: 0 0 1.2rem; }
        .tx-hero-sub { max-width: 44rem; margin: 0 auto 1.9rem; color: var(--white-dim, #e8e4dc); line-height: 1.7; font-size: 1.02rem; }
        .tx-stats { display: flex; flex-wrap: wrap; justify-content: center; gap: 1.2rem 2.4rem; margin-bottom: 1.9rem; }
        .tx-stat { text-align: center; }
        .tx-stat-value { display: block; font-family: var(--font-display, Cinzel, serif); font-size: 1.4rem; color: var(--primary, #d4af37); }
        .tx-stat-label { font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--white-dim, #e8e4dc); opacity: 0.7; }
        .tx-attr { max-width: 44rem; margin: 0 auto; font-size: 0.85rem; line-height: 1.65; color: var(--white-dim, #e8e4dc); border: 1px solid rgba(212,175,55,0.18); border-radius: 12px; padding: 1rem 1.25rem; background: rgba(255,255,255,0.03); text-align: left; }
        .tx-attr p { margin: 0 0 0.5rem; }
        .tx-attr p:last-child { margin-bottom: 0; }
        .tx-attr a { color: var(--primary, #d4af37); }
        .tx-attr strong { color: var(--white, #fff); font-weight: 600; }
        .tx-toolbar { position: sticky; top: var(--nav-height, 110px); z-index: 900; background: rgba(5,5,5,0.94); backdrop-filter: blur(8px); border-top: 1px solid rgba(212,175,55,0.14); border-bottom: 1px solid rgba(212,175,55,0.14); padding: 0.7rem 1.5rem; display: flex; flex-wrap: wrap; gap: 0.6rem 1.6rem; align-items: center; justify-content: center; }
        .tx-pills { display: flex; gap: 0.4rem; }
        .tx-pill { padding: 0.42rem 1.05rem; border-radius: 999px; border: 1px solid rgba(212,175,55,0.3); background: none; color: var(--white-dim, #e8e4dc); font-size: 0.86rem; font-family: inherit; cursor: pointer; }
        .tx-pill:hover { color: var(--primary-bright, #f0d878); border-color: var(--primary-bright, #f0d878); }
        .tx-pill.active { background: var(--primary, #d4af37); border-color: var(--primary, #d4af37); color: #0a0a0a; }
        .tx-secs { display: flex; flex-wrap: wrap; gap: 0.2rem 0.95rem; justify-content: center; }
        .tx-secs a { font-size: 0.8rem; letter-spacing: 0.04em; color: var(--white-dim, #e8e4dc); text-decoration: none; opacity: 0.75; }
        .tx-secs a:hover { color: var(--primary-bright, #f0d878); opacity: 1; }
        .tx-measure { max-width: 46rem; margin: 0 auto; padding: 2.5rem 1.5rem 1rem; }
        .tx-movement { scroll-margin-top: calc(var(--nav-height, 110px) + 5rem); margin-bottom: 2.75rem; }
        .tx-movement-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.3rem 0.9rem; border-bottom: 1px solid rgba(212,175,55,0.2); margin-bottom: 1.6rem; padding-bottom: 0.6rem; }
        .tx-movement-head h2 { font-family: var(--font-display, Cinzel, serif); font-size: 1.3rem; color: var(--primary, #d4af37); margin: 0; }
        .tx-movement-sub { font-size: 0.85rem; color: var(--white-dim, #e8e4dc); opacity: 0.75; }
        .tx-movement-range { margin-left: auto; font-size: 0.76rem; letter-spacing: 0.12em; color: var(--primary, #d4af37); opacity: 0.8; white-space: nowrap; }
        .tx-chunk { margin-bottom: 1.9rem; scroll-margin-top: calc(var(--nav-height, 110px) + 5rem); }
        .tx-chunk-head { display: flex; align-items: center; gap: 0.55rem; margin-bottom: 0.3rem; }
        .tx-range { font-size: 0.75rem; letter-spacing: 0.14em; color: var(--primary, #d4af37); opacity: 0.85; }
        .tx-perma { border: none; background: none; color: var(--white-dim, #e8e4dc); opacity: 0.35; cursor: pointer; font-size: 0.92rem; line-height: 1; padding: 0.1rem 0.3rem; font-family: inherit; }
        .tx-perma:hover { color: var(--primary, #d4af37); opacity: 1; }
        .tx-eng { font-family: var(--tx-serif); font-size: 1.22rem; line-height: 1.75; color: var(--white, #f4f1ea); margin: 0 0 0.55rem; }
        .tx-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; margin: 0; }
        .tx-chips-label { font-size: 0.66rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--white-dim, #e8e4dc); opacity: 0.55; margin-right: 0.2rem; }
        .tx-chip { font-size: 0.75rem; padding: 0.18rem 0.65rem; border-radius: 999px; border: 1px solid rgba(212,175,55,0.28); color: var(--primary, #d4af37); text-decoration: none; }
        .tx-chip:hover { border-color: var(--primary-bright, #f0d878); color: var(--primary-bright, #f0d878); }
        .tx-line { display: flex; gap: 0.9rem; align-items: baseline; scroll-margin-top: calc(var(--nav-height, 110px) + 5rem); }
        .tx-gut { flex: 0 0 2.6rem; text-align: right; font-size: 0.75rem; color: var(--white-dim, #e8e4dc); opacity: 0.32; border: none; background: none; cursor: pointer; font-family: inherit; padding: 0; line-height: 2.1; }
        .tx-line:hover .tx-gut { opacity: 0.9; color: var(--primary, #d4af37); }
        .tx-grc { font-family: var(--tx-serif); font-size: 1.3rem; line-height: 2.0; color: var(--white, #f4f1ea); }
        .tx-x { color: inherit; text-decoration: none; border-bottom: 1px solid rgba(212,175,55,0.45); }
        .tx-x:hover { color: var(--primary-bright, #f0d878); border-bottom-color: var(--primary-bright, #f0d878); }
        .tx-pair { margin-bottom: 2.2rem; scroll-margin-top: calc(var(--nav-height, 110px) + 5rem); }
        .tx-pair .tx-eng { margin-bottom: 0.7rem; }
        .tx-pair-grc { border-left: 2px solid rgba(212,175,55,0.28); padding-left: 1.1rem; }
        .tx-pair-grc .tx-line { gap: 0.7rem; }
        .tx-pair-grc .tx-gut { flex-basis: 2rem; line-height: 1.9; }
        .tx-pair-grc .tx-grc { font-size: 1.12rem; line-height: 1.9; opacity: 0.92; }
        .tx-flash { animation: txflash 1.6s ease-out; }
        @keyframes txflash { 0% { background: rgba(212,175,55,0.22); } 100% { background: transparent; } }
        .tx-lib-grid { max-width: 62rem; margin: 0 auto; padding: 0 1.5rem 4.5rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }
        .tx-card { display: flex; flex-direction: column; padding: 1.5rem; border-radius: 14px; border: 1px solid rgba(212,175,55,0.16); background: rgba(255,255,255,0.03); transition: border-color 0.15s, transform 0.15s; }
        .tx-card:hover { border-color: rgba(212,175,55,0.45); transform: translateY(-2px); }
        .tx-card-native { font-family: var(--tx-serif); font-size: 1.9rem; color: var(--white, #fff); line-height: 1.2; margin: 0 0 0.15rem; }
        .tx-card-title { font-family: var(--font-display, Cinzel, serif); font-size: 1.05rem; color: var(--primary, #d4af37); margin: 0 0 0.7rem; }
        .tx-card-meta { margin: 0 0 0.8rem; font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--white-dim, #e8e4dc); opacity: 0.65; }
        .tx-card-summary { flex: 1; margin: 0 0 1rem; font-size: 0.92rem; line-height: 1.65; color: var(--white-dim, #e8e4dc); }
        .tx-card-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; }
        .tx-card-license { font-size: 0.72rem; color: var(--white-dim, #e8e4dc); opacity: 0.6; }
        .tx-card-read { font-size: 0.85rem; color: var(--primary, #d4af37); text-decoration: none; letter-spacing: 0.06em; }
        .tx-card-read:hover { color: var(--primary-bright, #f0d878); }
        .tx-mentioned { max-width: 64rem; margin: 0 auto; padding: 0.5rem 1.5rem 4rem; }
        .tx-mentioned-head { text-align: center; margin-bottom: 2rem; }
        .tx-mentioned-head h2 { font-family: var(--font-display, Cinzel, serif); font-size: clamp(1.5rem, 3.4vw, 2rem); color: var(--white, #fff); margin: 0 0 0.6rem; }
        .tx-mentioned-head p { max-width: 40rem; margin: 0 auto; color: var(--white-dim, #e8e4dc); line-height: 1.7; font-size: 0.95rem; }
        .tx-m-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.8rem; }
        .tx-m-card { display: block; border: 1px solid rgba(212,175,55,0.16); border-radius: 10px; padding: 0.7rem 0.85rem; background: rgba(255,255,255,0.03); text-decoration: none; transition: border-color 0.15s; }
        .tx-m-card:hover { border-color: rgba(212,175,55,0.5); }
        .tx-m-name { font-family: var(--font-display, Cinzel, serif); color: var(--primary, #d4af37); font-size: 0.95rem; display: block; }
        .tx-m-greek { font-family: var(--tx-serif); color: var(--white, #fff); font-size: 1rem; display: block; margin-top: 0.1rem; }
        .tx-m-gloss { font-size: 0.68rem; color: var(--white-dim, #e8e4dc); opacity: 0.6; display: block; margin-top: 0.25rem; }
        .tx-m-line { font-size: 0.66rem; color: var(--primary, #d4af37); opacity: 0.75; display: block; margin-top: 0.2rem; }
        .tx-m-badge { display: inline-block; font-size: 0.6rem; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid rgba(212,175,55,0.3); border-radius: 999px; color: var(--primary, #d4af37); padding: 0.1rem 0.45rem; margin-left: 0.4rem; vertical-align: middle; }
        .tx-colophon { max-width: 46rem; margin: 0 auto; padding: 0 1.5rem 4rem; }
        .tx-colophon-box { border: 1px solid rgba(212,175,55,0.16); border-radius: 12px; background: rgba(255,255,255,0.03); padding: 1.25rem 1.5rem; font-size: 0.88rem; line-height: 1.7; color: var(--white-dim, #e8e4dc); }
        .tx-colophon-box h2 { font-family: var(--font-display, Cinzel, serif); font-size: 1.05rem; color: var(--primary, #d4af37); margin: 0 0 0.8rem; }
        .tx-colophon-box p { margin: 0 0 0.6rem; }
        .tx-colophon-box p:last-child { margin-bottom: 0; }
        .tx-colophon-box a { color: var(--primary, #d4af37); }
        .tx-back { display: block; max-width: 46rem; margin: 0 auto 2rem; padding: 0 1.5rem; font-size: 0.85rem; }
        .tx-back a { color: var(--primary, #d4af37); text-decoration: none; }
        .tx-toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); background: rgba(20,18,10,0.96); border: 1px solid rgba(212,175,55,0.4); color: var(--primary-bright, #f0d878); padding: 0.55rem 1.2rem; border-radius: 999px; font-size: 0.85rem; opacity: 0; pointer-events: none; transition: opacity 0.2s; z-index: 2000; }
        .tx-toast.show { opacity: 1; }
        @media (max-width: 640px) { .tx-toolbar { top: var(--nav-height, 72px); } .tx-hero { padding-top: 7rem; } }
        @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } .tx-flash { animation: none; } .tx-toast, .tx-card, .tx-m-card { transition: none; } }
`;

// ── HTML fragments ──────────────────────────────────────────────────────────

function licenseShort(license) {
  return String(license || '').split(/[;(]/)[0].trim();
}

function chipsHtml(ids) {
  if (!ids.length) return '';
  const chips = ids
    .map((id) => {
      const e = LEXICON_BY_ID.get(id);
      return `<a class="tx-chip" href="/sites/${id}/">${escapeHtml(e.unicode || e.ascii || id)}</a>`;
    })
    .join('');
  return `<p class="tx-chips"><span class="tx-chips-label">Mentioned temples</span>${chips}</p>`;
}

function rangeLabel(from, to) {
  return from === to ? `${from}` : `${from}–${to}`;
}

// Movement sections repeat across the three language views, so only the
// English view carries the bare anchor id (#proem); Greek/Parallel sections
// are suffixed (#proem-grc / #proem-par) and the page script routes section
// nav clicks to the active view's copy. The displayed range is the snapped
// chunk-edge range computed from the actual chunk anchors (see computeText).
function movementHeadHtml(m, suffix, display) {
  return `<section class="tx-movement" id="${m.anchor}${suffix}">
            <div class="tx-movement-head">
                <h2>${escapeHtml(m.label)}</h2>
                <span class="tx-movement-sub">${escapeHtml(m.sub)}</span>
                <span class="tx-movement-range">lines ${display.from}–${display.to}</span>
            </div>`;
}

// ── Reading page views ──────────────────────────────────────────────────────

function englishViewHtml(computed) {
  const byMovement = MOVEMENTS.map(() => []);
  for (const c of computed.chunks) byMovement[c.movement].push(c);
  const parts = [];
  for (let i = 0; i < MOVEMENTS.length; i++) {
    parts.push(movementHeadHtml(MOVEMENTS[i], '', computed.displayRanges[i]));
    for (const c of byMovement[i]) {
      parts.push(`            <article class="tx-chunk" id="L${c.from}-${c.to}" data-from="${c.from}" data-to="${c.to}">
                <div class="tx-chunk-head">
                    <span class="tx-range">${rangeLabel(c.from, c.to)}</span>
                    <button type="button" class="tx-perma" data-anchor="L${c.from}-${c.to}" title="Copy link to lines ${rangeLabel(c.from, c.to)}" aria-label="Copy link to lines ${rangeLabel(c.from, c.to)}">§</button>
                </div>
                <p class="tx-eng">${escapeHtml(c.text)}</p>
                ${chipsHtml(c.ids)}
            </article>`);
    }
    parts.push('        </section>');
  }
  return parts.join('\n');
}

function greekViewHtml(computed) {
  const byMovement = MOVEMENTS.map(() => []);
  for (const l of computed.lines) byMovement[l.movement].push(l);
  const parts = [];
  for (let i = 0; i < MOVEMENTS.length; i++) {
    parts.push(movementHeadHtml(MOVEMENTS[i], '-grc', computed.displayRanges[i]));
    for (const l of byMovement[i]) {
      const gutter = l.n === 1 || l.n % 5 === 0 ? String(l.n) : '';
      parts.push(`            <div class="tx-line" id="L${l.n}" data-l="${l.n}">
                <button type="button" class="tx-gut" data-anchor="L${l.n}" title="Line ${l.n} — copy link" aria-label="Line ${l.n} — copy link">${gutter}</button>
                <span class="tx-grc" lang="grc">${l.html}</span>
            </div>`);
    }
    parts.push('        </section>');
  }
  return parts.join('\n');
}

function parallelViewHtml(computed) {
  const lineByN = new Map(computed.lines.map((l) => [l.n, l]));
  const byMovement = MOVEMENTS.map(() => []);
  for (const c of computed.chunks) byMovement[c.movement].push(c);
  const parts = [];
  for (let i = 0; i < MOVEMENTS.length; i++) {
    parts.push(movementHeadHtml(MOVEMENTS[i], '-par', computed.displayRanges[i]));
    for (const c of byMovement[i]) {
      const grcLines = [];
      for (let n = c.from; n <= c.to; n++) {
        const l = lineByN.get(n);
        if (!l) continue;
        const gutter = l.n === 1 || l.n % 5 === 0 ? String(l.n) : '';
        grcLines.push(`                    <div class="tx-line" data-l="${l.n}">
                        <button type="button" class="tx-gut" data-anchor="L${l.n}" title="Line ${l.n} — copy link" aria-label="Line ${l.n} — copy link">${gutter}</button>
                        <span class="tx-grc" lang="grc">${l.html}</span>
                    </div>`);
      }
      parts.push(`            <article class="tx-pair" data-from="${c.from}" data-to="${c.to}">
                <div class="tx-chunk-head">
                    <span class="tx-range">${rangeLabel(c.from, c.to)}</span>
                    <button type="button" class="tx-perma" data-anchor="L${c.from}-${c.to}" title="Copy link to lines ${rangeLabel(c.from, c.to)}" aria-label="Copy link to lines ${rangeLabel(c.from, c.to)}">§</button>
                </div>
                <p class="tx-eng">${escapeHtml(c.text)}</p>
                <div class="tx-pair-grc">
${grcLines.join('\n')}
                </div>
                ${chipsHtml(c.ids)}
            </article>`);
    }
    parts.push('        </section>');
  }
  return parts.join('\n');
}

function mentionedHtml(computed) {
  const cards = computed.mentioned
    .map((id) => {
      const e = LEXICON_BY_ID.get(id);
      const badge = BUILT_IDS.has(id) ? '<span class="tx-m-badge">Flagship</span>' : '';
      return `            <a class="tx-m-card" href="/sites/${id}/">
                <span class="tx-m-name">${escapeHtml(e.unicode || e.ascii || id)}${badge}</span>
                <span class="tx-m-greek" lang="grc">${escapeHtml(e.greek || '')}</span>
                <span class="tx-m-gloss">${escapeHtml(e.domain || '')}</span>
                <span class="tx-m-line">first named at l. ${computed.firstLine.get(id)}</span>
            </a>`;
    })
    .join('\n');
  return `    <section class="tx-mentioned">
        <div class="tx-mentioned-head">
            <h2>Mentioned in this text</h2>
            <p>${computed.mentioned.length} temples are named in this poem. Every gold-underlined name in the Greek text and every chip in the translation leads here — the gods of the Theogony, restored and housed.</p>
        </div>
        <div class="tx-m-grid">
${cards}
        </div>
    </section>`;
}

function editionsHtml(text) {
  return text.editions
    .map(
      (ed) =>
        `<p><strong>${escapeHtml(ed.label)}</strong> — ${escapeHtml(ed.source)}. License: ${escapeHtml(ed.license)}. <a href="${escapeHtml(ed.sourceUrl)}" rel="noopener">Source</a>.</p>`
    )
    .join('\n            ');
}

const PAGE_SCRIPT = `
    (function () {
        'use strict';
        var views = {
            eng: document.getElementById('tx-view-eng'),
            grc: document.getElementById('tx-view-grc'),
            par: document.getElementById('tx-view-par')
        };
        var pills = Array.prototype.slice.call(document.querySelectorAll('.tx-pill'));
        var toast = document.getElementById('tx-toast');
        var toastTimer = null;
        var current = 'eng';

        function reducedMotion() {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }
        function showToast(msg) {
            if (!toast) return;
            toast.textContent = msg;
            toast.classList.add('show');
            clearTimeout(toastTimer);
            toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 1800);
        }
        function scrollToEl(el) {
            el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
            el.classList.remove('tx-flash');
            void el.offsetWidth;
            el.classList.add('tx-flash');
        }
        // Resolves #L213 / #L1-4 deep links in the ACTIVE view. Greek line ids
        // (L1..L1022) live in the Greek view; chunk range ids (L1-4) live in
        // the English view; mid-range line numbers resolve to the chunk whose
        // data-from/data-to range covers them. Movement anchors (#titans)
        // resolve to the active view's own copy (#titans / #titans-grc /
        // #titans-par).
        function viewSuffix() {
            return current === 'eng' ? '' : '-' + current;
        }
        function resolveHash() {
            var m = location.hash.match(/^#L(\\d+)(?:-(\\d+))?$/);
            if (!m) {
                var sec = document.getElementById(location.hash.slice(1) + viewSuffix());
                if (sec) scrollToEl(sec);
                return;
            }
            var n = parseInt(m[1], 10);
            var target = null;
            if (current === 'grc') target = document.getElementById('L' + n);
            if (!target && views[current]) {
                var nodes = views[current].querySelectorAll('[data-from][data-to]');
                for (var i = 0; i < nodes.length; i++) {
                    var from = parseInt(nodes[i].getAttribute('data-from'), 10);
                    var to = parseInt(nodes[i].getAttribute('data-to'), 10);
                    if (from <= n && n <= to) { target = nodes[i]; break; }
                }
            }
            if (target) scrollToEl(target);
        }
        function setMode(mode) {
            if (!views[mode]) return;
            current = mode;
            Object.keys(views).forEach(function (k) { views[k].hidden = k !== mode; });
            pills.forEach(function (p) {
                var on = p.getAttribute('data-mode') === mode;
                p.classList.toggle('active', on);
                p.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
            if (location.hash) resolveHash();
        }
        pills.forEach(function (p) {
            p.addEventListener('click', function () { setMode(p.getAttribute('data-mode')); });
        });
        // Section nav: scroll within the ACTIVE view (movement sections repeat
        // per view; only the English copy carries the bare anchor id).
        document.querySelectorAll('.tx-secs a').forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                if (location.hash !== a.getAttribute('href')) location.hash = a.getAttribute('href');
                resolveHash();
            });
        });
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.tx-perma, .tx-gut');
            if (!btn) return;
            var anchor = btn.getAttribute('data-anchor');
            if (!anchor) return;
            var url = location.origin + location.pathname + '#' + anchor;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(function () {
                    showToast('Link copied — #' + anchor);
                }, function () { location.hash = anchor; });
            } else {
                location.hash = anchor;
                showToast('Link — #' + anchor);
            }
        });
        window.addEventListener('hashchange', resolveHash);
        if (location.hash) resolveHash();
    })();
`;

// ── Page shell ──────────────────────────────────────────────────────────────

function headHtml({ title, description, canonical, ogDescription, jsonLd }) {
  return `<head>
<!-- PUNICODEX-ANALYTICS-START -->
<script src="/js/analytics-beacon.js" defer></script>
<!-- PUNICODEX-ANALYTICS-END -->

    <meta charset="UTF-8">
    <meta name="google" content="notranslate">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${canonical}">


    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(ogDescription)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="https://punicodex.com/assets/brand/05-social/punicodex-og-image-1200x630.png">
    <meta name="twitter:image" content="https://punicodex.com/assets/brand/05-social/punicodex-og-image-1200x630.png">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="PUNICODEX">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(ogDescription)}">

    <!-- Schema.org -->
    <script type="application/ld+json">
    ${jsonLd}
    </script>

    <link rel="icon" type="image/svg+xml" href="/assets/brand/02-favicons/favicon.svg">
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/02-favicons/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/assets/brand/02-favicons/favicon-16x16.png">
    <link rel="icon" href="/assets/brand/02-favicons/favicon.ico" sizes="any">
    <link rel="apple-touch-icon" href="/assets/brand/02-favicons/apple-touch-icon.png">
    <link rel="manifest" href="/assets/brand/06-code/site.webmanifest">

    <link rel="stylesheet" href="/assets/fonts/fonts.css">
    <link rel="stylesheet" href="/css/temple-base.css?v=perf21">
    <link rel="stylesheet" href="/css/strip-less-nav.css?v=1">
    <link rel="stylesheet" href="/css/nav-more.css?v=3">
    <link rel="stylesheet" href="/css/mobile-menu.css?v=1">
    <link rel="stylesheet" href="/css/footer.css?v=1">
    <meta name="theme-color" content="#050505">
    <meta name="color-scheme" content="dark">
    <style>${TEXTS_CSS}    </style>
<!-- PUNICODEX-HERALD-BEACON-START -->
<link rel="stylesheet" href="/css/herald-beacon.css?v=1">
<script src="/js/herald-beacon.js?v=1" defer></script>
<!-- PUNICODEX-HERALD-BEACON-END -->
<!-- PUNICODEX-COOKIE-CONSENT-START -->
<link rel="stylesheet" href="/css/cookie-consent.css?v=1">
<script src="/js/cookie-consent.js?v=1" defer></script>
<!-- PUNICODEX-COOKIE-CONSENT-END -->
</head>`;
}

// ── Reading page (/texts/{id}/) ─────────────────────────────────────────────

function buildReadingPage(text, corpus, computed) {
  const grcEdition = text.editions.find((e) => e.lang === 'grc') || text.editions[0];
  const engEdition = text.editions.find((e) => e.lang === 'eng') || text.editions[1];
  const mentionedCount = computed.mentioned.length;
  const canonical = `https://punicodex.com/texts/${text.id}/`;

  const jsonLd = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'Book',
      name: text.title,
      alternateName: text.titleNative,
      author: { '@type': 'Person', name: text.author, alternateName: text.authorNative },
      inLanguage: text.language,
      url: canonical,
      isPartOf: { '@type': 'WebSite', name: 'PUNICODEX', url: 'https://punicodex.com' },
      workTranslation: {
        '@type': 'Book',
        inLanguage: 'en',
        translator: { '@type': 'Person', name: 'Hugh G. Evelyn-White' },
      },
    },
    null,
    2
  ).replace(/</g, '\\u003c');

  const sectionLinks = MOVEMENTS.map(
    (m) => `<a href="#${m.anchor}">${escapeHtml(m.label)}</a>`
  ).join('\n                ');

  return `<!DOCTYPE html>
<!-- GENERATED FILE — do not edit by hand. Regenerate with: node scripts/generate-text-pages.js -->
<html lang="en">
${headHtml({
  title: `${text.title} — ${text.author} · Sacred Texts | PUNICODEX`,
  description: `Read ${text.author}'s ${text.title}: the complete Greek text (Perseus) with the Evelyn-White translation, line-level deep links, and cross-links to the temples of ${mentionedCount} named gods.`,
  canonical,
  ogDescription: `The complete ${text.title} in Greek and English — ${text.lineCount.toLocaleString('en-US')} lines, deep-linked by line, cross-linked to ${mentionedCount} temples of the Pantheon.`,
  jsonLd,
})}
<body>
    <!-- Navigation (canonical — built by scripts/sync-desktop-nav.js) -->
    ${fullNavHtml('/texts/')}

    <!-- Mobile Menu (canonical — built by scripts/sync-mobile-menu.js) -->
    ${menuForPage('/texts/')}

    <!-- Hero -->
    <section class="tx-hero">
        <p class="tx-eyebrow">The Library · Sacred Texts</p>
        <h1 class="tx-hero-native" lang="grc">${escapeHtml(text.titleNative)}</h1>
        <p class="tx-hero-title">${escapeHtml(text.title)}</p>
        <div class="tx-stats">
            <div class="tx-stat">
                <span class="tx-stat-value">${escapeHtml(text.author)}</span>
                <span class="tx-stat-label">${escapeHtml(text.authorNative)} · ${escapeHtml(text.composed)}</span>
            </div>
            <div class="tx-stat">
                <span class="tx-stat-value">${text.lineCount.toLocaleString('en-US')}</span>
                <span class="tx-stat-label">Lines</span>
            </div>
            <div class="tx-stat">
                <span class="tx-stat-value">${computed.chunks.length}</span>
                <span class="tx-stat-label">English sections</span>
            </div>
            <div class="tx-stat">
                <span class="tx-stat-value">${mentionedCount}</span>
                <span class="tx-stat-label">Temples named</span>
            </div>
        </div>
        <div class="tx-attr">
            <p><strong>${escapeHtml(grcEdition.label)}</strong> — ${escapeHtml(grcEdition.source)}. License: ${escapeHtml(grcEdition.license)}. <a href="${escapeHtml(grcEdition.sourceUrl)}" rel="noopener">Source</a>.</p>
            <p><strong>${escapeHtml(engEdition.label)}</strong> — ${escapeHtml(engEdition.source)}. License: ${escapeHtml(engEdition.license)}.</p>
            <p><strong>Licensing.</strong> The Greek pane reproduces the Perseus Digital Library digital edition under <strong>CC BY-SA</strong> (share-alike) — a distinct, stricter license than the site's own CC BY 4.0. The Evelyn-White translation (1914) is in the public domain.</p>
        </div>
    </section>

    <!-- Reading toolbar: language modes + movements -->
    <div class="tx-toolbar">
        <div class="tx-pills" role="group" aria-label="Language">
            <button type="button" class="tx-pill active" data-mode="eng" aria-pressed="true">English</button>
            <button type="button" class="tx-pill" data-mode="grc" aria-pressed="false">Greek</button>
            <button type="button" class="tx-pill" data-mode="par" aria-pressed="false">Parallel</button>
        </div>
        <nav class="tx-secs" aria-label="Movements">
                ${sectionLinks}
        </nav>
    </div>

    <!-- English view -->
    <main class="tx-measure" id="tx-view-eng">
${englishViewHtml(computed)}
    </main>

    <!-- Greek view -->
    <main class="tx-measure" id="tx-view-grc" hidden>
${greekViewHtml(computed)}
    </main>

    <!-- Parallel view -->
    <main class="tx-measure" id="tx-view-par" hidden>
${parallelViewHtml(computed)}
    </main>

${mentionedHtml(computed)}

    <!-- Colophon -->
    <section class="tx-colophon">
        <div class="tx-colophon-box">
            <h2>Sources &amp; licenses</h2>
            ${editionsHtml(text)}
            <p>The Greek pane reproduces the Perseus Digital Library digital edition under <strong>CC BY-SA</strong> (share-alike) — a distinct, stricter license than the site's own CC BY 4.0; the Evelyn-White translation (1914) is in the public domain. The Greek text is rendered byte-faithfully from the Perseus TEI corpus; the line numbering follows the Greek edition throughout. Gold-underlined names and temple chips are editorial cross-links into the PuniCodex Pantheon.</p>
            <p>Section ranges follow the poem's standard movements; display blocks snap to the nearest line block at the seams.</p>
        </div>
    </section>

    <p class="tx-back"><a href="/texts/">← Back to the Library</a></p>

    <!-- Footer (canonical — built by scripts/sync-footer.js) -->
    ${footerHtml()}

    <div class="tx-toast" id="tx-toast" role="status" aria-live="polite"></div>
    <script src="/js/px-core.js?v=perf20" defer></script>
    <script src="/js/temple-base.js?v=perf20" defer></script>
    <script>${PAGE_SCRIPT}    </script>
    <script src="/js/newsletter.js?v=1" defer></script>
</body>
</html>
`;
}

// ── Library index (/texts/) ─────────────────────────────────────────────────

function buildIndexPage(texts, computedById) {
  const totalLines = texts.reduce((a, t) => a + (t.lineCount || 0), 0);
  const linkedTemples = texts.reduce(
    (a, t) => a + (computedById.has(t.id) ? computedById.get(t.id).mentioned.length : 0),
    0
  );

  const cards = texts
    .map((t) => {
      const computed = computedById.get(t.id);
      const grcEdition = t.editions.find((e) => e.lang === 'grc') || t.editions[0];
      const engEdition = t.editions.find((e) => e.lang === 'eng') || t.editions[1];
      const license = `Greek ${licenseShort(grcEdition.license)} · English ${licenseShort(engEdition.license)}`;
      const foot = computed
        ? `<span class="tx-card-license">${escapeHtml(license)}</span>
                    <a class="tx-card-read" href="/texts/${t.id}/">Read the text →</a>`
        : `<span class="tx-card-license">${escapeHtml(license)}</span>
                    <span class="tx-card-read">Corpus in preparation</span>`;
      const linked = computed
        ? `<p class="tx-card-meta">${escapeHtml(t.authorNative)} ${escapeHtml(t.author)} · ${escapeHtml(t.composed)} · ${t.lineCount.toLocaleString('en-US')} lines · ${computed.mentioned.length} temples cross-linked</p>`
        : `<p class="tx-card-meta">${escapeHtml(t.authorNative)} ${escapeHtml(t.author)} · ${escapeHtml(t.composed)} · ${t.lineCount.toLocaleString('en-US')} lines</p>`;
      return `            <article class="tx-card">
                <h2 class="tx-card-native" lang="grc">${escapeHtml(t.titleNative)}</h2>
                <p class="tx-card-title">${escapeHtml(t.title)}</p>
                ${linked}
                <p class="tx-card-summary">${escapeHtml(t.summary)}</p>
                <div class="tx-card-foot">
                    ${foot}
                </div>
            </article>`;
    })
    .join('\n');

  const jsonLd = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'The Library — Sacred Texts | PUNICODEX',
      description:
        'The primary sources behind the Pantheon: critical editions and translations of the sacred texts, deep-linked by line and cross-linked to the temples of the gods they name.',
      url: 'https://punicodex.com/texts/',
      isPartOf: { '@type': 'WebSite', name: 'PUNICODEX', url: 'https://punicodex.com' },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: texts.length,
        itemListElement: texts.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `https://punicodex.com/texts/${t.id}/`,
          name: `${t.title} — ${t.author}`,
        })),
      },
    },
    null,
    2
  ).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<!-- GENERATED FILE — do not edit by hand. Regenerate with: node scripts/generate-text-pages.js -->
<html lang="en">
${headHtml({
  title: 'The Library — Sacred Texts | PUNICODEX',
  description: `The primary sources behind the Pantheon: critical editions and translations of ${texts.length} sacred text${texts.length === 1 ? '' : 's'}, deep-linked by line and cross-linked to ${linkedTemples} temples.`,
  canonical: 'https://punicodex.com/texts/',
  ogDescription: `The primary sources behind the Pantheon — critical editions, translations, and line-level cross-links to ${linkedTemples} temples.`,
  jsonLd,
})}
<body>
    <!-- Navigation (canonical — built by scripts/sync-desktop-nav.js) -->
    ${fullNavHtml('/texts/')}

    <!-- Mobile Menu (canonical — built by scripts/sync-mobile-menu.js) -->
    ${menuForPage('/texts/')}

    <!-- Hero -->
    <section class="tx-hero">
        <p class="tx-eyebrow">PuniCodex · Sacred Texts</p>
        <h1 class="tx-hero-title" style="font-size: clamp(2.4rem, 6vw, 4rem);">The Library</h1>
        <p class="tx-hero-sub">The primary sources behind the Pantheon — critical editions and translations of the ancient texts, deep-linked by line and cross-linked to the temples of the gods they name.</p>
        <div class="tx-stats">
            <div class="tx-stat">
                <span class="tx-stat-value">${texts.length}</span>
                <span class="tx-stat-label">Texts</span>
            </div>
            <div class="tx-stat">
                <span class="tx-stat-value">${totalLines.toLocaleString('en-US')}</span>
                <span class="tx-stat-label">Lines</span>
            </div>
            <div class="tx-stat">
                <span class="tx-stat-value">${linkedTemples}</span>
                <span class="tx-stat-label">Temples cross-linked</span>
            </div>
        </div>
    </section>

    <!-- Texts -->
    <section class="section">
        <div class="tx-lib-grid">
${cards}
        </div>
    </section>

    <!-- Footer (canonical — built by scripts/sync-footer.js) -->
    ${footerHtml()}

    <script src="/js/px-core.js?v=perf20" defer></script>
    <script src="/js/temple-base.js?v=perf20" defer></script>
    <script src="/js/newsletter.js?v=1" defer></script>
</body>
</html>
`;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const computedById = new Map();
  let written = 0;

  for (const text of registry.texts) {
    const corpus = loadCorpus(text);
    if (!corpus) {
      console.warn(`  skipping reading page for ${text.id}: corpus JSONs not found`);
      continue;
    }
    if (corpus.grc.lines.length !== text.lineCount) {
      throw new Error(
        `${text.id}: registry lineCount ${text.lineCount} != corpus lines ${corpus.grc.lines.length}`
      );
    }
    const computed = computeText(text, corpus);
    computedById.set(text.id, computed);
    const dir = path.join(OUT_DIR, text.id);
    fs.mkdirSync(dir, { recursive: true });
    writeFileWithRetry(path.join(dir, 'index.html'), buildReadingPage(text, corpus, computed), 'utf8');
    console.log(
      `  texts/${text.id}/index.html written (${corpus.grc.lines.length} lines, ${computed.chunks.length} chunks, ${computed.mentioned.length} temples cross-linked)`
    );
    written++;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  writeFileWithRetry(
    path.join(OUT_DIR, 'index.html'),
    buildIndexPage(registry.texts, computedById),
    'utf8'
  );
  console.log(`  texts/index.html written (${registry.texts.length} texts)`);
  console.log(`Texts: ${written + 1} pages generated.`);
}

if (require.main === module) main();

module.exports = { XREF, MOVEMENTS, normGreek, isCapitalGreek };
