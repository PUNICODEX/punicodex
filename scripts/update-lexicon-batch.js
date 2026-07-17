const fs = require('fs');
const vm = require('vm');
const path = require('path');

const LEXICON_PATH = path.join(__dirname, '..', 'type', 'js', 'lexicon.js');
const src = fs.readFileSync(LEXICON_PATH, 'utf8');

const headerMatch = src.match(/\/\*[\s\S]*?\*\//);
const header = headerMatch ? headerMatch[0] : '/* PUNICODEX Lexicon */';

const lexicon = vm.runInNewContext(`(function(){\n${src}\nreturn LEXICON;})()`);

function find(id) { return lexicon.find(e => e.id === id); }
function updateId(entry, newId) {
  entry.id = newId;
  entry.ascii = newId;
}

const shango = find('shango');
if (shango) {
  shango.unicode = 'Ṣàngó';
  shango.meaning = shango.meaning || 'He who strikes';
  shango.breakdown = [
    { char: 's', to: 'Ṣ', type: 'special', note: 'S with dot below' },
    { char: 'h', to: '', type: 'drop', note: 'Not written' },
    { char: 'a', to: 'à', type: 'stress', note: 'Grave on a' },
    { char: 'n', to: 'n', type: 'same', note: 'Same' },
    { char: 'g', to: 'g', type: 'same', note: 'Same' },
    { char: 'o', to: 'ó', type: 'stress', note: 'Acute on o' }
  ];
}

const oshun = find('oshun');
if (oshun) {
  // Keep id/ascii as oshun; domain ọṣun.com maps here
  oshun.unicode = 'Ọṣun';
}

const babaluaye = find('babaluaye');
if (babaluaye) {
  // Keep id/ascii as babaluaye; domain ọbalúayé.com maps here
  babaluaye.unicode = 'Ọbalúayé';
  babaluaye.meaning = babaluaye.meaning || 'Lord of the world';
  babaluaye.domain = babaluaye.domain || 'Disease, Healing, Earth';
  // ascii is babaluaye (9 chars); unicode Ọbalúayé is 8 chars. Need breakdown with drop.
  babaluaye.breakdown = [
    { char: 'b', to: 'Ọ', type: 'special', note: 'Initial b becomes Ọ' },
    { char: 'a', to: 'b', type: 'special', note: 'Shifted consonant' },
    { char: 'b', to: 'a', type: 'special', note: 'Shifted vowel' },
    { char: 'a', to: 'l', type: 'special', note: 'Shifted consonant' },
    { char: 'l', to: 'ú', type: 'stress', note: 'Acute on u' },
    { char: 'u', to: 'a', type: 'special', note: 'Shifted vowel' },
    { char: 'a', to: 'y', type: 'special', note: 'Shifted consonant' },
    { char: 'y', to: 'é', type: 'stress', note: 'Acute on e' },
    { char: 'e', to: '', type: 'drop', note: 'Not written' }
  ];
}

const eshu = find('eshu');
if (eshu) {
  // Keep id/ascii as eshu; domain ẹṣu.com maps here
  eshu.unicode = 'Ẹṣu';
}

const ameretat = find('ameretat');
if (ameretat) {
  ameretat.unicode = 'Amərətāt';
}

const obatala = find('obatala');
if (obatala) {
  obatala.unicode = 'Ọbatálá';
  obatala.breakdown = [
    { char: 'o', to: 'Ọ', type: 'special', note: 'O with dot below' },
    { char: 'b', to: 'b', type: 'same', note: 'Same' },
    { char: 'a', to: 'a', type: 'same', note: 'Same' },
    { char: 't', to: 't', type: 'same', note: 'Same' },
    { char: 'a', to: 'á', type: 'stress', note: 'Acute on a' },
    { char: 'l', to: 'l', type: 'same', note: 'Same' },
    { char: 'a', to: 'á', type: 'stress', note: 'Acute on a' }
  ];
}

const olodumare = find('olodumare');
if (olodumare) {
  olodumare.unicode = 'Olódùmarè';
  olodumare.breakdown = [
    { char: 'o', to: 'O', type: 'same', note: 'Same, capitalized' },
    { char: 'l', to: 'l', type: 'same', note: 'Same' },
    { char: 'o', to: 'ó', type: 'stress', note: 'Acute on o' },
    { char: 'd', to: 'd', type: 'same', note: 'Same' },
    { char: 'u', to: 'ù', type: 'stress', note: 'Grave on u' },
    { char: 'm', to: 'm', type: 'same', note: 'Same' },
    { char: 'a', to: 'a', type: 'same', note: 'Same' },
    { char: 'r', to: 'r', type: 'same', note: 'Same' },
    { char: 'e', to: 'è', type: 'stress', note: 'Grave on e' }
  ];
}

const rhea = find('rhea');
if (rhea) {
  rhea.unicode = 'Rhéā';
  rhea.breakdown = [
    { char: 'r', to: 'R', type: 'same', note: 'Same, capitalized' },
    { char: 'h', to: 'h', type: 'same', note: 'Same' },
    { char: 'e', to: 'é', type: 'stress', note: 'Acute on e' },
    { char: 'a', to: 'ā', type: 'length', note: 'Macron on a' }
  ];
}

const huitzi = find('huitzilopochtli');
if (huitzi) {
  huitzi.unicode = 'Huitzilopōchtli';
  let oCount = 0;
  for (const item of huitzi.breakdown) {
    if (item.char === 'o') {
      oCount++;
      if (oCount === 2) {
        item.to = 'ō';
        item.type = 'length';
        item.note = 'Macron on o';
      }
    }
  }
}

if (!find('cihuacoatl')) {
  lexicon.push({
    id: 'cihuacoatl',
    ascii: 'cihuacoatl',
    unicode: 'Cihuacōātl',
    greek: '—',
    pantheon: 'nahuatl',
    tier: '2',
    tierLabel: 'Tier 2',
    domain: 'Childbirth, Motherhood, Earth',
    meaning: 'Snake Woman',
    sources: ['Sahagún'],
    breakdown: [
      { char: 'c', to: 'C', type: 'same', note: 'Same, capitalized' },
      { char: 'i', to: 'i', type: 'same', note: 'Same' },
      { char: 'h', to: 'h', type: 'same', note: 'Same' },
      { char: 'u', to: 'u', type: 'same', note: 'Same' },
      { char: 'a', to: 'a', type: 'same', note: 'Same' },
      { char: 'c', to: 'c', type: 'same', note: 'Same' },
      { char: 'o', to: 'ō', type: 'length', note: 'Macron on o' },
      { char: 'a', to: 'ā', type: 'length', note: 'Macron on a' },
      { char: 't', to: 't', type: 'same', note: 'Same' },
      { char: 'l', to: 'l', type: 'same', note: 'Same' }
    ]
  });
}

const newSrc = `${header}\n\nconst LEXICON = ${JSON.stringify(lexicon, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = { LEXICON };\n}\n`;
fs.writeFileSync(LEXICON_PATH, newSrc, 'utf8');
console.log('Updated lexicon.js');
console.log('Entries:', lexicon.length);
