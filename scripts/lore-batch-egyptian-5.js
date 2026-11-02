#!/usr/bin/env node
/**
 * Lore-catalog merge — Egyptian batch 5: karnak, luxor, bes (ascii-restoration 2026-11).
 * Idempotent: existing non-empty entries are NEVER overwritten.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LORE_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(LORE_PATH, 'utf8'));

const ENTRIES = {
  karnak: {
    pronunciation: {
      ipa: '/ˈkɑːrnæk/ (conventional)',
      ipaLabel: 'Conventional reading — Arabic name of the temple town',
      phonemes: [
        { symbol: 'Karnak', desc: 'From Arabic al-qirq? — the accepted reading is “the fortified village” (Egyptian pr-ḳrnrq, “the sanctuary of the horizon’s entrance”).' },
        { symbol: '', desc: 'The name of the place became the name of the god’s dwelling — a temple-city theophany.' },
      ],
      approximation: '“KAR-nak”',
      kin: 'Egyptian Ipet-isut “the Most Select of Places” — Karnak’s ancient name',
      note: 'Unlike most names in the lexicon, this one entered via Arabic — the temple’s town-name, fossilised.',
    },
    domains: {
      title: 'The Fortified Village, Temple of Amun',
      subtitle: 'Ipet-isut, the Most Select of Places',
      lead: "<p class='lead-text'><strong>Karnak</strong> is not a god but a god’s address: the ‘fortified village’ whose ancient Egyptian name — Ipet-isut, ‘the Most Select of Places’ — declared it the estate where Amun-Ra kept his chosen ground. As a lexicon entry it stands for the temple-complex itself, the largest religious structure ever built, accumulated by thirty pharaohs over two thousand years.</p>",
      cards: [
        { name: 'The Great Hypostyle', desc: 'A forest of 134 columns under one roof — the largest columned hall ever raised.', iconPath: 'M14 56V24M26 56V16M38 56V16M50 56V24M10 24H54M26 16H38M14 24V16M50 24V16M10 56H54' },
        { name: 'House of Amun-Ra', desc: 'The god’s ‘mansion’ on earth; the cult image dwelt here in a daily liturgy of waking, washing, and feeding.', iconPath: 'M16 52H48M20 52V28L32 16L44 28V52M28 52V38H36V52M32 16V8' },
        { name: 'The Pharaohs’ Ledger', desc: 'Every dynasty added a pylon, an obelisk, a hall — the temple is Egypt’s history carved in sequence.', iconPath: 'M12 52H52M16 52V36H24V52M28 52V24H36V52M40 52V32H48V52M10 28H54' },
        { name: 'The Sacred Lake', desc: 'Its rectangular lake staged the primeval waters for the priests’ dawn ablutions.', iconPath: 'M12 32H52V52H12ZM12 32L8 28M52 32L56 28M20 40L22 38M32 38L34 36M44 40L46 38' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Karnak’s ‘mythology’ is architectural: every pylon is a cosmogonic statement, every obelisk a frozen sunbeam, every festival route a replay of the gods’ first processions. The complex’s ancient name, Ipet-isut, names the selection of this ground out of all possible grounds — the one place the god chose.</p>",
      myths: [
        { tag: 'Foundation Legend', title: 'The Most Select of Places', text: "<p class='myth-text'>The temple theology held that Amun’s staff, planted in the ground of Thebes at the world’s beginning, designated Ipet-isut as his estate — ‘the most select of places’. Each new king’s building programme was framed not as innovation but as the staff’s ancient will, finally fulfilled.</p>" },
        { tag: 'Opet Festival', title: 'The River Journey of the Gods', text: "<p class='myth-text'>In the great Opet festival, Amun’s barque sailed the canal from Karnak to Luxor temple and back — the Theban gods’ annual renewal of their own marriage with the city. The avenue of ram-headed sphinxes, restored today, was the procession’s road; the festival’s reliefs cover Karnak’s walls.</p>" },
        { tag: 'Karnak King List', title: 'The Pharaohs’ Roll Call', text: "<p class='myth-text'>Seti I’s gallery of kings, the Karnak King List, names the legitimate succession from the ancestors — a theology of history in stone, in which every true king is one who kept the ‘Most Select of Places’ in repair. The list omits the heretics, editing eternity.</p>" },
        { tag: 'Discovery History', title: 'From Sand to Science', text: "<p class='myth-text'>Cleared by the French expedition of 1799, Karnak became the first Egyptian temple to be systematically published — the Description de l’Égypte’s plates fixed its image in the world’s imagination. Champollion walked its halls reading the walls aloud; the decipherment of Egypt effectively happened here.</p>" },
      ],
    },
    syncretism: "Karnak housed them all: Amun-Ra supreme, but also Montu, Mut, Khonsu, Ptah and Opet, in a polyphony of chapels that makes the complex a pantheon in plan. The Greeks called the whole Thebes ‘Diospolis’, city of Zeus-Amun; the temple was the Zeus-estate, and Alexander the Great crossed the desert to its oracle to be confirmed son of Amun.",
    culturalLegacy: "The hypostyle hall’s columns seeded every ‘Egyptian’ column in the world’s architecture — railway stations, museums, mausoleums. The Sound-and-Light economy of modern Luxor, and half of every coffee-table book on Egypt, rest on this one complex; its restoration is an ongoing international project two centuries old.",
    extendedMeditation: "A place-name standing among god-names: Karnak’s inclusion in the lexicon is deliberate — the temple-city as deity, the dwelling as theophany. Its plain ASCII spelling is the one every language already uses; the fortified village needed no restoration because the whole world never stopped saying its name.",
    sources: [
      { name: 'Description de l’Égypte, Antiquités vol. I–III' },
      { name: 'Karnak King List (Seti I gallery)' },
      { name: 'Opet festival reliefs, Luxor and Karnak' },
      { name: 'Barguet, Le temple d’Amon-Rê à Karnak' },
    ],
    archaeology: "Two thousand years of continuous building: the Middle Kingdom precursors, Hatshepsut’s obelisks, the great hypostyle of Seti I and Ramesses II, the sacred lake, the seven processional pylons, the Khonsu temple — all standing and all published. The ‘Avenue of Sphinxes’ to Luxor has been re-excavated in the twenty-first century.",
    cult: "The daily cult of Amun-Ra — the god’s waking, washing, robing and feeding — was the most elaborate liturgy of Egypt, performed by the highest-ranking priests of the realm. The great festivals of Opet and the Valley moved the god’s barques between temples with the whole city watching.",
    iconography: "Karnak has no divine image — its icon is the ground-plan: pylons ranked like sunset gates, obelisks like ray-shafts, the columned hall as a petrified papyrus thicket. The ram-headed criosphinx, Amun’s processional animal, lines the temple’s approaches.",
    reception: "For two centuries Karnak has been the default image of ‘ancient temple’ in world culture — from Belzoni’s moving of its statues to the British Museum, to its role in every film that needs Egypt. Its name entered every major language unchanged, a loan-word from the largest religious building humanity ever raised.",
  },

  luxor: {
    pronunciation: {
      ipa: '/ˈlʌksɔːr/ (conventional)',
      ipaLabel: 'Conventional reading — Arabic name of the temple town',
      phonemes: [
        { symbol: 'Luxor', desc: 'From Arabic al-uqsur, “the palaces/castles” — the Arab name for the temple ruins of Thebes’ east bank.' },
        { symbol: '', desc: 'Ancient Egyptian: Ipet-resyt, “the Southern Sanctuary” — the harem of Amun.' },
      ],
      approximation: '“LUK-sor”',
      kin: 'Egyptian Ipet-resyt “the Southern Sanctuary”',
      note: 'A medieval Arabic plural fossilised into a modern proper name — the “palaces” the Arabs found.',
    },
    domains: {
      title: 'The Palaces, the Southern Sanctuary',
      subtitle: 'Ipet-resyt, the Harem of Amun',
      lead: "<p class='lead-text'><strong>Luxor</strong> — Arabic ‘the palaces’ — names the southern sanctuary of the Theban triad, where Amun visited in the great Opet festival to renew his generative power. Its ancient name, Ipet-resyt, ‘the Southern Select Place’, marks it as Karnak’s counterpart across the river: not the god’s estate but his bridal-chamber.</p>",
      cards: [
        { name: 'The Southern Sanctuary', desc: 'Ipet-resyt — the harem-temple where Amun’s fertility was renewed each year.', iconPath: 'M16 52H48M20 52V28L32 16L44 28V52M28 52V38H36V52M32 16V8M12 52H52' },
        { name: 'The Birth Colonnade', desc: 'Reliefs of the divine birth of Amenhotep III — the king’s theology of legitimate succession.', iconPath: 'M14 20H50M16 20V52M32 20V52M48 20V52M20 30H28M36 30H44M20 40H28M36 40H44' },
        { name: 'The Colonnade of Amenhotep III', desc: 'Fourteen massive papyrus columns — the finest preserved New Kingdom colonnade.', iconPath: 'M18 56V24M30 56V18M42 56V18M54 56V24M14 24H58M30 18H42' },
        { name: 'Opet’s Destination', desc: 'The river-end of the great festival: Amun’s barque docked here for the marriage-renewal rites.', iconPath: 'M8 44H56L50 54H14ZM16 44V34H24V44M32 44V30H40V44M48 44V36H54V44M24 28H40M28 22H36' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Luxor’s mythology is the fertility-cycle of Amun himself: each year the god sailed south from Karnak to his harem at Ipet-resyt, married his own power in the sanctuary, and returned renewed. The temple’s birth-colonnade extends the cycle to kingship — Amenhotep III’s divine conception carved as theology-in-stone.</p>",
      myths: [
        { tag: 'Opet Festival', title: 'The Southern Journey', text: "<p class='myth-text'>The Opet festival’s climax was the god’s arrival at Ipet-resyt: the barque of Amun moored before the colonnade, the Theban crowd celebrating the union that renewed the Nile, the king, and the year in a single night of liturgy. The return to Karnak closed the cycle eleven days later.</p>" },
        { tag: 'Divine Birth', title: 'Amun and Mutemwiya', text: "<p class='myth-text'>Luxor’s colonnade reliefs narrate the conception of Amenhotep III: Amun takes the form of the king, visits queen Mutemwiya, the child is fashioned by Khnum on the potter’s wheel and blessed by the gods — the canonical statement that the pharaoh is the god’s literal son, carved at full scale.</p>" },
        { tag: 'The Mosque of Abu Haggag', title: 'The Sanctuary Continuous', text: "<p class='myth-text'>A mosque still stands inside the temple’s court — Abu Haggag of Luxor, whose mouloud festival each year crowds the ancient colonnade with boats and lights. The building has never stopped being sacred; only the name of the sacred changed, from Ipet-resyt to the Sheikh’s mosque.</p>" },
        { tag: 'Modern Name', title: 'The Palaces', text: "<p class='myth-text'>The Arabs who settled among the ruins called them <em>al-uqsur</em> — ‘the castles’ — seeing palaces in the pylons; the name shrank to Luxor and became the city’s. It is one of the few cases where the medieval name of the ruins replaced the ancient name of the living town.</p>" },
      ],
    },
    syncretism: "Luxor temple served Amun in his ithyphallic generative form — Amun-Min-Kamutef, ‘bull of his mother’ — tying the sanctuary to Min’s fertility theology. Its chapels later honoured the Roman imperial cult, then the mosque of Abu Haggag: three religions in one floor-plan, each claiming the same consecrated ground.",
    culturalLegacy: "The colonnade of Amenhotep III, floodlit on the Nile’s corniche, is the most photographed temple front in the world after the Pyramids. The birth-colonnade’s iconography — Khnum at the potter’s wheel, the divine child — became the standard visual argument of Egyptian kingship, copied in every royal birth-chapel of the New Kingdom.",
    extendedMeditation: "Luxor: a medieval plural doing the work of an ancient sanctuary-name. In the lexicon it stands for the archaeological truth that places outlive their theologies — ‘the palaces’ the Arabs named are the same walls where Amun’s fertility was renewed, and the name needs no restoration because it never referred to anything but the stones themselves.",
    sources: [
      { name: 'Luxor temple birth-colonnade reliefs (Amenhotep III)' },
      { name: 'Opet festival reliefs and barque-docking scenes' },
      { name: 'Abu Haggag mouloud tradition' },
      { name: 'Haeny, ' + 'Luxor' + ' in the Oxford Encyclopedia of Ancient Egypt' },
    ],
    archaeology: "Amenhotep III’s colonnade and court survive at near-perfect scale; the pylon of Ramesses II fronts it with its single obelisk — the other stands in Paris’ Place de la Concorde. The temple’s axis was recently realigned with the re-excavated Avenue of Sphinxes to Karnak, restoring the ancient processional road.",
    cult: "The temple was the stage of the Opet marriage-rites and the cult of Amun-Min; its priests served the ‘Southern Sanctuary’ as Karnak’s served the northern estate. The medieval mosque kept the ground consecrated without interruption — a continuity unmatched in the ancient world.",
    iconography: "The papyrus-bundle columns of the colonnade, the seated colossi of Ramesses II, the barque-shrine of Amun; and above all the birth-scenes’ sequence — embrace, conception, fashioning on the wheel. The icon of Luxor is procession arriving: the god’s boat at the stair.",
    reception: "Luxor is modern Egypt’s tourist capital and the ancient world’s best-preserved large temple front. Its obelisk in Paris made it the first Egyptian monument to join a European capital’s furniture; and the mouloud of Abu Haggag is studied worldwide as the longest-lived case of continuous sacred use of one building.",
  },

  bes: {
    pronunciation: {
      ipa: '/bɛs/ (conventional)',
      ipaLabel: 'Conventional reading — Egyptian vocalisation not attested',
      phonemes: [
        { symbol: 'Bs', desc: 'Written bs; conventionally vocalised “Bes”. The name is of uncertain etymology — perhaps Nubian in origin.' },
        { symbol: '', desc: 'The dwarf-god of hearth, childbirth, and the protection of the vulnerable.' },
      ],
      approximation: '“BESS”',
      kin: 'Greek Βῆς (Bês); associated in late periods with the Pataikoi',
      note: 'A god whose image was more famous than his name — everyone knew the dwarf, few could say who he was.',
    },
    domains: {
      title: 'The Protector of Hearth and Childbirth',
      subtitle: 'The Dwarf at the Door, Enemy of Every Evil Eye',
      lead: "<p class='lead-text'><strong>Bs</strong> — Bes — is Egypt’s household god: the dwarf with the lion’s mane and the fright-mask face who stands at the head of the bed, the birth-brick, the mirror-handle and the harp, keeping every dangerous thing away from the vulnerable. No temple was his; every home was. He is the most reproduced and least narrated god of Egypt.</p>",
      cards: [
        { name: 'Guardian of the Hearth', desc: 'His image watched over beds, births, and mirrors — the god of the domestic threshold.', iconPath: 'M16 20H48V48H16ZM32 28V40M26 34H38M16 20L10 14M48 20L54 14M16 48L10 54M48 48L54 54' },
        { name: 'The Dancer-Demon', desc: 'His terrifying face and acrobatic dance frighten away the demons of childbirth and sleep.', iconPath: 'M20 44C16 32 22 20 32 20C42 20 48 32 44 44M26 30L30 34M38 30L34 34M28 40H36M18 52L26 46M46 52L38 46' },
        { name: 'Lord of Childbirth', text: '', desc: 'The birth-brick and the Bes-mask of the midwife: he presided over every Egyptian child’s first hour.', iconPath: 'M20 48H44V28L32 18L20 28ZM28 48V38H36V48M32 18V8' },
        { name: 'Protector of Sleep', desc: 'Bes-guardians on headrests and bed-legs watched the sleeper through the dangerous night.', iconPath: 'M12 40H52M16 40V32H48V40M20 32V24M28 32V20M36 32V20M44 32V24M12 40L8 46M52 40L56 46' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Bes has no myth because he was always already there — at the door, at the bed, at the birth. His ‘theology’ is apotropaic: power through ugliness, protection through fright. Later tradition gave him a birth and a family (the lion-dwarf Pantheos of the late period), but his real domain never moved from the threshold of ordinary Egyptian life.</p>",
      myths: [
        { tag: 'Birth Protection', title: 'The Mask of the Midwife', text: "<p class='myth-text'>In the birth-chamber, the midwife donned the Bes-mask and danced his dance; his grimace drew the malign spirits’ attention onto himself and away from mother and child. The <em>Beset</em>-amulets and the ‘Bes-chamber’ scenes of Deir el-Medina show the rite in domestic detail.</p>" },
        { tag: 'Papyrus Westcar Analogy', title: 'The Dwarf Who Amuses the Gods', text: "<p class='myth-text'>The Westcar Papyrus’ wonder-tale of the dwarf Dedi, who dances and performs before the court, is read as Bes’ narrative shadow — the small deformed being whose skill and humour carry more power than the great. Bes never speaks in the texts; he dances.</p>" },
        { tag: 'Late Period Theology', title: 'Bes the Pantheos', text: "<p class='myth-text'>By the Late Period, Bes absorbed attributes of every major god — the wings of Horus, the crown of Amun, the snakes of Mehen — becoming the ‘Pantheos-Bes’, one dwarf wearing the whole pantheon’s power. The type, with its many arms and animal faces, spread through the Greco-Roman world as an amulet-image.</p>" },
        { tag: 'Tutu & Bes', title: 'The Son of the Great Goddess', text: "<p class='myth-text'>At Saqqara and in the demotic tales, Bes appears as the son of Neith, sent against the enemies of the gods — a dwarf-hero with a sword. The strand gives him a genealogy the earlier household cult never needed: the protector domesticated into a champion.</p>" },
      ],
    },
    syncretism: "Bes is the great syncretic absorber of the late period: Pantheos-Bes carries the attributes of all gods. The Greeks equated him with their own apotropaic dwarves and the Pataikos figures, and Roman soldiers carried his amulets across the empire — the household god travelled as military gear.",
    culturalLegacy: "He is the most popular Egyptian god in modern museum shops — a whole civilization’s amulet-cabinet distilled into one grinning dwarf. The ‘Bes-image’ entered European art through Renaissance prints and became a standard figure of grotesque ornament; his name is a loan-word in half the world’s languages of Egyptology.",
    extendedMeditation: "Bs: two letters, one syllable, zero temple — and more images than any god in Egypt. His restoration is the shortest in the batch, as it should be: the household god kept his name small so it would fit on a bed-leg, a mirror, a child’s amulet. Say it and he is already there, grimacing at the threshold.",
    sources: [
      { name: 'Deir el-Medina birth and Bes-chamber scenes' },
      { name: 'Papyrus Westcar (the dwarf Dedi episode)' },
      { name: 'Late Period Pantheos-Bes amulets' },
      { name: 'Roman military Bes-amulet finds across the empire' },
    ],
    archaeology: "No temple — ten thousand objects: amulets, mirror-handles, headrests, column-capitals from Dendera, the mammisi-birth-houses where his dance rings the walls. Saqqara’s Bes-chapels and the demotic tales’ dwarf-hero give him late-period shrines after all.",
    cult: "His cult was the cult of the home: images instead of priests, dances instead of hymns. In the Greco-Roman period formal Bes-oracles appeared — the dwarf who answered questions by the cast of knucklebones — Egypt’s most demotic divination.",
    iconography: "Dwarf-frontal, bandy-legged, lion-maned, tongue out, hands on hips or drumming, feather-crowned; the only major Egyptian god drawn face-on — the better to stare down what comes through the door. Beset, his feminine form, mirrors him for the birth-chamber.",
    reception: "Greek and Roman Egyptomania made Bes a fixture of grotesque art; he survives in the Kasperle-puppet of German folk theatre and in the modern ‘Egyptian dwarf’ of tattoo flash. Egyptology uses him as the standing example that the most-loved gods need no myths and no temples — only a doorway to guard.",
  },
};

let added = 0, skipped = 0;
for (const [id, entry] of Object.entries(ENTRIES)) {
  if (lore[id] && Object.keys(lore[id]).length) {
    console.log(`  = ${id}: exists, preserved`);
    skipped++;
    continue;
  }
  lore[id] = entry;
  added++;
  console.log(`  + ${id}`);
}
if (added) {
  fs.writeFileSync(LORE_PATH, JSON.stringify(lore, null, 2) + '\n');
}
console.log(`\nlore-catalog: +${added} entries, ${skipped} preserved, ${Object.keys(lore).length} total`);
