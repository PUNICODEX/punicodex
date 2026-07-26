#!/usr/bin/env node
'use strict';
/**
 * Build platform/texts/enuma-elish/{eng.json,xref.json} from the reviewed
 * tablet drafts in tools/texts-extract/out/enuma-final/.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const DRAFTS = path.join(ROOT, 'tools', 'texts-extract', 'out', 'enuma-final');
const OUTDIR = path.join(ROOT, 'platform', 'texts', 'enuma-elish');

const ORDER = ['tablet-1', 'tablet-2', 'tablet-3', 'tablet-4', 'tablet-5', 'tablet-6', 'tablet-7'];
const TITLES = {
  'tablet-1': 'The First Tablet',
  'tablet-2': 'The Second Tablet',
  'tablet-3': 'The Third Tablet',
  'tablet-4': 'The Fourth Tablet',
  'tablet-5': 'The Fifth Tablet',
  'tablet-6': 'The Sixth Tablet',
  'tablet-7': 'The Seventh Tablet',
};

const XREF = [
  { temple: 'tiamat', forms: ['Tiamat'] },
  { temple: 'apsu', forms: ['Apsû'] },
  { temple: 'anu', forms: ['Anu'] },
  { temple: 'ea', forms: ['Ea'] },
  { temple: 'enlil', forms: ['Bêl'] },
];

function wholeWord(text, form) {
  const esc = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{M}])${esc}(?![\\p{L}\\p{M}])`, 'u').test(text);
}

const sections = [];
const missingReport = {};
for (const id of ORDER) {
  const raw = fs.readFileSync(path.join(DRAFTS, `${id}.txt`), 'utf8');
  const lines = raw.split('\n');
  const missLine = lines.find((l) => l.startsWith('VERSES:'));
  missingReport[id] = missLine ? missLine.replace(/^VERSES: \d+\/\d+\s+MISSING: /, '') : '';
  const bodyStart = raw.indexOf('\n\n');
  let text = raw.slice(bodyStart + 2).trim();
  text = text.replace(/\n{3,}/g, '\n\n');
  if (text.length < 40) throw new Error(`${id}: too short`);
  if (/Project Gutenberg/i.test(text)) throw new Error(`${id}: PG boilerplate`);
  if (/<[a-z][\s\S]*>/i.test(text)) throw new Error(`${id}: HTML`);
  sections.push({ id, title: TITLES[id], text });
}

const corpusText = sections.map((s) => s.text).join('\n');
const links = [];
for (const link of XREF) {
  const ok = link.forms.filter((f) => wholeWord(corpusText, f));
  if (ok.length) links.push({ temple: link.temple, forms: ok });
}

fs.writeFileSync(path.join(OUTDIR, 'eng.json'), `${JSON.stringify({ lang: 'eng', sections }, null, 2)}\n`);
fs.writeFileSync(path.join(OUTDIR, 'xref.json'), `${JSON.stringify({ version: 1, links }, null, 2)}\n`);

console.log(`sections: ${sections.length}, words: ~${corpusText.split(/\s+/).length}`);
for (const l of links) console.log('  ', l.temple.padEnd(8), l.forms.join(', '));
for (const id of ORDER) console.log('  missing', id, ':', missingReport[id].slice(0, 150));
