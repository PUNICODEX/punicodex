#!/usr/bin/env node
/**
 * Lore-catalog merge — final batch: bodhidharma, yammu, venus (ascii-restoration 2026-11).
 * Idempotent: existing non-empty entries are NEVER overwritten.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LORE_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(LORE_PATH, 'utf8'));

const ENTRIES = {
  bodhidharma: {
    pronunciation: {
      ipa: '/ˌboʊdɪˈdɑːrmə/',
      ipaLabel: 'Sanskrit → Chinese transmission (Pútídámó)',
      phonemes: [
        { symbol: 'Bodhi-', desc: 'From Sanskrit bodhi, “awakening” — the name begins in the Buddha’s own enlightenment-word.' },
        { symbol: '-dhar-', desc: 'From √dhṛ, “to hold, sustain” — the same root as dharma’s “that which holds”.' },
        { symbol: '-ma', desc: 'The Chinese rendered it 菩提達磨 (Pútídámó); the Japanese, Daruma; the West, Bodhidharma.' },
      ],
      approximation: '“boh-dee-DAR-muh”',
      kin: [
        { label: 'Chinese', form: 'Pútídámó 菩提達磨 — the First Patriarch' },
        { label: 'Japanese', form: 'Daruma 達磨 — the roly-poly doll is his image' },
      ],
      note: 'The name means “awakening-perfection” or “dharma of awakening” — the Indian prince who carried Zen to China.',
    },
    domains: {
      title: 'The Dharma of Awakening, First Patriarch',
      subtitle: 'The Indian Prince Who Carried Zen to China',
      lead: "<p class='lead-text'><strong>Bodhidharma</strong> is the First Patriarch of Zen: the Indian prince-turned-monk who crossed the Pamirs to China around 520 CE, sat facing a wall at Shaolin for nine years, and transmitted the Buddha’s wordless teaching outside the scriptures. His legend is the bridge between India and East Asia — and the seed of martial, meditative, and cultural traditions that span the continent.</p>",
      cards: [
        { name: 'The Wall-Gazing', desc: 'Nine years facing the wall at Shaolin; the tradition’s image of unmoving resolve — and of the mind’s own wall.', iconPath: 'M14 12H50V52H14ZM32 24V44M24 32H40M14 12L8 6M50 12L56 6' },
        { name: 'The First Patriarch', desc: 'The twenty-eighth Indian patriarch who became China’s first — the wordless transmission passed through him.', iconPath: 'M32 8V30M32 14L50 22M32 14L14 22M32 30L20 48M32 30L44 48M32 30V52' },
        { name: 'Daruma’s Eyes', desc: 'The legend: he cut off his eyelids in wrath at sleep — and where they fell, tea plants grew. Japan’s doll watches with one eye.', iconPath: 'M16 30C20 22 28 18 32 18C36 18 44 22 48 30M22 30C24 26 28 24 32 24C36 24 40 26 42 30M28 38H36M24 44H40M18 52H46' },
        { name: 'The Bone of the Buddha', desc: 'His only transmission: a bowl, a robe, and a bone — the mind-to-mind seal outside the scriptures.', iconPath: 'M18 26H46C46 40 40 48 32 48C24 48 18 40 18 26ZM32 48V56M24 56H40M28 32H36' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Bodhidharma’s mythology is a layer-cake of history and legend: the historical missionary of the early sixth century; the wall-gazer of the Zen records; the Shaolin temple’s patron of the martial arts; and Japan’s round Daruma doll, whose blank eyes you fill in when your wish comes true. The legend grew because the teaching needed a body — and the body it chose was defiant, foreign, and perfectly still.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Transmission Records', title: 'The Crossing to China', text: "<p class='myth-text'>The Zen records send him to the court of the Liang emperor Wudi — the great Buddhist patron who asks, ‘what is the highest meaning of the holy truth?’ and is told ‘vast emptiness, nothing holy’. The emperor, scandalized, asks who stands before him: ‘Don’t know’, says the future patriarch, and leaves for the north. The dialogue founded the Zen interview-style in a single exchange.</p>" },
        { tag: 'Wall-Gazing Legend', title: 'Nine Years, One Wall', text: "<p class='myth-text'>At Shaolin he sat facing a wall nine years; legend adds that in frustration at sleep he cut off his eyelids — and tea, the meditator’s ally, sprang from where they fell. Huike, his future successor, stood in the snow and cut off his own arm to prove his sincerity; Bodhidharma accepted him and transmitted the teaching. The tradition’s founding images are all of this order: resolve measured in what one will lose.</p>" },
        { tag: 'Shaolin Cycle', title: 'The Temple and the Arts', text: "<p class='myth-text'>The legend that he taught the Shaolin monks exercises to strengthen their meditation — the seed of Shaolin kung fu — belongs to the later layers, but it fixed his place in the martial imagination: the first patriarch as the first master of body-discipline. The <em>Yi Jin Jing</em> muscle-classic attaches itself to his name.</p>" },
        { tag: 'Daruma Doll', title: 'The Round Wish-Keeper', text: "<p class='myth-text'>Japan made him a doll: round as the wall-sitter’s robe, weighted to right itself — <em>nanakorobi yaoki</em>, fall seven times, rise eight. You paint one blank eye when you make a wish, the other when it comes true. The fierce Indian master ended as Japan’s most cheerful household god of perseverance, keeping his scowl and his self-righting bottom.</p>" },
      ],
    },
    syncretism: "Bodhidharma is the Silk Road made flesh: Indian dharma, Chinese wall, Japanese doll. The Zen lineages count him as the twenty-eighth Indian and first Chinese patriarch — the hinge of the transmission; and the Tibetan traditions remember him (as Bodhidharmottara) among the great siddhas. His defiance of the Liang emperor became the template of the Zen master’s whole pedagogy.",
    culturalLegacy: "He stands at the head of every Zen lineage — Rinzai and Sōtō alike trace the wall; the Shaolin temple’s global fame rests on his legend; and the Daruma doll, with its self-righting scowl, is Japan’s most reproduced folk object. ‘Zen’ as the West knows it begins, by the tradition’s own account, with his ‘don’t know’.",
    extendedMeditation: "Bodhidharma: the name is a doctrine — awakening-holding, the dharma that holds itself awake. Restored plainly, it spans the journey it names: an Indian word, a Chinese wall, a Japanese doll, and the plain letters any reader can hold. Five syllables, one transmission.",
    sources: [
      { name: 'Transmission of the Lamp (Jingde Record of the Transmission)' },
      { name: 'Blue Cliff Record (Hekiganroku), case 1' },
      { name: 'Shaolin monastery tradition and the Yi Jin Jing' },
      { name: 'McRae, Seeing through Zen (historical layers)' },
    ],
    archaeology: "His supposed grave at Kongxiangsi in the Pagoda Forest of Shaolin carries the earliest memorials; the Shaolin steles of the Tang dynasty name him. The Daruma doll’s manufacture is a modern industry, but the blank-eyed scowl descends from the Muromachi portraits.",
    cult: "Zen’s daily liturgy is his transmission: zazen, the wall-facing sitting, is his nine years made practice. The Daruma-fulfilling rite — the eye-painting — is Japan’s most popular domestic vow.",
    iconography: "The fierce, bearded, wide-eyed Indian in a robe, sometimes with the eyelids; or the round-bottomed Daruma, red-robed, scowling, one-eyed. His icon is the stare — the gaze that outlasts the wall.",
    reception: "History of religion uses him as the case-study of a legend accreting around a historical missionary — the scholarly layers (McRae, Faure) are themselves a literature. The martial-arts world venerates him as its founding master; and the Daruma doll made the fierce patriarch the friend of every Japanese child’s new year.",
  },

  yammu: {
    pronunciation: {
      ipa: '/ˈjɑːmʊ/',
      ipaLabel: 'Ugaritic (conventional vocalisation)',
      phonemes: [
        { symbol: 'Ym', desc: 'Written ym in Ugaritic cuneiform; conventionally vocalised “Yammu”. The word means “sea”.' },
        { symbol: '', desc: 'The Canaanite sea-god, rival and enemy of Baʿal, defeated in the great Baal Cycle of Ugarit.' },
        { symbol: '', desc: 'The name needs no vowels the Ugaritic scribes would not have recognised — a plain transliteration.' },
      ],
      approximation: '“YAH-moo”',
      kin: [
        { label: 'Akkadian', form: 'Tiamat’s kin — the sea-monster of the Enūma eliš' },
        { label: 'Rival', form: 'Baal (Baʿlu) — the storm-god of the Ugaritic tablets' },
      ],
      note: 'He is the sea itself as god: the oldest named enemy in the Baal Cycle, defeated at the world’s beginning.',
    },
    domains: {
      title: 'The Sea, Rival of Baʿal',
      subtitle: 'The Defeated God of the Ugaritic Tablets',
      lead: "<p class='lead-text'><strong>Yammu</strong> is the Canaanite sea-god: the personified ocean whose rebellion against the divine council set the Baal Cycle in motion, and whose defeat by Baʿal — with two magic clubs thrown from the storm-cloud — established the storm-god’s kingship over the gods. The Ugaritic tablets of the fourteenth century BCE, found in 1929, gave him back his name after three thousand years of silence.</p>",
      cards: [
        { name: 'The Sea Itself', desc: 'His name IS the word “sea” (ym) — the ocean as the first rebel against order.', iconPath: 'M8 34C16 28 24 28 32 34C40 40 48 40 56 34M8 44C16 38 24 38 32 44C40 50 48 50 56 44M14 24L16 22M30 20L32 18M46 24L48 22' },
        { name: 'The Two Clubs', desc: '“Chaser” and “Driver”, the magic clubs Baʿal threw to shatter his skull — the cycle’s most quoted scene.', iconPath: 'M14 54L46 16M46 16L40 18M46 16L44 24M14 54L8 48M14 54L20 58M34 34L26 26M38 38L30 30' },
        { name: 'The Divine Council', desc: 'He demanded Baʿal’s surrender from the council of El; the gods’ cowardice set the war in motion.', iconPath: 'M18 40C18 28 26 20 34 22C42 24 46 32 42 40C38 48 26 50 20 44M30 28L28 18M38 32L44 24M22 36L12 32' },
        { name: 'The Tablet’s Return', desc: 'Found at Ugarit (Ras Shamra) in 1929 — the Baal Cycle restored Canaanite religion to history.', iconPath: 'M16 12H48V52H16ZM24 20H40M24 28H40M24 36H40M24 44H32M12 8H52' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Yammu’s mythology is the Baal Cycle’s opening act: the sea demands the storm-god’s surrender, the council wavers, and Baʿal — armed by the craftsman-god Kothar-wa-Khasis with two magic clubs — goes out to meet the flood and splits the sea’s skull between the eyes. It is the Levant’s own dragon-combat — the same pattern as Marduk and Tiamat, Indra and Vritra, told in the oldest alphabetic literature on earth.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'KTU 1.2', title: 'The Embassy of the Sea', text: "<p class='myth-text'>The cycle opens with Yammu’s envoys at the divine council, demanding that Baʿal be delivered into the sea’s power. El, the aged king of the gods, wavers — and it is left to Baʿal himself, with Kothar-wa-Khasis’s weapons, to answer the demand. The scene sets the cycle’s whole theology: kingship is taken, not granted.</p>" },
        { tag: 'KTU 1.2 iv', title: 'The Two Magic Clubs', text: "<p class='myth-text'>Kothar-wa-Khasis gives Baʿal two clubs — Yaggarish, “Chaser”, and Ayyamarri, “Driver”. Baʿal strikes Yammu between the eyes, on the skull: ‘Yammu is dead! Baʿal is king!’ The lines are the Levantine storm-god’s coronation — and the pattern that Hebrew poetry would echo in its own sea-combat, Yahweh versus Yam.</p>" },
        { tag: 'Biblical Echoes', title: 'Yam in the Psalms', text: "<p class='myth-text'>The Hebrew Bible keeps the sea-god’s name as a common noun and his defeat as a motif: ‘Thou didst divide the sea (yam) by thy strength’, ‘thou rulest the raging of the sea (yam)’. The Ugaritic tablets revealed what the Psalms were arguing against — and what they preserved: Yammu’s defeat is the Old Testament sea’s backstory.</p>" },
        { tag: 'Comparative Frame', title: 'The Sea-Enemy Pattern', text: "<p class='myth-text'>Yammu belongs to the oldest myth-complex in the lexicon: the storm-god versus the sea. Tiamat and Marduk in Babylon, Vritra and Indra in the Rigveda, Typhon and Zeus in Greece — the pattern crosses the whole ancient world, and the Ugaritic telling is among its most vivid witnesses. The sea is always first, and always beaten.</p>" },
      ],
    },
    syncretism: "Yammu is the Canaanite branch of the ancient Near Eastern sea-enemy — Tiamat’s cousin, with the Babylonian goddess-dragon as his nearest kin. The Hebrew tradition suppressed him into a noun but kept his combat; and modern study of the Baal Cycle restored him as the indispensable witness to what Israel’s religion argued with. The Greeks of the coast heard Poseidon in him; the scholars hear the pattern.",
    culturalLegacy: "The Baal Cycle’s discovery in 1929 rewrote the history of Canaanite and biblical religion — Yammu’s defeat gave the Psalms their sea-imagery’s original. In Ugaritic studies his name heads every syllabus; and the sea-monster pattern he anchors remains the comparative mythologist’s oldest exhibit.",
    extendedMeditation: "Yammu: the sea’s own name, restored in plain letters that the fourteenth-century scribes would have recognised. He needs no vowel-marks the tablets did not carry — the plain transliteration IS the restoration, and the skull-split the literature remembers.",
    sources: [
      { name: 'KTU 1.2 (the Baal Cycle, tablets from Ras Shamra)' },
      { name: 'Psalms 74, 89 (the sea-combat echoes)' },
      { name: 'Smith, The Ugaritic Baal Cycle' },
      { name: 'Wyatt, Religious Texts from Ugarit' },
    ],
    archaeology: "Yammu’s monuments are the tablets: the Baal Cycle’s cuneiform pages from Ras Shamrt (Ugarit), 1929 — the oldest large alphabetic texts ever found, and the foundation-stones of Northwest Semitic philology.",
    cult: "No surviving cult of Yammu — he was the defeated one, and defeated gods get no temples. But the Baal Cycle’s ritual setting suggests the combat was re-enacted; and the sea’s own liturgy, the storm on the coast, kept his name in the ear.",
    iconography: "No image of Yammu survives — the tablets describe, they do not draw. His icon is the divided sea of the Psalms: the waters standing like walls, the combat fossilized into weather.",
    reception: "Comparative religion’s sea-combat paradigm runs through him — the Ugaritic telling is the pattern’s Levantine anchor. Biblical studies uses his cycle to read the Psalms’ sea-imagery as polemic; and the history of writing counts his tablets among its most consequential finds.",
  },

  venus: {
    pronunciation: {
      ipa: '/ˈwiːnʊs/',
      ipaLabel: 'Latin (epigraphic: VENVS)',
      phonemes: [
        { symbol: 'Ve-', desc: 'Classical Latin w-sound for V; short e as in “set”.' },
        { symbol: '-nus', desc: 'Short u; the form is a noun of the fourth declension — Venus, Veneris.' },
        { symbol: '', desc: 'The standard form carries no diacritics: all vowels short, no marks warranted.' },
      ],
      approximation: '“WAY-noos” — classical; “VEE-nus” in the church pronunciation',
      kin: [
        { label: 'Greek', form: 'Aphrodite — the identification made early and never questioned' },
        { label: 'Epithet', form: 'Venus Genetrix — “Venus the Mother”, Caesar’s divine ancestress' },
      ],
      note: 'The Roman name may descend from *wenos, “desire” — venus, venom, and “win” share the family.',
    },
    domains: {
      title: 'Love, Beauty, the Morning and Evening Star',
      subtitle: 'The Mother of Aeneas, Namesake of the Planet',
      lead: "<p class='lead-text'><strong>Venus</strong> is the Roman goddess of love and beauty — early and completely identified with Greek Aphrodite, but with a Roman political career the Greek original never had: mother of Aeneas, ancestress of the Romans, divine patron of the Julian line, and the planet’s namesake. From Lucretius’ opening hymn to the courtesan-cults of the seaports, she is Rome’s most versatile goddess — and the only one in this lexicon whose name needs no restoration at all.</p>",
      cards: [
        { name: 'The Morning Star', desc: 'The planet Venus — Lucifer at dawn, Vesper at dusk — is her celestial body, brightest in the sky.', iconPath: 'M32 8L38 26L56 32L38 38L32 56L26 38L8 32L26 26ZM18 14L22 18M46 14L42 18M18 50L22 46M46 50L42 46' },
        { name: 'Mother of Aeneas', desc: 'By the Trojan Anchises she bore Aeneas — and through him, the whole Roman race claimed her blood.', iconPath: 'M32 10C26 18 22 28 22 38C22 48 26 54 32 54C38 54 42 48 42 38C42 28 38 18 32 10ZM18 44H46M26 48L32 52L38 48' },
        { name: 'Venus Genetrix', desc: '“Venus the Mother”: Caesar dedicated her a temple in the Forum of Caesar, claiming her line.', iconPath: 'M16 52H48M20 52V32L32 20L44 32V52M28 52V40H36V52M32 20V10M24 15H40' },
        { name: 'The Foam-Born', desc: 'The Greek myth made her sea-born of foam — the Roman poets kept the story and Latinized the name.', iconPath: 'M8 40C16 34 24 34 32 40C40 46 48 46 56 40M32 40C28 32 28 24 32 16C36 24 36 32 32 40ZM24 28L20 22M40 28L44 22M32 12V4' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Venus’ mythology is Aphrodite’s retold in a Roman accent — the foam-birth, the Judgement of Paris, the loves and the intrigues — plus a Roman coda the Greeks never wrote: the divine ancestress of Rome. Virgil’s Aeneid makes her the poem’s moving force, the goddess who shields her son through Troy’s fall to Italy’s shore; and the Julian gens made her their household god.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Hesiod via Rome', title: 'The Foam-Birth', text: "<p class='myth-text'>The Greek story: Cronus’ severed genitals fell into the sea, and from the foam (aphros) rose the goddess, first at Cyprus’ shore. Roman poets from Ennius onward retold it with Venus’ name — the sea-foam’s child Latinized without effort, the island of Cyprus keeping the cult’s oldest address.</p>" },
        { tag: 'Homeric Cycle', title: 'The Judgement of Paris', text: "<p class='myth-text'>At the wedding of Peleus and Thetis, the uninvited Strife threw the golden apple ‘to the fairest’ — and Hera, Athena, and Venus asked the shepherd Paris to judge. Venus’ bribe, Helen, won; the judgement’s price was Troy. The Roman telling keeps every detail — only the goddess’ name has changed, and the empire’s stake in the story.</p>" },
        { tag: 'Aeneid', title: 'The Mother of the Race', text: "<p class='myth-text'>Virgil gives Venus her Roman apotheosis: she saves Aeneas from Troy’s burning, guides him through the sea-wanderings to Italy, and by the divine machinery’s decree founds the line — ‘I am Caesar and his whole Julian race’ — that will rule the world. No Greek goddess had such a son; the epic made her Rome’s mother.</p>" },
        { tag: 'Lucretius', title: 'The Onrushing of Creation', text: "<p class='myth-text'>The De Rerum Natura opens with the great hymn: ‘Venus, mother of Aeneas and his race, delight of men and gods, under your onrushing the leaping clouds flee’. Lucretius made her the Epicurean nature-principle — the generative urge that moves atoms and seasons — philosophy’s most surprising use of a love-goddess.</p>" },
      ],
    },
    syncretism: "Venus absorbed Aphrodite wholesale — the earliest and most complete of the Greco-Roman identifications — and then Isis of the ports, the Syrian goddess of the sailors, and every eastern Astarte the legions met. The planet’s name passed through her to every European language; and the Christian polemics against ‘venereal’ error gave her name its modern shadow.",
    culturalLegacy: "The planet Venus is hers in every tongue that names the sky; the calendar’s Friday (veneris dies) still pays her; and ‘venereal’ keeps her name in the medical vocabulary. The Renaissance adored her — Botticelli’s Birth is her most reproduced image — and the word ‘Venus’ became, in plain Latin letters, the one goddess-name that never needed restoring.",
    extendedMeditation: "Venus: the only entry in the batch whose restoration is a tautology — the name has crossed every border unaltered for three thousand years. She stands in the lexicon as the control-group of the whole project: some names need diacritics to keep what ASCII loses; this one kept everything in plain letters from the start.",
    sources: [
      { name: 'Hesiod, Theogony 176–206 (the foam-birth)' },
      { name: 'Homer, Iliad 24 (the Judgement’s aftermath)' },
      { name: 'Virgil, Aeneid 1–8 (Venus and Aeneas)' },
      { name: 'Lucretius, De Rerum Natura 1.1–49' },
      { name: 'Julius Caesar, Forum of Caesar dedication' },
    ],
    archaeology: "The Forum of Caesar’s temple of Venus Genetrix, the House of the Vettii’s great fresco, the Venus de Milo and the Capitoline Venus — her monuments span the empire. The planet’s telescopic mapping keeps her name on the morning sky.",
    cult: "The Veneralia of April 1, the rites of Venus Erycina on the Capitol, and the courtesans’ cults of the seaports — hers was a religion of the body politic. The Julian line’s household worship made her the state’s ancestress.",
    iconography: "The sea-born goddess wringing her hair, the doves and the swan at her feet, the apple of the judgement in her hand; or the modest Capitoline type. Her icon is the beauty that starts wars — the smile that launched the ships.",
    reception: "Western art made her its favorite subject from Pompeii to the Salon; the word ‘Venus’ became the learned and then the common name for ideal beauty; and the planet’s brutal surface, mapped by her name, is astronomy’s favorite irony — the love-goddess’ world is the hottest hell in the sky.",
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
