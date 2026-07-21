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
const g = JSON.parse(fs.readFileSync('scripts/gallery-data.json', 'utf8'));

// ATHENA: fix institutions + mediums
const at = g.athena.images;
at[4].caption =
  '<strong>Athena Promachos</strong> — Attic black-figure by the Burgon Group, c. 560 BCE. "She who fights in the front line." <span class="gallery-credit">Public domain via Wikimedia Commons.</span>';
at[4].alt = 'Attic black-figure Athena Promachos by the Burgon Group, c. 560 BCE.';
at[7].caption =
  "<strong>The Birth of Athena</strong> — Black-figure amphora, c. 550 BCE. Louvre, Paris (F 32). She springs fully armed from Zeus's head. <span class=\"gallery-credit\">Public domain via Wikimedia Commons.</span>";
at[7].alt = 'The Birth of Athena, black-figure amphora c. 550 BCE, Louvre F 32.';
at[8].caption =
  '<strong>Helmeted Athena</strong> — National Archaeological Museum, Athens (inv. 1763). The face beneath the Corinthian helmet: calm, knowing, and utterly unafraid. <span class="gallery-credit">Public domain via Wikimedia Commons.</span>';
at[8].alt = 'Helmeted head of Athena, National Archaeological Museum, Athens, inv. 1763.';

// ZEUS: remove the Akrotiri fisherman (not a deity); fix Ganymede
const z = g.zeus.images;
const akrotiri = z.findIndex((im) => /Fisherman_Fresco/i.test(im.src));
if (akrotiri >= 0) z.splice(akrotiri, 1);
const gan = z.find((im) => /Ganymedes_Zeus_MET/i.test(im.src));
if (gan) {
  gan.caption =
    '<strong>Zeus and Ganymede</strong> — Terracotta group from Olympia, c. 480–470 BCE. The eagle-god seizes the Trojan prince. The Metropolitan Museum, New York (on loan, L.1999.10.14). <span class="gallery-credit">Public domain via Wikimedia Commons.</span>';
  gan.alt = 'Zeus and Ganymede, terracotta group from Olympia c. 480-470 BCE, Metropolitan Museum (on loan).';
}

// MARA: curated captions for all six
const m = g.mara.images;
const caps = [
  [
    '<strong>The Temptation at Ajanta</strong> — a 19th-century sketch of Cave 26 beside the modern photograph: the same carved assault, two centuries apart. <span class="gallery-credit">Public domain / CC BY-SA via Wikimedia Commons.</span>',
    'Ajanta Cave 26 temptation, 19th-century sketch and 21st-century photograph.',
  ],
  [
    '<strong>The Temptation of the Buddha</strong> — Museum Rietberg, Zürich (RVI 25). The daughters of the Tempter dance while his armies break. <span class="gallery-credit">Public domain via Wikimedia Commons.</span>',
    'The Temptation of the Buddha, Museum Rietberg RVI 25.',
  ],
  [
    '<strong>Cave 26, Ajanta</strong> — the Temptation of the Buddha carved in stone, c. 5th–6th century CE. <span class="gallery-credit">Photo CC0 via Wikimedia Commons.</span>',
    'Temptation of the Buddha, Ajanta Cave 26.',
  ],
  [
    '<strong>The Army of the Tempter Routed</strong> — the daughters and demons of Māra in flight, from Sanchi. <span class="gallery-credit">Public domain via Wikimedia Commons.</span>',
    'Mara and his daughters with the demons of Mara fleeing, Sanchi.',
  ],
  [
    '<strong>Drum Panel</strong> — the Great Departure and the Temptation of the Buddha: two stations of the story on one panel. <span class="gallery-credit">CC0 via Wikimedia Commons.</span>',
    'Drum panel with Great Departure and Temptation of the Buddha scenes.',
  ],
  [
    '<strong>The Hosts of the Tempter Scatter</strong> — the army of Māra flees as the Bodhisattva touches the earth. <span class="gallery-credit">Photo: Biswarup Ganguly. CC BY 3.0 via Wikimedia Commons.</span>',
    "Temptation of the Buddha with Mara's army fleeing.",
  ],
];
m.forEach((im, i) => {
  if (caps[i]) {
    im.caption = caps[i][0];
    im.alt = caps[i][1];
  }
});

rw('scripts/gallery-data.json', `${JSON.stringify(g, null, 2)}\n`);
console.log('athena:', g.athena.images.length, '| zeus:', g.zeus.images.length, '| mara:', g.mara.images.length);
