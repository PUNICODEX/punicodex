#!/usr/bin/env node
/**
 * Lore-catalog merge — Norse/Celtic batch: surtr, njord, danu, gronwpebr (ascii-restoration 2026-11).
 * Idempotent: existing non-empty entries are NEVER overwritten.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LORE_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(LORE_PATH, 'utf8'));

const ENTRIES = {
  surtr: {
    pronunciation: {
      ipa: '/ˈsurtz/',
      ipaLabel: 'Old Norse (normalised)',
      phonemes: [
        { symbol: 'Sur-', desc: 'The s is voiceless, the u as in “put”; the r is trilled.' },
        { symbol: '-tr', desc: 'Final r is sounded — “SOOR-tr”. The name means “the black one”, from the noun svart “black”.' },
        { symbol: '', desc: 'The anglicised “Surt” drops the final r; the canonical Old Norse form keeps it.' },
      ],
      approximation: '“SOOR-tr” — trilled r, both syllables short',
      kin: [
        { label: 'Anglicised', form: 'Surt — the dropped-final form, kept as a separate lexicon entry' },
        { label: 'Attestation', form: 'Poetic Edda (Völuspá, Vafþrúðnismál) and Snorri’s Edda' },
      ],
      note: 'The name is the adjective “black” nominalised — the fire-giant is the black one at the world’s end.',
    },
    domains: {
      title: 'The Black One, the Fire at the End',
      subtitle: 'The Fire-Giant of Múspellsheimr',
      lead: "<p class='lead-text'><strong>Surtr</strong> is the fire that ends the world: the black giant of Múspellsheimr, the realm of flame beyond the world’s rim, who will ride forth at Ragnarök with his burning sword brighter than the sun, defeat Freyr, and set the nine worlds ablaze — from whose surge the renewed earth rises. The Völuspá gives him the last word of the old world and the first light of the new.</p>",
      cards: [
        { name: 'The Burning Sword', desc: 'His sword shines brighter than the sun; with it he splits the world-tree’s shelter and sets the sky afire.', iconPath: 'M16 50L46 14M46 14L40 18M46 14L44 22M16 50L10 44M16 50L22 56M34 34L28 28M38 38L32 32' },
        { name: 'Múspellsheimr', desc: 'His realm of fire, the southernmost of the nine worlds — hot and radiant, guarded for the last battle.', iconPath: 'M32 12C26 22 22 30 22 38C22 46 26 52 32 52C38 52 42 46 42 38C42 30 38 22 32 12ZM32 40V52M16 20L18 18M48 20L50 18M32 6V2' },
        { name: 'The Doom of Freyr', desc: 'At Ragnarök he kills Freyr, who lacks his own sword — the gods’ summer falls to the world’s fire.', iconPath: 'M14 42C22 30 42 30 50 42M20 42L26 32M32 42V30M44 42L38 32M10 50H54' },
        { name: 'The Renewer', desc: 'From his fire the new earth rises green — the destroyer as the price of the world’s rebirth.', iconPath: 'M32 52C32 36 32 26 32 16M32 16C24 22 18 32 18 42C26 40 31 28 32 16ZM32 16C40 22 46 32 46 42C38 40 33 28 32 16Z' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Surtr’s mythology is the eschaton itself: he barely acts in the world’s story because his role is to end it. The Eddic poems give him Múspellsheimr, the sword of the sun’s brightness, the march at Ragnarök, the killing of Freyr, and the fire that consumes and renews. He is the Norse pantheon’s only fire-god — the flames of the end, kept outside the world until the world’s last hour.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Völuspá', title: 'The One from the South', text: "<p class='myth-text'>The seeress’ prophecy reserves its starkest stanzas for him: ‘Surtr comes from the south with the bane of branches, the sun of the battle-gods shone from his sword.’ He rides first of the doom-forces; his arrival is the sign that the last battle has begun, and the sky itself catches fire from his blade.</p>" },
        { tag: 'Vafþrúðnismál', title: 'The Contest of Wisdom', text: "<p class='myth-text'>Odin’s wisdom-contest with the giant Vafþrúðnir fixes the cosmography: Surtr and the Æsir’s gods will meet at the field of Vígríðr, and ‘he will return home victorious’ from the encounter with Freyr. The poem’s calm arithmetic of doom — the lists of who kills whom — gives Surtr the war’s decisive duel.</p>" },
        { tag: 'Gylfaginning', title: 'The Guardian of the Flame-Realm', text: "<p class='myth-text'>Snorri’s prose Edda places him as Múspellsheimr’s guardian from the beginning — the fire that predates the world and will outlast it. His sons, the ‘sons of Múspell’, ride with him; their host waits at the world’s rim through every age, kept out by the world’s green and the gods’ vigil.</p>" },
        { tag: 'Eschatological Frame', title: 'The Fire That Renews', text: "<p class='myth-text'>The Norse end is not the Christian end: after Surtr’s fire the earth rises green from the sea, the gods’ survivors meet, and the world begins again. The fire-giant’s destruction is the renewal’s price — the black one’s blaze is the last act of the old world and the first condition of the new.</p>" },
      ],
    },
    syncretism: "Surtr is the Norse eschaton’s Persian fire: comparatists long ago paired him with the Zoroastrian world-fire and the volcanic destroyers of other traditions; and his role — the outsider-god of flame who ends and purifies — reads like a structural cousin of the Vedic Agni pushed to the world’s edge. Wagner’s Loge and Tolkien’s surtur-imagery carried him into modern fantasy as the type of the world-ending fire.",
    culturalLegacy: "The Völuspá’s ‘sun of the battle-gods’ image remains Norse mythology’s most quoted line of doom; and Surtr is the fantasy genre’s template for the fire-giant — from D&D’s fire giants to video games, his name is the standard label for volcanic end-bosses. Iceland’s volcanic place-names (Surtshellir, the ‘cave of Surtr’) keep him in the landscape itself.",
    extendedMeditation: "Surtr: the black one, restored in plain letters that hold no fire and yet smoulder. The lexicon keeps the full Old Norse form — the trilled r, the dropped-nothing spelling — because a world-ending fire deserves an unabbreviated name.",
    sources: [
      { name: 'Völuspá (the Ragnarök stanzas)' },
      { name: 'Vafþrúðnismál (the doom-arithmetic)' },
      { name: 'Snorri, Gylfaginning (Múspellsheimr and the sons of Múspell)' },
      { name: 'Fáfnismál (the forewarning of doom)' },
    ],
    archaeology: "Surtr’s monuments are volcanic: Iceland’s Surtshellir cave was used from the settlement age, its name the giant’s. The Eddic manuscripts — Codex Regius and its kin — give the words; the island’s lava-fields give the theatre.",
    cult: "No cult of Surtr is recorded — one does not worship the end. But the volcanic placenames and the Völuspá’s recitation tradition keep his name in the North’s mouth; and the modern Ásatrú movement’s Ragnarök-rites address the fire he brings.",
    iconography: "A giant wreathed in flame, sword raised like a second sun; black against his own fire — the svart one made visible by his blaze. His icon is the burning sword held high at the world’s rim.",
    reception: "Comparative eschatology sets him beside the world-fires of Persia and the volcano-gods of the Pacific as the destroyer whose blaze renews; and modern fantasy made his name generic — ‘Surt’ appears in more games and novels than any other Eddic name. The black one has become the genre’s default apocalypse.",
  },

  njord: {
    pronunciation: {
      ipa: '/ˈnjɔːrd/',
      ipaLabel: 'Old Norse (normalised)',
      phonemes: [
        { symbol: 'Nj-', desc: 'The nj is a palatalised n — “ny” as in “canyon”; the vowel å as in “or”.' },
        { symbol: '-ǫrð', desc: 'The final ð is the soft “th” of “this” — “NYORTH”. The anglicised “Njord” keeps only the n.' },
        { symbol: '', desc: 'The Old Norse form carries the palatal and the soft ð; the plain anglicisation is a separate lexicon entry.' },
      ],
      approximation: '“NYORTH” — palatal n, soft th ending',
      kin: [
        { label: 'Anglicised', form: 'Njord — the plain form, kept as a separate lexicon entry' },
        { label: 'Lineage', form: 'father of Freyr and Freyja; the Vanir hostage among the Æsir' },
      ],
      note: 'The name may be related to the Germanic Nerthus of Tacitus’ Germania — the earth-goddess of the first-century North.',
    },
    domains: {
      title: 'The Sea, Wealth, the Vanir Hostage',
      subtitle: 'God of the Shore and the Fair Wind',
      lead: "<p class='lead-text'><strong>Njǫrðr</strong> is the Norse sea-god of the safe shore: the Vanir hostage who chose the sea-cliffs over the mountains, father of Freyr and Freyja, giver of wealth and fair winds to sailors and merchants. He is the gods’ peacemaker — the hostage-exchange that ended the Æsir–Vanir war made him the divine guarantee that treaties hold, and the sea’s temper mirrors his: calm, rich, and implacable when crossed.</p>",
      cards: [
        { name: 'Lord of the Coast', desc: 'He rules the sea’s edge and the fair wind — sailors and merchants call on him for safe passage and good trade.', iconPath: 'M8 36C16 30 24 30 32 36C40 42 48 42 56 36M8 46C16 40 24 40 32 46C40 52 48 52 56 46M16 26L18 24M32 22L34 20M48 26L50 24' },
        { name: 'The Hostage of Peace', desc: 'Given to the Æsir to seal the peace with the Vanir; the gods’ own guarantee that oaths bind.', iconPath: 'M18 40C18 28 26 20 34 22C42 24 46 32 42 40C38 48 26 50 20 44M30 28L28 18M38 32L44 24M22 36L12 32' },
        { name: 'Father of the Twins', desc: 'Freyr and Freyja are his children by his sister — the Vanir marriage-custom the Æsir could not accept.', iconPath: 'M32 10V28M32 14L48 22M32 14L16 22M32 28L20 46M32 28L44 46M32 28V52M24 40H40' },
        { name: 'Giver of Wealth', desc: 'Sea-wealth flows from him — the Norse word for wealth and the sea’s gift are his domain together.', iconPath: 'M22 16H42L38 52H26ZM32 16V8M26 28H38M27 38H37M28 46H36M32 52V56' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Njǫrðr’s mythology is the peace-myth: the hostage-exchange that ended the gods’ first war, and the marriage that failed across the divine factions. His two stories — the Æsir–Vanir peace and the nine nights with Skaði — are the Norse pantheon’s domestic politics, and both end in the same lesson: some bonds hold, and some were never possible.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Gylfaginning', title: 'The Æsir–Vanir Peace', text: "<p class='myth-text'>The first war in the world — Æsir against Vanir — ended not in victory but in exchange: Njǫrðr and his children went to the Æsir, and the Vanir received Hœnir and Mímir in return. Snorri notes the exchange’s unevenness (the Vanir beheaded Mímir in disgust) and its durability: Njǫrðr became the Æsir’s own sea-lord, the living treaty between the divine races.</p>" },
        { tag: 'Skáldskaparmál', title: 'The Nine Nights with Skaði', text: "<p class='myth-text'>Skaði, the ski-goddess, chose her husband by his feet among the veiled gods — she reached for Baldr and got Njǫrðr. Their marriage split on geography: he could not sleep in her mountain halls, where the wolves’ howling kept him from rest; she could not sleep by the sea, where the gulls’ crying drove her mad. Nine nights in each home, then the parting — the gods’ most honest divorce.</p>" },
        { tag: 'Lokasenna', title: 'The Flyting’s Accusations', text: "<p class='myth-text'>Loki’s taunting catalogue in the gods’ hall accuses Njǫrðr of fathering his children on his own sister — the Vanir custom the Æsir condemned — and of letting the hostage’s price be paid in shame. Njǫrðr’s answer is dignity itself: ‘small harm in a lover, when sisters and husbands are beyond the gods’ borders’ — the hostage’s quiet defense of his people’s ways.</p>" },
        { tag: 'Tacitus’ Nerthus', title: 'The Earth-Before-the-Sea', text: "<p class='myth-text'>Tacitus’ Germania describes the North’s first-century goddess Nerthus — an earth-deity drawn in a covered wagon, feasted, and drowned in her lake in secret rites. Linguists and historians of religion long ago set Njǫrðr and Nerthus side by side: the same divine name, perhaps, before the sea claimed the land’s share — the gender and the element exchanged across the centuries.</p>" },
      ],
    },
    syncretism: "The Njǫrðr–Nerthus pair is the classic case of a deity’s sex and element swapped across the sources; and his hostage-role maps onto the comparative pattern of the divine guarantor (the Roman fétiales’ peace-gods). In modern Heathenry he is the Vanir’s standard-bearer, invoked at sea-rites and trade-oaths alike.",
    culturalLegacy: "The nine-nights marriage is the Norse corpus’s most quoted domestic story — the gods’ own lesson that love does not survive incompatible homes. Scandinavia’s coastal placenames keep him; and the modern North’s shipping-prayers, where they survive, address the sea-lord by his name.",
    extendedMeditation: "Njǫrðr: the sea-lord with the soft th ending, restored here in the anglicised plain form while the canonical Norse spelling holds the flagship. The plain name is the sailor’s hail — shouted from a deck, the palatal and the ð were always going to be lost; the lexicon keeps both forms, as the shore keeps both the calm and the storm.",
    sources: [
      { name: 'Snorri, Gylfaginning & Skáldskaparmál' },
      { name: 'Lokasenna (the flyting)' },
      { name: 'Tacitus, Germania 40 (Nerthus)' },
      { name: 'Vafþrúðnismál (Vanir references)' },
    ],
    archaeology: "The wagon-processions of Tacitus’ Nerthus are mirrored in the North German bog-finds — the Dejbjerg wagon, the peat-preserved carts of the Jutland ritual deposits. Njǫrðr himself leaves no image; the sea and the drowned wagons are his archive.",
    cult: "No surviving temple, but the coastal offering-places of the Viking Age — the boat-graves’ provisions, the beach-cairns — read as his. Modern Heathen blóts at the shore address him for wind and wealth, keeping the old bargain.",
    iconography: "A dignified elder of the sea, sometimes with the ship’s tiller or the fish; in modern art, the calm between wave-crests. His icon is the safe shore — the sea’s edge where wealth lands.",
    reception: "Comparative religion uses the Njǫrðr–Nerthus question as the textbook problem of deity-evidence across genres and centuries; and the nine-nights marriage is the standard citation in studies of mythic divorce. The sea-lord has become, in the modern North, the patron invoked when the old treaties are remembered.",
  },

  danu: {
    pronunciation: {
      ipa: '/ˈdɑːnuː/',
      ipaLabel: 'Reconstructed Celtic / Irish transmission',
      phonemes: [
        { symbol: 'Dā-', desc: 'Long ā as in “father”; the name is reconstructed Proto-Celtic *Dānu.' },
        { symbol: '-nu', desc: 'The final u is long; the name descends from the Indo-European river-mother *dānu, “the flowing one”.' },
        { symbol: '', desc: 'The eponym of the Tuatha Dé Danann — “the peoples of the goddess Danu”.' },
      ],
      approximation: '“DAH-noo”',
      kin: [
        { label: 'River family', form: 'Danube, Don, Dnieper, Dysna — all from the same *dānu root' },
        { label: 'Eponym', form: 'the Tuatha Dé Danann, “the peoples of Danu”' },
      ],
      note: 'The name is the same word as the Danube and the Don — the river-mother of the Indo-Europeans, eponym of Ireland’s divine race.',
    },
    domains: {
      title: 'Knowledge, Wisdom, Mother of the Tuatha Dé Danann',
      subtitle: 'The River-Mother of the Divine Race',
      lead: "<p class='lead-text'><strong>Danu</strong> is Ireland’s primordial mother-goddess: the eponym of the Tuatha Dé Danann, the ‘peoples of Danu’, the divine race who came from the northern islands to take Ireland in the island’s deepest legends. She herself barely appears in the texts — her children take every scene — but the race’s name keeps hers, and the river-name she shares with the Danube and the Don marks her as the Celtic river-mother, the flowing one beneath the whole family.</p>",
      cards: [
        { name: 'Mother of the Dé Danann', desc: 'The divine race bears her name — the Tuatha Dé Danann, the peoples of the goddess Danu.', iconPath: 'M32 10C26 18 22 28 22 38C22 48 26 54 32 54C38 54 42 48 42 38C42 28 38 18 32 10ZM18 44H46M26 48L32 52L38 48' },
        { name: 'The River-Mother', desc: 'Her name is the Indo-European *dānu — the same root as the Danube, the Don, the Dnieper.', iconPath: 'M8 36C16 30 24 30 32 36C40 42 48 42 56 36M8 46C16 40 24 40 32 46C40 52 48 52 56 46M14 26L16 24M30 22L32 20M46 26L48 24' },
        { name: 'The Northern Islands', desc: 'Her race came from four northern cities — Falias, Murias, Gorias, Finias — bearing their four treasures.', iconPath: 'M12 44H28M36 44H52M20 44V28L24 24L28 28V44M40 44V28L44 24L48 28V44M32 20V8M26 14H38' },
        { name: 'Knowledge and Wisdom', desc: 'Her gifts are the wisdom of the race — the cauldron, the spear, the stone, the sword of knowledge.', iconPath: 'M22 16H42L38 52H26ZM32 16V8M26 28H38M27 38H37M28 46H36' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Danu’s mythology is peculiar: she is everywhere in the name and nowhere in the stories. The Tuatha Dé Danann — her peoples — fill the Mythological Cycle’s battles and sorceries, but their mother never takes the stage. Her biography is her children’s: the coming from the northern islands, the four treasures, the battles of Mag Tuired, and the fading into the sídhe, the hollow hills where the divine race retired when the sons of Míl took Ireland.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Lebor Gabála', title: 'The Peoples of Danu Arrive', text: "<p class='myth-text'>The Book of Invasions tells it as history: the Tuatha Dé Danann came from the northern islands in dark clouds, burned their ships behind them on the Irish shore, and contended for the island against the Fir Bolg and the Fomoiri. From each of the four cities they brought a treasure — the stone of Fál, the spear of Lugh, the sword of Nuadu, the cauldron of the Dagda — the four regalia of the divine race, each a gift of Danu’s line.</p>" },
        { tag: 'Cath Maige Tuired', title: 'The Battles of Mag Tuired', text: "<p class='myth-text'>The race’s great war-cycle pits them against the Fomoiri, the sea-demons of chaos: Nuadu’s silver arm, Lugh’s many skills, the Dagda’s bottomless cauldron, and the Morrígan’s prophecy carry the day. Danu’s name stands over the whole cycle — the mother’s eponym on every battle-line, though she herself never draws a sword in the telling.</p>" },
        { tag: 'Sídhe Tradition', title: 'The Retirement into the Hills', text: "<p class='myth-text'>When the sons of Míl defeated the Dé Danann, the race did not die but withdrew — into the sídhe, the hollow hills of Ireland, where they keep their beauty and their treasure and their grievance, and from where they still interfere, bless, and curse. Danu’s peoples became the fairies of Irish tradition; their mother’s name contracted into the fairy-mounds’ oldest title.</p>" },
        { tag: 'River-Etymology', title: 'The Danube’s Sister', text: "<p class='myth-text'>The philology is the mythology here: *dānu, ‘the flowing one’, names rivers from the Danube to the Don to the Dnieper — the Indo-European river-mother’s name scattered across the map like water-systems. Irish Danu is the westernmost daughter of the family; her son the Dagda’s name has been read as ‘the good god’, the river’s generous flood made divine.</p>" },
      ],
    },
    syncretism: "Danu is the Celtic branch of the Indo-European river-mother — kin to the Vedic Danu, mother of the demon Vṛtra in the Rigveda’s oldest combat, across the very language-family the names share. The Tuatha Dé Danann were euhemerized by the medieval Irish scholars into a people of sorcerers; the modern Celtic revival restored them to goddess-worship, with Danu as the primordial name.",
    culturalLegacy: "Her name survives in the Tuatha Dé Danann’s — the divine race of every Irish legend of consequence — and in the river-network of Europe, the Danube most of all. The modern Druidic and Celtic-revival movements take Danu as the mother-goddess of their pantheon; and the sídhe-tradition she eponymizes is the ancestor of the world’s entire fairy-canon.",
    extendedMeditation: "Danu: the river-mother whose name flows through six European languages before it reaches this page. Restored plainly, it is the same word the Danube still spells with two syllables — the flowing one, the mother of a divine race, the water beneath the whole map.",
    sources: [
      { name: 'Lebor Gabála Érenn (the Book of Invasions)' },
      { name: 'Cath Maige Tuired (the Battles of Mag Tuired)' },
      { name: 'Proto-Celtic *dānu river-name studies (Mallory & Adams)' },
      { name: 'Vedic Danu parallels, Ṛgveda' },
    ],
    archaeology: "Danu leaves no image — the medieval manuscripts give her no body. But the sídhe-hills of Ireland (Teamhair, Brú na Bóinne) are her race’s palaces, and the river-names across Europe are her signature.",
    cult: "The modern Celtic revival keeps her cult — the seasonal gatherings and the mother-goddess invocations. The medieval tradition venerated her line at the sídhe-mounds; the fairy-legend itself is her oldest surviving liturgy.",
    iconography: "The river in flood, or the mother with the four treasures; in modern Druidic art, the flowing woman whose hair is the river-system. Her icon is the eponym itself — the race’s name, read backwards into the goddess.",
    reception: "Comparative mythology’s river-mother paradigm runs from the Vedic Danu to the Celtic one — the same *dānu across the Indo-European world. Celtic studies treat her as the supreme example of the eponymous goddess: the mother known only through her children’s fame.",
  },

  gronwpebr: {
    pronunciation: {
      ipa: '/ˈɡrɔnuː ˈpɛbr/',
      ipaLabel: 'Middle Welsh (normalised)',
      phonemes: [
        { symbol: 'Gronw', desc: 'Welsh; the w is a full vowel (“oo”), so the name is “GRON-oo”.' },
        { symbol: 'Pebr', desc: '“The Strong” — pebyr/pebr is the epithet; the compound means Gronw the Strong.' },
        { symbol: '', desc: 'The name survives in the Fourth Branch of the Mabinogi, the Math fab Mathonwy cycle.' },
      ],
      approximation: '“GRON-oo PEBR” — two words, the second meaning “the strong”',
      kin: [
        { label: 'Epithet', form: 'Gronw Pebyr — the fuller spelling of “the strong”' },
        { label: 'Cycle', form: 'the Fourth Branch of the Mabinogi (Math fab Mathonwy)' },
      ],
      note: 'His story is the Mabinogi’s darkest: the lover who killed Lleu Llaw Gyffes with the only spear that could, cast through a bath-house wall.',
    },
    domains: {
      title: 'Gronw the Strong',
      subtitle: 'The Spear-Caster of the River Cynfael',
      lead: "<p class='lead-text'><strong>Gronw Pebr</strong> is the Mabinogi’s tragic villain: the lord of Penllyn who loved Blodeuwedd, the wife fashioned of flowers for Lleu Llaw Gyffes, and who — guided by her — cast the spear that could kill the seemingly invulnerable hero through the bath-house wall. The Fourth Branch’s justice is symmetrical and severe: Lleu’s return, Gronw’s plea, and the stone that still bears the mark of the spear he asked to be placed between himself and the fatal throw.</p>",
      cards: [
        { name: 'The Spear', desc: 'He cast the year-wrought, dawn-forged spear through the bath-house wall — the only weapon that could wound Lleu.', iconPath: 'M14 54L46 18M46 18L40 20M46 18L44 26M14 54L8 48M14 54L20 58M36 32L28 24M40 36L32 28' },
        { name: 'Blodeuwedd', desc: 'The flower-wife he loved — her name means “flower-face”; their plot killed her husband.', iconPath: 'M32 14C24 20 18 28 18 38C18 46 24 52 32 52C40 52 46 46 46 38C46 28 40 20 32 14ZM32 24V44M26 30L38 42M38 30L26 42' },
        { name: 'The Bath-House', desc: 'The one door through which Lleu could be killed: standing with one foot on bath and one on goat-skin, spear through the wall.', iconPath: 'M16 20H48V48H16ZM32 28V40M26 34H38M16 20L10 14M48 20L54 14M16 48L10 54M48 48L54 54' },
        { name: 'The Stone', desc: 'His last plea: a stone between himself and Lleu’s return-cast — the spear went through it, and him.', iconPath: 'M18 48C14 36 20 26 32 24C44 22 50 32 46 44C42 52 24 54 18 48ZM30 34L36 40M38 34L32 40' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Gronw’s mythology is the Fourth Branch’s dark triangle: the man, the flower-wife, and the hero engineered to be unkillable. The Mabinogi tells it without relish and without excuse — the one Welsh narrative in which adultery, murder, and retribution each get exactly their due, and the landscape itself (the Cynfael river, the stone at the bank) keeps the receipt.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Math fab Mathonwy', title: 'The Flower-Wife’s Plot', text: "<p class='myth-text'>Blodeuwedd, made of flowers by Gwydion and Math for the cursed Lleu, met Gronw by the Cynfael and loved him. Her husband’s invulnerability had one precise condition — he could be killed only while standing with one foot on a bath and one on a goat-skin, and only by a spear worked a year at the dark of the moon. She persuaded Lleu to demonstrate the posture; Gronw waited behind the bath-house wall with the finished spear.</p>" },
        { tag: 'Math fab Mathonwy', title: 'The Cast Through the Wall', text: "<p class='myth-text'>The cast went through the wall and through Lleu, who changed into an eagle and vanished into the forest. Gronw took Blodeuwedd and Lleu’s lands. But Lleu was found, healed by Gwydion’s wizardry, and returned in a year’s turning — the cursed hero restored by the uncle whose flower-magic had made the wife who betrayed him.</p>" },
        { tag: 'Math fab Mathonwy', title: 'The Stone of the Return-Cast', text: "<p class='myth-text'>The law of the tale is exact symmetry. Gronw offered compensation — land, gold, any price — and Lleu refused all but one thing: the return-cast. Gronw’s single plea was granted: a stone between him and the spear. The cast went through the stone and through Gronw, and the stone stood by the Cynfael for centuries as the tale’s material proof — the Mabinogi’s most literal monument.</p>" },
        { tag: 'Landscape Tradition', title: 'The River Cynfael’s Mark', text: "<p class='myth-text'>Welsh tradition placed the story in the real country of Penllyn and the river Cynfael — the spear-stone was shown to travellers as a landmark, the narrative pinned to the map like a deed. The Mabinogi’s habit of grounding its marvels in named places makes Gronw’s story the Welsh myth-cycle’s most topographically anchored tragedy.</p>" },
      ],
    },
    syncretism: "Gronw is the Welsh cousin of the Indo-European adulter-killer pattern — the lover who strikes the unkillable hero at his one vulnerable posture — but the Mabinogi’s telling is its own: the magic is legalistic, the justice symmetrical, and the villain allowed his one dignified plea. The flower-wife Blodeuwedd’s fate (changed into an owl, shunned by the other birds) outshines his in later retellings; his stone keeps his share.",
    culturalLegacy: "The Fourth Branch is the most retold of the Mabinogi — Saunders Lewis’s drama <em>Blodeuwedd</em> and a hundred retellings keep the triangle current. The spear-stone tradition fed the Welsh habit of reading the landscape as document; and Gronw’s name, though minor, anchors the Mabinogi’s most exportable story in its most Welsh particulars.",
    extendedMeditation: "Gronw Pebr: the strong one, undone by the one thing strength could not block — the spear he himself had forged for another’s death. Restored plainly, his name keeps the Mabinogi’s lesson in two short words: the stone you ask for may be the only thing the return-cast needs to prove.",
    sources: [
      { name: 'Math fab Mathonwy (the Fourth Branch of the Mabinogi)' },
      { name: 'White Book of Rhydderch / Red Book of Hergest manuscripts' },
      { name: 'Saunders Lewis, Blodeuwedd (modern dramatic retelling)' },
    ],
    archaeology: "Gronw leaves the spear-stone of the Cynfael valley — a tradition-landmark, not an excavation. The Mabinogi’s manuscripts (White Book, Red Book) are his monument, as they are for the whole Welsh myth-cycle.",
    cult: "No cult; the Mabinogi’s recitation — the cyfarwyddyd tradition of the storyteller — is his memorial. Modern Welsh revival gatherings stage the Fourth Branch most often of all.",
    iconography: "The spear-caster behind the bath-house wall, or the stone with the hole through it. His icon is the pierced stone — the landmark that outlived the hand that made it necessary.",
    reception: "Celtic studies uses the Fourth Branch as the masterclass of Welsh narrative craft — the legalistic magic, the symmetry of retribution — with Gronw as its necessary third corner. Modern Welsh literature keeps returning to the triangle; and the story’s landscape-pinning is cited wherever myth-and-place is studied.",
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
