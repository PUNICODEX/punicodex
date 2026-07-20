// Applies batch G (Ašavahišta, Stýx): lore, scholars kits, kin, industry.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const data = require(path.join(__dirname, 'enrich-g.js'));
const lorePath = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(lorePath, 'utf8'));

const KIN = {
  ashavahista: [
    ['Avestan', 'aša vahišta'],
    ['Pahlavi', 'Ašwahišt'],
    ['Cognate (Vedic)', 'ṛta'],
    ['Owned form', 'Ašavahišta'],
  ],
  styx: [
    ['Greek', 'Στύξ'],
    ['Latin', 'Styx'],
    ['Her children', 'Bía, Zêlos, Krátos, Níkē'],
    ['Owned form', 'Stýx'],
  ],
};

const PRON = {
  ashavahista: {
    ipa: '/a.ʃaː.va.hiʃ.taː/',
    ipaLabel: 'Avestan Reconstruction',
    approximation: 'ah-shah-vah-HISH-tah — two sharp š sibilants, even vowels.',
  },
  styx: {
    ipa: '/stýks/',
    ipaLabel: 'Attic Greek Reconstruction',
    approximation: 'STEEX — one syllable, acute on the only vowel there is.',
  },
};

const KIT = {
  // styx: greek kit
  styx: {
    'homeric-hymns': {
      body: `No Homeric Hymn addresses her — the river does not receive song, she receives vows. But the Iliad gives her the epic's most solemn formula: "let this now be my inviolable oath by the water of Stýx, that dread water" — repeated in the divine councils whenever the gods must bind themselves (Iliad 2.755, 15.37). The Hymn to Demeter uses the same formula for the gods' witnesses. Her hymnic presence is not in hymns to her but in every oath sworn on her: the liturgy is the Iliad itself.`,
      sources: [{ citation: 'Homer, Iliad 2.755, 15.37; Homeric Hymn to Demeter 259.' }],
    },
    epithets: {
      body: `Her titles are all offices of the vow.

- **ἡ πρεσβυτάτη** — 'the eldest'; first-born daughter of Ōkeanos and Tēthys.
- **ἡ δεινή** — 'the dread'; the water the gods fear to forswear.
- **μήτηρ Νίκης** — 'mother of Victory'; Níkē's parent, honored by Zeús above all waters.
- **ἡ ψυχρή** — 'the cold one'; the stream that chills even Olympos.`,
      sources: [{ citation: 'Hesiod, Theogony 383–403, 775–806.' }],
    },
    'oracle-sites': {
      body: `Her only sanctuary is the waterfall: the **Styx of Nonakris** in Arcadia, a cliff-plunge in the northern Peloponnese whose stream the locals swore by — Pausanias reports the oath and the cliff, and the Aroania gorge (the Kráthis) is shown to travelers as her water to this day. No temple was ever built to her, because she needed none: the vow is the cult, and the cliff is the shrine. Her other home is the underworld's own geography — the nine-circling stream of the dead's boundary, the river every underworld itinerary must name first.`,
      sources: [{ citation: 'Pausanias 8.17–18; Hesiod, Theogony 785–806.' }],
    },
    iconography: {
      body: `She has almost no ancient image — a river that is also a law is hard to paint. Her iconography is her family: **Níkē** (winged Victory, her daughter, among the most-copied figures in art), and the Roman underworld scenes where her stream is the boundary Charon's boat crosses. Dante\'s fifth-circle marsh — the angry fighting in her mud — is her medieval portrait. Her truest image is textual: the Iliad's formula, "the dread water," repeated until the phrase itself became her icon.`,
      sources: [{ citation: 'The Theogony\'s Níkē tradition; Dante, Inferno 7–8.' }],
    },
  },
  // ashavahista: zoroastrian — no kit in taxonomy; epithets+oracle-sites via roman-style custom sections
  ashavahista: {
    epithets: {
      body: `His titles are the Avesta's own.

- **Aša Vahišta** — 'Best Righteousness'; the full name in the Gathas.
- **Amesha Spenta** — 'Bounteous Immortal'; the office he shares with the six.
- **Ašwahišt** — his Pahlavi name in the Sasanian books.
- **Guardian of the Fire** — his elemental office, the altar-flame itself.`,
      sources: [{ citation: 'The Gathas (Yasna); the Sasanian Pahlavi books.' }],
    },
    'oracle-sites': {
      body: `His sanctuaries are the fire-temples: **Adur Gušnasp at Takht-e Soleyman** (Sasanian, UNESCO World Heritage) — the fire of kings, where the lake-crater temple kept the altar-flame for centuries; **Adur Farnbag in Fars**, the fire of priests; and the living **Atash Behram of Yazd**, whose flame has burned continuously since 470 CE — his element tended, unbroken, for over fifteen centuries. The Persepolis reliefs show the fire-altar in royal worship five centuries earlier: the oldest continuous flame-cult in the world is his.`,
      sources: [{ citation: 'UNESCO Takht-e Soleyman; the Yazd Atash Behram records; Persepolis reliefs.' }],
    },
  },
};

const DROP = ['overview', 'pronunciation', 'symbols', 'mythology', 'syncretism', 'cultural-legacy', 'archaeology', 'scholarly-sources', 'meditation', 'domains', 'original-script'];

const PRONKIT = {};

for (const [id, e] of Object.entries(data)) {
  const cur = lore[id] || {};
  cur.pronunciation = { ...(PRON[id] || {}), note: e.pronunciationNote, kin: (KIN[id] || []).map(([label, form]) => ({ label, form })) };
  cur.domains = e.domains;
  cur.symbols = e.symbols;
  cur.mythology = e.mythology;
  cur.syncretism = e.syncretism;
  cur.culturalLegacy = e.culturalLegacy;
  cur.extendedMeditation = e.extendedMeditation;
  cur.sources = e.sources;
  cur.archaeology = e.archaeology;
  lore[id] = cur;

  const cp = path.join(ROOT, 'platform', 'scholars', 'content', `${id}.json`);
  const c = fs.existsSync(cp) ? JSON.parse(fs.readFileSync(cp, 'utf8')) : { entryId: id, contentVersion: 1, sections: {} };
  c.sections = c.sections || {};
  for (const [key, sec] of Object.entries(KIT[id] || {})) {
    c.sections[key] = { body: sec.body, sources: sec.sources, generatedFrom: ['hand-authored'], bespoke: true };
  }
  for (const k of DROP) delete c.sections[k];
  fs.writeFileSync(cp, `${JSON.stringify(c, null, 2)}\n`, 'utf8');
}

fs.writeFileSync(lorePath, `${JSON.stringify(lore, null, 2)}\n`, 'utf8');
console.log('batch G applied (ashavahista + styx)');

// Industry patterns
const IND = 'type/js/industry-patterns.js';
let ind = fs.readFileSync(IND, 'utf8');
const ADDS = {
  faith: [
    `      { id: 'ashavahista', weight: 2 },`,
    `      { id: 'styx', weight: 1, why: 'The oath-water; the oldest contract cult in the West.' },`,
  ],
  'legal-justice': [
    `      { id: 'styx', weight: 2, why: 'The river of the oath — the original binding agreement.' },`,
    `      { id: 'ashavahista', weight: 1, why: 'Aša, the cosmic audit; truth as an institution.' },`,
  ],
  'thermal-energy': [`      { id: 'ashavahista', weight: 1, why: 'The altar-flame; fire as the tester, not the destroyer.' },`],
  'water-utilities': [`      { id: 'styx', weight: 1, why: 'The boundary stream; the underworlds own waterworks.' },`],
  'travel-tourism': [
    `      { id: 'ashavahista', weight: 1, why: 'Takht-e Soleyman and the Yazd flame — fire-temple pilgrimage.' },`,
    `      { id: 'styx', weight: 1, why: 'The Arcadian waterfall; the oath-cliff of Nonakris.' },`,
  ],
  'philosophy-ethics': [
    `      { id: 'ashavahista', weight: 2, why: 'Good thought, good word, good deed — the oldest ethics syllabus.' },`,
    `      { id: 'styx', weight: 1, why: 'The binding word; the philosophy of promises.' },`,
  ],
};
for (const [gid, lines] of Object.entries(ADDS)) {
  const marker = `industry: '${gid}',`;
  const gi = ind.indexOf(marker);
  const ei = ind.indexOf('entries: [', gi);
  const insertAt = ind.indexOf('\n', ei) + 1;
  ind = ind.slice(0, insertAt) + lines.join('\n') + '\n' + ind.slice(insertAt);
}
fs.writeFileSync(IND, ind, 'utf8');
console.log('industry patterns added');
