#!/usr/bin/env node
/**
 * Lore-catalog merge — Sanskrit batch 5 (ascii-restoration 2026-11).
 * Idempotent: existing non-empty entries are NEVER overwritten.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const LORE_PATH = path.join(ROOT, 'scripts', 'lore-catalog.json');
const lore = JSON.parse(fs.readFileSync(LORE_PATH, 'utf8'));

const ENTRIES = {
  mantra: {
    pronunciation: {
      ipa: '/ˈmʌntrə/',
      ipaLabel: 'Sanskrit (IAST: Mantra)',
      phonemes: [
        { symbol: 'Man-', desc: 'From √man, “to think”; the n is dental, the a short.' },
        { symbol: '-tra', desc: 'The instrumental suffix: the mantra is the “instrument of thought”.' },
        { symbol: '', desc: 'In mantra-science (mantraśāstra) the word is not merely said — it is installed, empowered, and released.' },
      ],
      approximation: '“MUN-truh”',
      kin: [
        { label: 'Avestan', form: 'mąθra — the cognate word for the Zoroastrian sacred formula' },
        { label: 'Root', form: '√man — to think; manas, mind' },
      ],
      note: 'The word’s cognate survives in Avestan mąθra — the same Indo-Iranian “instrument of thought” under two religions.',
    },
    domains: {
      title: 'The Sacred Formula',
      subtitle: 'The Instrument of Thought',
      lead: "<p class='lead-text'><strong>Mantra</strong> is sacred sound as technology: the formula — syllable, verse, or name — whose precise pronunciation installs divine power in the mind that holds it. From the Vedic verses the gods themselves are said to fear, to the single-syllable bījas that seed Tibetan mandalas, the mantra is India’s most exported spiritual instrument: AUM on every yoga studio’s lips.</p>",
      cards: [
        { name: 'AUM', desc: 'The pranava, the syllable that contains the all — three letters, four states, one sound.', iconPath: 'M22 44C22 32 26 22 32 22C38 22 42 32 42 44M18 44H46M28 50H36M32 22V12M26 16H38' },
        { name: 'The Bīja', desc: 'The seed-syllable — hrīṃ, oṃ, aiṃ — a condensed deity, planted in the heart by initiation.', iconPath: 'M32 50C32 38 32 30 32 24M32 24C26 22 20 24 16 30C22 32 28 30 32 24ZM32 24C38 22 44 24 48 30C42 32 36 30 32 24ZM28 50H36M24 54H40' },
        { name: 'The Gāyatrī', desc: 'The twenty-four-syllable verse to the solar light — recited at dawn by the twice-born for three millennia.', iconPath: 'M16 28H48M20 28V52M32 28V52M44 28V52M12 36H52M20 36V44M32 36V44M44 36V44' },
        { name: 'Japa', desc: 'The recitation-count: the rosary (mālā) of 108 beads turning prayer into measured practice.', iconPath: 'M16 32C16 20 24 12 32 12C40 12 48 20 48 32C48 44 40 52 32 52C24 52 16 44 16 32ZM12 32H20M44 32H52M28 32A4 4 0 1 0 36 32A4 4 0 1 0 28 32' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>The mantra’s mythology is the mythology of sound itself: the Vedic verse as the gods’ body, the Tantric syllable as the deity’s seed, and the modern AUM as the world’s most recognised sacred sound. Its stories are the mantra-sciences’ own — how verses were won from the gods, guarded by initiations, and tested in practice.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Ṛgveda 3.62', title: 'The Gāyatrī Verse', text: "<p class='myth-text'>The twenty-four syllables to the solar light — ‘we meditate on the glorious light of the divine sun; may it inspire our minds’ — are the most recited verse in history. The tradition counts its recitation at dawn as the twice-born’s first and non-negotiable duty, kept without interruption for three millennia.</p>" },
        { tag: 'Aitareya Brāhmaṇa', title: 'The Verses the Gods Fear', text: "<p class='myth-text'>The Brāhmaṇas tell that certain verses — the vājas, the weapons — are feared by the gods themselves, pronounced only in the rite’s armoury. The mantra was power before it was prayer: the correctly uttered verse as a weapon the cosmos must obey.</p>" },
        { tag: 'Tantric Cycle', title: 'The Bīja Syllables', text: "<p class='myth-text'>The Tantras compressed the deities into single syllables — hrīṃ for the great goddess, krīṃ for Kālī, aiṃ for learning — each a ‘seed’ (bīja) that grows the god in the practitioner’s body. The syllables are analysed letter by letter: each phoneme a cosmic principle, the whole a deity in auditory form.</p>" },
        { tag: 'Modern Global', title: 'AUM Goes West', text: "<p class='myth-text'>The transcendentalists carried AUM to New England; the yogis carried it to the world. Today the syllable opens and closes yoga classes on every continent, and the Hare Krishna mahāmantra — sixteen words — is the most widely sung Sanskrit text in history. The instrument of thought has become the planet’s shared sacred sound.</p>" },
      ],
    },
    syncretism: "The Avestan mąθra is the mantra’s twin — the Zoroastrian formula-word of the same root — and Buddhist dharani are mantras under a doctrine of emptiness. Japanese Shingon built an entire school on the syllable AUM ( Sanskrit a-un); and Sikhism’s nām-simran is mantra-practice without the name. Every Indian tradition keeps the instrument, whatever its theology.",
    culturalLegacy: "AUM is the world’s most recognised sacred syllable; the Gāyatrī the most recited verse. The rosary of 108 beads — japa-mālā — passed into Buddhism, Islam, and Catholic Europe. And ‘mantra’ entered English as a loan-word meaning any formula repeated until it works — the theology secularized but intact.",
    extendedMeditation: "Mantra: the instrument of thought, restored in the plain letters every recitation has used since the Veda. It needs no diacritic — the syllable’s power was never in its spelling but in its sounding, and AUM sounds the same in every alphabet on earth.",
    sources: [
      { name: 'Ṛgveda 3.62.10 (the Gāyatrī verse)' },
      { name: 'Aitareya Brāhmaṇa (the feared verses)' },
      { name: 'Śāradātilaka and Tantrasāra (bīja doctrine)' },
      { name: 'Avestan Yašts (mąθra parallels)' },
    ],
    archaeology: "The mantra leaves palm-leaves, not temples: millions of Gāyatrī manuscripts, the mantra-courses inscribed around Tantric mandalas, and the syllable AUM carved over every cave-temple doorway of the Deccan. Its oldest ‘monument’ is the recitation itself, continuous since the Bronze Age.",
    cult: "Japa — the counted recitation — is its universal liturgy: 108 beads, morning and evening, from the twice-born’s Gāyatrī to the monk’s nembutsu. The pūjā’s every act is mantra-driven: the deity is invited, installed, and dismissed by verse.",
    iconography: "The syllable itself — AUM in Devanāgarī, a-un in Japanese Siddhaṃ; the rosary; the yantra, the mantra's visual body. No face: the mantra's icon is its own sound written down.",
    reception: "Linguistics and religious studies treat the mantra as the world’s longest-running experiment in sacred phonology; the Vedic pitch-accent’s preservation is a linguistics marvel. The modern West received it as ‘affirmation’ and ‘mindfulness anchor’ — the instrument of thought, repackaged but still sounding.",
  },

  matsya: {
    pronunciation: {
      ipa: '/ˈmɑːtsyə/',
      ipaLabel: 'Sanskrit (IAST: Matsya)',
      phonemes: [
        { symbol: 'Mat-', desc: 'Short a as in “cup”; the word is the common noun “fish”.' },
        { symbol: '-sya', desc: 'The cluster tsy is pronounced “chya” in the north, “tsya” in the south: MAT-chyuh.' },
        { symbol: '', desc: 'The first avatāra of Vishnu — the fish that saved Manu from the flood.' },
      ],
      approximation: '“MAHT-chyuh”',
      kin: [
        { label: 'Parallels', form: 'Gilgamesh’s Utnapishtim · Noah · Deucalion' },
        { label: 'Lineage', form: 'first of the daśāvatāra, the ten descents' },
      ],
      note: 'The flood-saviour as fish: the oldest of Vishnu’s descents, and the closest of India’s myths to the world’s other flood-legends.',
    },
    domains: {
      title: 'The Fish, First Avatāra of Viṣṇu',
      subtitle: 'The Flood-Saviour of Manu',
      lead: "<p class='lead-text'><strong>Matsya</strong> is Vishnu’s first descent: the great fish that warned Manu of the coming flood, bade him build a ship, and bore it — and with it the seven sages, the seeds of every species, and the Vedas themselves — through the drowning of the world to the one un-submerged peak. The Purāṇic telling makes him the keeper of the scriptures as well as the race.</p>",
      cards: [
        { name: 'The Great Fish', desc: 'A tiny fish that outgrew every vessel, until only the ocean could hold it — Vishnu himself.', iconPath: 'M10 36C18 28 30 28 38 34C42 30 46 28 52 30L56 34L52 38C46 40 42 38 38 36C30 44 18 44 10 36ZM18 34L14 28M28 32L26 26M14 38L10 42' },
        { name: 'The Deluge', desc: 'The pralaya, the world’s dissolution by water — the flood that ends each cycle of creation.', iconPath: 'M8 34C16 28 24 28 32 34C40 40 48 40 56 34M8 44C16 38 24 38 32 44C40 50 48 50 56 44M14 24L16 22M30 20L32 18M46 24L48 22' },
        { name: 'The Ship of Manu', desc: 'The ark of Hindu myth: the seven sages and the seeds of all life aboard, tied to the fish’s horn.', iconPath: 'M12 40H52L46 50H18ZM20 40V32H28V40M34 40V28H42V40M26 28H36M30 24H34' },
        { name: 'Keeper of the Vedas', desc: 'The demon Hayagrīva stole the scriptures; the fish slew him and returned the Vedas to the world.', iconPath: 'M18 24H46V44H18ZM26 32H38M32 28V40M14 20H50M16 48H48' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>The Matsya myth is India’s flood-saga: the warning, the ark, the world’s drowning, and the mooring at the one remaining peak — with the added theology of the avatāra, Vishnu descending to preserve both species and scripture. The telling grows from a brief Vedic episode to one of the Purāṇas’ most beloved complete narratives.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Śatapatha Brāhmaṇa', title: 'The Earliest Flood', text: "<p class='myth-text'>The oldest telling is dry and swift: Manu finds a tiny fish, rears it through successively larger vessels until only the sea will hold it; it warns him of the coming flood and returns as a horned leviathan to tow his ship by a cable. At the flood’s peak they moor on the one un-submerged tree — the <em>nyagrodha</em> — and the fish reveals itself as ‘the lord of creatures’.</p>" },
        { tag: 'Matsya Purāṇa', title: 'The Full Narrative', text: "<p class='myth-text'>The eponymous Purāṇa expands everything: the demon Hayagrīva steals the four Vedas as Brahmā sleeps; Vishnu wakes as a fish, kills Hayagrīva in the world-river’s depths, and returns the scriptures; then the flood proper — the ark, the sages, the seeds, and the long tow to the Himalayan peak where the new world begins.</p>" },
        { tag: 'Avatāra Theology', title: 'The First Descent', text: "<p class='myth-text'>In the daśāvatāra sequence, Matsya is the first: preservation precedes power. The theology reads each avatāra as the god’s answer to a cosmic emergency — here, the emergency is knowledge itself, the Vedas drowned or stolen. The fish saves the texts before it saves the species.</p>" },
        { tag: 'Comparative Flood', title: 'One Deluge, Many Arks', text: "<p class='myth-text'>The flood-list is the world’s most widespread myth-complex: Utnapishtim in the Gilgamesh epic, Noah in Genesis, Deucalion in Greece, and Manu in the Purāṇas. The Indian telling’s distinctive signature is the <em>warning fish</em> — the saviour who speaks, and the god who tows.</p>" },
      ],
    },
    syncretism: "Matsya is the Purāṇic systematization of a Vedic flood-episode — the Brahmana’s ‘lord of creatures’ identified with Vishnu when the avatāra-doctrine matured. Comparative mythology groups him with the ancient Near Eastern flood-saviours; and in the daśāvatāra art of Southeast Asia, he rides the temple walls as the sequence’s first figure.",
    culturalLegacy: "The Matsya Jayanti festival celebrates his descent; and the flood-narrative is every Indian schoolchild’s introduction to comparative mythology. The story’s signature image — the fish that outgrows every vessel — became a parable of the infinite in domestic teaching: the god who cannot be kept in any pot.",
    extendedMeditation: "Matsya: the fish that saved the words. Restored plainly, the name is the simplest in the avatāra sequence — the common noun for the creature that carried scripture and species through the drowning of the world. Two syllables, one ark, all the Vedas.",
    sources: [
      { name: 'Śatapatha Brāhmaṇa 1.8.1 (the earliest telling)' },
      { name: 'Matsya Purāṇa (the full narrative)' },
      { name: 'Bhāgavata Purāṇa 8.24 (the devotional retelling)' },
    ],
    archaeology: "Matsya rides the first panel of every daśāvatāra frieze — from the Gupta reliefs of Deogarh to the great sequence-walls of Angkor. The fish-torso Vishnu of the early medieval images is his monumental form.",
    cult: "The Matsya Jayanti festival (spring) celebrates the descent; and the <em>jalayātrā</em> boat-festivals of riverine India echo the ark-myth in their liturgy. His temples are rare, but his image opens every ten-incarnation cycle.",
    iconography: "Fish-torso and god-head, the horn projecting from his snout for the ship’s cable; or the great fish alone bearing the ark on its back. His emblem is the horn — the hitch-point of salvation.",
    reception: "Comparative mythology’s flood-paradigm uses Matsya as the eastern anchor of the deluge-complex — the same story told from the Indus to the Jordan. The avatar-doctrine’s scholars cite him as the clearest case of a myth upgraded into a theology: the old fish, re-signed as the first descent.",
  },

  meru: {
    pronunciation: {
      ipa: '/ˈmɛruː/',
      ipaLabel: 'Sanskrit (IAST: Meru)',
      phonemes: [
        { symbol: 'Me-', desc: 'Short e as in “set”; the name is pre-Vedic in feel, its etymology uncertain.' },
        { symbol: '-ru', desc: 'Long ū as in “rule”; the name closes on the resonant liquid.' },
        { symbol: '', desc: 'The axis mountain — the Olympus of Hindu, Buddhist, and Jain cosmology alike.' },
      ],
      approximation: '“MEH-roo”',
      kin: [
        { label: 'Buddhist', form: 'Sumeru — “excellent Meru”, the abode of the thirty-three gods' },
        { label: 'Jain', form: 'Meru as the central peak of the middle world' },
      ],
      note: 'All three Indian religions share Meru — the one mountain in the centre of every map.',
    },
    domains: {
      title: 'The Axis Mountain, Olympus of the Hindus',
      subtitle: 'The Centre of the World',
      lead: "<p class='lead-text'><strong>Meru</strong> is the world’s axle: the golden mountain at the centre of the cosmos, around which the sun, moon, and planets revolve, on whose summit Indra’s city stands, and whose four faces of gold, crystal, ruby, and lapis feed the four great rivers of the directions. Every Indian cosmology — Hindu, Buddhist, Jain — puts Meru in the middle; every mandala is its plan.</p>",
      cards: [
        { name: 'The Axis', desc: 'The world turns on Meru; the pole star wheels above its summit as the heavens’ nail-head.', iconPath: 'M32 8V56M32 8L48 20M32 8L16 20M32 24L52 36M32 24L12 36M32 40L48 52M32 40L16 52' },
        { name: 'The Four Faces', desc: 'Gold to the east, crystal south, ruby west, lapis north — the four colours of the mandala.', iconPath: 'M32 12L48 36L32 56L16 36ZM32 12V56M16 36H48M32 12L32 4M48 36L56 36M16 36L8 36' },
        { name: 'City of the Gods', desc: 'Indra’s Amarāvatī crowns the summit; the thirty-three gods feast in its halls.', iconPath: 'M16 52H48M20 52V36L32 24L44 36V52M28 52V42H36V52M32 24V12M24 18H40' },
        { name: 'The Mandala’s Map', desc: 'Every maṇḍala diagrams Meru: centre, four gates, and the enclosing world-rings.', iconPath: 'M12 32C12 20 22 12 32 12C42 12 52 20 52 32C52 44 42 52 32 52C22 52 12 44 12 32ZM20 32C20 24 26 20 32 20C38 20 44 24 44 32C44 40 38 44 32 44C26 44 20 40 20 32Z' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Meru’s mythology is cosmography — the mountain’s biography is the world’s architecture. It rises from the centre of Jambudvīpa, the rose-apple continent; the sun’s chariot circles it daily; the Ganges falls first on its summit and only then to the earth; and the gods’ wars are fought on its terraces. The Purāṇic geographies measure all distance from its base.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Purāṇic Cosmography', title: 'The Mountain of Measure', text: "<p class='myth-text'>The Purāṇas give Meru its statistics: 84,000 leagues high, its base 32,000 across, its summit the square of the gods’ city. The sun’s horses, tired from circling it, rest at night on its western face; the moon’s waxing is the gods’ drinking of the lunar soma on its terraces. The mountain is the cosmos’s clock, scale, and sceptre.</p>" },
        { tag: 'Gangā Cycle', title: 'The River’s First Fall', text: "<p class='myth-text'>When Bhagīratha won the Ganges’ descent for his burned ancestors, the river fell first from heaven onto the matted hair of Śiva — and before that, the tradition adds, upon Meru’s summit, where the gods’ gardens divided her into the seven streams. Meru is the river’s first landing, heaven’s customs-house.</p>" },
        { tag: 'Mandala Theology', title: 'The Mountain Diagrammed', text: "<p class='myth-text'>The Buddhist and Hindu maṇḍala is Meru flattened into a map: the square’s four gates are its faces, the inner palace the summit’s city, the concentric rings its seven world-encircling ranges. To construct a mandala is to rebuild Meru; to enter it is to climb. The Vajrayāna made the diagram the path itself.</p>" },
        { tag: 'Samudra Manthana', title: 'The Churning’s Spindle', text: "<p class='myth-text'>When the gods and demons churned the ocean of milk, the churning-rod was Mandara, Meru’s little brother of a mountain; the serpent Vāsuki the rope. Meru’s family thus supplied the axis of the gods’ greatest work — the axis-mountain’s line, lending itself to every cosmic rotation.</p>" },
      ],
    },
    syncretism: "Meru is shared property: Hindu Meru, Buddhist Sumeru, Jain Meru of the madhyaloka. The Greeks of Bactria heard Olympus in it; and the East Asian Buddhist cosmologies drew Sumeru as the world’s spike on temple banners from Java to Japan. The mountain out-religioned every religion that mapped it.",
    culturalLegacy: "Every mandala, stupa, and temple plan is a Meru; the prayer-wheel’s axis and the pagoda’s spire are its hardware. ‘Sumeru’ and ‘Meru’ entered the names of a thousand monasteries and mountains — and travellers to the real Himalaya argued for centuries which peak the geographers had meant.",
    extendedMeditation: "Meru: the name of the centre, restored at the centre of a plain line of letters. It needs no diacritic — the mountain carries its own height, and every reader’s eye climbs it. Two syllables, eighty-four thousand leagues.",
    sources: [
      { name: 'Viṣṇu Purāṇa 2 (the cosmography)' },
      { name: 'Abhidharmakośa (Buddhist Sumeru doctrine)' },
      { name: 'Lokaprakāśa (Kashmiri Meru geography)' },
      { name: 'Tibetan maṇḍala commentaries' },
    ],
    archaeology: "Meru’s monuments are every stupa and pagoda — the Borobudur terraces walk the pilgrim up Sumeru; the temple mountains of Angkor are Meru in sandstone. The maṇḍala-paintings of Tibet diagram it ten thousand times.",
    cult: "No separate cult — every cosmological rite is his. The consecration of a stupa ‘plants Meru’; the temple’s foundation deposits place the mountain under the god’s throne. The circumambulation of any sacred centre is its summit-walk.",
    iconography: "The stepped pyramid-mountain, four-faced and jewel-coloured, crowned by Indra’s palace or the thousand-armed deity; or the square mandala with its four gates. The stupa’s harmikā tower is Meru’s tip in portable form.",
    reception: "History of science studies Meru as the ancient world’s most influential cosmic model — the flat-earth cosmography’s greatest rival, and the template of every Asian sacred building. The pagoda’s archaeology is, in one reading, nothing but Meru’s long migration east.",
  },

  tantra: {
    pronunciation: {
      ipa: '/ˈtʌntrə/',
      ipaLabel: 'Sanskrit (IAST: Tantra)',
      phonemes: [
        { symbol: 'Tan-', desc: 'From √tan, “to stretch, extend, weave” — the same root as “tan” and “tend”.' },
        { symbol: '-tra', desc: 'The instrumental suffix: the tantra is the “loom” or “warp” — the extended doctrine.' },
        { symbol: '', desc: 'The word names both the scripture-class and the ritual systems those scriptures teach.' },
      ],
      approximation: '“TUN-truh”',
      kin: [
        { label: 'Root', form: '√tan — to stretch; English “tend”, “tension” are cousins' },
        { label: 'Etymology', form: 'tantra — the warp of a loom, the system’s threads' },
      ],
      note: 'The word is a weaving-metaphor: the tantra is the warp into which the practice’s threads are stretched.',
    },
    domains: {
      title: 'The Loom of Esoteric Doctrine',
      subtitle: 'The Extended System, Scripture and Practice',
      lead: "<p class='lead-text'><strong>Tantra</strong> is the name of a scripture-class and the ritual systems those scriptures teach: works cast as dialogues between Śiva and the Goddess, embracing mantra, mandala, initiation, and the disciplined transgression of ordinary purity-rules. From the sixth-century Śaiva scriptures to Tibetan Vajrayāna, the tantras are the Indian religions’ most ambitious technology for accelerated transformation.</p>",
      cards: [
        { name: 'The Scripture-Dialogue', desc: 'The tantra is cast as Śiva’s answer to the Goddess’s questions — god and power, doctrine and energy, in conversation.', iconPath: 'M20 40C20 30 26 24 32 24C38 24 44 30 44 40M16 44H48M32 24V12M24 16H40M28 48H36' },
        { name: 'The Maṇḍala', desc: 'The deity’s palace-diagram, constructed from coloured sands or drawn, entered by initiation through the four gates.', iconPath: 'M12 32C12 20 22 12 32 12C42 12 52 20 52 32C52 44 42 52 32 52C22 52 12 44 12 32ZM20 32C20 24 26 20 32 20C38 20 44 24 44 32C44 40 38 44 32 44C26 44 20 40 20 32Z' },
        { name: 'Mantra and Mudrā', desc: 'Sound and gesture: the mantra pronounced, the hand-seal struck — the body made instrument of the doctrine.', iconPath: 'M16 32C16 22 24 16 32 16C40 16 48 22 48 32M20 32C20 26 26 22 32 22C38 22 44 26 44 32M28 32A4 4 0 1 0 36 32A4 4 0 1 0 28 32M32 36V52' },
        { name: 'Transgression as Method', desc: 'The pañcamakāra — the five M’s — consumed in ritual under vow, inverting purity to burn through it.', iconPath: 'M20 20L44 44M44 20L20 44M32 12V52M12 32H52' },
      ],
    },
    mythology: {
      lead: "<p class='myth-text'>Tantra’s mythology is its own theology of secrecy and speed: the god teaching the Goddess, the guru initiating the disciple, and the householder’s body becoming the ritual ground. Its stories are the scriptures’ frames — Śiva on Mount Kailāsa answering Pārvatī’s midnight questions, the siddhas flying on mantra-power, the kings protected by Śaiva rites.</p>".replace('myth-text','myth-text'),
      myths: [
        { tag: 'Tantric Frame', title: 'The God Teaches the Goddess', text: "<p class='myth-text'>Nearly every tantra opens on a mountain: Śiva, asked by the Goddess how liberation may be quick for the poor in merit and short in life, answers with the system. The gender of the exchange is the doctrine — the god is knowledge, the Goddess is energy, and the tantra is their union written down for the age of decline.</p>" },
        { tag: 'Kaula & Śaiva Cycles', title: 'The Clan-Traditions', text: "<p class='myth-text'>The early Śaiva tantras organised themselves as kulas, clans — initiatory lineages bound to a deity, a mantra, and a guru. The clans’ mythology made heroes of the siddhas, the perfected ones who flew, stayed young, and turned the elements — the tantras’ advertisements and their cautionary tales.</p>" },
        { tag: 'Vajrayāna Cycle', title: 'The Thunderbolt Vehicle', text: "<p class='myth-text'>Buddhism absorbed the tantras wholesale: the Vajrayāna made the Buddha speak as Vajradhara, the thunderbolt-holder, and taught that buddhahood could be won in a single lifetime. The Tibetan canons — Kanjur and Tanjur — are the largest single body of tantric scripture preserved anywhere.</p>" },
        { tag: 'Royal Protections', title: 'The State of the Rites', text: "<p class='myth-text'>Medieval kings ruled by tantra: the Śaiva rites of protection (rakṣā) and the pacificatory rites (śānti) were statecraft. The inscriptions of the Cōḻas and the Pālas record land-grants to tantric monasteries that anchored their realms — the esoteric schools as the polity’s immune system.</p>" },
      ],
    },
    syncretism: "Tantra swallowed its rivals: Vaiṣṇava, Śaiva, Śākta, and Buddhist tantras share a grammar of mantra, mandala, and initiation beneath their rival theologies. The Śākta tantras made the Goddess the system’s core; the Tibetan schools fused the whole into Vajrayāna; and modern global ‘tantra’ is a Western distillation of one strand of a much larger river.",
    culturalLegacy: "The maṇḍala entered the world’s art-vocabulary; the mantra and the mudrā passed into global practice. Tantra’s academic rediscovery in the twentieth century rewrote the history of Hinduism and Buddhism — the ‘esoteric’ is now standard curriculum. And the word, in the West, became a byword for sacred sexuality, a reduction the tradition itself would barely recognize.",
    extendedMeditation: "Tantra: the warp stretched on the loom, restored in plain letters that hold nothing back and reveal nothing. The name is the method — the system extended, thread by thread, until the whole fabric shows the pattern. Two syllables, one loom, every thread.",
    sources: [
      { name: 'Mālinīvijayottara and Svacchandatantra (early Śaiva systems)' },
      { name: 'Hevajra Tantra and Guhyasamāja (Buddhist Vajrayāna)' },
      { name: 'Sanderson, ‘Śaivism and Brahmanism’ (historical framework)' },
      { name: 'Tibetan Kanjur/Tanjur catalogues' },
    ],
    archaeology: "Tantra leaves mandalas: the Borobudur’s galleries, the painted maṇḍala-halls of Alchi and Tabo, and the stūpa-temples of the Himalayan lineages. The colossal Hevajra and Cakrasaṃvara images of Khmer art are its royal monuments.",
    cult: "The guru is the cult: initiation (dīkṣā) admits the practitioner to the clan, and the daily sādhana — the deity’s self-generation by mantra and visualization — is the liturgy. The fire-rites (homa) burn the offerings that seal the pacts.",
    iconography: "The deity in union — the yab-yum of Tibet, the Śiva-Śakti of the Hindu tantras — the two-in-one that images the doctrine. The vajra, the bell, the skull-cup, and the curved knife are the instruments; the mandala is the ground.",
    reception: "Religious studies treats tantra as the field’s great twentieth-century discovery — the recovery of the esoteric half of Asian religion. The Western ‘Tantra’ of the counterculture is a case-study in selective reception: one limb of the system, exported as the whole body.",
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
