#!/usr/bin/env node
/**
 * Lore-catalog merge — Sanskrit batch 2 (ascii-restoration 2026-11).
 * Idempotent: existing non-empty entries are NEVER overwritten.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LORE_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(LORE_PATH, 'utf8'));

const ENTRIES = {
  kubera: {
    pronunciation: {
      ipa: '/kuːˈbɛrə/',
      ipaLabel: 'Sanskrit (IAST: Kubera)',
      phonemes: [
        { symbol: 'Ku-', desc: 'Short u as in “put”; k sharp and unaspirated.' },
        { symbol: '-be-ra', desc: 'The e is long āy-like “ay” in careful speech: Ku-BAAIR-uh. The name is of uncertain root.' },
      ],
      approximation: '“koo-BAIR-uh”',
      kin: 'Vedic Vaiśravaṇa · Buddhist Jambhala · yakṣa-lord',
      note: 'He began as chief of the evil spirits of darkness and ended as the Hindu god of riches.',
    },
    domains: {
      title: 'God of Riches, the Northern Quarter',
      subtitle: 'Lord of the Yakṣas, Guardian of the World’s Treasure',
      lead: "<p class='lead-text'><strong>Kubera</strong> is the Hindu god of wealth and its lordly guardian: king of the yakṣas, the treasure-keeping spirits of the earth, regent of the north, and keeper of the nine treasures. From a Vedic chief of demons he rose — through Śiva’s favour and epic patronage — to the dignified treasurer of the gods, fat, jewelled, and mounted on his great white guardian-lion or his human-mule.</p>",
      cards: [
        { name: 'Lord of the North', desc: 'One of the four lokapālas, regents of the directions; his quarter is the north, seat of wealth.', iconPath: 'M32 8V56M32 8L44 18M32 8L20 18M32 56L24 48M32 56L40 48M12 32H20M44 32H52' },
        { name: 'King of the Yakṣas', desc: 'The treasure-spirits of earth serve him; his capital, Alakā, gleams on Mount Kailāsa’s flank.', iconPath: 'M18 40C18 28 26 20 34 22C42 24 46 32 42 40C38 48 26 50 20 44M30 28L28 20M38 32L42 24M24 36L14 32' },
        { name: 'The Nine Treasures', desc: 'Nidhi, the nine jewels of kingship, lie in his keeping — each a named power of abundance.', iconPath: 'M32 12L44 24V48H20V24ZM32 12V48M24 32H40M24 40H40M16 48H48' },
        { name: 'The Money-Pot', desc: 'His mongoose ejects jewels from its mouth in Buddhist form; his belly is the vault he guards.', iconPath: 'M20 28C28 22 40 24 44 32C48 40 42 48 32 48C22 48 16 40 20 28ZM28 34L34 40M36 32L30 38M32 48V56' },
      ],
    },
    mythology: {
      lead: "<p class='lead-text'>Kubera’s mythology is a success story: the demon-chief who became a god. The Veda knows him only as Vaiśravaṇa, the powerful one of the dark; the epics made him the friend of Rāma’s line, the builder of Laṅkā before Rāvaṇa took it, and the guardian whose aerial chariot Pushpaka still serves the righteous.</p>",
      myths: [
        { tag: 'Rāmāyaṇa', title: 'The Lord of Laṅkā Before Rāvaṇa', text: "<p class='myth-text'>Kubera built the golden city of Laṅkā on the world’s far shore, served by the yakṣas and filled with his hoard. His half-brother Rāvaṇa, through austerities and violence, took the city and the flying chariot Pushpaka from him; Kubera withdrew north to mount Gandhamādana, and Laṅkā passed to the demons — the great city’s golden age remembered as his.</p>" },
        { tag: 'Mahābhārata', title: 'The Aerial Car Pushpaka', text: "<p class='myth-text'>The epic’s greatest vehicle belonged to Kubera: the self-moving palace-car Pushpaka, won back from Rāvaṇa by Rāma and returned in the epic’s closing book to its maker’s friend. To ride Pushpaka is to command the wealth of the world from above — and Rāma, refusing it, set the moral: treasure serves, the righteous decline it.</p>" },
        { tag: 'Śiva Cycle', title: 'The Demon Who Won a God’s Favour', text: "<p class='myth-text'>The Purāṇas tell how Kubera, in an earlier cosmic round, performed austerities until Śiva granted him guardianship of the north and lordship of wealth. Some tellings begin him darker: a gluttonous yakṣa king whose eye was burnt by Paraśurāma’s glance — the scar that marks his images’ asymmetric face.</p>" },
        { tag: 'Buddhist Transformation', title: 'Jambhala, the Buddha’s Treasurer', text: "<p class='myth-text'>Buddhism adopted him outright as Jambhala — black or golden, eared with the mongoose that spits gems, seated on a citron fruit. In this form he became the wealth-god of Tibetan and Himalayan Buddhism, his mantras recited in monasteries that formally renounce what he provides.</p>" },
      ],
    },
    syncretism: "Kubera is Vaiśravaṇa in Buddhist lands, Jambhala in Tibet, and the model of every treasurer-god from the yakṣa-cults to the Japanese Bishamonten — the same northern regent under three names. The Greeks heard Plutus in him; the comparatists hear the Celtic Dagda’s cauldron in his inexhaustible pot.",
    culturalLegacy: "Every Indian shopkeeper’s ‘Kubera’s pot’ and every temple’s treasure-vault under his image keep his cult domestic and current. His name entered the vocabulary of plenty across Southeast Asia — the Khmer temples guard their riches under his northern gaze — and Jambhala thangkas remain among Tibetan art’s most beloved subjects.",
    extendedMeditation: "Kubera: the name of the world’s oldest treasurer, restored in the plain letters every ledger in history has used to count what he guards. Wealth needs no diacritics; it needs a vault, a guard, and a name — all three are here.",
    sources: [
      { name: 'Rāmāyaṇa, Uttara Kāṇḍa (Laṅkā’s golden age)' },
      { name: 'Mahābhārata (the Pushpaka car)' },
      { name: 'Śiva and Skanda Purāṇas (the northern guardianship)' },
      { name: 'Jambhala sādhanas (Tibetan Buddhist ritual texts)' },
    ],
    archaeology: "Kubera’s images ride the northern walls of every medieval Hindu temple as lokapāla; the Ajanta and Ellora caves give him early monumental form. In Nepal and Tibet his Jambhala bronzes are among the most produced ritual objects of the last millennium.",
    cult: "Merchants keep his pot; temples install him as vault-guardian; the Dipāvali season invokes him alongside Lakṣmī. His Buddhist cult is a regular monastery ritual — the Jambhala sādhana performed for the community’s material needs.",
    iconography: "Pot-bellied, bejewelled, with a money-bag and the mongoose; riding the mule-eyed man or the lion; in Buddhist form black or golden, holding the citron and the gem-spitting mongoose. His face is often asymmetric — the burned eye of the Paraśurāma legend.",
    reception: "Comparative religion lists him with Plutus and the Dagda as the fat treasurer-god type; Buddhist studies know him as the great example of a Hindu deity absorbed whole into the dharma. In modern India, ‘Kubera’ is simply the word for a very rich man.",
  },

  skanda: {
    pronunciation: {
      ipa: '/ˈskʌndə/',
      ipaLabel: 'Sanskrit (IAST: Skanda)',
      phonemes: [
        { symbol: 'Skan-', desc: 'The cluster sk is preserved; short a as in “cup”.' },
        { symbol: '-da', desc: 'The name means “the Attacker”, “the Leaper” — a war-name, not a birth-name.' },
      ],
      approximation: '“SKUN-duh”',
      kin: 'Kārttikeya · Murugan · Subrahmaṇya · Kumāra (all the same god)',
      note: 'One god, six names per tradition — born of six sparks from the gods’ outraged eyes.',
    },
    domains: {
      title: 'God of War, the Divine Hosts',
      subtitle: 'The Six-Headed General of the Gods’ Army',
      lead: "<p class='lead-text'><strong>Skanda</strong> is the Hindu war-god: the ever-youthful general of the devas’ hosts, born from the combined fire of Śiva’s third eye to destroy the demon Tāraka. Tamil India knows him as Murugan, the eternally beautiful mountain lord of the six abodes; the Sanskrit world as Kārttikeya, son of the Pleiades’ fosterage.</p>",
      cards: [
        { name: 'The Divine General', desc: 'Commander of the gods’ armies — the deva-senāpati — before whom no asura line holds.', iconPath: 'M32 8V56M32 12L52 24M32 12L12 24M32 36H52M32 36H12M18 44H46' },
        { name: 'Born of the Third Eye', desc: 'Six sparks from the gods’ wrath-eyes, fostered by the Kṛttikā — the Pleiades — as six infants, fused into one.', iconPath: 'M16 28C16 20 22 14 28 16C34 18 36 26 32 32M34 28C34 20 40 14 46 16C52 18 54 26 50 32M24 40C24 32 30 26 36 28C42 30 44 38 40 44' },
        { name: 'The Spear', desc: 'Śakti, the lance his mother Umā gave him — one throw ended Tāraka, the boon-armed demon.', iconPath: 'M14 54L46 18M46 18L42 20M46 18L44 24M14 54L10 50M14 54L18 56M40 28L52 36M36 32L28 24' },
        { name: 'Lord of the Six Abodes', desc: 'Murugan’s six mountain shrines from Tirupparankunram to Palani mark his Tamil country.', iconPath: 'M12 48L24 24L32 40L40 16L52 48M8 48H56M40 16L36 22M24 24L20 30' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>The Skanda myth is the war-god’s birth-saga: the gods, unable to defeat Tāraka, whose boon made him unkillable except by a son of Śiva, contrived the god’s marriage to Pārvatī; the child was born as fire from the third eye, fostered by the Pleiades, and general of heaven before he was a week old. The Tamil Murugan traditions add the wooing of Vaḷḷi, the huntress, and the gnostic doctrine of the <em>Arupadaiveedu</em>, the six stations of grace.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Kumāra Cycle', title: 'The Birth of Fire', text: "<p class='myth-text'>When Agni and the river Ganges could not carry the god’s seed, they left it in the reeds of the Gangā’s bank; six infants were found there by the six Kṛttikā nymphs, each nursing one — until Pārvatī gathered them into a single six-headed child. His first week closed with the death of Tāraka, slain by the spear his mother gave him.</p>" },
        { tag: 'Skanda Purāṇa', title: 'The Deva-Senāpati', text: "<p class='myth-text'>The great Purāṇa bearing his name makes him general of the gods’ hosts and husband of Devasenā — ‘the army of the gods’ — a marriage arranged before his birth. His camp is on the world’s margin; his peacock mount, the demon Siṃhakeśin subdued, struts beneath his banner.</p>" },
        { tag: 'Murugan Cycle', title: 'Vaḷḷi and Teyvāyāṉai', text: "<p class='myth-text'>The Tamil epics tell how Murugan wooed the huntress Vaḷḷi in the guise of a tree-shade, and wed both her and Teyvāyāṉai, Indra’s daughter, in the great marriage at Tiruchendur. The legend’s two wives read theologically: divine grace (Teyvāyāṉai) and the soul’s own effort (Vaḷḷi) are both needed for union with the lord.</p>" },
        { tag: 'Subrahmaṇya Cycle', title: 'The Sage-Child', text: "<p class='myth-text'>As Subrahmaṇya — ‘the dear one to the Brahmins’ — he is the teacher-god, expounding the Vedas to his own father Śiva in the role of guru. The image flips the war-god into wisdom’s child, and fixes his southern temples as places of learning as much as of arms.</p>" },
      ],
    },
    syncretism: "Skanda is the great pan-Indian convergence: Vedic Rudra’s son, Tamil Murugan, Buddhist Kārttikeya of the north, and the Graha of the week’s Tuesday. The Greeks of the Northwest compared him to Ares and Mars; the Kushan coins show him as Skanda-Kumāra beside the Buddha. His peacock entered Christian art’s immortality symbolism by the strangest of roads.",
    culturalLegacy: "Murugan is Tamil country’s beloved god — the Kanda Ṣaṣṭhī festival at Tiruchendur draws millions, and the god’s hill-shrines anchor Tamil sacred geography. His six-headed infant image, the Kārttikeya of Gupta art, defined the war-god’s iconography for Asia; and the Ṣaṣṭhī vow is observed across the subcontinent by parents of sons.",
    extendedMeditation: "Skanda: the war-name that means ‘the one who attacks’. In plain letters it reads like what it is — a battle-cry reduced to a name. The Tamil country still shouts it in festival; the lexicon keeps it here, at rest, its spear laid across the threshold of the temple.",
    sources: [
      { name: 'Kumārasaṃbhava of Kālidāsa (the birth of the war-god)' },
      { name: 'Skanda Purāṇa (the senāpati theology)' },
      { name: 'Cilappatikāram & Tamil Murugan epics (Vaḷḷi cycle)' },
      { name: 'Kushan-period Skanda-Kumāra coinage' },
    ],
    archaeology: "The six abodes (Ārupadaiveṭṭu) of Tamil Nadu are his living monuments; Gupta and Kushan sculpture give him his classical six-headed infant form. The Batu Caves of Malaysia, a modern Murugan shrine of cathedral scale, extend his geography into the diaspora.",
    cult: "The Kanda Ṣaṣṭhī festival — his birth-week and the war’s anniversary — is among the largest gatherings in the Tamil world, closing with the ritual breaking of the fast. His hill-shrines are walked on foot as pilgrimage; the kavadi-bearers’ dance is his cult’s most visible modern rite.",
    iconography: "The beautiful youth, six heads arrayed as a peacock’s fan, the spear (vel) upright, riding the peacock whose spread tail is the god’s own flame; in Tamil images he stands alone with the vel, the weapon itself treated as the deity’s presence.",
    reception: "Comparative mythology pairs him with Ares, Mars, and the Chinese Erlang as the divine general; Tamil literature claims him as the grammar of Tamil devotion itself. The Batu Caves’ giant gold statue made him a global icon — the war-god who became a diaspora’s home.",
  },

  dharma: {
    pronunciation: {
      ipa: '/ˈdɑːrmə/',
      ipaLabel: 'Sanskrit (IAST: Dharma)',
      phonemes: [
        { symbol: 'Dhar-', desc: 'The dh is a voiced aspirate — “d” with breath; the a is long “ah”.' },
        { symbol: '-ma', desc: 'The word is the abstract noun from √dhṛ, “to hold, sustain” — that which holds the world up.' },
      ],
      approximation: '“DAHR-muh”',
      kin: 'Pāli Dhamma · Avestan daēnā (cognate family)',
      note: 'Not a god but a principle — personified as a god in the epics, whence this entry.',
    },
    domains: {
      title: 'That Which Holds: Law, Duty, and Righteousness',
      subtitle: 'The Moral Order Personified',
      lead: "<p class='lead-text'><strong>Dharma</strong> is the load-bearing word of Indian civilization: the law that holds the cosmos, the duty that holds the person, the order that holds society. From √dhṛ, ‘to sustain’, it names everything that keeps the world from sliding into chaos — and in the epics it walks as a person: the god of righteousness, father of Yudhiṣṭhira, who came down to test his own devotees.</p>",
      cards: [
        { name: 'The Load-Bearer', desc: 'The cosmos rests on dharma; the four feet of the bull of dharma mark the four ages of time.', iconPath: 'M16 40H48M20 40V24L32 16L44 24V40M28 40V32H36V40M12 48H52M32 16V8' },
        { name: 'Duty by Caste and Stage', desc: 'Svadharma — one’s own duty by birth and life-stage: the Bhagavadgītā’s central teaching.', iconPath: 'M32 8V56M32 8L48 16M32 8L16 16M32 24H46M32 24H18M32 40H44M32 40H20M32 52H40' },
        { name: 'The Cosmic Ages', desc: 'The four yugas are the four feet of the bull: four in the Kṛta age, one stumbling foot in ours.', iconPath: 'M14 40C14 28 24 20 32 20C40 20 50 28 50 40M18 40V48M28 40V50M36 40V50M46 40V48M12 44H52' },
        { name: 'The Tester of Men', desc: 'In the epics Dharma appears in disguise — a beggar, a dog, a crane — to test righteousness where it counts.', iconPath: 'M20 52C16 44 18 34 26 30C34 26 44 30 46 38C48 46 42 52 34 52M28 34L26 28M38 34L42 28M20 44L12 40' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Dharma’s mythology is the epics’ moral machinery: the god of righteousness fathers the eldest Pāṇḍava, tests his devotees in disguise, and — in the Nala story — teaches dice to a king as the instrument of ruin. He has no cult-image because he is what every cult-image stands for; yet the tradition gave him a family and a biography.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Mahābhārata', title: 'The Father of Yudhiṣṭhira', text: "<p class='myth-text'>When Pāṇḍu was cursed to die on his wedding night, his queens invoked the gods: Dharmarāja himself, the god of righteousness, fathered Yudhiṣṭhira on Kuntī. The eldest Pāṇḍava is thus dharma’s son — which is why the epic keeps asking whether righteousness itself can survive the dice-game and the war it forces.</p>" },
        { tag: 'Dharma-Upākhyāna', title: 'The Tests in Disguise', text: "<p class='myth-text'>The epic’s forest-books stage Dharma’s examinations: as a stork demanding why Yudhiṣṭhira would not abandon a fallen brother; as a Yakṣa whose riddles the king answers with the epic’s most quoted verses; as a dog who follows the Pāṇḍavas to heaven’s gate and is refused entry — until Yudhiṣṭhira refuses heaven without it. The dog was Dharma; the gate opens.</p>" },
        { tag: 'Nala Cycle', title: 'The God Who Taught Dice', text: "<p class='myth-text'>In the Nala episode, Kali — the demon of the Kali Yuga — begs Dharma for a means to enter the righteous king Nala; Dharma, inexplicably, teaches him dice. The story’s commentators wrestled for centuries with the god of righteousness arming the demon of strife: the standard resolution — even dharma’s permission is a test that righteousness must survive.</p>" },
        { tag: 'Purāṇic Personification', title: 'The Son of Brahmā', text: "<p class='myth-text'>The Purāṇas give Dharma genealogy: born of Brahmā’s breast as one of the mind-born sons, husband of Dhṛti and father of the personified virtues — Kāma (desire), Lobha (greed), Darpa (pride) and the rest. The abstraction’s family-tree is the Indian psyche’s map of its own forces.</p>" },
      ],
    },
    syncretism: "Dharma and the Buddha’s Dhamma share a word and a mission: the Buddha claimed the title Dharmarāja, king of the law, and made dharma’s wheel — the dharmacakra — his teaching’s emblem. The Zoroastrian daēnā and the Roman Fas are the comparison-points scholars cite; in India itself dharma absorbed every local law-code, from the Vedic ṛta to the medieval digests.",
    culturalLegacy: "The word is untranslatable and indispensable — every rendering (‘law’, ‘duty’, ‘religion’, ‘righteousness’) is a fraction. The four feet of dharma’s bull are India’s theory of history; the Bhagavadgītā’s ‘better one’s own dharma, though defective’ is among the most quoted ethical sentences on earth. India’s modern name for itself, ‘Hindu Dharma’, keeps the word at the nation’s centre.",
    extendedMeditation: "Dharma: the name of the thing that holds, restored in letters that hold nothing but carry everything. It needs no mark over its vowels — the word’s burden is its own diacritic, the weight of the worlds it has held for four thousand years.",
    sources: [
      { name: 'Mahābhārata (Dharma-Upākhyāna cycle)' },
      { name: 'Bhagavadgītā 3.35 (svadharma verse)' },
      { name: 'Nala episode, Vana Parvan' },
      { name: 'Purāṇic genealogies of the mind-born sons' },
    ],
    archaeology: "Dharma’s monuments are juridical: the edict-pillars of Aśoka, whose dhamma inscriptions are the oldest deciphered moral legislation on earth. His wheel crowns the Indian flag; his bull — the dharmavṛṣabha — kneels on the seal of the Republic.",
    cult: "No temple of Dharma stands alone, yet every temple is his: he is worshipped as Yudhiṣṭhira’s father and as the law itself at the Dharmaśāstra recitations. The Kurukshetra pilgrim circuit treats the epic’s battlefield as his sanctum.",
    iconography: "Rarely imaged; when personified, a grave king with the plough or the wheel, often with Yudhiṣṭhira beside him. His true icon is the bull’s four legs, the wheel’s eight spokes, the scales of the king’s court — the law’s geometry rather than its face.",
    reception: "Comparative law and religion use dharma as the test-case of an untranslatable that must be translated anyway; sociology of religion treats it as the most successful fusion of cosmic, social, and personal order ever devised. ‘Dharma’ entered English dictionaries as a loan-word — the surest sign a civilization’s key term refused to be carried.",
  },

  karma: {
    pronunciation: {
      ipa: '/ˈkɑːrmə/',
      ipaLabel: 'Sanskrit (IAST: Karma)',
      phonemes: [
        { symbol: 'Kar-', desc: 'From √kṛ, “to do, make”; the r is syllabic-flavoured, the a long “ah”.' },
        { symbol: '-ma', desc: 'The abstract noun: “action”, “deed” — and by extension, the law that deeds breed consequences.' },
      ],
      approximation: '“KAHR-muh”',
      kin: 'Pali Kamma · the law of moral causation across all Indian traditions',
      note: 'The word begins as a plain noun — “deed” — and becomes the engine of the universe.',
    },
    domains: {
      title: 'Deed, Action, the Law of Consequence',
      subtitle: 'The Engine of Moral Causation',
      lead: "<p class='lead-text'><strong>Karma</strong> is the law that no deed evaporates: every act plants its seed, and the harvest is the life — and lives — that follow. From a plain Vedic noun for “ritual action” it grew into the doctrine that drives Hindu, Buddhist, and Jain cosmology alike: the moral physics by which the universe keeps its books without a bookkeeper.</p>",
      cards: [
        { name: 'The Seed and the Fruit', desc: 'Every deed is a seed; the fruit may ripen in this life or a later one — but it ripens.', iconPath: 'M32 50C32 38 32 30 32 24M32 24C26 22 20 24 16 30C22 32 28 30 32 24ZM32 24C38 22 44 24 48 30C42 32 36 30 32 24ZM28 50H36M24 54H40' },
        { name: 'Action by Mind, Word, Deed', desc: 'Karma accrues by thought, speech, and body — the three doors of action the law watches.', iconPath: 'M32 8V24M32 16L20 12M32 16L44 12M20 32C20 26 26 22 32 22C38 22 44 26 44 32C44 38 38 42 32 42C26 42 20 38 20 32M32 42V56M26 50H38' },
        { name: 'The Burning Off', desc: 'Karma can be exhausted by experience — burned like a field of stubble — or bound by attachment like a new seed.', iconPath: 'M32 12C26 22 22 30 22 38C22 46 26 52 32 52C38 52 42 46 42 38C42 30 38 22 32 12ZM32 40V52' },
        { name: 'Liberation Beyond It', desc: 'Mokṣa, nirvāṇa: the states beyond karma’s reach — the doctrines’ common horizon.', iconPath: 'M12 32C18 20 28 14 32 14C36 14 46 20 52 32C46 44 36 50 32 50C28 50 18 44 12 32ZM32 26A6 6 0 1 0 32 38A6 6 0 1 0 32 26' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Karma has no biography because it outranks every biography: it is the rule all biographies obey. Its ‘mythology’ is the doctrine’s own history — from the Vedic ritual’s power to bind, through the Upaniṣads’ interiorization, to the great vehicles’ global export — and the countless stories, from Nala to Savitri, in which its arithmetic drives the plot.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Upaniṣadic Revolution', title: 'From Ritual to Moral Physics', text: "<p class='myth-text'>The Bṛhadāraṇyaka Upaniṣad relocates karma: no longer the ritual act alone but the intention behind every act — ‘one becomes good by good action, evil by evil action’. The ritual economy of the Brahmins became the moral economy of the universe, and no priest was needed to run it.</p>" },
        { tag: 'Buddhist Formulation', title: 'The Owner of the Deed', text: "<p class='myth-text'>The Buddha’s formula is the doctrine’s cleanest statement: beings are the owners of their deeds, the heirs of their deeds — nowhere else does the inheritance come from. Karma in Buddhism is intention (cetanā) itself; the deed’s fruit follows like the wheel follows the ox.</p>" },
        { tag: 'Savitri Cycle', title: 'The Story Where It Breaks', text: "<p class='myth-text'>The Mahābhārata’s Savitrī tale stages the doctrine’s limit-case: Satyavān’s life exhausted by karma’s count, Yama arrives on schedule — and the wife’s flawless speech wins the husband back. The epic never denies the law; it shows a love so exact in its dharma that the law’s own keeper must honour it.</p>" },
        { tag: 'Jain Mechanics', title: 'The Subtle Dust', text: "<p class='myth-text'>Jainism made karma physical: a subtle matter that clings to the soul like dust to a wet cloth, weighing it into rebirth. The doctrine’s imagery — the soul’s lightness restored by austerity until it rises like a flame released — is the most materialist eschatology India produced.</p>" },
      ],
    },
    syncretism: "Karma is the one doctrine shared by Hindu, Buddhist, and Jain without alteration of name — the subcontinent’s common physics. The West received it through theosophy and thence into the global vernacular, where ‘karma’ now means cosmic payback in any language; classical comparisons run to the Egyptian heart-weighing and the Greek Adrasteia.",
    culturalLegacy: "The word entered every major language as a loan — among the few Sanskrit terms to do so. It underwrites the theory of rebirth, the ethics of non-harm (the deed’s victim returns as one’s debtor), and the quietist strand of Indian political thought: the revolution you cannot make today, your karma will make eventually.",
    extendedMeditation: "Karma: the plainest noun in the batch — ‘deed’ — carrying the heaviest doctrine. Restored without marks, it reads as it acts: no ornament, no exemption, no appeal. The lexicon’s other names guard temples; this one guards the law the temples were built to honour.",
    sources: [
      { name: 'Bṛhadāraṇyaka Upaniṣad 3.2.13' },
      { name: 'Aṅguttara Nikāya 5.292 (deeds and intention)' },
      { name: 'Mahābhārata, Savitrī episode' },
      { name: 'Tattvārthasūtra of Umāsvāti (Jain mechanics)' },
    ],
    archaeology: "Karma leaves no temple — it is the reason temples leave merit. The stūpas’ circumambulation-paths, the ghāṭs’ staircases into the rivers, and the endless charity-inscriptions of Indian epigraphy are its monuments: every recorded gift is a seed on record.",
    cult: "Its liturgy is life itself: the gift, the vow, the fast, the pilgrimage — each a karma audited at once by the doer. The śrāddha for the dead transfers merit across the ledger; the daily recitation of the deed-formulae keeps the accounts current.",
    iconography: "The wheel is karma’s emblem — the wheel of becoming, bhavacakra, held by Yama in Tibetan paintings, its hub marked by the three poisons. The ox and the cart, the seed and the sprout, the hunter’s net: the doctrine’s imagery is agricultural, mechanical, forensic.",
    reception: "The doctrine entered Western thought through Schopenhauer — who called it the finest idea humanity had produced — and through theosophy into the modern vernacular, where it now functions as secularized justice. Religious studies treat it as the most successful moral-causal theory ever devised: private, precise, and impersonal as gravity.",
  },

  yoga: {
    pronunciation: {
      ipa: '/ˈjoʊɡə/',
      ipaLabel: 'Sanskrit (IAST: Yoga)',
      phonemes: [
        { symbol: 'Yo-', desc: 'From √yuj, “to yoke, join”; the o is long — the yoking of the self to the divine.' },
        { symbol: '-ga', desc: 'The abstract noun: the yoking itself — the discipline by which union is achieved.' },
      ],
      approximation: '“YOH-guh”',
      kin: 'Latin iugum, English “yoke” — the same Indo-European root',
      note: 'The word and English “yoke” are cousins: yoga is the yoke worn willingly.',
    },
    domains: {
      title: 'Union, the Yoking of Self to Divine',
      subtitle: 'The Discipline That Joins',
      lead: "<p class='lead-text'><strong>Yoga</strong> is the discipline of union: the yoking — the same root as English ‘yoke’ — of mind, breath, and self to the still point beneath them. Born in the ascetic experiments of the late Vedic age, codified by Patañjali’s sūtras, it is both one of the six orthodox schools of Indian philosophy and, in the Bhagavadgītā’s teaching, the art of every act done without attachment to its fruit.</p>",
      cards: [
        { name: 'The Eight Limbs', desc: 'Patañjali’s aṣṭāṅga: restraint, observance, posture, breath, withdrawal, focus, meditation, absorption.', iconPath: 'M16 52H48M20 52V40L32 30L44 40V52M32 30V18M24 18H40M32 18V8M28 12H36' },
        { name: 'Union of Rivers', text: '', desc: 'The yogin joins mind to breath to object as rivers join the sea — the Upaniṣadic image.', iconPath: 'M12 16C20 28 24 36 24 44C24 50 28 54 32 54C36 54 40 50 40 44C40 36 44 28 52 16M22 20L16 16M42 20L48 16M32 8V54' },
        { name: 'Yoga in the Gītā', desc: 'Skill in action: the yogin works without craving the fruit — karma-yoga as the path for the householder.', iconPath: 'M32 8V56M32 14L48 24M32 14L16 24M20 40H44M24 46H40M12 32H20M44 32H52' },
        { name: 'The Cessation of the Waves', desc: 'Patañjali’s definition: yogaś citta-vṛtti-nirodhaḥ — the stilling of thought’s waves, so the seer abides in itself.', iconPath: 'M8 28C16 24 24 24 32 28C40 32 48 32 56 28M8 40C16 36 24 36 32 40C40 44 48 44 56 40M10 32H54' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Yoga has no myths — it has sūtras, and the sūtras are their own literature of precision. Its ‘stories’ are the doctrine’s own history: the ascetics in the forests of the Upaniṣads, the Nātha-lineage’s wonder-working adepts, and the modern export that made a metaphysical discipline into the world’s most practised physical art.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Kaṭha Upaniṣad', title: 'The Chariot Simile', text: "<p class='myth-text'>The body the chariot, the senses the horses, the mind the reins, the intellect the driver, the rider the self: the Kaṭha Upaniṣad’s simile is the oldest complete map of the psychophysical discipline. Who holds the reins attains the end of the road — ‘the still place from which the wise do not return’.</p>" },
        { tag: 'Bhagavadgītā', title: 'The Yoga of Three Paths', text: "<p class='myth-text'>The Gītā democratizes the discipline: jñāna-yoga of knowledge for the philosopher, karma-yoga of selfless work for the householder, bhakti-yoga of devotion for the lover of god. ‘Yogasthaḥ kuru karmāṇi’ — established in yoga, act — is the verse on which Gandhi claimed to have fed his whole life.</p>" },
        { tag: 'Patañjali', title: 'The One Hundred Ninety-Five Sūtras', text: "<p class='myth-text'>Patañjali’s Yoga-sūtra — c. 195 aphorisms — systematized what had been experiment: the eight limbs, the afflictions, the meditative absorptions, the supernormal powers that are signs on the path and traps at its end. Commentators from Vyāsa to the present have kept it the living constitution of the discipline.</p>" },
        { tag: 'Nātha Lineage', title: 'The Immortal Teachers', text: "<p class='myth-text'>The medieval Nātha order gave yoga its adepts-legend: Matsyendra caught among the fishes, Gorakṣa the miracle-working founder, and later figures claimed to walk the centuries — the siddhas, perfected ones, whose bodies outlast death. Hatha-yoga’s physical canon comes from this line of embodied experimenters.</p>" },
      ],
    },
    syncretism: "Buddhism and Jainism adopted yoga wholesale — the Buddha’s dhyāna is Patañjali’s dhāraṇā by another name — while Sufi India found its own correspondences. The modern export reversed the flow: haṭha-yoga, stripped of metaphysics, returned to India from the West as physical culture before being re-spiritualized. The word is now claimed by three civilizations at once.",
    culturalLegacy: "Some two hundred million people practise asana today — the largest following of any discipline in the lexicon. ‘Yoga’ entered English as a loan-word a century ago and now needs no italics. The discipline’s texts stand, with the Upaniṣads and the Gītā, among the world’s most translated and most printed books.",
    extendedMeditation: "Yoga: the yoke that joins — and the word itself is joined, across four millennia and two language families, to ‘yoke’. Restored plainly, it demonstrates what the discipline teaches: the simplest form can carry the heaviest joining. Two syllables, one root, half the planet practising.",
    sources: [
      { name: 'Kaṭha Upaniṣad 1.3 (the chariot simile)' },
      { name: 'Bhagavadgītā 2.48 (yoga as skill in action)' },
      { name: 'Patañjali, Yoga-sūtra 1.2 and 2.29' },
      { name: 'Hatha-yoga-pradīpikā (medieval physical canon)' },
    ],
    archaeology: "The discipline leaves postures, not temples: the Mohenjo-daro seal of a figure in yogic seat (its identity debated), the Mathura images of śramaṇa ascetics, and the modern globe’s studios. The oldest ‘monument’ is the human body arranged to be still.",
    cult: "No priesthood — the practitioner is the officiant. The daily āsana and prāṇāyāma are the liturgy; the guru is the tradition’s single human institution. International Day of Yoga (June 21) is its largest annual congregation.",
    iconography: "The seated ascetic — Śiva as Yogīśvara, lord of yogis, on the Elephanta reliefs — is the discipline’s master-image: stillness arranged. The cakra-diagrams of the subtle body and the haṭha-yoga’s diagrams of the inner sun and moon are its anatomy.",
    reception: "The modern world received yoga twice: first as esoteric philosophy through theosophy, then as physical culture through the global āsana movement. Scholars debate what was lost and what survived; the practice itself — two hundred million daily acts of stillness — is the largest living answer the lexicon contains.",
  },

  aditi: {
    pronunciation: {
      ipa: '/əˈdiːti/',
      ipaLabel: 'Sanskrit (IAST: Aditi)',
      phonemes: [
        { symbol: 'A-', desc: 'The a is the shwa of “about” — the prefix of negation.' },
        { symbol: '-di-ti', desc: 'From a-diti: “un-bound”, “un-fettered” — the name is a definition.' },
      ],
      approximation: '“uh-DEE-tee”',
      kin: 'Mother of the Ādityas · Diti her fettered twin in name',
      note: 'Her name is a sentence: she is “Boundlessness” — and her sister Diti is the “bound” one.',
    },
    domains: {
      title: 'Boundlessness, Mother of the Ādityas',
      subtitle: 'The Unfettered Mother of the Solar Gods',
      lead: "<p class='lead-text'><strong>Aditi</strong> is the Vedic great mother: the unfettered one, mother of the Ādityas — the solar gods including Mitra, Varuna, and in later count the sun itself. She is space without walls, the cow who yields all plenty, the goddess invoked to loosen every knot that binds a person — sin, sickness, poverty, or a calf bound to its stake.</p>",
      cards: [
        { name: 'The Unbound', desc: 'Her name negates “fetter”: she is invoked against every bond — of disease, debt, guilt, or misfortune.', iconPath: 'M18 30C24 24 32 24 36 30C40 36 34 42 28 40M38 28C44 22 52 22 54 28C56 34 50 40 44 38M28 44C24 50 16 52 12 46M34 46C36 52 44 54 48 50' },
        { name: 'Mother of the Ādityas', desc: 'The solar gods — Mitra, Varuna, Aryaman, and the rest — are her sons, the adityas, “Aditi’s children”.', iconPath: 'M32 10C26 18 22 28 22 38C22 48 26 54 32 54C38 54 42 48 42 38C42 28 38 18 32 10ZM18 44H46M26 48L32 52L38 48' },
        { name: 'The Cosmic Cow', desc: 'As the Cow of Plenty she yields milk and freedom; to possess Aditi is to possess space itself.', iconPath: 'M16 38C16 26 26 18 36 20C46 22 50 32 46 40C42 48 30 50 22 44M34 24L32 14M42 30L48 22M20 42L12 44' },
        { name: 'Guardian of Freedom', desc: 'Her sphere is āditya-freedom: the wideness in which all beings move, breathe, and are pardoned.', iconPath: 'M12 32C18 20 28 14 32 14C36 14 46 20 52 32C46 44 36 50 32 50C28 50 18 44 12 32ZM32 24V40M24 32H40' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Aditi’s mythology is concentrated in the Veda’s earliest hymns: the mother of the gods whose womb is the sky, whose sons are the days of the year, and to whom the gods themselves owe their radiance. Later tradition reduced her to a genealogy — mother of Vishnu in one Purāṇic strand — but the hymns keep her cosmic: the boundlessness in which everything, including the gods, is contained.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Rigveda 1.89', title: 'The Prayer to Aditi', text: "<p class='myth-text'>The most famous Aditi-hymn is a prayer for release: ‘May Aditi by whom the gods’ realm is secured, who gives freedom, protect us… Aditi is the sky, Aditi the air, Aditi mother, father, son; Aditi all gods, all men, all that has been and shall be.’ The verse makes her the total container — the theonym for totality itself.</p>" },
        { tag: 'Rigveda 10.72', title: 'The Birth of the Gods', text: "<p class='myth-text'>The extraordinary theogony-hymn has the gods born of Aditi, and Aditi herself born of Dakṣa, while Dakṣa is born of Aditi — ‘the gods later than the creation’ the poet shrugs, admitting the mystery exceeds the scheme. Aditi here is older than genealogy: the matrix in which the generations turn.</p>" },
        { tag: 'Dawn & Freedom Cycle', title: 'Mother of the Days', text: "<p class='myth-text'>The Ādityas, her sons, are the months and the year — the solar measure. To be born under Aditi is to be born into time’s wideness; the Vedic householder’s morning prayer placed his day under her sons’ jurisdiction and his debts under her power to unbind.</p>" },
        { tag: 'Purāṇic Echo', title: 'Mother of the Dwarf', text: "<p class='myth-text'>In the Purāṇic revision of the Vāmana myth, Vishnu’s dwarf-incarnation is born to Aditi and Kaśyapa — the mother of boundlessness bearing the god who measures the three worlds in three steps. The pairing compresses her whole theology: from the unmeasured comes the measurer.</p>" },
      ],
    },
    syncretism: "Aditi is the Vedic prototype of every Hindu great-mother: the later Devī and Lakṣmī inherit her inexhaustibility, and her sons’ names seeded a dozen theophorics. The Avestan opposition of the daeva is absent — in Iran her son Mitra kept his worship as Mithra, while in India the Ādityas were absorbed into Vishnu’s solar theology. Comparative studies pair her with the Greek Eurynome and the Norse Skaði’s freedom-of-the-mountains.",
    culturalLegacy: "The Āditya-names (Mitra, Aryaman, Bhaga, Dakṣa) seeded the vocabulary of contract, fortune, and skill across the Indo-Iranian world; and the Rigvedic prayer to Aditi is still recited at Indian rites of passage as the formula of release from every bond. ‘Aditi’ survives as a girl’s name across the subcontinent — the boundless given to a daughter.",
    extendedMeditation: "Aditi: the name that means ‘no fetter’. Restored plainly, it is the lexicon’s argument for itself — that names are loosed, not lost, by translation into plain letters. She is the space in which this whole temple stands; the unfettered mother contains the domain.",
    sources: [
      { name: 'Rigveda 1.89 (the prayer to Aditi)' },
      { name: 'Rigveda 10.72 (the birth of the gods)' },
      { name: 'Rigveda 7.82 (Aditi and the solar cows)' },
      { name: 'Purāṇic Vāmana cycle (Aditi as Vishnu’s mother)' },
    ],
    archaeology: "No Aditi temples — her worship was the hymn itself. But the Āditya-lists structured the Vedic ritual’s year, and the solar hymns’ recitation-lists are her monument: a calendar of names kept in the Brahmins’ mouths for three millennia.",
    cult: "Her cult was the morning’s prayer: the Āditya-invocation that loosed the day’s bonds. The <em>Ādityahṛdaya</em> hymn, taught to Rāma in the Rāmāyaṇa before battle, is her tradition’s most famous practical liturgy — the solar mother invoked for victory and unfettered strength.",
    iconography: "Rarely imaged before modernity; the Veda’s image is enough — the cow of plenty, the sky as womb. Modern Indian art renders her as the blue infinite mother with the seven solar children at her feet.",
    reception: "Comparative mythology treats her as the archetype of the ‘unbound mother’ — the theonym that is a philosophical position. Vedic studies cite her 1.89 hymn as the earliest surviving statement of totality-as-goddess; and her name, in modern India, is a blessing parents pronounce daily without knowing they invoke the Rigveda’s oldest sky.",
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
