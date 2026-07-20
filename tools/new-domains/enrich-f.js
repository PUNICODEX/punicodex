/**
 * Lore enrichment, batch F — the 15 third-wave entries.
 * Creates or deepens lore-catalog entries to flagship standard.
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
  lyre: 'M22 10C18 24 18 36 24 44C28 50 36 50 40 44C46 36 46 24 42 10M22 10H26M38 10H42M28 18V40M36 18V40M26 44H38',
  wheel: 'M32 14A18 18 0 1 0 32 50A18 18 0 1 0 32 14M32 14V50M14 32H50M19 19L45 45M45 19L19 45',
  scale: 'M32 10V54M14 20H50M18 20L12 36H24L18 20ZM46 20L40 36H52L46 20ZM24 54H40',
  ship: 'M12 40H52L44 52H20L12 40ZM32 8V40M32 12C40 18 44 28 44 36M32 12C24 18 20 28 20 36',
  horn: 'M44 8C30 10 18 20 14 34C12 42 16 50 24 52C34 54 44 46 46 36L36 40C30 42 24 38 24 32C24 24 34 14 44 8Z',
  egg: 'M32 8C22 8 14 22 14 36C14 48 22 56 32 56C42 56 50 48 50 36C50 22 42 8 32 8Z',
  lotus: 'M32 46C26 38 26 26 32 16C38 26 38 38 32 46ZM19 42C17 32 21 23 28 18M45 42C47 32 43 23 36 18M32 46V56',
  gate: 'M12 52V22C12 14 20 8 32 8C44 8 52 14 52 22V52M24 52V26M40 52V26',
  scroll: 'M16 10H44V44C44 50 40 54 34 54H16V10ZM16 10C12 10 10 13 10 17C10 21 12 23 16 23M24 20H40M24 28H40M24 36H36',
  hammer: 'M14 44L36 22M36 22L30 16L44 8L52 16L44 24L36 22ZM20 50L14 44L18 40L24 46L20 50Z',
  sword: 'M46 6L30 34M30 34L26 30L14 46L18 50L34 38L30 34ZM18 50L14 54L18 58L22 54L18 50Z',
  swan: 'M12 40C18 30 28 26 38 28C34 24 34 18 38 14C42 10 48 10 52 14C48 16 46 20 48 24C52 30 50 38 44 42C34 50 20 48 12 40Z',
  knot: 'M20 20C12 20 8 26 8 32C8 38 12 44 20 44C28 44 36 20 44 20C52 20 56 26 56 32C56 38 52 44 44 44C36 44 28 20 20 20Z',
};

module.exports = {
  guandi: {
    pronunciationNote:
      'Guāndì 關帝 — "Emperor Guan" — carries the first tone on guān and the falling fourth on dì. The name is a title, not a personal name: the deified Guān Yǔ of the Three Kingdoms, raised by eight centuries of imperial investitures to the rank of Emperor. The restoration keeps the macron that marks his tone.',
    domains: {
      title: 'The General Who Became a God',
      subtitle: 'War, Loyalty, Righteousness, and the Brotherhood of the Peach Garden',
      lead: `<p class='lead-text'>Guāndì is China's god of the kept oath: the historical general Guān Yǔ (d. 220 CE) whose loyalty outlasted his dynasty, deified by emperors, merchants, and triads alike until his red-faced statue stood in more temples than any other figure in the Chinese world.</p>`,
      cards: [
        { iconPath: ICONS.sword, name: 'The Crescent Blade', desc: 'Qīnglóng Yǎnyuèdāo — the Green Dragon Crescent Blade, his legendary weapon and temple attribute.' },
        { iconPath: ICONS.knot, name: 'The Peach Garden Oath', desc: 'The brotherhood sworn with Liú Bèi and Zhāng Fēi — China\'s founding myth of loyalty.' },
        { iconPath: ICONS.flame, name: 'The Red Face', desc: 'His temple image: crimson countenance of righteous wrath, green robe, long beard.' },
        { iconPath: ICONS.scale, name: 'The God of Commerce', desc: 'Merchants worship him as the enforcer of contracts — loyalty monetized into trust.' },
      ],
    },
    symbols: [
      { name: 'The crescent halberd', meaning: 'Martial honor wielded with precision — war in service of the oath' },
      { name: 'The red face', meaning: 'Righteousness made visible; loyalty that cannot hide' },
      { name: 'The green robe', meaning: 'The gift he refused to surrender to Cáo Cāo — fidelity to the old lord' },
      { name: 'The long beard', meaning: 'The beautiful beard he protected with a silk bag — dignity kept' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Guāndì's myth is history sanctified: the Records of the Three Kingdoms gave him a life, the Romance gave him a legend, and eight dynasties gave him a godhood.</p>`,
      myths: [
        { tag: 'The Oath', title: 'The Peach Garden', text: `<p class='myth-text'>The Romance of the Three Kingdoms opens with the oath: in a peach garden, Guān Yǔ swore with Liú Bèi and Zhāng Fēi to die on the same day as brothers. He kept it past reason — through capture, through Cáo Cāo's gold and titles, riding a thousand miles back to his sworn lord with the general's seal hung on his gate. Loyalty, in China, has a face, and it is his.</p>` },
        { tag: 'The Capture', title: 'Lord of the Beautiful Beard', text: `<p class='myth-text'>Held by Cáo Cāo, he accepted three conditions only: he surrendered to the Han, not to Cáo; his brother's wives would be protected; and he would leave the moment Liú Bèi was found. He kept all three, repaying Cáo Cāo's courtesy by beheading the enemy general Yán Liáng — honor answering honor, the episode the temples never tire of carving.</p>` },
        { tag: 'The Apotheosis', title: 'From General to Emperor', text: `<p class='myth-text'>Killed in 220 CE by Sūn Quán's men, he began as a local protective spirit at Dāngyáng; the Sui made him a Buddhist guardian; the Song emperors titled him Duke, then King; the Ming made him Emperor Guān; the Qing added "Sage," matching Confucius himself. No other Chinese figure rose from battlefield casualty to co-Sage of the empire — the slowest, most official deification in history.</p>` },
        { tag: 'The Guardian', title: 'Sangharama', text: `<p class='myth-text'>Chinese Buddhism adopted him as Sānghārāma, the dharma-protector who guards temple gates — the general now sworn to a larger oath. In Chan monasteries his statue stands opposite Wéituó, the two guardians of the hall: the religion that teaches impermanence keeps, at its door, the god of the promise that does not change.</p>` },
      ],
    },
    syncretism: `<p>He is the one deity all three teachings claim: Taoism's Guān Shèng Dì Jūn (Holy Emperor), Buddhism\'s Sānghārāma, Confucianism\'s co-Sage. The diaspora carried him everywhere — his altar stands in Yokohama\'s Kanteibyō, in San Francisco's oldest Chinatown temples, and in every Hong Kong police station, where officers and triads bow to the same red face: the god both sides trust because both sides fear to lie before him.</p>`,
    culturalLegacy: `<p>His temples outnumber Confucius' in the Chinese world; his birthday (24th day of the 6th lunar month) is a national observance from Shanxi to Singapore. The "Guān Gōng" of business is the unwritten clause of every contract; his image guards mahjong parlors, restaurants, and police stations alike. The Romance\'s peach-garden oath remains East Asia's template for sworn brotherhood, quoted in films, games (Dynasty Warriors made him a global icon), and every oath of office sworn with a hand on his name.</p>`,
    archaeology: `The Guān Lín tomb-temple at Luoyang (where Cáo Cāo buried his head with honors) and the Guān Dì Miào at his birthplace in Yuncheng, Shanxi — the largest Guandi complex, repeatedly rebuilt since the Sui — anchor his cult geography. Ming-Qing Guandi temples survive in every southern port city; Yokohama's Kanteibyō (1862) preserves the diaspora form. His statues' iconography — red face, green robe, crescent blade, the beard-bag — is among the most standardized in world religion.`,
    extendedMeditation: `<p>Guāndì is the god of the thing that outlasts its usefulness. Empires fell, dynasties renamed him, merchants and monks and policemen each rewrote him — and the oath stayed. He asks the oldest question of any alliance, company, or friendship: when the peach garden is gone and the gold is on the table, what is left of the word you gave?</p>`,
    sources: [{ name: 'Sanguozhi' }, { name: 'Chinese folk religion' }, { name: 'Fengshen Yanyi' }, { name: 'Birrell' }, { name: 'Chinese folklore' }, { name: 'Cambridge' }],
  },

  ganga: {
    pronunciationNote:
      'Sanskrit gaṅgā carries the retroflex ṅ of IAST — the nasal of the velum, written with the underdot. The restoration Gaṅgā keeps both: the retroflex nasal and the long final ā. Hindi speech says "Ganga"; the scholarly form is hers.',
    domains: {
      title: 'The River That Fell From Heaven',
      subtitle: 'Purification, Descent, and the Locks of Śiva',
      lead: `<p class='lead-text'>Gaṅgā is the river that is a goddess: brought down from heaven by the sage Bhagīratha to save his ancestors, caught in Śiva's matted locks so the earth would survive her fall, and worshipped ever since at every ford — the holiest water in the world to a billion people.</p>`,
      cards: [
        { iconPath: ICONS.wave, name: 'The Descent', desc: 'Gangāvataraṇa: her fall from heaven, broken into seven streams by Śiva\'s hair.' },
        { iconPath: ICONS.mountain, name: 'Gangotri', desc: 'Her source at Gaumukh in the Himalaya — the ice cave where the Bhāgīrathī is born.' },
        { iconPath: ICONS.lotus, name: 'The Purifier', desc: 'A drop of her water absolves: the cremation grounds of Vārāṇasī keep her oldest bargain.' },
        { iconPath: ICONS.star, name: 'The Milky Way', desc: 'Her celestial form — the river of heaven mirrored as the river of earth.' },
      ],
    },
    symbols: [
      { name: 'The makara', meaning: 'Her crocodile mount — the river\'s power held and guided' },
      { name: 'The locks of Śiva', meaning: 'The buffer between heaven\'s force and earth\'s frame' },
      { name: 'The water pot', meaning: 'The kamaṇḍalu of pure water — purification carried' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Gaṅgā's myths are hydrology as theology: the river\'s own biography — source, fall, and ford — told as the goddess's descent to save the dead.</p>`,
      myths: [
        { tag: 'The Penance', title: 'Bhagīratha\'s Bargain', text: `<p class='myth-text'>King Sāgara\'s sixty thousand sons were burned to ash by the sage Kapila\'s glance; only Gaṅgā's water could free their souls. Generation after generation prayed, until Bhagīratha won the boon: the heavenly river would descend. But her fall would shatter the earth — so Śiva stood on Himālaya and took her whole weight on his head, letting her wander a thousand years through the tangles of his hair before she reached the plain, tamed into seven streams.</p>` },
        { tag: 'The Mother', title: 'Santanu\'s Queen', text: `<p class='myth-text'>The Mahābhārata gives her a human marriage: Gaṅgā weds King Śantanu on one condition — never question her. Seven times she drowns her newborn sons in her own waters (they are the Vasus, expiating a curse), and he suffers it; the eighth, he stops her, and she leaves him — keeping the child, Devavrata, who becomes Bhīṣma, the grandsire of the war. The river that saves the dead also gives them back, once.</p>` },
        { tag: 'The City', title: 'The Ford of Vārāṇasī', text: `<p class='myth-text'>At Kāśī (Vārāṇasī) she turns north — flowing back toward her source — and the city of Śiva rises on her bank: the one place where dying is not an end but a crossing. The āratī each evening on her ghāts, a thousand lamps on her water, is the oldest continuously performed river-ritual on earth. Every Hindu pilgrimage either ends at her water or carries some of it home.</p>` },
      ],
    },
    syncretism: `<p>Southeast Asia keeps her as the goddess of the Tonlé Sap and the Mekong's sacred waters; Bali's holy-water temples invoke her as the source of tīrtha; and the Buddhist tradition places her descent in the heavens' own cosmology, where she flows from the foot of Viṣṇu. The Māori scholar's comparison to river-gods worldwide finds its purest form in her: a river that is simultaneously a goddess, a mother, and a sacrament.</p>`,
    culturalLegacy: `<p>Ganga Dussehra and the Kumbh Mela — the largest gatherings of humans on the planet — are hers. "Ganga jal" (her water) is kept in Hindu homes for births, weddings, and deaths. The Namami Gange cleanup program is India's largest river-restoration project, and the legal personhood briefly granted to her and Yamunā in 2017 made world jurisprudence. She brands everything from ships to satellites: the river that is also, unforgettably, a person.</p>`,
    archaeology: `Her source at Gaumukh (Gangotri glacier) is a measured pilgrimage; the Gangotri temple (18th c., rebuilt) marks it. Haridwar's Har Ki Pauri, Prayāgrāj's trivenī sangam (where she meets Yamunā and the unseen Sarasvatī), and Vārāṇasī's ghāts — 84 landing-places in continuous use for over a millennium — are her living monuments. The glacier's measured retreat (about 20m/year) is tracked as carefully as her temples are kept.`,
    extendedMeditation: `<p>Gaṅgā is the proof that holiness is a relationship, not a property: the same water is chemistry at the glacier, sacrament at the ghāt, and memory in the diaspora's brass lota. She asks every river's question to every people: what do you owe the water that carries your dead — and who, in your generation, will catch her fall?</p>`,
    sources: [{ name: 'Mahabharata' }, { name: 'Puranas' }, { name: 'Monier-Williams' }, { name: 'MW' }, { name: 'Ramayana' }, { name: 'Cambridge' }],
  },

  hanuman: {
    pronunciationNote:
      'Sanskrit hanumān carries the long final ā of the name meaning "the big-jawed one" (hanu, jaw). The restoration Hanumān keeps the macron; the older stem-form Hanumat is his grammatical nominative in the classical texts, but Hanumān is the name the world prays in.',
    domains: {
      title: 'The Son of the Wind',
      subtitle: 'Devotion, Strength, the Leap, and the Burning of Laṅkā',
      lead: `<p class='lead-text'>Hanumān is India's god of what devotion makes possible: the monkey-general who leapt an ocean in one bound, carried a mountain across the sky, and burned the demon-king's golden city — and who remains, of all the pantheon, the one most loved by ordinary people.</p>`,
      cards: [
        { iconPath: ICONS.wing, name: 'The Leap', desc: 'One bound from India to Laṅkā — devotion as the only wings needed.' },
        { iconPath: ICONS.mountain, name: 'The Mountain', desc: 'The herb-mountain he carried through the night sky to save Lakṣmaṇa.' },
        { iconPath: ICONS.flame, name: 'The Burning Tail', desc: 'Set alight by Rāvaṇa — and used to torch golden Laṅkā itself.' },
        { iconPath: ICONS.hammer, name: 'The Gada', desc: 'His mace: strength in service, never for its own sake.' },
      ],
    },
    symbols: [
      { name: 'The mace (gada)', meaning: 'Strength subordinated to service' },
      { name: 'The flying figure', meaning: 'The mountain-bearer of the Rāmāyaṇa\'s most painted scene' },
      { name: 'The torn-open chest', meaning: 'The icon where he shows Rāma and Sītā enthroned in his heart' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Hanumān\'s myths are the Rāmāyaṇa\'s engine: whenever the quest seems lost, the wind-god's son does the impossible, quietly, as service.</p>`,
      myths: [
        { tag: 'The Birth', title: 'The Wind\'s Son', text: `<p class='myth-text'>Born of Vāyu, the wind-god, and the vanara Añjanā, he mistook the rising sun for a ripe fruit and leapt to eat it; Indra's bolt broke his jaw (hanu) and sent him back to earth, where the gods compensated the child with gifts: invulnerability to weapons, fire, and water, and strength matched to no one. The broken jaw that named him became the mark of the god who cannot be stopped.</p>` },
        { tag: 'The Leap', title: 'One Bound to Laṅkā', text: `<p class='myth-text'>When Sītā was taken, the vanara army stood on the shore, and only Hanumān dared the crossing: he grew until the sky bent, leapt the hundred yojanas, and landed on Laṅkā's walls — shrinking to search the golden city street by street until he found her in the Aśoka grove. "I am Rāma's messenger," he told her, and gave the ring; the war began from that whisper.</p>` },
        { tag: 'The Fire', title: 'The Tail that Burned a City', text: `<p class='myth-text'>Caught and paraded, his tail wrapped in oil-soaked rags and lit, he did not extinguish it: he grew, broke free, and used the fire as a torch — leaping roof to roof until golden Laṅkā burned behind him, then quenched the tail in the sea. The lesson the epics love best: what your enemy kindles for your shame, carry as your weapon.</p>` },
        { tag: 'The Mountain', title: 'The Night Flight', text: `<p class='myth-text'>Lakṣmaṇa lay dying; only the herbs of the Himālayan mountain could save him, before dawn. Hanumān flew north, and finding the herbs beyond naming, tore out the whole peak and carried it home through the night sky. The scene — the small flying figure, the mountain in one hand — is the most reproduced image in Indian devotional art, and his temples sell it to this day.</p>` },
      ],
    },
    syncretism: `<p>He crosses every boundary: in Cambodia's Reamker and Thailand's Ramakien he is the monkey-general unchanged; China's classical tradition links him to the monkey-king Sūn Wùkōng of Journey to the West (the kinship debated for a century); and Indonesia keeps Hanoman as the Ramayana's most-beloved wayang character. The wrestler-god is also the celibate scholar — patron of gyms (akhāṛās) and grammar students alike.</p>`,
    culturalLegacy: `<p>The Hanumān Chālīsā — Tulsīdās' forty verses — is the most-recited hymn in the Hindi world; his Tuesday fasts, his sindoor-red idols, and his roar in a hundred TV serials make him the most-worshipped deity of North India. "Bajrang Bali" is the name shouted at heavy lifts and hard exams alike. The Indian Army\'s mountain troops invoke him; his "flying" figure brands logistics firms, gyms, and the Delhi Metro's most-photographed statue (108 ft at Karol Bagh).</p>`,
    archaeology: `His oldest images are Gupta-period (5th c. CE) reliefs; the cult's medieval explosion runs through the Vijayanagara empire, whose emblem he was. The great modern colossi — Karol Bagh (Delhi, 108 ft), Nandura (105 ft), Paritala Anjaneya (135 ft, among the world's tallest statues) — continue the tradition of the Vijayanagara monoliths. The Sankat Mochan temple at Vārāṇasī (16th c., founded by Tulsīdās' tradition) and Hampi's Anjaneya hill anchor his pilgrimage map.`,
    extendedMeditation: `<p>Hanumān is the god of the impossible errand. He never asks whether the ocean can be crossed — he asks for Rāma's name and jumps. He is the proof the Rāmāyaṇa makes everywhere it goes: that the measure of strength is not what it can lift but whom it serves, and that the biggest tasks are always done by the ones who say "I am only the messenger."</p>`,
    sources: [{ name: 'Ramayana' }, { name: 'Monier-Williams' }, { name: 'Puranas' }, { name: 'MW' }, { name: 'Cambridge' }, { name: 'Oxford' }],
  },

  yamuna: {
    pronunciationNote:
      'Sanskrit yamunā carries the long final ā; the restoration Yamunā keeps it. Her name shares the root of "twin" (yama) — she is the sister of Yama, the lord of death, and the river that twins the Gaṅgā at the sangam.',
    domains: {
      title: 'The Twilight River',
      subtitle: 'Devotion, the Sangam, and Kṛṣṇa\'s Own Water',
      lead: `<p class='lead-text'>Yamunā is the second of India's great river-goddesses and the first of Kṛṣṇa's loves: daughter of the sun-god, sister of death, the dark-blue water on whose banks the cowherd god danced, battled the serpent, and made an entire land his memory.</p>`,
      cards: [
        { iconPath: ICONS.wave, name: 'The Sangam', desc: 'Her meeting with Gaṅgā at Prayāgrāj — the trivenī, the holiest confluence in India.' },
        { iconPath: ICONS.serpent, name: 'Kāliya', desc: 'The poison-serpent she hosted until the child-god danced on its heads — the river cleansed by dance.' },
        { iconPath: ICONS.sun, name: 'Daughter of Sūrya', desc: 'The sun\'s daughter, Yama\'s twin — light and death sharing one water.' },
        { iconPath: ICONS.lotus, name: 'Vṛndāvana', desc: 'The pastoral heartland where Kṛṣṇa\'s līlā plays out on her banks.' },
      ],
    },
    symbols: [
      { name: 'The dark-blue water', meaning: 'Her twilight color — the river of the blue god' },
      { name: 'The tortoise', meaning: 'Her patient mount — the current that carries everything slowly' },
      { name: 'The confluence', meaning: 'Her union with Gaṅgā — twilight meeting clarity' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Yamunā's myths bind the solar and the pastoral: the sun\'s daughter flowing through the cowherd's land, purifying and purified by the god who plays in her.</p>`,
      myths: [
        { tag: 'The Birth', title: 'The Sun\'s Twin Daughter', text: `<p class='myth-text'>Born of Sūrya and Saṃjñā, twin sister of Yama — death and the river as siblings, the tradition's quiet pairing. The Purāṇas rank her beside Gaṅgā in holiness and ahead in intimacy: if Gaṅgā is the mother, Yamunā is the beloved — the river whose water Kṛṣṇa drank as a child and blessed as a god, making her, alone of rivers, "the co-wife of the Lord."</p>` },
        { tag: 'The Serpent', title: 'The Dance on Kāliya', text: `<p class='myth-text'>The serpent Kāliya poisoned her water at Vṛndāvana until the child Kṛṣṇa dived in, wrestled him, and danced on his hundred heads — the serpent\'s wives begging mercy for their husband. He spared it and banished it to the sea, and her water ran clean: the myth every pilgrim to Kāliya-ghāṭa hears, and the river's own story of being made pure.</p>` },
        { tag: 'The Sangam', title: 'The Trivenī', text: `<p class='myth-text'>At Prayāgrāj she meets Gaṅgā — and the hidden Sarasvatī beneath — forming the trivenī, the triple confluence where the Kumbh Mela gathers the largest crowds on earth. The texts are precise: bathing at her meeting-point equals a thousand sacrifices. The dark river and the white river run visibly side by side for miles before mixing — the most photographed hydrology in India.</p>` },
        { tag: 'The Devotion', title: 'Kṛṣṇa\'s Beloved River', text: `<p class='myth-text'>The Bhāgavata makes her a devotee herself: the gopīs' rāsa dance happens on her sands, Kāliya's cleansing happens in her current, and when Kṛṣṇa leaves Vṛndāvana, the river slows in grief. The poets say she alone of goddesses is both worshipped and loved — prayed to like a river, wept for like a widow.</p>` },
      ],
    },
    syncretism: `<p>Her cult runs parallel to Gaṅgā's but more intimate: the Gauḍīya Vaiṣṇava tradition of Bengal holds her highest of all rivers because of Kṛṣṇa; Southeast Asian Krishnaism keeps her in the same narratives; and the Yamunā-Gaṅgā pairing became India's standard metaphor for complementary holiness — the two waters every pilgrim needs both of.</p>`,
    culturalLegacy: `<p>Delhi stands on her bank; the Taj Mahal reflects in her backwater; the Kumbh Mela is partly hers. Yamunā Jayanti (her descent-day) and Bhai Dooj (the sibling festival she shares with Yama) are national observances. Her pollution crisis — Delhi's stretch among the world\'s most contaminated urban rivers — makes her the central case of India's river-restoration debate: the goddess whose water pilgrims now filter before the ritual.</p>`,
    archaeology: `Yamunotri, her glacier source in the Garhwal Himalaya, keeps her temple (rebuilt after earthquakes, hot springs beside it). Mathurā and Vṛndāvana preserve the Kṛṣṇa-ghāts — Vishram Ghāt where the god rested after killing Kaṃsa — and Prayāgrāj's sangam fort and akshayavata tree mark the confluence. The medieval ghāt architecture of the Braj country documents five centuries of Krishna-pilgrimage on her banks.`,
    extendedMeditation: `<p>Yamunā is the river of the second place — never the first river, always the beloved one. She hosts the serpent and the dance, the sun and the shadow, Gaṅgā beside her in every hymn. She asks the confluence's question, which is every collaborator's question: what do you become when you stop insisting on being the only water?</p>`,
    sources: [{ name: 'Puranas' }, { name: 'Monier-Williams' }, { name: 'Mahabharata' }, { name: 'MW' }, { name: 'Cambridge' }, { name: 'Oxford' }],
  },

  gauri: {
    pronunciationNote:
      'Sanskrit gaurī — "the golden, the radiant" — carries the long ī of the feminine epithet, which the restoration keeps. The same word is the adjective "golden-complexioned": her name is her skin, the color of turmeric, ripe wheat, and morning light.',
    domains: {
      title: 'The Golden Mother',
      subtitle: 'Beauty, Austerity, Marriage, and the Gentle Śakti',
      lead: `<p class='lead-text'>Gaurī is the Great Goddess at her most benevolent: the golden-skinned Mother whose austerity won Śiva himself, whose festivals celebrate marriage and motherhood, and whose name — "the radiant one" — is the oldest word for the divine feminine in India.</p>`,
      cards: [
        { iconPath: ICONS.lotus, name: 'The Golden Skin', desc: 'Her color: turmeric and dawn — the glow that names her.' },
        { iconPath: ICONS.flame, name: 'The Austerity', desc: 'The tapas by which she won Śiva — devotion as fierce as any warrior\'s.' },
        { iconPath: ICONS.wheel, name: 'The Festivals', desc: 'Gaurī Pūjā and the Tṛtīyā fasts — the mother\'s days kept by millions of women.' },
        { iconPath: ICONS.swan, name: 'Mother of Heroes', desc: 'Mother of Gaṇeśa and Kārttikeya — the goddess behind the gods.' },
      ],
    },
    symbols: [
      { name: 'The golden complexion', meaning: 'Radiance as nature — beauty without artifice' },
      { name: 'The lotus', meaning: 'Her seat and offering — purity of the household goddess' },
      { name: 'The bilva leaf', meaning: 'Her austerity — the tree of Śiva she tended in penance' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Gaurī's myths are the Great Goddess\'s domestic epic: the mountain-daughter who becomes the universe's mother through patience.</p>`,
      myths: [
        { tag: 'The Birth', title: 'Daughter of the Mountain', text: `<p class='myth-text'>Born as Pārvatī, daughter of Himavat, the mountain-king, she was Satī reborn — the goddess returned after her first death to reclaim her lord. The Purāṇas call her Gaurī from the start: the golden girl of the peaks, destined from birth for the ash-covered wanderer who had forgotten how to love.</p>` },
        { tag: 'The Penance', title: 'Winning the Unwinnable', text: `<p class='myth-text'>When beauty failed to move Śiva in his grief, she chose tapas: years of austerity in the forest — leaves for food, rain for bath, standing on one leg through seasons — until the ascetic god himself came disguised as a young brahmin to test her. She would not be dissuaded, and Śiva, conquered by patience, married her at Kailāsa with the whole pantheon as guests: the wedding the Purāṇas tell as the universe's own.</p>` },
        { tag: 'The Mother', title: 'Two Sons, One Lap', text: `<p class='myth-text'>Of her body she shaped Gaṇeśa — the gatekeeper-son made while she bathed — and of the gods' combined fire came Kārttikeya, the war-son she raised as her own. The elephant-headed and the six-faced, the remover of obstacles and the destroyer of demons: both call her Mātā, and her lap, the texts say, is where the world's two busiest gods still rest.</p>` },
        { tag: 'The Festival', title: 'Gaurī Vṛata', text: `<p class='myth-text'>Her living myth is the calendar: the Tṛtīyā fasts and the Gaurī festivals of Maharashtra and the South, where married women pray for their households and unmarried girls for good husbands, honoring the goddess who won the ideal marriage by her own effort. The golden image is made, worshipped, and immersed — the mother received and released like a daughter of the house.</p>` },
      ],
    },
    syncretism: `<p>She is the gentle face of the same goddess who is Durgā in battle and Kālī in wrath — the Śākta tradition's proof that power has a domestic form. Her golden form travels: as the benevolent mother of Balinese Hinduism (Mā Gaurī), and into the syncretic Devi temples of the diaspora from Fiji to Trinidad, where her immersion-festivals (Gangā-snan of the image) kept the homeland's calendar across two oceans.</p>`,
    culturalLegacy: `<p>The Gaurī festivals — Gaṇeśa's mother welcomed for three days before her son's own ten — anchor the Maharashtrian religious year; the phrase "gaurī kā vivāha" (the ideal marriage) is everyday Hindi. Turmeric, her color, remains the ritual substance of Indian womanhood. She is the Śākta answer to the question of what a goddess of the home looks like when she also happens to be the energy of the universe.</p>`,
    archaeology: `Her temples stand with Pārvatī's: the great Śiva-Pārvatī shrines from Elephanta\'s marriage-panel to the Kailāsa of Ellora — where the wedding of Gaurī and Śiva fills the whole south wall — document her in stone. The Gaurī Shankar temples of the Kathmandu valley and the festival-images of Maharashtra (made annually in the potters' quarters) carry her golden form into the present.`,
    extendedMeditation: `<p>Gaurī is the goddess of earned tenderness. Nothing in her story is granted: the marriage is won by penance, the sons by her own making, the goldenness by her own nature. She asks the household's hardest question — the one every patient person eventually faces: how long can you keep the faith of the golden work before anyone notices — and will you still be radiant when they do?</p>`,
    sources: [{ name: 'Puranas' }, { name: 'Shiva Purana' }, { name: 'Monier-Williams' }, { name: 'MW' }, { name: 'Cambridge' }, { name: 'Oxford' }],
  },

  sani: {
    pronunciationNote:
      'Sanskrit śani — "the slow one" — begins with the palatal ś (IAST\'s acute-accented s) and the short a and i. The restoration keeps the ś that English writes "sh": Śani, the slow planet, whose very name is a warning about haste.',
    domains: {
      title: 'The Slow Reckoning',
      subtitle: 'Saturn, Karma, Justice, and the Seven-and-a-Half Years',
      lead: `<p class='lead-text'>Śani is the most feared of the nine planets: Saturn as the auditor of karma, whose slow passage through the zodiac delivers every deed's return — never early, never late, and never, ever argued with. India loves him exactly as much as it fears him, which is to say, enormously.</p>`,
      cards: [
        { iconPath: ICONS.wheel, name: 'Sade Sati', desc: 'The seven-and-a-half years of his transit over your moon — India\'s most-dreaded astrological season.' },
        { iconPath: ICONS.scale, name: 'The Auditor', desc: 'Karma\'s bookkeeper: no bribe, no appeal, no clerical error — only the account.' },
        { iconPath: ICONS.bolt, name: 'Son of the Sun', desc: 'Sūrya\'s estranged son — the shadow the light itself begot.' },
        { iconPath: ICONS.serpent, name: 'The Crow', desc: 'His vāhana: the dark bird that sees what others will not look at.' },
      ],
    },
    symbols: [
      { name: 'The crow', meaning: 'The dark mount — witness of the unavoidable' },
      { name: 'The iron', meaning: 'His metal — hard, cold, unglamorous, indispensable' },
      { name: 'The slow orbit', meaning: 'Twenty-nine-and-a-half years — time as the measure of justice' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Śani's myths are about the impossibility of escaping consequence — even for gods, and especially for kings.</p>`,
      myths: [
        { tag: 'The Birth', title: 'The Shadow of the Sun', text: `<p class='myth-text'>Born of Sūrya and Chhāyā — "Shadow," the substitute-wife the sun\'s true wife left in her place — Śani was the son the light refused to look at. His gaze fell so baleful that his own father\'s skin darkened at the meeting. The Purāṇas make the estrangement permanent: the planet of justice is the sun's shadow-child, and no amount of brilliance exempts the family from audit.</p>` },
        { tag: 'The Gaze', title: 'Even the Gods Are Judged', text: `<p class='myth-text'>His stories form a single syllabus: when Śani\'s gaze fell on Śiva, the great god was made to wander as a beggar; on Hanumān, the mighty one was pressed until he learned humility; on Rāma\'s line, even the righteous king's fortune bowed. The Hanumān legend adds the one counter: devotion freely given is the only shield Śani honors — the one god who bows to bhakti.</p>` },
        { tag: 'The Season', title: 'Sade Sati', text: `<p class='myth-text'>The living myth is the calendar: when Saturn transits the sign before, of, and after your natal moon — seven and a half years — the astrologers warn of Sade Sati, the season of testing. Careers stall, elders ail, patience thins — and the remedy prescribed is the same everywhere: sesame oil, iron, crows fed, and Śani's Saturday fast. The most-followed planetary observance in India is his.</p>` },
      ],
    },
    syncretism: `<p>Saturn's malefic reputation is Indo-European common ground — the Greek Kronos' devouring shadow and Rome's cold planet carry the same dread — but India alone made the planet a judge to be appeased weekly. His temple at Shingnapur (Maharashtra), where the god is an unwalled black stone under open sky, is the anti-temple: no roof over the planet, as if architecture itself feared to constrain him.</p>`,
    culturalLegacy: `<p>"Śani chal raha hai" (Saturn is upon us) is the everyday explanation for every run of bad luck from Mumbai to Trinidad. His Saturday fast, his black-and-blue colors, his iron-and-sesame remedies constitute the largest planetary cult in the world. The fear is genuinely democratic: billionaires and bus-drivers check the same ephemeris, and Shingnapur's donations fund entire towns. Jyotiṣa, India's living astrology, centers on his slow clock.</p>`,
    archaeology: `Shani Shingnapur's open-air black boulder — the village with famously doorless houses, trusting his protection — is his great shrine; the queue on Saturdays runs for kilometers. Navagraha temples across the South (the Kumbakonam circuit) install him among the nine planets in fixed order, and his bronze from the Chola period shows the stiff, dark, crow-mounted figure unchanged.`,
    extendedMeditation: `<p>Śani is the god of "later." Every tradition has a debt-collector, but his genius is slowness: the audit arrives when the deeds are half-forgotten, itemized to the day. He asks the only question that matters at midlife: not what did you build, but what did you balance — and are you ready for the season when the slow planet comes to check?</p>`,
    sources: [{ name: 'Puranas' }, { name: 'Monier-Williams' }, { name: 'Mahabharata' }, { name: 'MW' }, { name: 'Cambridge' }, { name: 'Oxford' }],
  },

  orun: {
    pronunciationNote:
      'Ọrun is Yoruba for "heaven": the precomposed dot-below Ọ is the domain-maximal form — the full tone marks (Ọ̀run, low-high) cannot be registered as a domain, so the temple preserves the tone in text while the address bar carries what the DNS allows.',
    domains: {
      title: 'The Heaven Above the Heavens',
      subtitle: 'Sky, Destiny, and the Realm of Olódùmarè',
      lead: `<p class='lead-text'>Ọrun is the Yoruba name of heaven itself: the sky-realm where Olódùmarè and the orisha dwell, from which every soul descends to earth (ayé) — and to which every destiny (orí) is assigned before birth. It is not a god but the address of the gods.</p>`,
      cards: [
        { iconPath: ICONS.star, name: 'Ọrun and Ayé', desc: 'Heaven and earth: the two halves of reality, with the soul commuting between them.' },
        { iconPath: ICONS.eye, name: 'Orí', desc: 'The inner head — the personal destiny each soul chooses (or receives) in Ọrun before birth.' },
        { iconPath: ICONS.column, name: 'Olódùmarè', desc: 'The Owner of Heaven — the supreme being whose realm Ọrun is.' },
        { iconPath: ICONS.wave, name: 'The Descent', desc: 'Every birth is an emigration from heaven; every death, the return journey.' },
      ],
    },
    symbols: [
      { name: 'The white cloth', meaning: 'Heaven\'s color — purity and the unblemished sky' },
      { name: 'The palm nuts', meaning: 'Ifá\'s instruments — heaven\'s messages read on earth' },
      { name: 'The head', meaning: 'Orí, the chosen destiny — heaven carried inside the skull' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Ọrun's myths are the architecture of Yoruba cosmology: how heaven was made, and how souls travel its road to earth.</p>`,
      myths: [
        { tag: 'The Descent', title: 'The Chain to Earth', text: `<p class='myth-text'>In the beginning there was only Ọrun above and the waters below. Olódùmarè sent Odùduwà down with a chain, a rooster, and a handful of earth: the rooster scattered the soil on the water, and the land of Ilé-Ifẹ̀ spread — earth founded beneath heaven, the two realms joined by the road of the orisha. Every Yoruba city thereafter is a point on that first chain's route.</p>` },
        { tag: 'The Choice', title: 'The Choosing of Orí', text: `<p class='myth-text'>Before birth, each soul kneels in Ọrun before Olódùmarè and receives its orí — its inner head, its portion of destiny. The Ifá corpus teaches that the choice, once made, is erased from memory but not from life: every fortune and misfortune on earth is the heaven-chosen head working out its own plot. To pray for a good orí is to negotiate with one's own prenatal self.</p>` },
        { tag: 'The Traffic', title: 'Souls on the Road', text: `<p class='myth-text'>The Yoruba cosmos runs on commuting: the orisha descend to possess their priests, the ancestors visit in dreams and Egúngún masquerades, and the dead return as children ("abíkú" are souls who commute too often). Ọrun is not distant but adjacent — the sky-realm whose door opens in every shrine, every trance, and every correctly cast palm-nut of Ifá.</p>` },
      ],
    },
    syncretism: `<p>The Ọrun-ayé structure traveled with the diaspora: Candomblé's Oxalá-realm, Santería\'s heaven of Olófin, and Haiti's lwa-cosmology all keep the two-world map. Christian heaven merged with Ọrun in the New World without ever absorbing it: the Yoruba sky remains a realm of traffic and traffic-officers (the orisha), not of distant thrones — heaven as the next city over, not the next world.</p>`,
    culturalLegacy: `<p>The word lives in a thousand names: Ọrunmila (heaven-knows-salvation), Ọlọrun (owner-of-heaven), Ọrúnmìlà, Ọba-Ọrun. Ifá divination — UNESCO-listed — is its daily news service, and the Egúngún festivals keep the ancestors' visits on the calendar. Every Yoruba funeral says the same thing in ten thousand voices: "the journey to Ọrun is well-traveled" — heaven as home, not as hope.</p>`,
    archaeology: `Ilé-Ifẹ̀, the city Odùduwà founded on the scattered earth, keeps the creation-site shrines: the Oke Itase hill and the palace of the Ọọni, whose crown descends from heaven's own. The bronze heads of Ifẹ̀ (12th–15th c.), among Africa\'s supreme artworks, are the faces of heaven's first citizens. The Ifá corpus — the great oral archive — is preserved by the babaláwo lineages of Yorubaland and the diaspora.`,
    extendedMeditation: `<p>Ọrun is the heaven that answers letters. It is not a place you hope to reach but the place you came from — with your destiny already in your pocket, unread. It asks the Yoruba question, which is also everyone's: the head you chose is the life you are living — so what, this morning, will you do with the heaven you brought with you?</p>`,
    sources: [{ name: 'Idowu' }, { name: 'Bascom' }, { name: 'Abraham' }, { name: 'Folklore' }, { name: 'Cambridge' }, { name: 'Oxford' }],
  },

  xiuhtecuhtli: {
    pronunciationNote:
      'Xiuhtēcuhtli — "Fire Lord" — takes the long ē of tēcuhtli (lord) in Nahuatl; the domain keeps the plain ASCII form xiuhtecuhtli.com, which the temple explains: the canonical form bears the macron, the address bar carries what the registrar allows.',
    domains: {
      title: 'The First Fire',
      subtitle: 'Hearth, Year, and the New Fire Ceremony',
      lead: `<p class='lead-text'>Xiuhtēcuhtli is the Aztec fire itself: first and last of the gods, the hearth at the center of every home and of the universe, and the god whose great ceremony — the drilling of the New Fire — restarted time itself every fifty-two years.</p>`,
      cards: [
        { iconPath: ICONS.flame, name: 'The Hearth', desc: 'The three stones of every Aztec kitchen — his throne in every house.' },
        { iconPath: ICONS.wheel, name: 'The New Fire', desc: 'Every 52 years, all fires died and one was drilled anew — the cosmos restarted.' },
        { iconPath: ICONS.star, name: 'Huehueteotl', desc: '"The Old God" — his other name: the ancient of days, wrinkled with a brazier on his back.' },
        { iconPath: ICONS.column, name: 'The Center', desc: 'The axis mundi: fire as the pillar between the levels of the world.' },
      ],
    },
    symbols: [
      { name: 'The fire drill', meaning: 'The instrument of the New Fire — time kindled by friction' },
      { name: 'The brazier', meaning: 'His back-mounted bowl — the old god carrying the hearth' },
      { name: 'The butterfly', meaning: 'The fire-moth drawn to his flame — the soul seeking the light' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Xiuhtēcuhtli's myths are the calendar's: the fire that must be renewed, and the darkness that waits if it is not.</p>`,
      myths: [
        { tag: 'The Cycle', title: 'The Drilling of the New Fire', text: `<p class='myth-text'>At the close of each 52-year cycle (xiuhmolpilli), the Aztec world extinguished every flame: households went dark, debts were settled, and the priests climbed Huixachtlan — Hill of the Star — to watch for the Pleiades' midnight passage. On a captive's chest the fire-priest drilled the new flame; if it caught, the runner carried it to the Templo Mayor, and every hearth in the empire was relit from it. If it failed, the stars said, the sun would not rise — and the world would end in the dark.</p>` },
        { tag: 'The Elder', title: 'Huehueteotl, the Old One', text: `<p class='myth-text'>Under his other name he is the oldest thing in the cosmos: Huehueteotl, the wrinkled god who carries the brazier on his bent back, present before the suns. The Aztecs put him at the center of the universe's four directions — the fire-pillar of the world — and every domestic hearth was his shrine: the smallest and the greatest cult at once, the god of the kitchen who is also the god of the calendar.</p>` },
        { tag: 'The Nourishment', title: 'What Fire Asks', text: `<p class='myth-text'>The codices show his contract: fire feeds the world and feeds on it. Offerings of copal, of the first fruits, and — in the empire's hard logic — of the heart, were given to the flame that gives light, heat, and the year. Xiuhtēcuhtli's priests performed the fire-walking and the self-sacrifice by fire: the god who is the gift and the cost of the gift, the oldest bargain in the Americas.</p>` },
      ],
    },
    syncretism: `<p>The friars saw him as the devil's furnace — and the people quietly kept lighting the hearth: the vigil-candle of Mexican folk Catholicism and the copal-smoke of Day of the Dead altars are his continuing liturgy. The Maya fire-lords and the Zapotec coquihani are his southern cousins; the New Fire concept — the cosmos rekindled by human hands — has no closer parallel than the Vedic agni-liturgies on the other side of the world.</p>`,
    culturalLegacy: `<p>The 52-year cycle's shadow falls on Mexico's calendar still; Huixachtlan's hill is in today's Mexico City sprawl, and the last New Fire was drilled in 1507 — the empire fell before the next. His wrinkled, brazier-backed figure is one of the most-recognized images of Aztec art (the great stone Huehueteotl of the Museo Nacional), and the fire-drill remains the emblem of renewal ceremonies across Mexican civic culture.</p>`,
    archaeology: `The Templo Mayor's excavations found his shrine among the precinct's gods; the great Huehueteotl brazier-figures — stone elders carrying the fire-bowl — survive from Teotihuacan to Tenochtitlan, making him the longest-documented god-image in Mesoamerica (a thousand years of the same bent back). Huixachtlan's summit is preserved within Mexico City, and the Florentine Codex's New Fire account is the fullest ritual description from the pre-Columbian world.`,
    extendedMeditation: `<p>Xiuhtēcuhtli is the god of the tending. Civilizations, households, and marriages are all the same fire: it is not the lighting that matters but the keeping, and the empire knew it — 52 years of warmth, one night of terror, and the drill again. He asks the hearth's question, which is the oldest one there is: what, in your house, are you keeping alight — and what would you do on the night it goes out?</p>`,
    sources: [{ name: 'Florentine Codex' }, { name: 'Sahagún' }, { name: 'Karttunen' }, { name: 'Nahuatl dictionary' }, { name: 'Cambridge' }, { name: 'Oxford' }],
  },

  pluto: {
    pronunciationNote:
      'Latin Plūtō carries two long vowels, both marked by the restoration. His name is Rome\'s calque of the Greek Πλούτων — "the Rich One" — the underworld god whose buried wealth made death and riches share a single name.',
    domains: {
      title: 'The Rich One Below',
      subtitle: 'Underworld, Wealth, and the Doors of the Deep',
      lead: `<p class='lead-text'>Plūtō is Rome's underworld god in his own right — not merely Hádēs renamed, but the Latin "Rich One" who rules the dead and the buried treasure together: the god in whose name the ground gives up both its wealth and its silence.</p>`,
      cards: [
        { iconPath: ICONS.gate, name: 'The Doors', desc: 'The Plutonia — the underworld gates, of which Rome kept its own at the Aventine.' },
        { iconPath: ICONS.horn, name: 'Plūtus', desc: 'His twin-name: the wealth-god Plutus — cornucopia from below.' },
        { iconPath: ICONS.serpent, name: 'Cerberus', desc: 'The three-headed hound of the threshold — the deep\'s own border guard.' },
        { iconPath: ICONS.wave, name: 'Proserpina', desc: 'The queen he took by force and kept by season — Rome\'s Persephonē.' },
      ],
    },
    symbols: [
      { name: 'The bident', meaning: 'His two-pronged staff — the scepter of the depths' },
      { name: 'The cornucopia', meaning: 'Wealth rising from the earth — his benign face' },
      { name: 'The cypress', meaning: 'The underworld\'s tree — the dark column of the graveyard' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Plūtō's Roman myths retell the Greek cycle with a merchant's accent: the underworld as a treasury as much as a tribunal.</p>`,
      myths: [
        { tag: 'The Taking', title: 'Proserpina in the Meadow', text: `<p class='myth-text'>Ovid tells the Roman version of the oldest underworld story: Plūtō rose through the earth of Henna\'s meadow as Proserpina gathered flowers, and carried her down through the lake\'s opening to be his queen. Cerēs searched the world with torches; the famine followed her grief; and the settlement — half the year above, half below — made the seasons. Rome read it as agriculture's charter-myth: seed descends, grain returns.</p>` },
        { tag: 'The Wealth', title: 'Plūtus the Giver', text: `<p class='myth-text'>Under the name Plūtus he was the benign twin: the wealth that comes from under the earth — grain, metal, the harvest itself. Aristophanes' comedy made him a blind old man who, healed, gives riches to the just; Rome's poets used him for the moral that wealth, like the grave, is no respecter of persons. The two names stayed one god: the Rich One below is also the Giver below.</p>` },
        { tag: 'The Gate', title: 'The Plutonium of Rome', text: `<p class='myth-text'>Rome kept its own door to his kingdom: the Plutonium on the Aventine's slope, where, in 249 BCE during the darkest days of the First Punic War, the Senate staged the devotio — Valerius and his men hurled themselves into the pit to seal it with their lives, and the war turned. The story made his gate Rome's nuclear option: the last, deepest offering a city can make to the Rich One Below.</p>` },
      ],
    },
    syncretism: `<p>His Greek equation with Hádēs was total and early, but Rome kept the distinction of names: Hádēs the Unseen, Plūtō the Rich — the wealth-emphasis Roman. Etruria's Aita stood behind him on the Piacenza liver; Gaul\'s Dis Pater, claimed by Caesar as the Gauls' ancestor, absorbed his worship northward; and the alchemists kept "plutonic" for all deep-earth fire, whence the element plutonium takes its name from his planet.</p>`,
    culturalLegacy: `<p>The dwarf planet demoted in 2006 bears his name — and the irony is his: the richest name in the sky, given to the smallest body. "Plutocracy" is his grammar of wealth; "plutonic" his geology. In the Renaissance his image became Fortune's dark twin, and modern finance still speaks of the "underworld" of markets — the Rich One below, invoked daily by people who have forgotten him.</p>`,
    archaeology: `The Plutonium site on the Aventine is text-attested (Livy) though not certainly located; the great painted tombs of the Etruscan underworld — Aita and Phersipnai at Tarquinia — show his Italian face two centuries before Rome's. His richest monument is negative space: the absence of any grand Plūtō-temple in Rome itself, the city preferring to worship the giver (Plūtus, with Cerēs) and wall the taker out.`,
    extendedMeditation: `<p>Plūtō is the god of what the ground holds: the dead, the ore, the seed, the secret. Rome's insight was to give all four one name and one address — the rich dark below where everything valuable also fears to go. He asks the miner\'s and the mourner's common question: what will you trust to the deep — and what, in your season, will it give back?</p>`,
    sources: [{ name: 'Lewis & Short' }, { name: 'Varro' }, { name: 'Cicero' }, { name: 'Ovid' }, { name: 'Macrobius' }, { name: 'Cambridge' }],
  },

  ceres: {
    pronunciationNote:
      'Latin Cerēs carries the long ē of the first syllable — the same root that gives "create" and "grow" (crescere): the goddess named for growth itself. Her name is the ancestor of the word "cereal," which is why her temple\'s bread is etymological.',
    domains: {
      title: 'The Grain Mother',
      subtitle: 'Agriculture, Bread, Law, and the People\'s Goddess',
      lead: `<p class='lead-text'>Cerēs is Rome\'s oldest working goddess: the power of grain and growth, patron of the plebeians who eat it, and the deity whose Greek sister\'s myth (Dēmētēr and Persephonē) she borrowed so completely that Rome's religion of the field became one with the mystery of the seasons.</p>`,
      cards: [
        { iconPath: ICONS.swan, name: 'The Sheaf', desc: 'The wheat-sheaf she carries — the staff of civilization.' },
        { iconPath: ICONS.flame, name: 'The Torches', desc: 'Her search for Proserpina by torchlight — the mother who would not stop.' },
        { iconPath: ICONS.scale, name: 'The Plebeian Triad', desc: 'Cerēs, Liber, Libera — the Aventine trinity of the common people.' },
        { iconPath: ICONS.ship, name: 'The Grain Fleet', desc: 'Rome\'s annona: the wheat-ships of Sicily and Egypt under her protection.' },
      ],
    },
    symbols: [
      { name: 'The wheat-sheaf', meaning: 'The gift that made agriculture — and law — possible' },
      { name: 'The torch', meaning: 'The search that never ends — maternal persistence as cosmic order' },
      { name: 'The poppy', meaning: 'Sleep and renewal — the flower of the fallow field' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Cerēs' myths are Rome's double helix: the Greek mother-goddess woven into the Italian grain-god, until the field and the mystery were one.</p>`,
      myths: [
        { tag: 'The Gift', title: 'The Teaching of the Furrow', text: `<p class='myth-text'>Before Cerēs, the poets say, humanity ate acorns and called it food. She taught the cutting of the furrow, the keeping of seed, the harvest\'s measure — and with grain came surplus, and with surplus came law: Ovid and Cicero both note that Rome\'s oldest laws guarded the field and its boundaries, because the goddess who invented agriculture also, necessarily, invented property. Her temple was the archive of the plebeians' laws: grain and statute, one house.</p>` },
        { tag: 'The Search', title: 'The Torches of Cerēs', text: `<p class='myth-text'>When Plūtō took Proserpina, Cerēs lit torches at Aetna\'s crater and searched the world for nine days, fasting and raging. Finding her daughter queen of the underworld, she refused the compromise until the earth starved with her; the settlement — Proserpina\'s year divided between the realms — is the myth that explains why the field sleeps and wakes. Rome told it as the charter of the Cerealia, her April festival of the grain's return.</p>` },
        { tag: 'The People', title: 'The Aventine Triad', text: `<p class='myth-text'>Her great temple on the Aventine (493 BCE) belonged not to the patricians but to the plebs: Cerēs, Liber, and Libera — grain, wine, and growth — were the people's trinity, the asylum where debtors sheltered and the archive where the plebeians kept their laws. When the plebs seceded to the Sacred Mount, it was to her hill they walked: the goddess of bread is also, in Rome, the goddess of the bargain between bread and power.</p>` },
      ],
    },
    syncretism: `<p>Her equation with Dēmētēr was total by the 5th century BCE — the Sibylline Books themselves prescribed the merger — but Rome added its own stresses: the plebeian politics, the annona grain-supply, and the Cerealia's games. Sicily, her mythic homeland and Rome\'s first granary, kept her temples as the island's patron (Enna, her meadow); and through the grain-fleet she became the one goddess every province ate with daily, the most-consumed deity in the empire.</p>`,
    culturalLegacy: `<p>"Cereal" is her everyday immortality: every breakfast bowl in the West carries her name. Her statue sits atop the Chicago Board of Trade — the grain market's own goddess, uncrowned by any myth but the price of wheat. State seals (New Jersey\'s, North Carolina\'s) put her beside Liberty; the dwarf planet Ceres, first-discovered and largest of the asteroids, is NASA\'s probe Dawn's destination — the grain mother, honored in orbit.</p>`,
    archaeology: `Her Aventine temple's platform survives beside the Circus Maximus; the Enna sanctuary in Sicily — her mythic meadow — preserves its rock-cut shrines. The Cerealia's games are documented in the fasti; her bronze and terracotta votives from the grain-districts of Sicily and Latium fill the museums, and the Plebeian Games' theater-temple complex on the Aventine marks the political grain-cult's ground.`,
    extendedMeditation: `<p>Cerēs is the goddess of the daily miracle nobody notices: that seeds kept become bread, that fields kept become cities, that mothers searching become seasons. She asks the farmer's and the state\'s same question: the grain you eat was someone else's keeping — so whose keeping are you, and what will your furrow feed when you are done?</p>`,
    sources: [{ name: 'Lewis & Short' }, { name: 'Varro' }, { name: 'Ovid' }, { name: 'Cicero' }, { name: 'Horace' }, { name: 'Cambridge' }],
  },

  orpheus: {
    pronunciationNote:
      'Greek Ὀρφεύς stresses the final syllable — Orpheús — and the restoration keeps the acute where the tradition puts it. The etymology is debated (perhaps from a root for "orphan" or the "darkness" of his descent); the name is older than its explanations, which is exactly right for the singer who is all voice.',
    domains: {
      title: 'The Singer of the World',
      subtitle: 'Music, Poetry, the Descent, and the Lost Look Back',
      lead: `<p class='lead-text'>Orpheús is the archetype of art itself: the Thracian singer whose lyre moved stones and stopped rivers, who went down living into the underworld for his wife, and whose single look back is the West's permanent parable of love and loss.</p>`,
      cards: [
        { iconPath: ICONS.lyre, name: 'The Lyre', desc: 'His instrument: the gift of Apóllōn, the sound that made nature stop to listen.' },
        { iconPath: ICONS.wave, name: 'The Argonauts', desc: 'His song steadied the Argo\'s crew past the Seirḗnes — art as navigation.' },
        { iconPath: ICONS.gate, name: 'The Descent', desc: 'The katabasis for Eurydikē — the only route out of death that music ever opened.' },
        { iconPath: ICONS.eye, name: 'The Look Back', desc: 'The one forbidden glance, at the threshold — and the second, final loss.' },
      ],
    },
    symbols: [
      { name: 'The lyre', meaning: 'Art as the measure of the world — the cosmos tuned to a string' },
      { name: 'The laurel', meaning: 'His prophetic-grove crown at Pieria' },
      { name: 'The nightingale', meaning: 'His bird — song persisting through darkness' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Orpheús' myths are all about what music can and cannot do: it charms everything, and it saves nothing except itself.</p>`,
      myths: [
        { tag: 'The Power', title: 'The Song that Moves Stones', text: `<p class='myth-text'>The tradition is unanimous: when Orpheús played, the trees uprooted themselves to follow, the rivers halted, the wild beasts lay down beside the sheep. Simonides' line — "the birds flew above him, the fish leapt from the water" — is the oldest surviving witness. His mother was the Muse Kalliopē; his lyre, some say, Apóllōn\'s own gift: music as the one power that rivals the gods'.</p>` },
        { tag: 'The Voyage', title: 'The Singer on the Argo', text: `<p class='myth-text'>Apollonius Rhodius gives him the heroic use: on the Argo, his song timed the rowers, calmed the quarrels, and — at the Seirḗnes' shore — drowned the death-song in a nobler one. He is the epic's proof that the hero's tool is not always the sword: the Argonauts' most dangerous passage was survived by a string, not a blade.</p>` },
        { tag: 'The Descent', title: 'The Look Back', text: `<p class='myth-text'>Eurydikē died of a snake's bite on their wedding day, and Orpheús did what no one does: went after her, alive. His song charmed Charon, Cerberus, and the Furies' whips to stillness; Hádēs himself relented — on one condition: she follows behind, and he must not look back until both stand in the light. At the threshold, he looked. She fell back, saying only "farewell." The West has been writing the sentence ever since: love almost defeats death — almost.</p>` },
        { tag: 'The End', title: 'The Head that Sang', text: `<p class='myth-text'>The Maenads of Dionysos tore him apart — for refusing their god, or their beds, the versions disagree. His head, still singing, floated down the Hebrus to the sea and came ashore at Lesbos, where it prophesied until Apóllōn silenced it; his lyre was set among the stars. Even dismembered, the singer does not stop: the myth's last mercy is that the song survives the man.</p>` },
      ],
    },
    syncretism: `<p>The mystery-religion that took his name — Orphism — made him the patron of the soul's journey: the gold tablets, the egg, Phánēs, the afterlife\'s map all carry the Orphic brand, though the historical singer and the theology are centuries apart. Christianity read him as a type of Christ (the descent, the harrowing, the animal-charming); the Renaissance made him the emblem of poetry itself; and opera was effectively invented for him — Monteverdi's Orfeo (1607) is the first great opera, and there have been hundreds since.</p>`,
    culturalLegacy: `<p>"Orphic" is the word for haunting, entrancing beauty; the lyre constellation (Lyra) is his; and the look-back is literature's most quoted failure — from Virgil to Rilke\'s Sonnets to Orpheus to Cocteau\'s Orphée and Baz Luhrmann\'s Moulin Rouge. Every artist who has tried to retrieve something from loss — and failed at the threshold of the work — is his descendant. Music's power to move the world is his biography; its limits are his lesson.</p>`,
    archaeology: `The Orphic gold tablets — thin gold leaves buried with initiates from Thessaly to South Italy, instructing the dead ("say: I am a child of Earth and starry Heaven") — are his cult's material archive. Vase-painting shows him in Thracian dress charming the Greeks, then charming the animals, then (favorite Roman motif) playing to underworld figures. The Piraeus relief of Orpheus among the Maenads (Naples) and the Thracian singers' cult sites at Pangaion mark his geography.`,
    extendedMeditation: `<p>Orpheús is the patron of the almost. He got her back — almost. He sang the Furies to tears — and still lost. His question is the one every artist and every lover knows: when the rule is "do not look back," and the one thing you have is the looking — what are you willing to lose for one glimpse of what you love?</p>`,
    sources: [{ name: 'Apollonius' }, { name: 'Euripides' }, { name: 'Ovid' }, { name: 'Apollodorus' }, { name: 'Pindar' }, { name: 'Cambridge' }],
  },

  mixcoatl: {
    pronunciationNote:
      'Mixcōātl is Nahuatl for "cloud serpent" (mixtli + cōātl); the macron on the ō marks the long vowel of the serpent-word, the same one in Quetzalcōātl and Xōlōtl. The restoration keeps it — the serpent is always long.',
    domains: {
      title: 'The Serpent in the Clouds',
      subtitle: 'Hunting, Stars, and the Milky Way',
      lead: `<p class='lead-text'>Mixcōātl is the Aztec god of the hunt and the starry road: the cloud-serpent who slides along the Milky Way, patron of the nomadic hunters who became the Aztecs' ancestors — the oldest god of the road that leads to the empire.</p>`,
      cards: [
        { iconPath: ICONS.star, name: 'The Milky Way', desc: 'His body in the sky: the star-serpent, the road of the night.' },
        { iconPath: ICONS.bolt, name: 'The Hunt', desc: 'Patron of hunters — his bow and net, the Chichimec tool-kit.' },
        { iconPath: ICONS.wave, name: 'The Cloud', desc: 'The weather-serpent: rain and sky in motion.' },
        { iconPath: ICONS.serpent, name: 'Camaxtle', desc: 'His other name — the ancient hunting god of the Chichimecs.' },
      ],
    },
    symbols: [
      { name: 'The bow and arrows', meaning: 'The hunt — his gift to the wandering tribes' },
      { name: 'The star-serpent', meaning: 'The Milky Way as a living road' },
      { name: 'The white stripes', meaning: 'His hunting-paint, cloud on dark sky' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Mixcōātl's myths are the Aztec origin-story in one figure: the wilderness god who taught the city-builders how to hunt, and whose star-road they followed south.</p>`,
      myths: [
        { tag: 'The Road', title: 'The Serpent of Stars', text: `<p class='myth-text'>The Chichimec tribes who became the Aztec nobility followed his road: the Milky Way, which the Nahuatl called Mixcōātl, the Cloud Serpent, slithering nightly across the sky. The migrating peoples read their path in his body — the desert crossed by the serpent's light — and when they founded Tenochtitlan, they enthroned the wilderness-guide among the city's great gods, the god of where they had come from.</p>` },
        { tag: 'The Gift', title: 'The Bow of the Chichimecs', text: `<p class='myth-text'>As Camaxtle, he gave the wandering tribes the bow and the fire-drill — the two technologies of the road. The Aztec coronation rites remembered: the new Tlatoani dressed as Mixcōātl for the warrior\'s investiture, and the festival of Quecholli ("the precious feather") honored him with the hunt\'s own weapons laid on his altar — the city's annual thanks to the god who fed it before it had fields.</p>` },
        { tag: 'The Father', title: 'Father of the Four Hundred', text: `<p class='myth-text'>The myth makes him father of the Centzon Huitznāhua — the Four Hundred Southerners, the star-host whom Coyolxāuhqui led against their mother when she bore Huitzilopochtli. The god of the hunt is thus also the father of the enemies of the sun: the Aztec sky-war between day and night is, in his household, a family quarrel, written nightly across his own starry body.</p>` },
      ],
    },
    syncretism: `<p>The hunt-gods of North America stand in his lineage: the Huichol's Kauyumari (the blue deer-guide) and the Maya hunting-lords share his road-and-prey theology. Colonial chroniclers merged him with Santiago and with Nimrod (the hunter-king of the missionaries' Genesis); the people kept the star-serpent — and hunters in rural Mexico still note the sky's deer-road on the way to the field.</p>`,
    culturalLegacy: `<p>His name survives in the Milky Way's Nahuatl name itself; the Quecholli weapons-festival is documented in the Florentine Codex's fullest ritual detail; and the Chichimec hunting mythology is the standard account of the Aztecs' own self-image: the empire that began as wanderers following a serpent of stars. The Mexican National Museum of Anthropology's Mixcōātl figures — striped, netted, bowed — are his standing portraits.</p>`,
    archaeology: `Teotihuacan's hunting-god precedes him; the Toltec-Aztec Camaxtle cult at Tula and the Templo Mayor\'s offerings (his arrows among the buried gifts) anchor his archaeology. The Florentine Codex\'s Quecholli chapter — weapons, dance, and the hunt\'s liturgy — is the fullest record, and the rock-art of the northern deserts (the bowmen of the Sierra Madre) keeps his people's original ground.`,
    extendedMeditation: `<p>Mixcōātl is the god of the journey that made you. Every settled people remembers, somewhere, the road: the serpent in the night sky that was followed here. He asks the traveler's question, which is also the nation\'s and the individual's: what star did your ancestors follow — and does it still move, when you look up, the way it moved for them?</p>`,
    sources: [{ name: 'Florentine Codex' }, { name: 'Sahagún' }, { name: 'Karttunen' }, { name: 'Nahuatl dictionary' }, { name: 'Cambridge' }, { name: 'Oxford' }],
  },

  oba: {
    pronunciationNote:
      'Ọba names the river orisha of the Ọba River; the precomposed dot-below Ọ is the domain-maximal form (tone marks cannot be registered), and the fuller tone-marked Ọ̀bá is preserved in the temple\'s display text.',
    domains: {
      title: 'The River that Endures',
      subtitle: 'Devotion, Jealousy, and the Lake of the Co-Wife',
      lead: `<p class='lead-text'>Ọba is the river orisha who loved and lost: the third and most senior wife of Ṣàngó, whose jealousy cost her an ear and whose grief became a lake. She is the Yoruba study of endurance — the quiet river that outlasts the storm-god's louder wives.</p>`,
      cards: [
        { iconPath: ICONS.wave, name: 'The Ọba River', desc: 'Her water in Yorubaland — the stream that bears her name and her temperament.' },
        { iconPath: ICONS.eye, name: 'The Hidden Ear', desc: 'The ear she lost to Ṣàngó\'s rage — hidden under her crown and her hair.' },
        { iconPath: ICONS.scale, name: 'The Senior Wife', desc: 'First among the three — and last to be believed.' },
        { iconPath: ICONS.lotus, name: 'The Lake', desc: 'Her grief made geography: the lake where the faithful mourn with her.' },
      ],
    },
    symbols: [
      { name: 'The covered ear', meaning: 'Wounds hidden and endured — dignity after injury' },
      { name: 'The brass bracelet', meaning: 'Her marriage-token from the thunder-king' },
      { name: 'The red parrot feather', meaning: 'Her sign beside the other wives\' red' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Ọba's myths are domestic tragedy told as hydrology: the co-wife's war that became a river and a lake.</p>`,
      myths: [
        { tag: 'The Rivalry', title: 'Three Wives, One Storm', text: `<p class='myth-text'>Ṣàngó, the thunder-king, took three river-wives: Ọba the senior, Ọṣun the beloved, and Ọya the storm-sharer. The oríkì tell how Ọba, seeing her husband's love flow to Ọṣun, schemed — and how Ọṣun, learning of it, tricked her in return: she told Ọba the king loved the ear of a woman in his soup, and Ọba, desperate to be loved, cut her own ear and cooked it for him.</p>` },
        { tag: 'The Rage', title: 'The Ear in the Soup', text: `<p class='myth-text'>When the trick was revealed, Ṣàngó's disgust and rage drove her from the palace; the co-wives laughed, and Ọba fled north, weeping. She hid her maimed head under her crown and her hair — which is why her images cover the ears — and the thunder-king, in the later tellings, never stopped regretting the day. Her myth is the Yoruba warning about jealousy: not the villain\'s punishment, but the victim's endurance.</p>` },
        { tag: 'The Lake', title: 'The Water of Her Grief', text: `<p class='myth-text'>Her tears became her realm: the Ọba River and the lake of her worship, where her priests keep her cult to this day. The co-wives' war never ended — Ọba and Ọya still cannot be honored in the same shrine — but her people say the senior wife outlasted them: storms pass, the river stays. The crown that hides her ear is her whole theology: dignity is what you keep when you have lost what you loved.</p>` },
      ],
    },
    syncretism: `<p>In Cuba's Santería she is Obá, syncretized with Santa Catalina de Alejandría (Saint Catherine, whose wheel she shares) — her cult strong in Matanzas; in Brazil's Candomblé, Obá keeps her river and her covered ear, the devotee-dancers' hair arranged to hide what the king did. The three-wife cycle (Ọba-Ọṣun-Ọya) is the diaspora's standard parable of the polygamous household, told wherever the orisha went.</p>`,
    culturalLegacy: `<p>Her image — the crowned figure hiding her ears — is one of Yoruba art's most intimate: the wound as regalia. The co-wives' cycle structures the orisha households of two continents; her river in Yorubaland keeps her shrines active; and the "Obá" of Cuban Santería is beloved as the most patient of the female orisha — the one who teaches that endurance is also a form of power.</p>`,
    archaeology: `Her river rises in the hills of the Ọyọ country, and her cult-centers at Ọṣogbo and the Ọba lake preserve her shrines and her priests; the brass and terracotta figures of the covered-ear goddess are documented in the museum collections from Ifẹ̀ to Havana. The oríkì of the three wives, recorded by Bascom and others, is among the finest domestic myth-cycles in the Yoruba corpus.`,
    extendedMeditation: `<p>Ọba is the goddess of what remains when the shouting is over. The storm-wives got the thunder; she got the river — and rivers outlive storms by definition. Her crown covers her ear, not her shame: the difference is everything. She asks the question the senior wife knows best: after the injustice, what do you cover, what do you keep, and what do you let become a lake?</p>`,
    sources: [{ name: 'Bascom' }, { name: 'Idowu' }, { name: 'Abraham' }, { name: 'Folklore' }, { name: 'Cambridge' }, { name: 'Oxford' }],
  },

  mazu: {
    pronunciationNote:
      'Māzǔ 媽祖 — "Maternal Ancestor" — carries the first tone on mā and the dipping third tone on zǔ; the restoration keeps both tone marks. Her personal name was Lín Mòniáng ("Silent Maiden"), but the world prays to the title: Grandmother of the sea.',
    domains: {
      title: 'The Mother of the Sea',
      subtitle: 'Sailors, Storms, and the Red Lantern',
      lead: `<p class='lead-text'>Māzǔ is the most-worshipped sea goddess on earth: the fisherman\'s daughter who became the guardian of everyone who works the water, whose temples line every coast of the Chinese world, and whose red lanterns guide sailors home through a thousand years of storms.</p>`,
      cards: [
        { iconPath: ICONS.ship, name: 'The Sailors\' Guardian', desc: 'The goddess of everyone who goes to sea — the busiest answering voice on the water.' },
        { iconPath: ICONS.star, name: 'The Red Lantern', desc: 'Her signal in the storm — the light sailors pray to see.' },
        { iconPath: ICONS.serpent, name: 'The Two Generals', desc: 'Qiānlǐyǎn and Shùnfēng\'ěr — her thousand-mile eyes and wind-sharp ears.' },
        { iconPath: ICONS.wave, name: 'Meizhou', desc: 'Her island home off Fujian — the Nazareth of the sea-faith.' },
      ],
    },
    symbols: [
      { name: 'The red robe', meaning: 'Her temple color — protection worn bright against the grey sea' },
      { name: 'The lantern', meaning: 'The guide-light of the storm-tossed' },
      { name: 'The two generals', meaning: 'Sight and hearing deified — vigilance in both directions' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Māzǔ's myth is a life, not a legend: the historical Lín Mòniáng of 10th-century Meizhou, whose silence, visions, and early death became the sea's own religion.</p>`,
      myths: [
        { tag: 'The Maiden', title: 'The Silent Girl of Meizhou', text: `<p class='myth-text'>Lín Mòniáng was born on Meizhou island in 960 CE, and tradition says she did not cry at birth — hence "Silent Maiden." She learned to read the weather on her father's fishing boat, stood on the shore watching for lost sails, and was seen in dreams guiding drowning sailors home. Dead by twenty-eight, she rose, the fishermen said, straight to the sky on a cloud of incense — and the sea was never without her again.</p>` },
        { tag: 'The Apotheosis', title: 'From Daughter to Empress of Heaven', text: `<p class='myth-text'>The dynasties out-titled each other: the Song made her Consort of Heaven, the Yuan made her Princess, the Ming made her Holy Mother, the Qing made her Tiānhòu — Empress of Heaven. The historical woman is buried in the titles: the fishing daughter became, by twelve centuries of gratitude, the highest-ranked goddess of the Chinese sea, outranking every god the bureaucracy could promote her past.</p>` },
        { tag: 'The Generals', title: 'Eyes and Ears of the Sea', text: `<p class='myth-text'>Her two attendants are the myth of vigilance itself: Qiānlǐyǎn ("thousand-mile eye") and Shùnfēng\'ěr ("with-the-wind ear"), the demon-generals she tamed to watch and listen for sailors in distress. Their horned, fierce statues flank her in every temple — the goddess's instruments: nothing that happens on her sea goes unseen or unheard.</p>` },
        { tag: 'The Pilgrimage', title: 'The Island Procession', text: `<p class='myth-text'>Her living myth is the Dajia Māzú pilgrimage: each year her statue walks 340 kilometers around Taiwan for nine days, and a million people walk with it — touch the palanquin, kneel as it passes, weep when it returns home. The largest annual religious procession in the Chinese world is not to a cathedral but after a fisherman\'s daughter, walking the roads she still guards.</p>` },
      ],
    },
    syncretism: `<p>She absorbs the coast's other sea-powers: associated with Guānyīn (who is sometimes her patron in the legends), honored in Daoist and Buddhist temples alike, and worshipped as Tin Hau in Hong Kong and A-Ma in Macau — whose very name, some say, comes from her ("A-Ma-Gau," Bay of A-Ma). The diaspora carried her to every Chinese port from San Francisco to Sydney: wherever junks and container ships anchor, her shrine overlooks the harbor.</p>`,
    culturalLegacy: `<p>Her temples number in the thousands — over 1,500 in Taiwan alone; her birthday (23rd of the 3rd lunar month) shuts down the island's coasts; her Dajia procession is a national institution watched by millions more online. Fishermen, sailors, the navy, and migrants all claim her: the goddess who was once a girl watching the sea is now the sea's own government, elected annually by the crowds who walk behind her statue.</p>`,
    archaeology: `The Meizhou Ancestral Temple on her home island — rebuilt repeatedly from the Song original, crowded with imperial plaques — is her Nazareth; the Dajia Jenn Lann Temple and Taipei's grand Tianhou temples are her living capitals. Macau\'s A-Ma Temple (15th c., older than the Portuguese) marks her oldest colonial-era shore, and the Mazu statues of the Taiwan Strait's temples document eight centuries of her iconography.`,
    extendedMeditation: `<p>Māzǔ is the goddess of being watched for. Not of the sea — of the people on it: the daughter who never stopped standing on the shore. She asks the question every sailor, parent, and lighthouse-keeper knows: who is watching the water for you — and for whom, tonight, are you the lantern?</p>`,
    sources: [{ name: 'Chinese folk religion' }, { name: 'Chinese folklore' }, { name: 'Birrell' }, { name: 'Chinese Buddhist texts' }, { name: 'Cambridge' }, { name: 'Oxford' }],
  },

  kartikeya: {
    pronunciationNote:
      'Sanskrit kārtikeya — IAST, with the long ā and the e unmarked (e and o are inherently long in Sanskrit and IAST never macrons them). The restoration Kārttikeya is the correct IAST form; Kārttikēya is a hypercorrection that mistakes the ISO 15919 convention for IAST.',
    domains: {
      title: 'The Commander of the Gods',
      subtitle: 'War, Youth, the Spear, and the Six-Faced One',
      lead: `<p class='lead-text'>Kārttikeya is India's god of war at his most beautiful: the six-faced son of Śiva, raised by six star-mothers, who took the spear at seven days old and destroyed the demon no god could touch — and who rides his peacock still through the temples of two nations that call him their own.</p>`,
      cards: [
        { iconPath: ICONS.bolt, name: 'The Vel', desc: 'His spear — the lance of victory over the unconquerable.' },
        { iconPath: ICONS.star, name: 'The Six Mothers', desc: 'The Kṛttikās — the Pleiades who nursed him, giving him his name.' },
        { iconPath: ICONS.flame, name: 'Six Faces', desc: 'Ṣaṇmukha: the six-faced god who sees every direction at once.' },
        { iconPath: ICONS.swan, name: 'The Peacock', desc: 'His mount — the war-bird whose dance is also a weapon.' },
      ],
    },
    symbols: [
      { name: 'The vel (spear)', meaning: 'Focused force — the weapon that ends what the gods could not' },
      { name: 'The six faces', meaning: 'Total sight — the commander who misses nothing' },
      { name: 'The peacock', meaning: 'Pride harnessed to war — beauty as battle-standard' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Kārttikeya's myths are the war-god's perfect résumé: born for one battle, victorious in seven days, and never outgrown by the cult that made him its own.</p>`,
      myths: [
        { tag: 'The Birth', title: 'The Son of Fire and Stars', text: `<p class='myth-text'>The gods, unable to face the demon Tāraka, needed Śiva's son — but Śiva would not marry. From the fire of his third eye the seed fell through Agni and the Gaṅgā to the reeds, where the six Kṛttikā stars (the Pleiades) found and nursed the child. Born of flame, carried by water, raised by stars: the war-god's lineage is the elements themselves conspiring against the demon.</p>` },
        { tag: 'The Battle', title: 'Seven Days Old, Commander of the Gods', text: `<p class='myth-text'>The Mahābhārata and the Purāṇas race the clock: appointed commander (senāpati) of the gods' armies as a week-old child, given the spear (vel) by his mother, Kārttikeya led the assault on Tāraka\'s fortress and killed the demon who had bullied heaven for a thousand years. The war the adults could not win, the infant finished — the tradition's proof that force without freshness is only habit.</p>` },
        { tag: 'The Cult', title: 'South to Murugan', text: `<p class='myth-text'>His second great myth is his own migration: southward into Tamil country he became Murugan, "the Beautiful," the beloved of the Tamil people — god of the hills, of love as well as war, married to the tribal girl Vaḷḷi and the cultivated Devayānai. The Sanskrit war-god and the Tamil hill-god are one: the commander who conquered a whole second civilization without drawing the spear.</p>` },
        { tag: 'The Festival', title: 'Thaipusam', text: `<p class='myth-text'>His living myth is the most extreme devotion in Hinduism: at Thaipusam, millions of his devotees carry milk-pots, pull chariots with hooks in their skin, and pierce cheeks and tongues with small spears (vel) — the body offered to match the god's own gift. From Palani to Batu Caves in Malaysia, the war-god's festival is among the largest religious gatherings on earth.</p>` },
      ],
    },
    syncretism: `<p>His Tamil identity (Murugan) is the subcontinent's great syncretic achievement: a Sanskrit god fully naturalized in Dravidian soil, then exported with Tamil migration — to Sri Lanka (Kataragama, shared with Buddhists and Muslims), Malaysia, Singapore, Mauritius, South Africa, and Fiji. The Kataragama shrine\'s multifaith pilgrimage — Hindu, Buddhist, Muslim, and Vedda devotees at one altar — is his unique achievement among Hindu gods: the commander of everyone's armies.</p>`,
    culturalLegacy: `<p>"Murugan" is the most-loved male deity of Tamil Nadu; his six Palani hill-temples are among India's busiest; Thaipusam at Batu Caves draws a million-plus annually. His vel decorates everything from Tamil school emblems to the Sri Lankan Kataragama flag. The war-god who was born in a week is also the one who never grew old — the eternal youth of two civilizations, still riding the peacock.</p>`,
    archaeology: `His iconography is fixed from the Kushan period (the six-headed Shanmukha coins of the Yaudheyas, 2nd c. BCE–1st c. CE) — among the oldest datable god-images in India. The Palani temples of Tamil Nadu, the Kataragama complex in Sri Lanka, and Malaysia's Batu Caves (272 steps, the world's tallest Murugan statue at 42.7 m) map his living empire. The Yaudheya republic's Shanmukha coinage proves his cult is older than most of the pantheon's temples.`,
    extendedMeditation: `<p>Kārttikeya is the god of arriving exactly as needed. Six mothers, one spear, seven days: nothing in his story wastes a moment. He asks the commander's question, which is also every late-starter\'s and every young team's: what are you waiting to grow up for — and what would you take on, if you knew you were already enough?</p>`,
    sources: [{ name: 'Mahabharata' }, { name: 'Puranas' }, { name: 'Monier-Williams' }, { name: 'MW' }, { name: 'Cambridge' }, { name: 'Oxford' }],
  },
};
