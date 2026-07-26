#!/usr/bin/env node
'use strict';
/**
 * Build platform/texts/gilgamesh/{eng.json,xref.json} from the reviewed
 * tablet drafts in tools/texts-extract/out/gilg-final/.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const DRAFTS = path.join(ROOT, 'tools', 'texts-extract', 'out', 'gilg-final');
const OUTDIR = path.join(ROOT, 'platform', 'texts', 'gilgamesh');

const ORDER = [
  'tablet-01', 'tablet-02', 'tablet-03', 'tablet-04', 'tablet-05', 'tablet-06',
  'tablet-07', 'tablet-08', 'tablet-09', 'tablet-10', 'tablet-11', 'tablet-12',
];
const TITLES = {
  'tablet-01': 'The First Tablet',
  'tablet-02': 'The Second Tablet',
  'tablet-03': 'The Third Tablet',
  'tablet-04': 'The Fourth Tablet',
  'tablet-05': 'The Fifth Tablet',
  'tablet-06': 'The Sixth Tablet',
  'tablet-07': 'The Seventh Tablet',
  'tablet-08': 'The Eighth Tablet',
  'tablet-09': 'The Ninth Tablet',
  'tablet-10': 'The Tenth Tablet',
  'tablet-11': 'The Eleventh Tablet',
  'tablet-12': 'The Twelfth Tablet',
};

const XREF = [
  { temple: 'gilgamesh', forms: ['Gilgamish'] },
  { temple: 'ishtar', forms: ['Ishtar'] },
  { temple: 'shamash', forms: ['Shamash'] },
  { temple: 'ea', forms: ['Ea'] },
  { temple: 'enlil', forms: ['Enlil'] },
  { temple: 'anu', forms: ['Anu'] },
  { temple: 'apsu', forms: ['Apsu', 'Apsû'] },
  { temple: 'tiamat', forms: ['Tiamat'] },
  { temple: 'ashur', forms: ['Ashur'] },
];

function wholeWord(text, form) {
  const esc = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{M}])${esc}(?![\\p{L}\\p{M}])`, 'u').test(text);
}

const sections = [];
for (const id of ORDER) {
  const raw = fs.readFileSync(path.join(DRAFTS, `${id}.txt`), 'utf8');
  const body = raw.replace(/^TITLE:.*\n/, '').replace(/\n{3,}/g, '\n\n').trim();
  if (body.length < 40) throw new Error(`${id}: too short`);
  if (/Project Gutenberg/i.test(body)) throw new Error(`${id}: PG boilerplate`);
  if (/<[a-z][\s\S]*>/i.test(body)) throw new Error(`${id}: HTML`);
  sections.push({ id, title: TITLES[id], text: body });
}

const corpusText = sections.map((s) => s.text).join('\n');
const links = [];
const dropped = [];
for (const link of XREF) {
  const ok = link.forms.filter((f) => wholeWord(corpusText, f));
  if (ok.length === link.forms.length && ok.length > 0) links.push(link);
  else if (ok.length > 0) {
    links.push({ temple: link.temple, forms: ok });
    dropped.push({ temple: link.temple, forms: link.forms.filter((f) => !ok.includes(f)) });
  } else {
    dropped.push(link);
  }
}

fs.writeFileSync(path.join(OUTDIR, 'eng.json'), `${JSON.stringify({ lang: 'eng', sections }, null, 2)}\n`);
fs.writeFileSync(path.join(OUTDIR, 'xref.json'), `${JSON.stringify({ version: 1, links }, null, 2)}\n`);

console.log(`sections: ${sections.length}, words: ~${corpusText.split(/\s+/).length}`);
for (const l of links) console.log('  ', l.temple.padEnd(10), l.forms.join(', '));
console.log('dropped:');
for (const d of dropped) console.log('  ', d.temple.padEnd(10), d.forms.join(', '));
