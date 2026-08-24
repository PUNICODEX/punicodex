#!/usr/bin/env node
/**
 * One-off: fix CamelCase/slug display forms in the lexicon.
 *
 *   - erymanthianboar  → Erymánthios Kápros    (Greek restoration)
 *   - stymphalianbirds → Stymphalídes Órnithes (Greek restoration)
 *   - zmeygorynych     → Zmey Gorynych         (space, no camel)
 *   - sunwukong        → Sūn Wùkōng            (pinyin surname/given space)
 *   - zhangdaoling     → Zhāng Dàolíng         (pinyin space)
 *   - makemake         → Makemake              (one word, no camel)
 *   - babayaga         → Baba Jagá             (space)
 *   - diancecht        → Dían Cécht            (space)
 *   - mamaquilla       → Mama Quilla           (space)
 *   - matzemlya        → Mat' Zemlyá           (soft sign + space)
 *   - gronwpebr        → Gronw Pebr            (space)
 */
const fs = require('node:fs');
const path = require('node:path');

const LEX = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');

const S = (chars) => chars.map(([char, to, note]) => ({ char, to, note }));

const FIXES = [
  {
    id: 'erymanthianboar', unicode: 'Erymánthios Kápros',
    ops: S([
      ['e', 'E'], ['r', 'r'], ['y', 'y'], ['m', 'm'],
      ['a', 'á', 'Acute on alpha (Ἐρυμάνθιος)'], ['n', 'n'], ['t', 't'], ['h', 'h'],
      ['i', 'i'], ['a', 'o', 'Omicron'], ['n', 's', 'Final sigma'],
      ['b', 'K', 'Kappa'], ['o', 'á', 'Acute on alpha (Κάπρος)'],
      ['a', 'p', 'Pi'], ['r', 'ros', 'Rho + omicron + sigma'],
    ]),
    variant: { unicode: 'Erymanthian Boar', type: 'ascii', note: 'Standard English name (Fourth Labour)' },
  },
  {
    id: 'stymphalianbirds', unicode: 'Stymphalídes Órnithes',
    ops: S([
      ['s', 'S'], ['t', 't'], ['y', 'y'], ['m', 'm'], ['p', 'p'], ['h', 'h'],
      ['a', 'a'], ['l', 'l'], ['i', 'í', 'Acute on iota (Στυμφαλίδες)'],
      ['a', 'd', 'Delta'], ['n', 'es', 'Epsilon + sigma'],
      ['b', 'Ó', 'Acute on omicron (Ὄρνιθες)'], ['i', 'r', 'Rho'], ['r', 'n', 'Nu'],
      ['d', 'i', 'Iota'], ['s', 'thes', 'Theta + epsilon + sigma'],
    ]),
    variant: { unicode: 'Stymphalian Birds', type: 'ascii', note: 'Standard English name (Sixth Labour)' },
  },
  { id: 'zmeygorynych', unicode: 'Zmey Gorynych' },
  { id: 'sunwukong', unicode: 'Sūn Wùkōng' },
  { id: 'zhangdaoling', unicode: 'Zhāng Dàolíng' },
  { id: 'makemake', unicode: 'Makemake', decamel: { 'm': 'm' } },
  { id: 'babayaga', unicode: 'Baba Jagá' },
  { id: 'diancecht', unicode: 'Dían Cécht' },
  { id: 'mamaquilla', unicode: 'Mama Quilla', decamel: { 'q': 'q' } },
  { id: 'matzemlya', unicode: "Mat' Zemlyá" },
  { id: 'gronwpebr', unicode: 'Gronw Pebr' },
];

function main() {
  const src = fs.readFileSync(LEX, 'utf8');
  const start = src.indexOf('const LEXICON =');
  const arrayStart = src.indexOf('[', start);
  const arrayEnd = src.indexOf('\n];', arrayStart);
  const header = src.slice(0, start);
  const footer = src.slice(arrayEnd + 2);
  const vm = require('node:vm');
  const sandbox = {};
  vm.runInNewContext(`result = ${src.slice(arrayStart, arrayEnd + 2)}`, sandbox);
  const entries = sandbox.result;

  for (const fix of FIXES) {
    const e = entries.find((x) => x.id === fix.id);
    if (!e) throw new Error(`entry not found: ${fix.id}`);
    const old = e.unicode;
    e.unicode = fix.unicode;
    if (fix.ops) {
      e.breakdown = fix.ops.map((op) => ({
        char: op.char,
        to: op.to,
        type: /[áéíóúḗṓâêîôûŷ]/.test(op.to) ? 'stress' : /[āēīōū]/.test(op.to) ? 'length' : op.to.length > 1 || op.to === '' || /[ḫšṣṭḏṛḥꜣꜥ]/.test(op.to) ? 'special' : 'same',
        note: op.note || 'Same',
      }));
      const joined = e.breakdown.map((b) => b.to).join('');
      if (joined.normalize('NFC') !== fix.unicode.replace(/ /g, '').normalize('NFC')) {
        throw new Error(`${fix.id}: rebuild mismatch ${joined} !== ${fix.unicode}`);
      }
    }
    if (fix.decamel && Array.isArray(e.breakdown)) {
      for (const [from, to] of Object.entries(fix.decamel)) {
        for (const b of e.breakdown) if (b.char === from) b.to = to;
      }
    }
    if (fix.variant) {
      e.variants = e.variants || [];
      if (!e.variants.some((v) => v.unicode === fix.variant.unicode)) e.variants.push(fix.variant);
      if (!e.variants.some((v) => v.unicode === old)) {
        e.variants.push({ unicode: old, type: 'alt', note: 'Earlier slug form (superseded)' });
      }
    }
    console.log(`${fix.id}: ${old} → ${fix.unicode}`);
  }

  fs.writeFileSync(LEX, `${header}const LEXICON = ${JSON.stringify(entries, null, 2)}${footer}`);
  console.log('\nDone.');
}

main();
