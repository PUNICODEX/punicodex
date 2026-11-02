#!/usr/bin/env node
/**
 * Lore-catalog merge — Egyptian batch (ascii-restoration 2026-11).
 * Idempotent: existing non-empty entries are NEVER overwritten.
 * Run after adding entries: node scripts/lore-batch-egyptian.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LORE_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(LORE_PATH, 'utf8'));

const ENTRIES = {
  // ─────────────────────────────────────────────────────────────────────────
  osiris: {
    pronunciation: {
      ipa: '/ˈwɛzɪər/ (conventional)',
      ipaLabel: 'Conventional reading — Egyptian vocalisation not attested',
      phonemes: [
        { symbol: 'Ws-', desc: 'The name is written wsjr; the initial w is a weak consonant (w or u) whose vowel is unwritten.' },
        { symbol: '-jr', desc: 'The god-determinative follows; the final r is consonantal. Egyptologists conventionally vocalise the name “Wesir”.' },
      ],
      approximation: '“WES-ir” — the form the Greeks heard as Ὄσιρις (Ósiris)',
      kin: 'Greek Ósiris · Coptic ⲟⲩⲥⲓⲣⲉ (Ousire)',
      note: 'Egyptian hieroglyphs record consonants, not vowels; every vocalisation is a modern convention.',
    },
    domains: {
      title: 'God of the Dead, Resurrection, and the Nile’s Return',
      subtitle: 'The First Mummy, King of the Underworld',
      lead: "<p class='lead-text'><strong>Wsjr</strong> — Osiris to the Greeks — is the god who died and returned, and in returning became the pattern every Egyptian hoped to follow. Murdered by his brother, reassembled by his wife, enthroned as judge of the dead, he rules the <em>Duat</em> while his son Horus rules the living world above.</p>",
      cards: [
        { name: 'King of the Duat', desc: 'Sovereign of the underworld and judge of every soul weighed against the feather of Maat.', iconPath: 'M32 6L52 22V56H12V22L32 6ZM32 6V56M12 32H52' },
        { name: 'The First Mummy', desc: 'The drowned, dismembered god rewrapped by Anubis — the prototype of all mummification.', iconPath: 'M22 12H42M20 24H44M18 36H46M16 48H48M32 12V56' },
        { name: 'The Green God', desc: 'Lord of vegetation and the inundation; his green or black skin is the fertile flood-plain.', iconPath: 'M32 54C32 34 32 22 32 10M32 10C22 16 16 26 16 36C24 34 30 26 32 10ZM32 10C42 16 48 26 48 36C40 34 34 26 32 10Z' },
        { name: 'Father of Horus', desc: 'Posthumous father of the sky-falcon; the succession struggle with Seth is Egypt’s central myth.', iconPath: 'M12 40C20 28 44 28 52 40M20 40L26 30M32 40L32 28M44 40L38 30' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>The Osiris cycle is the best-preserved Egyptian myth, known from the Pyramid Texts onward: the good king murdered by his brother, the faithful wife who recovers him, the son who avenges him. It is simultaneously a story about kingship, about the flood that dies and returns, and about every human being who hoped to be judged worthy.</p>",
      myths: [
        { tag: 'Pyramid Texts', title: 'The Death of the Good King', text: "<p class='myth-text'>The earliest sources already presuppose the story: Osiris ruled as a beneficent king until his brother Seth, envious of his power, contrived his death — in the classical telling (Plutarch’s <em>De Iside et Osiride</em>, the fullest narrative we have) sealed in a chest and thrown into the Nile, the river carrying him to Byblos where a tamarisk grew to engulf the coffin.</p>" },
        { tag: 'Plutarch', title: 'Isis the Faithful', text: "<p class='myth-text'>Isis searched for the body, recovered it from Byblos, and hid it — but Seth found it by night, cut it into fourteen pieces, and scattered them through Egypt. Isis and Nephthys wandered the land gathering the fragments. Every place that claimed a fragment became an Osiris sanctuary; the myth is a map of Egyptian pilgrimage.</p>" },
        { tag: 'Book of the Dead', title: 'The Weighing of the Heart', text: "<p class='myth-text'>Anubis conducts the dead to the Hall of Two Truths, where the heart is set on the scale against the feather of Maat and the tally is read aloud by Thoth. Wsjr, enthroned in the next chamber, receives those who pass. The formula “I am Osiris” in the Book of the Dead identifies the deceased with him — his resurrection becomes the template of theirs.</p>" },
        { tag: 'Memphite Theology', title: 'The Succession of Horus', text: "<p class='myth-text'>Isis, by magic, conceived a son on the briefly reanimated body: Horus, raised in secret in the marshes of Chemmis, who grew to challenge Seth for the throne. The tribunal of the gods awarded Egypt’s rule to Horus and the underworld’s to Osiris — the mythic charter for the division between the living king and his dead father.</p>" },
      ],
    },
    syncretism: "Under the Ptolemies the Greeks mapped Osiris onto their own dying gods — Dionysus above all, whom Herodotus already calls “Osiris” — and the identification fed the later figure of Hellenistic Serapis. Through the Abydos cult his resurrection drew comparison with Christ in late-antique apologetics in both directions. The Coptic Church still preserves his name in ⲟⲩⲥⲓⲣⲉ as a theophoric element.",
    culturalLegacy: "Osiris gave the West its archetype of the dying-and-rising god and Egyptology one of its oldest debates: Frazer’s “Osiris as vegetation deity” reading dominated a century before J. Gwyn Griffiths and others restored his identity as dead king and judge. Abydos, his chief sanctuary, remained a pilgrimage goal for two millennia; the Osireion there, with its island surrounded by water, staged his myth in stone.",
    extendedMeditation: "The name on this temple is the consonantal skeleton the Egyptians themselves wrote — wsjr — because the vowels were never recorded and any vocalisation is an act of scholarship. That uncertainty is the point of the restoration: the god who embodies resurrection survives in a name we must partially reconstruct, held together by the determinative of a seated deity at the end of his own word.",
    sources: [
      { name: 'Pyramid Texts (Old Kingdom, utterances of the Osiris king)' },
      { name: 'Book of the Dead, spell 125 (the weighing of the heart)' },
      { name: 'Plutarch, De Iside et Osiride (the fullest narrative of the cycle)' },
      { name: 'Memphite Theology (Shabaka Stone)' },
      { name: 'Griffiths, The Origins of Osiris and his Cult' },
      { name: 'Herodotus, Histories 2.170–171 (the Abydos cult)' },
    ],
    archaeology: "The Osireion at Abydos, excavated by Naville and Frankfort, is a cenotaph-temple flooded symbolically with groundwater; the Dynasty XIX temples of Seti I preserve the finest Osiris chapels and the Abydos King List. Fourteen supposed relic-sites of his body were listed by the Abydos and Mendes traditions, giving a physical geography to the dismemberment myth.",
    cult: "Abydos was the cult centre without rival, where the annual <em>mysteries of Osiris</em> staged the god’s death and revival with a processional boat (<em>neshmet</em> bark). Every dead person was ‘an Osiris’ — the name-title itself was the engine of personal religion, making the god’s cult indistinguishable from the Egyptian hope for the afterlife itself.",
    iconography: "Mummiform, arms crossed on the chest holding the crook and flail, wearing the tall white crown of Upper Egypt flanked by ostrich feathers; his skin is green or black — the colours of the flood-borne earth. As the Lunar deity he can be wrapped entirely as a moon-disc within a mummiform body, but the judge of the dead remains his definitive form.",
    reception: "Classical authors — Herodotus, Diodorus, Plutarch — transmitted the Osiris myth to Europe, where it shaped early theories of the ‘dying god’ and, through them, the modern study of religion itself. His weighing-of-the-heart scene, spell 125, is today the single most reproduced image of Egyptian religion, familiar far beyond scholarship.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  sobek: {
    pronunciation: {
      ipa: '/ˈsoʊbɛk/ (conventional)',
      ipaLabel: 'Conventional reading — Egyptian vocalisation not attested',
      phonemes: [
        { symbol: 'Sb-', desc: 'Written sbk; the s is a sibilant, the b a voiced bilabial stop.' },
        { symbol: '-k', desc: 'Final k is consonantal. Egyptologists conventionally vocalise “Sobek”.' },
      ],
      approximation: '“SOH-bek” — already essentially the form used today',
      kin: 'Greek Σοῦχος (Soûkhos)',
      note: 'The name is related to sbk, “he who unites/causes to be pregnant” — a fertility sense built into the word.',
    },
    domains: {
      title: 'God of the Nile, Fertility, and Military Power',
      subtitle: 'The Crocodile Who Rises from the River',
      lead: "<p class='lead-text'><strong>Sbk</strong> — Sobek — is the crocodile god of the Nile’s dangerous fertility: the animal that kills at the water’s edge and the power that makes the flood bring life. In the Middle Kingdom he rose from local river god to a creator deity in his own right, and his cult centres — Crocodilopolis and Kom Ombo — kept living sacred crocodiles as his incarnations.</p>",
      cards: [
        { name: 'Lord of the Waters', desc: 'Master of the Nile and its inundation; the flood itself was called “the arrival of Sobek”.', iconPath: 'M8 36C16 30 24 30 32 36C40 42 48 42 56 36M8 44C16 38 24 38 32 44C40 50 48 50 56 44' },
        { name: 'The Crocodile God', desc: 'Incarnate in Crocodylus niloticus; temple pools held living sacred crocodiles adorned with jewellery.', iconPath: 'M10 40C20 34 44 34 52 38L56 32L54 42C46 48 22 48 10 44ZM18 36L14 28M28 35L26 27M38 35L37 27' },
        { name: 'Creator and Solar Eye', desc: 'In Middle Kingdom theology he emerges from the primordial waters; at Kom Ombo he shares a temple with Horus.', iconPath: 'M32 12C24 20 20 28 20 38C20 48 26 54 32 54C38 54 44 48 44 38C44 28 40 20 32 12ZM32 22V46' },
        { name: 'Patron of the Army', desc: 'Soldiers and the Pharaoh’s power; his epithets link him to strength and military might.', iconPath: 'M32 8V56M32 14L50 24M32 14L14 24M32 14V56' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Sobek has no single continuous myth-cycle; his theology was assembled from the river itself — the annual flood that could drown or feed — and from the pharaonic appetite for a god who united raw natural violence with legitimate kingship. The Middle Kingdom elevated him to cosmic rank: a creator who rises from the Nun, the primordial water.</p>",
      myths: [
        { tag: 'Fayum Theology', title: 'The Crocodile Who Emerges from Nun', text: "<p class='myth-text'>The Sobek theology of the Fayum — best preserved in the hymn cycles of the crocodile temples — casts him as the one who first climbed from the primeval waters, creator of the world’s order and of the Nile itself. Later tradition even made him a form of the sun god’s power, the fierce Eye of Ra returned from the Nubian desert.</p>" },
        { tag: 'Kom Ombo', title: 'The Double Temple', text: "<p class='myth-text'>At Kom Ombo south of Luxor, Sobek shares a perfectly symmetrical double temple with Horus the Elder: one half for the falcon of the sky, one for the crocodile of the river. The division stages the Egyptian ideal of the Two Lands’ balance — sky and water, kingship and fertility — under one roof.</p>" },
        { tag: 'Papyrus Westcar', title: 'Sobek and the Wonders at Court', text: "<p class='myth-text'>In the Westcar Papyrus’ cycle of Khufu-era wonders, the crocodile motif appears in the tale of the adulterer punished by a wax crocodile that comes alive at a word — a demonstration that the river-god’s animal is an instrument of moral order, released and recalled by priestly power.</p>" },
        { tag: 'Greek Reportage', title: 'Petsuchos, the Sacred Crocodile', text: "<p class='myth-text'>Strabo and Herodotus describe the living god of Crocodilopolis: a great crocodile called <em>Petsuchos</em>, kept in a pool, fed by priests, adorned with gold and crystal rings. When it died the city mourned; a new Petsuchos was sought among the river animals by oracular selection — the god re-incarnating indefinitely.</p>" },
      ],
    },
    syncretism: "Sobek absorbed and was absorbed: as Sobek-Ra he took solar status, while earlier he had fused with Horus as Sobek-Horus, lord of the Fayunite unity of king and river. The Greeks called his city Crocodilopolis and identified him with their own river-figures rather than a single Olympian; Roman-period Fayum mummy portraits from his cities remain among Egyptology’s most familiar images.",
    culturalLegacy: "The name Sobek survives in the modern scholarly vocabulary of the Nile and appears throughout Egyptological literature as the archetype of Egyptian theriolatry — the worship of a dangerous animal not despite but because of its power. The Fayum’s temple of Medinet Madi preserves the longest surviving sacred hymn cycles addressed to a crocodile.",
    extendedMeditation: "To restore Sbk is to keep the consonants the Egyptians trusted to carry a name across millennia of silence. The crocodile god needs no decoration: the word itself snaps shut like the animal — four letters, one vowel of uncertainty, the whole Nile behind it.",
    sources: [
      { name: 'Papyrus Westcar (the wax crocodile episode)' },
      { name: 'Herodotus, Histories 2.68–69 (the crocodile and Crocodilopolis)' },
      { name: 'Strabo, Geography 17.1.38 (Petsuchos)' },
      { name: 'Sobek hymns of Medinet Madi (Fayum temple liturgy)' },
      { name: 'Bresciani, ‘Sobek’ in Lexikon der Ägyptologie' },
    ],
    archaeology: "Crocodilopolis (Shedet, modern Medinet el-Fayum) held the main temple; Kom Ombo’s double temple survives in superb relief, its columns carrying intact crocodile capitals. Crocodile cemeteries at Tebtunis and el-Shams el-Qawassim held mummified sacred crocodiles by the hundreds, each an embodied Sobek buried with honours.",
    cult: "His priests kept living crocodiles as cult statues made flesh; the animals were fed, adorned, and oracularly consulted, and at death mummified and buried in necropolises of their own. The Fayum’s Krokodilophoria festival carried the god’s image on procession; the flood season itself was his epiphany.",
    iconography: "Human-bodied with the head of a Crocodylus niloticus, crowned with ram’s horns, sun disc and uraeus when solar, or with the plumes and horns of Amun when fused as Sobek-Amun. His sacred colour is the green-blue of the inundation; the <em>was</em>-sceptre of power is his frequent attribute.",
    reception: "Greek and Roman travellers were fascinated and repelled in equal measure — Herodotus’ crocodile chapter opens with the tame-temple beast and closes with the mummification of the species. Sobek remains the standard example in comparative religion of the worship of dangerous fauna as a strategy of propitiation.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  nut: {
    pronunciation: {
      ipa: '/nʊt/ (conventional)',
      ipaLabel: 'Conventional reading — Egyptian vocalisation not attested',
      phonemes: [
        { symbol: 'Nw-', desc: 'Written nwt “the water-pot” or “the city” as a sky-determinative; the w is a weak consonant.' },
        { symbol: '-t', desc: 'Feminine ending. Conventionally vocalised “Nut”. The name puns on nwt, “sky”.', },
      ],
      approximation: '“NOOT” — one syllable, the vowel long',
      kin: 'Greek Νῦθ (Nȳth) · Coptic ⲛⲉ',
      note: 'The sky is grammatically feminine in Egyptian; her name is the sky-word itself.',
    },
    domains: {
      title: 'Goddess of the Sky, the Stars, and the Vault of Night',
      subtitle: 'She Who Bends Over the Earth, Swallowing the Sun',
      lead: "<p class='lead-text'><strong>Nwt</strong> is the sky — not a metaphor for it. Her body is the vault, starred across its length; her lips and womb the gates through which the sun passes at dusk and dawn. Each night she swallows the sun; each morning she gives birth to it again, the great cosmic rhythm painted on temple ceilings from Luxor to Dendera.</p>",
      cards: [
        { name: 'The Starry Vault', desc: 'Her body is painted blue across temple ceilings, scattered with the decans and planets she carries.', iconPath: 'M8 44C20 20 44 20 56 44M8 44H56M14 36L18 32M32 30L32 25M46 34L50 30M24 32L26 28M40 31L42 27' },
        { name: 'Mother of the Gods', desc: 'By Geb she bore Osiris, Isis, Seth, Nephthys, and Horus the Elder — the third generation of the Ennead.', iconPath: 'M32 10C26 18 24 26 24 34C24 46 27 52 32 52C37 52 40 46 40 34C40 26 38 18 32 10ZM16 40H48' },
        { name: 'Swallower of the Sun', desc: 'Each dusk the sun enters her mouth; each dawn she births it — time itself is her digestion.', iconPath: 'M32 14A14 14 0 1 0 32 42A14 14 0 1 0 32 14M32 42V56M26 48H38' },
        { name: 'Lady of the Sycamore', desc: 'She appears in tree-form pouring water and bread on the dead from a celestial sycamore.', iconPath: 'M32 56V28M32 28C22 28 14 22 12 12C24 14 30 20 32 28ZM32 28C42 28 50 22 52 12C40 14 34 20 32 28ZM32 36H18M32 42H14' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Nut enters myth chiefly as the forbidden wife: the sky and the earth, she and Geb, were locked in an embrace Shu had to tear apart to create the world’s space. Separated, she spends eternity arched over him, swallowing the sun he receives back each dawn — the most elegant creation image Egypt produced.</p>",
      myths: [
        { tag: 'Heliopolitan Cosmogony', title: 'The Embrace of Geb and Nut', text: "<p class='myth-text'>Shu and Tefnut, the first air and moisture, bore Geb the earth and Nut the sky — who loved so closely that no light or creature could pass between them. On Ra’s command, or by Shu’s own strength in the tellings, the air god forced them apart and holds them apart to this day: the atmosphere itself is the wedge of creation.</p>" },
        { tag: 'Pyramid Texts', title: 'The Birth Bricks of the Gods', text: "<p class='myth-text'>The old utterances make Nut the great mother repeatedly: she who bore the gods on her five epagomenal days — the days added outside the 360-day year, won for her from the moon in the game of senet. Osiris, Horus, Seth, Isis and Nephthys were born on those five days, the only time the sky goddess could labour.</p>" },
        { tag: 'Book of the Dead, spell 17', title: 'She Who Gives Birth and Does Not Tire', text: "<p class='myth-text'>Spell 17 invokes Nut as the sow who eats her piglets and the mother who daily bears the sun: ‘I am Nut, the great one who gives birth to the gods.’ The deceased appeals to her body as the ladder of ascent — to be ‘a star imperishable’ among her children was the standard hope of the afterlife.</p>" },
        { tag: 'Solar Theology', title: 'The Night Barque Within Her', text: "<p class='myth-text'>In the solar books the sun god’s night journey runs through Nut’s interior from mouth to womb; her body is the Duat’s architecture. New Kingdom royal tombs — from Thutmose III to Ramesses VI — paint her figure along the sarcophagus hall so that the king ascends through the goddess herself.</p>" },
      ],
    },
    syncretism: "Nut merges readily with Hathor as sky-cow and with the sycamore-goddess of offering scenes; in the late period she absorbs the funerary role of Nut-as-tree. Greek authors rendered her as a Titaness-figure comparable to Rhea; her swallowing-and-birthing of the sun invited comparison with the devouring Time of Orphic cosmogonies.",
    culturalLegacy: "Her image — the blue woman bent from horizon to horizon — is the most reproduced Egyptian cosmological image after the weighing of the heart. The five epagomenal days her myth explains still structure the Coptic calendar’s year-end; and ‘Nut, Nut, the sky is falling’ passed into Egyptian Arabic as a children’s rhyme.",
    extendedMeditation: "A one-syllable name for the whole visible sky: nwt. To write it in ASCII is almost an act of honesty, for the word is a container — a water-pot determinative tipped onto its side — as if the Egyptians had already drawn the curve this temple builds its name upon. Her restoration needs no marks; the night sky over any city is her diacritic.",
    sources: [
      { name: 'Pyramid Texts (Nut as mother of the gods)' },
      { name: 'Book of the Dead, spells 17 and 148 (the Nut spell)' },
      { name: 'Heliopolitan cosmogony, Ennead tradition (Geb–Nut separation)' },
      { name: 'Temple ceiling programs: Dendera, Esna, Luxor' },
      { name: 'Plutarch, De Iside et Osiride (epagomenal myth)' },
    ],
    archaeology: "Her finest monuments are architectural: the ceilings of the Ramesside tombs in the Valley of the Kings and the zodiac ceiling of Dendera, where her body frames the circumpolar stars. The Nut spell (BD 148) was often written on stelae in the shape of the goddess herself, a tree-vault hybrid rising from the sycamore.",
    cult: "No single city claimed her exclusively — she was everyone’s sky — but she received royal cult in the mortuary temples and a popular cult as the sycamore who feeds the dead at the edge of desert necropolises. Her five epagomenal days closed the year with festival commotion everywhere.",
    iconography: "A naked or star-covered woman bent at the waist over the recumbent Geb, supported by Shu the air; or as a cow whose belly carries the sun-disc, four pillars of the sky beneath her legs. In the sycamore form she pours water from a jar over altars of the dead. Her headdress is the water-pot emblem that writes her name.",
    reception: "Through Plutarch she entered the classical imagination as one of the great mother-sky figures; Renaissance Hermeticism made her a standard emblem of the celestial vault. Modern Egyptology retains her as the canonical demonstration that Egyptian cosmology mapped theology directly onto visible nature.",
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
