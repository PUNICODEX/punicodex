'use strict';
// Build platform/texts/metamorphoses/eng.json from the Perseus TEI of
// Brookes More's 1922 Metamorphoses translation (src/eng-raw.xml).
const fs = require('node:fs');

const SRC = 'platform/texts/metamorphoses/src/eng-raw.xml';
const OUT = 'platform/texts/metamorphoses/eng.json';

const xml = fs.readFileSync(SRC, 'utf8');

function unescapeXml(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function cleanLine(s) {
  return unescapeXml(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];

// Locate the book divs in document order (Perseus quirk: book 3 uses subtype="BOOK").
const marks = [...xml.matchAll(/<div type="textpart" subtype="(?:book|BOOK)" n="(\d+)">/g)].map(
  (m) => ({ n: +m[1], i: m.index })
);
if (marks.length !== 15) throw new Error(`expected 15 books, found ${marks.length}`);

const sections = [];
for (let k = 0; k < marks.length; k++) {
  const { n, i } = marks[k];
  const end = k + 1 < marks.length ? marks[k + 1].i : xml.length;
  const body = xml.slice(i, end);

  // Walk in document order: para milestones break paragraphs, <l> adds a line.
  const paras = [];
  let cur = [];
  const tokens = body.matchAll(/<milestone ed="P" unit="para"\/>|<l n="\d+">([\s\S]*?)<\/l>/g);
  let lineCount = 0;
  for (const t of tokens) {
    if (t[1] === undefined) {
      // para milestone
      if (cur.length) {
        paras.push(cur);
        cur = [];
      }
    } else {
      const line = cleanLine(t[1]);
      if (!line) throw new Error(`book ${n}: empty line`);
      cur.push(line);
      lineCount++;
    }
  }
  if (cur.length) paras.push(cur);

  const text = paras.map((p) => p.join('\n')).join('\n\n');
  const words = text.split(/\s+/).length;
  console.log(`book ${String(n).padStart(2)}: ${lineCount} lines, ${paras.length} paragraphs, ${words} words`);
  sections.push({ id: `book-${n}`, title: `Book ${ROMAN[n - 1]}`, text });
}

const corpus = { lang: 'eng', sections };
fs.writeFileSync(OUT, `${JSON.stringify(corpus, null, 2)}\n`);
console.log(`\nwrote ${OUT}: ${sections.length} sections`);
