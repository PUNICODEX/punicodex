#!/usr/bin/env node
'use strict';
/**
 * Extract R. Campbell Thompson, "The Epic of Gilgamish" (1928), from the
 * archive.org PDF text layer (much cleaner than the djvu OCR — checked).
 * One section per tablet (I-XII). Output: out/gilg-final/tablet-N.txt.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'platform', 'texts', 'gilgamesh', 'src', 'thompson-1928-pdftext.txt');
const OUT = path.join(__dirname, 'out', 'gilg-final');
fs.mkdirSync(OUT, { recursive: true });

const raw = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
const lines = raw.split('\n');

const TABLETS = [
  ['tablet-01', 'The First Tablet', 73, 356],
  ['tablet-02', 'The Second Tablet', 356, 503],
  ['tablet-03', 'The Third Tablet', 503, 753],
  ['tablet-04', 'The Fourth Tablet', 753, 885],
  ['tablet-05', 'The Fifth Tablet', 885, 1036],
  ['tablet-06', 'The Sixth Tablet', 1036, 1199],
  ['tablet-07', 'The Seventh Tablet', 1199, 1361],
  ['tablet-08', 'The Eighth Tablet', 1361, 1431],
  ['tablet-09', 'The Ninth Tablet', 1431, 1512],
  ['tablet-10', 'The Tenth Tablet', 1512, 1720],
  ['tablet-11', 'The Eleventh Tablet', 1720, 1971],
  ['tablet-12', 'The Twelfth Tablet', 1971, 2031],
];

const PAGE_FURNITURE = /^(THE )?EPIC OF GILGAMISH\s*\.?\s*$|^\d{1,3}\s*\.?\s*$|^[A-Z]\s*\.?\s*$/;
const NOTES_START = /^(NOTES|Notgs|Note)\b/i;

function cleanLine(t) {
  let x = t;
  // U+FFFD: apostrophe between letters, footnote marker before digits, else drop
  x = x.replace(/\s*�\d+/g, ''); // footnote markers like �2--
  x = x.replace(/(\w)�(\w)/g, "$1'$2"); // chastis�d -> chastis'd
  x = x.replace(/�/g, ''); // drop the rest
  // footnote digits fused at word end: "Architect's2 dwelling" -> "Architect's dwelling"
  x = x.replace(/(\w)\.\s?\d{1,2}\s*(?=["']?\d*\s|$)/g, '$1.');
  x = x.replace(/(\w)(\d{1,2})(?=\s|$)/g, '$1');
  x = x.replace(/(\w)\s\d{1,2}(?=\s|$)/g, '$1');
  // Thompson's line numbers mid-line: "things, 5. He" -> "things, He"
  // Thompson's line numbers mid-line ("30 .", "5.") and at line end
  x = x.replace(/\s\d{1,3}\s*\.\s+(?=[A-Z"('])/g, ' ');
  x = x.replace(/\s\d{1,3}\s*\.$/g, '');
  // pdftext spacing artifacts
  x = x.replace(/\s+([,.;:!?])/g, '$1');
  x = x.replace(/([("])\s+/g, '$1');
  // quotes: fuse after opening ' (before a letter), keep space after closing '
  x = x.replace(/(\s)' (?=\S)/g, "$1'");
  x = x.replace(/(\S)' (?=\s|$)/g, "$1' ");
  x = x.replace(/"{2,}/g, '"');
  x = x.replace(/^1(?=\()/g, ''); // line-number "1" fused to paren
  x = x.replace(/\(\s*\?\s*\)/g, '(?)');
  x = x.replace(/\s*NOTES\s*\.?\s*[-–—].*$/i, ''); // footnote block glued mid-line
  x = x.replace(/^\d{1,2}(?=[A-Z][a-z])/g, ''); // line-start footnote digit
  x = x.replace(/(\w)\.{1,2}\d+(?=\s|$)/g, '$1'); // have..2 -> have..
  x = x.replace(/\s\d{1,2}(?=\s)/g, ' '); // standalone footnote digits
  x = x.replace(/\bGilgam ish\b/g, 'Gilgamish');
  x = x.replace(/(\w) -(\w)/g, '$1-$2');
  x = x.replace(/\s{2,}/g, ' ').trim();
  return x;
}

for (const [id, title, s, e] of TABLETS) {
  const slice = lines.slice(s, e);
  const out = [];
  let skipNotes = false;
  for (let line of slice) {
    const t = line.trim();
    if (!t) {
      skipNotes = false;
      continue;
    }
    if (PAGE_FURNITURE.test(t)) continue;
    if (NOTES_START.test(t)) {
      skipNotes = true;
      continue;
    }
    if (skipNotes) continue;
    // footnote-ish lines: start with a small digit then lowercase/reference words
    if (/^\d{1,2}[A-Z(]/.test(t) && /(Assyrian|Babylonian|Version|restored|reading|cf\.|Lit\.|Tablet|papyrus)/.test(t)) continue;
    // short footnote fragments left between verses
    if (t.length < 75 && /(mutilated|Old Babylonian Version|Assyrian Version|conjectural)/i.test(t)) continue;
    // line-number markers: "5.", "10.", "15." (+ OCR "l 5 ." variants)
    let y = t.replace(/^[\dl]{1,2}\s*\.\s+/, '');
    if (/^[\dl]{1,2}\s*\.$/.test(y)) continue; // bare line-number line
    // tablet heading variants -> keep as the section title instead
    if (/^THE (FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH) TABLET/i.test(y)) continue;
    // running column-ish titles in caps (e.g. "OF THE TYRANNY...") -> drop heading lines
    if (/^OF THE |^THE (FLOOD|EXPEDITION|ARRIVAL|MEETING|MOURNING|DEATH|CREATION)/.test(y) && y.length < 90 && !/[a-z]{4,}/.test(y.slice(0, 20))) continue;
    y = cleanLine(y);
    if (y.length < 2) continue;
    // drop long bibliographic/editorial parentheticals (Thompson's
    // version-notes); keep short scene headings and "(About N lines ...)"
    if (/^\([\s\S]*\)[.:]?$/.test(y) && y.length > 150 && !/^\(About\b/i.test(y) && /(Version|Edition|Assyrian|Babylonian|Hittite|fragment|tablet|Nineveh|Kuyunjik|Berlin|Pennsylvania|Yale|text|Column)/i.test(y)) {
      continue;
    }
    // long editorial prose (multi-line version notes, interpolations)
    if (y.length > 150 && /(Version|interpolation|interpolate)/i.test(y)) continue;
    out.push(y);
  }
  // paragraphs: each verse line a paragraph, Column headings too
  const text = out.join('\n\n');
  fs.writeFileSync(path.join(OUT, `${id}.txt`), `TITLE: ${title}\n\n${text}\n`);
  console.log(id.padEnd(10), out.length, 'lines,', text.length, 'chars');
}
console.log('done ->', OUT);
