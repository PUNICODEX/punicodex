#!/usr/bin/env node
'use strict';
/**
 * Extract curated chapters from Budge's 1901 Theban-recension translation
 * (archive.org djvu OCR) into draft section files for hand review.
 * Not part of the build; one-off corpus tooling.
 */
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '..', '..', 'platform', 'texts', 'book-of-the-dead', 'src');
const OUT = path.join(__dirname, 'out', 'botd-raw');
fs.mkdirSync(OUT, { recursive: true });

const v1 = fs.readFileSync(path.join(SRC, 'theban-vol1-djvu.txt'), 'utf8').split('\n');
const v2 = fs.readFileSync(path.join(SRC, 'theban-vol2-djvu.txt'), 'utf8').split('\n');
const v3 = fs.readFileSync(path.join(SRC, 'theban-vol3-djvu.txt'), 'utf8').split('\n');

// [id, vol, startLine(1-based), endLine(exclusive), title]
const SECTIONS = [
  ['chap-01-coming-forth-by-day', v1, 5086, 5419, 'Chapter I. Of Coming Forth by Day'],
  ['chap-06-shabti', v1, 5648, 5699, 'Chapter VI. Of Making the Shabti to Work'],
  ['chap-15-hymn-to-ra', v1, 6032, 6149, 'Chapter XV. A Hymn of Praise to Ra'],
  ['chap-15-litany-to-osiris', v1, 6149, 6350, 'Chapter XV. Hymn and Litany to Osiris'],
  ['chap-15-hymn-to-ra-setting', v1, 6350, 6642, 'Chapter XV. A Hymn of Praise to Ra When He Setteth'],
  ['chap-15-mystery-of-the-tuat', v1, 6642, 6973, 'Chapter XV. The Mystery of the Tuat'],
  ['chap-17-coming-forth', v1, 7164, 7953, 'Chapter XVII. Of Coming Forth by Day'],
  ['chap-18-hymns-to-thoth', v1, 8039, 8436, 'Chapter XVIII. The Hymns to Thoth'],
  ['chap-19-chaplet-of-victory', v1, 8436, 8552, 'Chapter XIX. Of the Chaplet of Victory'],
  ['chap-22-giving-a-mouth', v1, 8673, 8719, 'Chapter XXII. Of Giving a Mouth'],
  ['chap-23-opening-the-mouth', v1, 8719, 8788, 'Chapter XXIII. Of Opening the Mouth'],
  ['chap-26-giving-a-heart', v1, 8875, 8959, 'Chapter XXVI. Of Giving a Heart'],
  ['chap-27-heart-not-taken', v1, 8959, 9024, 'Chapter XXVII. Of Not Letting the Heart Be Taken'],
  ['chap-29b-heart-of-carnelian', v1, 9155, 9182, 'Chapter XXIXB. Of the Heart of Carnelian'],
  ['chap-30b-heart-not-carried-off', v1, 9182, 9432, 'Chapter XXX. Of Not Letting the Heart Be Carried Off'],
  ['chap-42-driving-back-slaughter', v1, 10224, 10577, 'Chapter XLII. Of Driving Back the Slaughter'],
  ['chap-64-single-chapter', v1, 11479, 11754, 'Chapter LXIV. Of Coming Forth by Day in a Single Chapter'],
  ['chap-72-opening-a-way', v2, 1333, 1428, 'Chapter LXXII. Of Opening Up a Way Through the Underworld'],
  ['chap-83-bennu-bird', v2, 2238, 2302, 'Chapter LXXXIII. Of Transformation into a Bennu Bird'],
  ['chap-89-soul-united-to-body', v2, 2578, 2652, 'Chapter LXXXIX. Of Causing the Soul to Be United to the Body'],
  ['chap-110-field-of-offerings', v2, 3966, 4635, 'Chapter CX. Of the Field of Offerings'],
  ['chap-125-hall-of-double-maati', v2, 5355, 5644, 'Chapter CXXV. Of Entering into the Hall of Double Maati'],
  ['chap-125-negative-confession', v2, 5644, 5924, 'Chapter CXXV. The Negative Confession'],
  ['chap-125-address-to-the-gods', v2, 5924, 6190, 'Chapter CXXV. Address to the Gods of the Underworld'],
  ['chap-137a-four-torches', v2, 7474, 7759, 'Chapter CXXXVIIA. Of the Four Blazing Flames'],
  ['chap-147-seven-arits', v2, 9813, 10073, 'Chapter CXLVII. Of the Seven Arits'],
  ['chap-148-seven-cows', v2, 10073, 10286, 'Chapter CXLVIII. Of Providing the Deceased'],
  ['chap-175-not-dying-twice', v3, 3201, 3360, 'Chapter CLXXV. Of Not Dying a Second Time'],
  ['appendix-hymn-to-amen-ra', v3, 4913, 5327, 'Appendix. The Book of the Dead of Nesi-Khonsu: Hymn to Amen-Ra'],
];

const HEADER_RES = [
  /\[Ch[a-z.,]*\s*[a-z0-9., ]*\]/i, // [Chap. exxv. ...] or [Ch. ...
  /^\s*Ch[ao]p?s?[,.]/i, // starts with Chap, / Ch, / Cahp,
  /^\s*Ch[,.]?\s*[a-z]+\./i, // "Ch, exxxvii.a.15]"
  /^\s*\d{1,3}\s+[A-Z][A-Z '&,-]{4,}\s*(\[.*)?\s*$/, // "356 OF ENTERING INTO JUDGMENT  [Chap..."
  /^[A-Z][A-Z '&,-]{7,}\s+\d{1,3}\s*$/, // "HYMN AND LITANY TO OSIRIS 67"
  /^\s*Soy!\s*$/,
];

function isHeader(line) {
  const t = line.trim();
  if (!t) return false;
  return HEADER_RES.some((re) => re.test(t));
}

const FOOTNOTEISH = /(i\.e\.|op\. cit|Brit\. Mus|Todtenbuch|Naville|Lepsius|cf\.|p\. \d|Bd\.|Recension|adds|omits|reads)/;

function startsFootnoteBlock(firstLine, block, { strict = false } = {}) {
  const t = firstLine.trim();
  if (/^Text/i.test(t)) return false;
  // any line starting with a bare footnote number (no period) => footnote block
  for (const l of block) {
    const x = l.trim();
    if (/^[\s'"‘’,.;|]*\d{1,2}\s+\S/.test(x) && !/^[\s'"‘’,.;|]*\d{1,2}[.,]/.test(x)) return true;
  }
  // first line begins with punct+capital and the block is reference-like
  if (!strict && /^[\s'"‘’,.;|]*[A-Z(]/.test(t) && FOOTNOTEISH.test(block.join(' '))) return true;
  return false;
}

function isGarbageLine(t, { lenient = false } = {}) {
  if (!lenient && t.length <= 14) {
    const letters = (t.match(/[A-Za-z]/g) || []).length;
    if (letters / t.length < 0.6) return true;
    if (t.split(/\s+/).length <= 2 && !/[a-z]{3,}/.test(t)) return true;
  }
  const weird = (t.match(/[^\w\s.,;:'"‘’“”()[\]?!&%$£§|~°—–-]/g) || []).length;
  return weird > 2;
}

function cleanBlock(rawLines) {
  // 1) remove page-header lines and footnote blocks that sit directly above them
  const lines = rawLines.slice();
  const headerIdx = [];
  for (let i = 0; i < lines.length; i++) if (isHeader(lines[i])) headerIdx.push(i);
  const drop = new Set(headerIdx);
  for (const h of headerIdx) {
    // walk up over blank lines AND tiny garbage lines (stray OCR glyphs)
    let j = h - 1;
    let first = true;
    for (let guard = 0; guard < 4 && j >= 0; guard++) {
      while (j >= 0 && (lines[j].trim() === '' || isGarbageLine(lines[j].trim()))) j--;
      const blockEnd = j;
      while (j >= 0 && lines[j].trim() !== '' && !isGarbageLine(lines[j].trim())) j--;
      const blockStart = j + 1;
      if (blockStart > blockEnd) break;
      const block = lines.slice(blockStart, blockEnd + 1);
      if (!startsFootnoteBlock(block[0], block, { strict: !first })) break;
      for (let k = blockStart; k <= blockEnd; k++) drop.add(k);
      first = false;
    }
  }
  let kept = lines.filter((_, i) => !drop.has(i));

  // 2) drop hieroglyphic-garbage lines (strict before the Text: marker, lenient inside the translation)
  const firstText = kept.findIndex((l) => /^\s*Text\s*[:;]/i.test(l));
  kept = kept.filter((l, i) => {
    const t = l.trim();
    if (!t) return true;
    return !isGarbageLine(t, { lenient: firstText >= 0 && i >= firstText });
  });

  // 3) drop everything before the first "Text:" marker (vignette, provenance, editorial)
  const textIdx = kept.findIndex((l) => /^\s*Text\s*[:;]/i.test(l));
  if (textIdx > 0) kept = kept.slice(textIdx);

  // 4) join lines into a flow, marking verse breaks; repair hyphenation
  const chunks = [];
  let cur = '';
  const push = () => {
    const t = cur.trim();
    if (t) chunks.push(t);
    cur = '';
  };
  for (const raw of kept) {
    let t = raw.trim();
    if (!t) continue;
    t = t.replace(/^Text\s*[:;]\s*/i, ' '); // drop Text: marker itself
    // verse break: line starts with "N." or "N," then quote/capital
    const vb = t.match(/^\s*(\d{1,2})[.,]\s+(?=["'‘“`(A-Z])/);
    if (vb) push();
    // strip leading quotation marks (typographic per-verse-line quotes)
    t = t.replace(/^["'‘“”`]+\s*/, '');
    if (cur && /-$/.test(cur)) {
      cur = cur.slice(0, -1) + t; // hyphen join
    } else {
      cur = cur ? `${cur} ${t}` : t;
    }
  }
  push();

  // 5) split at inline verse numbers (n)
  const verses = [];
  for (const c of chunks) {
    const parts = c.split(/\s*\(\d{1,3}\)\s*/);
    for (const p of parts) {
      const t = p.trim();
      if (t) verses.push(t);
    }
  }

  // 6) per-verse cleanup
  const paras = verses
    .map((t) => {
      t = t.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
      t = t.replace(/``/g, '"').replace(/''/g, '"');
      t = t.replace(/\bT\.\s*e\.,/g, 'i.e.,').replace(/\b7\.e\./g, 'i.e.').replace(/\bce\.,/g, 'i.e.,');
      t = t.replace(/\((0r|07)\s/g, '(or ');
      t = t.replace(/\s+/g, ' ').trim();
      t = t.replace(/^["']+/, '').replace(/["']+$/, '');
      // drop leading colon-dash " :— "
      t = t.replace(/^[ :;—-]+/, '').trim();
      return t;
    })
    .filter((t) => t.length > 1 && !/^[\W_]+$/.test(t));

  return paras.join('\n\n');
}

for (const [id, vol, s, e, title] of SECTIONS) {
  const raw = vol.slice(s - 1, e - 1);
  const text = cleanBlock(raw);
  fs.writeFileSync(path.join(OUT, `${id}.txt`), `TITLE: ${title}\n\n${text}\n`);
  console.log(id.padEnd(34), String(text.length).padStart(6), 'chars');
}
console.log('done ->', OUT);
