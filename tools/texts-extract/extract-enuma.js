#!/usr/bin/env node
'use strict';
/**
 * King vol 1 (Enuma Elish) extractor v6 — pdftext only.
 * 1. Concatenate the tablet's \f pages; cut transliteration spans
 *    (CREATION SERIES header -> next English running header).
 * 2. Walk verse numbers in strict sequence from a known incipit; a number
 *    token counts as a verse boundary only when followed by a capital,
 *    quote, or bracket (footnote digits are followed by lowercase).
 * 3. Tolerant token shapes: 22. / 2 2. / I I. / lo. / IS. / 1.'
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'platform', 'texts', 'enuma-elish', 'src', 'king-vol1-pdftext.txt');
const OUT = path.join(__dirname, 'out', 'enuma-pdf');
fs.mkdirSync(OUT, { recursive: true });

const raw = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
const pages = raw.split('\f');

const TABLETS = [
  ['tablet-1', 'The First Tablet', 117, 137, 142, /When in the height heaven was not named/i],
  ['tablet-2', 'The Second Tablet', 137, 153, 165, /Tiamat made weighty/i],
  ['tablet-3', 'The Third Tablet', 153, 173, 138, /opened his mouth/i],
  ['tablet-4', 'The Fourth Tablet', 173, 193, 146, /lordly chamber/i],
  ['tablet-5', 'The Fifth Tablet', 193, 201, 142, /stations for the great gods/i],
  ['tablet-6', 'The Sixth Tablet', 201, 207, 150, /heard the word of the gods/i],
  ['tablet-7', 'The Seventh Tablet', 207, 236, 142, /Asari/i],
];

function isSpacedLetters(line) {
  const singles = (line.match(/\b\w\b/g) || []).length;
  const words = (line.match(/\w+/g) || []).length;
  if (words < 4) return false;
  const totalLen = (line.match(/\w+/g) || []).join('').length;
  return singles / words > 0.5 && totalLen / words < 2.2;
}

const TRANSLIT_MARK = /C\s*[RK]?\s*E\s*A\s*T\s*I\s*O\s*N\s+S\s*[E€]\s*[RK]/i;
// English running header: caps words (allowing OCR noise) + trailing page number
const ENG_HEADER = /(?:T\s*H\s*E|A\s*N\s*S\s*A\s*R|E\s*A|M\s*A\s*[RK]\s*D\s*U\s*K|K\s*I\s*N\s*G\s*U|T\s*I\s*A\s*M\s*A\s*T|B\s*A\s*T\s*T\s*L\s*E|G\s*A\s*G\s*A|A\s*P\s*S\s*U|L\s*A\s*H\s*M\s*U|E\s*N\s*U\s*M\s*A|C\s*R\s*E\s*A\s*T\s*I\s*O\s*N\s+O\s*F|N\s*A\s*N\s*N\s*A\s*[RK]I|D\s*R\s*A\s*G\s*O\s*N)[A-Z ~.,&'()$€£-]{0,60}\s*[0-9Ils]{1,3}(?=\s|$)/;

const FOOT_SIGNAL = /(rendering|restoration|Jensen|cf\.|No\.\s|Nos\.\s|traces|suggests|probable|possible|sign is|prefers|commentary|Glossary|variant|determinative)/i;

for (const [id, title, ps, pe, expected, incipit] of TABLETS) {
  // pdftext pagination: odd \f pages = English translation, even = transliteration
  let text = '';
  for (let pi = ps; pi < pe; pi++) {
    if (pi % 2 === 0) continue;
    const lines = pages[pi]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !isSpacedLetters(l));
    // cut the footnote zone: first footnote-signal line that carries no
    // verse-number candidate, and everything after it
    let cut = lines.length;
    for (let i = 0; i < lines.length; i++) {
      if (FOOT_SIGNAL.test(lines[i]) && !/^\s*\d{1,3}[.,]/.test(lines[i])) {
        cut = i;
        break;
      }
    }
    text += ` ${lines.slice(0, cut).join(' ')}`;
  }
  text = text.replace(/\s+/g, ' ');
  const cleaned = text;

  // anchor verse 1 at the incipit
  const im = incipit.exec(cleaned);
  if (!im) {
    console.log(id, 'INCIPIT NOT FOUND');
    continue;
  }
  const start = Math.max(0, im.index - 12);

  // candidate tokens: spaced pairs ("2 1.") and single runs, followed by a
  // capital/quote/bracket; pairs must carry trailing punctuation.
  const LOOK = "(?=[.,;)]*\\s+(?:(?:[\"'‘’“”()[\\]]\\s*)*(?:[A-Z0O]|\\[\\s*\\.)))";
  const pairRe = new RegExp(`([\\dIilozgjbs]\\s[\\dIilozgjbs])(?=[.,;)]+\\s*(?:(?:["'‘’“”()[\\]]\\s*)*(?:[A-Z0O]|\\[\\s*\\.)))`, 'g');
  const singleRe = new RegExp(`([\\dIilozgjbs]{1,3})${LOOK}`, 'g');
  const norm = (s) =>
    s
      .replace(/\s/g, '')
      .replace(/o/g, '0')
      .replace(/[Iil]/g, '1')
      .replace(/z/g, '2')
      .replace(/[js]/g, '5')
      .replace(/b/g, '6')
      .replace(/g/g, '9');
  const cands = [];
  let cm;
  const pairs = [];
  while ((cm = pairRe.exec(cleaned))) {
    const prevCh = cm.index > 0 ? cleaned[cm.index - 1] : ' ';
    if (/[.\]]/.test(prevCh)) {
      // marker+verse shape (".3 3."): keep only the SECOND digit as a single
      const d2 = cm[1].split(/\s/)[1];
      const t2 = norm(d2);
      if (/^\d+$/.test(t2)) {
        const n2 = parseInt(t2, 10);
        const idx2 = cm.index + cm[1].length - d2.length;
        if (n2 >= 1 && n2 <= expected) cands.push({ idx: idx2, end: idx2 + d2.length, n: n2 });
      }
      continue;
    }
    const t = norm(cm[1]);
    if (!/^\d+$/.test(t)) continue;
    const n = parseInt(t, 10);
    if (n >= 1 && n <= expected) pairs.push({ idx: cm.index, end: cm.index + cm[1].length, n });
  }
  while ((cm = singleRe.exec(cleaned))) {
    const t = norm(cm[1]);
    if (!/^\d+$/.test(t)) continue;
    const n = parseInt(t, 10);
    if (n < 1 || n > expected) continue;
    if (pairs.some((p) => cm.index >= p.idx && cm.index < p.end)) continue; // pair wins
    const prevCh = cm.index > 0 ? cleaned[cm.index - 1] : ' ';
    if (/\d/.test(prevCh)) {
      // ".3 3." = footnote marker + verse number: allow the second digit
      const beforeMarker = cm.index > 1 ? cleaned[cm.index - 2] : ' ';
      if (!/[.,\]]/.test(beforeMarker)) continue; // embedded in a longer number
    } else if (!/^[\s,;.(\[{"'‘’“”\]]$/.test(prevCh)) {
      continue; // must start a token
    }
    cands.push({ idx: cm.index, end: cm.index + cm[1].length, n });
  }
  cands.push(...pairs);
  cands.sort((a, b) => a.idx - b.idx);
  // dedupe same position/value (single + pair-split overlaps)
  for (let i = cands.length - 1; i > 0; i--) {
    if (cands[i].n === cands[i - 1].n && Math.abs(cands[i].idx - cands[i - 1].idx) < 4) cands.splice(i, 1);
  }
  if (process.env.DBG === id) {
    for (const c of cands.slice(0, 40)) console.error('cand', c.n, '@', c.idx, JSON.stringify(cleaned.slice(c.idx, c.idx + 20)));
  }

  const verses = [];
  const missing = [];
  let last = 1;
  let lastEnd = start;
  verses.push({ num: 1, text: '' });
  let ci = cands.findIndex((c) => c.idx >= start);
  for (; ci >= 0 && ci < cands.length && last < expected; ci++) {
    const c = cands[ci];
    if (c.n === last + 1) {
      verses[verses.length - 1].text = cleaned.slice(lastEnd, c.idx).trim();
      verses.push({ num: c.n, text: '' });
      last = c.n;
      lastEnd = c.end;
    } else if (c.n > last + 1 && c.n <= last + 6) {
      verses[verses.length - 1].text = cleaned.slice(lastEnd, c.idx).trim();
      for (let k = last + 1; k < c.n; k++) missing.push(k);
      verses.push({ num: c.n, text: '' });
      last = c.n;
      lastEnd = c.end;
    } else if (c.n > last + 6) {
      // stall: no near candidate — accept a far jump (King's lacuna
      // regions like "[Lines 68-82 are wanting.]"), marking the gap.
      const gapText = cleaned.slice(lastEnd, c.idx);
      const lacuna = /wanting|lacuna|broken|lost/i.test(gapText);
      if ((lacuna && c.n <= expected) || (!lacuna && c.n <= last + 40 && gapText.length < 2500)) {
        verses[verses.length - 1].text = cleaned.slice(lastEnd, c.idx).trim();
        for (let k = last + 1; k < c.n; k++) missing.push(k);
        verses.push({ num: c.n, text: '' });
        last = c.n;
        lastEnd = c.end;
      }
    }
  }
  verses[verses.length - 1].text = cleaned.slice(lastEnd).trim();

  const body = verses.map((v) => `${v.num}. ${v.text}`).join('\n\n');
  fs.writeFileSync(path.join(OUT, `${id}.txt`), `TITLE: ${title}\nVERSES: ${verses.length}/${expected}  MISSING: ${missing.join(',') || 'none'}\n\n${body}\n`);
  console.log(id, `${verses.length}/${expected}`, 'missing:', missing.length > 20 ? `${missing.length}` : missing.join(',') || 'none');
}
console.log('done ->', OUT);
