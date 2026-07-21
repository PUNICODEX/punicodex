const fs = require('node:fs');
function rw(p, s) {
  for (let i = 0; i < 12; i++) {
    try {
      fs.writeFileSync(p, s);
      return;
    } catch (e) {
      if (i === 11) throw e;
      require('node:child_process').spawnSync('node', ['-e', 'setTimeout(()=>{},400)']);
    }
  }
}

const B = {
  sia: [
    ['s', 's', 'same', 'Same'],
    ['i', 'j', 'special', 'Yod-glide (dual reed leaves 𓇌)'],
    ['a', 'ꜣ', 'special', 'Egyptological alef (𓄿)'],
  ],
  huitzilopochtli: [
    ['h', 'H', 'same', 'Same, capitalized'], ['u', 'u', 'same', 'Same'], ['i', 'ī', 'length', 'Macron: long /iː/'],
    ['t', 't', 'same', 'Same'], ['z', 'z', 'same', 'Same'], ['i', 'i', 'same', 'Same'], ['l', 'l', 'same', 'Same'],
    ['o', 'ō', 'length', 'Macron: long /oː/'], ['p', 'p', 'same', 'Same'], ['o', 'ō', 'length', 'Macron: long /oː/'],
    ['c', 'c', 'same', 'Same'], ['h', 'h', 'same', 'Same'], ['t', 't', 'same', 'Same'], ['l', 'l', 'same', 'Same'], ['i', 'i', 'same', 'Same'],
  ],
  itzpapalotl: [
    ['i', 'Ī', 'length', 'Macron: long /iː/'], ['t', 't', 'same', 'Same'], ['z', 'z', 'same', 'Same'],
    ['p', 'p', 'same', 'Same'], ['a', 'ā', 'length', 'Macron: long /aː/'], ['p', 'p', 'same', 'Same'],
    ['a', 'ā', 'length', 'Macron: long /aː/'], ['l', 'l', 'same', 'Same'], ['o', 'ō', 'length', 'Macron: long /oː/'],
    ['t', 't', 'same', 'Same'], ['l', 'l', 'same', 'Same'],
  ],
  tezcatlipoca: [
    ['t', 'T', 'same', 'Same, capitalized'], ['e', 'ē', 'length', 'Macron: long /eː/'], ['z', 'z', 'same', 'Same'],
    ['c', 'c', 'same', 'Same'], ['a', 'a', 'same', 'Same'], ['t', 't', 'same', 'Same'], ['l', 'l', 'same', 'Same'],
    ['i', 'ī', 'length', 'Macron: long /iː/'], ['p', 'p', 'same', 'Same'], ['o', 'ō', 'length', 'Macron: long /oː/'],
    ['c', 'c', 'same', 'Same'], ['a', 'a', 'same', 'Same'],
  ],
  hp: [
    ['h', 'Ḥ', 'special', 'Pharyngeal ḥ'],
    ['p', 'ꜥpy', 'merge', 'Ayin (ꜥ) + p + y — full skeleton ḥꜥpy'],
  ],
  apep: [
    ['a', 'ꜥ', 'special', 'Egyptological ayin (𓂝)'],
    ['p', 'ꜣ', 'special', 'Egyptological alef (𓄿)'],
    ['e', 'p', 'special', 'Second p of the skeleton'],
    ['p', 'p', 'same', 'Same'],
  ],
  dagan: [
    ['d', 'D', 'same', 'Same, capitalized'], ['a', 'ā', 'length', 'Macron: long /aː/'], ['g', 'g', 'same', 'Same'],
    ['a', 'ā', 'length', 'Macron: long /aː/ (Dāgān)'], ['n', 'n', 'same', 'Same'],
  ],
  mot: [
    ['m', 'M', 'same', 'Same, capitalized'], ['o', 'ū', 'length', 'Macron: long /uː/ (Mūt)'], ['t', 't', 'same', 'Same'],
  ],
  oba: [
    ['o', 'Ọ', 'special', 'O with dot below: open /ɔ/'], ['b', 'b', 'same', 'Same'],
    ['a', 'à', 'stress', 'Grave: low tone'],
  ],
  athena: [
    ['a', 'A', 'same', 'Same, capitalized'], ['t', 't', 'same', 'Same'], ['h', 'h', 'same', 'Same'],
    ['e', 'ē', 'length', 'Macron: long eta'], ['n', 'n', 'same', 'Same'],
    ['a', 'â', 'stress', 'Circumflex: stress + length on the contracted final alpha (Ἀθηνᾶ)'],
  ],
  eshu: [
    ['e', 'Ẹ', 'special', 'E with dot below: open /ɛ/'], ['s', 'ṣ', 'special', 'S with dot below: /ʃ/'],
    ['u', 'ù', 'stress', 'Grave: low tone'],
  ],
  obatala: [
    ['o', 'Ọ', 'special', 'O with dot below: open /ɔ/'], ['b', 'b', 'same', 'Same'],
    ['a', 'à', 'stress', 'Grave: low tone'], ['t', 't', 'same', 'Same'],
    ['a', 'á', 'stress', 'Acute: high tone'], ['l', 'l', 'same', 'Same'], ['a', 'á', 'stress', 'Acute: high tone'],
  ],
  prometheus: [
    ['p', 'P', 'same', 'Same, capitalized'], ['r', 'r', 'same', 'Same'], ['o', 'o', 'same', 'Same'],
    ['m', 'm', 'same', 'Same'], ['e', 'ē', 'length', 'Macron: long eta'], ['t', 't', 'same', 'Same'],
    ['h', 'h', 'same', 'Same'], ['e', 'e', 'same', 'Same'], ['u', 'ú', 'stress', 'Acute on the ultima (Προμηθεύς)'],
    ['s', 's', 'same', 'Same'],
  ],
};

let src = fs.readFileSync('type/js/lexicon.js', 'utf8');
for (const [id, rows] of Object.entries(B)) {
  const anchor = `"id": "${id}"`;
  const i = src.indexOf(anchor);
  if (i === -1) {
    console.log('MISSING', id);
    continue;
  }
  const bStart = src.indexOf('"breakdown": [', i);
  const bEnd = src.indexOf('\n    ]', bStart) + 6;
  const bd =
    '"breakdown": [\n' +
    rows
      .map(
        ([c, t, ty, n]) =>
          `      { "char": "${c}", "to": "${t}", "type": "${ty}", "note": "${n}" }`,
      )
      .join(',\n') +
    '\n    ]';
  src = src.slice(0, bStart) + bd + src.slice(bEnd);
  console.log('breakdown updated:', id);
}
rw('type/js/lexicon.js', src);
