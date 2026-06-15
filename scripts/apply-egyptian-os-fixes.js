#!/usr/bin/env node
/**
 * Apply the Egyptian original-script audit corrections.
 *
 * - Updates original scripts and provenance for ra, bastet, nephthys, set.
 * - Adds new original-script entries for the ~36 entries that were missing OS.
 * - Updates the lexicon unicode and breakdown for tefnut (Tfnwt -> Tfnt).
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OS_JSON = path.join(ROOT, 'type/js/original-scripts-extra.json');
const LEXICON_JS = path.join(ROOT, 'type/js/lexicon.js');

// Verified hieroglyph strings from the 2026-06-14 Egyptian audit.
// Generated with hieropy from curated MdC codes; Egyptian Hieroglyph Format
// Controls (U+13430..U+1343F) were stripped before storage.
const OS_MAP = {
  ra: '𓂋𓂝𓇳',
  bastet: '𓎯𓏏𓏏𓁐',
  nephthys: '𓉠𓏏𓆇',
  tefnut: '𓏏𓆑𓈖𓏏𓁐',
  montu: '𓏠𓈖𓍿𓅱',
  anuket: '𓂝𓈖𓈎𓏏𓁐',
  serket: '𓊃𓂋𓈎𓏏𓁐',
  neith: '𓈖𓏏𓋌',
  apep: '𓂝𓊪𓊪𓆓',
  taweret: '𓏏𓄿𓅨𓂋𓏏𓆗',
  hapy: '𓎛𓂝𓊪𓏭𓈘',
  seshat: '𓋇𓏏𓁐',
  mafdet: '𓌴𓁹𓆑𓂧𓏏𓌞𓅆',
  menhit: '𓏠𓈖𓎛𓇋𓇋𓏏𓆗',
  pakhet: '𓊪𓐍𓏏𓃭',
  sokar: '𓋴𓎡𓂋𓅃',
  renenutet: '𓂋𓈖𓈖𓅱𓏏𓏏𓆗',
  mehetweret: '𓎕𓎛𓇋𓇋𓏏𓆇𓆗𓅨𓂋𓏏𓆗',
  heqet: '𓎛𓈎𓏏𓆏',
  wadjet: '𓇅𓏏𓆗',
  nekhbet: '𓇑𓃀𓏌𓏏𓅒',
  ma: '𓌴𓏤',
  maa: '𓌳𓂝',
  akh: '𓅜𓏤',
  ab: '𓍋𓃀𓂻',
  sa: '𓋴𓄿',
  hm: '𓍛',
  khp: '𓐍𓊪',
  ba: '𓅡𓏤',
  ka: '𓂓𓏤',
  min: '𓀽',
  bes: '𓃀𓋴𓄜',
  heka: '𓎛𓂓𓏛',
  duat: '𓂧𓍯𓏏𓇽',
};

const extra = JSON.parse(fs.readFileSync(OS_JSON, 'utf8'));
const { LEXICON } = require(LEXICON_JS);

function lexicon(id) {
  return LEXICON.find(e => e.id === id);
}

function provenance(id, os, mdc, customSteps = []) {
  const entry = lexicon(id);
  const transliteration = entry?.unicode ?? '';
  const steps = customSteps.length
    ? customSteps
    : [
        `Hieroglyphic spelling ${os} generated from MdC ${mdc}`,
        `Read in scholarly transliteration as ${transliteration}`,
        entry?.meaning ? `${entry.meaning}` : '',
      ].filter(Boolean);
  return {
    original: os,
    transliteration,
    steps,
    sources: ['Faulkner, A Concise Dictionary of Middle Egyptian', `Wb, ${transliteration.toLowerCase()}`],
  };
}

const UPDATES = {
  ra: {
    originalScript: '𓂋𓂝𓇳',
    scriptName: 'Hieroglyphs',
    provenance: {
      original: '𓂋𓂝𓇳',
      transliteration: 'Rꜥ',
      steps: [
        'Hieroglyphic spelling 𓂋𓂝𓇳 (mouth r + arm ꜥ + sun-disk ra)',
        'The full writing rꜥ spells the name of the sun-god with the sun-disk as determinative/rebus',
        'Later fused with Amun as Amun-Ra',
      ],
      sources: ['Faulkner, A Concise Dictionary of Middle Egyptian', 'Wb, rꜥ', 'Allen, Middle Egyptian'],
    },
  },
  bastet: {
    originalScript: '𓎯𓏏𓏏𓁐',
    scriptName: 'Hieroglyphs',
    provenance: {
      original: '𓎯𓏏𓏏𓁐',
      transliteration: 'Bꜣstt',
      steps: [
        'Hieroglyphic spelling 𓎯𓏏𓏏𓁐 (ointment jar bꜣs + double feminine t + seated woman determinative)',
        'The name means "she of the ointment jar"',
        'Protective goddess of home and childbirth',
      ],
      sources: ['Faulkner, A Concise Dictionary of Middle Egyptian', 'Wb, bꜣstt', 'Allen, Middle Egyptian'],
    },
  },
  nephthys: {
    originalScript: '𓉠𓏏𓆇',
    scriptName: 'Hieroglyphs',
    provenance: {
      original: '𓉠𓏏𓆇',
      transliteration: 'Nbt-ḥwt',
      steps: [
        'Hieroglyphic spelling 𓉠𓏏𓆇 (nb over ḥwt, feminine t, egg determinative)',
        'The name means "Lady of the Mansion" (nbt-ḥwt)',
        'Sister of Isis, protectress of the dead and the sarcophagus',
      ],
      sources: ['Faulkner, A Concise Dictionary of Middle Egyptian', 'Wb, nbt-ḥwt', 'Allen, Middle Egyptian'],
    },
  },
  set: {
    originalScript: '𓃫',
    scriptName: 'Hieroglyphs',
    provenance: {
      original: '𓃫',
      transliteration: 'Stḫ',
      steps: [
        'Set-animal (𓃫) as logogram and determinative for the god',
        'Phonetic spelling 𓋴𓏏𓐍 (s-t-ḫ) is also attested',
        'God of chaos, storms, and the desert; traditional Egyptological reading Set / Seth',
      ],
      sources: ['Faulkner, A Concise Dictionary of Middle Egyptian', 'Wb, stḫ', 'Allen, Middle Egyptian'],
    },
  },
  tefnut: {
    originalScript: '𓏏𓆑𓈖𓏏𓁐',
    scriptName: 'Hieroglyphs',
    provenance: {
      original: '𓏏𓆑𓈖𓏏𓁐',
      transliteration: 'Tfnt',
      steps: [
        'Hieroglyphic spelling 𓏏𓆑𓈖𓏏𓁐 (t-f-n-t + seated woman determinative)',
        'The name means "that water" or "that spittle"',
        'Lion-headed goddess of moisture, twin of Shu',
      ],
      sources: ['Faulkner, A Concise Dictionary of Middle Egyptian', 'Wb, tfnt', 'Allen, Middle Egyptian'],
    },
  },
};

const NEW = {
  montu: { mdc: 'mn:n:T-w' },
  anuket: { mdc: 'a:n-q:t-B1' },
  serket: { mdc: 'z:r-q:t-B1' },
  neith: { mdc: 'n:t-R25' },
  apep: { mdc: 'a-p-p-I10' },
  taweret: { mdc: 'X1-G1-G36:D21-X1-I12' },
  hapy: { mdc: 'H-a:p*y-!-N36' },
  seshat: { mdc: 'R20-t-B1' },
  mafdet: { mdc: 'U2:ir-f:d-t-Sms-G7' },
  menhit: { mdc: 'mn:n-H-i-i-t-I12' },
  pakhet: { mdc: 'p:x-t:l' },
  sokar: { mdc: 's-k:r-G5' },
  renenutet: { mdc: 'r:n:n-w-t:t-I12' },
  mehetweret: { mdc: 'V23-H-i-i-t:H8-I12-G36:r-t-I12' },
  heqet: { mdc: 'H-q:t-I7' },
  wadjet: { mdc: 'wAD-t-I12' },
  nekhbet: { mdc: 'M22-b-nw:t-G16' },
  ma: { mdc: 'U2:Z1' },
  maa: { mdc: 'mA-a' },
  akh: { mdc: 'Ax-Z1' },
  ab: { mdc: 'Ab-b-D54' },
  sa: { mdc: 's-A' },
  hm: { mdc: 'Hm' },
  khp: { mdc: 'x-p' },
  ba: { mdc: 'bA-Z1' },
  ka: { mdc: 'kA:Z1' },
  min: { mdc: 'A52', note: 'Emblematic sign for the god Min (man with raised arm and phallus)' },
  bes: { mdc: 'D58-S29-F28' },
  heka: { mdc: 'H-kA:Y1' },
  duat: { mdc: 'd-wA-t:dwAt' },
};

let changed = 0;

for (const [id, data] of Object.entries(UPDATES)) {
  extra[id] = data;
  changed += 1;
  console.log(`Updated ${id}: ${data.originalScript}`);
}

for (const [id, cfg] of Object.entries(NEW)) {
  if (extra[id]) {
    console.log(`Skipping ${id}: already present`);
    continue;
  }
  const os = OS_MAP[id];
  if (!os) {
    console.log(`Skipping ${id}: no hieroglyph output`);
    continue;
  }
  const steps = cfg.note ? [`Hieroglyphic spelling ${os} from MdC ${cfg.mdc}`, cfg.note] : [];
  extra[id] = {
    originalScript: os,
    scriptName: 'Hieroglyphs',
    provenance: provenance(id, os, cfg.mdc, steps),
  };
  changed += 1;
  console.log(`Added ${id}: ${os}`);
}

fs.writeFileSync(OS_JSON, JSON.stringify(extra, null, 2) + '\n', 'utf8');
console.log(`\nWrote ${changed} Egyptian updates to ${OS_JSON}`);

// Update tefnut in lexicon.js
const lexiconSrc = fs.readFileSync(LEXICON_JS, 'utf8');
const oldTefnutBlock = `    id: 'tefnut',
    ascii: 'tefnut',
    unicode: 'Tfnwt',
    greek: '—',
    pantheon: 'egyptian',
    tier: '2',
    tierLabel: 'Tier 2',
    domain: 'Moisture, Rain, Lions',
    meaning: 'That water, that spittle',
    sources: [
      'Faulkner',
      'Wb'
    ],
    breakdown: [
      {
        char: 't',
        to: 'T',
        type: 'same',
        note: 'Same'
      },
      {
        char: 'e',
        to: '',
        type: 'drop',
        note: 'Vowel not written'
      },
      {
        char: 'f',
        to: 'f',
        type: 'same',
        note: 'Same'
      },
      {
        char: 'n',
        to: 'n',
        type: 'same',
        note: 'Same'
      },
      {
        char: 'u',
        to: 'w',
        type: 'same',
        note: 'W'
      },
      {
        char: 't',
        to: 't',
        type: 'same',
        note: 'Same'
      }`;

const newTefnutBlock = `    id: 'tefnut',
    ascii: 'tefnut',
    unicode: 'Tfnt',
    greek: '—',
    pantheon: 'egyptian',
    tier: '2',
    tierLabel: 'Tier 2',
    domain: 'Moisture, Rain, Lions',
    meaning: 'That water, that spittle',
    sources: [
      'Faulkner',
      'Wb'
    ],
    breakdown: [
      {
        char: 't',
        to: 'T',
        type: 'same',
        note: 'Same'
      },
      {
        char: 'e',
        to: '',
        type: 'drop',
        note: 'Vowel not written'
      },
      {
        char: 'f',
        to: 'f',
        type: 'same',
        note: 'Same'
      },
      {
        char: 'n',
        to: 'n',
        type: 'same',
        note: 'Same'
      },
      {
        char: 'u',
        to: '',
        type: 'drop',
        note: 'Vowel not written'
      },
      {
        char: 't',
        to: 't',
        type: 'same',
        note: 'Same'
      }`;

if (!lexiconSrc.includes(oldTefnutBlock)) {
  console.error('ERROR: Could not find exact old tefnut block in lexicon.js');
  process.exit(1);
}

fs.writeFileSync(LEXICON_JS, lexiconSrc.replace(oldTefnutBlock, newTefnutBlock), 'utf8');
console.log("Updated lexicon.js: tefnut unicode 'Tfnwt' -> 'Tfnt' and breakdown");
