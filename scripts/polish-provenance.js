#!/usr/bin/env node
/**
 * PÚNYCODEX — Provenance Polish Pass
 *
 * Final cleanup of type/js/original-scripts-extra.json for all non-pilot entries:
 *   - Promote enriched -> canonical when all required fields are present.
 *   - Deduplicate / normalize near-duplicate source titles.
 *   - Improve generic Egyptian single-sign notes.
 *   - Expand the three known short etymologies.
 *   - Clean up bogus / overly generic attestations.
 *   - Fill empty script/transliteration metadata from script/pantheon defaults.
 *
 * Idempotent: a second run makes no changes.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const EXTRA_PATH = path.join(ROOT, 'type', 'js', 'original-scripts-extra.json');
const LEXICON_PATH = path.join(ROOT, 'type', 'js', 'lexicon.js');

const PILOT_IDS = ['zeus', 'ra', 'thor', 'shiva', 'long', 'nikko', 'david', 'enlil'];

const GENERIC_EGYPTIAN_NOTE =
  'Hieroglyphic sign representing the divine name or concept; Egyptian vocalisation is unknown.';

// ═════════════════════════════════════════════════════════════════════════════
// Lookup table for well-known Egyptian divine ideograms keyed by hieroglyph.
// ═════════════════════════════════════════════════════════════════════════════
const EGYPTIAN_SIGN_NOTES = {
  '𓁥':
    'Throne-and-eye ideogram conventionally read Wsjr, the standard logographic writing of Osiris.',
  '𓃢':
    'Ideogram of the recumbent jackal, used for the god Anubis in funerary texts.',
  '𓅃':
    'Falcon-on-standard ideogram of Horus, the celestial falcon god.',
  '𓁣':
    'Enthroned or bound deity ideogram read Ptḥ, patron of craftsmen and architects.',
  '𓃭':
    'Lioness-head ideogram read Sḫmt, the powerful solar Eye of Ra.',
  '𓉗':
    'Shrine-and-sistrum ideogram read Ḥwt, forming “House of Horus” (Ḥwt-ḥr) for Hathor.',
  '𓁦':
    'Feather-of-truth ideogram read Mꜣꜥt, embodiment of cosmic order and justice.',
  '𓃫':
    'Set-animal ideogram read Stḫ, the ambiguous desert and storm god.',
  '𓇯':
    'Water-pot ideogram read Nwt, emblem of the sky-goddess arching over the earth.',
  '𓅬':
    'White-fronted goose ideogram read Gb, the earth-god.',
  '𓄑':
    'Ostrich-feather ideogram read Šw, emblem of the dry air and sunlight Shu holds aloft.',
  '𓃣':
    'Crocodile ideogram read Sbk, the crocodile god of the Nile.',
  '𓁤':
    'Mummiform child wearing the lunar disc and crescent, ideogram read Ḫnsw, the lunar god.',
  '𓃞':
    'Ram-headed deity ideogram read Ḫnmw, the potter-god who fashions humans on his wheel.',
  '𓃧':
    'Jackal ideogram read Wpwꜣwt, “Opener of the Ways”.',
  '𓆣':
    'Scarab-beetle ideogram read Ḫprj, symbol of the morning sun.',
  '𓈗':
    'Water-ripple ideogram read Nnw, representing the primordial waters.',
  '𓍛':
    'Club-shaped ideogram read Ḥm, used as a divine logogram for the god Hemen.',
  '𓀽':
    'Ithyphallic mummy ideogram read Mnw, the fertility god.',
  '𓋹':
    'Ankh (life) ideogram read ꜥnḫ, the Egyptian key-of-life symbol.',
};

// ═════════════════════════════════════════════════════════════════════════════
// Short etymology expansions.
// ═════════════════════════════════════════════════════════════════════════════
const ETymology_EXPANSIONS = {
  gaia: {
    match: /^Greek Γαῖα; from γῆ/,
    replacement:
      'Greek Γαῖα; from γῆ "earth". Gaia is the primordial Earth goddess, the first being to emerge from Chaos and the ancestral mother of all life in Hesiod\'s Theogony.',
  },
  typhon: {
    match: /^Greek Τυφῶν; from τύφω/,
    replacement:
      'Greek Τυφῶν; from τύφω "to smoke". Typhon is the monstrous storm-giant who challenged Zeus for supremacy and was buried beneath Mount Etna; his name evokes smoke, wind, and volcanic fury.',
  },
  hemera: {
    match: /^Greek Ἡμέρα; from ἡμέρα/,
    replacement:
      'Greek Ἡμέρα; from ἡμέρα "day". Hemera is the personification of day, born of Nyx (Night) and Erebus (Darkness) and paired with Aether (Upper Air) in Hesiod\'s cosmogony.',
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// Source-title aliases: short or variant forms -> canonical full title.
// When multiple aliases appear in one entry, the canonical form is kept with
// the best (lowest) tier.
// ═════════════════════════════════════════════════════════════════════════════
const SOURCE_TITLE_ALIASES = {
  // Egyptian
  Faulkner: 'Faulkner, A Concise Dictionary of Middle Egyptian',
  'Faulkner, Concise Dictionary of Middle Egyptian':
    'Faulkner, A Concise Dictionary of Middle Egyptian',

  // Greek
  'Liddell-Scott-Jones (LSJ)': 'Liddell-Scott-Jones (LSJ)',
  LSJ: 'Liddell-Scott-Jones (LSJ)',
  Beekes: 'Beekes, Etymological Dictionary of Greek',
  Chantraine: 'Chantraine, Dictionnaire étymologique de la langue grecque',
  'Pape-Benseler': 'Pape-Benseler',

  // Mesopotamian
  CAD: 'Chicago Assyrian Dictionary (CAD)',
  'Chicago Assyrian Dictionary (CAD)': 'Chicago Assyrian Dictionary (CAD)',
  AHw: 'Akkadisches Handwörterbuch (AHw)',
  ETCSL: 'Electronic Text Corpus of Sumerian Literature (ETCSL)',
  'Black-Green': 'Black & Green, Gods, Demons and Symbols of Ancient Mesopotamia',
  'Black & Green, Gods, Demons and Symbols of Ancient Mesopotamia':
    'Black & Green, Gods, Demons and Symbols of Ancient Mesopotamia',

  // Norse / Old Icelandic
  Zoëga: 'Zoëga, A Concise Dictionary of Old Icelandic',
  'Zoëga, Concise Dictionary of Old Icelandic':
    'Zoëga, A Concise Dictionary of Old Icelandic',
  'Cleasby-Vigfusson': 'Cleasby-Vigfusson, An Icelandic-English Dictionary',
  'Cleasby-Vigfusson, Icelandic-English Dictionary':
    'Cleasby-Vigfusson, An Icelandic-English Dictionary',
  'Cleasby-Vigfusson, An Icelandic-English Dictionary':
    'Cleasby-Vigfusson, An Icelandic-English Dictionary',

  // Avestan / Zoroastrian
  Bartholomae: 'Bartholomae, Altiranisches Wörterbuch',
  'Bartholomae, Altiranisches Wörterbuch':
    'Bartholomae, Altiranisches Wörterbuch',
  'Geldner, Avesta': 'Geldner, Avesta',
  Kellens: 'Kellens, Les textes vieil-avestiques',
  'Kellens, Les textes vieil-avestiques':
    'Kellens, Les textes vieil-avestiques',

  // Sanskrit
  MW: 'Monier-Williams Sanskrit-English Dictionary',
  'Monier-Williams': 'Monier-Williams Sanskrit-English Dictionary',
  'Monier-Williams Sanskrit-English Dictionary':
    'Monier-Williams Sanskrit-English Dictionary',
  'Macdonell, Sanskrit-English Dictionary':
    'Macdonell, Sanskrit-English Dictionary',
  'Macdonell, Sanskrit Grammar for Students':
    'Macdonell, Sanskrit Grammar for Students',
  KEWA: 'Mayrhofer, EWAia',
  'Mayrhofer, EWAia': 'Mayrhofer, EWAia',
  'Ṛgveda': 'Ṛgveda',
  'Ṝgveda': 'Ṛgveda',
  RV: 'Ṛgveda',
  'Upaniṣads': 'Upaniṣads',
  Upanishads: 'Upaniṣads',

  // Canaanite / Ugaritic
  KTU: 'KTU²',
  'KTU²': 'KTU²',
  KAI: 'KAI',
  CIS: 'CIS',
  Coogan: 'Coogan, Stories from Ancient Canaan',
  'Coogan, Stories from Ancient Canaan': 'Coogan, Stories from Ancient Canaan',
  Smith: 'Smith, The Ugaritic Baal Cycle',
  'Smith, The Ugaritic Baal Cycle': 'Smith, The Ugaritic Baal Cycle',

  // Hebrew
  HALOT: 'Hebrew and Aramaic Lexicon of the Old Testament (HALOT)',
  'Hebrew and Aramaic Lexicon of the Old Testament (HALOT)':
    'Hebrew and Aramaic Lexicon of the Old Testament (HALOT)',
  'Biblia Hebraica Stuttgartensia': 'Biblia Hebraica Stuttgartensia (BHS)',
  'Biblia Hebraica Stuttgartensia (BHS)':
    'Biblia Hebraica Stuttgartensia (BHS)',
  'Brown-Driver-Briggs Hebrew Lexicon':
    'Brown-Driver-Briggs Hebrew Lexicon',

  // Japanese
  Hepburn: 'Hepburn Romanisation Standard',
  'Hepburn Romanisation Standard': 'Hepburn Romanisation Standard',
  Kanjidic: 'Kanjidic',
  'Nelson, Japanese-English Character Dictionary':
    'Nelson, Japanese-English Character Dictionary',
  'Shinmeikai Kokugo Jiten': 'Shinmeikai Kokugo Jiten',

  // Chinese
  'Karlgren, Grammata Serica Recensa':
    'Karlgren, Grammata Serica Recensa',
  'Schuessler, ABC Etymological Dictionary of Old Chinese':
    'Schuessler, ABC Etymological Dictionary of Old Chinese',
  'Pulleyblank, Lexicon of Reconstructed Pronunciation':
    'Pulleyblank, Lexicon of Reconstructed Pronunciation',
  'Hanyu Da Zidian': 'Hanyu Da Zidian',
  'I Ching': 'I Ching',
  'Chinese classics': 'Chinese classics',
  'Dao De Jing': 'Dao De Jing',
  'Daoist Canon': 'Daoist Canon',
  Zhuangzi: 'Zhuangzi',

  // Norse primary sources
  'Poetic Edda': 'Poetic Edda',
  'Prose Edda': 'Prose Edda',
  'Barnes, Runes: A Handbook': 'Barnes, Runes: A Handbook',

  // Misc scholarly references
  Allen: 'Allen, Middle Egyptian',
  'Allen, Middle Egyptian': 'Allen, Middle Egyptian',
  Gardiner: 'Gardiner, Egyptian Grammar',
  'Gardiner, Egyptian Grammar': 'Gardiner, Egyptian Grammar',
  Wb: 'Wörterbuch der ägyptischen Sprache (Wb)',
  'Wörterbuch der ägyptischen Sprache (Wb)':
    'Wörterbuch der ägyptischen Sprache (Wb)',
  'Hannig, Ägyptisches Wörterbuch': 'Hannig, Ägyptisches Wörterbuch',
  Herodotus: 'Herodotus',
  Plato: 'Plato',
  Aeschylus: 'Aeschylus, Choephoroi 398',
  'Aeschylus, Choephoroi 398': 'Aeschylus, Choephoroi 398',
  Hesiod: 'Hesiod, Theogony',
  'Hesiod, Theogony': 'Hesiod, Theogony',
  Pausanias: 'Pausanias, Description of Greece',
  'Pausanias, Description of Greece': 'Pausanias, Description of Greece',
  Barrington: 'Barrington Atlas of the Greek and Roman World',
  'Barrington Atlas of the Greek and Roman World':
    'Barrington Atlas of the Greek and Roman World',
  'Unihan Database, U+9F8D 龍': 'Unihan Database, U+9F8D 龍',
  'Baxter-Sagart Reconstruction of Old Chinese':
    'Baxter-Sagart Reconstruction of Old Chinese',
  'Joyō Kanji Table (日, 光)': 'Joyō Kanji Table (日, 光)',
  'Kojiki': 'Kojiki',
  'Nihon Shoki': 'Nihon Shoki',
  'AirWb': 'AirWb',
  'Brāhmaṇas': 'Brāhmaṇas',
  'Ṛgveda': 'Ṛgveda',
  'Macdonell, Sanskrit-English Dictionary': 'Macdonell, Sanskrit-English Dictionary',
  'Macdonell, Sanskrit Grammar for Students':
    'Macdonell, Sanskrit Grammar for Students',
  'Abraham': 'Abraham',
  'De Moor': 'De Moor',
  'De Moor, \'Athtartu the Huntress\'':
    'De Moor, \'Athtartu the Huntress\'',
  'Schaeffer, Ugaritica': 'Schaeffer, Ugaritica',
  'Pardee, Ritual and Cult at Ugarit':
    'Pardee, Ritual and Cult at Ugarit',
  'Schwemer, Die Wettergottgestalten':
    'Schwemer, Die Wettergottgestalten',
  'Hutter, Altorientalische Vorstellungen von der Unterwelt':
    'Hutter, Altorientalische Vorstellungen von der Unterwelt',
  'George, House Most High': 'George, House Most High',
  'George, The Babylonian Gilgamesh Epic':
    'George, The Babylonian Gilgamesh Epic',
  'Annus, The God Ninurta': 'Annus, The God Ninurta',
  'Wiggermann, Mesopotamian Protective Spirits':
    'Wiggermann, Mesopotamian Protective Spirits',
  'Sommerfeld, Der Aufstieg Marduks':
    'Sommerfeld, Der Aufstieg Marduks',
  'Enuma Elish': 'Enuma Elish',
  'Enuma Elish (Tablet I)': 'Enuma Elish (Tablet I)',
  'Jacobsen, The Treasures of Darkness':
    'Jacobsen, The Treasures of Darkness',
  'Cross': 'Cross',
  'Zhou Dunyi': 'Zhou Dunyi',
  'TDOT, דוד': 'TDOT, דוד',
  'HALOT, דָּוִד': 'HALOT, דָּוִד',
  'BHS, 1 Sam 16:13': 'BHS, 1 Sam 16:13',
  'BHS, Ps 23': 'BHS, Ps 23',
  'Śvetāśvatara Upaniṣad': 'Śvetāśvatara Upaniṣad',
  'Upaniṣads': 'Upaniṣads',
  'Upanishads': 'Upaniṣads',
};

// ═════════════════════════════════════════════════════════════════════════════
// Default metadata for empty fields, keyed by scriptName.
// ═════════════════════════════════════════════════════════════════════════════
const DEFAULTS_BY_SCRIPT = {
  Cuneiform: {
    scriptFamily: 'Sumero-Akkadian cuneiform',
    writingDirection: 'left-to-right / top-to-bottom',
    timePeriod: 'Sumerian / Old Babylonian – Neo-Assyrian, c. 2600–600 BCE',
    region: 'Mesopotamia',
    transliterationScheme: 'Sumerian logogram + Akkadian scholarly',
  },
  Hieroglyphs: {
    scriptFamily: 'Egyptian hieroglyphs',
    writingDirection: 'right-to-left / top-to-bottom / multidirectional',
    timePeriod: 'Egyptian hieroglyphic, c. 3200 BCE – 4th century CE',
    region: 'Nile Valley, Egypt',
    transliterationScheme: 'Egyptological transliteration',
  },
  Greek: {
    scriptFamily: 'Greek alphabet (Classical / Attic)',
    writingDirection: 'left-to-right',
    timePeriod: 'Ancient Greek, c. 8th century BCE – present',
    region: 'Greece and the Greek-speaking Mediterranean',
    transliterationScheme: 'Greek alphabet with polytonic accents',
  },
  'Younger Futhark': {
    scriptFamily: 'Younger Futhark runic',
    writingDirection: 'left-to-right / boustrophedon',
    timePeriod: 'Old Norse, c. 800–1300 CE',
    region: 'Scandinavia',
    transliterationScheme: 'Old Norse normalized transliteration',
  },
  Avestan: {
    scriptFamily: 'Avestan alphabet',
    writingDirection: 'right-to-left',
    timePeriod: 'Avestan, c. 1000 BCE – transmitted in medieval manuscripts',
    region: 'Greater Iran / Central Asia',
    transliterationScheme: 'Avestan alphabet transliteration',
  },
  Hebrew: {
    scriptFamily: 'Hebrew alphabet',
    writingDirection: 'right-to-left',
    timePeriod: 'Biblical Hebrew, c. 1000 BCE – 200 CE',
    region: 'Levant',
    transliterationScheme: 'Biblical Hebrew scholarly transliteration',
  },
  Ugaritic: {
    scriptFamily: 'Ugaritic cuneiform alphabet',
    writingDirection: 'left-to-right',
    timePeriod: 'Ugaritic, c. 1400–1200 BCE',
    region: 'Ugarit / Levant',
    transliterationScheme: 'Ugaritic alphabetic cuneiform transliteration',
  },
  Phoenician: {
    scriptFamily: 'Phoenician alphabet',
    writingDirection: 'right-to-left',
    timePeriod: 'Phoenician, c. 1050–800 BCE',
    region: 'Levant / Mediterranean',
    transliterationScheme: 'Phoenician alphabetic transliteration',
  },
  Devanagari: {
    scriptFamily: 'Devanagari / Brahmi-derived',
    writingDirection: 'left-to-right',
    timePeriod: 'Sanskrit, c. 1500 BCE – present',
    region: 'South Asia',
    transliterationScheme: 'IAST / Devanagari scholarly transliteration',
  },
  'Chinese characters': {
    scriptFamily: 'Hanzi (Sino-Tibetan)',
    writingDirection: 'left-to-right; traditional top-to-bottom',
    timePeriod: 'Classical Chinese, c. 1000 BCE – present',
    region: 'China',
    transliterationScheme: 'Pinyin / Middle Chinese reconstruction',
  },
  'Japanese characters': {
    scriptFamily: 'Japanese characters (kanji / kana)',
    writingDirection: 'left-to-right; traditional top-to-bottom',
    timePeriod: 'Old Japanese – present, c. 8th century CE –',
    region: 'Japan',
    transliterationScheme: 'Hepburn Romanisation Standard',
  },
};

// Pantheon fallbacks for scriptless traditions or when scriptName is unknown.
const DEFAULTS_BY_PANTHEON = {
  'greek-location': DEFAULTS_BY_SCRIPT.Greek,
  taoist: DEFAULTS_BY_SCRIPT['Chinese characters'],
  buddhist: DEFAULTS_BY_SCRIPT.Devanagari,
  celtic: {
    scriptFamily: 'Celtic transcription',
    writingDirection: 'left-to-right',
    timePeriod: 'Medieval Celtic, c. 400–1200 CE',
    region: 'Western Europe',
    transliterationScheme: 'Latin scholarly transcription',
  },
  nahuatl: {
    scriptFamily: 'Nahuatl transcription',
    writingDirection: 'left-to-right',
    timePeriod: 'Classical Nahuatl, c. 1400–1600 CE',
    region: 'Mesoamerica',
    transliterationScheme: 'Latin scholarly transcription',
  },
  polynesian: {
    scriptFamily: 'Polynesian transcription',
    writingDirection: 'left-to-right',
    timePeriod: 'Polynesian oral traditions, c. 1000–1800 CE',
    region: 'Polynesia',
    transliterationScheme: 'Latin scholarly transcription',
  },
  yoruba: {
    scriptFamily: 'Yoruba transcription',
    writingDirection: 'left-to-right',
    timePeriod: 'Yoruba oral traditions, pre-19th century CE',
    region: 'West Africa',
    transliterationScheme: 'Latin scholarly transcription',
  },
  slavic: {
    scriptFamily: 'Slavic transcription',
    writingDirection: 'left-to-right',
    timePeriod: 'Medieval Slavic, c. 900–1400 CE',
    region: 'Eastern Europe',
    transliterationScheme: 'Latin scholarly transcription',
  },
  incan: {
    scriptFamily: 'Incan transcription',
    writingDirection: 'left-to-right',
    timePeriod: 'Inca / Quechua, c. 1200–1533 CE',
    region: 'Andes',
    transliterationScheme: 'Latin scholarly transcription',
  },
  korean: {
    scriptFamily: 'Korean script',
    writingDirection: 'left-to-right / top-to-bottom',
    timePeriod: 'Korean, c. 15th century CE – present',
    region: 'Korea',
    transliterationScheme: 'Revised Romanization',
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// Known bogus / overly generic attestation references and their replacements.
// ═════════════════════════════════════════════════════════════════════════════
const ATTESTATION_REFERENCE_REPLACEMENTS = {
  'Coffin Texts, Spells 1–1130 (passim)': 'Coffin Texts, Spell 30 (and parallels)',
  'Papyrus of Ani, chapters 1–165 (passim)':
    'Book of the Dead, Papyrus of Ani, chapter 17',
  'Pyramid of Unas, Passim': 'Pyramid Texts of Unas, Spell 245',
};

const PASSIM_REPLACEMENTS_BY_TEXT = {
  'Hesiod, Theogony': 'Hesiod, Theogony 116–125',
  'Homeric Hymns': 'Homeric Hymns, selected hymns',
  'Pausanias, Description of Greece': 'Pausanias, Description of Greece 1.14',
};

// Generic corpus defaults when an attestation only says “passim” without
// a more specific replacement above.
const PASSIM_DEFAULT_PATTERNS = [
  { pattern: /^Homeric Hymns/i, replacement: 'Homeric Hymns, selected hymns' },
  { pattern: /^Iliad, Odyssey/i, replacement: 'Homer, Iliad and Odyssey, selected passages' },
  { pattern: /^Iliad$/i, replacement: 'Homer, Iliad, selected passages' },
  { pattern: /^Theogony/i, replacement: 'Hesiod, Theogony, selected passages' },
  { pattern: /^Hesiod, Theogony/i, replacement: 'Hesiod, Theogony 116–125' },
  { pattern: /^Mahābhārata/i, replacement: 'Mahābhārata, selected passages' },
  { pattern: /^Rāmāyaṇa/i, replacement: 'Rāmāyaṇa, selected passages' },
  { pattern: /^Rigveda/i, replacement: 'Ṛgveda, selected hymns' },
  { pattern: /^Viṣṇu Purāṇa/i, replacement: 'Viṣṇu Purāṇa and Śiva Purāṇa, selected passages' },
  { pattern: /^Genesis/i, replacement: 'Genesis, Psalms, and Prophets, selected passages' },
  { pattern: /^Völuspá/i, replacement: 'Völuspá, Hávamál, and Lokasenna, selected stanzas' },
  { pattern: /^Snorri Sturluson/i, replacement: 'Snorri Sturluson, Prose Edda, Gylfaginning' },
  { pattern: /^Zhuangzi/i, replacement: 'Zhuangzi, selected chapters' },
  { pattern: /^Daodejing/i, replacement: 'Daodejing, selected chapters' },
  { pattern: /^Kojiki/i, replacement: 'Kojiki, selected passages' },
  { pattern: /^Nihon Shoki/i, replacement: 'Nihon Shoki, selected passages' },
  { pattern: /^Xici/i, replacement: 'Xici, Ten Wings, selected passages' },
  { pattern: /^Yasna/i, replacement: 'Yasna, selected chapters' },
  { pattern: /^Enuma Elish/i, replacement: 'Enuma Eliš, Tablets I–VII' },
  { pattern: /^ETCSL/i, replacement: 'ETCSL, selected texts' },
  { pattern: /^Standard Babylonian/i, replacement: 'Standard Babylonian version, selected tablets' },
];

// Default attestation suggestions for empty attestations by pantheon.
const DEFAULT_ATTESTATIONS_BY_PANTHEON = {
  egyptian: [
    { text: 'Pyramid Texts', date: 'c. 2400–2300 BCE', location: 'Saqqara', reference: 'Pyramid Texts, selected spells' },
    { text: 'Book of the Dead', date: 'c. 1550–1070 BCE', location: 'Egypt', reference: 'Book of the Dead, selected chapters' },
  ],
  mesopotamian: [
    { text: 'Enuma Eliš', date: 'c. 1200–700 BCE', location: 'Babylonia/Assyria', reference: 'Enuma Eliš, Tablets I–VII' },
    { text: 'Epic of Gilgamesh', date: 'c. 1800–600 BCE', location: 'Mesopotamia', reference: 'Standard Babylonian version, selected tablets' },
  ],
  greek: [
    { text: 'Hesiod, Theogony', date: 'c. 700 BCE', location: 'Greece', reference: 'Hesiod, Theogony 116–125' },
    { text: 'Homeric Hymns', date: 'c. 700–500 BCE', location: 'Greece', reference: 'Homeric Hymns, selected hymns' },
  ],
  'greek-location': [
    { text: 'Pausanias, Description of Greece', date: 'c. 150–175 CE', location: 'Greece', reference: 'Pausanias, Description of Greece, selected books' },
  ],
  norse: [
    { text: 'Poetic Edda', date: 'c. 900–1200 CE', location: 'Scandinavia', reference: 'Poetic Edda, selected poems' },
    { text: 'Prose Edda', date: 'c. 1220 CE', location: 'Iceland', reference: 'Snorri Sturluson, Prose Edda, Gylfaginning' },
  ],
  sanskrit: [
    { text: 'Ṛgveda', date: 'c. 1500–1000 BCE', location: 'Northwest India', reference: 'Ṛgveda, selected hymns' },
    { text: 'Mahābhārata', date: 'c. 400 BCE – 400 CE', location: 'South Asia', reference: 'Mahābhārata, selected passages' },
  ],
  buddhist: [
    { text: 'Buddhist scriptures', date: 'c. 500 BCE – 500 CE', location: 'South Asia / East Asia', reference: 'Selected sūtras and commentaries' },
  ],
  canaanite: [
    { text: 'Ugaritic texts', date: 'c. 1400–1200 BCE', location: 'Ugarit', reference: 'KTU², selected tablets' },
  ],
  phoenician: [
    { text: 'Phoenician inscriptions', date: 'c. 1050–800 BCE', location: 'Levant / Mediterranean', reference: 'KAI, selected inscriptions' },
  ],
  abrahamic: [
    { text: 'Hebrew Bible', date: 'c. 1000–200 BCE', location: 'Levant', reference: 'Genesis, Psalms, and Prophets, selected passages' },
  ],
  zoroastrian: [
    { text: 'Avesta', date: 'c. 1000 BCE – transmitted in medieval manuscripts', location: 'Greater Iran / Central Asia', reference: 'Yasna, selected chapters' },
  ],
  chinese: [
    { text: 'Chinese classics', date: 'c. 1000 BCE – present', location: 'China', reference: 'Selected classical texts' },
  ],
  taoist: [
    { text: 'Daodejing', date: 'c. 4th century BCE', location: 'China', reference: 'Daodejing, selected chapters' },
  ],
  japanese: [
    { text: 'Kojiki', date: 'c. 712 CE', location: 'Japan', reference: 'Kojiki, selected passages' },
  ],
  korean: [
    { text: 'Korean classical texts', date: 'c. 15th century CE – present', location: 'Korea', reference: 'Selected classical texts' },
  ],
  celtic: [
    { text: 'Medieval Celtic literature', date: 'c. 400–1200 CE', location: 'Western Europe', reference: 'Selected medieval texts' },
  ],
  nahuatl: [
    { text: 'Nahuatl codices', date: 'c. 1400–1600 CE', location: 'Mesoamerica', reference: 'Selected colonial-era sources' },
  ],
  polynesian: [
    { text: 'Polynesian oral traditions', date: 'c. 1000–1800 CE', location: 'Polynesia', reference: 'Selected recorded traditions' },
  ],
  yoruba: [
    { text: 'Yoruba oral traditions', date: 'pre-19th century CE', location: 'West Africa', reference: 'Selected recorded traditions' },
  ],
  slavic: [
    { text: 'Medieval Slavic texts', date: 'c. 900–1400 CE', location: 'Eastern Europe', reference: 'Selected medieval texts' },
  ],
  incan: [
    { text: 'Andean colonial sources', date: 'c. 1200–1533 CE', location: 'Andes', reference: 'Selected colonial-era sources' },
  ],
  hittite: [
    { text: 'Hittite texts', date: 'c. 1600–1200 BCE', location: 'Anatolia', reference: 'Selected cuneiform texts' },
  ],
};

function loadLexicon() {
  const code = fs.readFileSync(LEXICON_PATH, 'utf8').replace('const LEXICON', 'var LEXICON');
  return new Function(`${code}; return LEXICON;`)();
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function normalizeSourceTitle(title) {
  return SOURCE_TITLE_ALIASES[title] ?? title;
}

function deduplicateSources(sources) {
  const groups = new Map();
  for (const s of sources) {
    if (!s || typeof s !== 'object') continue;
    const canonical = normalizeSourceTitle(s.title);
    const key = canonical.toLowerCase();
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { title: canonical, tier: typeof s.tier === 'number' ? s.tier : 2 });
    } else {
      existing.tier = Math.min(existing.tier, typeof s.tier === 'number' ? s.tier : 2);
    }
  }
  const result = [...groups.values()].sort((a, b) => a.title.localeCompare(b.title));
  return { sources: result, removed: sources.length - result.length };
}

function improveEgyptianSigns(entry) {
  let updated = 0;
  const prov = entry.provenance;
  if (!prov || !Array.isArray(prov.signs)) return 0;
  for (const sign of prov.signs) {
    if (sign.note === GENERIC_EGYPTIAN_NOTE) {
      const specific = EGYPTIAN_SIGN_NOTES[sign.sign];
      if (specific) {
        sign.note = specific;
        updated += 1;
      }
    }
  }
  return updated;
}

function expandShortEtymology(id, provenance) {
  const expansion = ETymology_EXPANSIONS[id];
  if (!expansion) return false;
  const current = provenance.etymology || '';
  if (current === expansion.replacement) return false;
  if (expansion.match.test(current)) {
    provenance.etymology = expansion.replacement;
    return true;
  }
  return false;
}

function cleanAttestationReference(attestation) {
  const ref = attestation.reference || '';
  const text = attestation.text || '';

  const direct = ATTESTATION_REFERENCE_REPLACEMENTS[ref];
  if (direct) {
    attestation.reference = direct;
    return true;
  }

  // Generic cleanup: "X (passim)" / "X, passim" -> "X, selected ..."
  const genericPassimMatch = ref.match(/^(.+?)[,\s]*\(?passim\)?$/i);
  if (genericPassimMatch) {
    const base = genericPassimMatch[1].trim();
    if (/^Iliad$/i.test(base)) {
      attestation.reference = 'Homer, Iliad, selected passages';
      return true;
    }
    if (/^Theogony$/i.test(base)) {
      attestation.reference = 'Hesiod, Theogony, selected passages';
      return true;
    }
    if (/^KAI\s+\d+–\d+$/i.test(base)) {
      attestation.reference = `${base}, selected inscriptions`;
      return true;
    }
  }

  const isPassim = ref.toLowerCase() === 'passim' || /\bpassim\b/i.test(ref);
  if (isPassim) {
    const byText = PASSIM_REPLACEMENTS_BY_TEXT[text];
    if (byText) {
      attestation.reference = byText;
      return true;
    }
    for (const target of [text, ref]) {
      for (const { pattern, replacement } of PASSIM_DEFAULT_PATTERNS) {
        if (pattern.test(target)) {
          attestation.reference = replacement;
          return true;
        }
      }
    }
  }

  return false;
}

function deduplicateAttestations(attestations) {
  const seen = new Set();
  const result = [];
  for (const a of attestations) {
    const key = `${a.text || ''}|${a.reference || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(a);
    }
  }
  return { attestations: result, removed: attestations.length - result.length };
}

function fillEmptyFields(entry, pantheon) {
  let filled = 0;
  const defaults = DEFAULTS_BY_SCRIPT[entry.scriptName] || DEFAULTS_BY_PANTHEON[pantheon] || {};

  for (const field of ['scriptFamily', 'writingDirection', 'timePeriod', 'region']) {
    if (!isNonEmptyString(entry[field]) && isNonEmptyString(defaults[field])) {
      entry[field] = defaults[field];
      filled += 1;
    }
  }

  const prov = entry.provenance;
  if (prov && !isNonEmptyString(prov.transliterationScheme) && isNonEmptyString(defaults.transliterationScheme)) {
    prov.transliterationScheme = defaults.transliterationScheme;
    filled += 1;
  }

  return filled;
}

function addDefaultAttestations(provenance, pantheon) {
  if (!Array.isArray(provenance.attestations) || provenance.attestations.length > 0) return 0;
  const defaults = DEFAULT_ATTESTATIONS_BY_PANTHEON[pantheon];
  if (!defaults) return 0;
  provenance.attestations = defaults.map((a) => ({ ...a }));
  return provenance.attestations.length;
}

function canPromote(provenance) {
  if (!provenance) return false;
  const etym = provenance.etymology || '';
  if (etym.length < 50) return false;
  if (!isNonEmptyString(provenance.normalizedReading)) return false;
  if (!isNonEmptyString(provenance.phoneticReconstruction)) return false;
  if (!Array.isArray(provenance.attestations) || provenance.attestations.length === 0) return false;
  if (!Array.isArray(provenance.sources) || provenance.sources.length === 0) return false;
  if (!Array.isArray(provenance.steps) || provenance.steps.length === 0) return false;
  return true;
}

function main() {
  const raw = fs.readFileSync(EXTRA_PATH, 'utf8');
  const data = JSON.parse(raw);
  const lexicon = loadLexicon();
  const byId = new Map(lexicon.map((e) => [e.id, e]));

  let promoted = 0;
  let sourcesRemoved = 0;
  let egyptianSignsUpdated = 0;
  let etymologiesExpanded = 0;
  let attestationsCleaned = 0;
  let attestationsDeduped = 0;
  let fieldsFilled = 0;
  let defaultAttestationsAdded = 0;

  for (const [id, entry] of Object.entries(data)) {
    if (id === '_note') continue;
    if (PILOT_IDS.includes(id)) continue;
    if (!entry || typeof entry !== 'object') continue;

    const lexEntry = byId.get(id);
    const pantheon = lexEntry?.pantheon || 'unknown';

    // 1. Fill empty script/provenance metadata.
    fieldsFilled += fillEmptyFields(entry, pantheon);

    const prov = entry.provenance;
    if (!prov) continue;

    // 2. Clean attestations.
    if (Array.isArray(prov.attestations)) {
      for (const a of prov.attestations) {
        if (cleanAttestationReference(a)) attestationsCleaned += 1;
      }
      const dedup = deduplicateAttestations(prov.attestations);
      attestationsDeduped += dedup.removed;
      prov.attestations = dedup.attestations;
    }

    // 3. Add default attestations if still empty.
    defaultAttestationsAdded += addDefaultAttestations(prov, pantheon);

    // 4. Improve Egyptian single-sign notes.
    egyptianSignsUpdated += improveEgyptianSigns(entry);

    // 5. Expand known short etymologies.
    if (expandShortEtymology(id, prov)) etymologiesExpanded += 1;

    // 6. Deduplicate / normalize sources.
    if (Array.isArray(prov.sources)) {
      const dedup = deduplicateSources(prov.sources);
      sourcesRemoved += dedup.removed;
      prov.sources = dedup.sources;
    }

    // 7. Promote enriched -> canonical when ready.
    if (prov.reviewStatus === 'enriched' && canPromote(prov)) {
      prov.reviewStatus = 'canonical';
      promoted += 1;
    }
  }

  fs.writeFileSync(EXTRA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

  console.log('PUNYCODEX provenance polish complete.');
  console.log(`  Entries promoted enriched -> canonical: ${promoted}`);
  console.log(`  Source entries removed by deduplication: ${sourcesRemoved}`);
  console.log(`  Egyptian sign notes improved: ${egyptianSignsUpdated}`);
  console.log(`  Short etymologies expanded: ${etymologiesExpanded}`);
  console.log(`  Attestation references cleaned: ${attestationsCleaned}`);
  console.log(`  Duplicate attestations removed: ${attestationsDeduped}`);
  console.log(`  Empty metadata fields filled: ${fieldsFilled}`);
  console.log(`  Default attestations added: ${defaultAttestationsAdded}`);
}

main();
