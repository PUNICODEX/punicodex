// Register the zoroastrian scholars kit and author ashavahista's sections.
const fs = require('node:fs');

const tp = 'docs/scholarly-edition/scholarly-section-taxonomy-v0.1.json';
const tax = JSON.parse(fs.readFileSync(tp, 'utf8'));
tax.taxonomy.pantheonKits.kits.zoroastrian = {
  sections: [
    { key: 'gathas', label: 'The Gathas' },
    { key: 'avestan-texts', label: 'Avestan Texts' },
    { key: 'pahlavi-texts', label: 'Pahlavi & Sasanian Texts' },
  ],
};
fs.writeFileSync(tp, `${JSON.stringify(tax, null, 2)}\n`, 'utf8');
console.log('zoroastrian kit registered');

const cp = 'platform/scholars/content/ashavahista.json';
const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
delete c.sections.epithets;
delete c.sections['oracle-sites'];
c.sections.gathas = {
  body: "The Gathas are his charter: the seventeen hymns of Zaraθuštra, where Aša Vahišta appears not as a principle but as a presence — the second of the Amesha Spentas, addressed by name in the Aša and Vahištas of the hymn-cycles. In the Gathas he is the answer to the prophet's central question — what upholds the world? — and the fire through which every soul is finally read. The ašem-vohū verse (\"aša is the best, it is happiness\"), the faith's most-recited line, is his own refrain.",
  sources: [{ citation: 'The Gathas (Yasna 27–53); the ašem-vohū verse.' }],
  generatedFrom: ['hand-authored'],
  bespoke: true,
};
c.sections['avestan-texts'] = {
  body: "The wider Avesta completes his office: the Yasna's fire-liturgy keeps the altar-flame as his presence, the Vendidad sets the ordeal-fire that proves the truthful, and the Yašts hymn the Amesha Spentas as persons, not powers. The texts are precise about the element: fire belongs to Aša Vahišta — not as fuel but as the instrument of the assay, the light that does not lie. Every Zoroastrian worship act, from the daily gāh to the great yasna, is his liturgy in action.",
  sources: [{ citation: 'Yasna; Vendidad; the Yašts.' }],
  generatedFrom: ['hand-authored'],
  bespoke: true,
};
c.sections['pahlavi-texts'] = {
  body: "The Sasanian books keep him at state scale: the Bundahišn's cosmology lists Ašwahišt among the six Bounteous Immortals of Ohrmazd's council, the Dēnkard's theology gives him the fire of the final ordeal, and the royal inscriptions of the Sasanian kings invoke the fires Adur Gušnasp, Adur Farnbag, and Adur Anāhīd as the realm's three great altars. The Pahlavi commentaries (zand) on the Gathas are the oldest systematic exegesis of his name: Aša as the order that speech must serve.",
  sources: [{ citation: 'Bundahišn; Dēnkard; the Sasanian royal inscriptions.' }],
  generatedFrom: ['hand-authored'],
  bespoke: true,
};
fs.writeFileSync(cp, `${JSON.stringify(c, null, 2)}\n`, 'utf8');
console.log('ashavahista kit sections authored');
