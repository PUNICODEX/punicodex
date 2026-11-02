#!/usr/bin/env node
/**
 * Lore-catalog merge — Sanskrit batch 3 (ascii-restoration 2026-11).
 * Idempotent: existing non-empty entries are NEVER overwritten.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LORE_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(LORE_PATH, 'utf8'));

const ENTRIES = {
  brahman: {
    pronunciation: {
      ipa: '/ˈbrɑːhmən/',
      ipaLabel: 'Sanskrit (IAST: Brahman)',
      phonemes: [
        { symbol: 'Brāh-', desc: 'The ā is long “ah”; the h following the m is aspirated breath — brah-, not bram-.' },
        { symbol: '-ma', desc: 'Short final vowel; the neuter noun names the absolute itself.' },
        { symbol: '-n', desc: 'Final n is lightly sounded; in the nominative the stem is brahma.' },
      ],
      approximation: '“BRAH-mun”',
      kin: [
        { label: 'Vedic', form: 'brahman — the sacred utterance, the formula' },
        { label: 'Later sense', form: 'the Absolute, the world-ground of the Upaniṣads' },
      ],
      note: 'The word rises through three meanings: the spoken verse, the ritual power, and finally the all — the history of Indian metaphysics in one noun.',
    },
    domains: {
      title: 'The Absolute, the World-Ground',
      subtitle: 'The Sacred Utterance That Became the All',
      lead: "<p class='lead-text'><strong>Brahman</strong> is the load-bearing concept of Indian thought: the absolute reality beneath gods, world, and self. The word begins as the Vedic priest’s formula — the verse whose correct utterance moves the cosmos — and ends as the Upaniṣads’ world-ground, that which speech cannot reach but without which no speech sounds. In the lexicon it stands for the principle personified: not a god among gods, but what the gods are made of.</p>",
      cards: [
        { name: 'The Utterance', desc: 'The Vedic brahman is the spoken formula — the verse whose pronunciation is ritual power.', iconPath: 'M16 28H48M20 28C20 22 26 18 32 18C38 18 44 22 44 28M32 28V44M24 36H40M26 44H38' },
        { name: 'The World-Ground', desc: 'In the Upaniṣads, brahman is the all: “from which words turn back, together with the mind, unable to reach it”.', iconPath: 'M32 8V56M32 8L48 16M32 8L16 16M12 32C18 22 26 16 32 16C38 16 46 22 52 32C46 42 38 48 32 48C26 48 18 42 12 32Z' },
        { name: 'Tat Tvam Asi', desc: '“That thou art”: the Chandogya’s equation of brahman and the self — the tradition’s most quoted sentence.', iconPath: 'M18 40C18 28 26 20 32 20C38 20 46 28 46 40M24 40C24 32 28 28 32 28C36 28 40 32 40 40M28 40C28 36 30 34 32 34C34 34 36 36 36 40' },
        { name: 'Not This, Not This', desc: 'Neti neti — the negative path: brahman defined by what it is not, since it is everything that is.', iconPath: 'M16 16L48 48M48 16L16 48M32 24V40M24 32H40' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Brahman has no myths — it is what myths are made of. Its ‘stories’ are the doctrine’s own ascent: the Vedic priest’s formula becoming the cosmic principle, the forest sages’ equation of the self with the all, and the grammarians’ discovery that the sacred syllable AUM is brahman compressed into sound.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Ṛgveda 10.129', title: 'The Creation Hymn', text: "<p class='myth-text'>The Nāsadīya sūkta contemplates the state before creation — ‘there was neither existence nor non-existence’ — and names the One that breathed without breath. The hymn refuses to say what that One is; the later tradition named it brahman, and built the Upaniṣadic quest on the hymn’s silence.</p>" },
        { tag: 'Taittirīya Upaniṣad', title: 'Brahman as Food', text: "<p class='myth-text'>The Taittirīya builds the cosmos from nourishment: food is brahman, the eater is brahman, the eater of the eater is brahman. The sequence — food, breath, mind, knowledge, bliss — is the Upaniṣadic ladder of the self, each rung a thicker description of the absolute.</p>" },
        { tag: 'Chāndogya Upaniṣad', title: 'Tat Tvam Asi', text: "<p class='myth-text'>Nine times the teacher Uddālaka tells his son Śvetaketu ‘tat tvam asi’ — that thou art — reasoning from salt dissolved in water: invisible, present everywhere, the ground of taste. The sentence became the keystone of Vedānta, quoted by every commentator from Śaṅkara to the modern sages.</p>" },
        { tag: 'Bṛhadāraṇyaka Upaniṣad', title: 'Neti Neti', text: "<p class='myth-text'>The great dialogue has Yājñavalkya answer the question ‘what is brahman?’ only by negations — neti neti, not this, not this. The method is the tradition’s most honest: the absolute cannot be described, only approached by stripping away every description. The gods, the world, and the self remain — as its body.</p>" },
      ],
    },
    syncretism: "Brahman absorbed every rival absolute: the Vedic ṛta, the Upaniṣadic ātman, the grammarian’s śabda, and — through the Vedānta commentaries — the personal gods themselves, who turned out to be brahman’s named aspects. Buddhism defined its nirvāṇa partly against brahman, which kept the concept honest; and modern Indian philosophy still uses the word for the ultimate in any school.",
    culturalLegacy: "The word gave India its most quoted sentence (‘tat tvam asi’), its most quoted method (‘neti neti’), and its most quoted sound (AUM). ‘Brahman’ passed into English as the learned word for the absolute; and the identification of brahman and ātman remains, after a century of translation, the central puzzle of comparative philosophy — the self and the world, one or two.",
    extendedMeditation: "Brahman: the name that refuses to be a name. Restored plainly, it demonstrates the lexicon’s wager — that plain letters can carry what the Upaniṣads said words cannot carry. Say it, and the utterance is the thing: a two-syllable formula older than the temples built to out-shout it.",
    sources: [
      { name: 'Ṛgveda 10.129 (the creation hymn)' },
      { name: 'Chāndogya Upaniṣad 6.8–6.16 (tat tvam asi)' },
      { name: 'Bṛhadāraṇyaka Upaniṣad 2.3 (neti neti)' },
      { name: 'Taittirīya Upaniṣad 2 (brahman as food)' },
    ],
    archaeology: "Brahman leaves no temple — it is the reason temples are redundant. Its monuments are manuscripts: the Upaniṣads’ palm-leaf lines, the Vedānta commentaries’ endless recursion, and the syllable AUM carved over every doorway of the tradition.",
    cult: "Its liturgy is recitation: the Veda read aloud is brahman’s daily performance. The upanayana initiation — the thread-ceremony — admits a boy to the utterance; every subsequent recitation keeps the absolute in circulation.",
    iconography: "AUM is brahman’s only image — the three curves and the dot, mapped by the tradition onto waking, dream, deep sleep, and the absolute. Where a temple must show something, it shows the syllable.",
    reception: "Arthur Schopenhauer called the Upaniṣadic brahman the highest product of human thought before Kant; theosophy and then physics popularized it (‘the universe is brahman’ reads like an early draft of certain cosmologies). The word entered the world’s philosophical vocabulary — the absolute that needs no capital letter.",
  },

  bhakti: {
    pronunciation: {
      ipa: '/ˈbʌkti/',
      ipaLabel: 'Sanskrit (IAST: Bhakti)',
      phonemes: [
        { symbol: 'Bh-', desc: 'The bh is a voiced aspirate — “b” with breath; not a plain English b.' },
        { symbol: '-ak-', desc: 'Short a as in “cup”; the root is bhaj, “to share, partake, adore”.' },
        { symbol: '-ti', desc: 'The abstract ending: “devotion”, “participation” — the quality made a noun.' },
      ],
      approximation: '“BUK-tee”',
      kin: [
        { label: 'Root', form: '√bhaj — to share, to serve, to worship' },
        { label: 'Tamil', form: 'paripāṭu/paṭi — the Tamil bhakti of the Āḻvārs' },
      ],
      note: 'The word begins as “partaking” — devotion as sharing in the divine, not mere adoration.',
    },
    domains: {
      title: 'Devotion, Loving Attachment to the Divine',
      subtitle: 'The Path of Loving Participation',
      lead: "<p class='lead-text'><strong>Bhakti</strong> is devotion as a complete path: the loving attachment to a personal god that the Bhagavadgītā crowns as the easiest and swiftest way, and that the medieval saints of Tamil country made into India’s most popular religion. From temple hymns sung in the vernacular to the quiet love of the quietist traditions, bhakti is the subcontinent’s answer to the question: how shall an ordinary person love the infinite?</p>",
      cards: [
        { name: 'The Path of Love', desc: 'The Bhagavadgītā’s ninth teaching: “offer me even a leaf, a flower, a fruit, water — I accept it”.', iconPath: 'M32 50C22 40 18 32 20 26C22 20 30 20 32 26C34 20 42 20 44 26C46 32 42 40 32 50ZM32 50V30' },
        { name: 'The Āḻvārs', desc: 'The twelve Tamil poet-saints whose hymns to Viṣṇu founded the tradition — composed, not compiled.', iconPath: 'M16 44V24L32 12L48 24V44M24 44V32H40V44M32 12V6M26 20H38' },
        { name: 'Nāma-Saṅkīrtana', desc: 'The chanting of the name — Hare Krishna, Rāma Rāma — as devotion’s simplest engine.', iconPath: 'M12 32C18 22 26 16 32 16C38 16 46 22 52 32C46 42 38 48 32 48C26 48 18 42 12 32ZM32 24V40M24 32H40' },
        { name: 'Grace over Works', desc: 'Prapatti, śaraṇāgati — the “surrender” that asks nothing and receives everything.', iconPath: 'M32 10V36M32 16L20 12M32 16L44 12M20 36H44M32 36V54M24 46H40' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Bhakti has no biography — it is the biography of millions. Its ‘myths’ are the movement’s own history: the Gītā’s canonization of devotion, the Tamil saints’ songs, the Maharashtrian kīrtan, and the global chant of the Hare Krishna movement. The tradition’s foundational stories cluster around the saints themselves — the hagiographies of Mirabai, Tukaram, and the gopīs of Braj.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Bhagavadgītā 9', title: 'The Easiest Path', text: "<p class='myth-text'>Krishna’s ninth discourse tells the anxious that devotion needs no learning, no wealth, no austerity: a leaf, a flower, a fruit, water — given with love, accepted. The verse is the charter of every subsequent bhakti movement, and the most quoted single sentence of the Gītā in the modern world.</p>" },
        { tag: 'Āḻvār Cycle', title: 'The Poet-Saints of Tamil Country', text: "<p class='myth-text'>Between the sixth and ninth centuries, twelve poet-saints — Nammāḻvār foremost — sang Viṣṇu into Tamil verse, walking the temple towns and composing the Nālāyira Divya Prabandham, four thousand hymns still sung daily. The bhakti they invented was personal, vernacular, and ecstatic — religion in the mother-tongue, against the Sanskrit monopoly.</p>" },
        { tag: 'Gopī Cycle', title: 'The Love of the Gopīs', text: "<p class='myth-text'>The Bhāgavata Purāṇa’s tenth book tells of the cowherd women who loved Krishna past shame, past reason — their love the tradition’s highest image of devotion: uncalculating, unrequited-looking, and finally rewarded. The rasa-theologians read it as the soul’s love for god; the devotees simply wept.</p>" },
        { tag: 'Modern Kīrtana', title: 'The Chant Goes Global', text: "<p class='myth-text'>From Caitanya’s sixteenth-century Bengali kīrtans to the Hare Krishna movement’s twentieth-century global sankīrtana, the name-chant carried bhakti around the world. The mahāmantra — sixteen words, one call — became the most widely sung Sanskrit formula on earth.</p>" },
      ],
    },
    syncretism: "Bhakti absorbed the whole pantheon: Viṣṇu, Śiva, Devī, and the unnameable all received the same love. It crossed into Sufism — the bhakti-sant poets read like Rūmī’s cousins — and into Christianity via the Syrian churches of the Malabar coast. The modern global movements (ISKCON, Sathya Sai) are bhakti’s export form.",
    culturalLegacy: "The bhakti movement rewrote Indian religion in the vernaculars — its hymns are the founding literature of half a dozen languages. ‘Bhakti’ entered English as a loan-word in the nineteenth century; and the Hare Krishna chant remains, measured by human-hours, the most performed Sanskrit text in history.",
    extendedMeditation: "Bhakti: the shortest word for the largest love. Restored plainly, it needs no mark — the aspiration of the bh is the only ornament devotion ever wanted, and English “bh” is close enough for love. The lexicon keeps it as the path’s own name for itself.",
    sources: [
      { name: 'Bhagavadgītā 9.26 (the leaf and the flower)' },
      { name: 'Nālāyira Divya Prabandham (the Āḻvār hymns)' },
      { name: 'Bhāgavata Purāṇa 10 (the gopī cycle)' },
      { name: 'Caitanya-caritāmṛta (the kīrtan movement)' },
    ],
    archaeology: "Bhakti’s monuments are the great temple-towns it animated — Śrīraṅgam, Kanchipuram, Pandharpur — and the palm-leaf hymnals of the Prabandham. The modern ISKCON temples of a hundred cities are its newest layer.",
    cult: "Its liturgy is song: the nāma-saṅkīrtana of the name, sung in streets and kitchens. The ārādhana worship of the big temples is bhakti’s formal rite — the god fed, bathed, and sung to sleep like a beloved guest.",
    iconography: "The flute and the cowherd (Krishna-bhakti), the liṅga and the river (Śiva-bhakti), the goddess of the pandals (Devī-bhakti) — bhakti has no single icon because it has no single beloved. Its emblem is the joined palms: the gesture itself.",
    reception: "Religious studies uses bhakti as the type-case of devotional religion: emotional, vernacular, anti-elitist, and unstoppably popular. The movement’s historians (A. K. Ramanujan foremost) made the bhakti poets canonical world literature; and the Hare Krishna chant made the word familiar in every airport on earth.",
  },

  chandra: {
    pronunciation: {
      ipa: '/ˈtʃʌndrə/',
      ipaLabel: 'Sanskrit (IAST: Candra)',
      phonemes: [
        { symbol: 'C-', desc: 'In IAST, c is the English “ch” — palatal, never a k-sound.' },
        { symbol: '-an-', desc: 'Short a as in “cup”; the syllable is light.' },
        { symbol: '-dra', desc: 'The cluster dr; the name means “glittering, shining”. In Vedic the moon is more often Soma.' },
      ],
      approximation: '“CHUN-druh”',
      kin: [
        { label: 'Vedic', form: 'Soma — the moon as the soma-plant’s celestial home' },
        { label: 'Greek', form: 'Men, the lunar god of the Anatolian coast' },
      ],
      note: 'The lunar dynasty of the epics — the Candravamśa — traces every lunar king to him.',
    },
    domains: {
      title: 'The Glittering Moon',
      subtitle: 'The Lunar God, Father of the Lunar Dynasty',
      lead: "<p class='lead-text'><strong>Candra</strong> is the moon personified: the glittering lord whose waxing and waning marks the calendar, whose crescent crowns Śiva’s hair, and whose dynasty — the Candravamśa — produced, by epic genealogy, the Pāṇḍavas and Krishna himself. In the Veda he is Soma’s celestial body; in later mythology he is the beautiful, cursed, forever-waning god.</p>",
      cards: [
        { name: 'The Waxing Fortnight', desc: 'The bright half of the month, śuklapakṣa, is his growth — the calendar’s first engine.', iconPath: 'M32 12A20 20 0 1 0 32 52A20 20 0 1 0 32 12M32 12C26 20 26 44 32 52' },
        { name: 'Śiva’s Diadem', desc: 'The crescent moon in Śiva’s hair is Candra’s seat — cooled by the Ganges, crowned by it.', iconPath: 'M40 14C34 18 32 26 36 32C30 30 26 22 30 14M20 44C26 40 34 40 40 44M16 50H44' },
        { name: 'Father of Budha', desc: 'By Tārā, wife of Bṛhaspati, he fathered Budha — Mercury and ancestor of the lunar line.', iconPath: 'M32 10V28M32 14L48 22M32 14L16 22M32 28L20 46M32 28L44 46M32 28V52' },
        { name: 'The Waning Curse', desc: 'Cursed by Dakṣa to waste away for loving Tārā, he is saved by Śiva’s partial mercy — hence the phases.', iconPath: 'M44 16C36 20 32 28 36 36C30 32 28 22 34 14M14 44C22 40 30 40 36 44M12 50H42' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Candra’s mythology clusters around two stories: the theft of Tārā and its curse, and the moon-churning of the ocean of milk. He is the most beautiful of the gods and the most diminished — the waxing and waning written into his body as punishment and mercy at once.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Purāṇic Cycle', title: 'The Abduction of Tārā', text: "<p class='myth-text'>Candra loved Tārā, wife of the guru Bṛhaspati, and carried her off; the gods’ war over her ended with her return — and her pregnancy, which she refused to explain until the child’s radiance declared the moon his father. Budha, the child, founded the lunar dynasty through which the epic’s heroes descend.</p>" },
        { tag: 'Śiva Cycle', title: 'The Curse and the Mercy', text: "<p class='myth-text'>Dakṣa, Bṛhaspati’s champion, cursed the moon to waste to nothing; the pleading gods won a partial reprieve — the curse would lift for half each month. The phases of the moon are the scar of the love-affair, and Śiva’s wearing of the crescent is the war-god’s mercy made ornament.</p>" },
        { tag: 'Samudra Manthana', title: 'The Moon from the Churning', text: "<p class='myth-text'>When the gods and demons churned the ocean of milk for the nectar of immortality, the moon rose among the treasures — Dhanvantari’s medicine-chest, the apsarases, and Candra, the glittering disc. Śiva took him onto his brow; the poison of the churning, Halāhala, he drank instead, turning his throat blue.</p>" },
        { tag: 'Vedic Soma', title: 'The Celestial Plant', text: "<p class='myth-text'>In the Veda the moon is Soma’s home: the pressed plant’s juice ascends to become the lunar disc, and the moon’s quarters are the soma-cup’s refills. The identification of moon, plant, and god is the Veda’s most compact theology — three substances, one divinity.</p>" },
      ],
    },
    syncretism: "Candra fused with Soma in the Vedic period and with the astronomical moon (one of the nine grahas) in the medieval period. The Greeks of the Northwest compared him to Selene’s domain but found no single Olympian match; and the Buddhist lunar mansions (nakṣatras) kept his calendar alive across Asia.",
    culturalLegacy: "The lunar calendar — every Hindu festival’s dating — is his monument; the Candravamśa genealogy made him the ancestor of the epic’s heroes. The crescent in Śiva’s hair is Hinduism’s most reproduced ornament; and ‘Monday’ (somavāra) still speaks his Vedic name in every Indian week.",
    extendedMeditation: "Candra: the glittering one, restored in plain letters that glitter on the screen. His waxing and waning need no diacritic — the phases are written in the name’s rhythm, two syllables that fill and empty like the moon they name.",
    sources: [
      { name: 'Purāṇic Tārā cycle (Matsya, Viṣṇu, Padma)' },
      { name: 'Samudra Manthana cycle' },
      { name: 'Ṛgveda 9 (the Soma hymns)' },
      { name: 'Kālidāsa’s dynastic genealogies' },
    ],
    archaeology: "Candra rides the temple friezes as the lunar graha; the great crescents of the medieval Śiva temples of Karnataka and Tamil Nadu are his monumental form. The astronomical observatories of Jantar Mantar measure his cycles in stone.",
    cult: "The moon’s phases govern every fast and festival — Ekādaśī, the full-moon and new-moon rites are his calendar. The soma-pressing of the Vedic ritual is his oldest liturgy, remembered in every modern pūrṇimā.",
    iconography: "A pale, beautiful god in a chariot of white horses (or the antelope’s antler-crescent), holding a lotus and a club; the crescent on Śiva’s head is his most famous seat. The twenty-seven nakṣatras — his wives, the daughters of Dakṣa — attend him.",
    reception: "Comparative mythology sets him beside Sin, Thoth, and Máni as the lunar god whose body is the calendar; and the Tārā-episode is cited in every study of the moon-god’s ‘sin’ — the waning written into myth as punishment. His name, through Monday and the lunar mansions, keeps the oldest astronomy alive in daily speech.",
  },

  diti: {
    pronunciation: {
      ipa: '/ˈdiːti/',
      ipaLabel: 'Sanskrit (IAST: Diti)',
      phonemes: [
        { symbol: 'Di-', desc: 'Long ī as in “see”; the name is a-diti with the negation removed.' },
        { symbol: '-ti', desc: 'The feminine abstract ending; the name means “the bound one”.' },
        { symbol: '', desc: 'The sister of Aditi — boundless — and mother of the anti-gods.' },
      ],
      approximation: '“DEE-tee”',
      kin: [
        { label: 'Sister', form: 'Aditi — the unfettered; Diti is her bound twin in name' },
        { label: 'Sons', form: 'the Daityas — Hiraṇyākṣa, Hiraṇyakaśipu, and the rest' },
      ],
      note: 'The name is a mirror of her sister’s: where Aditi is “un-bound”, Diti is the “bound” — and her sons are the gods’ enemies.',
    },
    domains: {
      title: 'Mother of the Daityas',
      subtitle: 'The Bound One, Mother of the Anti-Gods',
      lead: "<p class='lead-text'><strong>Diti</strong> is the mother of the anti-gods: the Daityas, the demonic dynasty whose wars with the gods drive half the Purāṇic mythology. Daughter of Dakṣa, wife of the sage Kaśyapa, twin in name of the unfettered Aditi, she mothers the bound ones — the race of Hiraṇyākṣa and Hiraṇyakaśipu, whose boons made them nearly invincible.</p>",
      cards: [
        { name: 'Mother of the Daityas', desc: 'Her sons are the Daityas — the anti-gods whose wars with the devas fill the Purāṇas.', iconPath: 'M32 10C26 18 22 28 22 38C22 48 26 54 32 54C38 54 42 48 42 38C42 28 38 18 32 10ZM18 44H46M26 48L32 52L38 48' },
        { name: 'Sister of Aditi', desc: 'Daughter of Dakṣa, sister of the unfettered Aditi — her name is Aditi’s negated.', iconPath: 'M20 40C20 28 28 20 32 20C36 20 44 28 44 40M16 44H48M32 20V10' },
        { name: 'The Vajra Wound', desc: 'Indra’s thunderbolt shattered her womb mid-pregnancy; the fragments became the Maruts.', iconPath: 'M34 6L22 30H30L26 54L42 24H34L38 6ZM20 44L14 50M46 44L52 50' },
        { name: 'Boons of Her Sons', desc: 'Hiraṇyakaśipu’s boon made him deathless by day or night, indoors or out — until Narasiṃha.', iconPath: 'M18 30H46M20 30V52M44 30V52M26 38H38M26 44H38M14 52H50M32 30V18M26 22H38' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Diti’s mythology is her maternity: everything the Daityas do, she enables — and one thing she undoes, in the Maruts episode, where Indra’s violence against her pregnant body produces the storm-gods from the womb’s fragments. She is the anti-mother of the anti-gods, the bound one whose children strain against every bond except hers.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Ṛgveda 1.99', title: 'The Maruts from the Broken Womb', text: "<p class='myth-text'>The oldest Diti-story has Indra hurl the vajra into her womb, shattering a hundred sons in embryo; the fragments become the Maruts, the storm-gods who yet serve Indra. Diti’s grief and the storm-gods’ loyalty are the hymn’s tension: the anti-mother’s broken children, adopted by her enemy.</p>" },
        { tag: 'Purāṇic Cycle', title: 'The Boon of Hiraṇyakaśipu', text: "<p class='myth-text'>Her son Hiraṇyakaśipu, devastated by his brother Hiraṇyākṣa’s death at Varāha’s tusk, won from Brahmā the boon that he could not die by day or night, indoors or out, by man or beast, on earth or sky. The boon made him lord of the three worlds — until Narasiṃha, the man-lion at dusk on a threshold, ended him. Diti’s line is the engine of the avatāra cycle.</p>" },
        { tag: 'Prahlāda Cycle', title: 'The Grandson Who Worshipped the Enemy', text: "<p class='myth-text'>Prahlāda, son of Hiraṇyakaśipu and thus Diti’s grandson, loved Vishnu from the womb — the devotee born in the anti-god’s house. The Purāṇas make his devotion the theology of bhakti itself: the bound dynasty’s finest fruit was the boy who could not be burned, poisoned, or thrown, for his god held him.</p>" },
        { tag: 'Genealogical Frame', title: 'Daughter of Dakṣa, Wife of Kaśyapa', text: "<p class='myth-text'>The Purāṇic theogonies make Diti one of Dakṣa’s thirteen daughters given to Kaśyapa: Aditi mothers the Ādityas, Diti the Daityas, Danu the Dānavas, and the rest of creation’s factions follow the wives. The marriage-bed of Kaśyapa is, in the genealogists’ scheme, the factory of the cosmos’s parties.</p>" },
      ],
    },
    syncretism: "Diti is the shadow-twin of Aditi — the Purāṇic genealogists built the whole deva-asura divide from the two sisters’ names. Her line’s fate — Hiraṇyakaśipu slain, Prahlāda saved — was read by the bhakti commentators as the triumph of devotion over lineage; and modern comparative study pairs her with the bound Titans of Greek genealogy.",
    culturalLegacy: "The Prahlāda story, carried by her line, is the subcontinent’s most retold tale of devotional defiance — every schoolchild’s Sanskrit reader has it. The Daitya-vaṃśa genealogies structured the Purāṇas’ entire mythology of conflict; and the name Diti survives in modern India as a girl’s name, the bound one given with a prayer for release.",
    extendedMeditation: "Diti: the name that is Aditi with the freedom removed. Restored plainly, it stands as the lexicon’s reminder that every boundless has its bound — the anti-gods’ mother holds a name the schoolchild can spell and the theologian cannot exhaust. Two syllables, one negation, a dynasty of enemies.",
    sources: [
      { name: 'Ṛgveda 1.99 (the Maruts episode)' },
      { name: 'Viṣṇu Purāṇa 1.15–21 (the Daitya genealogy)' },
      { name: 'Bhāgavata Purāṇa 7 (Prahlāda cycle)' },
      { name: 'Matsya Purāṇa (Kaśyapa’s wives and the factions)' },
    ],
    archaeology: "Diti has no temples — her cult is narrative. But her sons’ defeat carved the great Narasiṃha reliefs of Ellora and Mamallapuram, and the Prahlāda panels of every medieval temple tell her line’s story in stone.",
    cult: "None of her own; her ‘cult’ is the telling of her grandsons’ tales. The Holi festival’s Holikā-burning retells the Prahlāda cycle’s fire episode — the bound dynasty’s pyre, annually lit.",
    iconography: "Rarely imaged; when shown, a queen among the thirteen daughters of Dakṣa, or the wounded mother of the Purāṇic paintings. Her true icon is genealogical — the family-tree’s anti-branch.",
    reception: "Comparative mythology cites the Aditi-Diti pair as the cleanest case of name-negation structuring a pantheon’s moral geography; and the Prahlāda cycle, her line’s redemption, is the standard text of bhakti theology’s triumph over birth. She remains the study of the anti-mother: maternity without a single maternal myth of her own.",
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
