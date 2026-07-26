#!/usr/bin/env node
'use strict';
/**
 * Build platform/texts/book-of-the-dead/{eng.json,xref.json} from the
 * hand-reviewed section drafts in tools/texts-extract/out/botd-final/.
 * Also runs xref attestation checks (capitalized whole-word) before writing.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const DRAFTS = path.join(ROOT, 'tools', 'texts-extract', 'out', 'botd-final');
const OUTDIR = path.join(ROOT, 'platform', 'texts', 'book-of-the-dead');

const ORDER = [
  'chap-01-coming-forth-by-day',
  'chap-06-shabti',
  'chap-15-hymn-to-ra',
  'chap-15-litany-to-osiris',
  'chap-15-hymn-to-ra-setting',
  'chap-15-mystery-of-the-tuat',
  'chap-17-coming-forth',
  'chap-18-hymns-to-thoth',
  'chap-19-chaplet-of-victory',
  'chap-22-giving-a-mouth',
  'chap-23-opening-the-mouth',
  'chap-26-giving-a-heart',
  'chap-27-heart-not-taken',
  'chap-29b-heart-of-carnelian',
  'chap-30b-heart-not-carried-off',
  'chap-42-driving-back-slaughter',
  'chap-64-single-chapter',
  'chap-72-opening-a-way',
  'chap-83-bennu-bird',
  'chap-89-soul-united-to-body',
  'chap-110-field-of-offerings',
  'chap-125-hall-of-double-maati',
  'chap-125-negative-confession',
  'chap-125-address-to-the-gods',
  'chap-137a-four-torches',
  'chap-147-seven-arits',
  'chap-148-seven-cows',
  'chap-175-not-dying-twice',
  'appendix-hymn-to-amen-ra',
];

const XREF = [
  { temple: 'ra', forms: ['Ra'] },
  { temple: 'thoth', forms: ['Thoth'] },
  { temple: 'horus', forms: ['Horus'] },
  { temple: 'isis', forms: ['Isis'] },
  { temple: 'anubis', forms: ['Anubis', 'Anpu'] },
  { temple: 'maat', forms: ['Maat'] },
  { temple: 'shu', forms: ['Shu'] },
  { temple: 'ptah', forms: ['Ptah'] },
  { temple: 'ka', forms: ['Ka'] },
  { temple: 'ba', forms: ['Ba'] },
  { temple: 'amun', forms: ['Amen', 'Amen-Ra'] },
  { temple: 'apep', forms: ['Apep'] },
  { temple: 'steh', forms: ['Set', 'Sut', 'Suti'] },
  { temple: 'sekhmet', forms: ['Sekhet'] },
  { temple: 'bastet', forms: ['Bast'] },
  { temple: 'wadjet', forms: ['Uatchet', 'Uatchit'] },
  { temple: 'ankh', forms: ['Ankh'] },
  { temple: 'seshat', forms: ['Seshet'] },
  { temple: 'hp', forms: ['Hapi'] },
  { temple: 'sia', forms: ['Sa'] },
  { temple: 'heka', forms: ['Heka'] },
  { temple: 'maa', forms: ['Maa'] },
  { temple: 'ab', forms: ['Ab'] },
  { temple: 'akh', forms: ['Akh'] },
  { temple: 'ma', forms: ['Ma'] },
  { temple: 'nht', forms: ['Nakht'] },
];

function wholeWord(text, form) {
  const esc = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{M}])${esc}(?![\\p{L}\\p{M}])`, 'u').test(text);
}

const sections = [];
for (const id of ORDER) {
  const raw = fs.readFileSync(path.join(DRAFTS, `${id}.txt`), 'utf8');
  const lines = raw.split('\n');
  if (!lines[0].startsWith('TITLE: ')) throw new Error(`${id}: missing TITLE line`);
  const title = lines[0].slice(7).trim();
  let text = lines.slice(1).join('\n');
  // consistency: Budge prints "saith :—"
  text = text.replace(/saith:—/g, 'saith :—');
  // collapse 3+ newlines
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  if (/Project Gutenberg/i.test(text)) throw new Error(`${id}: PG boilerplate`);
  if (/<[a-z][\s\S]*>/i.test(text)) throw new Error(`${id}: HTML`);
  sections.push({ id, title, text });
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

const corpus = { lang: 'eng', sections };
const xref = { version: 1, links };
fs.writeFileSync(path.join(OUTDIR, 'eng.json'), `${JSON.stringify(corpus, null, 2)}\n`);
fs.writeFileSync(path.join(OUTDIR, 'xref.json'), `${JSON.stringify(xref, null, 2)}\n`);

const words = corpusText.split(/\s+/).length;
console.log(`sections: ${sections.length}, words: ~${words}`);
console.log(`xref temples kept: ${links.length}`);
for (const l of links) console.log('  ', l.temple.padEnd(9), l.forms.join(', '));
console.log('dropped (unattested forms/temples):');
for (const d of dropped) console.log('  ', d.temple.padEnd(9), d.forms.join(', '));
