'use strict';
/**
 * Build platform/texts/sukhavativyuha/{eng.json,xref.json} from the
 * sacred-texts transcription of Müller/Cowell SBE 49 part II
 * (src/sbe49/sbe4924.htm = Larger, sbe4927.htm = Smaller).
 *
 * The transcription encodes the print's dotted/italic transliteration letters
 * as <I>x</I>. Print-verified mapping (Müller's notation):
 *   g/G -> j/J   k/K -> c/C   s/S -> ś/Ś   s + h -> ṣ (digraph "sh")
 *   t -> ṭ  th -> ṭh  d -> ḍ  n/N -> ṇ/Ṇ  nd -> ṇḍ  m -> ṃ  h -> ḥ  l -> ḷ
 *   ri -> ṛi  ris -> ṛś  ms -> ṃś  nn -> ṇṇ  kkh -> cch  tth -> ṭṭh
 *   gñ -> jñ  ñg -> ñj  ñk -> ñc
 * Footnote paragraphs (<P><SMALL>...) and inline [n] refs are dropped.
 */
const fs = require('node:fs');
const path = require('node:path');

const DIR = 'platform/texts/sukhavativyuha';

function unescapeEntities(s) {
  s = s.replace(/&amp;([a-zA-Z#0-9]+;)/g, '&$1');
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&acirc;/g, 'â')
    .replace(/&icirc;/g, 'î')
    .replace(/&ucirc;/g, 'û')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&Acirc;/g, 'Â')
    .replace(/&Icirc;/g, 'Î')
    .replace(/&Ucirc;/g, 'Û')
    .replace(/&Ntilde;/g, 'Ñ')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&agrave;/g, 'à')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&AElig;/g, 'Æ')
    .replace(/&aelig;/g, 'æ')
    .replace(/&sect;/g, '§')
    .replace(/&#39;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&[a-zA-Z#0-9]+;/g, '');
}

// Italic transliteration markers -> IAST. Longest tokens first.
function convertItalics(s) {
  const map = [
    [/g&ntilde;/g, 'jñ'],
    [/&ntilde;g/g, 'ñj'],
    [/&ntilde;k/g, 'ñc'],
    [/kkh/g, 'cch'],
    [/tth/g, 'ṭṭh'],
    [/ris/g, 'ṛś'],
    [/ms/g, 'ṃś'],
    [/th/g, 'ṭh'],
    [/nd/g, 'ṇḍ'],
    [/nn/g, 'ṇṇ'],
    [/ri/g, 'ṛi'],
    [/t/g, 'ṭ'],
    [/d/g, 'ḍ'],
    [/n/g, 'ṇ'],
    [/N/g, 'Ṇ'],
    [/m/g, 'ṃ'],
    [/h/g, 'ḥ'],
    [/l/g, 'ḷ'],
    [/g/g, 'j'],
    [/G/g, 'J'],
    [/k/g, 'c'],
    [/K/g, 'C'],
    [/S/g, 'Ś'],
  ];
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s.startsWith('<I>', i)) {
      const end = s.indexOf('</I>', i);
      if (end < 0) throw new Error('unclosed <I>');
      const tok = s.slice(i + 3, end);
      if (tok === 's') {
        // italic s: ṣ when the "sh" digraph follows, else ś
        if (s[end + 4] === 'h') {
          out += 'ṣ';
          i = end + 5; // consume the h
          continue;
        }
        out += 'ś';
        i = end + 4;
        continue;
      }
      let replaced = null;
      for (const [re, rep] of map) {
        const m = tok.match(re);
        if (m && m[0] === tok) {
          replaced = rep;
          break;
        }
      }
      if (replaced === null) replaced = tok; // genuine italics: keep letters plain
      out += replaced;
      i = end + 4;
    } else {
      out += s[i];
      i++;
    }
  }
  return out;
}

function extract(file) {
  let h = fs.readFileSync(file, 'utf8');
  h = h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const bodyStart = h.indexOf('<HR>');
  let body = bodyStart >= 0 ? h.slice(bodyStart + 4) : h;
  const navIdx = body.search(/<HR>\s*<CENTER>/);
  if (navIdx > 0) body = body.slice(0, navIdx);
  body = body.replace(/<H[1-6][^>]*>[\s\S]*?<\/H[1-6]>/gi, '');
  body = body.replace(/<A NAME="p\. [0-9]+">\{p\. [0-9]+\}<\/A>/g, '');
  body = body.replace(/<!-+[\s\S]*?-+>/g, '');

  const paras = [];
  let inFootnote = false;
  for (const m of body.matchAll(/<P\b[^>]*>([\s\S]*?)<\/P>/gi)) {
    let raw = m[1];
    const startsFootnote = /^\s*<SMALL>/.test(raw);
    if (startsFootnote) inFootnote = true;
    if (inFootnote) {
      if (/<\/SMALL>/.test(raw)) inFootnote = false;
      continue;
    }
    raw = raw.replace(/<\/?SMALL>/g, '');
    let t = convertItalics(raw);
    t = t.replace(/<BR\s*\/?>/gi, ' ');
    t = t.replace(/<[^>]+>/g, '');
    t = unescapeEntities(t);
    t = t.replace(/\[\d+\]/g, ''); // inline footnote refs
    t = t.replace(/\s+/g, ' ').trim();
    if (!t) continue;
    if (/^-{3,}$/.test(t)) continue;
    paras.push(t);
  }
  return paras;
}

// Rejoin paragraphs that were split at printed-page boundaries: a paragraph
// starting lowercase (or '(') continues the previous sentence.
function rejoin(paras) {
  const out = [];
  for (const p of paras) {
    if (out.length && /^[a-z(]/.test(p)) {
      out[out.length - 1] += ' ' + p;
    } else {
      out.push(p);
    }
  }
  return out;
}

const larger = rejoin(extract(path.join(DIR, 'src', 'sbe49', 'sbe4924.htm')));
const smaller = rejoin(extract(path.join(DIR, 'src', 'sbe49', 'sbe4927.htm')));

const corpus = {
  lang: 'eng',
  sections: [
    { id: 'larger-sukhavativyuha', title: 'The Larger Sukhavativyuha', text: larger.join('\n\n') },
    { id: 'smaller-sukhavativyuha', title: 'The Smaller Sukhavativyuha', text: smaller.join('\n\n') },
  ],
};
fs.writeFileSync(path.join(DIR, 'eng.json'), JSON.stringify(corpus, null, 2) + '\n');

const allText = corpus.sections.map((s) => s.text).join('\n');
const xref = {
  version: 1,
  links: [
    { temple: 'amitabha', forms: ['Amitâbha', 'Amitâyus'] },
    { temple: 'akshobhya', forms: ['Akshobhya'] },
  ],
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const l of xref.links) {
  for (const f of l.forms) {
    const n = (allText.match(new RegExp(esc(f), 'g')) || []).length;
    console.log(`form "${f}" (${l.temple}): ${n}`);
    if (!n) throw new Error(`form not attested: ${f}`);
  }
}
fs.writeFileSync(path.join(DIR, 'xref.json'), JSON.stringify(xref, null, 2) + '\n');

for (const s of corpus.sections) {
  console.log(
    `${s.id}: paras=${s.text.split('\n\n').length}, chars=${s.text.length}, words=~${s.text.split(/\s+/).length}`
  );
}
