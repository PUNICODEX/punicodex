#!/usr/bin/env node
/**
 * Post-application fixes for the 39-domain batch:
 * 1. Removes 5 pre-existing anglicized duplicate entries (set, asclepius,
 *    tvashtri, pushan, daksha) now superseded by the flagship ids
 *    (steh, asklepios, tvastr, pusan, daksa) that match the owned domains.
 * 2. Rebuilds tier-1 macron-only variants correctly per form doctrine.
 * 3. Roman entries: greek -> '—' (Latin original shown via restoration).
 * 4. Adds the missing primary sources to source-catalog.js.
 * 5. Deletes the 5 orphaned base-temple directories.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const lexiconPath = path.join(ROOT, 'type', 'js', 'lexicon.js');
const catalogPath = path.join(ROOT, 'type', 'js', 'source-catalog.js');

// ── 1. Remove superseded duplicates ──
const REMOVE = ['set', 'asclepius', 'tvashtri', 'pushan', 'daksha'];
let src = fs.readFileSync(lexiconPath, 'utf8');

function removeEntry(src, id) {
  const marker = `  {\n    "id": "${id}",`;
  const start = src.indexOf(marker);
  if (start === -1) return { src, found: false };
  // Find the end of this entry object by brace counting.
  let depth = 0;
  let i = start;
  for (;;) {
    const open = src.indexOf('{', i);
    const close = src.indexOf('}', i);
    if (close === -1) throw new Error('unbalanced');
    if (open !== -1 && open < close) {
      depth++;
      i = open + 1;
    } else {
      depth--;
      i = close + 1;
      if (depth === 0) break;
    }
  }
  // Consume the trailing comma/newline after the closing brace if present.
  let end = i;
  if (src[end] === ',') end++;
  if (src[end] === '\n') end++;
  return { src: src.slice(0, start) + src.slice(end), found: true };
}

for (const id of REMOVE) {
  const r = removeEntry(src, id);
  if (r.found) {
    src = r.src;
    console.log(`removed duplicate entry: ${id}`);
  } else {
    console.log(`NOT FOUND (already absent): ${id}`);
  }
}

// ── 2. Fix tier-1 variants per form doctrine ──
// [id, macronOnlyVariant or null]
const VARIANTS = {
  achilleus: null, // stress-only; macron-only would collapse to plain ASCII
  delos: 'Dēlos', // circumflex -> macron-only
  asklepios: 'Asklēpios',
  drakon: 'Drakōn',
  monokeros: 'Monokērōs',
  phanes: 'Phanēs',
  pegasos: 'Pēgasos',
  seiren: 'Seirēn',
  troia: 'Troiā',
  tyche: 'Tychē',
};

function variantText(v) {
  if (!v) return '[]';
  return `[\n      { "unicode": "${v}", "type": "macron-only", "note": "LSJ convention: length only, no stress mark" }\n    ]`;
}

for (const [id, v] of Object.entries(VARIANTS)) {
  // Locate the entry and replace its variants array.
  const marker = `"id": "${id}",`;
  const start = src.indexOf(marker);
  if (start === -1) {
    console.log(`entry not found for variants: ${id}`);
    continue;
  }
  const vStart = src.indexOf('"variants":', start);
  if (vStart === -1 || vStart > start + 900) {
    console.log(`variants not found near: ${id}`);
    continue;
  }
  const arrStart = src.indexOf('[', vStart);
  let depth = 0;
  let i = arrStart;
  for (;;) {
    if (src[i] === '[') depth++;
    if (src[i] === ']') depth--;
    i++;
    if (depth === 0) break;
  }
  src = src.slice(0, arrStart) + variantText(v) + src.slice(i);
}

// ── 3. Roman entries: greek -> '—' ──
for (const id of ['diana', 'ianus', 'iuno', 'iuppiter', 'neptunus', 'vulcanus']) {
  const marker = `"id": "${id}",`;
  const start = src.indexOf(marker);
  if (start === -1) continue;
  const gStart = src.indexOf('"greek":', start);
  const gEnd = src.indexOf(',', gStart);
  src = src.slice(0, gStart) + '"greek": "—"' + src.slice(gEnd);
}

fs.writeFileSync(lexiconPath, src, 'utf8');
console.log('lexicon.js: dupes removed, variants rebuilt, roman greek normalized');

// ── 4. Source catalog additions ──
const NEW_SOURCES = {
  'Iliad': {
    full: 'Homer, Iliad',
    scope: 'Greek epic (Trojan War cycle)',
    year: '-750',
    edition: 'Oxford Classical Texts (Monro & Allen); Loeb',
    url: 'https://www.perseus.tufts.edu/hopper/text?doc=Hom.+Il.',
  },
  'Homeric Hymns': {
    full: 'Homeric Hymns',
    scope: 'Greek cult hymns (6th c. BCE)',
    year: '-550',
    edition: 'Oxford Classical Texts (Allen); Loeb',
  },
  'Apollodorus': {
    full: 'Apollodorus, Bibliotheca',
    scope: 'Greek mythographic compendium (1st–2nd c. CE)',
    year: '150',
    edition: 'Loeb Classical Library (Frazer)',
  },
  'Ctesias': {
    full: 'Ctesias of Knidos, Indika',
    scope: 'Greek ethnography of India (fragments)',
    year: '-398',
    edition: 'Photius, Bibliotheca epitome; ed. Bigwood',
  },
  'Pliny': {
    full: 'Pliny the Elder, Naturalis Historia',
    scope: 'Roman encyclopedia (77 CE)',
    year: '77',
    edition: 'Loeb Classical Library',
  },
  'Polybius': {
    full: 'Polybius, Histories',
    scope: 'Greek history of Rome (2nd c. BCE)',
    year: '-146',
    edition: 'Loeb Classical Library (Paton)',
  },
  'Lewis & Short': {
    full: 'Lewis & Short, A Latin Dictionary',
    scope: 'Latin lexicon',
    year: '1879',
    edition: 'Oxford, Clarendon Press; Perseus digitization',
    url: 'https://logeion.uchicago.edu/',
  },
  'Varro': {
    full: 'Varro, De Lingua Latina / Antiquitates Rerum Divinarum',
    scope: 'Roman antiquarian philology and religion',
    year: '-45',
    edition: 'Loeb Classical Library',
  },
  'Horace': {
    full: 'Horace, Carmina / Opera',
    scope: 'Roman lyric poetry',
    year: '-23',
    edition: 'Oxford Classical Texts; Loeb',
  },
  'Macrobius': {
    full: 'Macrobius, Saturnalia',
    scope: 'Late-antique Roman antiquarian miscellany',
    year: '430',
    edition: 'Loeb Classical Library (Kaster)',
  },
  'Ennius': {
    full: 'Ennius, Annales',
    scope: 'Early Roman epic (fragments)',
    year: '-180',
    edition: 'ed. Skutsch, The Annals of Q. Ennius (1985)',
  },
  'Te Velde': {
    full: 'H. te Velde, Seth, God of Confusion',
    scope: 'Egyptian religion monograph (Seth)',
    year: '1967',
    edition: 'Brill, Probleme der Ägyptologie 6',
  },
  'Bonneau': {
    full: 'D. Bonneau, La Crue du Nil',
    scope: 'Egyptian Nile flood cult study',
    year: '1964',
    edition: 'Librairie C. Klincksieck, Paris',
  },
  'Rigveda': {
    full: 'Ṛgveda Saṃhitā',
    scope: 'Vedic Sanskrit hymn collection',
    year: '-1200',
    edition: 'Aufrecht; van Nooten & Holland metric text; GRETIL',
    url: 'https://gretil.sub.uni-goettingen.de/gretil.html',
  },
  'Chinese folk religion': {
    full: 'Chinese folk religion (regional cults and underworld traditions)',
    scope: 'Chinese vernacular religion',
    year: 'ongoing',
    edition: 'documented across temple and funerary practice',
  },
  'Werner': {
    full: 'E. T. C. Werner, Myths and Legends of China',
    scope: 'Chinese mythology compendium',
    year: '1922',
    edition: 'George G. Harrap & Co.; Project Gutenberg digitization',
  },
  'Sanguozhi': {
    full: 'Chen Shou, Sanguozhi (Records of the Three Kingdoms)',
    scope: 'Chinese dynastic history (3rd c.)',
    year: '289',
    edition: 'Zhonghua Shuju critical edition',
  },
  'Xu Zheng': {
    full: 'Xu Zheng, Sanwu Liji (Historical Records of the Three Sovereigns and Five Emperors)',
    scope: 'Chinese cosmogony source text (Pángǔ)',
    year: '260',
    edition: 'as preserved in later encyclopedias (Taiping Yulan)',
  },
  'Birrell': {
    full: 'Anne Birrell, Chinese Mythology: An Introduction',
    scope: 'Chinese mythology reference',
    year: '1993',
    edition: 'Johns Hopkins University Press',
  },
  'Grey, Polynesian Mythology': {
    full: 'Sir George Grey, Polynesian Mythology',
    scope: 'Māori and Polynesian tradition (English/Māori text)',
    year: '1855',
    edition: 'John Murray, London; New Zealand Electronic Text Centre',
    url: 'https://nzetc.victoria.ac.nz/',
  },
  'Kokugo dictionaries': {
    full: 'Kokugo dictionaries (Nihon Kokugo Daijiten / Kōjien / Daijisen)',
    scope: 'Japanese national-language lexicography',
    year: 'various',
    edition: 'Shōgakukan / Sanseidō',
  },
  'Fengshen Yanyi': {
    full: 'Fēngshén Yǎnyì (Investiture of the Gods)',
    scope: 'Chinese Ming-dynasty mythological novel',
    year: '1600',
    edition: 'various; English abridgment as Creation of the Gods',
  },
  'Chinese Buddhist canon': {
    full: 'Chinese Buddhist canon (Dàzàngjīng / Taishō Tripiṭaka)',
    scope: 'East Asian Buddhist scriptural corpus',
    year: '1924',
    edition: 'Taishō Shinshū Daizōkyō (SAT digitization)',
  },
  'Teiser': {
    full: 'Stephen F. Teiser, The Ghost Festival in Medieval China',
    scope: 'Chinese underworld and afterlife studies',
    year: '1988',
    edition: 'Princeton University Press',
  },
  'Mahabharata': {
    full: 'Mahābhārata',
    scope: 'Sanskrit epic (incl. Bhagavadgītā)',
    year: '-300',
    edition: 'Poona Critical Edition (BORI); GRETIL',
    url: 'https://gretil.sub.uni-goettingen.de/gretil.html',
  },
};

let cat = fs.readFileSync(catalogPath, 'utf8');
const insertions = [];
for (const [name, meta] of Object.entries(NEW_SOURCES)) {
  if (cat.includes(`'${name}':`)) {
    console.log(`already in catalog: ${name}`);
    continue;
  }
  const lines = [`    '${name}': {`, `        full: '${meta.full.replace(/'/g, "\\'")}',`, `        scope: '${meta.scope.replace(/'/g, "\\'")}',`, `        year: '${meta.year}',`, `        edition: '${meta.edition.replace(/'/g, "\\'")}'`];
  if (meta.url) lines.push(`        url: '${meta.url}'`);
  lines.push('    },');
  insertions.push(lines.join('\n'));
}
const anchor = 'const SOURCE_CATALOG = {';
cat = cat.replace(anchor, `${anchor}\n${insertions.join('\n')}\n`);
fs.writeFileSync(catalogPath, cat, 'utf8');
console.log(`source-catalog.js: added ${insertions.length} sources`);

// ── 5. Remove orphaned base temples ──
for (const id of REMOVE) {
  const dir = path.join(ROOT, 'sites', id);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`removed orphaned temple: sites/${id}`);
  }
}

console.log('ALL FIXES APPLIED');
