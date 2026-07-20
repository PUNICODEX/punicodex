/**
 * Lore enrichment, batch E — Sarasvatī and Sītā (the 20-07-26 second wave).
 * Same conventions as enrich-a..d; merged by apply-enrich-e.js.
 */

const ICONS = {
  lotus: 'M32 46C26 38 26 26 32 16C38 26 38 38 32 46ZM19 42C17 32 21 23 28 18M45 42C47 32 43 23 36 18M32 46V56',
  wave: 'M8 24C16 16 24 16 32 24C40 32 48 32 56 24M8 40C16 32 24 32 32 40C40 48 48 48 56 40',
  lyre: 'M22 10C18 24 18 36 24 44C28 50 36 50 40 44C46 36 46 24 42 10M22 10H26M38 10H42M28 18V40M36 18V40M26 44H38',
  scroll: 'M16 10H44V44C44 50 40 54 34 54H16V10ZM16 10C12 10 10 13 10 17C10 21 12 23 16 23M24 20H40M24 28H40M24 36H36',
  flame: 'M32 8C28 20 20 26 20 38C20 48 25 56 32 56C39 56 44 48 44 38C44 26 36 20 32 8Z',
  star: 'M32 8L38 26L56 26L41 37L46 55L32 44L18 55L23 37L8 26L26 26Z',
  swan: 'M12 40C18 30 28 26 38 28C34 24 34 18 38 14C42 10 48 10 52 14C48 16 46 20 48 24C52 30 50 38 44 42C34 50 20 48 12 40Z',
  stone: 'M16 48C16 30 22 16 32 12C42 16 48 30 48 48L38 44L32 52L26 44L16 48Z',
  scale: 'M32 10V54M14 20H50M18 20L12 36H24L18 20ZM46 20L40 36H52L46 20ZM24 54H40',
  knot: 'M20 20C12 20 8 26 8 32C8 38 12 44 20 44C28 44 36 20 44 20C52 20 56 26 56 32C56 38 52 44 44 44C36 44 28 20 20 20Z',
};

module.exports = {
  saraswati: {
    pronunciationNote:
      'Sanskrit sarasvatī carries three long vowels; the restoration Sarasvatī keeps all three macrons. The v of IAST is the labiodental व, which Hindi pronunciation softens toward w — hence the double life of the name as "Saraswati" in speech and "Sarasvatī" in scholarship. The IAST form is the owned one: the standard of the libraries she governs.',
    domains: {
      title: 'The River of Eloquence',
      subtitle: 'Speech, Learning, Music, and the Flowing Word',
      lead: `<p class='lead-text'>Sarasvatī is the only goddess the Ṛgveda hymns as both river and word: the mightiest stream of the Vedic heartland, and Vāk, Speech itself — the current on which all knowledge, music, and scripture flows. Where she moves, rivers run and verses sing.</p>`,
      cards: [
        { iconPath: ICONS.wave, name: 'The Lost River', desc: 'The Vedic Sarasvatī — greater than the Indus, the hymns say — whose vanishing shaped a civilization\'s memory.' },
        { iconPath: ICONS.lyre, name: 'The Vīṇā', desc: 'Her instrument: the stringed lute whose seven notes order all music, as her speech orders all thought.' },
        { iconPath: ICONS.swan, name: 'The Haṃsa', desc: 'The swan that separates milk from water — the emblem of discernment, learning\'s first virtue.' },
        { iconPath: ICONS.scroll, name: 'Vāk', desc: 'Speech personified: the Ṛgveda\'s own word for the goddess of the word, hymn 10.125.' },
      ],
    },
    symbols: [
      { name: 'The white lotus', meaning: 'Purity of mind; knowledge unsullied by the muddy water it rises from' },
      { name: 'The vīṇā', meaning: 'Music as cosmic order — Nāda Brahman, the sound that is the absolute' },
      { name: 'The haṃsa (swan)', meaning: 'Viveka, discernment — the power to take the true and leave the rest' },
      { name: 'The palm-leaf book', meaning: 'The written word she guards as goddess of libraries and letters' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Sarasvatī's double biography — river first, word second — is the oldest story of how a landscape becomes a mind.</p>`,
      myths: [
        { tag: 'The River', title: 'Mightiest of Streams', text: `<p class='myth-text'>The Ṛgveda hymns her as a river "surpassing all others in might": pure in her course from the mountains to the sea, mother of waters, destroyer of the Pārāvata foes. The Nadīstuti ("hymn to the rivers") names her between the Yamunā and the Śutudrī — the heartland stream of the Vedic people, invoked for wealth, descendants, and wisdom in one breath.</p>` },
        { tag: 'The Word', title: 'Vāk Speaks', text: `<p class='myth-text'>Ṛgveda 10.125 is her own voice: "I move with the Rudras, the Vasus, the Ādityas; I uphold Mitra and Varuṇa, Indra and Agni, the twin Aśvins. I am the queen, the gatherer of riches, the knowing — the gods established me in many places." Speech crowns herself supreme: every hymn ever sung is, by her account, her body.</p>` },
        { tag: 'The Consort', title: 'Brahmā\'s Share', text: `<p class='myth-text'>Later tradition makes her Brahmā's daughter-consort — the power by which the creator speaks the world into being. When Brahmā's heads recited the Vedas, Sarasvatī was their voice; when he created, she was his śakti, the energy of formation. The iconography settles into its final form: white-robed, vīṇā in hand, book and prayer-beads, riding the discerning swan.</p>` },
        { tag: 'The Vanishing', title: 'The River Goes Underground', text: `<p class='myth-text'>The Mahābhārata already knows a diminished Sarasvatī: she "loses herself" in the desert, appearing and vanishing at named fords — Vinaśana, "the place of disappearance." Later hydrography reads the myth as memory: the great river dried as its tributaries were captured by the Indus and the Ganges systems, leaving the Ghaggar-Hakra channels the Thar swallowed. The word outlived the water.</p>` },
      ],
    },
    syncretism: `<p>Her eastward journey is one of Asia's great religious migrations: as **Benzaiten** in Japan she became one of the Seven Gods of Fortune, goddess of music, water, and wealth, with island shrines at Enoshima and Chikubushima; in Tibet she is Yangchenma, "goddess of melody"; in Bali she is the island's tutelary of learning, with her own festival, Saraswati Day. Burmese and Thai traditions keep her as Thurathadi and Suratsawadi. The Buddhist Prajñāpāramitā literature absorbed her into the perfection-of-wisdom lineage — the river of speech becoming the ocean of insight.</p>`,
    culturalLegacy: `<p>She is the most actively worshipped scholar-deity on earth: Basant Panchami each spring sees hundreds of millions in yellow dress honor her with books, instruments, and the first letters children ever write (vidyā-ārambha, the "beginning of learning" ceremony). Her name brands India's largest chain of schools (Vidya Bharati), universities, and the national digital library's heritage portal. The lost river named for her drives modern archaeology and politics alike: the "Sarasvati River" debate over the Ghaggar-Hakra paleochannels is India's most contested meeting of hymn and hydrology.</p>`,
    archaeology: `The Ghaggar-Hakra dry channels between the Yamunā and the Indus — traced by satellite (Landsat imagery of buried paleochannels) and drilled by the Geological Survey of India — are the standard candidates for the Vedic river; Harappan sites (Kalibangan, Banawali) line their banks in densities the Indus itself cannot match. Her temples are comparatively few for so great a goddess — the Sharada Peeth in Kashmir (now across the LoC), Sringeri's Sharadamba, Basara's Gnana Saraswati in Telangana, and Pushkar's shrine — because her true temple has always been the school and the library.`,
    extendedMeditation: `<p>Sarasvatī is the proof that attention is a kind of water: it flows, it gathers, it carves channels in the mind that outlast the floods that made them. The river dried and the goddess did not — the word learned to flow without banks. She asks the student's oldest question: not what do you know, but what current carries it — and where, in the dry season of distraction, will you dig for the buried stream?</p>`,
    sources: [{ name: 'Rigveda' }, { name: 'Monier-Williams' }, { name: 'Mahabharata' }, { name: 'Puranas' }, { name: 'MW' }, { name: 'Macdonell' }, { name: 'Cambridge' }],
  },

  sita: {
    pronunciationNote:
      'Sanskrit sītā carries two long vowels; the restoration Sītā keeps both macrons. Her name means "furrow" — the plough-line of the field from which she rose — making hers the rare theonym that is a farm word before it is a goddess, and the two macrons are the whole of its written dignity.',
    domains: {
      title: 'The Daughter of the Furrow',
      subtitle: 'Devotion, Exile, Trial, and the Opened Earth',
      lead: `<p class='lead-text'>Sītā is the epic of India told from its quiet center: the furrow-born princess whose abduction sets the Rāmāyaṇa in motion, whose fidelity survives fire, and whose final return is not to her husband but to the earth that bore her. She is virtue tested past every reasonable limit — and found whole.</p>`,
      cards: [
        { iconPath: ICONS.stone, name: 'The Furrow', desc: 'King Janaka found her in the plough-line of a sacrificial field — the earth\'s own child, named for the cut in the soil.' },
        { iconPath: ICONS.flame, name: 'The Fire', desc: 'The agni-parīkṣā: the trial by fire she walked into to prove what everyone watching already knew.' },
        { iconPath: ICONS.wave, name: 'The Exile', desc: 'Fourteen years in the forest, the abduction to Laṅkā, the second exile while pregnant — endurance as biography.' },
        { iconPath: ICONS.scale, name: 'The Return', desc: 'Her answer to the second doubt: the earth opens, and the daughter of the furrow goes home.' },
      ],
    },
    symbols: [
      { name: 'The furrow', meaning: 'Her name and origin: the ploughed line — fertility, labor, and the earth\'s patience' },
      { name: 'The golden deer', meaning: 'The lure that crossed her threshold — desire engineered as trap' },
      { name: 'The fire', meaning: 'Proof demanded of the innocent; the trial that should never have been asked' },
      { name: 'The lotus', meaning: 'Her purity in every depiction from temple bronze to Madhubani painting' },
    ],
    mythology: {
      lead: `<p class='lead-text'>The Rāmāyaṇa calls itself Rāma's story, but its moral engine is Sītā: every choice that matters is measured against her.</p>`,
      myths: [
        { tag: 'The Birth', title: 'Daughter of the Field', text: `<p class='myth-text'>King Janaka of Mithilā, ploughing a sacrificial field, struck something that was not stone: an infant in the furrow, whom he named Sītā — "furrow" — and raised as his daughter. Earth-born, not womb-born, the texts insist: her mother is the field itself, and the Rāmāyaṇa's most beloved heroine begins as a gift of agriculture. Her marriage to Rāma follows the bow of Śiva that only he could string.</p>` },
        { tag: 'The Abduction', title: 'The Golden Deer', text: `<p class='myth-text'>In the forest of Daṇḍaka, during the fourteen-year exile, the demon Mārīca became a golden deer to draw Rāma from her side, and Rāvaṇa came as a wandering ascetic. She crossed the line — the lakṣmaṇa-rekhā drawn for her protection — only to give alms, and was carried through the sky to Laṅkā. A year in the Aśoka grove, under guard, refusing a king: the epic's center of gravity is her refusal.</p>` },
        { tag: 'The Fire', title: 'Agni-Parīkṣā', text: `<p class='myth-text'>Rescued after the war, she was met not with embrace but with doubt, publicly, before the armies. Sītā's answer was the fire: she walked into the flames, and Agni himself bore her out unburned, declaring her purity to the three worlds. The Rāmāyaṇa's hardest scene is also its most debated — every generation of India has argued whether the test was justice or injury, and the arguing is the point.</p>` },
        { tag: 'The Return', title: 'The Earth Opens', text: `<p class='myth-text'>Years later, crowned and pregnant, she was exiled again on a rumor — and raised her twin sons in Vālmīki's hermitage. When Rāma finally came for her and asked one more public proof, she asked the earth instead: "If I have been faithful, open for me." The ground split, a golden throne rose, and the daughter of the furrow descended into the earth that bore her — the epic's most devastating line, and its most quoted.</p>` },
      ],
    },
    syncretism: `<p>Across Asia she travels with the epic: Thailand's **Sida** in the Ramakien, Cambodia's and Laos' Reamker versions, Indonesia's Kakawin Rāmāyaṇa, and the Jain tellings that soften the fire. In Nepal she is Janaki, daughter of Janakpur — the nation claims her birthplace and keeps her festival. The bhakti traditions make her inseparable from Rāma (Sītā-Rāma as one object of worship), and the Śākta readings make her the goddess herself in human trial: the earth-goddess borrowing a biography.</p>`,
    culturalLegacy: `<p>Sītā is the standard by which Indian womanhood has been both honored and constrained — the "Sītā ideal" of fidelity and endurance, and the modern feminist re-reading that asks why the proving was hers to do. Her festivals (Sītānavamī, Vivāha Panchamī at Janakpur) draw millions; the Madhubani painting tradition of her Mithilā homeland depicts her in every home; Bollywood and television return to her constantly. Every debate on dignity, loyalty, and who owes whom proof in India runs, sooner or later, through the furrow.</p>`,
    archaeology: `Janakpur in Nepal's Terai keeps her city: the Janaki Mandir (1911, on older foundations) marks the site tradition calls her birthplace-home, and the Ram-Janaki Vivāha festival re-enacts the wedding annually. Mithilā's painted tradition (Madhubani/Maithil art, from the kohbar wedding-chamber murals) is among the world's oldest continuously practiced narrative arts. The Rāmāyaṇa sites across India and Sri Lanka — the Aśoka Vatika candidates near Nuwara Eliya, the Sītā Amman temple there — form the epic's living pilgrimage map.`,
    extendedMeditation: `<p>Sītā's story is the oldest case study in the difference between being good and being believed. She is proven right every time — by fire, by gods, by the earth itself — and the proving never stops being demanded. Her final answer is the only one that ends the asking: not another proof, but a refusal to be measured again. The furrow closes over her, and the field goes on feeding everyone — which is what the earth, all along, was trying to say.</p>`,
    sources: [{ name: 'Ramayana' }, { name: 'Monier-Williams' }, { name: 'Puranas' }, { name: 'MW' }, { name: 'Cambridge' }, { name: 'Oxford' }],
  },
};
