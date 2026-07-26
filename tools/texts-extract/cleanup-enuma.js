#!/usr/bin/env node
'use strict';
/**
 * Enuma Elish cleanup — stage A: re-split verses whose text absorbed
 * following verses (split at the embedded tolerant number tokens);
 * stage B: mechanical OCR cleanup (furniture, footnote markers, common
 * OCR confusions). Output: out/enuma-final/tablet-N.txt for hand review.
 */
const fs = require('node:fs');
const path = require('node:path');

const IN = path.join(__dirname, 'out', 'enuma-pdf');
const OUT = path.join(__dirname, 'out', 'enuma-final');
fs.mkdirSync(OUT, { recursive: true });

const EXPECTED = [142, 165, 138, 146, 142, 150, 142];
const TITLES = ['The First Tablet', 'The Second Tablet', 'The Third Tablet', 'The Fourth Tablet', 'The Fifth Tablet', 'The Sixth Tablet', 'The Seventh Tablet'];

function numVariants(n) {
  // tolerant patterns for a verse number token
  const cls = (d) => (d === '1' ? '[1Iil|]' : d === '2' ? '[2z]' : d === '5' ? '[5js]' : d === '6' ? '[6b]' : d === '9' ? '[9g]' : d === '0' ? '[0o]' : d);
  const d = String(n).split('');
  const pats = [d.map(cls).join('\\s?[.,;)]*\\s?')];
  if (d.length === 2) pats.push(`${cls(d[0])}\\s${cls(d[1])}`);
  return `(?:${pats.join('|')})`;
}

const HEADER_WORDS = /^(THE|APSU|ANSAR|EA|MARDUK|KINGU|TIAMAT|BATTLE|GAGA|NANNARI|DRAGON|CREATION|NINIB|ISHTAR|MUMMU|LAHMU|ANSHAR|LUGAL|ASARI)/;

function cleanVerse(t) {
  let x = t;
  // strip page running headers (caps words + page number) inside the verse
  x = x.replace(/(?:^|\s)[A-Z0-9][A-Z0-9 '~.,&()€£$§-]{6,60}\s*[0-9Ils]{1,3}\s*(?=[A-Z"‘’“”(\[]|$)/g, ' ');
  // inline footnote markers: lowercase-l + digit or bare digit fused to a word
  x = x.replace(/([a-z\]\),.;])l\d{1,2}(?=\s|$)/g, '$1'); // begettersl5, go]l3
  x = x.replace(/\s[Il]\d{1,2}(?=\s|$)/g, ''); // standalone l3
  x = x.replace(/([a-z]{2,})[1-9](?=\s|$)/g, '$1'); // roared4, Nibir3
  x = x.replace(/([\]\)])b\d(?=\s|$)/g, '$1'); // ]b4
  x = x.replace(/\s[I1][S5](?=[?.,\s]|$)/g, ''); // fn 15 as IS
  x = x.replace(/\s[lI]a(?=\s|:|$)/g, ''); // fn 2 as la
  x = x.replace(/\s&(?=\s|$)/g, ''); // stray &
  x = x.replace(/\^+/g, ''); // caret fn markers
  x = x.replace(/(\s)\.\[/g, '$1['); // .[ -> [
  x = x.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  x = x.replace(/''/g, '"');
  // OCR confusions with high certainty
  x = x.replace(/\bH e\b/g, 'He').replace(/\bS o\b/g, 'So').replace(/\bh i l l\b/g, 'will');
  x = x.replace(/\b0 (?=[A-Z])/g, 'O ');
  x = x.replace(/\bT\[(?=[a-z])/g, '[T');
  x = x.replace(/\bApsu\b|\bApsfi\b|\bApsti\b|\bApsii\b|\bApsi\b|\bApst\b/g, 'Apsû');
  x = x.replace(/\bAnSar\b|\bAnsar\b/g, 'Anshar');
  x = x.replace(/\bKiSar\b|\bKisar\b/g, 'Kishar');
  x = x.replace(/\blinoweth\b/g, 'knoweth');
  x = x.replace(/\bIndisorder\b/g, 'In disorder');
  x = x.replace(/\bMarduli\b/g, 'Marduk');
  x = x.replace(/\bthelr\b/g, 'their');
  x = x.replace(/\bTI1E\b/g, 'THE');
  x = x.replace(/([a-z])- (?=[a-z])/g, '$1'); // con- fusion -> confusion
  x = x.replace(/\s{2,}/g, ' ').trim();
  x = x.replace(/^[.,;:'"‘’“”|]*\s*/, '').replace(/^[I1]\.\s*/, '');
  return x;
}

for (let ti = 0; ti < 7; ti++) {
  const file = path.join(IN, `tablet-${ti + 1}.txt`);
  const raw = fs.readFileSync(file, 'utf8');
  const bodyStart = raw.indexOf('\n\n');
  const verseBlocks = raw.slice(bodyStart + 2).split('\n\n').filter(Boolean);
  const verses = new Map();
  for (const b of verseBlocks) {
    const m = b.match(/^(\d+)\.\s([\s\S]*)$/);
    if (m) verses.set(parseInt(m[1], 10), m[2].trim());
  }
  const expected = EXPECTED[ti];

  // stage A: re-split chunks that absorbed neighbouring verses. A chunk
  // may embed tokens for earlier or later verses (10-14 in a "14" chunk,
  // 52 in a "51" chunk) — split at every tolerant token in sequence.
  const nums = [...verses.keys()].sort((a, b) => a - b);
  const reSplit = new Map();
  let prevNum = 0;
  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    const nextN = i + 1 < nums.length ? nums[i + 1] : expected + 1;
    const text = verses.get(n);
    const found = [];
    for (let v = prevNum + 1; v < nextN; v++) {
      const re = new RegExp(`(?:^|[\\s,;."('])(${numVariants(v)})(?=[.,;)]*\\s*(?:["'‘’“”()[\\]]\\s*)*(?:[A-Z0O]|\\[\\s*\\.))`, 'g');
      const m = re.exec(text);
      if (m) {
        found.push({ v, idx: m.index, end: m.index + m[0].length });
      }
    }
    found.sort((a, b) => a.idx - b.idx);
    if (!found.length) {
      reSplit.set(n, text);
      prevNum = n;
      continue;
    }
    const prefix = text.slice(0, found[0].idx).trim();
    if (found[0].v !== n && prefix.length > 0) reSplit.set(n, prefix);
    for (let k = 0; k < found.length; k++) {
      const f = found[k];
      const nextF = found[k + 1];
      reSplit.set(f.v, text.slice(f.end, nextF ? nextF.idx : undefined).trim());
    }
    prevNum = found[found.length - 1].v;
  }
  verses.clear();
  for (const [k, v] of reSplit) verses.set(k, v);

  // stage B: clean
  const outNums = [...verses.keys()].sort((a, b) => a - b);
  const out = [];
  const finalMissing = [];
  for (let n = 1; n <= expected; n++) {
    if (verses.has(n)) {
      const c = cleanVerse(verses.get(n));
      if (c.length >= 3) out.push(`${n}. ${c}`);
      else finalMissing.push(n);
    } else {
      finalMissing.push(n);
    }
  }
  fs.writeFileSync(
    path.join(OUT, `tablet-${ti + 1}.txt`),
    `TITLE: ${TITLES[ti]}\nVERSES: ${out.length}/${expected}  MISSING: ${finalMissing.join(',') || 'none'}\n\n${out.join('\n\n')}\n`
  );
  console.log(`tablet-${ti + 1}: ${out.length}/${expected}`, 'missing:', finalMissing.length > 20 ? `${finalMissing.length}` : finalMissing.join(',') || 'none');
}
console.log('done ->', OUT);
