/**
 * Wires the 39 new flagship entries into type/js/industry-patterns.js
 * (canonical). Each entry is inserted at the top of its group's entries[]
 * with weight 2 (primary) or weight 1 + why (secondary), in house style.
 */
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', '..', 'type', 'js', 'industry-patterns.js');

const ADDITIONS = {
  'sports-athletics': [
    { id: 'achilleus', weight: 2 },
    { id: 'tumatauenga', weight: 2, why: 'The haka is the world’s most famous pre-match ritual; the war-face is competition’s own.' },
    { id: 'diana', weight: 1, why: 'The huntress; the original archery and trail culture.' },
  ],
  defense: [
    { id: 'tumatauenga', weight: 2, why: 'Patron of Ngāti Tūmatauenga — the New Zealand Army bears his name.' },
    { id: 'achilleus', weight: 2 },
    { id: 'steh', weight: 2, why: 'The necessary strength posted at the prow; patron of the warrior line of pharaohs.' },
    { id: 'ogun', weight: 2, why: 'War and iron are one craft in his cult; the cutlass that clears the road.' },
    { id: 'troia', weight: 1, why: 'The ten-year siege is the template of Western war narrative.' },
    { id: 'iuppiter', weight: 1, why: 'The legion’s eagle was his; the oath of service is sworn in his name.' },
  ],
  'gaming-entertainment': [
    { id: 'achilleus', weight: 1, why: 'Hero of the original war epic; the rage-and-glory archetype of combat IP.' },
    { id: 'drakon', weight: 1, why: 'Every fantasy dragon is his descendant, hoard and coil included.' },
    { id: 'tyche', weight: 1, why: 'Chance personified; the goddess of every dice roll and loot table.' },
    { id: 'tezcatlipoca', weight: 1, why: 'The trickster-sovereign: the mirror that tests the hero, a ready-made boss mechanic.' },
  ],
  'healthcare-pharma': [
    { id: 'asklepios', weight: 2 },
    { id: 'guanyin', weight: 1, why: 'Compassion institutionalized; hospitals across East Asia bear her name.' },
    { id: 'monokeros', weight: 1, why: 'The alicorn was antiquity’s antidote; purity-testing is his oldest lore.' },
  ],
  'biotech-longevity': [
    { id: 'asklepios', weight: 2 },
    { id: 'xolotl', weight: 1, why: 'His axolotl regenerates limbs and heart — the mascot of regenerative medicine.' },
  ],
  'mental-health': [
    { id: 'guanyin', weight: 2, why: 'The vow to hear every cry; the patron of listening as care.' },
    { id: 'mengpo', weight: 1, why: 'The mercy of forgetting; the folk answer to grief and trauma.' },
  ],
  'wellness-mind': [
    { id: 'asklepios', weight: 1, why: 'Incubation sanctuaries were antiquity’s wellness retreats — sleep, dream, cure.' },
    { id: 'mengpo', weight: 1, why: 'Letting go as healing; the tea of release at the bridge.' },
  ],
  insurance: [
    { id: 'atropos', weight: 2, why: 'The measured span; actuarial science is her liturgy secularized.' },
    { id: 'tyche', weight: 2, why: 'Risk itself enthroned; underwriting is the pricing of her wheel.' },
    { id: 'yanluo', weight: 1, why: 'The exact record and the final accounting; judgment as audit.' },
  ],
  horology: [
    { id: 'atropos', weight: 1, why: 'The thread’s measure; the calendar of a life.' },
    { id: 'ianus', weight: 1, why: 'January keeps his name; the year’s door is his.' },
    { id: 'amsa', weight: 1, why: 'The year’s twelve portions; the month as allotted share.' },
  ],
  'legal-justice': [
    { id: 'yanluo', weight: 2 },
    { id: 'iuppiter', weight: 2, why: 'Per Iovem Lapidem: every oath, treaty, and contract is sworn on his stone.' },
    { id: 'atropos', weight: 1, why: 'The verdict that cannot be appealed; finality personified.' },
    { id: 'amsa', weight: 1, why: 'The just portion; inheritance and allotment law’s oldest icon.' },
  ],
  'travel-tourism': [
    { id: 'delos', weight: 2 },
    { id: 'troia', weight: 2, why: 'The ruin that became a pilgrimage; the original heritage destination.' },
    { id: 'pusan', weight: 2, why: 'The guide of roads; every journey’s escort since the Ṛgveda.' },
    { id: 'hokkaido', weight: 2 },
    { id: 'honshu', weight: 2 },
    { id: 'kyushu', weight: 2 },
  ],
  faith: [
    { id: 'delos', weight: 1, why: 'The island that is a sanctuary entire; pilgrimage’s Aegean prototype.' },
    { id: 'guanyin', weight: 2, why: 'East Asia’s most invoked name; the bodhisattva of the universal vow.' },
  ],
  maritime: [
    { id: 'neptunus', weight: 2 },
    { id: 'delos', weight: 1, why: 'The sacred harbour and the free port; the entrepôt of the Hellenistic sea.' },
  ],
  'water-utilities': [
    { id: 'neptunus', weight: 2 },
    { id: 'hp', weight: 2, why: 'The flood itself, metered by nilometers for three thousand years.' },
  ],
  cybersecurity: [
    { id: 'drakon', weight: 2, why: 'The unsleeping watcher at the perimeter; the guardian serpent of every firewall.' },
    { id: 'troia', weight: 2, why: 'The original Trojan horse; the field’s founding metaphor.' },
    { id: 'ianus', weight: 2, why: 'The gate and its keeper; access control’s oldest patron.' },
    { id: 'seiren', weight: 1, why: 'The irresistible lure; social engineering’s first case study.' },
  ],
  'startups-venture': [
    { id: 'monokeros', weight: 2, why: 'The unicorn: venture capital’s own word for the billion-dollar rarity.' },
    { id: 'pangu', weight: 2, why: 'Creation from chaos; the first founder pushing heaven and earth apart.' },
    { id: 'phanes', weight: 1, why: 'The first-shining draft; every first version before the real world begins.' },
    { id: 'ianus', weight: 1, why: 'The god of beginnings; every launch is his threshold.' },
  ],
  'gems-jewelry': [
    { id: 'monokeros', weight: 1, why: 'The alicorn outpriced gold; rarity as luxury’s core value.' },
  ],
  'philosophy-ethics': [
    { id: 'phanes', weight: 2 },
    { id: 'dhatr', weight: 2, why: 'Cosmic order as an act of establishment; the grammar of foundations.' },
  ],
  'occult-esoteric': [
    { id: 'phanes', weight: 1, why: 'The Orphic mysteries’ first god; the gold tablets’ light-born soul.' },
    { id: 'fuxi', weight: 1, why: 'The Yìjīng’s trigrams are his; divination’s founding draftsman.' },
  ],
  'aviation-aerospace': [
    { id: 'pegasos', weight: 2, why: 'The winged horse; flight’s oldest mascot from Corinth to Mobil’s red Pegasus.' },
  ],
  'publishing-media': [
    { id: 'pegasos', weight: 1, why: 'The Muses’ spring-maker; poetic inspiration in heraldic form.' },
    { id: 'seiren', weight: 1, why: 'The song that sells; enchantment as the first mass medium.' },
    { id: 'seshat', weight: 1, why: 'Mistress of the House of Books; the divine librarian.' },
  ],
  'music-arts': [
    { id: 'seiren', weight: 2 },
    { id: 'pegasos', weight: 1, why: 'Hippocrene: the fountain every poet drinks from.' },
  ],
  'finance-commerce': [
    { id: 'tyche', weight: 2 },
    { id: 'amsa', weight: 2, why: 'The allotted share; equity and portion personified.' },
    { id: 'iuno', weight: 1, why: 'Moneta: the world’s word for money is her Capitoline title.' },
  ],
  'forestry-conservation': [
    { id: 'diana', weight: 2, why: 'Mistress of the wildwood; the protected grove as sacred law.' },
    { id: 'nuwa', weight: 2, why: 'The mender of the broken sky; restoration as divinity.' },
  ],
  'environment-climate': [
    { id: 'hokkaido', weight: 1, why: 'Shiretoko’s intact ecosystem; the frontier turned sanctuary.' },
    { id: 'nuwa', weight: 1, why: 'Reed ashes against the flood; the first climate repair.' },
    { id: 'steh', weight: 1, why: 'Desert and storm; the harsh powers the land must be read with.' },
  ],
  'disaster-resilience': [
    { id: 'nuwa', weight: 2, why: 'The five-colored stones; catastrophe answered with repair.' },
    { id: 'steh', weight: 2, why: 'The storm that also defends; chaos harnessed at the prow.' },
    { id: 'vulcanus', weight: 1, why: 'The fire bargained with; the bonfire of aversion as insurance rite.' },
    { id: 'hp', weight: 1, why: 'Flood as the thing to measure and survive, not merely praise.' },
  ],
  'thermal-energy': [
    { id: 'vulcanus', weight: 2 },
  ],
  'manufacturing-craft': [
    { id: 'vulcanus', weight: 2 },
    { id: 'tvastr', weight: 2, why: 'The divine smith; the vajra and the soma cup from his bench.' },
    { id: 'ogun', weight: 2, why: 'The iron master; every smithy and mechanics’ yard his chapel.' },
    { id: 'kyushu', weight: 1, why: 'Arita porcelain and the gateway’s craft traditions.' },
    { id: 'pangu', weight: 1, why: 'The chisel and axe of the first separation; making itself.' },
  ],
  'architecture-design': [
    { id: 'seshat', weight: 1, why: 'Lady of Builders; the stretching of the cord that sets the temple’s axis.' },
    { id: 'dhatr', weight: 1, why: 'The establisher; foundations as sacred act.' },
    { id: 'tvastr', weight: 1, why: 'Viśvakarman, All-Maker: the architect of the gods’ own cities.' },
  ],
  'software-tech': [
    { id: 'fuxi', weight: 2, why: 'The trigrams: broken and unbroken lines — the binary alphabet three millennia early.' },
    { id: 'seshat', weight: 2, why: 'The record kept exact; the archive, the ledger, the database.' },
    { id: 'tvastr', weight: 1, why: 'The specification is destiny: a wrong accent doomed the monster; a wrong sign dooms the build.' },
    { id: 'yanluo', weight: 1, why: 'The immutable ledger of deeds; the audit log made sacred.' },
  ],
  'telecom-logistics': [
    { id: 'pusan', weight: 2, why: 'Lord of paths; the convoy and the escort, the road made safe.' },
    { id: 'ogun', weight: 1, why: 'The road-opener; infrastructure’s cutting edge, literally.' },
    { id: 'kyushu', weight: 1, why: 'The gateway shore; two thousand years of trade through one strait.' },
  ],
  'agriculture-food': [
    { id: 'hp', weight: 2, why: 'The flood that feeds; silt, season, and harvest as one god.' },
    { id: 'hokkaido', weight: 2, why: 'Japan’s breadbasket; a third of the nation’s food from the north island.' },
    { id: 'tumatauenga', weight: 1, why: 'Nets and digging-stick: the food arts won and given to man.' },
    { id: 'honshu', weight: 1, why: 'The rice-land heartland; the Land of Fair Rice-ears itself.' },
  ],
  'education': [
    { id: 'seshat', weight: 2 },
    { id: 'fuxi', weight: 2, why: 'The first teacher; nets, notes, and the reading of patterns.' },
    { id: 'dhatr', weight: 2, why: 'Dhātu: the root-elements of grammar; the structure of learning itself.' },
    { id: 'daksa', weight: 1, why: 'The skilled one; competence as a sacred discipline.' },
  ],
  'genealogy-ancestry': [
    { id: 'daksa', weight: 2, why: 'Father of sixty daughters; the lineage-map of gods, beasts, and stars.' },
    { id: 'nuwa', weight: 1, why: 'The clay mother; humanity’s shared origin story.' },
  ],
  'funerary-memorial': [
    { id: 'anubis', weight: 2 },
    { id: 'xolotl', weight: 2, why: 'The dog who swims the dead across; the oldest companion at the grave.' },
    { id: 'mengpo', weight: 2, why: 'The last station before rebirth; the underworld’s own memorial rite.' },
  ],
  petcare: [
    { id: 'xolotl', weight: 2, why: 'The xoloitzcuintli: Mexico’s national dog, named for its god.' },
    { id: 'anubis', weight: 1, why: 'The jackal guide; the Saqqara catacombs of millions of sacred dogs.' },
    { id: 'pusan', weight: 1, why: 'The herdsman; guardian of cattle on every road.' },
  ],
  'leadership': [
    { id: 'iuppiter', weight: 2 },
    { id: 'honshu', weight: 1, why: 'The island of capitals; every seat of Japanese power stands here.' },
    { id: 'daksa', weight: 1, why: 'The Prajāpati; order, procedure, and the cautionary tale of both.' },
  ],
  femtech: [
    { id: 'iuno', weight: 2, why: 'Lucina brings to light; the goddess of women in every life-stage.' },
  ],
  'wedding-family': [
    { id: 'iuno', weight: 2 },
  ],
  'photography-optics': [
    { id: 'tezcatlipoca', weight: 2, why: 'The obsidian smoking mirror; the first scrying lens of the Americas.' },
  ],
  'space-astronomy': [
    { id: 'pangu', weight: 1, why: 'The cosmic egg and the separating sky; the creation narrative of celestial mechanics.' },
  ],
};

let src = fs.readFileSync(FILE, 'utf8');
let inserted = 0;
const missingGroups = [];

for (const [gid, entries] of Object.entries(ADDITIONS)) {
  const marker = `industry: '${gid}',`;
  const gi = src.indexOf(marker);
  if (gi === -1) {
    missingGroups.push(gid);
    continue;
  }
  const ei = src.indexOf('entries: [', gi);
  if (ei === -1 || ei > gi + 400) {
    missingGroups.push(`${gid}(no-entries)`);
    continue;
  }
  const insertAt = src.indexOf('\n', ei) + 1;
  const lines = entries
    .map((e) => (e.why ? `      { id: '${e.id}', weight: ${e.weight}, why: '${e.why}' },` : `      { id: '${e.id}', weight: ${e.weight} },`))
    .join('\n');
  src = src.slice(0, insertAt) + lines + '\n' + src.slice(insertAt);
  inserted += entries.length;
}

if (missingGroups.length) {
  console.error('MISSING GROUPS:', missingGroups.join(', '));
  process.exit(1);
}
fs.writeFileSync(FILE, src, 'utf8');
console.log(`inserted ${inserted} industry entries across ${Object.keys(ADDITIONS).length} groups`);
