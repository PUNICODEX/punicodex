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

let s = fs.readFileSync('type/js/lexicon.js', 'utf8');
s = s.replace('"unicode": "Sphigx"', '"unicode": "Sphínx"');
s = s.replace('"unicode": "sꜥ"', '"unicode": "sꜣ"');
s = s.replace('"unicode": "Iūppiter"', '"unicode": "Iūpiter"');
rw('type/js/lexicon.js', s);

const { LEXICON } = require('../type/js/lexicon.js');
for (const id of ['sphinx', 'sia', 'iuppiter', 'mengpo']) {
  const e = LEXICON.find((x) => x.id === id);
  console.log(id.padEnd(9), e.unicode, '|', JSON.stringify((e.breakdown || []).map((b) => `${b.char}>${b.to}`)));
}
