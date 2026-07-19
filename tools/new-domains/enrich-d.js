/**
 * Lore enrichment, batch D — Japanese (3) + Nahuatl (2) + Yoruba (1) + Polynesian (1).
 * Same conventions as enrich-a.js; merged by apply-enrich.js.
 */

const ICONS = {
  flame: 'M32 8C28 20 20 26 20 38C20 48 25 56 32 56C39 56 44 48 44 38C44 26 36 20 32 8Z',
  wave: 'M8 24C16 16 24 16 32 24C40 32 48 32 56 24M8 40C16 32 24 32 32 40C40 48 48 48 56 40',
  star: 'M32 8L38 26L56 26L41 37L46 55L32 44L18 55L23 37L8 26L26 26Z',
  mountain: 'M8 52L24 20L32 34L40 16L56 52Z',
  sun: 'M32 20A12 12 0 1 0 32 44A12 12 0 1 0 32 20M32 4V12M32 52V60M4 32H12M52 32H60M12 12L18 18M46 46L52 52M52 12L46 18M18 46L12 52',
  serpent: 'M14 46C22 38 42 38 50 46M20 32C28 24 36 24 44 32M27 18H37M32 18V10',
  wing: 'M10 42C18 20 34 12 54 12C50 32 38 46 18 48L10 42ZM20 40C28 32 36 26 44 22',
  column: 'M16 52H48M20 52V20M28 52V20M36 52V20M44 52V20M14 20H50L32 8L14 20Z',
  eye: 'M8 32C16 22 24 18 32 18C40 18 48 22 56 32C48 42 40 46 32 46C24 46 16 42 8 32ZM32 25A7 7 0 1 0 32 39A7 7 0 1 0 32 25Z',
  bolt: 'M36 4L20 36H30L26 60L44 26H34L36 4Z',
  wheel: 'M32 14A18 18 0 1 0 32 50A18 18 0 1 0 32 14M32 14V50M14 32H50M19 19L45 45M45 19L19 45',
  scale: 'M32 10V54M14 20H50M18 20L12 36H24L18 20ZM46 20L40 36H52L46 20ZM24 54H40',
  ship: 'M12 40H52L44 52H20L12 40ZM32 8V40M32 12C40 18 44 28 44 36M32 12C24 18 20 28 20 36',
  egg: 'M32 8C22 8 14 22 14 36C14 48 22 56 32 56C42 56 50 48 50 36C50 22 42 8 32 8Z',
  mask: 'M20 10H44V30C44 42 38 52 32 52C26 52 20 42 20 30V10ZM25 25H29M35 25H39M27 38C30 36 34 36 37 38',
  gate: 'M12 52V22C12 14 20 8 32 8C44 8 52 14 52 22V52M24 52V26M40 52V26',
  mirror: 'M32 10A20 20 0 1 0 32 50A20 20 0 1 0 32 10M22 26L30 18M24 34L38 20',
  obsidian: 'M20 8L44 20L40 48L32 56L24 48L20 8ZM32 20V44',
  dog: 'M14 48L18 32L14 18L24 24L36 22L48 10L46 24L48 38L38 48H14Z',
  sword: 'M46 6L30 34M30 34L26 30L14 46L18 50L34 38L30 34ZM18 50L14 54L18 58L22 54L18 50Z',
  shell: 'M32 8C18 8 10 20 10 32C10 44 20 54 32 54C44 54 54 44 54 32C54 20 46 8 32 8ZM32 16C38 16 44 24 44 32C44 40 38 46 32 46C26 46 20 40 20 32C20 24 26 16 32 16Z',
  club: 'M40 6C48 6 54 12 54 20C54 28 48 34 40 34L22 52L12 42L30 24C30 16 32 6 40 6Z',
  snowflake: 'M32 6V58M6 32H58M13 13L51 51M51 13L13 51M32 6L26 14M32 6L38 14M32 58L26 50M32 58L38 50',
  torii: 'M12 14C24 10 40 10 52 14M16 22H48M20 22V52M44 22V52M14 52H26M38 52H50M20 34H44',
};

module.exports = {
  // ── Japanese islands ─────────────────────────────────────────────────────
  hokkaido: {
    pronunciationNote:
      'Hokkaidō 北海道 — "North Sea Road" — carries a long final ō, the doubled vowel the macron preserves. The name dates only from 1869, when the explorer Matsuura Takeshirō proposed it for the island the Ainu long called Ainu Mosir, "the quiet land of humans."',
    originalScriptNote: `<p>Written 北海道: north, sea, road — the three kanji of the Meiji-era name. The older indigenous toponymy is Ainu: Ainu Mosir ("land of the humans"), and the island's pre-modern Japanese name Ezochi ("land of the Ezo") survives in the history books the new name replaced.</p>`,
    domains: {
      title: 'The North Sea Road',
      subtitle: 'Ainu Mosir, the Frontier, and the Snow Country',
      lead: `<p class='lead-text'>Hokkaidō is Japan's youngest name on its oldest ground: an island inhabited for twenty thousand years, homeland of the Ainu, mapped into the Japanese state only in 1869 — a frontier whose ancient name, Ainu Mosir, still names the deeper country beneath the modern one.</p>`,
      cards: [
        { iconPath: ICONS.snowflake, name: 'The Snow Country', desc: 'Drift ice, powder snow, and the Sapporo Snow Festival — the island\'s signature climate.' },
        { iconPath: ICONS.wave, name: 'Ainu Mosir', desc: '"The quiet land of humans" — the Ainu name for the island, older than any map of Japan.' },
        { iconPath: ICONS.gate, name: 'The Kaitakushi', desc: 'The Colonization Commission of 1869: the frontier office that made Ezochi into Hokkaidō.' },
        { iconPath: ICONS.star, name: 'Shiretoko', desc: 'The peninsula UNESCO calls one of the world\'s richest temperate ecosystems — Ainu for "the end of the land."' },
      ],
    },
    symbols: [
      { name: 'The bear', meaning: 'Kim-un-kamuy, the mountain god of the Ainu — honoured in the iomante ceremony' },
      { name: 'The drift ice', meaning: 'The winter sea that feeds the whole food chain of the north' },
      { name: 'The lavender field', meaning: 'Furano\'s summer signature — the cultivated frontier in bloom' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Hokkaidō's mythology is Ainu: a kamuy-cosmos where every animal, fire, and tool has a spirit-owner, and where the human world is maintained by right exchange with the unseen.</p>`,
      myths: [
        { tag: 'The Land', title: 'Ainu Mosir and Kamuy Mosir', text: `<p class='myth-text'>Ainu oral tradition divides existence between Ainu Mosir, the land of humans, and Kamuy Mosir, the land of the spirits — and teaches that kamuy visit the human world wearing animal bodies as gifts. The bear is the mountain god's greatest visitation; the fire goddess, Ape-huci-kamuy, keeps every hearth and carries every prayer to the spirit world. The island itself is a borderland between the two realms.</p>` },
        { tag: 'The Ceremony', title: 'Iomante', text: `<p class='myth-text'>The iomante — "sending off" — returns the visiting bear-spirit to Kamuy Mosir with songs, prayers, and gifts, so that the god will tell the other kamuy of human courtesy and come again in generous flesh. Long misread by outsiders as cruelty, it is among the most studied hunting ceremonies on earth: a theology of gratitude in which killing and honouring are the same act.</p>` },
        { tag: 'The Frontier', title: 'From Ezochi to Hokkaidō', text: `<p class='myth-text'>The island's modern foundation-myth is documentary: in 1869 the new Meiji state renamed Ezochi, established the Kaitakushi (Colonization Commission), and invited American advisers — Capron, Clark ("Boys, be ambitious!") — to lay out farms, ports, and Sapporo itself on the American grid. A century of settlement followed; the Ainu were legally recognized as indigenous only in 2008, and the Ainu Promotion Act of 2019 opened a new chapter at last.</p>` },
      ],
    },
    syncretism: `<p>Ainu religion absorbed and resisted Japanese and Russian pressure in equal measure: Orthodox missions among the Kuril Ainu, Buddhist temples on the coasts, and the yukar epics — sung in an isolate language with no close relatives — keeping the older world intact in verse. The twentieth century added a third strand: the Ainu cultural revival, led by figures like the poet and legislator Kayano Shigeru, made the island's first culture a national conversation.</p>`,
    culturalLegacy: `<p>Hokkaidō supplies a third of Japan's food from a tenth of its land; Sapporo beer, the Snow Festival's ice palaces, and the lavender of Furano are national brands. The 2020 opening of Upopoy, the National Ainu Museum and Park at Shiraoi, gave the island's first people their first national institution. In the history of colonialism, the Kaitakushi is studied worldwide as Japan's own frontier — the laboratory where it practiced the modernization it later exported.</p>`,
    archaeology: `Hokkaidō holds some of the world's oldest pottery: Jōmon-period cord-marked vessels from sites like Taishō date beyond 14,000 years, among the earliest ceramic traditions on earth. The Shiretoko peninsula is a UNESCO World Heritage site for its marine-terrestrial food web; the Oshoro stone circles and the Ofuna shell middens mark the island's deep ritual past. Hakodate's Goryōkaku — the star fort of the last Tokugawa loyalists (1869) — is where the old Japan made its final stand on the new island.`,
    extendedMeditation: `<p>Hokkaidō is the island of two names — the one it was given and the one it had. It asks the frontier's hardest question, the one every settled map must answer: whose land was this before it was yours — and can the new name learn to carry the old one's meaning?</p>`,
    sources: [{ name: 'Kojiki' }, { name: 'Nihon Shoki' }, { name: 'Japanese folklore' }, { name: 'Kokugo dictionaries' }, { name: 'Shinto' }, { name: 'Cambridge' }],
  },

  honshu: {
    pronunciationNote:
      'Honshū 本州 — "Main Province" — closes with the long ū of shū, preserved in the macron. The name is descriptive geography elevated to a proper name: the largest of Japan\'s islands, holding Tokyo, Kyōto, Ōsaka, and some three-quarters of the nation.',
    originalScriptNote: `<p>Written 本州: hon (root, main, origin) plus shū (province). The Kojiki's mythic name for the island is Ōyashima, "the great eight islands" — the archipelago's whole body, of which Honshū is the spine.</p>`,
    domains: {
      title: 'The Main Island',
      subtitle: 'The Heartland, the Capitals, and the Spine of Japan',
      lead: `<p class='lead-text'>Honshū is the island that became a civilization: largest of the Japanese archipelago, home of every historic capital from Nara to Kyōto to Edo-Tōkyō, and the ground on which the Jōmon, the Yayoi, and the Yamato state built the longest continuous imperial tradition on earth.</p>`,
      cards: [
        { iconPath: ICONS.mountain, name: 'Fuji', desc: 'The sacred cone at the island\'s heart — climbed, painted, and worshipped for a thousand years.' },
        { iconPath: ICONS.torii, name: 'The Capitals', desc: 'Nara, Kyōto, Kamakura, Edo: every seat of Japanese power stands on this one island.' },
        { iconPath: ICONS.wave, name: 'The Inland Sea', desc: 'The Seto Naikai — the sheltered water-road that bound the heartland together.' },
        { iconPath: ICONS.star, name: 'The Kinai', desc: 'The "home provinces" around the Nara basin: the kernel from which the state grew.' },
      ],
    },
    symbols: [
      { name: 'The three regalia', meaning: 'Mirror, sword, and jewel — enshrined on Honshū at Ise, Atsuta, and the palace' },
      { name: 'The rice paddy', meaning: 'The Yayoi inheritance: wet-rice civilization as the island\'s second foundation' },
      { name: 'The cedar avenue', meaning: 'The planted forests of the pilgrim roads and shrine precincts' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Honshū's mythology is the national charter itself: the Kojiki's island-birth, the sun goddess's gift of the land, and the descent of her grandson to rule it.</p>`,
      myths: [
        { tag: 'The Birth', title: 'The Islands from the Spear', text: `<p class='myth-text'>The Kojiki opens on the heavenly bridge: Izanagi and Izanami stir the ocean with the jewelled spear, and from the brine dripping from its point the first island coagulates. Descending, they wed and give birth to the islands of Japan — the "great eight islands" culminating in Ōyashima — and then to the kami of wind, sea, mountain, and tree. The archipelago is not created but born: the land is kin.</p>` },
        { tag: 'The Sun', title: 'Amaterasu\'s Realm', text: `<p class='myth-text'>When the sun goddess Amaterasu withdrew into the Heavenly Rock-Cave — outraged by her brother Susanoo's rampage — the world went dark until the gods' comic dance lured her out. Her mirror, hung outside the cave, caught her own light back to her; that mirror rests at Ise on Honshū's Kii coast, and her shrine there has been ritually rebuilt every twenty years for thirteen centuries: the island's heartwood, renewed.</p>` },
        { tag: 'The Descent', title: 'Ninigi and the Rice Land', text: `<p class='myth-text'>Amaterasu sent her grandson Ninigi down from heaven to rule the "Land of Fair Rice-ears of the Fertile Reed-plain" — the Kojiki's name for Honshū's heartland — bearing the three regalia. His great-grandson Jimmu conquered eastward to Yamato and became the first emperor: the mythic bridge from island-birth to imperial genealogy, anchored to real ground in Nara's basin.</p>` },
      ],
    },
    syncretism: `<p>The island is the great syncretist of Asia: Buddhism arriving from Korea in the 6th century was fused with kami-worship into shinbutsu-shūgō — the dual-identity system that ran Japanese religion for a millennium; Zen and the tea culture of Kyōto fused with warrior aesthetics; and the Meiji restoration engineered State Shinto on top of it all. Honshū's mountains hold the shugendō tradition — Yamabushi ascetics practicing the oldest fusion of all: kami, buddha, and mountain as one path.</p>`,
    culturalLegacy: `<p>Honshū carries roughly 104 million people — the largest island population on earth — and its corridor from Tōkyō to Ōsaka is the most studied urban megalopolis in geography. Its cultural exports need no list: the world's first novel (The Tale of Genji) was written here, Zen gardens and ukiyo-e and kabuki were born here, and the shinkansen that shrank the island in 1964 taught the world high-speed rail.</p>`,
    archaeology: `Sannai-Maruyama near Aomori preserves a Jōmon city of 5,500 years ago — great cedar pillars, longhouses, and chestnut stores that rewrote the era's reputation from "primitive" to prosperous. The Yayoi's moated villages and the keyhole-shaped kofun tombs (Daisenryō in Ōsaka is among the largest tombs on earth by area) trace the state's rise. Nara's Tōdai-ji holds the world's largest bronze Buddha in the world's largest wooden building; Ise's shikinen sengū — the twenty-year rebuilding — is living archaeology, a Bronze Age rite performed on schedule into the present.`,
    extendedMeditation: `<p>Honshū is the island that kept everything: the oldest pottery beside the fastest trains, the goddess's mirror beside the parliament. Its lesson is continuity as craft — the shrine rebuilt every twenty years so that it never ages and never changes. It asks the heartland's question: what in your tradition is worth rebuilding, exactly as it was, forever?</p>`,
    sources: [{ name: 'Kojiki' }, { name: 'Nihon Shoki' }, { name: 'Shinto' }, { name: 'Kokugo dictionaries' }, { name: 'Japanese folklore' }, { name: 'Cambridge' }],
  },

  kyushu: {
    pronunciationNote:
      'Kyūshū 九州 — "Nine Provinces" — carries the long ū in both syllables, both preserved in the restoration. The name remembers the island\'s ancient division into nine provinces; its older name, Tsukushi, appears in the earliest chronicles as the gateway of the gods\' descent.',
    originalScriptNote: `<p>Written 九州: kyū (nine) plus shū (province). The island's ancient name 筑紫 (Tsukushi) is preserved in the Kojiki's island-birth account — "Kyūshū" is the administrative name that replaced the mythic one and quietly kept the older island's memory of division.</p>`,
    domains: {
      title: 'The Nine Provinces',
      subtitle: 'The Gateway, the Kamikaze, and the Christian Century',
      lead: `<p class='lead-text'>Kyūshū is Japan's front door: the island facing Korea and China across the narrowest straits, where the continent's rice, Buddhism, and iron first arrived — and where the Mongol fleets, the Portuguese traders, and the Jesuit fathers all made their landfall. The gateway of Japan has always stood open on this shore, even when the country tried to shut it.</p>`,
      cards: [
        { iconPath: ICONS.wave, name: 'The Straits', desc: 'Tsushima and Korea are a day\'s sail — Asia has always been closer here than Tōkyō.' },
        { iconPath: ICONS.bolt, name: 'The Kamikaze', desc: 'The "divine wind" typhoons of 1274 and 1281 that shattered two Mongol invasion fleets off this coast.' },
        { iconPath: ICONS.gate, name: 'Nagasaki', desc: 'The one window kept open in the closed country: two centuries of Dutch and Chinese trade through a single fan-shaped island.' },
        { iconPath: ICONS.flame, name: 'The Christian Century', desc: 'Xavier\'s 1549 landing, a quarter-million converts, the Shimabara rising, and the hidden Christians\' 250-year secret.' },
      ],
    },
    symbols: [
      { name: 'The kamikaze banner', meaning: 'The storm as protector — weather enlisted in the national myth' },
      { name: 'The Aso caldera', meaning: 'One of the world\'s great volcanic craters — the island\'s fiery heart' },
      { name: 'The Dejima fan', meaning: 'The tiny artificial island that carried Europe into Japan for 200 years' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Kyūshū claims the mythology of beginnings: the chronicles land the sun goddess's grandson on its peaks, and its storms wrote themselves into the national soul.</p>`,
      myths: [
        { tag: 'The Descent', title: 'Ninigi on Takachiho', text: `<p class='myth-text'>The Kojiki and Nihon Shoki bring the heavenly grandson Ninigi down to earth on the peak of Takachiho — placed by tradition in Kyūshū's mountains — where he marries the blossom-princess Konohanasakuya-hime. She proves her divine conception by setting fire to the birthing hut and delivering three sons amid the flames; their line leads to Jimmu, the first emperor. The imperial charter myth is, geographically, a Kyūshū story.</p>` },
        { tag: 'The Storm', title: 'The Divine Wind', text: `<p class='myth-text'>Twice the Mongol-Chinese fleets of Kublai Khan reached Kyūshū — 1274 and 1281, the second numbering thousands of ships — and twice, after hard fighting on the Hakata beaches, typhoons destroyed the armadas. The shrines had prayed for deliverance, and the nation named the storm kamikaze, "divine wind": weather as providence, and the coast of Hakata Bay as the sacrificial altar of the world's largest seaborne invasions.</p>` },
        { tag: 'The Hidden Faith', title: 'The Kirishitan Century', text: `<p class='myth-text'>Francis Xavier landed at Kagoshima in 1549; within decades Kyūshū had a quarter-million Christians, daimyō baptized with their domains, and seminaries at Arima and Azuchi. Then came the turn: persecution, crucifixions at Nagasaki, the Shimabara-Amakusa rising of 1637 — and 250 years of hidden Christians keeping Latin prayers in corrupted Japanese, baptizing in secret, venerating statues of Kannon as Maria. Their revelation in 1865, when farmers of Urakami knelt before a French priest, stunned the mission world.</p>` },
      ],
    },
    syncretism: `<p>Kyūshū is Japan's syncretic laboratory: Korean potters founding Arita porcelain, Chinese merchant quarters at Nagasaki, Portuguese words entering the language (pan, tempura, kappa), Dutch learning (Rangaku) flowing through Dejima into Japanese science — anatomy, astronomy, and artillery smuggled in translation. The island's cuisine, dialects, and crafts all carry the gateway's mark: everything Japanese that came from outside came here first.</p>`,
    culturalLegacy: `<p>The kamikaze of 1281 gave the 20th century its most terrible word; Nagasaki's 1945 atomic bombing made the island a symbol of the nuclear age's cost, and its peace park one of the world's pilgrimage sites of memory. Arita and Imari porcelain conquered European markets and imitators for three centuries. Today the island's universities and semiconductor fabs continue the oldest pattern: the gateway as Japan's technology shore.</p>`,
    archaeology: `Yoshinogari, in Saga, is East Asia's great Yayoi site: a moated, towered settlement of two thousand years ago, with mass jar-burials and bronze-weapon caches — the archaeological face of the Wa people whom Chinese chronicles describe. The underwater archaeology of Takashima's Mongol wrecks — anchor stones, bombs, and hulls preserved in Imari Bay — has recovered the kamikaze fleets themselves. The hidden Christian sites of the Amakusa islands and Nagasaki's Ōura Cathedral (1864, built for the returned faith) are UNESCO-listed as the "Hidden Christian Sites in the Nagasaki Region."`,
    extendedMeditation: `<p>Kyūshū is the island that opens. Rice, writing, Buddhism, gunpowder, Christianity, Western science — all knocked on this shore, and Japan answered differently each time: embrace, storm, secrecy, translation. It asks the gateway's question, which is every border's question: what do you let in — and what does the letting-in make of you?</p>`,
    sources: [{ name: 'Kojiki' }, { name: 'Nihon Shoki' }, { name: 'Shinto' }, { name: 'Kokugo dictionaries' }, { name: 'Japanese folklore' }, { name: 'Cambridge' }],
  },

  // ── Nahuatl / Aztec ──────────────────────────────────────────────────────
  tezcatlipoca: {
    pronunciationNote:
      'Tezcatlipōca is Nahuatl for "Smoking Mirror": tezcatl (mirror) + tli + pōca (smoking). The final ō of pōca is long — the macron the restoration preserves — and the name belongs to the god of night, sorcery, rulership, and strife, whose obsidian mirror shows men themselves.',
    originalScriptNote: `<p>In Aztec writing the name is a rebus: the smoking mirror itself — the obsidian disc with its scroll of smoke — worn at his temple or replacing his torn-off foot. The codices draw the name rather than spell it: the smoking mirror is both his glyph and his body.</p>`,
    domains: {
      title: 'The Smoking Mirror',
      subtitle: 'Night, Sorcery, Strife, and the God-Impersonator',
      lead: `<p class='lead-text'>Tezcatlipōca is the Aztec night given will: the god of the obsidian mirror in which all things are seen, patron of rulers and sorcerers, tempter and destroyer of his own brother Quetzalcōātl. He is not evil — he is the shadow the world requires, and the Aztecs honoured him with their most terrible beauty: the year-long god made flesh.</p>`,
      cards: [
        { iconPath: ICONS.mirror, name: 'The Mirror', desc: 'Obsidian polished to black glass: it shows the future, the hidden, and the viewer\'s true face.' },
        { iconPath: ICONS.obsidian, name: 'The Missing Foot', desc: 'Torn off by the earth-monster Cipactli in the creation — the mirror smokes where the foot was.' },
        { iconPath: ICONS.flame, name: 'The First Sun', desc: 'He was the sun of the first age — the jaguar sun — devoured with his world when it ended.' },
        { iconPath: ICONS.mask, name: 'The Ixiptla', desc: 'At Toxcatl, a flawless youth lived as the god for a year — then climbed the temple steps to die as him.' },
      ],
    },
    symbols: [
      { name: 'The smoking mirror', meaning: 'Knowledge of the hidden; the self seen without mercy' },
      { name: 'The jaguar', meaning: 'His nahual — the night\'s power and the first sun\'s ferocity' },
      { name: 'The turkey', meaning: 'His mocking disguise — the god who tests kings as a beggar' },
      { name: 'The black stripe', meaning: 'The paint across his face — the night sky worn as war-color' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Tezcatlipōca's myths are all contest: with the earth-monster, with Quetzalcōātl, with the proud — he is the force that measures the strong by breaking them.</p>`,
      myths: [
        { tag: 'The Creation', title: 'The Foot in the Jaws', text: `<p class='myth-text'>To make the world, Tezcatlipōca and Quetzalcōātl descended to the primordial waters where the caiman-monster Cipactli floated, all mouths. He offered his own foot as bait; the monster bit it off, and the two gods tore Cipactli apart — her body becoming the earth, her eyes the springs, her mouth the cave of creation. Every Aztec king thereafter ruled over ground purchased with the god's flesh.</p>` },
        { tag: 'The Ages', title: 'The Jaguar Sun', text: `<p class='myth-text'>Tezcatlipōca was the first sun, Nahui Ocēlōtl, "Four Jaguar": his world of giants ended when Quetzalcōātl struck him from the sky, and jaguars devoured the people. Through the succession of suns the two brothers keep unmaking each other's worlds — the Aztec cosmos is their long quarrel, and the present fifth sun is only the latest armistice, held together by sacrifice.</p>` },
        { tag: 'The Fall of Tula', title: 'The Mirror Trick', text: `<p class='myth-text'>Against Quetzalcōātl of Tōllān he came as a sorcerer: he showed the plumed god his true aged face in a mirror ("look at your flesh, lord"), tricked him into drunkenness and incest with his own sister, until the shamed god-king burned his palace and departed eastward on a raft of serpents. The Aztecs read the myth as history's engine: Tezcatlipōca destroys every golden age, and awaits it at the next shore.</p>` },
        { tag: 'The Festival', title: 'Toxcatl', text: `<p class='myth-text'>Each year the Aztecs chose a flawless captive youth to be the ixiptla — the god's living image. For a year he walked as Tezcatlipōca: taught, adorned, honoured with four goddesses as wives. At the feast of Toxcatl he climbed the temple steps breaking his flutes one by one, and was offered at the summit — the most beautiful death in the Aztec year, and the empire's meditation on how divinity wears, and discards, the flesh.</p>` },
      ],
    },
    syncretism: `<p>The friars made him the devil — Sahagún's own informants struggle with the comparison — but the colonial fusion was subtler: he survived in Nahua sorcery as lord of the crossroads and the dark arts, and in the Day of the Dead's night-side. Scholars compare him with the Maya Itzamna's shadow aspects and with every trickster-sovereign from Loki to Eshu: the god who governs by disrupting. Modern Mexican art and literature reclaimed him as the national shadow — Paz's "other Mexico."</p>`,
    culturalLegacy: `<p>"Smoking mirror" entered the world's vocabulary as the emblem of deceptive appearances. His obsidian mirror in the British Museum — Aztec-made, later owned by the Elizabethan magus John Dee as his scrying glass — is among the most storied objects on earth, linking Tenochtitlan to the court of Elizabeth I. Every account of Aztec civilization, from Prescott to the present, must reckon with his Toxcatl: the rite that made beauty, divinity, and death one ceremony.</p>`,
    archaeology: `His obsidian mirrors survive across collections — the British Museum's Dee mirror foremost — ground from the volcanic glass that Pachuca and Otumba supplied by the ton. The Florentine Codex's account of Toxcatl, illustrated by Nahua artists under Sahagún, is the fullest ritual description from the pre-Columbian world. Templo Mayor excavations found his cult's material traces among the offerings, and the Tizoc Stone and Calendar Stone's jaguar-sun glyph keeps his first age on the empire's central monuments.`,
    extendedMeditation: `<p>Tezcatlipōca is the god of the honest mirror. He flatters no one: he shows the king his age, the golden age its end, the world its price. Every tradition needs a power that tests rather than comforts; the Aztecs gave him their most beautiful ceremonies, understanding that what breaks you falsely was never yours — and what survives the mirror is.</p>`,
    sources: [{ name: 'Florentine Codex' }, { name: 'Sahagún' }, { name: 'Karttunen' }, { name: 'Nahuatl dictionary' }, { name: 'Popol Vuh' }, { name: 'Cambridge' }],
  },

  xolotl: {
    pronunciationNote:
      'Xōlōtl carries two long ō vowels, both preserved in the restoration; the final -tl is Nahuatl\'s signature consonant cluster, released laterally — the sound every visitor learns on the name of the water-monster, the axolotl, that shares his name and, in myth, his skin.',
    originalScriptNote: `<p>The codices write him as what he is: the dog-headed god, often shown twisted in transformation — half into maize, half into the water-beast — with the twin's ball-court and the Venus star in his glyphic entourage. The name and the animal (xōlōtl, "water monster," the axolotl) are one word: the god hiding inside his own spelling.</p>`,
    domains: {
      title: 'The Twin in the Dark',
      subtitle: 'Venus\'s Evening Star, the Dog-Guide, and the Last Transformation',
      lead: `<p class='lead-text'>Xōlōtl is the twin who goes down with the sun: brother of Quetzalcōātl, guide of the dead across the underworld's river, and the god who turned himself into maize, maguey, and finally the axolotl rather than be sacrificed. He is the Aztec soul's ferryman — and the lake that still bears his name.</p>`,
      cards: [
        { iconPath: ICONS.dog, name: 'The Dog', desc: 'His animal: the guide that leads the dead across the ninefold river of Mictlān.' },
        { iconPath: ICONS.star, name: 'The Evening Star', desc: 'Venus at dusk — his station, twin to his brother\'s morning star.' },
        { iconPath: ICONS.wave, name: 'The Axolotl', desc: 'His final disguise: the water-monster of Xochimilco, gilled and smiling, that shares his name.' },
        { iconPath: ICONS.eye, name: 'The Empty Sockets', desc: 'The codices show him weeping his eyes out at the gods\' sacrifice — grief itself, dog-eared.' },
      ],
    },
    symbols: [
      { name: 'The dog ears', meaning: 'His constant feature in every codex — the faithful guide\'s mark' },
      { name: 'The conch and crossbones', meaning: 'His lordship of death\'s roads, shared with Mictlāntēcutli' },
      { name: 'The maize stalk', meaning: 'His first transformation — the god hiding in the staff of life' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Xōlōtl's myths run on twoness: twin of the morning star, guide of the dying sun, the god who is always the second of a pair — and always the one who goes down into the dark.</p>`,
      myths: [
        { tag: 'The Guide', title: 'Across the Nine Waters', text: `<p class='myth-text'>The Aztec dead journeyed four years through Mictlān's nine levels, and at the deep river it was the dog — Xōlōtl's creature — who swam them across; a soul whose family had mistreated dogs in life found no ferryman. The funeral rite buried a red dog with the dead: the god's own form, sacrificed to carry its master home. Among the world's psychopomps, he is the only one who comes as a pet.</p>` },
        { tag: 'The Sacrifice', title: 'The God Who Hid', text: `<p class='myth-text'>At the creation of the fifth sun the gods gathered at Teotihuacan to sacrifice themselves and set the new sun moving. Xōlōtl refused to die: he fled, weeping so hard his eyes fell from their sockets, and hid — as the twin-stalked maize, as the doubled maguey, and at last as the axolotl in the lake. They found him even there, and he died like the rest: the myth of the price of survival, and of the god who begged to live and serves death anyway.</p>` },
        { tag: 'The Twins', title: 'Venus Split in Two', text: `<p class='myth-text'>Quetzalcōātl is Venus as morning star, herald of the light; Xōlōtl is Venus as evening star, which follows the sun into darkness. The astronomy is exact — one planet, two appearances — and the myth makes it biography: one twin leads the dawn out of the night, the other escorts the day into it. Together they keep the star's whole circuit, and the world's whole hope.</p>` },
        { tag: 'The Descent', title: 'The Bones of the Fathers', text: `<p class='myth-text'>When the fifth age needed people, Quetzalcōātl descended to Mictlān for the bones of the dead — and Xōlōtl went with him as guide through the underworld's traps. The bones, ground and sprinkled with the gods' own blood, became humankind: every Aztec child was thus made of the dead, carried up by the dog-god's knowledge of the road back.</p>` },
      ],
    },
    syncretism: `<p>The friars identified him with the devil's lesser angels, but the people kept him closer to a saint of the road: the dog that guards the grave and guides the traveller survived in Mexican folk custom, and the hairless xoloitzcuintli — the national dog, named from his name — was never exorcised. Scholars pair him with every underworld canine from Cerberus to Anubis, and the Maya twins' underworld journey in the Popol Vuh runs on his same road. The axolotl, his water-form, became Mexico's ambassador-species: the smiling face of conservation itself.</p>`,
    culturalLegacy: `<p>The axolotl — Ambystoma mexicanum, the salamander that never grows up, regenerating limbs and heart — took his name into every biology classroom on earth; its survival in Xochimilco's canals is now a national project. The xoloitzcuintli dog is Mexico's national breed, and Dante's Divine Comedy has, in the Mexican imagination, a local answer: the Xolo that carries you across. Frida Kahlo painted her xolos; the 2018 animated films gave him to the world's children.</p>`,
    archaeology: `Colima's ceramic dogs — plump, tumored, dancing, two thousand years old — are the west-Mexican ancestors of his cult, buried in shaft tombs to guide their masters. Aztec dog-effigy vessels and the Florentine Codex's account of the funeral dog detail the central-Mexican rite. Xochimilco's chinampa system — the floating gardens where the last wild axolotls hold on — is a UNESCO World Heritage site, the god's water-form's last stronghold, guarded by canals older than the Aztec state.`,
    extendedMeditation: `<p>Xōlōtl is the god of the way through. He did not want the job — he wept, hid, and transformed to escape it — and he does it still: the sun into the dark, the dead across the river, the lost back home. He asks the guide's question, which is also the mourner's: who walks with you into the night — and whom, in your turn, will you guide?</p>`,
    sources: [{ name: 'Florentine Codex' }, { name: 'Sahagún' }, { name: 'Karttunen' }, { name: 'Nahuatl dictionary' }, { name: 'Popol Vuh' }, { name: 'Cambridge' }],
  },

  // ── Yoruba ───────────────────────────────────────────────────────────────
  ogun: {
    pronunciationNote:
      'Ògún carries Yoruba\'s tonal low-high melody: ò with the grave (low tone), gún with the acute (high) — the tones are phonemic, and the restoration keeps both exactly as the language requires. The name is bound to the word for iron (irin) in his praise-names: "Ogun, master of iron, the one who clears the road."',
    originalScriptNote: `<p>Yoruba is written in Latin letters with tone marks — the orthography the restoration preserves: Ò (low tone) and ú (high tone) are the name as spoken. In the Ifá divination corpus his signs live in the odù Ogunda, "Ogun creates," one of the sixteen principal odù: the god written into the divination system itself.</p>`,
    domains: {
      title: 'The Road-Opener',
      subtitle: 'Iron, War, Labour, and the First Path through the Forest',
      lead: `<p class='lead-text'>Ògún is the orisha of iron and of every road iron opens: the hunter who cleared the primordial forest so the gods could descend, the smith who arms the farmer and the warrior alike, and the patron of every worker who makes a living by metal — from the blacksmith to the surgeon to the driver.</p>`,
      cards: [
        { iconPath: ICONS.sword, name: 'The Cutlass', desc: 'His tool and emblem: the blade that clears the forest path — creation by cutting.' },
        { iconPath: ICONS.flame, name: 'The Forge', desc: 'The smith\'s fire: iron is his body, and every smithy his shrine.' },
        { iconPath: ICONS.mountain, name: 'The First Road', desc: 'He hacked the road through the primal forest that let the orisha reach the earth.' },
        { iconPath: ICONS.dog, name: 'The Dog', desc: 'His companion and sacrifice — the hunter\'s faithful one, honoured at his festivals.' },
      ],
    },
    symbols: [
      { name: 'The cutlass', meaning: 'The path-making blade — technology as the opener of ways' },
      { name: 'The anvil', meaning: 'The forge\'s heart, where his power is hammered into tools' },
      { name: 'The palm wine', meaning: 'His drink — offered by hunters and smiths for coolness and courage' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Ògún's myths are the Yoruba meditation on power: the strength that clears the way for everyone, and the rage that, unmastered, turns on its own town.</p>`,
      myths: [
        { tag: 'The Descent', title: 'The First Road', text: `<p class='myth-text'>When the orisha first sought to descend to the earth, the primordial forest stood unbroken and none could pass — not Orunmila with his wisdom, not any god with any tool. Ògún took his cutlass and cut the road through, and the gods followed him down; for this he is saluted first in every rite, the opener of the way. Creation, in Yoruba thought, required not a word but a blade.</p>` },
        { tag: 'The Retreat', title: 'The King of Ire', text: `<p class='myth-text'>Made king of the town of Ire, Ògún came one festival day to find the people silent — they did not greet him with the honours he was owed. In his rage he cut down his own people with the sword until his son stood in the way; coming to himself, he declared he would go no more among men, and sank into the earth — remaining, as his praise-songs say, in the iron itself. Every Ògún festival at Ire replays the king's coming and going.</p>` },
        { tag: 'The Hunter', title: 'Master of the Forest', text: `<p class='myth-text'>Before he was king or smith, Ògún was the supreme hunter: lord of the deep forest where no farm grows, guide of the hunters' guilds whose odu-ifá praise-songs call him "the one who has water but bathes in blood." Hunters still chant his oríkì at the forest's edge: the road-opener is also the one who knows the road's dangers better than any god.</p>` },
      ],
    },
    syncretism: `<p>The Middle Passage carried him across the Atlantic, where the iron god found new irons: in Cuban Santería he is Oggún, syncretized with Saint Peter (keeper of the keys — the metal of heaven's gate) or Saint George; in Brazilian Candomblé, Ògún is Saint George of the dragon-slaying spear; in Haitian Vodou he is Ogou Feray, the warrior-loa of the forge and the soldier's flag. The saints changed the face; the iron, the road, and the dog kept the god.</p>`,
    culturalLegacy: `<p>Nigeria's Nobel laureate Wole Soyinka is his most famous devotee: Ògún is the patron of Soyinka's art — the road-maker who is also the destroyer — and the essay "The Fourth Stage" and the novel The Road are his modern liturgy. Ògún state in Nigeria bears his name; his praise-names echo in the foundries and mechanics' yards of every Yoruba city, where a splash of palm wine on the anvil still opens the working day.</p>`,
    archaeology: `Yorubaland is one of Africa's oldest iron-working regions: the smelting furnaces of the Nsukka plateau (Lejja) date the craft back over two thousand years, and the guild-smithies of the forest belt kept the ritual side — the first iron of a furnace smelted with prayers to Ògún. His shrines are often the anvil itself; the great festivals of Ire and of Ọndó preserve the masquerades and the dog-sacrifice described in the earliest ethnographies, and the odù Ogunda verses are still divined daily by babaláwo across the Yoruba world.`,
    extendedMeditation: `<p>Ògún is the god of the tool in the hand. Every technology is his: the blade that clears the road and the blade that clears the town are the same iron, and only the wielder's self-command decides which road it opens. He asks the maker's question, which is also the warrior's and the surgeon's: what does your strength serve — and who stands in the way when it slips?</p>`,
    sources: [{ name: 'Idowu' }, { name: 'Bascom' }, { name: 'Abraham' }, { name: 'Folklore' }, { name: 'Cambridge' }, { name: 'Oxford' }],
  },

  // ── Polynesian ───────────────────────────────────────────────────────────
  tumatauenga: {
    pronunciationNote:
      'Tūmatauenga is pronounced with the long ū of the first syllable — the macron the restoration keeps — and the name means "Tū of the angry face": tū (to stand, and the god\'s name) plus mata (face) plus anga (the -ing of appearance). He is the Māori war-god, and his name is a face set for war.',
    originalScriptNote: `<p>Te reo Māori writes him with the macron as the vowel-length it is: Tūmatauenga. The oral text is the truer scripture — the whakataukī "Ka mate kāinga tahi, ka ora kāinga rua" and the karakia of war and planting carry his name in the living language, and the New Zealand Army\'s Māori name, Ngāti Tūmatauenga, writes it into the state itself.</p>`,
    domains: {
      title: 'The Standing One',
      subtitle: 'War, the Angry Face, and the Taming of the Brothers',
      lead: `<p class='lead-text'>Tūmatauenga is the Māori god of war and of humanity's fierce inheritance: the one son of the Sky Father who stood firm when the storm-god attacked, and who then subdued his own brothers — taking their fishes, their birds, and their crops — to feed the people he had made. War, in his story, is the price of standing.</p>`,
      cards: [
        { iconPath: ICONS.club, name: 'The Mere', desc: 'The flat greenstone club of the chief — the weapon that is also a badge of rank and a gift of state.' },
        { iconPath: ICONS.flame, name: 'The Angry Face', desc: 'His name: the war-face (pūkana) that the haka still performs with widened eyes and out-thrust tongue.' },
        { iconPath: ICONS.wave, name: 'The Nets and Hooks', desc: 'He snared his brother Tangaroa\'s fish: the arts of fishing, won by war and given to man.' },
        { iconPath: ICONS.mountain, name: 'The Pa', desc: 'The fortified hill-settlement — his architecture, crowning New Zealand\'s ridgelines by the thousand.' },
      ],
    },
    symbols: [
      { name: 'The taiaha', meaning: 'The long staff-weapon of chiefly combat — spear and club in one lineage' },
      { name: 'The haka', meaning: 'The war-dance: the body made into the angry face of the god' },
      { name: 'The feather cloak', meaning: 'The kahu huruhuru of the war-chief — honour worn on the shoulders' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Tūmatauenga's cycle is the Polynesian account of how humanity got its arts: not by gift but by conquest — the war-god subduing his elemental brothers and distributing the spoils to his mortal children.</p>`,
      myths: [
        { tag: 'The Separation', title: 'The Sons of Rangi and Papa', text: `<p class='myth-text'>In the beginning the Sky Father (Ranginui) and the Earth Mother (Papatūānuku) lay locked together, and their sons lived crushed in darkness between them. Tūmatauenga, fiercest of the brothers, urged that the parents be killed; the gentler counsel of Tāne prevailed — they would be forced apart. Rongo, Tangaroa, Haumia, and Tāne each tried and failed to push them; then Tāne set his head on the earth, his feet against the sky, and tore the parents open. Light came into the world — and war came with it.</p>` },
        { tag: 'The Storm', title: 'The One Who Stood', text: `<p class='myth-text'>Tāwhirimātea, god of winds and storms, had opposed the separation, and now he attacked his brothers in revenge: Tangaroa fled to the sea, the gods of food hid in the earth and the forest — but Tūmatauenga alone stood fast against the storm, unbowed on the open plain. When the tempest spent itself, the war-god turned on his fleeing brothers: he made nets and took Tangaroa's fish, snared Tāne's birds, and dug up Rongo's and Haumia's crops. His standing made humanity heir to every domain.</p>` },
        { tag: 'The Inheritance', title: 'The Arts of War and Peace', text: `<p class='myth-text'>By subduing his brothers, Tūmatauenga made their realms noa — common, usable — and so gave humankind its technologies: net and hook for the sea, snare for the forest, the digging-stick for the garden. The karakia of planting, fishing, and war all carry his name; the Māori tradition is explicit that the fierce god is also the culture-bringer. His children — humanity, in the southern traditions — inherited both the standing and the storm.</p>` },
      ],
    },
    syncretism: `<p>He is one face of a Polynesian-wide god: Hawaiian Kū — the great war-god of the feathered helmets and the luakini temples — Tahitian Tū, and the Cook Islands' war deities share his name and his office, the deepest layer of pan-Polynesian religion. In New Zealand his worship ran through the war-parties and their tohunga; the 19th-century Māori military genius (the gunfighter pa of the New Zealand Wars) applied his standing to musket and trench, and the New Zealand Army today bears his name as its own: Ngāti Tūmatauenga, "the tribe of the war-god."</p>`,
    culturalLegacy: `<p>The haka — performed by the All Blacks before every match and by the army at every farewell — is his face in modern life: the widened eyes and out-thrust tongue are the literal mata anga of his name. Ngāti Tūmatauenga, the army's Māori designation, makes him the only ancient god officially patron of a modern state's armed forces. His cycle — the standing against the storm, the conquest that feeds the people — remains the charter myth of Māori resilience, quoted in land-march speeches and waiata alike.</p>`,
    archaeology: `New Zealand's ridgelines keep his monuments: thousands of pa — terraced, ditched, and palisaded hill-forts — from the classic period, with sites like Maungakiekie (One Tree Hill) among the largest earthworks of the Pacific. The greenstone mere and the carved taiaha of the museum collections (Te Papa's among them) are his regalia; the Auckland War Memorial Museum — itself a cenotaph to the fallen — houses the war-canoes and the martial taonga of his people. The kumara storage-pits beside every pa tie his war-and-garden cycle into the ground itself.`,
    extendedMeditation: `<p>Tūmatauenga is the god of standing your ground — and of what standing costs. He alone faced the storm, and so he alone could feed the people; but the myth hides nothing: his fierceness proposed killing the parents, and his victories are his brothers' defeats. He asks the hardest question of every defender: what are you standing against — and what, when you have won, will your strength feed?</p>`,
    sources: [{ name: 'Grey, Polynesian Mythology' }, { name: 'Tregear' }, { name: 'Grey' }, { name: 'Handy' }, { name: 'Best' }, { name: 'Cambridge' }],
  },
};
