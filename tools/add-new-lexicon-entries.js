const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../type/js/lexicon.js');
const lexicon = require(file).LEXICON;

const newEntries = [
  {
    id: 'ankh',
    ascii: 'ankh',
    unicode: 'ꜥnḫ',
    greek: '—',
    pantheon: 'egyptian',
    tier: '2',
    tierLabel: 'Tier 2',
    domain: 'Symbol of Life',
    meaning: 'Life; Egyptian ankh sign',
    sources: ['Faulkner', 'Gardiner'],
    breakdown: [
      { char: 'a', to: 'ꜥ', type: 'special', note: 'Glottal stop ꜥ' },
      { char: 'n', to: 'n', type: 'same', note: 'Same' },
      { char: 'k', to: 'ḫ', type: 'special', note: 'Voiceless velar fricative ḫ' },
      { char: 'h', to: '', type: 'drop', note: 'Dropped: English placeholder' }
    ]
  },
  {
    id: 'nht',
    ascii: 'nekhet',
    unicode: 'Nḫt',
    greek: '—',
    pantheon: 'egyptian',
    tier: '2',
    tierLabel: 'Tier 2',
    domain: 'Strength, Victory',
    meaning: 'Strong, mighty, victorious',
    sources: ['Faulkner', 'Wb'],
    breakdown: [
      { char: 'n', to: 'N', type: 'same', note: 'Same, capitalized' },
      { char: 'e', to: '', type: 'drop', note: 'Epenthetic vowel' },
      { char: 'k', to: 'ḫ', type: 'special', note: 'Voiceless velar fricative ḫ' },
      { char: 'h', to: '', type: 'drop', note: 'Dropped: continuation of ḫ' },
      { char: 'e', to: '', type: 'drop', note: 'Epenthetic vowel' },
      { char: 't', to: 't', type: 'same', note: 'Same' }
    ]
  },
  {
    id: 'moses',
    ascii: 'moses',
    unicode: 'Mōšeh',
    greek: '—',
    pantheon: 'abrahamic',
    tier: '2',
    tierLabel: 'Tier 2',
    domain: 'Prophet, Lawgiver',
    meaning: 'Hebrew prophet and lawgiver',
    sources: ['Abraham'],
    breakdown: [
      { char: 'm', to: 'M', type: 'same', note: 'Same, capitalized' },
      { char: 'o', to: 'ō', type: 'length', note: 'Macron: long vowel' },
      { char: 's', to: 'š', type: 'special', note: 'Shin š' },
      { char: 'e', to: 'e', type: 'same', note: 'Same' },
      { char: 's', to: 'h', type: 'special', note: 'Heh h' }
    ]
  },
  {
    id: 'david',
    ascii: 'david',
    unicode: 'Dāwîḏ',
    greek: '—',
    pantheon: 'abrahamic',
    tier: '2',
    tierLabel: 'Tier 2',
    domain: 'King, Psalmist',
    meaning: 'Second king of Israel',
    sources: ['Abraham'],
    breakdown: [
      { char: 'd', to: 'D', type: 'same', note: 'Same, capitalized' },
      { char: 'a', to: 'ā', type: 'length', note: 'Macron: long vowel' },
      { char: 'v', to: 'w', type: 'special', note: 'Waw w' },
      { char: 'i', to: 'î', type: 'length', note: 'Circumflex: long vowel' },
      { char: 'd', to: 'ḏ', type: 'special', note: 'Dalet with line below' }
    ]
  },
  {
    id: 'solomon',
    ascii: 'solomon',
    unicode: 'Šəlōmōh',
    greek: '—',
    pantheon: 'abrahamic',
    tier: '2',
    tierLabel: 'Tier 2',
    domain: 'King, Sage',
    meaning: 'Third king of Israel, builder of the Temple',
    sources: ['Abraham'],
    breakdown: [
      { char: 's', to: 'Š', type: 'special', note: 'Same, capitalized and fricative' },
      { char: 'o', to: 'ə', type: 'special', note: 'Schwa vowel' },
      { char: 'l', to: 'l', type: 'same', note: 'Same' },
      { char: 'o', to: 'ō', type: 'length', note: 'Macron: long vowel' },
      { char: 'm', to: 'm', type: 'same', note: 'Same' },
      { char: 'o', to: 'ō', type: 'length', note: 'Macron: long vowel' },
      { char: 'n', to: 'h', type: 'special', note: 'Heh h' }
    ]
  },
  {
    id: 'noah',
    ascii: 'noah',
    unicode: 'Nōaḥ',
    greek: '—',
    pantheon: 'abrahamic',
    tier: '2',
    tierLabel: 'Tier 2',
    domain: 'Patriarch, Survivor',
    meaning: 'Builder of the ark',
    sources: ['Abraham'],
    breakdown: [
      { char: 'n', to: 'N', type: 'same', note: 'Same, capitalized' },
      { char: 'o', to: 'ō', type: 'length', note: 'Macron: long vowel' },
      { char: 'a', to: 'a', type: 'same', note: 'Same' },
      { char: 'h', to: 'ḥ', type: 'special', note: 'Voiceless pharyngeal fricative' }
    ]
  },
  {
    id: 'cain',
    ascii: 'cain',
    unicode: 'Qāyīn',
    greek: '—',
    pantheon: 'abrahamic',
    tier: '2',
    tierLabel: 'Tier 2',
    domain: 'First Murderer',
    meaning: 'First son of Adam and Eve',
    sources: ['Abraham'],
    breakdown: [
      { char: 'c', to: 'Q', type: 'special', note: 'Qoph q' },
      { char: 'a', to: 'ā', type: 'length', note: 'Macron: long vowel' },
      { char: 'i', to: 'ī', type: 'length', note: 'Macron: long vowel' },
      { char: 'n', to: 'n', type: 'same', note: 'Same' }
    ]
  },
  {
    id: 'abel',
    ascii: 'habel',
    unicode: 'Hāḇel',
    greek: '—',
    pantheon: 'abrahamic',
    tier: '2',
    tierLabel: 'Tier 2',
    domain: 'First Victim',
    meaning: 'Second son of Adam and Eve',
    sources: ['Abraham'],
    breakdown: [
      { char: 'h', to: 'H', type: 'same', note: 'Same, capitalized' },
      { char: 'a', to: 'ā', type: 'length', note: 'Macron: long vowel' },
      { char: 'b', to: 'ḇ', type: 'special', note: 'Beth with line below' },
      { char: 'e', to: 'e', type: 'same', note: 'Same' },
      { char: 'l', to: 'l', type: 'same', note: 'Same' }
    ]
  },
  {
    id: 'hercules',
    ascii: 'hercules',
    unicode: 'Hēraklēs',
    greek: '—',
    pantheon: 'greek',
    tier: '2',
    tierLabel: 'Tier 2',
    domain: 'Hero, Divine Son',
    meaning: 'Greek hero, deified as a god; Roman Hercules',
    sources: ['LSJ', 'Hesiod'],
    breakdown: [
      { char: 'h', to: 'H', type: 'same', note: 'Same, capitalized' },
      { char: 'e', to: 'ē', type: 'length', note: 'Macron: long vowel' },
      { char: 'r', to: 'r', type: 'same', note: 'Same' },
      { char: 'c', to: 'k', type: 'same', note: 'Same letter, Roman c → Greek k' },
      { char: 'u', to: '', type: 'drop', note: 'Dropped: Latin epenthetic vowel' },
      { char: 'l', to: 'l', type: 'same', note: 'Same' },
      { char: 'e', to: 'ē', type: 'length', note: 'Macron: long vowel' },
      { char: 's', to: 's', type: 'same', note: 'Same' }
    ]
  },
  {
    id: 'long',
    ascii: 'long',
    unicode: 'Lóng',
    greek: '龍',
    pantheon: 'chinese',
    tier: '2',
    tierLabel: 'Tier 2',
    domain: 'Dragon',
    meaning: 'Chinese dragon',
    sources: ['Chinese folklore', 'Chinese classics'],
    breakdown: [
      { char: 'l', to: 'L', type: 'same', note: 'Same, capitalized' },
      { char: 'o', to: 'ó', type: 'stress', note: 'Second tone' },
      { char: 'n', to: 'n', type: 'same', note: 'Same' },
      { char: 'g', to: 'g', type: 'same', note: 'Same' }
    ]
  },
  {
    id: 'wuji',
    ascii: 'wuji',
    unicode: 'Wújí',
    greek: '無極',
    pantheon: 'taoist',
    tier: '2',
    tierLabel: 'Tier 2',
    domain: 'Limitless, Ultimate Nothing',
    meaning: 'The primordial state of emptiness',
    sources: ['Dao De Jing', 'Daoist Canon'],
    breakdown: [
      { char: 'w', to: 'W', type: 'same', note: 'Same, capitalized' },
      { char: 'u', to: 'ú', type: 'stress', note: 'Second tone' },
      { char: 'j', to: 'j', type: 'same', note: 'Same' },
      { char: 'i', to: 'í', type: 'stress', note: 'Second tone' }
    ]
  },
  {
    id: 'yinyang',
    ascii: 'yinyang',
    unicode: 'Yīn-yáng',
    greek: '陰陽',
    pantheon: 'taoist',
    tier: '2',
    tierLabel: 'Tier 2',
    domain: 'Cosmic Duality',
    meaning: 'Interdependence of opposites',
    sources: ['I Ching', 'Chinese classics'],
    breakdown: [
      { char: 'y', to: 'Y', type: 'same', note: 'Same, capitalized' },
      { char: 'i', to: 'ī', type: 'length', note: 'Macron: level tone' },
      { char: 'n', to: 'n', type: 'same', note: 'Same' },
      { char: '-', to: '-', type: 'same', note: 'Same' },
      { char: 'y', to: 'y', type: 'same', note: 'Same' },
      { char: 'a', to: 'á', type: 'stress', note: 'Second tone' },
      { char: 'n', to: 'n', type: 'same', note: 'Same' },
      { char: 'g', to: 'g', type: 'same', note: 'Same' }
    ]
  }
];

let added = 0;
for (const entry of newEntries) {
  if (!lexicon.find(e => e.id === entry.id)) {
    lexicon.push(entry);
    added++;
  }
}

if (added === 0) {
  console.log('No new entries to add');
  process.exit(0);
}

const body = JSON.stringify(lexicon, null, 2);
const out = `/*\n * PUNYCODEX Lexicon\n * ${lexicon.length} validated entries across multiple pantheons\n */\n\nconst LEXICON = ${body};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = { LEXICON };\n}\n`;
fs.writeFileSync(file, out.replace(/\r\n/g, '\n'), 'utf8');
console.log(`Added ${added} entries. Total: ${lexicon.length}`);
