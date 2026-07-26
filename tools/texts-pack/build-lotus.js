'use strict';
/**
 * Build platform/texts/lotus-sutra/{eng.json,xref.json} from the sacred-texts
 * transcription of Kern's SBE 21 (src/lot/lot01..lot27.htm).
 * The transcription already omits Kern's introduction and footnotes; chapter
 * pages are plain <P> paragraphs with verse lines numbered by Kern.
 */
const fs = require('node:fs');
const path = require('node:path');

const DIR = 'platform/texts/lotus-sutra';
const ROMAN = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII',
];

function unescapeEntities(s) {
  // double-decoded artifacts first (&amp;acirc; -> &acirc;), then entities
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
    .replace(/&AElig;/g, 'Æ')
    .replace(/&aelig;/g, 'æ')
    .replace(/&#39;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&[a-zA-Z#0-9]+;/g, ''); // any leftover entity: drop marker, keep text
}

function extractChapter(file) {
  let h = fs.readFileSync(file, 'utf8');
  h = h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const bodyStart = h.indexOf('<HR>');
  if (bodyStart < 0) throw new Error(file + ': no leading <HR>');
  let body = h.slice(bodyStart + 4);
  // cut footer: last occurrence of <P><HR> or the <nav> block
  const navIdx = body.search(/<P>\s*<HR>/);
  if (navIdx > 0) body = body.slice(0, navIdx);
  const nav2 = body.search(/<nav[\s>]/i);
  if (nav2 > 0) body = body.slice(0, nav2);
  // drop all headings
  body = body.replace(/<H[1-6][^>]*>[\s\S]*?<\/H[1-6]>/gi, '');
  // split into paragraphs
  const paras = [];
  for (const m of body.matchAll(/<P\b[^>]*>([\s\S]*?)<\/P>/gi)) {
    let t = m[1];
    t = t.replace(/<BR\s*\/?>/gi, ' ');
    t = t.replace(/<[^>]+>/g, '');
    t = unescapeEntities(t);
    t = t.replace(/\s+/g, ' ').trim();
    if (!t) continue;
    if (/^-{3,}$/.test(t)) continue; // separator lines
    if (/^\*+$/.test(t)) continue;
    paras.push(t);
  }
  return paras;
}

// Transcription typos verified against the 1884 Clarendon print (archive.org
// scan saddharmapundar00camb): verse-initial "I" misread as digit 1, and
// "Bhadrika"+footnote-marker-1 misread as "Bhadrikal".
function fixTypos(text) {
  return text
    .replace(/(\d+)\. 1 (?=[a-z])/g, '$1. I ')
    .replace(/Bhadrikal\b/g, 'Bhadrika');
}

// The transcription inlines Kern's footnotes as square-bracketed spans at the
// marker position. These 17 are footnote apparatus (translator's commentary,
// not translation) and are stripped per the pack brief. Short bracketed
// glosses that are part of the translation flow ("Or, elements",
// "a thousand billions", "&c., as above till …", "as above") are kept.
const FOOTNOTE_SPAN_PREFIXES = [
  'In this chapter only four disciples',
  'The function of Avalokitesvara',
  'Vagrapâni is the name of one of the Dhyânibuddhas',
  'the Brâhman may be Brihaspati',
  'This term is ambiguous; it means both',
  'Ambiguous; the word denotes both',
  'These names may be translated',
  'Dhriti, perserverence, endurance',
  'Three kinds of mendicant friars',
  'i.e. magic display of creative power',
  'i.e. of a monk under training.',
  'i.e. a Yogin, a contemplative mystic.',
  'This agrees with the teaching of the Vedanta',
  'Hence follows that Nirvâna',
  'I.e. belonging to the mystic rite',
  'Dhâtuvigraha, the frame of the elementary parts',
  'After a last effort the storm subsides',
];
function stripInlineFootnotes(text) {
  for (const p of FOOTNOTE_SPAN_PREFIXES) {
    const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // " [span] ," / " [span] ;" -> "," / ";" (space before punct was the
    // transcriber's, not Kern's print style)
    text = text.replace(new RegExp(` ?\\[${esc}[^\\]]*\\]\\.? ?(?=[,;:])`, 'g'), '');
    // " [span]." — the trailing period belongs to the note when the span is
    // itself preceded by sentence-final punctuation ("course. [note]."), but
    // to the sentence otherwise ("Vagrapâni [note]. With…").
    text = text.replace(new RegExp(`(.) ?\\[${esc}[^\\]]*\\](\\.)`, 'g'), (m, pre) =>
      /[.!?]/.test(pre) ? pre : pre + '.'
    );
    // any remaining occurrence
    text = text.replace(new RegExp(` ?\\[${esc}[^\\]]*\\]`, 'g'), '');
  }
  return text
    .replace(/ {2,}/g, ' ')
    .replace(/ +(?=\n\n)/g, '')
    .split('\n\n')
    .filter((para) => para.trim().length > 0)
    .join('\n\n');
}

const sections = [];
for (let i = 1; i <= 27; i++) {
  const nn = String(i).padStart(2, '0');
  const file = path.join(DIR, 'src', 'lot', `lot${nn}.htm`);
  const paras = extractChapter(file);
  if (paras.length < 5) throw new Error(`chapter ${i}: only ${paras.length} paragraphs`);
  sections.push({
    id: `chapter-${i}`,
    title: `Chapter ${ROMAN[i - 1]}`,
    text: stripInlineFootnotes(fixTypos(paras.join('\n\n'))),
  });
}

const corpus = { lang: 'eng', sections };
fs.writeFileSync(path.join(DIR, 'eng.json'), JSON.stringify(corpus, null, 2) + '\n');

// xref: forms verified present as capitalized whole words in the corpus
const allText = sections.map((s) => s.text).join('\n');
const xref = {
  version: 1,
  links: [
    { temple: 'shakyamuni', forms: ['Sâkyamuni'] },
    { temple: 'manjushri', forms: ['Mañgusrî'] },
    { temple: 'vajrapani', forms: ['Vagrapâni'] },
    { temple: 'mara', forms: ['Mâra'] },
    { temple: 'guanyin', forms: ['Avalokitesvara'] },
    { temple: 'akshobhya', forms: ['Akshobhya'] },
  ],
};
for (const l of xref.links) {
  for (const f of l.forms) {
    const re = new RegExp(`(?<![\\p{L}\\p{M}])${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{M}])`, 'u');
    const n = (allText.match(re) || []).length;
    console.log(`form "${f}" (${l.temple}): ${n} occurrence(s)`);
    if (!n) throw new Error(`form not attested: ${f}`);
  }
}
fs.writeFileSync(path.join(DIR, 'xref.json'), JSON.stringify(xref, null, 2) + '\n');

let words = 0;
for (const s of sections) words += s.text.split(/\s+/).length;
console.log(`sections: ${sections.length}, total words: ~${words}`);
for (const s of sections) {
  console.log(`${s.id.padEnd(11)} paras=${s.text.split('\n\n').length.toString().padStart(4)} chars=${s.text.length}`);
}
