#!/usr/bin/env node
/**
 * One-off: apply the hybrid-spelling + accent-position corrections from
 * tools/hybrid-spelling-audit.js to the canonical lexicon.
 *
 * Each spec replaces an entry's unicode form and rebuilds its breakdown from
 * the ascii form. Old Latinized forms are preserved as variants where they
 * are genuinely attested (standard English/Latin usage).
 */
const fs = require('node:fs');
const path = require('node:path');

const LEX = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');

// type inference: acute → stress, macron → length, circumflex → stress, special letters → special
function inferType(to) {
  if (/[ḗṓ]/.test(to)) return 'stress'; // long + acute
  if (/[áéíóúýḗṓ]/.test(to)) return 'stress';
  if (/[âêîôûŷ]/.test(to)) return 'stress'; // circumflex = stress (+ length in note)
  if (/[āēīōū]/.test(to)) return 'length';
  return 'same';
}

const NOTE = {
  á: 'Acute on alpha', é: 'Acute on epsilon', ē: 'Long eta', ḗ: 'Long eta with acute',
  í: 'Acute on iota', ï: 'Iota with diaeresis', î: 'Circumflex iota (long, stressed)',
  ó: 'Acute on omicron', ō: 'Long omega', ṓ: 'Long omega with acute', ô: 'Circumflex omega',
  ú: 'Acute on upsilon', û: 'Circumflex upsilon', ŷ: 'Circumflex upsilon',
  â: 'Circumflex alpha', ê: 'Circumflex eta (long, stressed)', ōn: 'Long omega + nu',
};

function rebuildBreakdown(ascii, unicode, specials) {
  // letters of ascii map in order onto the unicode string via the spec's ops
  const out = [];
  for (const op of specials) {
    const type = op.type || inferType(op.to);
    const note = op.note || NOTE[op.to] || (type === 'same' ? 'Same' : '');
    out.push({ char: op.char, to: op.to, type, note });
  }
  const joined = out.map((b) => b.to).join('');
  if (joined.normalize('NFC') !== unicode.normalize('NFC')) {
    throw new Error(`rebuild mismatch: ${joined} !== ${unicode}`);
  }
  return out;
}

// char lists must cover every ascii letter exactly once, in order.
const S = (chars) => chars.map(([char, to, note]) => ({ char, to, note }));

const FIXES = [
  // ── Family 1: hybrids (Latin spelling + Greek diacritic) ──
  {
    id: 'oedipus', unicode: 'Oidípous',
    ops: S([['o', 'O'], ['e', 'i', 'Oi for Latinized oe — Greek οἰ'], ['d', 'd'], ['i', 'í', 'Acute on iota (Οἰδίπους, tonos on δί)'], ['p', 'p'], ['u', 'ou', 'Diphthong ου rendered ou'], ['s', 's']]),
    variant: { unicode: 'Oedipus', type: 'ascii', note: 'Standard Latin/English form' },
  },
  {
    id: 'teucer', unicode: 'Teûkros',
    ops: S([['t', 'T'], ['e', 'e'], ['u', 'û', 'Circumflex upsilon (diphthong εῦ)'], ['c', 'kr', 'Kappa + rho — k, not Latin c'], ['e', 'o', 'Omicron'], ['r', 's', 'Final sigma']]),
    variant: { unicode: 'Teucer', type: 'ascii', note: 'Standard Latin/English form' },
  },
  {
    id: 'podalirius', unicode: 'Podaleírios',
    ops: S([['p', 'P'], ['o', 'o'], ['d', 'd'], ['a', 'a'], ['l', 'l'], ['i', 'e', 'Epsilon (Ποδαλείριος)'], ['r', 'í', 'Acute iota — tonos on λεί-'], ['i', 'r', 'Rho'], ['u', 'io', 'Iota + omicron'], ['s', 's']]),
    variant: { unicode: 'Podalirius', type: 'ascii', note: 'Standard Latin/English form' },
  },
  {
    id: 'jocasta', unicode: 'Iokástē',
    ops: S([['j', 'I', 'Iota — Greek has no j'], ['o', 'o'], ['c', 'k', 'Kappa'], ['a', 'á', 'Acute on alpha (Ἰοκάστη)'], ['s', 's'], ['t', 't'], ['a', 'ē', 'Long eta']]),
    variant: { unicode: 'Jocasta', type: 'ascii', note: 'Standard Latin/English form' },
  },
  {
    id: 'creusa', unicode: 'Kréusa',
    ops: S([['c', 'K', 'Kappa, not Latin c'], ['r', 'r'], ['e', 'é', 'Acute on epsilon (Κρέουσα, tonos on έ)'], ['u', 'u', 'Diphthong ου'], ['s', 's'], ['a', 'a']]),
    variant: { unicode: 'Creusa', type: 'ascii', note: 'Standard Latin/English form' },
  },
  {
    id: 'hippolytus', unicode: 'Hippólytos',
    ops: S([['h', 'H'], ['i', 'i'], ['p', 'p'], ['p', 'p'], ['o', 'ó', 'Acute on omicron (Ἱππόλυτος)'], ['l', 'l'], ['y', 'y', 'Y for upsilon'], ['t', 't'], ['u', 'o', 'Final -ος'], ['s', 's']]),
    variant: { unicode: 'Hippolytus', type: 'ascii', note: 'Standard Latin/English form' },
  },
  // ── Family 2: accent on the wrong syllable ──
  { id: 'megara', unicode: 'Mégara', ops: S([['m', 'M'], ['e', 'é', 'Acute on epsilon (Μέγαρα)'], ['g', 'g'], ['a', 'a'], ['r', 'r'], ['a', 'a']]) },
  { id: 'meleagros', unicode: 'Meléagros', ops: S([['m', 'M'], ['e', 'e'], ['l', 'l'], ['e', 'é', 'Acute on epsilon (Μελέαγρος)'], ['a', 'a'], ['g', 'g'], ['r', 'r'], ['o', 'o'], ['s', 's']]) },
  { id: 'atreus', unicode: 'Atreús', ops: S([['a', 'A'], ['t', 't'], ['r', 'r'], ['e', 'e', 'Epsilon of εύ'], ['u', 'ú', 'Acute on upsilon (Ἀτρεύς)'], ['s', 's']]) },
  { id: 'kleio', unicode: 'Kleiṓ', ops: S([['k', 'K'], ['l', 'l'], ['e', 'e', 'Epsilon of ει'], ['i', 'i', 'Iota of ει'], ['o', 'ṓ', 'Long omega with acute (Κλειώ)']]) },
  { id: 'erato', unicode: 'Eratṓ', ops: S([['e', 'E'], ['r', 'r'], ['a', 'a'], ['t', 't'], ['o', 'ṓ', 'Long omega with acute (Ἐρατώ)']]) },
  { id: 'alecto', unicode: 'Alēktṓ', ops: S([['a', 'A'], ['l', 'l'], ['e', 'ē', 'Long eta (Ἀληκτώ)'], ['c', 'k', 'Kappa'], ['t', 't'], ['o', 'ṓ', 'Long omega with acute']]) },
  { id: 'agave', unicode: 'Agaúē', ops: S([['a', 'A'], ['g', 'g'], ['a', 'a'], ['v', 'ú', 'Acute on upsilon (Ἀγαύη)'], ['e', 'ē', 'Long eta']]) },
  { id: 'tisiphone', unicode: 'Tisiphónē', ops: S([['t', 'T'], ['i', 'i'], ['s', 's'], ['i', 'i'], ['p', 'p'], ['h', 'h'], ['o', 'ó', 'Acute on omicron (Τισιφόνη)'], ['n', 'n'], ['e', 'ē', 'Long eta']]) },
  { id: 'hyakinthos', unicode: 'Hyákinthos', ops: S([['h', 'H'], ['y', 'y'], ['a', 'á', 'Acute on alpha (Ὑάκινθος)'], ['k', 'k'], ['i', 'i'], ['n', 'n'], ['t', 't'], ['h', 'h'], ['o', 'o'], ['s', 's']]) },
  { id: 'amethystos', unicode: 'Améthystos', ops: S([['a', 'A'], ['m', 'm'], ['e', 'é', 'Acute on epsilon (Ἀμέθυστος)'], ['t', 't'], ['h', 'h'], ['y', 'y'], ['s', 's'], ['t', 't'], ['o', 'o'], ['s', 's']]) },
  { id: 'astyanax', unicode: 'Astyánax', ops: S([['a', 'A'], ['s', 's'], ['t', 't'], ['y', 'y'], ['a', 'á', 'Acute on alpha (Ἀστυάναξ)'], ['n', 'n'], ['a', 'a'], ['x', 'x']]) },
  { id: 'boreas', unicode: 'Boréas', ops: S([['b', 'B'], ['o', 'o'], ['r', 'r'], ['e', 'é', 'Acute on epsilon (Βορέας)'], ['a', 'a'], ['s', 's']]) },
  { id: 'megaera', unicode: 'Mégaira', ops: S([['m', 'M'], ['e', 'é', 'Acute on epsilon (Μέγαιρα)'], ['g', 'g'], ['a', 'a', 'Alpha of αι'], ['e', 'i', 'Iota of αι (English writes ae)'], ['r', 'r'], ['a', 'a']]) },
  { id: 'klytaimnestra', unicode: 'Klytaimnḗstra', ops: S([['k', 'K'], ['l', 'l'], ['y', 'y'], ['t', 't'], ['a', 'a', 'Alpha of αι'], ['i', 'i', 'Iota of αι'], ['m', 'm'], ['n', 'n'], ['e', 'ḗ', 'Long eta with acute (Κλυταιμνήστρα)'], ['s', 's'], ['t', 't'], ['r', 'r'], ['a', 'a']]) },
  { id: 'machaon', unicode: 'Macháōn', ops: S([['m', 'M'], ['a', 'a'], ['c', 'c', 'Chi (with h)'], ['h', 'h', 'Chi (with c)'], ['a', 'á', 'Acute on alpha (Μαχάων)'], ['o', 'ō', 'Long omega'], ['n', 'n']]) },
  { id: 'medea', unicode: 'Mḗdeia', ops: S([['m', 'M'], ['e', 'ḗ', 'Long eta with acute (Μήδεια)'], ['d', 'd'], ['e', 'ei', 'Diphthong ει'], ['a', 'a']]), variant: { unicode: 'Medea', type: 'ascii', note: 'Standard Latin/English form' } },
  { id: 'aetes', unicode: 'Aiḗtēs', ops: S([['a', 'Ai', 'Diphthong αι (Αἰήτης)'], ['e', 'ḗ', 'Long eta with acute'], ['t', 't'], ['e', 'ē', 'Long eta'], ['s', 's']]), variant: { unicode: 'Aetes', type: 'ascii', note: 'Standard Latin/English form' } },
  { id: 'chiron', unicode: 'Cheírōn', ops: S([['c', 'C'], ['h', 'h', 'Chi (ch)'], ['i', 'e', 'Epsilon of εί'], ['r', 'í', 'Acute iota — tonos on εί (Χείρων)'], ['o', 'r', 'Rho'], ['n', 'ōn', 'Long omega + nu']]), variant: { unicode: 'Chiron', type: 'ascii', note: 'Standard Latin/English form' } },
  // ── Family 3: wrong mark type (acute where Greek has circumflex) ──
  { id: 'iris', unicode: 'Îris', ops: S([['i', 'Î', 'Circumflex iota (Ἶρις)'], ['r', 'r'], ['i', 'i'], ['s', 's']]) },
  { id: 'geras', unicode: 'Gêras', ops: S([['g', 'G'], ['e', 'ê', 'Circumflex eta — long and stressed (Γῆρας)'], ['r', 'r'], ['a', 'a'], ['s', 's']]) },
  { id: 'ethos', unicode: 'Êthos', ops: S([['e', 'Ê', 'Circumflex eta (Ἦθος)'], ['t', 't'], ['h', 'h'], ['o', 'o'], ['s', 's']]) },
  { id: 'gnosis', unicode: 'Gnôsis', ops: S([['g', 'G'], ['n', 'n'], ['o', 'ô', 'Circumflex omega (Γνῶσις)'], ['s', 's'], ['i', 'i'], ['s', 's']]) },
  { id: 'thebai', unicode: 'Thêbai', ops: S([['t', 'T'], ['h', 'h', 'Theta (th)'], ['e', 'ê', 'Circumflex eta (Θῆβαι)'], ['b', 'b'], ['a', 'a', 'Alpha of αι'], ['i', 'i', 'Iota of αι']]) },
  // ── Spurious macron ──
  { id: 'rhea', unicode: 'Rhéa', ops: S([['r', 'R'], ['h', 'h', 'Rough breathing (rh)'], ['e', 'é', 'Acute on epsilon (Ῥέα)'], ['a', 'a', 'Short final alpha']]) },
];

function main() {
  const src = fs.readFileSync(LEX, 'utf8');
  const start = src.indexOf('const LEXICON =');
  const arrayStart = src.indexOf('[', start);
  const arrayEnd = src.indexOf('\n];', arrayStart); // array closes with "];"
  if (start < 0 || arrayStart < 0 || arrayEnd < 0) throw new Error('lexicon.js structure not recognized');
  const header = src.slice(0, start);
  const body = src.slice(arrayStart, arrayEnd + 2); // "[ … ]"
  const footer = src.slice(arrayEnd + 2); // ";\n\nif (typeof module …"

  const vm = require('node:vm');
  const sandbox = {};
  vm.runInNewContext(`result = ${body}`, sandbox);
  const entries = sandbox.result;

  let applied = 0;
  for (const fix of FIXES) {
    const e = entries.find((x) => x.id === fix.id);
    if (!e) throw new Error(`entry not found: ${fix.id}`);
    const old = e.unicode;
    e.unicode = fix.unicode;
    e.breakdown = rebuildBreakdown(e.ascii, fix.unicode, fix.ops);
    if (fix.variant) {
      e.variants = e.variants || [];
      if (!e.variants.some((v) => v.unicode === fix.variant.unicode)) {
        e.variants.push(fix.variant);
      }
    }
    // A pre-existing variant that equals the corrected parent is now redundant
    // (kleio/chiron already carried the right form as variants — the primary
    // was what was wrong).
    if (e.variants) {
      e.variants = e.variants.filter((v) => v.unicode !== e.unicode);
    }
    console.log(`${fix.id}: ${old} → ${fix.unicode}`);
    applied++;
  }

  const out = `${header}const LEXICON = ${JSON.stringify(entries, null, 2)}${footer}`;
  fs.writeFileSync(LEX, out);
  console.log(`\nApplied ${applied} corrections.`);
}

main();
