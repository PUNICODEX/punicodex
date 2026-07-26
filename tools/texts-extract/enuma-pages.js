#!/usr/bin/env node
'use strict';
/**
 * Coordinate-aware djvu.xml parser for King vol 1.
 * Reconstructs each page's lines by y-clustering WORDs (merging the
 * left-margin verse-number column back into its text line), classifies
 * pages as English-translation vs transliteration, drops running headers
 * and footnote zones, emits per-page dumps to out/enuma-pages/.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const XML = path.join(ROOT, 'platform', 'texts', 'enuma-elish', 'src', 'king-vol1-djvu.xml');
const OUT = path.join(__dirname, 'out', 'enuma-pages');
fs.mkdirSync(OUT, { recursive: true });

const xml = fs.readFileSync(XML, 'utf8');
const pageRe = /<OBJECT\b[\s\S]*?<\/OBJECT>/g;
const pages = [];
let m;
while ((m = pageRe.exec(xml))) pages.push(m[0]);

function unescape(t) {
  return t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function pageWords(pageXml) {
  const words = [];
  const wRe = /<WORD\b[^>]*coords="(\d+),(\d+),(\d+),(\d+)"[^>]*>([\s\S]*?)<\/WORD>/g;
  let wm;
  while ((wm = wRe.exec(pageXml))) {
    words.push({ x: +wm[1], y: +wm[2], x2: +wm[3], y2: +wm[4], t: unescape(wm[5]) });
  }
  return words;
}

function reconstructLines(words) {
  // djvu.xml here uses top-left origin: smaller y = higher on the page.
  // cluster by word vertical centre; tolerance well under one line height.
  const ws = words
    .map((w) => ({ ...w, cy: (w.y + w.y2) / 2 }))
    .sort((a, b) => a.cy - b.cy || a.x - b.x);
  const lines = [];
  let cur = [];
  let curY = null;
  for (const w of ws) {
    if (curY === null || Math.abs(w.cy - curY) <= 18) {
      cur.push(w);
      curY = curY === null ? w.cy : cur.reduce((s, c) => s + c.cy, 0) / cur.length;
    } else {
      lines.push(cur.sort((a, b) => a.x - b.x).map((w2) => w2.t).join(' '));
      cur = [w];
      curY = w.cy;
    }
  }
  if (cur.length) lines.push(cur.sort((a, b) => a.x - b.x).map((w2) => w2.t).join(' '));
  return lines;
}

function isEnglishText(t) {
  const words = (t.toLowerCase().match(/[a-z]+/g) || []);
  if (!words.length) return false;
  const stops = ['the', 'of', 'and', 'his', 'their', 'who', 'thou', 'thy', 'to', 'in', 'he', 'she', 'they', 'him', 'her', 'with', 'shall', 'was', 'were', 'had', 'hath', 'unto', 'let', 'made', 'when', 'then', 'said', 'spake', 'gods', 'god', 'heaven', 'earth'];
  const hits = words.filter((w) => stops.includes(w)).length;
  const intraHyphens = (t.match(/[a-z]-[a-z]/g) || []).length;
  return hits / words.length > 0.12 && intraHyphens / words.length < 0.3;
}

const FOOTNOTEISH = /(No\. |Nos\. |K\. \d|Restored|Conjectural|cf\.|reads|omits|i\.e\.|I\.e\.|variant|commentary|Jensen|see p\.|sign is|rendering of|For this|Glossary|word is)/;

const out = [];
for (let pi = 0; pi < pages.length; pi++) {
  const words = pageWords(pages[pi]);
  if (!words.length) continue;
  const lines = reconstructLines(words);
  const bodyAll = lines.join('\n');
  // classify by the numbered body lines (verse region), not the footnotes
  const numbered = lines.filter((l) => /^\s*\d{1,3}[.,]\s+\S/.test(l)).join('\n');
  let translit;
  if (numbered.split('\n').length >= 3) {
    translit = !isEnglishText(numbered);
  } else {
    translit = /CREATION\s+SERIES/i.test(bodyAll) || (!isEnglishText(bodyAll) && pi > 100);
  }
  out.push({ index: pi, lines, translit });
}

const dump = out
  .map((p) => `### PAGE ${p.index} ${p.translit ? '[TRANSLIT]' : '[ENGLISH]'}\n${p.lines.join('\n')}`)
  .join('\n\n');
fs.writeFileSync(path.join(OUT, 'all-pages.txt'), dump);
const stats = out.filter((p) => !p.translit).length;
console.log('pages:', out.length, 'english:', stats, '->', path.join(OUT, 'all-pages.txt'));

// ---- verse stream per tablet ----
const HEADERISH = (t) => {
  const caps = (t.match(/[A-Z]/g) || []).length;
  const letters = (t.match(/[A-Za-z]/g) || []).length;
  if (/^\d{1,3}$/.test(t.trim())) return true;
  if (letters && caps / letters > 0.75 && t.length < 70) return true;
  if (/^(The |Cirst|Gourth|Gifth|Sirth|Second|Third|Fourth|Fifth|Sixth|Seventh|She |TaBEet|Tabet|Tablet)/i.test(t.trim()) && t.length < 60) return true;
  if (/^(I|II|III|IV|V|VI|VII)\.?$/.test(t.trim())) return true;
  if (/^Creation\.?$/i.test(t.trim())) return true;
  if (/^The Seven Tablets/i.test(t.trim())) return true;
  return false;
};

function pageBody(p) {
  const ls = p.lines.slice();
  let start = 0;
  for (let i = 0; i < Math.min(4, ls.length); i++) {
    if (HEADERISH(ls[i])) start = i + 1;
    else break;
  }
  const body = [];
  let inFoot = false;
  for (let i = start; i < ls.length; i++) {
    const t = ls[i].trim();
    const footStart = /^[\s'"‘’,.;|*(\]®#]*\d{0,2}\s*[A-Z("'i]/.test(t) && FOOTNOTEISH.test(t) && !/^\s*\d{1,3}[.,]\s/.test(t);
    if (footStart) inFoot = true;
    if (!inFoot) body.push(ls[i]);
  }
  return body;
}

const eng = out.filter((p) => !p.translit && p.index >= 117);
const stream = [];
for (const p of eng) {
  for (const l of pageBody(p)) stream.push({ page: p.index, line: l });
}

// join into verses; detect tablet boundary on verse-number reset
const verses = [];
let cur = null;
for (const { page, line } of stream) {
  const t = line.trim();
  const m = t.match(/^(\d{1,3})[.,]\s+(.*)$/);
  if (m && /[A-Za-z]/.test(m[2])) {
    if (cur) verses.push(cur);
    cur = { num: parseInt(m[1], 10), text: m[2], page };
  } else if (cur) {
    cur.text += /-$/.test(cur.text) ? t : ` ${t}`;
  }
}
if (cur) verses.push(cur);

const tablets = [];
let tcur = [];
let prev = 0;
for (const v of verses) {
  if (v.num <= prev - 50 || (v.num === 1 && prev > 20)) {
    tablets.push(tcur);
    tcur = [];
  }
  tcur.push(v);
  prev = v.num;
}
tablets.push(tcur);

tablets.forEach((tv, i) => {
  const nums = tv.map((v) => v.num);
  const missing = [];
  for (let n = 1; n <= Math.max(...nums); n++) if (!nums.includes(n)) missing.push(n);
  const text = tv.map((v) => `${v.num}. ${v.text}`).join('\n\n');
  fs.writeFileSync(
    path.join(OUT, `tablet-${i + 1}.txt`),
    `VERSES: ${tv.length}  MISSING: ${missing.join(',') || 'none'}\n\n${text}\n`
  );
  console.log(`tablet-${i + 1}:`, tv.length, 'verses, missing:', missing.length > 15 ? `${missing.length}` : missing.join(',') || 'none');
});

