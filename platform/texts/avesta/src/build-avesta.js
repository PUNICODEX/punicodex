'use strict';
// Build platform/texts/avesta/eng.json from the fetched sacred-texts pages
// (jina markdown, .tmp-sre/jina/sbe*.txt) plus six Wayback-HTML stub chapters
// (.tmp-sre/jina/wb*.html). SBE 23 Yashts = Darmesteter; SBE 31 Yasna = Mills.
const fs = require('node:fs');

const J = '.tmp-sre/jina';
const RESIDUAL_LOG = '.tmp-sre/residual-log.txt';

// ── text cleaning ────────────────────────────────────────────────────────────

const ENTITY = {
  amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ',
  acirc: 'â', ecirc: 'ê', icirc: 'î', ocirc: 'ô', ucirc: 'û',
  atilde: 'ã', ntilde: 'ñ', Atilde: 'Ã', iexcl: '¡',
};

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => (name in ENTITY ? ENTITY[name] : m));
}

// sacred-texts italic-single-letter notation -> the print's diacritic chars,
// verified against the SBE 23/31 scans (archive.org zendavesta02/03darm):
//   ṣ (Yaṣt), ṭ (Arstâṭ, Frâdaṭfshu), ḥ (Daḥvyuma; Mills' own fn. "ḥv = h
//   before y") confirmed visually in roman type.
//   n: ñ (tilde) ONLY in the Speñta word-family (confirmed both volumes);
//      ṉ (dot) elsewhere (confirmed: Zaṉtuma, Raêvaṉt, Âsnavaṉt, Pâreṉdi,
//      Saoshyaṉts).
//   g/G: Darmesteter (SBE 23) uses ǧ/Ǧ (g-caron, confirmed "Ǧahi" on scan;
//      avesta.org normalizes to Jahi/Jamaspa); Mills (SBE 31) uses italics
//      for emendations ("Beregya" italic-g on scan) -> plain g.
//   All other _x_ (H, v, k, K, a, e, z, m, d, ...) are the translators'
//   EMENDATION italics (confirmed: "Beregya" italic-g, "Râman Hvâstra"
//   italic-Hv), not diacritic letters -> plain letters.
const DIA_BASE = { s: 'ṣ', S: 'Ṣ', t: 'ṭ', T: 'Ṭ', h: 'ḥ', n: 'ṉ', N: 'Ṉ' };
const DIA_DARM = { ...DIA_BASE, g: 'ǧ', G: 'Ǧ' };
let DIA = DIA_BASE;
let residualUnderscoreTokens = 0;
const residualByLetter = new Map();

const STOP = new Set([
  'the', 'an', 'of', 'to', 'in', 'on', 'and', 'or', 'by', 'is', 'at', 'as',
  'we', 'thou', 'thee', 'thy', 'my', 'his', 'her', 'its', 'our',
  'your', 'their', 'this', 'that', 'with', 'from', 'for', 'not', 'all', 'who',
  'he', 'it', 'so', 'do', 'did', 'may', 'shall', 'will', 'would', 'if',
  'then', 'than', 'but', 'nor', 'yet', 'unto', 'upon', 'when', 'which', 'what',
  'whose', 'whom', 'how', 'why', 'also', 'even', 'only', 'more', 'most', 'some',
  'such', 'no', 'yes', 'said', 'say', 'says', 'thus', 'there', 'here', 'they',
  'them', 'these', 'those', 'was', 'were', 'been', 'being', 'perishes',
  'unseen',
]);

function cleanInline(s, logCtx) {
  // Darmesteter (SBE 23) writes ǧ/Ǧ where Mills writes emendation italics.
  DIA = logCtx && /sbe23/.test(logCtx) ? DIA_DARM : DIA_BASE;
  let t = s;
  // footnote reference links: [12] / [2a] (...#fn_...) -> ''
  t = t.replace(/\[\d+[a-z]?\]\([^)]*#fn_[^)]*\)/g, '');
  // empty anchor links: [](...) -> ''
  t = t.replace(/\[\]\([^)]*\)/g, '');
  // real links: [text](url) -> text
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  // images
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  // markdown escapes
  t = t.replace(/\\([.\-*_()[\]#!>])/g, '$1');
  // parenthesised footnote markers: " (12)" -> ''
  t = t.replace(/ ?\(\d{1,3}\)/g, '');
  // exact, evidence-based joins for lowercase chains the heuristics cannot
  // resolve (print forms verified):
  //   the Ashem Vohû formula: "vahi _s_ tem" -> "vahiṣtem" (3x), "vahi _s_ tai" -> "vahiṣtai" (1x)
  //   "dada _t_ vâstârem" -> "dadaṭ vâstârem" (dadāt̰ + vâstârem, 1x)
  t = t.replace(/vahi _s_ t(em|ai)\b/g, 'vahiṣt$1');
  t = t.replace(/dada _t_ vâstârem/g, 'dadaṭ vâstârem');
  // merge adjacent underscore tokens: "_h_ _v_" -> "_hv_"
  let mergePrev;
  do {
    mergePrev = t;
    t = t.replace(/_([a-zA-Z])_ ?_([a-zA-Z])_/g, '_$1$2_');
  } while (t !== mergePrev);
  // diacritic letters: join mid-word first (with English-stopword guard so
  // "the _G_ ahi" stays "the Gahi"), then word-final, then strays.
  const diaToken = (tok) => {
    let out = '';
    for (const ch of tok) {
      if (ch in DIA) {
        out += DIA[ch];
      } else {
        residualUnderscoreTokens++;
        residualByLetter.set(ch, (residualByLetter.get(ch) || 0) + 1);
        if (logCtx) fs.appendFileSync(RESIDUAL_LOG, `${ch}\t${logCtx}\t${s.trim().slice(0, 90)}\n`);
        out += ch;
      }
    }
    return out;
  };
  // Left chunks that may begin a transliteration join: capitalized, or
  // containing a diacritic/non-ASCII char, or very short — English prose
  // words like "holy" (lowercase ASCII, len>=3) must NOT be swallowed.
  const joinableLeft = (w) =>
    w.length <= 2 || /^\p{Lu}/u.test(w) || /[^a-zA-Z]/.test(w) || /[\u0080-\uFFFF]/u.test(w);
  // Phase A: mid-word joins to stability (transliteration chains like
  // "Mazi _s_ i _s_ vau"), with English-stopword guard on both sides.
  const phaseA = () => {
    let prev;
    do {
      prev = t;
      t = t.replace(/([\p{L}-]+) ?_([a-zA-Z]{1,3})_ ?(?=\p{L})/gu, (m, left, tok, offset, string) => {
        // reject = no-op so the engine re-scans from the token itself
        if (!/\p{L}/u.test(left)) return m;
        if (STOP.has(left.toLowerCase())) return m;
        if (!joinableLeft(left)) return m;
        // capital residual tokens are emendation italics that START a new
        // word ("Mount _Hv_ anvaṉṭ", "Râman _Hv_ âstra") — never left-join
        if (![...tok].every((ch) => ch in DIA || ch === ch.toLowerCase())) return m;
        // a following English word means a real word boundary
        // ("Dru _g_ will" -> "Druǧ will", "Kinva _t_ Bridge" -> "Kinvaṭ Bridge")
        const wm = string.slice(offset + m.length).match(/^(\p{L}+)/u);
        if (wm && (STOP.has(wm[1].toLowerCase()) || (/^\p{Lu}/u.test(wm[1]) && wm[1].length >= 2))) return m;
        return left + diaToken(tok);
      });
    } while (t !== prev);
  };
  // Phase A2: word-start tokens. UPPERCASE-starting residual tokens are
  // emendation italics that always START a word ("Râman _Hv_ âstra",
  // "_K_ isti", "_G_ ahi") — always join right, keep the left boundary.
  // Lowercase tokens only join right when the preceding word is NOT a
  // transliteration chunk ("Kinva _t_ Bridge" is phase B2's job).
  const phaseA2 = () => {
    t = t.replace(/(^|[^\p{L}\p{M}])_([a-zA-Z]{1,3})_ ?(\p{L})/gu, (m, pre, tok, right, offset, string) => {
      if (/^\p{Lu}/u.test(tok)) return pre + diaToken(tok) + right;
      const tail = string.slice(0, offset);
      const wm = tail.match(/(?:_([a-zA-Z]{1,3})_ ?)?(\p{L}+)$/u);
      if (wm) {
        const word = (wm[1] ? diaToken(wm[1]) : '') + wm[2];
        if (!STOP.has(word.toLowerCase()) && joinableLeft(word)) return m;
      }
      return pre + diaToken(tok) + right;
    });
  };
  phaseA();
  // Phase B: word-final diacritics ("Haurvatâ _t_," / "Haurvatâ _t_ and").
  // A token followed by space+lowercase is only a boundary when the next
  // word is English (stopword); otherwise it is sacred-texts' padding
  // inside a transliteration chain (handled by the exact fixes below).
  t = t.replace(/([\p{L}-]*\p{L}) ?_([a-zA-Z]{1,3})_(.|$)/gsu, (m, left, tok, next, offset, string) => {
    if (STOP.has(left.toLowerCase())) return m;
    // an English left word means the token STARTS a new word (phase A2's job)
    if (!joinableLeft(left)) return m;
    if (next === '') return left + diaToken(tok);
    if (/[\p{L}\p{M}_]/u.test(next)) return m;
    if (next === ' ') {
      const rest = string.slice(offset + m.length);
      const wm = rest.match(/^(\p{L}+)/u);
      const nextWord = wm ? wm[1] : '';
      // boundary: English word, capitalized word, digit, or punctuation
      if (nextWord === '' || STOP.has(nextWord.toLowerCase()) || /^\p{Lu}/u.test(nextWord) || /^\d/.test(nextWord)) {
        return left + diaToken(tok) + ' ';
      }
      return m;
    }
    return left + diaToken(tok) + next; // punctuation
  });
  phaseA2();
  phaseA();
  // second word-final pass for chains revealed by A2 ("Mount Hvanva _nt_.")
  t = t.replace(/([\p{L}-]*\p{L}) ?_([a-zA-Z]{1,3})_(.|$)/gsu, (m, left, tok, next, offset, string) => {
    if (STOP.has(left.toLowerCase())) return m;
    if (!joinableLeft(left)) return m;
    if (next === '') return left + diaToken(tok);
    if (/[\p{L}\p{M}_]/u.test(next)) return m;
    if (next === ' ') {
      const rest = string.slice(offset + m.length);
      const wm = rest.match(/^(\p{L}+)/u);
      const nextWord = wm ? wm[1] : '';
      if (nextWord === '' || STOP.has(nextWord.toLowerCase()) || /^\p{Lu}/u.test(nextWord) || /^\d/.test(nextWord)) {
        return left + diaToken(tok) + ' ';
      }
      return m;
    }
    return left + diaToken(tok) + next;
  });
  t = t.replace(/_([a-zA-Z]{1,3})_/g, (_, tok) => diaToken(tok));
  // ṉ -> ñ inside the Speñta word-family (visually confirmed tilde)
  t = t.replace(/ṉ(?=ta|tô)/g, (m, off) => (/[Ss]pe$/.test(t.slice(0, off)) ? 'ñ' : m));
  // remaining markdown emphasis
  t = t.replace(/\*([^*]+)\*/g, '$1');
  t = t.replace(/_+/g, '');
  t = decodeEntities(t);
  return t.replace(/[ \t]+/g, ' ').trim();
}

const isNavLine = (l) =>
  /^\[(Sacred Texts|Zoroastrianism|Index|Previous|Next|Contents|Buy this Book|« Previous|Start Reading)/.test(l) ||
  /^\* \* \*$/.test(l) ||
  /^\[« Previous/.test(l) ||
  /^!\[/.test(l);

// ── per-file body extraction ─────────────────────────────────────────────────

function extractBody(file) {
  const raw = fs.readFileSync(file, 'utf8');
  let lines = raw.split('\n').map((l) => l.replace(/\s+$/, ''));
  // start at Markdown Content
  const mc = lines.findIndex((l) => l.startsWith('Markdown Content'));
  if (mc >= 0) lines = lines.slice(mc + 1);

  // cut at Footnotes
  const fn = lines.findIndex((l) => /^#{1,4}\s*Footnotes/i.test(l.trim()) || /^Footnotes\s*$/i.test(l.trim()));
  if (fn >= 0) lines = lines.slice(0, fn);

  // find body start
  let start = -1;
  const tr = lines.findIndex((l) => /^Translation\.?\s*$/.test(l.trim()));
  if (tr >= 0) {
    start = tr + 1;
  } else {
    // no "Translation." marker: the translation begins at the first verse
    // line (0. or 1.), which also skips Mills' chapter introductions (Y. IX)
    const firstVerse = lines.findIndex((l) => /^(0|1)(\.|\[)/.test(l.trim()));
    if (firstVerse >= 0) {
      start = firstVerse;
    } else {
      // fall back to the last rule or heading
      let lastRule = -1;
      let lastHead = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/^_{5,}\s*$/.test(lines[i].trim())) lastRule = i;
        if (/^#{2,4}\s/.test(lines[i])) lastHead = i;
      }
      start = Math.max(lastRule, lastHead) + 1;
    }
  }
  return lines.slice(start);
}

// Turn cleaned body lines into paragraphs (verses + freestanding lines).
function toParagraphs(bodyLines, logCtx) {
  const paras = [];
  let cur = null;
  const pushCur = () => {
    if (cur !== null && cur.trim()) paras.push(cur.trim());
    cur = null;
  };
  for (const raw of bodyLines) {
    if (/^_{5,}\s*$/.test(raw.trim()) || isNavLine(raw.trim()) || /^\[p\. \d+\]/.test(raw.trim())) {
      continue;
    }
    if (/^#{2,4}\s/.test(raw)) {
      // in-body heading (e.g. "#### I.") -> paragraph break, drop heading
      pushCur();
      continue;
    }
    const line = cleanInline(raw, logCtx).replace(/^\[paragraph continues\]\s*/, '');
    if (!line) {
      pushCur();
      continue;
    }
    if (/^\d{1,3}\.\s/.test(line) || /^\d{1,3}\.$/.test(line)) {
      pushCur();
      cur = line;
    } else if (cur === null) {
      cur = line;
    } else {
      cur += ' ' + line;
    }
  }
  pushCur();
  return paras;
}

// Wayback-HTML stub chapters: pull h3/h4/p text.
function stubParagraphs(file) {
  const html = fs.readFileSync(file, 'utf8');
  const body = html.slice(html.lastIndexOf('at sacred-texts.com'));
  const blocks = [...body.matchAll(/<h[34][^>]*>([\s\S]*?)<\/h[34]>|<p>([\s\S]*?)<\/p>/gi)];
  const out = [];
  for (const b of blocks) {
    const t = cleanInline(decodeEntities((b[1] || b[2] || '').replace(/<[^>]+>/g, ' ')));
    if (!t || /Next:|Previous:/.test(t)) continue;
    if (/^Footnotes/i.test(t)) break;
    out.push(t);
  }
  return out;
}

// ── section plan ─────────────────────────────────────────────────────────────

const Y = (file, marker, stub) => ({ file, marker, stub });

const SECTIONS = [
  {
    id: 'yasna-1-8',
    title: 'Yasna I–VIII: The Sacrifice Commences',
    chapters: [
      Y('sbe31023', 'YASNA I.'), Y('sbe31024', 'YASNA II.'), Y('sbe31025', 'YASNA III.'),
      Y('sbe31026', 'YASNA IV.'), Y('sbe31027', 'YASNA V.', 'wb31027'), Y('sbe31028', 'YASNA VI.'),
      Y('sbe31029', 'YASNA VII.'), Y('sbe31030', 'YASNA VIII.'),
    ],
  },
  {
    id: 'yasna-9-11',
    title: 'Yasna IX–XI: The Hôm Yaṣt',
    chapters: [Y('sbe31031', 'YASNA IX.'), Y('sbe31032', 'YASNA X.'), Y('sbe31033', 'YASNA XI.')],
  },
  {
    id: 'yasna-12',
    title: 'Yasna XII: The Mazdayasnian Confession',
    chapters: [Y('sbe31034', null)],
  },
  {
    id: 'yasna-13-27',
    title: 'Yasna XIII–XXVII: Invocations and Dedications',
    chapters: [
      Y('sbe31035', 'YASNA XIII.'), Y('sbe31036', 'YASNA XIV.'), Y('sbe31037', 'YASNA XV.'),
      Y('sbe31038', 'YASNA XVI.'), Y('sbe31039', 'YASNA XVII.'), Y('sbe31040', 'YASNA XVIII.'),
      Y('sbe31041', 'YASNA XIX.'), Y('sbe31042', 'YASNA XX.'), Y('sbe31043', 'YASNA XXI.'),
      Y('sbe31044', 'YASNA XXII.'), Y('sbe31045', 'YASNA XXIII.'), Y('sbe31046', 'YASNA XXIV.'),
      Y('sbe31047', 'YASNA XXV.'), Y('sbe31048', 'YASNA XXVI.'), Y('sbe31049', 'YASNA XXVII.'),
    ],
  },
  {
    id: 'yasna-28-34',
    title: 'The Gâtha Ahunavaiti (Yasna XXVIII–XXXIV)',
    chapters: [
      // Mills prints Y. XXIX before Y. XXVIII ("in a more natural order").
      Y('sbe31006', 'YASNA XXIX.'), Y('sbe31007', 'YASNA XXVIII.'), Y('sbe31008', 'YASNA XXX.'),
      Y('sbe31009', 'YASNA XXXI.'), Y('sbe31010', 'YASNA XXXII.'), Y('sbe31011', 'YASNA XXXIII.'),
      Y('sbe31012', 'YASNA XXXIV.'),
    ],
  },
  {
    id: 'yasna-35-42',
    title: 'The Yasna Haptanghâiti (Yasna XXXV–XLII)',
    chapters: [
      Y('sbe31050', 'YASNA XXXV.'), Y('sbe31051', 'YASNA XXXVI.'), Y('sbe31052', 'YASNA XXXVII.'),
      Y('sbe31053', 'YASNA XXXVIII.'), Y('sbe31054', 'YASNA XXXIX.'), Y('sbe31055', 'YASNA XL.'),
      Y('sbe31056', 'YASNA XLI.'), Y('sbe31057', 'YASNA XLII.'),
    ],
  },
  {
    id: 'yasna-43-46',
    title: 'The Gâtha Uṣtavaiti (Yasna XLIII–XLVI)',
    chapters: [
      Y('sbe31013', 'YASNA XLIII.'), Y('sbe31014', 'YASNA XLIV.'),
      Y('sbe31015', 'YASNA XLV.'), Y('sbe31016', 'YASNA XLVI.'),
    ],
  },
  {
    id: 'yasna-47-50',
    title: 'The Gâtha Speñtâ-mainyu (Yasna XLVII–L)',
    chapters: [
      Y('sbe31017', 'YASNA XLVII.'), Y('sbe31018', 'YASNA XLVIII.'),
      Y('sbe31019', 'YASNA XLIX.'), Y('sbe31020', 'YASNA XLIX, 12–L.'),
    ],
  },
  {
    id: 'yasna-51',
    title: 'The Gâtha Vohû-khshathrem (Yasna LI)',
    chapters: [Y('sbe31021', null)],
  },
  {
    id: 'yasna-52',
    title: 'Yasna LII: A Prayer for Sanctity and Its Benefits',
    chapters: [Y('sbe31058', null)],
  },
  {
    id: 'yasna-53',
    title: 'The Gâtha Vahiṣtâ-iṣtiṣ (Yasna LIII)',
    chapters: [Y('sbe31022', null)],
  },
  {
    id: 'yasna-54-72',
    title: 'Yasna LIV–LXXII: The Sacrifice Concluded',
    chapters: [
      Y('sbe31059', 'YASNA LIV.'), Y('sbe31060', 'YASNA LV.'), Y('sbe31061', 'YASNA LVI.'),
      Y('sbe31062', 'YASNA LVII.'), Y('sbe31063', 'YASNA LVIII.'), Y('sbe31064', 'YASNA LIX.'),
      Y('sbe31065', 'YASNA LX.'), Y('sbe31066', 'YASNA LXI.'), Y('sbe31067', 'YASNA LXII.'),
      Y('sbe31068', 'YASNA LXIII.', 'wb31068'), Y('sbe31069', 'YASNA LXIV.', 'wb31069'),
      Y('sbe31070', 'YASNA LXV.'), Y('sbe31071', 'YASNA LXVI.'), Y('sbe31072', 'YASNA LXVII.', 'wb31072'),
      Y('sbe31073', 'YASNA LXVIII.'), Y('sbe31074', 'YASNA LXIX.', 'wb31074'),
      Y('sbe31075', 'YASNA LXX.'), Y('sbe31076', 'YASNA LXXI.'), Y('sbe31077', 'YASNA LXXII.', 'wb31077'),
    ],
  },
  // ── Yashts (Darmesteter, SBE 23) ──
  { id: 'yasht-1', title: 'Yasht I: Ormazd Yaṣt', chapters: [Y('sbe2306', null)] },
  { id: 'yasht-2', title: 'Yasht II: Haptân Yaṣt', chapters: [Y('sbe2307', null)] },
  { id: 'yasht-3', title: 'Yasht III: Ardibehiṣt Yaṣt', chapters: [Y('sbe2308', null)] },
  { id: 'yasht-4', title: 'Yasht IV: Khordâd Yaṣt', chapters: [Y('sbe2309', null)] },
  { id: 'yasht-5', title: 'Yasht V: Âbân Yaṣt', chapters: [Y('sbe2310', null)] },
  { id: 'yasht-8', title: 'Yasht VIII: Tîr Yaṣt', chapters: [Y('sbe2313', null)] },
  { id: 'yasht-10', title: 'Yasht X: Mihir Yaṣt', chapters: [Y('sbe2315', null)] },
  { id: 'yasht-13', title: 'Yasht XIII: Farvardîn Yaṣt', chapters: [Y('sbe2318', null)] },
  { id: 'yasht-14', title: 'Yasht XIV: Bahrâm Yaṣt', chapters: [Y('sbe2319', null)] },
  { id: 'yasht-19', title: 'Yasht XIX: Zamyâd Yaṣt', chapters: [Y('sbe2324', null)] },
];

fs.writeFileSync(RESIDUAL_LOG, '');
const sections = [];
for (const sec of SECTIONS) {
  const paras = [];
  for (const ch of sec.chapters) {
    if (ch.marker) paras.push(ch.marker);
    const body = ch.stub
      ? stubParagraphs(`${J}/${ch.stub}.html`)
      : toParagraphs(extractBody(`${J}/${ch.file}.txt`), `${sec.id}/${ch.file}`);
    if (!body.length) throw new Error(`${sec.id}: no body extracted from ${ch.file}`);
    // For stubs, the h3 heading duplicates the marker; drop it.
    const cleaned = ch.stub ? body.slice(1) : body;
    paras.push(...cleaned);
  }
  const text = paras.join('\n\n');
  const words = text.split(/\s+/).length;
  console.log(`${sec.id.padEnd(14)} ${String(paras.length).padStart(4)} paras  ${String(words).padStart(6)} words`);
  sections.push({ id: sec.id, title: sec.title, text });
}

const corpus = { lang: 'eng', sections };
fs.writeFileSync('platform/texts/avesta/eng.json', `${JSON.stringify(corpus, null, 2)}\n`);
console.log(`\nwrote platform/texts/avesta/eng.json: ${sections.length} sections`);
console.log(`residual underscore tokens (dropped): ${residualUnderscoreTokens}`);
console.log('by letter:', JSON.stringify(Object.fromEntries([...residualByLetter.entries()].sort((a, b) => b[1] - a[1]))));
