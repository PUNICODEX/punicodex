// Meditation pads round 2 for the 14 short third-wave blog posts.
const fs = require('node:fs');

const pads = {
  ceres: `<p>Her games told the same truth in lighter dress: the Cerealia, when the city ate well and played hard in her honor, because the goddess of bread was never a goddess of guilt. The granary was her temple; the festival, her thanks; and the law carved at her door was her reminder that food and fairness grow in the same field.</p>`,
  ganga: `<p>They call her the milky river in the heavens and the dark river in the plains, and both are correct: she is the galaxy's reflection taught to run downhill. The pilgrim cups her water in both hands and holds, for a moment, the whole map — mountain, ocean, heaven, and home.</p>`,
  gauri: `<p>The bilva tree she tended in penance still gets her offerings: the leaf of the fierce god laid daily at the feet of the gentle mother, the marriage remembered in every Shiva temple's morning routine. The tradition keeps its accounts: she won the wedding by work, and the work is still worshipped.</p>`,
  guandi: `<p>His books never sold a single copy of an excuse. The Romance made him perfect and the people made him useful — the merchant's guarantee, the brotherhood's witness, the empire's conscience with a beard. Every red-faced statue asks the same question to whoever lights the incense: what is your word worth, general?</p>`,
  hanuman: `<p>The Jāmbavān moment is the one India loves most: before the leap, the old bear reminds him of his strength — because the curse had made him forget. Everyone keeps a Hanumān inside, the strength mislaid until someone says its name aloud. The whole Chālīsā is, in a way, that reminder set to verse.</p>`,
  kartikeya: `<p>The Pleiades still rise over Palani in his season, the six star-mothers keeping their appointment with the son. Astronomy and affection never separated in his cult: look up, the stars; look down, the hills; look inward, the spear. Three temples, one war-god, no waiting.</p>`,
  mazu: `<p>Her sea is the busiest water in human history — the straits that carried tea, silk, migrants, and war — and her temples face it still, unmoved by cargo schedules. The junks are gone; the lantern remains. Every container ship passing the Taiwan Strait sails through the parish of a fisherman's daughter, whether it knows it or not.</p><p>She is proof that the largest religions are made of gratitude, not doctrine. Nobody was ever converted to Māzǔ. They were simply rescued, and remembered.</p>`,
  mixcoatl: `<p>The Chichimec road is still walked, in a way: every migrant moving north across the same deserts reads the same sky. The serpent of stars has not moved; it is the walkers who change. Mixcōātl's question outlasted his temples: not what you hunt, but what star you follow — and whether you thank it when you arrive.</p>`,
  oba: `<p>The co-wives' war never officially ends in the tellings — Ọba and Ọya still cannot share a shrine — and that honesty is the corpus' gift: reconciliation is not mandatory, but endurance is possible. Her lake holds its annual mourners quietly, without demanding anyone forgive. The river just keeps being a river, which is the last word of every telling.</p>`,
  orun: `<p>The Ifá verses insist the choosing of orí is both gift and contract: heaven offers, the soul accepts, memory is wiped, and life is the slow reading of the agreement. It is the most humane theory of destiny ever written — you signed it yourself, so stop complaining and start reading. The babaláwo is only the notary.</p>`,
  pluto: `<p>The devotio at his gate is Rome's darkest and most instructive rite: when the city could not win, it fed the deep its bravest, and history says the war turned. Plūtō's lesson is the one empires learn last — the deep takes payment in advance, in courage, and returns it as history. Every treasury and every cemetery is his bookkeeping.</p>`,
  sani: `<p>The remedies are worth reading closely: sesame oil, iron, the feeding of crows, the Saturday fast — not magic but discipline, small weekly acts of humility calibrated to his tempo. Śani is appeased by exactly what he represents: patience, repeated, in small measures, for seven and a half years if necessary. The cure and the god are the same medicine.</p>`,
  xiuhtecuhtli: `<p>The drill and the chest are the two halves of his arithmetic: the fire that is rubbed into being by hands, and the life given to keep it burning. Modern ceremonies keep the first and retire the second, and the god, presumably, accepts the revision — the hearth always preferred being fed by work anyway.</p>`,
  yamuna: `<p>The hot springs at her source still steam beside the temple, the mountain's own heat bubbling through the ice-melt — the sun's daughter announcing herself in the cold. Pilgrims cook rice in the springs as offering, a small domestic miracle at altitude: the river that feeds the plains begins, fittingly, by feeding the visitor.</p>`,
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
console.log('pad round 2 applied:', Object.keys(pads).length);
