#!/usr/bin/env node
'use strict';
/**
 * One-off: build platform/texts/volsunga-saga/eng.json from the Project
 * Gutenberg #1152 transcription of William Morris & Eiríkr Magnússon,
 * "The Story of the Volsungs" (Walter Scott Press, 1888; first published
 * 1870). Source saved to platform/texts/volsunga-saga/src/eng-raw.txt.
 *
 * Splits the saga proper (chapters I–XLIII) from the transcription,
 * preserving Morris's prose verbatim: prose paragraphs re-wrapped with
 * spaces, verse blocks kept line-by-line, per-chapter ENDNOTES retained.
 * The introduction and the Poetic Edda appendix are kept in the raw file
 * but are not corpus sections.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const RAW = path.join(ROOT, 'platform', 'texts', 'volsunga-saga', 'src', 'eng-raw.txt');
const OUT = path.join(ROOT, 'platform', 'texts', 'volsunga-saga', 'eng.json');

const ROMAN = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
  XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16, XVII: 17, XVIII: 18,
  XIX: 19, XX: 20, XXI: 21, XXII: 22, XXIII: 23, XXIV: 24, XXV: 25, XXVI: 26,
  XXVII: 27, XXVIII: 28, XXIX: 29, XXX: 30, XXXI: 31, XXXII: 32, XXXIII: 33,
  XXXIV: 34, XXXV: 35, XXXVI: 36, XXXVII: 37, XXXVIII: 38, XXXIX: 39, XL: 40,
  XLI: 41, XLII: 42, XLIII: 43,
};

function main() {
  const raw = fs.readFileSync(RAW, 'utf8').replace(/\r\n/g, '\n');
  const start = raw.indexOf('THE STORY OF THE VOLSUNGS AND NIBLUNGS.');
  const end = raw.indexOf('APPENDIX: EXCERPTS FROM THE POETIC EDDA.');
  if (start === -1 || end === -1 || end <= start) throw new Error('saga bounds not found');
  const saga = raw.slice(start, end);
  const lines = saga.split('\n');

  // Locate chapter headings; a heading wraps onto a continuation line when
  // it does not end with '.' or a footnote marker like "(1)".
  const heads = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^CHAPTER ([IVXLCDM]+)\.\s+(.*)$/);
    if (!m) continue;
    let title = m[2].trim();
    let last = i;
    while (!/[.)]$/.test(title) && last + 1 < lines.length && lines[last + 1].trim() !== '') {
      last++;
      title += ` ${lines[last].trim()}`;
    }
    heads.push({ line: i, lastLine: last, numeral: m[1], title });
  }
  if (heads.length !== 43) throw new Error(`expected 43 chapters, found ${heads.length}`);

  // Turn one paragraph block (blank-line separated) into corpus text:
  // indented blocks are verse (lines kept), flush blocks are prose (joined).
  const renderBlock = (block) => {
    const bl = block.filter((l) => l.trim() !== '');
    const verse = bl.every((l) => /^ {2,}/.test(l));
    if (verse) return bl.map((l) => l.trim()).join('\n');
    return bl.map((l) => l.trim()).join(' ');
  };

  const sections = [];
  for (let c = 0; c < heads.length; c++) {
    const h = heads[c];
    const n = ROMAN[h.numeral];
    if (!n || n !== c + 1) throw new Error(`chapter order broken at ${h.numeral}`);
    const stop = c + 1 < heads.length ? heads[c + 1].line : lines.length;
    const body = lines.slice(h.lastLine + 1, stop);

    // Split into blank-line-separated blocks, then render. The ENDNOTES
    // marker becomes a plain "Endnotes:" lead paragraph of its own.
    const blocks = [];
    let cur = [];
    for (const l of body) {
      if (l.trim() === '') {
        if (cur.length) blocks.push(cur);
        cur = [];
      } else {
        cur.push(l);
      }
    }
    if (cur.length) blocks.push(cur);

    const paras = [];
    for (const b of blocks) {
      if (b[0].trim() === 'ENDNOTES:') {
        // The marker line shares its block with the notes; split each note
        // (a line starting "(n)") into its own paragraph, continuations
        // re-wrapped.
        paras.push('Endnotes:');
        let note = [];
        for (const l of b.slice(1)) {
          if (/^\s*\(\d+\)/.test(l) && note.length) {
            paras.push(note.map((x) => x.trim()).join(' '));
            note = [];
          }
          note.push(l);
        }
        if (note.length) paras.push(note.map((x) => x.trim()).join(' '));
        continue;
      }
      paras.push(renderBlock(b));
    }

    // Footnote marker in the heading (chapter XXII) is not part of the title.
    // Chapter XXXI's heading carries a Gutenberg transcription duplication
    // ("told told"); the printed edition reads "as it is told in ancient
    // Songs" — normalized here in the display title only (raw file verbatim).
    const cleanTitle = h.title
      .replace(/\s+\(\d+\)$/, '')
      .replace('as it is told told in ancient Songs', 'as it is told in ancient Songs');
    sections.push({
      id: `ch-${String(n).padStart(2, '0')}`,
      title: `Chapter ${h.numeral}: ${cleanTitle}`,
      text: paras.join('\n\n'),
    });
  }

  const corpus = { lang: 'eng', sections };
  fs.writeFileSync(OUT, `${JSON.stringify(corpus, null, 2)}\n`);
  console.log(`wrote ${OUT}: ${sections.length} sections`);
  for (const s of sections) console.log(`  ${s.id}  ${s.title}  (${s.text.length} chars)`);
}

main();
