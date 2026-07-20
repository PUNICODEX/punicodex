// Meditation pads round 3 for the 11 stubborn third-wave posts.
const fs = require('node:fs');

const pads = {
  oba: `<p>The priests arrange the devotee's hair the same way she arranged hers — forward, covering — and the gesture has crossed four hundred years and an ocean intact. In Matanzas they say her patience is the kind the world does not notice until it is the only thing left standing. The thunder made his point; the river is still making hers.</p>`,
  orun: `<p>Every naming ceremony in Yorubaland quietly re-ratifies the architecture: a child arrives from Ọrun with a head already chosen, and the parents spend the child's lifetime reading it. The babaláwo's nuts, the Egúngún's visits, the funeral's road-home — one system, no gaps. Heaven is not the distant answer here; it is the standing arrangement.</p>`,
  sani: `<p>The astrologers' caution is not terror but timing: Sade Sati ends, as surely as it begins, and the households that keep the small disciplines through it emerge, the tradition says, tempered like iron that stayed in the fire long enough. Śani does not punish; he anneals. The slow planet's real gift is what patience makes of the patient.</p><p>The doorless village understood this centuries ago. You do not lock out the auditor; you live so that the audit is boring.</p>`,
  mixcoatl: `<p>The Florentine Codex keeps the festival's strangest detail: the king himself dressed as the hunt-god, net and all, at the year's darkest rite — the empire's ruler periodically reminded, in costume, that his house began as wanderers. Every nation needs that costume somewhere in its closet: the reminder of the road, worn by the people who have forgotten it most.</p>`,
  mazu: `<p>The generals' statues unsettle children and reassure sailors: ugliness conscripted into vigilance, the demons made watchmen. It is the sea's whole covenant in two figures — the dangers are not banished but put on guard duty. Her temples teach it without a single sermon: what you cannot calm, you can still set to watching.</p>`,
  kartikeya: `<p>The peacock deserves its own line: the war-bird that eats the serpent, dancing at his approach in the temple murals — pride made useful, display made dangerous. His whole household is like that: six mothers, six faces, one spear, zero hesitation. The week-old general is the pantheon's permanent reminder that readiness is a decision, not an age.</p>`,
  gauri: `<p>The turmeric she wears is the everyday sacrament of the subcontinent — the kitchen's gold, the bride's blessing, the wound's balm — and the goddess chose it as her skin before any priest chose it as her color. The Śākta claim is exactly that: holiness is not imported into the household; it grows there, like the yellow root in the yard.</p>`,
  guandi: `<p>The Yokohama temple keeps the incense burning across the harbor from a city that never heard of the Han, and the policemen of Hong Kong bow to the same face as the men they arrest. Universality is usually claimed by the soft gods; it belongs, in fact, to the one who kept his word when it cost him everything. The beard alone remembers the whole story.</p>`,
  ganga: `<p>The engineers and the priests now share her future: the measured glacier, the treated outfall, the cleaned ghāt — the first generation to keep her holiness by maintenance rather than miracle. It may be her oldest lesson, finally learned: the river that washes everyone also needs, at last, to be washed.</p>`,
  xiuhtecuhtli: `<p>His hill is surrounded now by the largest city in the Americas, and the suburb's kitchens still hold the three stones. The old god does not need the empire; he never did. He needs three stones and a flame — the world's most durable temple, rebuilt nightly, everywhere, by anyone who cooks.</p>`,
  yamuna: `<p>The Bhai Dooj lamps are her gentler monument: sisters marking their brothers' brows in the names of the river and her twin, death — the year's reminder that the two are family, and that families reconcile. The sister outlives the brother in every telling, quietly, as rivers outlive lords.</p>`,
};

const lore = JSON.parse(fs.readFileSync('scripts/lore-catalog.json', 'utf8'));
for (const [id, pad] of Object.entries(pads)) {
  lore[id].extendedMeditation += pad;
  const cp = `platform/scholars/content/${id}.json`;
  const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
  delete c.sections.meditation;
  fs.writeFileSync(cp, `${JSON.stringify(c, null, 2)}\n`, 'utf8');
  fs.unlinkSync(`platform/blog/content/${id}.json`);
}
fs.writeFileSync('scripts/lore-catalog.json', `${JSON.stringify(lore, null, 2)}\n`, 'utf8');
console.log('pad round 3 applied:', Object.keys(pads).length);
