#!/usr/bin/env node
'use strict';
/**
 * Build platform/texts/poetic-edda/eng.json from the raw Project Gutenberg
 * download of Bellows' 1923 Poetic Edda translation (PG #73533).
 *
 * Source: https://www.gutenberg.org/cache/epub/73533/pg73533.txt
 *         (saved at platform/texts/poetic-edda/src/eng-raw.txt)
 *
 * Scope decisions (per the pack brief):
 *   - one section per poem (35 poems);
 *   - the General Introduction, per-poem INTRODUCTORY NOTEs, per-poem
 *     NOTE/NOTES sections and the Pronouncing Index are translator apparatus
 *     and are stripped;
 *   - manuscript prose (introductory prose and interludes) belongs to the
 *     poems and is kept;
 *   - verse keeps stanza numbers and line breaks; the PG caesura marker
 *     "   |   " is normalised to a single space; spaced-dot lacuna lines
 *     collapse to a single ellipsis character.
 *
 * Usage: node tools/build-poetic-edda-corpus.js [--write]
 *   Without --write, prints diagnostics only.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'platform', 'texts', 'poetic-edda');
const RAW = path.join(DIR, 'src', 'eng-raw.txt');

// The 35 poems in order, exactly as their heading lines appear in the file.
const POEMS = [
  'VOLUSPO',
  'HOVAMOL',
  'VAFTHRUTHNISMOL',
  'GRIMNISMOL',
  'SKIRNISMOL',
  'HARBARTHSLJOTH',
  'HYMISKVITHA',
  'LOKASENNA',
  'THRYMSKVITHA',
  'ALVISSMOL',
  'BALDRS DRAUMAR',
  'RIGSTHULA',
  'HYNDLULJOTH',
  'SVIPDAGSMOL',
  'VÖLUNDARKVITHA',
  'HELGAKVITHA HJORVARTHSSONAR',
  'HELGAKVITHA HUNDINGSBANA I',
  'HELGAKVITHA HUNDINGSBANA II',
  'FRA DAUTHA SINFJOTLA',
  'GRIPISSPO',
  'REGINSMOL',
  'FAFNISMOL',
  'SIGRDRIFUMOL',
  'BROT AF SIGURTHARKVITHU',
  'GUTHRUNARKVITHA I',
  'SIGURTHARKVITHA EN SKAMMA',
  'HELREITH BRYNHILDAR',
  'DRAP NIFLUNGA',
  'GUTHRUNARKVITHA II, EN FORNA',
  'GUTHRUNARKVITHA III',
  'ODDRUNARGRATR',
  'ATLAKVITHA EN GRÖNLENZKA',
  'ATLAMOL EN GRÖNLENZKU',
  'GUTHRUNARHVOT',
  'HAMTHESMOL',
];

const LOWER_WORDS = new Set(['af', 'en', 'i', 'or', 'of', 'the', 'and', 'in', 'a']);
const ROMAN = new Set(['I', 'II', 'III']);

function titleCase(s) {
  return s
    .split(' ')
    .map((w, i) => {
      const bare = w.replace(/[^A-Za-zÀ-ž’']/g, '');
      if (ROMAN.has(bare)) return bare + w.slice(bare.length).toLowerCase();
      if (i > 0 && LOWER_WORDS.has(bare.toLowerCase())) return w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

function slugify(heading) {
  let s = heading
    .toLowerCase()
    .replace(/ö/g, 'o')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  // roman numerals become arabic ordinals (trailing or followed by more text)
  s = s.replace(/-iii(?=-|$)/, '-3').replace(/-ii(?=-|$)/, '-2').replace(/-i(?=-|$)/, '-1');
  return s;
}

function main() {
  const write = process.argv.includes('--write');
  let raw = fs.readFileSync(RAW, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strip PG boilerplate: keep only what lies between the *** START/END lines.
  const startIdx = raw.search(/^\*\*\* START OF/m);
  const endIdx = raw.search(/^\*\*\* END OF/m);
  if (startIdx < 0 || endIdx < 0) throw new Error('PG START/END markers not found');
  raw = raw.slice(raw.indexOf('\n', startIdx) + 1, endIdx);

  const lines = raw.split('\n');

  // Locate each poem heading (exact trimmed line match, in order).
  const heads = [];
  let cursor = 0;
  for (const name of POEMS) {
    let found = -1;
    for (let i = cursor; i < lines.length; i++) {
      if (lines[i].trim() === name) {
        found = i;
        break;
      }
    }
    if (found < 0) throw new Error(`heading not found: ${name}`);
    heads.push({ name, line: found });
    cursor = found + 1;
  }

  const sections = [];
  const report = [];
  for (let p = 0; p < heads.length; p++) {
    const { name, line: hLine } = heads[p];
    const regionEnd = p + 1 < heads.length ? heads[p + 1].line : lines.length;

    // Subtitle: non-blank lines between heading and INTRODUCTORY NOTE.
    let introLine = -1;
    for (let i = hLine + 1; i < regionEnd; i++) {
      if (lines[i].trim() === 'INTRODUCTORY NOTE') {
        introLine = i;
        break;
      }
    }
    if (introLine < 0) throw new Error(`no INTRODUCTORY NOTE for ${name}`);
    const subtitle = lines
      .slice(hLine + 1, introLine)
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' ');

    // Poem body ends at the NOTE/NOTES heading (every poem has one).
    let notesLine = -1;
    for (let i = introLine + 1; i < regionEnd; i++) {
      const t = lines[i].trim();
      if (t === 'NOTE' || t === 'NOTES') {
        notesLine = i;
        break;
      }
    }
    if (notesLine < 0) throw new Error(`no NOTE(S) section for ${name}`);

    // Body-start rule. For stanza poems: after the LAST run of >=3 blank
    // lines before stanza 1 (the wide gap separating apparatus from text;
    // introductory notes may contain an internal 3-blank gap, but never
    // after the final wide one). For prose-only poems (Fra Dautha
    // Sinfjotla, Drap Niflunga): after the FIRST >=3-blank run following
    // the introductory note.
    let s1 = -1;
    for (let i = introLine + 1; i < notesLine; i++) {
      if (/^1\.\s\s/.test(lines[i])) {
        s1 = i;
        break;
      }
    }
    let bodyStart = -1;
    if (s1 > 0) {
      for (let i = introLine + 1; i < s1; i++) {
        if (lines[i].trim() !== '') continue;
        let j = i;
        while (j < s1 && lines[j].trim() === '') j++;
        if (j - i >= 3) bodyStart = j;
        i = j - 1;
      }
    } else {
      for (let i = introLine + 1; i < notesLine; i++) {
        if (lines[i].trim() !== '') continue;
        let j = i;
        while (j < notesLine && lines[j].trim() === '') j++;
        if (j - i >= 3) {
          bodyStart = j;
          break;
        }
        i = j - 1;
      }
    }
    if (bodyStart < 0 || bodyStart >= notesLine) {
      throw new Error(`body start not found for ${name}`);
    }

    const body = lines.slice(bodyStart, notesLine);

    // Split into blocks on blank runs; classify verse vs prose.
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

    const parts = [];
    const stanzaNums = [];
    let orphanVerse = 0;
    const normVerseLine = (l) => {
      let t = l.replace(/\s*\|\s*/g, ' ').replace(/\s+/g, ' ').trim();
      if (/^[.\s]+$/.test(t)) t = '…';
      if (/^[* ]+$/.test(t)) t = '* * *';
      return t;
    };
    for (const b of blocks) {
      if (/^\d+\.\s/.test(b[0])) {
        // verse stanza
        const num = parseInt(b[0].match(/^(\d+)\./)[1], 10);
        stanzaNums.push(num);
        parts.push(b.map(normVerseLine).join('\n'));
      } else if (/^\s{2,}/.test(b[0])) {
        // unnumbered verse (dialogue answers, lacuna separators)
        orphanVerse++;
        parts.push(b.map(normVerseLine).join('\n'));
      } else {
        // prose paragraph: unwrap
        const t = b
          .map((l) => l.trim())
          .join(' ')
          .replace(/\s+/g, ' ');
        parts.push(t);
      }
    }

    const text = parts.join('\n\n');
    if (text.trim().length < 40) throw new Error(`${name}: body too short (${text.length})`);
    if (/INTRODUCTORY NOTE|Project Gutenberg/i.test(text)) {
      throw new Error(`${name}: apparatus leaked into body`);
    }

    const id = slugify(name);
    const title = subtitle ? `${titleCase(name)} — ${titleCase(subtitle)}` : titleCase(name);
    sections.push({ id, title, text });
    report.push({
      name,
      id,
      subtitle,
      blocks: blocks.length,
      stanzas: stanzaNums.length,
      firstStanza: stanzaNums[0] || null,
      lastStanza: stanzaNums[stanzaNums.length - 1] || null,
      stanzaGaps: stanzaNums.filter((n, i) => i > 0 && n !== stanzaNums[i - 1] + 1).length,
      orphanVerse,
      bodyStartLine: bodyStart + 1,
      firstBodyLine: lines[bodyStart].trim().slice(0, 70),
      chars: text.length,
    });
  }

  for (const r of report) {
    console.log(
      `${r.id.padEnd(30)} blocks=${String(r.blocks).padStart(3)} stanzas=${String(r.stanzas).padStart(3)} [${r.firstStanza}..${r.lastStanza}] gaps=${r.stanzaGaps} orphan=${r.orphanVerse} chars=${r.chars}`
    );
    console.log(`    title: ${r.subtitle ? `${titleCase(r.name)} — ${titleCase(r.subtitle)}` : titleCase(r.name)}`);
    console.log(`    body@${r.bodyStartLine}: ${r.firstBodyLine}`);
  }

  const corpus = { lang: 'eng', sections };
  if (write) {
    const out = `${JSON.stringify(corpus, null, 2)}\n`;
    fs.writeFileSync(path.join(DIR, 'eng.json'), out);
    console.log(`\nwrote ${path.join(DIR, 'eng.json')} (${sections.length} sections)`);
  } else {
    console.log('\n(dry run — pass --write to emit eng.json)');
  }
}

main();
