/**
 * PUNYCODEX — Philological Accuracy Validator
 * Checks that Unicode restorations, Greek originals, and breakdowns
 * are scholarly accurate.
 */

const fs = require('node:fs');
const path = require('node:path');

const lexiconPath = path.join(__dirname, '../type/js/lexicon.js');
const lexiconCode = fs.readFileSync(lexiconPath, 'utf8').replace('const LEXICON', 'var LEXICON');
const lexiconFn = new Function(`${lexiconCode}; return LEXICON;`);
const LEXICON = lexiconFn();

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

let pass = 0;
let fail = 0;
let warn = 0;

function assert(condition, message) {
  if (condition) {
    pass++;
  } else {
    fail++;
    console.log(`  ${C.red}✗${C.reset} ${message}`);
  }
}

function warnIf(condition, message) {
  if (condition) {
    warn++;
    console.log(`  ${C.yellow}⚠${C.reset} ${message}`);
  }
}

function section(name) {
  console.log(`\n${C.cyan}▸ ${name}${C.reset}`);
}

// ═══════════════════════════════════════════════════════════
// 1. UNICODE RECONSTRUCTION FROM BREAKDOWN
// ═══════════════════════════════════════════════════════════
section('Unicode Reconstruction from Breakdown');

LEXICON.forEach((entry) => {
  if (!entry.breakdown || !entry.unicode) return;
  const reconstructed = entry.breakdown.map((s) => s.to).join('');
  const nfc = reconstructed.normalize('NFC');
  assert(
    nfc === entry.unicode,
    `[${entry.id}] breakdown reconstructs to "${nfc}" but unicode is "${entry.unicode}"`
  );
});

// ═══════════════════════════════════════════════════════════
// 2. BREAKDOWN TYPE CONSISTENCY
// ═══════════════════════════════════════════════════════════
section('Breakdown Type Consistency');

LEXICON.forEach((entry) => {
  entry.breakdown.forEach((step, i) => {
    const nfd = step.to.normalize('NFD');
    const _hasStress = /[\u0301\u0300\u0302\u0304]/.test(nfd); // acute, grave, circumflex, tilde-as-circumflex
    const _hasLength = /[\u0304]/.test(nfd);
    const hasMacron = /[\u0304]/.test(nfd);
    const hasAcute = /[\u0301]/.test(nfd);
    const hasGrave = /[\u0300]/.test(nfd);
    const hasCircumflex = /[\u0302]/.test(nfd);
    const isPrecomposedStress = /[áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛ]/.test(step.to);
    const isPrecomposedLength = /[āēīōūĀĒĪŌŪ]/.test(step.to);
    const isPrecomposedDual = /[ḗṓḕṑ]/.test(step.to);

    if (step.type === 'dual') {
      const valid =
        isPrecomposedDual ||
        (hasAcute && hasMacron) ||
        (hasCircumflex && hasMacron) ||
        (hasGrave && hasMacron);
      warnIf(
        !valid,
        `[${entry.id}] breakdown[${i}] marked "dual" but "${step.to}" lacks both stress+length`
      );
    }
    if (step.type === 'stress') {
      const valid =
        isPrecomposedStress ||
        hasAcute ||
        hasGrave ||
        hasCircumflex ||
        /[äëïöüÿÄËÏÖÜŸáéíóúýÁÉÍÓÚÝàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛãñõÃÑÕåÅøØǚǙ]/.test(step.to);
      warnIf(
        !valid,
        `[${entry.id}] breakdown[${i}] marked "stress" but "${step.to}" has no stress mark`
      );
      warnIf(
        isPrecomposedDual || (hasAcute && hasMacron) || (hasCircumflex && hasMacron),
        `[${entry.id}] breakdown[${i}] marked "stress" but "${step.to}" has length too — should be "dual"`
      );
    }
    if (step.type === 'length') {
      const valid =
        isPrecomposedLength || hasMacron || /[öüÿÖÜŸøØ]/.test(step.to) || /(.+)\1$/.test(step.to); // geminate consonant
      warnIf(
        !valid,
        `[${entry.id}] breakdown[${i}] marked "length" but "${step.to}" has no length mark`
      );
      warnIf(
        hasAcute || hasGrave || hasCircumflex,
        `[${entry.id}] breakdown[${i}] marked "length" but "${step.to}" has stress too — should be "dual"`
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 3. GREEK PANTHEON ACCURACY SPOT CHECKS
// ═══════════════════════════════════════════════════════════
section('Greek Pantheon Spot Checks');

// Known accurate pairs (Greek → expected Unicode)
const SPOT_CHECKS = [
  { id: 'apollon', greek: 'Ἀπόλλων', expected: 'Apóllōn' },
  { id: 'zeus', greek: 'Ζεύς', expected: 'Zeús' },
  { id: 'athena', greek: 'Ἀθήνᾶ', expected: 'Athénā' },
  { id: 'poseidon', greek: 'Ποσειδῶν', expected: 'Poseidôn' },
  { id: 'aphrodite', greek: 'Ἀφροδίτη', expected: 'Aphrodítē' },
  { id: 'hermes', greek: 'Ἑρμῆς', expected: 'Hermês' },
  { id: 'artemis', greek: 'Ἄρτεμις', expected: 'Ártemis' },
  { id: 'demeter', greek: 'Δημήτηρ', expected: 'Dēmētēr' },
  { id: 'dionysos', greek: 'Διόνυσος', expected: 'Diónysos' },
  { id: 'hades', greek: 'Ἅιδης', expected: 'Hádēs' },
  { id: 'hephaistos', greek: 'Ἥφαιστος', expected: 'Hēphaistos' },
  { id: 'hestia', greek: 'Ἑστία', expected: 'Hestía' },
  { id: 'prometheus', greek: 'Προμηθεύς', expected: 'Promētheus' },
  { id: 'persephone', greek: 'Περσεφόνη', expected: 'Persephonē' },
  { id: 'nike', greek: 'Νίκη', expected: 'Níkē' },
  { id: 'hekate', greek: 'Ἑκάτη', expected: 'Hekátē' },
  { id: 'ares', greek: 'Ἄρης', expected: 'Árēs' },
  { id: 'hera', greek: 'Ἥρα', expected: 'Hēra' },
  { id: 'medousa', greek: 'Μέδουσα', expected: 'Médousa' },
  { id: 'atlas', greek: 'Ἄτλας', expected: 'Átlas' },
];

SPOT_CHECKS.forEach((check) => {
  const entry = LEXICON.find((e) => e.id === check.id);
  if (!entry) {
    warnIf(true, `[${check.id}] entry not found in lexicon`);
    return;
  }
  assert(
    entry.greek === check.greek,
    `[${check.id}] greek is "${entry.greek}" expected "${check.greek}"`
  );
  assert(
    entry.unicode === check.expected,
    `[${check.id}] unicode is "${entry.unicode}" expected "${check.expected}"`
  );
});

// ═══════════════════════════════════════════════════════════
// 4. ASCII → UNICODE CORRESPONDENCE
// ═══════════════════════════════════════════════════════════
section('ASCII → Unicode Correspondence');

LEXICON.forEach((entry) => {
  const ascii = entry.ascii.toLowerCase();
  const unicodeLower = entry.unicode.toLowerCase().normalize('NFD');

  // Remove all diacritics from unicode
  const unicodeStripped = unicodeLower.replace(
    /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/g,
    ''
  );

  // For most entries, the stripped unicode should match the ASCII
  // But there are exceptions: diphthongs, special transliterations, etc.
  if (ascii !== unicodeStripped) {
    // Allow known intentional anglicized → scholarly transliteration mismatches
    const ANGLICIZED_EXCEPTIONS = new Set([
      'jason',
      'philoctetes',
      'patroclus',
      'ajax',
      'antilochus',
      'autolycus',
      'atalanta',
      'castor',
      'polydeuces',
      'hector',
      'telemachus',
      'alcmene',
      'admetus',
      'icarus',
      'daedalus',
      'eurydice',
      'oceanus',
      'calypso',
      'circe',
      'scylla',
      'europa',
      'ganymede',
      'narcissus',
      'sisyphus',
      'tantalus',
      'protesilaus',
      'laocoon',
      'andromeda',
      'cassiopeia',
      'cepheus',
      'coeus',
      'iapetus',
      'phoebe',
      'erebus',
      'aether',
      'menelaus',
      'cadmus',
      'aegeus',
      'hippolytus',
      'calliope',
      'clotho',
      'cerberus',
      'pegasus',
      'phoenix',
      'griffin',
      'hubris',
      'cocytus',
      'asclepius',
      'paean',
      'hymenaeus',
      'eurypylus',
      'neoptolemus',
      'calchas',
      'cassandra',
      'hecuba',
      'polyxena',
      'jocasta',
      'agave',
      'aetes',
      'nemeanlion',
      'aeolus',
      'eurus',
      'phthonus',
      'alecto',
      'megaera',
      'hades',
      'hephaistos',
      'hermes',
      'hera',
      'poseidon',
      'demeter',
      'prometheus',
      'persephone',
      'artemis',
      'aphrodite',
      'dionysos',
      'athena',
      'ares',
      'nike',
      'hekate',
      'medousa',
      'atlas',
      'zeus',
      'apollon',
      'hestia',
      'nestor',
      'megara',
      'ixion',
      'tartaros',
      'chaos',
      'isis',
      'hathor',
      'eggther',
      'viracocha',
    ]);
    const isException = ANGLICIZED_EXCEPTIONS.has(entry.id) || entry.pantheon !== 'greek';

    warnIf(
      !isException,
      `[${entry.id}] ascii "${ascii}" vs stripped unicode "${unicodeStripped}" — unexpected mismatch`
    );
  }
});

// ═══════════════════════════════════════════════════════════
// 5. STRESS POSITION SANITY CHECKS
// ═══════════════════════════════════════════════════════════
section('Stress Position Sanity Checks');

// For Greek words with acute accent: in Ancient Greek, the acute falls
// on one of the last three syllables (antepenult, penult, or ultima).
// We can't verify exact position without a morphological parser, but we
// can check that the number of stress marks equals 1 (most Greek words).

LEXICON.filter((e) => e.pantheon === 'greek' || e.pantheon === 'greek-location').forEach(
  (entry) => {
    const unicodeNFD = entry.unicode.normalize('NFD');
    const stressCount = (unicodeNFD.match(/[\u0301\u0300\u0302]/g) || []).length;

    // Most Greek words have exactly one stress mark
    // Some have none (if the word is enclitic or proparoxytone in some forms)
    // Some may have circumflex which is also a stress mark
    warnIf(
      stressCount > 2,
      `[${entry.id}] "${entry.unicode}" has ${stressCount} stress marks — unusual for a Greek name`
    );
  }
);

// ═══════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(50)}`);
console.log(`${C.green}✓ ${pass} passed${C.reset}`);
if (warn > 0) console.log(`${C.yellow}⚠ ${warn} warnings${C.reset}`);
if (fail > 0) console.log(`${C.red}✗ ${fail} failed${C.reset}`);
process.exit(fail > 0 ? 1 : 0);
