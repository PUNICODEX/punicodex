/**
 * PuniCodex — Canonical everyday-word registry (The Gods You Speak Every Day)
 *
 * The curated mapping between ordinary English words and the lexicon entries
 * they descend from. This is a CANONICAL, hand-edited source: every card is
 * editorially reviewed against the same accuracy standard as the lexicon
 * (ACCURACY.md) — a wrong etymology here would be read by exactly the people
 * the site exists to serve.
 *
 * Card fields:
 *   word   — the everyday English word (lowercase)
 *   entry  — the lexicon id it descends from (must exist)
 *   gloss  — what the word means today, in a breath
 *   origin — the descent chain ("Greek panikós → French panique → English")
 *   story  — one or two sentences of the myth that made the word
 *   note   — optional precision note (Roman equivalents, conflations, caveats)
 *   kind   — 'word' (default) or 'false-friend' (a famous WRONG etymology,
 *            busted — the card exists to correct the record)
 *
 * Curation rules:
 *   - If a descent is disputed, the card says so plainly or is dropped.
 *   - Roman equivalents are named when the word came through Latin, but the
 *     card always lands on the lexicon's own entry.
 *   - No word gets in because it "sounds right". Attested or busted.
 */

'use strict';

const EVERYDAY_WORDS = [
  // ── The Greek everyman ────────────────────────────────────────────────
  {
    word: 'panic',
    entry: 'pan',
    gloss: 'sudden, contagious fear',
    origin: 'Greek panikós (of Pan) → French panique → English panic',
    story:
      'Pan haunts lonely places, and the terror that falls on travelers there — the pounding heart, the need to run — the Greeks called panikón deima, Pan-fear. The god who startles flocks gave his name to the feeling.',
  },
  {
    word: 'echo',
    entry: 'echo',
    gloss: 'a repeated sound',
    story:
      'The nymph Ēkhō, cursed (or loved) into having no voice of her own, may only answer with the last words she hears. Every canyon that throws your voice back is speaking her name.',
  },
  {
    word: 'chaos',
    entry: 'chaos',
    gloss: 'total disorder',
    origin: 'Greek kháos (yawning gap) → Latin chaos → English chaos',
    story:
      'In Hesiod, Kháos is not disorder but the first thing: the yawning space before earth, sky, or gods existed. English kept the word and slowly filled the gap with mess.',
  },
  {
    word: 'atlas',
    entry: 'atlas',
    gloss: 'a book of maps',
    story:
      'Átlas holds the sky on his shoulders at the western edge of the world. When Mercator published his map collection in 1595, he put the Titan on the title page — and the book became an atlas.',
  },
  {
    word: 'museum',
    entry: 'ourania',
    gloss: 'a house of kept wonders',
    origin: 'Greek Mouseîon (seat of the Muses) → Latin museum',
    story:
      'A museum was never a building first — it was the shrine of the Muses, the nine daughters of Memory. Alexandria\'s great Mouseîon was a university before it was a gallery.',
  },
  {
    word: 'music',
    entry: 'calliope',
    gloss: 'ordered sound',
    origin: 'Greek mousikḗ (tékhnē) — the art of the Muses',
    story:
      'Anything the Muses touched was mousikē: song, dance, poetry, even astronomy. English narrowed the word to sound alone, but the goddesses are still in it.',
  },
  {
    word: 'narcissism',
    entry: 'narcissus',
    gloss: 'self-love past reason',
    story:
      'Nárkissos, the beautiful youth who wasted away before his own reflection, left his name to the flower that bowed over the water — and to the condition of loving oneself to death.',
  },
  {
    word: 'hygiene',
    entry: 'hygieia',
    gloss: 'the practice of health',
    story:
      'Hygieía, daughter of Asklēpiós, is Health personified — her name simply is the Greek word for it. Every hygienist still carries her water bowl, whether they know it or not.',
  },
  {
    word: 'panacea',
    entry: 'asklepios',
    gloss: 'a cure for everything',
    origin: 'Greek panákeia (all-healing)',
    story:
      'Panákeia, "All-Healer", was a daughter of Asklēpiós and the sister of Hygieía. English borrowed her name for the cure-all that medicine keeps promising and never delivers.',
    note: 'Panákeia herself has no temple of her own; her father the physician-god holds hers.',
  },
  {
    word: 'hypnotic',
    entry: 'hypnos',
    gloss: 'sleep-inducing',
    story:
      'Hýpnos is Sleep itself, twin brother of Death, dwelling where the sun never reaches. Victorian mesmerists named their induced sleep for him, and the word outlived the theory.',
  },
  {
    word: 'tantalize',
    entry: 'tantalus',
    gloss: 'to tease with the unreachable',
    story:
      'Tántalos stands in water that drains when he bends and beneath fruit that lifts when he reaches — punished by proximity, forever. English made a verb of his thirst.',
  },
  {
    word: 'ocean',
    entry: 'okeanos',
    gloss: 'the great sea',
    origin: 'Greek Ōkeanós → Latin oceanus → English ocean',
    story:
      'To the Greeks, Ōkeanós was not a sea but a person: the Titan river that circles the whole disc of the earth, father of every spring. The water took the god\'s name.',
  },
  {
    word: 'geography',
    entry: 'gaia',
    gloss: 'earth-writing',
    origin: 'Greek gê (earth) + gráphō (write)',
    story:
      'Every geo- word — geography, geology, geometry — writes Gaia\'s name. She is not a goddess of the earth; in the oldest theogony she is the earth, the first mother.',
  },
  {
    word: 'psyche',
    entry: 'psyche',
    gloss: 'the mind; the soul',
    story:
      'Psychē means both soul and butterfly in Greek — the breath that leaves the body. Her romance with Eros made her immortal; Freud made her the whole mind.',
  },
  {
    word: 'erotic',
    entry: 'eros',
    gloss: 'of desire',
    story: 'Érōs, in Hesiod among the first beings, is the pull that makes worlds and people come together. Every romance novel owes him royalties.',
  },
  {
    word: 'nemesis',
    entry: 'nemesis',
    gloss: 'an avenger; due downfall',
    story:
      'Némesis is the goddess who notices when fortune goes unbalanced — némein, to apportion what is due. She became the word for the downfall that pride schedules for itself.',
  },
  {
    word: 'typhoon',
    entry: 'typhon',
    gloss: 'a great storm',
    story:
      'Typhôn, the hundred-headed storm-giant Zeus buried under Aetna, sent his name east: Greek typhôn traveled through Arabic ṭūfān to the China seas — where it met the Chinese táifēng, "great wind", and the two storms merged into one word.',
    note: 'A rare honest double etymology: Greek father, Chinese godfather.',
  },
  {
    word: 'fate',
    entry: 'moirai',
    gloss: 'what cannot be escaped',
    origin: 'Latin fatum (what is spoken) — but the Moirai are its oldest face',
    story:
      'The Moîrai spin the thread, measure it, and cut it: Klōthṓ, Lákhesis, Átropos. Even Zeus weighs against their portion. English borrowed Latin fatum for the concept; the Greeks had already personified it threefold.',
  },
  {
    word: 'fortune',
    entry: 'tyche',
    gloss: 'luck; wealth that follows it',
    origin: 'Latin fortuna — the Roman face of Greek Týchē',
    story:
      'Týchē is Chance enthroned, the city\'s luck with a mural crown. Rome called her Fortuna, and English built both "fortune" and "fortunate" on her wheel.',
  },
  {
    word: 'discord',
    entry: 'eris',
    gloss: 'strife; disagreement',
    story:
      'Éris, uninvited, tossed one golden apple — "for the fairest" — and started the Trojan War. Rome named her Discordia, and the word has been sowing itself ever since.',
  },
  {
    word: 'iris',
    entry: 'iris',
    gloss: 'the eye\'s rainbow ring; the flower',
    story:
      'Îris, the gods\' messenger, travels on the rainbow — the arc itself is her road and her sign. The flower wears her colors, and the eye\'s colored ring her name.',
  },
  {
    word: 'arachnid',
    entry: 'arachne',
    gloss: 'a spider and its kin',
    story:
      'Arákhnē, the mortal weaver who rivaled Athena and was changed into a spider, still spins in every scientific name of her class: Arachnida.',
  },
  {
    word: 'cereal',
    entry: 'demeter',
    gloss: 'grain; breakfast made of it',
    origin: 'Latin Cerēālis, of Ceres — the Roman Dēmētēr',
    story:
      'Ceres is the Roman name of Dēmētēr, the grain-mother. Every bowl of cereal is a small daily offering to her, whether poured knowingly or not.',
  },
  {
    word: 'martial',
    entry: 'ares',
    gloss: 'of war',
    origin: 'Latin Mārtiālis, of Mars — the Roman Árēs',
    story:
      'Mars, Rome\'s Árēs, father of the city\'s founders, put his name on the month of March, the planet, and everything warlike from martial law to martial arts.',
  },
  {
    word: 'mercurial',
    entry: 'hermes',
    gloss: 'quick; changeable',
    story:
      'Mercurius — Hermês to the Greeks — is the swift one: messenger, trader, thief. The temperament named for him is quicksilver, and the element took the planet\'s, which took his.',
  },
  {
    word: 'hermetically',
    entry: 'hermes',
    gloss: 'sealed completely (a hermetic seal)',
    story:
      'Hermêtism comes from Hermês Trismégistos, the thrice-great namesake of the messenger god, patron of alchemists. Their perfectly closed vessels made "hermetically sealed" the everyday phrase.',
    note: 'Same god, second career: the god of crossings became the saint of sealing.',
  },
  {
    word: 'jovial',
    entry: 'zeus',
    gloss: 'cheerful; convivial',
    origin: 'Latin joviālis, of Jove — the Roman Zeús',
    story:
      'Those born under Jupiter were said to carry the planet\'s genial temper. Jove is Zeus Latinized, and jovial people still walk around in his good mood.',
  },
  {
    word: 'volcano',
    entry: 'hephaistos',
    gloss: 'a fire mountain',
    origin: 'Latin Vulcānus — the Roman Hḗphaistos',
    story:
      'Vulcan\'s forge burned beneath Aetna, said the Romans, and the mountain\'s fire was his anvil at work. Every volcano on earth works in his smithy still.',
  },
  {
    word: 'aphrodisiac',
    entry: 'aphrodite',
    gloss: 'that which kindles desire',
    story: 'Aphrodítē, foam-born, lends her name directly — no chain, no detour. The Greeks simply attached -akos to the goddess and English kept the receipt.',
  },
  {
    word: 'herculean',
    entry: 'herakles',
    gloss: 'requiring enormous strength',
    origin: 'Latin Herculeus, of Hercules — the Roman Hēraklḗs',
    story:
      'Twelve labors made Hēraklḗs the unit of effort: cleaning the Augean stables alone gave English two idioms at once. A herculean task is one fit for the strongest man who ever wasn\'t.',
  },
  {
    word: 'titanic',
    entry: 'hyperion',
    gloss: 'of enormous scale',
    story:
      'The Titans were the gods before the gods, and their name became the adjective for anything outsized. The ship was named for them too — with the hubris built in, as the Greeks would have predicted.',
  },
  {
    word: 'olympic',
    entry: 'olympos',
    gloss: 'of the great games',
    story:
      'The games at Olympia were held for Olympian Zeus beneath his mountain. Every four years the world still gathers in his honor, mostly without naming him.',
  },
  {
    word: 'aegis',
    entry: 'athena',
    gloss: 'protection; sponsorship (under the aegis of)',
    origin: 'Greek aigís — the storm-shield of Zeus and Athena',
    story:
      'The aigís — goat-skin, storm-cloud, and shield at once — is carried by Zeus and lent to Athena. To act under someone\'s aegis is to stand inside their weather.',
  },
  {
    word: 'stygian',
    entry: 'styx',
    gloss: 'black as the underworld river',
    story:
      'The Stýx is the river by which even gods swear their unbreakable oaths — Hate herself, eldest daughter of Ocean. Her water became the adjective for perfect darkness.',
  },
  {
    word: 'lethargy',
    entry: 'lethe',
    gloss: 'drowsy forgetfulness',
    origin: 'Greek lḗthē (forgetfulness) + argós (idle)',
    story:
      'Lḗthē is the underworld river whose water erases memory; the dead drink to forget their lives. Lethargy is what her name feels like from the inside.',
  },
  {
    word: 'aurora',
    entry: 'eos',
    gloss: 'the dawn; the polar lights',
    origin: 'Latin aurōra — the Roman Ēṓs',
    story:
      'Ēṓs rises from her bed at the edge of Ocean to open the gates of day. Rome called her Aurora; the polar lights wear her name in both hemispheres.',
  },
  {
    word: 'helium',
    entry: 'helios',
    gloss: 'the sun\'s element',
    story:
      'Helium was found in the sun before it was found on earth — a line in the solar spectrum in 1868, named at once for Hḗlios. The only element discovered off-planet.',
  },
  {
    word: 'selenium',
    entry: 'selene',
    gloss: 'the moon\'s element',
    story:
      'Berzelius named his new element for Selḗnē, the moon, to stand beside tellurium, the earth he had just named. Two goddesses, two entries in the periodic table.',
  },
  {
    word: 'uranus',
    entry: 'ouranos',
    gloss: 'the sky\'s planet',
    story:
      'Herschel found the first new planet of the telescopic age in 1781; Bode named it for Ouranós, the sky itself — father of Saturn, grandfather of Jupiter, one rung further out.',
  },
  {
    word: 'apollonian',
    entry: 'apollon',
    gloss: 'ordered; measured; luminous',
    story:
      'Apóllōn is proportion: the lyre, the bow, the law of measure. Nietzsche set him against Dionysos and the pair became the shortest syllabus of Western temperaments.',
  },
  {
    word: 'dionysian',
    entry: 'dionysos',
    gloss: 'ecstatic; unbounded',
    story:
      'Diónysos is the god who unbuttons the world — wine, theatre, ecstasy. Where Apollonian means form, Dionysian means the flood that form holds back.',
  },
  {
    word: 'promethean',
    entry: 'prometheus',
    gloss: 'daringly creative',
    story:
      'Promētheús, "Forethought", stole fire for a race that wasn\'t his and paid by the day for eternity. Promethean is the adjective for gifts that cost the giver everything.',
  },
  {
    word: 'pandora’s box',
    entry: 'pandora',
    gloss: 'a source of many troubles, once opened',
    story:
      'Pandṓra, "All-Gifts", was given a jar of the world\'s sorrows — and Erasmus mistranslated pithos (storage jar) as pyxis (box) in 1508. The most famous box in history was never a box.',
    note: 'The jar is in Hesiod; the box is a Renaissance typo that stuck.',
  },
  {
    word: 'odyssey',
    entry: 'odysseus',
    gloss: 'a long, wandering journey',
    story:
      'Ten years of war, ten years of wandering home — Odysseús turned one man\'s way back into the generic word for every long way back.',
  },
  {
    word: 'mentor',
    entry: 'odysseus',
    gloss: 'a trusted guide',
    story:
      'Méntōr was the old friend Odysseús left to watch his son — and the shape Athena wore when she came to advise the boy. The guidance was divine; the name stayed human.',
    note: 'Méntōr has no temple of his own; the card stands at Odysseús\'s door, whose household he kept.',
  },
  {
    word: 'mnemonic',
    entry: 'mnemosyne',
    gloss: 'a memory aid',
    origin: 'Greek mnēmonikós (of memory)',
    story:
      'Mnēmosýnē is not the goddess of memory — she is Memory itself, mother of the Muses. Every mnemonic trick is a small prayer to the Titaness who mothered all the arts.',
  },
  {
    word: 'amnesia',
    entry: 'mnemosyne',
    gloss: 'the loss of memory',
    origin: 'Greek amnēsía (un-remembering) — the same root, negated',
    story:
      'The same mnē- root that names Memory gives the word for her absence. Amnesia is Mnemosyne with the alpha-privative bolted on: the goddess, switched off.',
  },
  {
    word: 'hubris',
    entry: 'hubris',
    gloss: 'overreach that invites the fall',
    story:
      'Hýbris needed no translation — Greek simply handed English the word whole. The excess that the gods answer is still pronounced wrong by most who feel it coming: it is HY-bris, never HOO-bris.',
  },
  {
    word: 'sisyphean',
    entry: 'sisyphus',
    gloss: 'endlessly, uselessly repeated',
    story:
      'Sísyphos, the cleverest of mortals, rolls his stone up the hill forever for out-tricking Death. Camus told us to imagine him happy; English just made him the adjective for pointless effort.',
  },
  {
    word: 'achilles’ heel',
    entry: 'achilleus',
    gloss: 'the one weak point',
    story:
      'Thetis dipped Akhilleús in the Styx by the heel and left the single mortal spot the arrow found. The tendon at the back of your ankle carries his name for the same reason.',
  },
  {
    word: 'midas touch',
    entry: 'midas',
    gloss: 'the knack of profitable conversion',
    story:
      'Mídās wished that all he touched turn to gold — and learned the cost at his own table. English kept only the profitable half of the lesson.',
  },
  {
    word: 'icarus',
    entry: 'icarus',
    gloss: 'one who flies too close to the sun',
    story:
      'Íkaros climbed on his father\'s wax wings past the warning line and fell into the sea that keeps his name. Every overreach since has been told it is "pulling an Icarus".',
  },
  {
    word: 'labyrinth',
    entry: 'minotauros',
    gloss: 'a maze',
    story:
      'The word is older than Greek — a pre-Hellenic name for the maze at Knossos where the Minótauros was kept. We borrowed the building and forgot the language that named it.',
    note: 'The labrys (double-axe) link is folk etymology; the word\'s true roots are lost, which is oddly fitting.',
  },
  {
    word: 'delphic',
    entry: 'delphoi',
    gloss: 'cryptic; double-edged',
    story:
      'Delphoî, seat of the Pythia, answered questions in hexameters that came true sideways. A Delphic answer is one you understand only after it happens.',
  },
  {
    word: 'python',
    entry: 'python',
    gloss: 'the snake; the language',
    story:
      'Pýthōn, the earth-serpent Apóllōn slew at Delphi, named both the snake and — through Monty Python\'s Flying Circus — the programming language. The logo is a serpent; the humor is British.',
  },
  {
    word: 'phoenix',
    entry: 'phoenix',
    gloss: 'what rises from its own ashes',
    story:
      'The Phoînix burns on its pyre every five hundred years and sings itself back from the ash. Cities, companies, and careers have been claiming the metaphor ever since.',
  },
  {
    word: 'chimera',
    entry: 'chimaira',
    gloss: 'an impossible hybrid; a fantasy',
    story:
      'The Khímaira was lion, goat, and serpent in one breathing body — an assembly that should not exist. Biology and finance both borrowed her for their own impossible hybrids.',
  },
  {
    word: 'sphinx',
    entry: 'sphinx',
    gloss: 'an enigma; the riddler',
    story:
      'The Sphínx asked her riddle at the gates of Thebes and devoured the wrong answers. Oidípous solved her, and her name became the noun for anything that watches and does not explain itself.',
  },
  {
    word: 'calliope',
    entry: 'calliope',
    gloss: 'the steam organ',
    story:
      'Kalliopḗ, "Beautiful-Voice", is the epic Muse. The steam organ that could be heard across a whole fairground was named for her — loud, proud, and impossible to ignore.',
  },
  {
    word: 'terpsichorean',
    entry: 'terpsichore',
    gloss: 'of dance',
    story:
      'Terpsikhṓrē, "Delight in Dance", is the Muse of the chorus. Her name became the formal adjective for dancing — the word ballet critics reach for on deadline.',
  },
  {
    word: 'rhea',
    entry: 'rhea',
    gloss: 'the South American ostrich',
    story:
      'The great flightless bird was named for Rhéā, the Titaness mother of Zeus — mother of the gods lending her name to the mother of all pampas nests.',
  },
  {
    word: 'phoebe',
    entry: 'phoebe',
    gloss: 'the small grey flycatcher',
    story:
      'The bird\'s name descends from Phoíbē, "Bright One", the Titaness of Delphi — the same shining epithet Apóllōn wears as Phoîbos.',
  },
  {
    word: 'zephyr',
    entry: 'zephyros',
    gloss: 'a gentle west breeze',
    origin: 'Greek Zéphyros (the west wind) → Latin Zephyrus → English zephyr',
    story:
      'The gentlest of the Anemoi, who brings the spring and scatters flowers from his cloak, gave his name to any soft breeze. To feel a zephyr on your face is to be touched by a god of the western sky.',
  },
  {
    word: 'egypt',
    entry: 'aigyptos',
    gloss: 'the country itself',
    origin: 'Ḥwt-kꜣ-Ptḥ (House of the Ka of Ptah) → Greek Aígyptos → English Egypt',
    story:
      'The country\'s name is a temple address: "House of the Soul of Ptah", Memphis\'s great temple, which Greeks heard as Aígyptos and applied to the whole land. Kemet — the Black Land — is what its people actually called it.',
  },
  {
    word: 'avatar',
    entry: 'vishnu',
    gloss: 'a descended form; a profile picture',
    origin: 'Sanskrit avatāra (descent)',
    story:
      'An avatāra is a descent — Vishnu stepping down into the world in form after form. Computing borrowed the word for our own small descents into the digital world.',
  },
  {
    word: 'karma',
    entry: 'karma',
    gloss: 'action and its returning consequence',
    story:
      'Karman simply means "action, deed" — the doctrine is that deeds return. English kept the consequence and dropped the theology, but the ledger still balances.',
  },

  // ── The Norse week ────────────────────────────────────────────────────
  {
    word: 'tuesday',
    entry: 'tyr',
    gloss: 'the third day',
    origin: 'Old English Tīwesdæg — Týr\'s day',
    story:
      'Týr, the one-handed god who put his wrist in Fenrir\'s mouth as the gods\' pledge, gave his name to the third day. The wolf is still biting, somewhere beyond the weekend.',
  },
  {
    word: 'wednesday',
    entry: 'odinn',
    gloss: 'the fourth day',
    origin: 'Old English Wōdnesdæg — Wōden\'s (Óðinn\'s) day',
    story:
      'Óðinn — Wōden to the English — hung nine nights on the world-tree for the runes. Midweek is his monument, spelled his way since the first English calendars.',
  },
  {
    word: 'thursday',
    entry: 'thor',
    gloss: 'the fifth day',
    origin: 'Old English Þunresdæg — Thunder\'s (Þórr\'s) day',
    story:
      'Þórr is Thunder himself, and his day was Thunder\'s day before it was Thursday. Every week, the fifth day still rolls his cart across the sky.',
  },
  {
    word: 'friday',
    entry: 'frigg',
    gloss: 'the sixth day',
    origin: 'Old English Frīgedæg — Frigg\'s day',
    story:
      'Frigg, Óðinn\'s queen, who knows all fates and speaks none, gives her name to the week\'s end. The name is sometimes lent to Freyja too — the two goddesses were already blending a thousand years ago.',
    note: 'Frigg or Freyja? The sources blend; the day honors both readings.',
  },

  // ── False friends: famous etymologies that are wrong ─────────────────
  {
    word: 'chronology',
    entry: 'kronos',
    kind: 'false-friend',
    gloss: 'the ordering of time',
    story:
      'It is tempting to name Krónos, the Titan who devoured his children, as the father of time-words. He is not: chronology comes from khrónos (χρόνος), time itself — a different word the Greeks kept carefully separate. The pun is ancient, but it is a pun, not a parent.',
    note: 'The confusion is so old it has a name: "Kronos/Chronos conflation". Knowing the difference is the whole card.',
  },
  {
    word: 'cloth',
    entry: 'clotho',
    kind: 'false-friend',
    gloss: 'woven fabric',
    story:
      'Klōthṓ spins the thread of life, so "cloth" must be hers — a lovely etymology, and a false one. English cloth is homegrown Germanic (Old English clāþ), not borrowed from the Fate. The similarity is a coincidence of ancient spinning roots, not a descent.',
    note: 'The goddess\'s name and the fabric are cousins at best, several thousand years removed.',
  },
  {
    word: 'adamant',
    entry: 'adamas',
    gloss: 'unyielding; archaic name for the hardest substance, the diamond',
    origin: 'undefined undefined → English adamant',
    story: 'Adamant descends from undefined — unyielding; archaic name for the hardest substance, the diamond. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'diamond',
    entry: 'adamas',
    gloss: 'the gemstone, from ἀδάμας through Latin and French',
    origin: 'undefined undefined → English diamond',
    story: 'Diamond descends from undefined — the gemstone, from ἀδάμας through Latin and French. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'dragon',
    entry: 'drakon',
    gloss: 'the great serpent of myth; by extension, any fierce guardian',
    origin: 'undefined undefined → English dragon',
    story: 'Dragon descends from undefined — the great serpent of myth; by extension, any fierce guardian. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'ether',
    entry: 'aither',
    gloss: 'the rarefied upper air; later, a hypothetical all-pervading medium',
    origin: 'undefined undefined → English ether',
    story: 'Ether descends from undefined — the rarefied upper air; later, a hypothetical all-pervading medium. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'air',
    entry: 'aer',
    gloss: 'the breathable atmosphere, from Greek ἀήρ via Latin and Old French',
    origin: 'undefined undefined → English air',
    story: 'Air descends from undefined — the breathable atmosphere, from Greek ἀήρ via Latin and Old French. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'eristic',
    entry: 'eris',
    gloss: 'argumentative for its own sake, from Greek ἐριστικός (rare but attested)',
    origin: 'undefined undefined → English eristic',
    story: 'Eristic descends from undefined — argumentative for its own sake, from Greek ἐριστικός (rare but attested). The name survives in the word; the word still carries the god.',
  },
  {
    word: 'adonis',
    entry: 'adonis',
    gloss: 'a strikingly handsome young man, from the beautiful doomed youth',
    origin: 'undefined undefined → English adonis',
    story: 'Adonis descends from undefined — a strikingly handsome young man, from the beautiful doomed youth. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'daedal',
    entry: 'daedalus',
    gloss: 'intricately skilful, ingenious — a rare adjective from δαίδαλος',
    origin: 'undefined undefined → English daedal',
    story: 'Daedal descends from undefined — intricately skilful, ingenious — a rare adjective from δαίδαλος. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'medusa',
    entry: 'medousa',
    gloss: 'a jellyfish\'s bell-shaped life stage; a formidable woman',
    origin: 'Greek Μέδουσα (Médousa, the Gorgon) → Latin Medusa → English medusa',
    story: 'The Gorgon\'s serpent hair survived her death: Athena fixed it on the aegis, and eighteenth-century zoologists borrowed her name for the drifting, many-armed medusa — the life-stage of the jellyfish.',
  },
  {
    word: 'hydra',
    entry: 'hydra',
    gloss: 'a many-headed problem; a freshwater polyp',
    origin: 'Greek Ὕδρα (Hýdra, the Lernaian water-serpent) → Latin hydra → English hydra',
    story: 'Herakles learned that cutting off one of the Hydra\'s heads grows two. English took the name for any evil that multiplies when attacked — and, for its snaky arms, for the small freshwater polyp.',
  },
  {
    word: 'psychology',
    entry: 'psyche',
    gloss: 'the study of the mind',
    origin: 'Greek ψυχή (psychḗ, soul, breath) + -λογία (study) → New Latin psychologia → English psychology',
    story: 'Psychḗ began as the breath that leaves the dying; Greek formed psychología, the study of the soul, and the modern science of mind still carries her name in its title.',
  },
  {
    word: 'oneiric',
    entry: 'oneiros',
    gloss: 'dreamlike; pertaining to dreams',
    origin: 'Greek ὄνειρος (óneiros, dream) → learned borrowing oneiric (19th century)',
    story: 'From Óneiros, the dream-child of Nyx, English took a bookish adjective for anything that behaves like a dream — the oneiric logic of surrealism owes its name to the son of Night.',
  },
  {
    word: 'omphalos',
    entry: 'omphalos',
    gloss: 'a sacred center; the navel',
    origin: 'Greek ὀμφαλός (omphalós, navel) → direct learned borrowing',
    story: 'Delphi\'s omphalos was the navel of the world, the stone that marked where Zeus\'s two eagles met. English keeps the word for any place that claims to be the center of things.',
  },
  {
    word: 'pyre',
    entry: 'pyr',
    gloss: 'a pile of wood for burning, especially a funeral pile',
    origin: 'Greek πυρά (pyrá, fire, pyre; from πῦρ, pŷr) → Latin pyra → English pyre',
    story: 'Patroklos burns on a great pyre in the Iliad, and the English word for the funeral fire comes straight from Greek fire — πῦρ, whose genitive πυρός preserves a consonant the nominative lost.',
  },
  {
    word: 'orphic',
    entry: 'orpheus',
    gloss: 'mysterious or esoteric; pertaining to Orpheus or Orphism',
    origin: 'Greek Ὀρφεύς (Orpheús) → Ὀρφικός → English orphic',
    story: 'The Orphic poems were sung for initiates, not crowds, and English remembers: an orphic text is one that keeps its meaning behind a veil — the singer\'s secrecy fossilized in an adjective.',
  },
  {
    word: 'monoceros',
    entry: 'monokeros',
    gloss: 'the unicorn; a one-horned creature',
    origin: 'Greek μονόκερως (monókerōs, one-horned) → Latin monoceros → English monoceros',
    story: 'Ctesias brought the one-horned wild ass of India to Greece as the monókerōs; Latin kept the learned form monoceros, and English still uses it for the unicorn and for the northern constellation named after the beast.',
  },
  {
    word: 'siren',
    entry: 'seiren',
    gloss: 'A warning device and an alluring, dangerous woman; from Latin sīrēn, borrowed from Greek Σειρήν.',
    origin: 'undefined undefined → English siren',
    story: 'Siren descends from undefined — A warning device and an alluring, dangerous woman; from Latin sīrēn, borrowed from Greek Σειρήν.. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'thanatology',
    entry: 'thanatos',
    gloss: 'The study of death and dying; from Greek Θάνατος with -λογία.',
    origin: 'undefined undefined → English thanatology',
    story: 'Thanatology descends from undefined — The study of death and dying; from Greek Θάνατος with -λογία.. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'spartan',
    entry: 'sparte',
    gloss: 'Austere, disciplined, frugal; from Sparta\'s reputation for rigorous simplicity.',
    origin: 'undefined undefined → English spartan',
    story: 'Spartan descends from undefined — Austere, disciplined, frugal; from Sparta\'s reputation for rigorous simplicity.. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'Trojan',
    entry: 'troia',
    gloss: 'Relating to Troy; figuratively a determined or deceptive agent (cf. \'Trojan horse\').',
    origin: 'undefined undefined → English Trojan',
    story: 'Trojan descends from undefined — Relating to Troy; figuratively a determined or deceptive agent (cf. \'Trojan horse\').. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'valhalla',
    entry: 'valholl',
    gloss: 'entered English as a common noun — a hall of the honored dead; from Old Norse Valhǫll',
    origin: 'undefined undefined → English valhalla',
    story: 'Valhalla descends from undefined — entered English as a common noun — a hall of the honored dead; from Old Norse Valhǫll. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'ettin',
    entry: 'jotunheimr',
    gloss: 'archaic literary English for a giant — from Old Norse jǫtunn, the giant whose realm Jötunheimr is',
    origin: 'undefined undefined → English ettin',
    story: 'Ettin descends from undefined — archaic literary English for a giant — from Old Norse jǫtunn, the giant whose realm Jötunheimr is. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'ibis',
    entry: 'thoth',
    gloss: 'the wading bird sacred to Thoth, whose Egyptian name hbj is the ultimate source of the English word',
    origin: 'undefined undefined → English ibis',
    story: 'Ibis descends from undefined — the wading bird sacred to Thoth, whose Egyptian name hbj is the ultimate source of the English word. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'uraeus',
    entry: 'wadjet',
    gloss: 'the rearing cobra emblem of kingship — the goddess Wadjet herself — from Egyptian iꜥrt through Greek ouraios',
    origin: 'undefined undefined → English uraeus',
    story: 'Uraeus descends from undefined — the rearing cobra emblem of kingship — the goddess Wadjet herself — from Egyptian iꜥrt through Greek ouraios. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'ankh',
    entry: 'ankh',
    gloss: 'the looped cross of life, borrowed whole from Egyptian ꜥnḫ \'life\' as an English word for the symbol',
    origin: 'undefined undefined → English ankh',
    story: 'Ankh descends from undefined — the looped cross of life, borrowed whole from Egyptian ꜥnḫ \'life\' as an English word for the symbol. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'juggernaut',
    entry: 'jagannatha',
    gloss: 'From Jagannātha, the Puri \'Lord of the World\', via British-era accounts of his Ratha Yātrā car procession — English first applied the word to the unstoppable temple car, then to any overwhelming, crushing force.',
    origin: 'undefined undefined → English juggernaut',
    story: 'Juggernaut descends from undefined — From Jagannātha, the Puri \'Lord of the World\', via British-era accounts of his Ratha Yātrā car procession — English first applied the word to the unstoppable temple car, then to any overwhelming, crushing force.. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'Kobe',
    entry: 'kobe',
    gloss: 'as in Kobe beef — beef from Wagyu cattle raised in the Kobe region of Hyōgo, Japan; the place name, itself taken from the \'god-door\' households of Ikuta Shrine, became an English word with the 20th-century luxury trade',
    origin: 'undefined undefined → English Kobe',
    story: 'Kobe descends from undefined — as in Kobe beef — beef from Wagyu cattle raised in the Kobe region of Hyōgo, Japan; the place name, itself taken from the \'god-door\' households of Ikuta Shrine, became an English word with the 20th-century luxury trade. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'Fuji',
    entry: 'fuji',
    gloss: 'as in Fuji apple — the sweet, crisp cultivar named after Mount Fuji, which brought the sacred mountain\'s name into orchards and grocery stores worldwide',
    origin: 'undefined undefined → English Fuji',
    story: 'Fuji descends from undefined — as in Fuji apple — the sweet, crisp cultivar named after Mount Fuji, which brought the sacred mountain\'s name into orchards and grocery stores worldwide. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'Confucian',
    entry: 'kongzi',
    gloss: 'relating to Kǒngzǐ and his school of ethics and ritual; a follower of that tradition',
    origin: 'undefined undefined → English Confucian',
    story: 'Confucian descends from undefined — relating to Kǒngzǐ and his school of ethics and ritual; a follower of that tradition. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'tai chi',
    entry: 'taichi',
    gloss: 'the Chinese martial art named for the cosmological Tàijí, the Supreme Ultimate',
    origin: 'undefined undefined → English tai chi',
    story: 'Tai chi descends from undefined — the Chinese martial art named for the cosmological Tàijí, the Supreme Ultimate. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'yin-yang',
    entry: 'yinyang',
    gloss: 'the Chinese cosmological pairing of complementary opposites, in everyday English a symbol of balanced duality',
    origin: 'undefined undefined → English yin-yang',
    story: 'Yin-yang descends from undefined — the Chinese cosmological pairing of complementary opposites, in everyday English a symbol of balanced duality. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'longan',
    entry: 'long',
    gloss: 'the sweet \'dragon-eye\' fruit of Southeast Asia, from Cantonese lùhng-ngáahn \'dragon eye\'',
    origin: 'undefined undefined → English longan',
    story: 'Longan descends from undefined — the sweet \'dragon-eye\' fruit of Southeast Asia, from Cantonese lùhng-ngáahn \'dragon eye\'. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'June',
    entry: 'iuno',
    gloss: 'the sixth month — from Latin Iūnius mēnsis, the month of Iūnō',
    origin: 'undefined undefined → English June',
    story: 'June descends from undefined — the sixth month — from Latin Iūnius mēnsis, the month of Iūnō. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'January',
    entry: 'ianus',
    gloss: 'the first month — from Latin Iānuārius, the month of Iānus, god of beginnings',
    origin: 'undefined undefined → English January',
    story: 'January descends from undefined — the first month — from Latin Iānuārius, the month of Iānus, god of beginnings. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'venereal',
    entry: 'venus',
    gloss: 'of sexual love or its diseases — from Latin venereus, \'of Venus\'',
    origin: 'undefined undefined → English venereal',
    story: 'Venereal descends from undefined — of sexual love or its diseases — from Latin venereus, \'of Venus\'. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'quetzal',
    entry: 'quetzalcoatl',
    gloss: 'the resplendent Central American bird — from Spanish quetzal, from Nahuatl quetzalli \'long green tail-feather,\' the very first element of the god\'s name.',
    origin: 'undefined undefined → English quetzal',
    story: 'Quetzal descends from undefined — the resplendent Central American bird — from Spanish quetzal, from Nahuatl quetzalli \'long green tail-feather,\' the very first element of the god\'s name.. The name survives in the word; the word still carries the god.',
  },
  {
    word: 'axolotl',
    entry: 'xolotl',
    gloss: 'the Mexican walking salamander, popularly named for Xōlōtl — from Mexican Spanish, from Nahuatl āxōlōtl \'water-servant\' (atl \'water\' + xōlōtl), built on the same element as the god\'s name.',
    origin: 'undefined undefined → English axolotl',
    story: 'Axolotl descends from undefined — the Mexican walking salamander, popularly named for Xōlōtl — from Mexican Spanish, from Nahuatl āxōlōtl \'water-servant\' (atl \'water\' + xōlōtl), built on the same element as the god\'s name.. The name survives in the word; the word still carries the god.',
  },
];

module.exports = { EVERYDAY_WORDS };
