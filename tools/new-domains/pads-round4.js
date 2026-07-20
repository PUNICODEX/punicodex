// Final meditation pads for the 7 remaining short posts.
const fs = require('node:fs');

const pads = {
  oba: `<p>Her lake keeps what the palace could not: a congregation that has never once asked her to be anyone else. The covered ear, the crown, the river, the patience — the whole of her is a single sentence, and it reads the same in Ọṣogbo and Matanzas: endurance is not surrender; it is sovereignty, kept quietly, until the storm runs out of thunder.</p>`,
  orun: `<p>And the names go on arriving: Ọlọ́run for the owner, Ọ̀rúnmìlà for the knowing, Ọba-Ọrun for the kingly — heaven filed into a thousand birth certificates, each child a new piece of the sky on earth. The Yoruba answer to 'where is heaven?' was never a direction. It was a custody arrangement, and the paperwork is the people.</p>`,
  sani: `<p>His temple etiquette is the final lesson: oil poured, iron touched, crows fed before breakfast, and then the week begins — small debts paid in advance against the slow account. India has refined the art of living under Saturn into a weekly hygiene, and it works exactly as intended: the audit, when it comes, finds everything already in order.</p>`,
  mixcoatl: `<p>Look up on a dry winter night from the same deserts his people crossed: the serpent still pours itself across the sky, head south, tail north, the oldest road sign in the hemisphere. The empires built on his route are dust in his direction, and the migrants still walking it are his living congregation — the hunt, the road, the star, unchanged.</p>`,
  mazu: `<p>Her economy is miracles per capita, and her ledger is full: every coastal family keeps one — the grandfather guided home, the net that held, the storm that turned. Gratitude at that scale stops being sentiment and becomes infrastructure, the sea's own safety service, funded by incense, staffed by a daughter of Fujian, open every hour of every storm.</p>`,
  kartikeya: `<p>The rooster on his banner crows for the war he never had to fight twice: one battle, properly timed, permanently won. The hills, the spear, the six, the stars — everything about him is an argument for doing the decisive thing early and well, and then, like a good commander, letting the calendar do the remembering.</p>`,
  gauri: `<p>The wedding hymns still ask for what she embodies: a marriage entered by choice, won by patience, and kept by mutual worship — the golden standard set not by a fairy tale but by a girl from the mountains who out-waited a god. Every Gaurī festival is, at heart, that girl's biography read aloud to the next generation of daughters.</p>`,
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
console.log('final pads applied:', Object.keys(pads).length);
