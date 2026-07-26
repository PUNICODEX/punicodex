'use strict';
/**
 * Build platform/texts/bible-kjv/{eng.json,xref.json} from Project Gutenberg
 * #10 (King James Version), src/eng-raw.txt. Curated scope: 18 books.
 * Verses (C:V) are grouped into one paragraph per chapter, verse refs kept.
 */
const fs = require('node:fs');
const path = require('node:path');

const DIR = 'platform/texts/bible-kjv';

// All 66 PG10 book-title lines, in order (used only as boundary markers).
const ALL_BOOKS = [
  'The First Book of Moses: Called Genesis',
  'The Second Book of Moses: Called Exodus',
  'The Third Book of Moses: Called Leviticus',
  'The Fourth Book of Moses: Called Numbers',
  'The Fifth Book of Moses: Called Deuteronomy',
  'The Book of Joshua',
  'The Book of Judges',
  'The Book of Ruth',
  'The First Book of Samuel',
  'The Second Book of Samuel',
  'The First Book of the Kings',
  'The Second Book of the Kings',
  'The First Book of the Chronicles',
  'The Second Book of the Chronicles',
  'Ezra',
  'The Book of Nehemiah',
  'The Book of Esther',
  'The Book of Job',
  'The Book of Psalms',
  'The Proverbs',
  'Ecclesiastes',
  'The Song of Solomon',
  'The Book of the Prophet Isaiah',
  'The Book of the Prophet Jeremiah',
  'The Lamentations of Jeremiah',
  'The Book of the Prophet Ezekiel',
  'The Book of Daniel',
  'Hosea',
  'Joel',
  'Amos',
  'Obadiah',
  'Jonah',
  'Micah',
  'Nahum',
  'Habakkuk',
  'Zephaniah',
  'Haggai',
  'Zechariah',
  'Malachi',
  'The Gospel According to Saint Matthew',
  'The Gospel According to Saint Mark',
  'The Gospel According to Saint Luke',
  'The Gospel According to Saint John',
  'The Acts of the Apostles',
  'The Epistle of Paul the Apostle to the Romans',
  'The First Epistle of Paul the Apostle to the Corinthians',
  'The Second Epistle of Paul the Apostle to the Corinthians',
  'The Epistle of Paul the Apostle to the Galatians',
  'The Epistle of Paul the Apostle to the Ephesians',
  'The Epistle of Paul the Apostle to the Philippians',
  'The Epistle of Paul the Apostle to the Colossians',
  'The First Epistle of Paul the Apostle to the Thessalonians',
  'The Second Epistle of Paul the Apostle to the Thessalonians',
  'The First Epistle of Paul the Apostle to Timothy',
  'The Second Epistle of Paul the Apostle to Timothy',
  'The Epistle of Paul the Apostle to Titus',
  'The Epistle of Paul the Apostle to Philemon',
  'The Epistle to the Hebrews',
  'The Epistle of James',
  'The First Epistle of Peter',
  'The Second Epistle of Peter',
  'The First Epistle of John',
  'The Second Epistle of John',
  'The Third Epistle of John',
  'The Epistle of Jude',
  'The Revelation of Saint John the Divine',
];
const TITLE_SET = new Set(ALL_BOOKS);

// Curated scope (brief order): pg10 title -> [id, display title]
const CURATED = [
  ['The First Book of Moses: Called Genesis', 'genesis', 'Genesis'],
  ['The Second Book of Moses: Called Exodus', 'exodus', 'Exodus'],
  ['The Book of Psalms', 'psalms', 'Psalms'],
  ['The Proverbs', 'proverbs', 'Proverbs'],
  ['Ecclesiastes', 'ecclesiastes', 'Ecclesiastes'],
  ['The Song of Solomon', 'song-of-solomon', 'Song of Solomon'],
  ['The Book of Job', 'job', 'Job'],
  ['The Book of the Prophet Isaiah', 'isaiah', 'Isaiah'],
  ['The Book of Daniel', 'daniel', 'Daniel'],
  ['Jonah', 'jonah', 'Jonah'],
  ['The First Book of Samuel', '1-samuel', '1 Samuel'],
  ['The Second Book of Samuel', '2-samuel', '2 Samuel'],
  ['The First Book of the Kings', '1-kings', '1 Kings'],
  ['The Second Book of the Kings', '2-kings', '2 Kings'],
  ['The First Book of the Chronicles', '1-chronicles', '1 Chronicles'],
  ['The Second Book of the Chronicles', '2-chronicles', '2 Chronicles'],
  ['The Gospel According to Saint Matthew', 'matthew', 'Matthew'],
  ['The Revelation of Saint John the Divine', 'revelation', 'Revelation'],
];

let raw = fs.readFileSync(path.join(DIR, 'src', 'eng-raw.txt'), 'utf8');
raw = raw.replace(/\r\n/g, '\n');
const startMark = raw.search(/^\*\*\* START OF[^\n]*$/m);
const endMark = raw.search(/^\*\*\* END OF[^\n]*$/m);
if (startMark < 0 || endMark < 0) throw new Error('PG markers not found');
const body = raw.slice(raw.indexOf('\n', startMark) + 1, endMark);

// Parse into books: title line -> array of verses { c, v, text }.
// PG10 quirks handled: "Otherwise Called:"/"Commonly Called:" alias titles
// (Samuel/Kings) and several verses on one physical line.
const books = new Map();
let current = null;
let prevContentLine = '';
const pushLine = (line) => {
  if (current) current.lines.push(line);
};
for (const line of body.split('\n')) {
  const t = line.trim();
  if (TITLE_SET.has(t)) {
    const alias = prevContentLine === 'Otherwise Called:' || prevContentLine === 'Commonly Called:';
    if (!alias) {
      current = { title: t, lines: [] };
      books.set(t, current);
    }
    prevContentLine = t;
    continue;
  }
  if (t) {
    pushLine(t);
    prevContentLine = t;
  }
}

// Split each book's line stream into verses on C:V markers.
function versesOf(book) {
  const stream = book.lines.join(' ');
  const verses = [];
  const re = /(\d+):(\d+)\s+/g;
  const marks = [];
  let m;
  while ((m = re.exec(stream))) marks.push(m);
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index;
    const end = i + 1 < marks.length ? marks[i + 1].index : stream.length;
    const text = stream.slice(start + marks[i][0].length, end).trim();
    verses.push({ c: marks[i][1], v: marks[i][2], text });
  }
  return verses;
}

// Verify verse sequence: chapters 1..N, verses 1..M, no gaps/dupes.
function verifySequence(pgTitle, verses) {
  let ec = 1;
  let ev = 1;
  for (const { c, v } of verses) {
    const cn = Number(c);
    const vn = Number(v);
    if (cn === ec && vn === ev) {
      ev++;
    } else if (cn === ec + 1 && vn === 1) {
      ec++;
      ev = 2;
    } else {
      throw new Error(`${pgTitle}: sequence break at ${c}:${v} (expected ${ec}:${ev} or ${ec + 1}:1)`);
    }
  }
}

const sections = [];
for (const [pgTitle, id, title] of CURATED) {
  const book = books.get(pgTitle);
  if (!book) throw new Error(`book not found: ${pgTitle}`);
  const verses = versesOf(book);
  if (!verses.length) throw new Error(`no verses for ${pgTitle}`);
  verifySequence(pgTitle, verses);
  const byChapter = new Map();
  for (const v of verses) {
    if (!byChapter.has(v.c)) byChapter.set(v.c, []);
    byChapter.get(v.c).push(`${v.c}:${v.v} ${v.text}`);
  }
  const paras = [...byChapter.values()].map((vv) => vv.join(' '));
  sections.push({ id, title, text: paras.join('\n\n') });
}

const corpus = { lang: 'eng', sections };
fs.writeFileSync(path.join(DIR, 'eng.json'), JSON.stringify(corpus, null, 2) + '\n');

const allText = sections.map((s) => s.text).join('\n');
const xref = {
  version: 1,
  links: [
    { temple: 'moses', forms: ['Moses'] },
    { temple: 'david', forms: ['David'] },
    { temple: 'solomon', forms: ['Solomon'] },
    { temple: 'noah', forms: ['Noah'] },
    { temple: 'cain', forms: ['Cain'] },
    { temple: 'abel', forms: ['Abel'] },
  ],
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const l of xref.links) {
  for (const f of l.forms) {
    const re = new RegExp(`(?<![\\p{L}\\p{M}])${esc(f)}(?![\\p{L}\\p{M}])`, 'gu');
    const n = (allText.match(re) || []).length;
    console.log(`form "${f}" (${l.temple}): ${n}`);
    if (!n) throw new Error(`form not attested: ${f}`);
  }
}
fs.writeFileSync(path.join(DIR, 'xref.json'), JSON.stringify(xref, null, 2) + '\n');

let words = 0;
const nonAscii = new Set();
for (const s of sections) {
  words += s.text.split(/\s+/).length;
  for (const ch of s.text) if (ch.charCodeAt(0) > 127) nonAscii.add(ch);
  console.log(
    `${s.id.padEnd(16)} chapters=${s.text.split('\n\n').length.toString().padStart(4)} chars=${s.text.length}`
  );
}
console.log('total words ~' + words);
console.log('non-ASCII chars:', [...nonAscii].join(' ') || 'none');
