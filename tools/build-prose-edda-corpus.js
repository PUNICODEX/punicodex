#!/usr/bin/env node
'use strict';
/**
 * Build platform/texts/prose-edda/eng.json from Arthur Gilchrist Brodeur's
 * 1916 translation of Snorri's Prose Edda.
 *
 * Source: Wikisource, scan-backed proofread transcription of the 1916
 * American-Scandinavian Foundation printing:
 *   https://en.wikisource.org/wiki/The_Prose_Edda_(1916_translation_by_Arthur_Gilchrist_Brodeur)/Gylfaginning
 *   https://en.wikisource.org/wiki/The_Prose_Edda_(1916_translation_by_Arthur_Gilchrist_Brodeur)/Skáldskaparmál
 * (Project Gutenberg does not host Brodeur; PG #18947 is Rasmus B.
 * Anderson's different 1879 translation and was rejected for this pack.
 * Brodeur's 1916 volume contains no Háttatal — see report.)
 *
 * Scope decisions (per the pack brief):
 *   - one section per numbered chapter: Gylfaginning I–LIV (54),
 *     Skáldskaparmál I–LXXIV (74);
 *   - the translator's Introduction, the Prologue, the Index, and all
 *     footnote apparatus are stripped;
 *   - quoted verse (dl/dd lines and div.poem blocks) keeps its line breaks;
 *     Wikisource caesura padding (double nbsp) collapses to one space.
 *
 * Usage: node tools/build-prose-edda-corpus.js [--write]
 */

const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'platform', 'texts', 'prose-edda');
const SRC = path.join(DIR, 'src');

const API = 'https://en.wikisource.org/w/api.php?action=parse&prop=text&format=json&disableeditsection=1&page=';
const PAGES = {
  gylfaginning:
    'The Prose Edda (1916 translation by Arthur Gilchrist Brodeur)/Gylfaginning',
  skaldskaparmal:
    'The Prose Edda (1916 translation by Arthur Gilchrist Brodeur)/Skáldskaparmál',
};
const ROMANS = {
  gylfaginning: 54, // I..LIV
  skaldskaparmal: 74, // I..LXXIV
};
const TITLE = { gylfaginning: 'Gylfaginning', skaldskaparmal: 'Skáldskaparmál' };

// Transcription typos in the Wikisource text, each verified against BOTH
// archive.org OCR scans of the 1916 printing (proseedda00snor and
// proseedda00brodgoog). Applied as literal replacements and count-checked.
const VERIFIED_FIXES = [
  ['the soils of a certain giant and, herself', 'the sons of a certain giant and herself'],
  ['Then said, Ægir:', 'Then said Ægir:'],
  ['thus should it he periphrased', 'thus should it be periphrased'],
];

function toRoman(n) {
  const T = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let s = '';
  for (const [v, r] of T) while (n >= v) { s += r; n -= v; }
  return s;
}

const ROMAN_VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
function fromRoman(s) {
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN_VALUES[s[i]];
    total += i + 1 < s.length && ROMAN_VALUES[s[i + 1]] > v ? -v : v;
  }
  return total;
}

function cleanText(t) {
  return t
    .replace(/​/g, '')
    .replace(/[ 	 ]+/g, ' ')
    .replace(/(?:\. ){2,}\./g, '…') // Brodeur's spaced-dot lacunae
    .trim();
}

/** Extract ordered blocks ({kind:'p'|'verse', text}) from rendered HTML. */
function extractBlocks(html) {
  const cut = html.indexOf('<span id="Footnotes">');
  if (cut >= 0) html = html.slice(0, cut);
  const $ = cheerio.load(html);
  $('style, script, link').remove();
  $('.wst-header, .ws-noexport, .noprint, .mw-editsection').remove();
  $('span.pagenum, sup.reference').remove();

  const out = $('.mw-parser-output');
  const root = out.length ? out : $.root();
  const blocks = [];
  root.find('p, dl, div.poem').each((_, el) => {
    const $el = $(el);
    if ($el.parents('dl, div.poem').length) return; // avoid nested double-count
    if ($el.is('div.poem') || $el.is('dl')) {
      let lines = [];
      if ($el.is('dl')) {
        // Direct dd children only; a dd may carry a nested dl holding the
        // indented second half-line (72 cases in Gylfaginning).
        $el.children('dd').each((_, dd) => {
          const $dd = $(dd);
          const own = $dd.clone();
          own.find('dl').remove();
          const ownText = cleanText(own.text());
          if (ownText) lines.push(ownText);
          $dd.children('dl').children('dd').each((_, inner) => {
            const t = cleanText($(inner).text());
            if (t) lines.push(t);
          });
        });
      } else {
        const inner = $el.find('p').length ? $el.find('p') : $el;
        inner.each((_, p) => {
          const h = $(p).html() || '';
          for (const frag of h.split(/<br\s*\/?>/i)) {
            lines.push(cleanText(cheerio.load(frag).text()));
          }
        });
      }
      lines = lines.filter(Boolean);
      if (lines.length) blocks.push({ kind: 'verse', text: lines.join('\n') });
    } else {
      const t = cleanText($el.text());
      if (t) blocks.push({ kind: 'p', text: t, bold: $el.find('b').first().text().trim() });
    }
  });
  return blocks;
}

function buildPart(partKey, html) {
  const blocks = extractBlocks(html);
  const want = ROMANS[partKey];

  // Drop everything before chapter I (part title pages, incipit headings).
  const firstChapter = blocks.findIndex(
    (b) => b.kind === 'p' && /^I\.\s/.test(b.text) && b.bold === 'I.'
  );
  if (firstChapter < 0) throw new Error(`${partKey}: chapter I not found`);
  const body = blocks.slice(firstChapter);

  const chapters = [];
  let cur = null;
  for (const b of body) {
    // Chapter marker: paragraph whose first bold is the roman numeral, with
    // an optional leading "[" (the 1916 printing brackets Skáldskaparmál XXI
    // as a suspected interpolation; the dangling bracket is dropped).
    const isMarker =
      b.kind === 'p' &&
      b.bold &&
      /^([IVXLCDM]+)\.$/.test(b.bold) &&
      (b.text.startsWith(`${b.bold} `) || b.text.startsWith(`[${b.bold} `));
    if (isMarker) {
      if (cur) chapters.push(cur);
      cur = { roman: b.bold.slice(0, -1), parts: [] };
    }
    if (!cur) throw new Error(`${partKey}: content before any chapter: ${b.text.slice(0, 60)}`);
    const t = b.text.replace(/^\[([IVXLCDM]+\.\s)/, '$1');
    cur.parts.push(t);
  }
  if (cur) chapters.push(cur);

  if (chapters.length !== want) {
    throw new Error(`${partKey}: expected ${want} chapters, got ${chapters.length}`);
  }
  chapters.forEach((c, i) => {
    const n = fromRoman(c.roman);
    if (n !== i + 1) throw new Error(`${partKey}: chapter order broken at ${c.roman} (want ${i + 1})`);
  });

  return chapters.map((c, i) => {
    let text = c.parts.join('\n\n');
    for (const [bad, good] of VERIFIED_FIXES) {
      if (text.includes(bad)) text = text.split(bad).join(good);
    }
    const num = String(i + 1).padStart(2, '0');
    return { id: `${partKey}-${num}`, title: `${TITLE[partKey]} ${c.roman}`, text };
  });
}

async function fetchHtml(page) {
  const url = API + encodeURIComponent(page);
  const res = await fetch(url, { headers: { 'user-agent': 'punycodex-corpus-builder/1.0 (research)' } });
  if (!res.ok) throw new Error(`fetch failed ${res.status} for ${page}`);
  const json = await res.json();
  if (!json.parse || !json.parse.text) throw new Error(`bad API payload for ${page}`);
  return json.parse.text['*'];
}

async function main() {
  const write = process.argv.includes('--write');
  fs.mkdirSync(SRC, { recursive: true });

  const sections = [];
  const rawDump = [];
  for (const key of Object.keys(PAGES)) {
    const html = await fetchHtml(PAGES[key]);
    rawDump.push(
      `===== ${TITLE[key]} =====\nsource: https://en.wikisource.org/wiki/${PAGES[key].replace(/ /g, '_')}\n`,
      extractBlocks(html)
        .map((b) => b.text)
        .join('\n\n')
    );
    const secs = buildPart(key, html);
    console.log(`${key}: ${secs.length} sections`);
    for (const s of secs) {
      const wc = s.text.split(/\s+/).length;
      console.log(`  ${s.id}  ${String(wc).padStart(5)} words  ${s.text.slice(0, 60).replace(/\n/g, ' / ')}`);
    }
    sections.push(...secs);
  }

  const corpus = { lang: 'eng', sections };
  if (write) {
    fs.writeFileSync(path.join(SRC, 'eng-raw.txt'), `${rawDump.join('\n\n')}\n`);
    fs.writeFileSync(path.join(DIR, 'eng.json'), `${JSON.stringify(corpus, null, 2)}\n`);
    console.log(`\nwrote eng.json (${sections.length} sections) and src/eng-raw.txt`);
  } else {
    console.log('\n(dry run — pass --write to emit eng.json)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
