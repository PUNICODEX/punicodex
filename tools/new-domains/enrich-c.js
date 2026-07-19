/**
 * Lore enrichment, batch C — Vedic/Sanskrit (5) + Chinese (6) entries.
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
  lyre: 'M22 10C18 24 18 36 24 44C28 50 36 50 40 44C46 36 46 24 42 10M22 10H26M38 10H42M28 18V40M36 18V40M26 44H38',
  wheel: 'M32 14A18 18 0 1 0 32 50A18 18 0 1 0 32 14M32 14V50M14 32H50M19 19L45 45M45 19L19 45',
  scale: 'M32 10V54M14 20H50M18 20L12 36H24L18 20ZM46 20L40 36H52L46 20ZM24 54H40',
  ship: 'M12 40H52L44 52H20L12 40ZM32 8V40M32 12C40 18 44 28 44 36M32 12C24 18 20 28 20 36',
  horn: 'M44 8C30 10 18 20 14 34C12 42 16 50 24 52C34 54 44 46 46 36L36 40C30 42 24 38 24 32C24 24 34 14 44 8Z',
  egg: 'M32 8C22 8 14 22 14 36C14 48 22 56 32 56C42 56 50 48 50 36C50 22 42 8 32 8Z',
  hoof: 'M20 8H44V30C44 42 38 52 32 52C26 52 20 42 20 30V8ZM28 44H36M32 8V24',
  horse: 'M18 52L22 34C16 28 16 18 24 12L30 6L34 14C42 16 46 22 46 30L42 52M26 26L36 34',
  mask: 'M20 10H44V30C44 42 38 52 32 52C26 52 20 42 20 30V10ZM25 25H29M35 25H39M27 38C30 36 34 36 37 38',
  wall: 'M10 48H54M14 48V24H26V48M26 36H38V48M38 48V18H50V48M10 24H26M38 18H54',
  die: 'M14 14H50V50H14V14ZM23 23H27M37 23H41M23 41H27M37 41H41M30 30H34',
  thread: 'M12 48C20 40 24 36 32 32C40 28 44 24 52 16M44 8C48 8 52 12 52 16M12 48C12 52 16 56 20 56M28 36L36 44',
  gate: 'M12 52V22C12 14 20 8 32 8C44 8 52 14 52 22V52M24 52V26M40 52V26',
  hammer: 'M14 44L36 22M36 22L30 16L44 8L52 16L44 24L36 22ZM20 50L14 44L18 40L24 46L20 50Z',
  lotus: 'M32 46C26 38 26 26 32 16C38 26 38 38 32 46ZM19 42C17 32 21 23 28 18M45 42C47 32 43 23 36 18M32 46V56',
  knot: 'M20 20C12 20 8 26 8 32C8 38 12 44 20 44C28 44 36 20 44 20C52 20 56 26 56 32C56 38 52 44 44 44C36 44 28 20 20 20Z',
  scroll: 'M16 10H44V44C44 50 40 54 34 54H16V10ZM16 10C12 10 10 13 10 17C10 21 12 23 16 23M24 20H40M24 28H40M24 36H36',
  trigram: 'M14 14H50M14 26H26M38 26H50M14 38H50M14 50H26M38 50H50',
  stone: 'M16 48C16 30 22 16 32 12C42 16 48 30 48 48L38 44L32 52L26 44L16 48Z',
  vase: 'M24 8H40M26 8C26 16 20 20 20 28C20 42 26 54 32 54C38 54 44 42 44 28C44 20 38 16 38 8M20 28H44',
};

module.exports = {
  // ── Vedic / Sanskrit ─────────────────────────────────────────────────────
  amsa: {
    pronunciationNote:
      'Sanskrit aṃśa carries the anusvāra (ṃ) — a nasalization of the preceding vowel before the sibilant — written with the single dot of the Devanagari अंश. The word means "portion, share," and the restoration Aṃśa keeps the nasal exactly where the phonology and the scripture put it.',
    originalScriptNote: `<p>Written अंश in Devanagari: the short a, the anusvāra dot above it, then śa. The same spelling covers the god and the common noun "share," which is precisely the theology — the Āditya is the portion, personified.</p>`,
    domains: {
      title: 'The Allotted Share',
      subtitle: 'Portion, Sacrifice, and the Twelfth Sun',
      lead: `<p class='lead-text'>Aṃśa is the quietest of the twelve Ādityas: the sun as the apportioner, the god whose name simply means "share." In a sacrificial universe where everything — food, merit, cattle, days — is portioned out, Aṃśa is the power that makes the portion just.</p>`,
      cards: [
        { iconPath: ICONS.scale, name: 'The Portion', desc: 'His name is the noun: the share of sacrifice, inheritance, and fate that falls to each.' },
        { iconPath: ICONS.sun, name: 'The Twelfth Āditya', desc: 'One of the twelve solar powers who rule the year\'s twelve portions.' },
        { iconPath: ICONS.wheel, name: 'Navāṃśa', desc: 'His word lives on in astrology: the navāṃśa, the ninth division of every sign.' },
        { iconPath: ICONS.flame, name: 'The Sacrifice', desc: 'The fire ritual where every god receives a measured portion — his office, nightly.' },
      ],
    },
    symbols: [
      { name: 'The ladle', meaning: 'The sruc that portions ghee into the fire — the instrument of shares' },
      { name: 'The lotus of the Ādityas', meaning: 'Solar lineage: born of Aditi, boundless mother of the measured gods' },
      { name: 'The divided cake', meaning: 'The sacrificial piṣṭa-paśu portioned among the gods' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Aṃśa has no single great narrative — like many Vedic gods, he is a function given face: the apportionment that the sacrifice performs and the year repeats.</p>`,
      myths: [
        { tag: 'The Twelve', title: 'Son of Aditi', text: `<p class='myth-text'>The Ṛgveda knows the Ādityas as the sons of Aditi — "the unbound" — guardians of ṛta, cosmic order; the later lists count twelve, one for each month, and Aṃśa stands among them as the sun of apportionment. The Bhāgavata Purāṇa's roster names him plainly: the year itself is his household, and each month is a room of it.</p>` },
        { tag: 'The Sacrifice', title: 'Every God a Share', text: `<p class='myth-text'>The Vedic sacrifice is an economy of portions: the hymn distributes the offering — "this share to Agni, this to Soma" — and the Brāhmaṇas explain that the gods' shares were fixed at creation. Aṃśa is the personification of that fixing: without the allotted share, no ritual holds, no inheritance stands, no year completes.</p>` },
        { tag: 'The Dispute', title: 'The Gods\' Shares', text: `<p class='myth-text'>The Śatapatha Brāhmaṇa tells how the gods and anti-gods contended for the sacrifice, and how the portions were assigned — some by merit, some by trickery. The myth's lesson is the god's nature: a share is never neutral; it is the shape of justice or of theft, and Aṃśa's name sits on the scale.</p>` },
      ],
    },
    syncretism: `<p>He overlaps with Bhaga, the older "dispenser" of shares — the two are so close that Vedic lists sometimes trade their places — and with Mitra and Varuṇa, whose covenant-keeping the Ādityas collectively perform. Scholars compare the Indo-Iranian share-gods: Avestan aṃša (in Amesha Spenta, "Bounteous Immortal") is a cognate word, if a different theology — the portion raised to archangel.</p>`,
    culturalLegacy: `<p>His word outlived his cult: aṃśa remains the everyday Sanskrit and Hindi word for "part," and technical vocabularies are built on it — navāṃśa (the ninth harmonic chart in Jyotisha astrology), kalāṃśa in music, daśāṃśa in taxation records. Wherever Indian thought divides a whole into rightful portions — astrology, inheritance law, music theory — the god's name is the operative term.</p>`,
    archaeology: `Early Vedic religion was aniconic: no image of Aṃśa was ever made, and none was wanted — the fire altar was his only temple. The archaeology of the Ādityas is textual and structural: the śrauta fire-altars of the Śulba tradition, laid out with the geometry of portions (the altar's bricks counted and placed by rule), are the material form of his theology. Later Surya temples — Konarak, Modhera — give the solar Ādityas a collective home in stone.`,
    extendedMeditation: `<p>Aṃśa is the god of fairness at the smallest scale: not the harvest but the share; not the year but the month; not the whole but the part that is yours. He asks the oldest question of any household, any state, any life: was the portion just — and did you take only your own?</p>`,
    sources: [{ name: 'Rigveda' }, { name: 'Brāhmaṇas' }, { name: 'Bhagavata' }, { name: 'Monier-Williams' }, { name: 'Macdonell' }, { name: 'MW' }],
  },

  daksa: {
    pronunciationNote:
      'Sanskrit dakṣa — "able, skilled, dexterous" — carries the kṣa cluster written with the conjunct क्ष, a single glyph for k plus ṣ. Indo-Europeanists connect the word to the root *deks-, "right hand, skill": Latin dexter is its cousin, and "dexterity" its English echo.',
    originalScriptNote: `<p>Written दक्ष in Devanagari: da plus the conjunct kṣa. The same spelling names the Prajāpati and the everyday adjective "skilled" — the god is competence enthroned among the creators.</p>`,
    domains: {
      title: 'The Skilled Father',
      subtitle: 'Progeny, Sacrifice, and the Goat\'s Head',
      lead: `<p class='lead-text'>Dakṣa is the Prajāpati of competence: the "skilled one" whose sixty daughters married the Moon, Dharma, and the sage Kaśyapa to people the world — and whose flawless sacrifice, performed without Śiva, became the great cautionary tale of Indian religion.</p>`,
      cards: [
        { iconPath: ICONS.star, name: 'The Sixty Daughters', desc: 'Father of the Nakṣatras — the 27 lunar mansions are his girls, wed to the Moon.' },
        { iconPath: ICONS.flame, name: 'The Great Sacrifice', desc: 'The yajña to which Śiva was not invited — the snub that shattered heaven and earth.' },
        { iconPath: ICONS.mask, name: 'The Goat\'s Head', desc: 'His punishment and restoration: beheaded in the ruined rite, revived with the head of a goat.' },
        { iconPath: ICONS.wheel, name: 'Prajāpati', desc: '"Lord of progeny" — the office of populating the cosmos, held by a committee of the skilled.' },
      ],
    },
    symbols: [
      { name: 'The sacrificial post', meaning: 'The yūpa of his cosmic rite — order raised, then ruined by pride' },
      { name: 'The goat', meaning: 'His second head — humility grafted onto skill' },
      { name: 'The rosary', meaning: 'The Prajāpati\'s counting of creatures and years' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Dakṣa's cycle is the Indian study of procedure versus devotion: the man who performs the rite perfectly and loses everything because of who was left off the list.</p>`,
      myths: [
        { tag: 'The Marriage', title: 'Satī and the Ascetic', text: `<p class='myth-text'>His youngest daughter Satī loved Śiva — the ash-smeared wanderer whom Dakṣa considered no fit match for a Prajāpati's house. She married him anyway. When Dakṣa later held the greatest sacrifice of the age, he invited every god and every daughter except Śiva and Satī: the omission was deliberate, public, and meant.</p>` },
        { tag: 'The Fire', title: 'Satī\'s Self-Immolation', text: `<p class='myth-text'>Satī came uninvited to her father's rite and endured his contempt until she could not: declaring she would no longer wear a body born of one who insulted her lord, she entered the sacrificial fire and burned. The goddess tradition holds her fall sacred — her body, scattered in grief across the land, seeds the fifty-one Śakti Pīṭhas, the holiest map of Śakta India.</p>` },
        { tag: 'The Ruin', title: 'Vīrabhadra Unleashed', text: `<p class='myth-text'>Śiva tore a lock from his hair and cast down Vīrabhadra, who wrecked the sacrifice: Bhaga's eyes were knocked out, Pūṣan's teeth smashed, the gods routed — and Dakṣa beheaded. Only when the broken Prajāpati bowed in true devotion did Śiva restore him, setting a goat's head on his shoulders: skill survives, but only with a changed head.</p>` },
        { tag: 'The Moon', title: 'The Twenty-Seven Wives', text: `<p class='myth-text'>Dakṣa gave his twenty-seven daughters — the Nakṣatras, lunar stations — to the Moon, on condition he visit each equally. The Moon favoured Rohiṇī alone, and Dakṣa's curse made him wane: hence the moon's monthly dying. The waxing that follows is the gods' mitigation — even a Prajāpati's curse can be negotiated, never simply revoked.</p>` },
      ],
    },
    syncretism: `<p>As Prajāpati he absorbed and was absorbed by Brahmā: the Mahābhārata and Purāṇas shift "lord of progeny" between them until the offices blur. His daughter-lineages map the whole Purāṇic cosmos — through Kaśyapa's wives descend gods, demons, birds, and serpents; through Dharma's, the virtues. The Śakta tradition reframed his sacrifice entirely: not a tale of Śiva's wrath but of the Goddess's sovereignty, with Satī as the first self-offering.</p>`,
    culturalLegacy: `<p>The Dakṣa-yajña cycle is among the most retold stories in India — sculpture, dance-drama, and television epics return to it constantly — and the Śakti Pīṭha pilgrimage map it generates still organizes Śakta devotion. His name lives in the language: dakṣa/daksh remains the word for the capable professional, and the dakṣiṇā, the ritual fee "of the skilled hand," is paid at every Hindu rite today.</p>`,
    archaeology: `The Kankhal complex at Haridwar — the Daksha Mahadev temple and the Śrī Daksheśvara site on the Ganga — marks the traditional ground of the great sacrifice, continuously rebuilt from early times and renovated in 1810 and 1962. Satī's pīṭhas, from Kamakhya to Hinglaj, give the myth the largest sacred geography of any Indian story. Iconography shows him goat-headed in the act of worship — the humbled adept — in Purāṇic panels across the Deccan and the South.`,
    extendedMeditation: `<p>Dakṣa is the god of the flawless plan that fails. Everything at his sacrifice was correct — the altar, the mantras, the portions — except the heart that made the guest list. He asks of every institution that confuses procedure with worth: who have you left out, and what will their absence burn?</p>`,
    sources: [{ name: 'Mahabharata' }, { name: 'Shiva Purana' }, { name: 'Puranas' }, { name: 'Rigveda' }, { name: 'Monier-Williams' }, { name: 'MW' }],
  },

  dhatr: {
    pronunciationNote:
      'Sanskrit dhātṛ is an agent noun from the root dhā, "to set, place, establish," with the syllabic ṛ of the nominative — the vowel that is also a consonant, written ऋ. The restoration Dhātṛ keeps both the long ā and the vocalic ṛ that dictionaries print.',
    originalScriptNote: `<p>Written धातृ in Devanagari: dhā with its long vowel mark, then tṛ with the vocalic ṛ sign below. The root dhā underlies a family of cosmic-order words — dhāman (ordinance), dhārman (law), dhātu (element) — and the god is their shared agent.</p>`,
    domains: {
      title: 'The Establisher',
      subtitle: 'Ordinance, Creation, and the Set-Down World',
      lead: `<p class='lead-text'>Dhātṛ is the Vedic verb of creation made personal: "the Establisher," the one who sets the sun in the sky and the child in the womb. Where Brahmā would later be a personality, Dhātṛ is still a function radiant with worship — creation as the act of setting-down.</p>`,
      cards: [
        { iconPath: ICONS.sun, name: 'The Setter of Suns', desc: 'Ṛgveda 10.190: he established heaven and earth, the waters and the light.' },
        { iconPath: ICONS.scale, name: 'With Vidhātṛ', desc: 'Paired with the "Disposer" — the Establisher founds, the Disposer assigns each thing its law.' },
        { iconPath: ICONS.wheel, name: 'Dhātu', desc: 'His root-word: the elements of grammar and of medicine — the set-down units of reality.' },
        { iconPath: ICONS.egg, name: 'The Womb', desc: 'He "establishes the embryo" — creation biological as well as cosmic.' },
      ],
    },
    symbols: [
      { name: 'The measuring line', meaning: 'The demarcation by which the formless receives form' },
      { name: 'The lotus seat', meaning: 'Later iconography\'s gift to the establishing powers' },
      { name: 'The syllable dhā', meaning: 'The root as emblem — setting, placing, founding' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Dhātṛ's mythology is the Ṛgveda's creation poetry itself: he appears wherever the text needs not a story but the act — the setting of each thing in its station.</p>`,
      myths: [
        { tag: 'The Ordinance', title: 'Ṛgveda 10.190', text: `<p class='myth-text'>The hymn of creation names the sequence: from fervour was born order and truth, from them the night and the ocean; from the ocean the year, apportioning nights and days. "The Establisher (Dhātṛ), as he had made the sun and moon, established heaven and earth, the mid-air and the light" — creation as a series of settings, each thing fixed where it belongs.</p>` },
        { tag: 'The Pair', title: 'Dhātṛ and Vidhātṛ', text: `<p class='myth-text'>The Atharvaveda and Brāhmaṇas pair him with Vidhātṛ, the Disposer: one founds, one assigns — the joint authors of each being's fate, invoked together at marriage and birth rites. A man's fortune, the texts say, is "written on his forehead" by these two: the Indian image of destiny's inscription begins here.</p>` },
        { tag: 'The Succession', title: 'Becoming Brahmā', text: `<p class='myth-text'>In the later literature Dhātṛ's offices pass to Brahmā — the names are used almost interchangeably in the epics, "Dhātṛ and Vidhātṛ" becoming a formula for fate itself. It is the quietest succession in religion: the god does not die; his grammar is inherited. Every time the Purāṇas say "as fate ordained," the old Establisher is still at work under his successor's name.</p>` },
      ],
    },
    syncretism: `<p>Comparative philology hears his cognates across the Indo-European family: the root *dheh₁- gives Greek títhēmi ("I set") and English "do" — the Establisher's verb is one of the family's deepest. Within India he merges with Brahmā and, in the Smarta synthesis, with the abstract Brahman: the person dissolves into the principle. The Avestan dātā ("the Law-giver") is his Iranian counterpart in office if not in name.</p>`,
    culturalLegacy: `<p>His root-word dhātu became a foundational term of two civilizations of learning: Pāṇini's grammar organizes Sanskrit as a list of dhātus (verbal roots), and Āyurveda organizes the body as seven dhātus (tissue-elements). "Dhātṛ" survives as a name for fate in the vernaculars; the formula "dhātā-vidhātā" still opens Hindu birth-rite invocations. The idea that grammar and medicine share one word for "the set-down units" is his unnoticed monument.</p>`,
    archaeology: `An aniconic god leaves no temples: Dhātṛ's material trace is the textual tradition — the Ṛgveda manuscripts (among the world's oldest continuously transmitted texts, UNESCO Memory of the World) and the ritual manuals that prescribe his invocation. The birth-rites (garbhādhāna and jātakarman) where he and Vidhātṛ are called to establish the child's fortune are performed, archaeologically invisible but ethnographically continuous, to this day.`,
    extendedMeditation: `<p>Dhātṛ is the god of foundations — the moment a thing is set where it will stand. Language, law, the body, the year: all are "establishments" in his grammar. He asks the builder's question beneath every ambition: not what will you make, but where, truly, have you set it down?</p>`,
    sources: [{ name: 'Rigveda' }, { name: 'Brāhmaṇas' }, { name: 'Monier-Williams' }, { name: 'Macdonell' }, { name: 'MW' }, { name: 'Pokorny' }],
  },

  pusan: {
    pronunciationNote:
      'Sanskrit pūṣan carries the long ū of the root puṣ, "to thrive, nourish," with the retroflex ṣ that English tongues must learn — written पूषन् with the dot beneath the sibilant. The restoration Pūṣan marks both: the length on the root, the retroflex on the close.',
    originalScriptNote: `<p>Written पूषन् in Devanagari: pū with its long stroke, then ṣa with the retroflex dot, and the final n. The same root gives poṣa, "nourishment," and puṣṭi, "prosperity" — the god is thriving itself, shepherded into personhood.</p>`,
    domains: {
      title: 'The Guide of Roads',
      subtitle: 'Herds, Journeys, the Dead, and the Lost Tooth',
      lead: `<p class='lead-text'>Pūṣan is the Vedic herdsman-sun: guardian of cattle and roads, escort of brides to their weddings and souls to the fathers, the god who finds what is lost on the way. He carries a goad, rides a goat-drawn chariot, and eats gruel — because, the myth insists, he once lost his teeth.</p>`,
      cards: [
        { iconPath: ICONS.hoof, name: 'The Goad', desc: 'His attribute: the herdsman\'s prod that keeps the herd — and the journey — moving.' },
        { iconPath: ICONS.wave, name: 'The Road', desc: 'Paths of earth and paths of heaven: he knows "all the roads," the hymns repeat.' },
        { iconPath: ICONS.sun, name: 'The Psychopomp', desc: 'Ṛgveda 10.17 entrusts the dead to him: he conducts souls to the fathers.' },
        { iconPath: ICONS.mask, name: 'The Lost Teeth', desc: 'At Dakṣa\'s sacrifice his teeth were struck out — the gruel-eating god of the ruined rite.' },
      ],
    },
    symbols: [
      { name: 'The goad', meaning: 'Guidance by encouragement — the herdsman\'s gentle compulsion' },
      { name: 'The goat chariot', meaning: 'His humble vehicle among the horse-gods — the commoner\'s deity' },
      { name: 'The gruel', meaning: 'His toothless fare — karambha, the offering only he receives' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Pūṣan is the most companionable of Vedic gods: where others blaze, he accompanies. His myths are all journeys — of cattle, of brides, of the dead — and one memorable injury.</p>`,
      myths: [
        { tag: 'The Escort', title: 'Guide of Souls', text: `<p class='myth-text'>Ṛgveda 10.17 speaks to the dead with startling tenderness: "May Pūṣan take your hand and lead you; may the two Aśvins carry you in their chariot; go to the fathers, to the home that is yours." Pūṣan knows the road between the worlds because he drives it daily with the sun — the herdsman who loses no animal is the guide who loses no soul.</p>` },
        { tag: 'The Wedding', title: 'The Giving of Sūryā', text: `<p class='myth-text'>At the marriage of the Sun-maiden Sūryā — the Ṛgveda's great wedding hymn, still recited at Hindu weddings — Pūṣan is her kinsman-escort who takes her hand and gives her away. The hymn's phrases ("your hand for good fortune, Pūṣan takes") pass into the living rite: every Hindu bride is, liturgically, escorted by him still.</p>` },
        { tag: 'The Teeth', title: 'The Gruel of Dakṣa\'s Rite', text: `<p class='myth-text'>When Vīrabhadra wrecked Dakṣa's sacrifice, Pūṣan — eating the offering at the moment of ruin — had his teeth smashed. The Brāhmaṇas remember the wound in the liturgy: Pūṣan alone receives karambha, gruel, for he cannot chew. It is the Vedic taste for precise, comic piety: the god's injury written into the menu of his cult.</p>` },
        { tag: 'The Finding', title: 'Seeker of Lost Cattle', text: `<p class='myth-text'>The hymns beg him for the oldest pastoral miracle: "Pūṣan, bring back the strayed; Pūṣan, show us the road." He tracks by the sun's light, and the stolen, strayed, and hidden are his speciality — the Sarama legend of the rustled cosmic cattle belongs to his pastoral world, where finding is the sun's daily work.</p>` },
      ],
    },
    syncretism: `<p>Comparativists have long paired him with Greek Pan — the pastoral guardian with a likely cognate name (Pūṣan ~ Paon ~ Pan from a root of "watching over") — and with Hermês in function: herds, roads, and the escort of souls are Hermês' offices too. The equations are debated, not proven, and the tradition here reports them as scholarship, not scripture. Within the Veda he works in harness with Soma, Bhaga, and the Aśvins — the diplomat of the pantheon's second rank.</p>`,
    culturalLegacy: `<p>His liturgy survives wherever the Ṛgveda's wedding hymn is sung — which is to say, at millions of Hindu weddings every year. Journeys are still opened with his sūkta by the observant, and the "lost and found" of Indian folk prayer descends from his finding-office. In the history of religions he is the type-case of the pastoral solar guide — the comparison with Pan is in every textbook, making his name one of the bridges on which comparative mythology was built.</p>`,
    archaeology: `An aniconic Vedic god has no statues, but his world has strata: the pastoral economy of the Ṛgvedic Punjab — cattle-counts, drove-roads, the archaeology of the Painted Grey Ware and earlier Harappan cattle iconography — is the social ground of his cult. The goat-drawn chariot of his hymns is remembered in later folk vehicles of Rajasthani pastoral gods like Pabuji, whose own oral epic of rustled and recovered cattle keeps Pūṣan's oldest story-pattern alive.`,
    extendedMeditation: `<p>Pūṣan is the god of the way back. Not the destination — the road; not the feast — the gruel; not the blaze of noon — the light by which a lost thing is found. He asks the traveller's question that is also the shepherd's and the mourner's: what have you lost on the road, and who walks beside you while you look?</p>`,
    sources: [{ name: 'Rigveda' }, { name: 'Brāhmaṇas' }, { name: 'Monier-Williams' }, { name: 'Macdonell' }, { name: 'MW' }, { name: 'Pokorny' }],
  },

  tvastr: {
    pronunciationNote:
      'Sanskrit tvaṣṭṛ carries two retroflexes — the ṣ and the final syllabic ṛ — written त्वष्टृ in Devanagari. The name derives from the root tvakṣ, "to fashion, form," making him literally "the Fashioner": the oldest artisan theonym in the Indo-European record.',
    originalScriptNote: `<p>Written त्वष्टृ in Devanagari: tva with its conjunct, ṣa with the retroflex dot, and tṛ with the vocalic ṛ sign. The same root family gives takṣan, the carpenter — the god's name and the village craft are one word apart.</p>`,
    domains: {
      title: 'The Fashioner',
      subtitle: 'The Forge of the Gods, the Vajra, and the Avenging of a Son',
      lead: `<p class='lead-text'>Tvaṣṭṛ is the divine smith of the Ṛgveda: maker of Indra's thunderbolt, shaper of the soma cup, fashioner of wombs and forms — and the father whose grief over his slain son produced the greatest monster of Vedic myth.</p>`,
      cards: [
        { iconPath: ICONS.hammer, name: 'The Vajra', desc: 'He forged Indra\'s thunderbolt — the weapon that split the dragon\'s fortress.' },
        { iconPath: ICONS.serpent, name: 'Vṛtra\'s Father', desc: 'In grief he shaped the avenger: Vṛtra, born to kill Indra, by the rite gone wrong.' },
        { iconPath: ICONS.mask, name: 'Viśvarūpa', desc: 'His three-headed son, the gods\' priest, slain by Indra — the wound that drove the forge.' },
        { iconPath: ICONS.flame, name: 'The Soma Cup', desc: 'He fashioned the very cup from which the gods drink immortality.' },
      ],
    },
    symbols: [
      { name: 'The axe and chisel', meaning: 'The fashioner\'s tools — form struck from the formless' },
      { name: 'The cup', meaning: 'The soma vessel — liturgy\'s finest object, from his bench' },
      { name: 'The thunderbolt', meaning: 'His masterpiece: vajra, both weapon and symbol of the awakened mind' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Tvaṣṭṛ's cycle is the Vedic meditation on craft and consequence: the hands that make the weapons, the cups, and the children are the same — and what is made can turn on its maker's world.</p>`,
      myths: [
        { tag: 'The Weapon', title: 'Forging the Vajra', text: `<p class='myth-text'>When the dragon Vṛtra held the waters captive, Indra needed a weapon worthy of the deed: Tvaṣṭṛ forged the vajra, the bolt that smashed the ninety-nine fortresses and split the dragon's jaw. The Ṛgveda repeats the attribution like a signature — "the bolt that Tvaṣṭṛ made for thee" — the smith's name stamped on the pantheon's supreme weapon.</p>` },
        { tag: 'The Son', title: 'Viśvarūpa\'s Three Heads', text: `<p class='myth-text'>Tvaṣṭṛ's son Viśvarūpa — three-headed, six-eyed — served as priest of the gods while secretly feeding the anti-gods' share of the offerings. Indra struck off the heads; from them sprang the partridge, the sparrow, and the quail. The smith's grief at his son's death is the hinge of the whole cycle: the forge turns from weapons for the gods to a weapon against them.</p>` },
        { tag: 'The Avenger', title: 'The Making of Vṛtra', text: `<p class='myth-text'>Taittirīya Saṃhitā tells the terrible sequel: Tvaṣṭṛ performed a rite to create an avenger — but the accent of the mantra slipped. He meant "slayer of Indra" (indrā-śatru, with the accent of possession); the words came out "Indra-slain" — and Vṛtra, the monster he raised, was doomed by grammar to die by Indra's hand. The smith fashioned the weapon; the language fashioned the outcome.</p>` },
        { tag: 'The Daughter', title: 'Saraṇyū and the Shadow', text: `<p class='myth-text'>His daughter Saraṇyū married the Sun and, unable to bear his blaze, left her own shadow-image in her place and fled as a mare. The Sun discovered the substitution, followed as a stallion, and of their union were born the twin Aśvins. Tvaṣṭṛ's household thus generated the gods of healing and dawn — the fashioner's line shaping light itself.</p>` },
      ],
    },
    syncretism: `<p>He is India's Hephaestus in function — the lame-footed Greek smith and the Vedic fashioner are the classic comparative pair, and scholars note the shared motif of the artisan who arms both gods and their enemies. Later Hinduism merged him into Viśvakarman, "All-Maker," the architect of the universe: the Ṛgvedic name faded as the office expanded, until the carpenter's caste-god absorbed the ancient smith entirely.</p>`,
    culturalLegacy: `<p>Viśvakarman Pūjā — the festival when artisans, engineers, and factory workers worship their tools — is his living descendant, kept across industrial India every September. His name survives in linguistic memory: takṣan (carpenter), and the Takṣaka serpent-lineages of epic, carry the root. The Vṛtra story's famous "accent that doomed a monster" is the standard classroom example of why the Veda guards its phonetics: in the oldest liturgy, pronunciation is destiny.</p>`,
    archaeology: `An aniconic Ṛgvedic god has no image-strata, but his craft does: the copper-bronze technology of the Harappan world — the lost-wax dancing girl, the forged tools of Chanhu-daro — is the material background of the Age in which a smith could be a god. The Viśvakarman iconography of later temple sculpture (the white-bearded architect with his tools, at Vijayanagara and across the Deccan) gives the ancient fashioner his visible afterlife.`,
    extendedMeditation: `<p>Tvaṣṭṛ is the god of what your hands release. The bolt, the cup, the child, the monster — all leave the bench and live their own lives. His myth's terrible precision is that the rite made the weapon and the word unmade it: craft, he teaches, is only half of making; the other half is the intention the world will read in what you made.</p>`,
    sources: [{ name: 'Rigveda' }, { name: 'Brāhmaṇas' }, { name: 'Monier-Williams' }, { name: 'Macdonell' }, { name: 'MW' }, { name: 'Pokorny' }],
  },

  // ── Chinese ──────────────────────────────────────────────────────────────
  fuxi: {
    pronunciationNote:
      'Fúxī 伏羲 carries the rising tone on both syllables in Mandarin; older romanizations write Fu-hsi. The first graph 伏 suggests "to subdue, to prostrate," the second 羲 a sacrificial term — a name older than its etymologies, borne by the first of the Three August Ones.',
    originalScriptNote: `<p>Written 伏羲: fú (subdue; the man-radical with the hound) plus xī (the ancient graph for sacrificial breath). The compound is attested from Warring States texts onward — the name predates any agreed reading of it, which is itself a mark of antiquity.</p>`,
    domains: {
      title: 'The First Teacher',
      subtitle: 'The Eight Trigrams, the Net, and the Marriage on the Mountain',
      lead: `<p class='lead-text'>Fúxī is where Chinese civilization says it learned to think: the sage-king who looked up at the heavens, down at the earth, and at the markings on birds and beasts — and abstracted the eight trigrams, the first writing of pattern itself.</p>`,
      cards: [
        { iconPath: ICONS.trigram, name: 'The Eight Trigrams', desc: 'Bāguà: broken and unbroken lines in threes — the binary alphabet of the Yìjīng, attributed to his observation.' },
        { iconPath: ICONS.knot, name: 'The Net', desc: 'He taught the people to knot cords into nets — fishing, hunting, and the technology of the snare.' },
        { iconPath: ICONS.serpent, name: 'The Serpent Bodies', desc: 'Han art shows him and Nǚwā as serpents intertwined — the primal pair, measuring square and compass in hand.' },
        { iconPath: ICONS.scale, name: 'Marriage', desc: 'He instituted the rites of marriage and the bride-price of deer skins — order after the flood.' },
      ],
    },
    symbols: [
      { name: 'The trigrams', meaning: 'Pattern abstracted from nature — the seed of all Chinese correlative thought' },
      { name: 'The carpenter\'s square', meaning: 'His emblem in Han art: the earth-measurer\'s tool (Nǚwā holds the compass of heaven)' },
      { name: 'The dragon-horse', meaning: 'The creature from the Yellow River whose markings revealed the diagram' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Fúxī's myths are all acts of notation: he does not fight or flee — he observes, abstracts, and teaches. He is the culture-bringer as draftsman.</p>`,
      myths: [
        { tag: 'The Diagram', title: 'Reading the World', text: `<p class='myth-text'>The Yìjīng's Great Treatise records the founding act: Fúxī looked up and contemplated the images of heaven, looked down and contemplated the patterns of earth, contemplated the markings of birds and beasts and the order of the near at hand — and from all three made the eight trigrams, "to comprehend the powers of the spirits and to classify the natures of the ten thousand things." Writing, mathematics, and divination begin as one gesture of attention.</p>` },
        { tag: 'The River', title: 'The Dragon-Horse\'s Map', text: `<p class='myth-text'>Later tradition gives the revelation a courier: a dragon-horse rose from the Yellow River bearing on its back the Hétú, the River Chart — the arrangement of numbers and marks from which Fúxī drew the trigrams. Paired with the Luò River Writing that inspired the Great Plan, the Chart made the Yellow River itself the first text of Chinese civilization.</p>` },
        { tag: 'The Flood', title: 'The Brother-Sister Marriage', text: `<p class='myth-text'>In the flood myth recorded among the Miao and in Tang collections, Fúxī and Nǚwā alone survive the waters, taking refuge on Mount Kūnlún. Brother and sister, they divine heaven's will by rolling millstones and watching smoke columns join — and consent to marry, repopulating the drowned world. The myth explains both marriage's institution and humanity's second beginning.</p>` },
        { tag: 'The Arts', title: 'Nets, Music, and Domestication', text: `<p class='myth-text'>The tradition credits him with the survival-arts in sequence: knotting cords into nets for fishing and hunting, keeping domestic animals (hence one reading of his name, "subduer of beasts"), making the thirty-five-stringed se zither, and fixing the marriage rites. Civilization, in his legend, is a curriculum — and he is its whole faculty.</p>` },
      ],
    },
    syncretism: `<p>He heads most lists of the Three August Ones (Sānhuáng), paired inseparably with Nǚwā — their intertwined serpent forms in Han art echoing, scholars note, the union of measure and generation. Daoist tradition absorbed him as a revealer of the trigrams to the immortal lineages; Confucian tradition kept him as the first historian of pattern. The serpent-pair iconography has been compared by art historians with intertwined pairs from Egypt to India — diffusion debated, the resemblance celebrated.</p>`,
    culturalLegacy: `<p>Every reading of the Yìjīng — the book that shaped Confucian statecraft, Daoist alchemy, and Leibniz's binary arithmetic — begins with his act of looking. The eight trigrams appear on the flag of South Korea; the River Chart structures a millennium of cosmological diagrams; and "Fúxī" remains the standard icon for the inventor-ancestor in Chinese cultural memory, the answer to the question of where pattern-thinking began.</p>`,
    archaeology: `The Wu Liang shrine reliefs (2nd century CE, Shandong) show Fúxī and Nǚwā with serpent bodies entwined, square and compass raised — the canonical image, replicated across Han tomb art from Sichuan to Xinjiang (the famous Astana cemetery banner). The myth's textual archaeology runs from the Zhuangzi and Xunzi mentions to the Tang's flood-cycle records: a steady accretion from sage-king to cosmic progenitor, all preserved in the transmitted classics.`,
    extendedMeditation: `<p>Fúxī is the patron of the second look — the one that sees not the thing but the pattern. His trigrams are only broken and unbroken lines, yet a civilization read everything in them for three thousand years. He asks the observer's question: what in the world are you willing to look at long enough that it begins, at last, to read back?</p>`,
    sources: [{ name: 'I Ching' }, { name: 'Shiji' }, { name: 'Birrell' }, { name: 'Chinese classics' }, { name: 'Shan Hai Jing' }, { name: 'Chinese folklore' }],
  },

  guanyin: {
    pronunciationNote:
      'Guānyīn 观音 means "Perceiver of Sounds" — the one who hears the cries of the world, a rendering of Avalokiteśvara\'s name as the Chinese translators analyzed it. The level tone on guān and the falling-level yīn are among the most recognized syllables in East Asian devotion.',
    originalScriptNote: `<p>Written 观音 in simplified, 觀音 in traditional characters: guān (to observe, with the seeing radical) plus yīn (sound). The fuller liturgical name 观世音 (Guānshìyīn, "Perceiver of the World\'s Sounds") preserves the whole Sanskrit sense.</p>`,
    domains: {
      title: 'The One Who Hears',
      subtitle: 'Compassion, the Lotus Sūtra, and the Cries of the World',
      lead: `<p class='lead-text'>Guānyīn is the most beloved figure of East Asian Buddhism: the bodhisattva who vows to hear every cry of suffering in the world and answer it. Born in India as the male Avalokiteśvara, she became, in China, a mother — and compassion itself found its lasting face.</p>`,
      cards: [
        { iconPath: ICONS.lotus, name: 'The Lotus', desc: 'Her seat and symbol: purity flowering unsullied from the mud of the world.' },
        { iconPath: ICONS.wave, name: 'The Vase', desc: 'The pure vase with willow branch — the dew of compassion sprinkled on the suffering.' },
        { iconPath: ICONS.eye, name: 'A Thousand Eyes', desc: 'The thousand-armed form: an eye in every palm — to see and to reach, without limit.' },
        { iconPath: ICONS.mountain, name: 'Putuoshan', desc: 'Her island mountain off Zhejiang: the Potalaka of the sūtras, anchored in the Chinese sea.' },
      ],
    },
    symbols: [
      { name: 'The willow branch', meaning: 'Gentleness that bends and does not break — sprinkled with the dew of mercy' },
      { name: 'The pure vase', meaning: 'The nectar of compassion, poured without end' },
      { name: 'The child in her arms', meaning: 'The Songzi Guānyīn — giver of children, mother of the vow' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Guānyīn's "myths" are vows and legends of response: the sūtra promises that whoever calls her name in danger will be heard — and Chinese legend supplies a thousand proofs.</p>`,
      myths: [
        { tag: 'The Vow', title: 'The Universal Gateway', text: `<p class='myth-text'>Chapter 25 of the Lotus Sūtra — circulated independently as the Guānyīn Sūtra — makes the vow explicit: if beings in danger from fire, flood, demons, or the executioner's blade call on the name of Guānshìyīn, the bodhisattva will at once perceive the sound and deliver them. It is the most recited chapter in East Asian Buddhism: compassion as a cosmic emergency line.</p>` },
        { tag: 'The Princess', title: 'Miàoshàn', text: `<p class='myth-text'>The Chinese legend that made her a daughter: Princess Miàoshàn refuses marriage to seek awakening, endures her father's destruction of her convent, and is executed — descending to hell, which her compassion turns to a paradise of flowers. When her father lies dying of a karmic illness, she gives her own eyes and arms for the medicine; revealed as the thousand-armed, thousand-eyed Guānyīn, she forgives him, and the king becomes her devotee.</p>` },
        { tag: 'The Crossing', title: 'Avalokiteśvara Comes East', text: `<p class='myth-text'>The Indian bodhisattva of compassion — "the Lord who looks down" — entered China with the first sūtras and slowly changed form: male in the early translations, androgynous in Tang art, unmistakably a white-robed woman by the Song. The transformation, among the most studied in religious history, is usually read as compassion's logic: the vow to hear suffering answered, in China, in a mother's voice.</p>` },
      ],
    },
    syncretism: `<p>She is the great syncretist of East Asia: in Tibet she is Chenrezig, patron of the land, incarnate in the Dalai Lamas; in Japan Kannon, with temples from Asakusa to Kiyomizu; in Vietnam Quan Âm. Chinese folk religion fused her with the Queen of Heaven and associated her with Mazu the sea-goddess; Daoism canonized her as Cihang Zhenren; and she entered the Journey to the West as the pilgrimage's divine patron, who recruits the pilgrims and rescues them whenever heaven's bureaucracy fails.</p>`,
    culturalLegacy: `<p>Her name is spoken daily by more people than perhaps any other divine name on earth: nāmó Guānshìyīn Púsà is East Asia's universal cry in fear and gratitude. Putuoshan draws millions of pilgrims yearly; her statues — from the Suma temple Kannon to the hundred-metre Guānyīn of the South Sea of Sanya — rank among the largest on earth. Vegetarian mercy, lifesaving charities, and countless hospitals across the Chinese world bear her vow.</p>`,
    archaeology: `Putuoshan's three great monasteries (Puji, Fayu, Huiji) preserve her island cult from its 10th-century founding, when a Japanese monk's Kannon image refused to sail on and stayed. Dunhuang's Mogao caves hold her earliest Chinese icons — the guide-of-souls Guānyīn leading the dead, the thousand-armed forms of the Tang. The Northern Song colossal bronze thousand-armed Kannon cast in Japan and the Song-dynasty polychrome "Water-Moon Guānyīn" figures — of which the Nelson-Atkins example is the most celebrated — mark her iconography's golden age.`,
    extendedMeditation: `<p>Guānyīn is the vow that hearing comes first. Not judgment, not power — attention: the sounds of the world, all of them, answered. She asks the question that closes every sūtra about her: in a world crying out in a billion voices, what does it take to be one who hears?</p>`,
    sources: [{ name: 'Lotus Sutra' }, { name: 'Chinese Buddhist canon' }, { name: 'Chinese Buddhist texts' }, { name: 'Birrell' }, { name: 'Chinese folklore' }, { name: 'Buddhist texts' }],
  },

  mengpo: {
    pronunciationNote:
      'Mèngpó 孟婆 means "Old Lady Meng": mèng in the falling tone, a surname suggesting seniority; pó, "grandmother, old woman," in the rising tone. The name belongs to folk religion rather than scripture — which is why its spelling never needed the scholar\'s precision the goddess herself so carefully erases.',
    originalScriptNote: `<p>Written 孟婆: Mèng (eldest; a surname) above pó (old woman, with the woman radical). Her name appears in Ming and Qing fiction and in the vivid bureaucratic cosmologies of Chinese folk religion — a goddess documented by storytellers rather than canonized by councils.</p>`,
    domains: {
      title: 'The Tea of Oblivion',
      subtitle: 'The Bridge, the Brew, and the Mercy of Forgetting',
      lead: `<p class='lead-text'>Mèngpó keeps the last station of the Chinese underworld: at the Nàihé Bridge, where souls cross to rebirth, she serves her five-flavored tea — and every soul that drinks forgets its life, its loves, and its griefs, clean for the next beginning.</p>`,
      cards: [
        { iconPath: ICONS.vase, name: 'The Five Flavors', desc: 'Sweet, sour, bitter, pungent, salty — the whole of a life, steeped into one last cup.' },
        { iconPath: ICONS.gate, name: 'Nàihé Bridge', desc: 'The "Bridge of No Alternative": every soul crosses, and none crosses back remembering.' },
        { iconPath: ICONS.scroll, name: 'The Records', desc: 'Yánluó\'s courts judge the life; her tea releases it — bureaucracy\'s final kindness.' },
        { iconPath: ICONS.wave, name: 'The River of Forgetfulness', desc: 'China\'s own Lethe — the waters beneath the bridge that wash the old self away.' },
      ],
    },
    symbols: [
      { name: 'The teapot', meaning: 'Her instrument: oblivion brewed with care, not inflicted' },
      { name: 'The bowl', meaning: 'The single serving every soul receives — neither more nor less' },
      { name: 'The bridge', meaning: 'The crossing between judgment and rebirth, where memory ends' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Mèngpó's myth is a single scene, retold for centuries: the old woman, the bridge, the bowl — the gentlest moment in the whole machinery of the afterlife.</p>`,
      myths: [
        { tag: 'The Office', title: 'The Last Station', text: `<p class='myth-text'>Chinese folk cosmology orders the underworld like an administration: Yánluó's ten courts judge the deeds of the life, assign the punishments and the repayments — and then send the soul to Mèngpó. At the Nàihé Bridge she ladles her tea of five flavors; the soul drinks, and the record of the life — the loves, the hatreds, the unfinished business — dissolves. Only then is it fit to be reborn.</p>` },
        { tag: 'The Legend', title: 'Why She Serves', text: `<p class='myth-text'>Folk tellings give her a biography: she was, some say, a woman of the mortal world who grieved her dead so deeply that heaven gave her this office — that no other soul need carry grief across the boundary. Others make her a wind-spirit of antiquity, or a servant of the underworld's lord promoted for her gentle hand. The variants agree on the point: the one who erases memory does it out of mercy, having known what memory costs.</p>` },
        { tag: 'The Refusal', title: 'Those Who Will Not Drink', text: `<p class='myth-text'>The tales always leave a door: a soul that refuses the tea, or spills it, carries fragments across — and is born with a birthmark, a déjà vu, a face it cannot forget. Chinese fiction is full of such revenants: lovers recognizing lovers across lifetimes, enemies resuming ancient quarrels, all because one soul at the bridge would not finish the bowl. Memory, in the folklore, is a debt carried by the stubborn.</p>` },
      ],
    },
    syncretism: `<p>She is the folk fusion at its most organic: Buddhist rebirth doctrine, Daoist underworld bureaucracy, and village storytelling meet in her bowl. Comparative scholars line her up beside Lethe — the Greek river of forgetfulness the dead must drink — noting that two civilizations independently decided memory cannot survive rebirth. In modern Chinese media she has become a star: films, songs, and web novels cast her as the melancholy romantic of the underworld, the goddess who remembers everything precisely so that others may forget.</p>`,
    culturalLegacy: `<p>"Mèngpó's soup" (孟婆汤) is a living idiom for oblivion — offered ruefully at partings and breakups across the Chinese internet. Her imagery saturates East Asian popular culture: the Nàihé Bridge scene is a fixture of afterlife drama from opera to anime-adjacent fantasy. The deeper legacy is conceptual: she embodies a mercy the modern world debates — whether healing requires forgetting — and gives the debate a face, a bridge, and a bowl.</p>`,
    archaeology: `A folk goddess has no canonical temple archive, but her cosmology has monuments: the Fengdu ghost city on the Yangtze — China's "capital of the underworld" — preserves the Nàihé Bridge in stone, crossed by pilgrims and tourists for centuries, with its three arches for the virtuous, the ordinary, and the damned. Ming-Qing underworld scroll-paintings and the woodblock illustrations of the Jade Record (Yùlì) show her at her station, ladle in hand, among the ten courts' bureaucrats.`,
    extendedMeditation: `<p>Mèngpó is the goddess of letting go. Every tradition knows that some memories are poison; she alone made the antidote an act of hospitality — a cup of tea, served by a grandmother, at the bridge. She asks the question every grief eventually reaches: what would it cost you to forget — and what would it cost you to remember forever?</p>`,
    sources: [{ name: 'Chinese folk religion' }, { name: 'Chinese folklore' }, { name: 'Teiser' }, { name: 'Birrell' }, { name: 'Chinese Buddhist texts' }, { name: 'Fengshen Yanyi' }],
  },

  nuwa: {
    pronunciationNote:
      'Nǚwā 女娲 bears the third tone on nǚ — the vowel ü written with its two dots, which the restoration keeps and plain ASCII drops. Wā is the level-toned archaic graph for this goddess alone: a character invented for her name, used for nothing else in the language.',
    originalScriptNote: `<p>Written 女娲: nǚ (woman) plus wā — a graph so specific to her that dictionaries list almost no other word under it. The ü of the restoration is the sound itself; without it, the name is another word.</p>`,
    domains: {
      title: 'The Mender of Heaven',
      subtitle: 'The Five-Colored Stones, the Clay, and the First People',
      lead: `<p class='lead-text'>Nǚwā is the great repairer: the goddess who melted five-colored stones to patch the broken sky, cut off the giant turtle's legs to prop the corners of the world, and — on a quieter day — knelt by the Yellow River and made the first human beings out of mud.</p>`,
      cards: [
        { iconPath: ICONS.stone, name: 'The Five-Colored Stones', desc: 'Melted and poured into the sky\'s wound — the world\'s first and greatest repair.' },
        { iconPath: ICONS.serpent, name: 'The Serpent Body', desc: 'Her form in Han art: human head, serpent body — earth\'s maker in earth\'s image.' },
        { iconPath: ICONS.knot, name: 'The Rope of Mud', desc: 'The rich she shaped by hand, the poor she flung from a rope — humanity\'s two fortunes.' },
        { iconPath: ICONS.scale, name: 'The Marriage Rites', desc: 'She instituted marriage and is prayed to for children — society\'s first legislator.' },
      ],
    },
    symbols: [
      { name: 'The five colors', meaning: 'The five phases (wood, fire, earth, metal, water) — the sky rebuilt in cosmic order' },
      { name: 'The compass', meaning: 'Her emblem in Han art, paired with Fúxī\'s square — heaven\'s measure in her hand' },
      { name: 'The turtle\'s legs', meaning: 'The four pillars she cut and set — sacrifice repurposed as architecture' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Nǚwā's two great myths answer the two great questions: where people came from, and why the sky holds. Both are told in the earliest strata of Chinese myth and never improved upon.</p>`,
      myths: [
        { tag: 'The Catastrophe', title: 'The Mending of the Sky', text: `<p class='myth-text'>The Huáinánzǐ tells it: in high antiquity the four pillars snapped, the nine provinces split; fire raged unquenched, waters rose undrained; fierce beasts devoured the people. Nǚwā melted stones of five colors to mend the azure sky, cut the legs of the great turtle to set the four pillars, slew the black dragon to save Jì province, and heaped reed-ashes to dam the flood. Then — and only then — the world was habitable, and the beasts went quiet.</p>` },
        { tag: 'The Creation', title: 'People of Yellow Earth', text: `<p class='myth-text'>The later compendia preserve the gentler myth: Nǚwā, walking alone in the empty world, knelt by the river and shaped human beings from yellow clay. The work delighted but wearied her — so she trailed a rope through the mud and flung the drops, which became people too. The handmade figures became the rich and noble; the rope-flung drops, the poor and common — China's oldest reflection on how inequality began.</p>` },
        { tag: 'The Institution', title: 'The First Matchmaker', text: `<p class='myth-text'>Having made people singly, she made them continuous: Nǚwā instituted marriage and the go-between, so that humanity could reproduce itself without her kneeling by the river forever. She is therefore prayed to for children and for marriages — the goddess who outsourced creation to love. The tradition names her among the Three August Ones: progenitor, legislator, and engineer in one.</p>` },
      ],
    },
    syncretism: `<p>She pairs with Fúxī as sister-wife in the Han synthesis — their intertwined serpent bodies, compass and square in hand, form the canonical image of cosmic order — and she absorbs older creation figures as the myth spread south and north. Modern readers note her kinship with every world-mother from Gaia to the Navajo Changing Woman, but the Chinese tradition keeps her distinct signature: she is not just a mother but a repairer, the goddess of maintenance.</p>`,
    culturalLegacy: `<p>Her stones became literature: the great novel Dream of the Red Chamber (Hónglóu mèng) opens with the one stone Nǚwā rejected for the sky — the stone that becomes the hero's jade and the book itself. "Nǚwā mends the sky" is the standing idiom for heroic repair; engineers, surgeons, and diplomats are all praised with it. Temples to her survive across North China — Shexian's cliff-hanging Wahuang Palace in Hebei is the grandest — where she is still prayed to for children.</p>`,
    archaeology: `The Wahuang Palace at Shexian — pavilions chained to a cliff above the Zhang River, founded in the Northern Qi dynasty (6th century) — is her principal surviving sanctuary and one of China's architectural marvels. Han pictorial stones pair her with Fúxī from Shandong to Sichuan; the Astana cemetery silk banner carried the image to the Silk Road's far end. Her myth's textual strata are mapped from the Huáinánzǐ (139 BCE) backward into Warring States fragments and forward into the Tang flood-cycle accounts.`,
    extendedMeditation: `<p>Nǚwā is the goddess of the second day — the one after the catastrophe. Creation, in her myth, is not a single word but a continuous mending: sky patched, pillars reset, people shaped and taught. She asks the question every survivor, every parent, every civilization must answer: the world broke once; what, with your own two hands, have you repaired?</p>`,
    sources: [{ name: 'Huainanzi' }, { name: 'Birrell' }, { name: 'Shiji' }, { name: 'Shan Hai Jing' }, { name: 'Chinese classics' }, { name: 'Chinese folklore' }],
  },

  pangu: {
    pronunciationNote:
      'Pángǔ 盘古 carries the rising tone on páng and the dipping third tone on gǔ ("antiquity"); the name pairs "coiling" with "ancient" — the coiled one of the primordial egg. Written 盤古 in traditional characters, it is Chinese myth\'s youngest great name: the giant is attested only from the 3rd century CE.',
    originalScriptNote: `<p>Written 盘古 (盤古 traditional): pán (coil, tray, the great basin) plus gǔ (ancient). The graphs describe him exactly — the coiled giant of antiquity, curled inside the cosmic egg before there was a world to be ancient in.</p>`,
    domains: {
      title: 'The First Giant',
      subtitle: 'The Egg, the Eighteen Thousand Years, and the Body of the World',
      lead: `<p class='lead-text'>Pángǔ is China's creation made flesh: the giant who grew for eighteen thousand years inside the cosmic egg, pushed heaven and earth apart with his own body, and — dying at last — became the world itself: his eyes the sun and moon, his breath the wind, his voice the thunder.</p>`,
      cards: [
        { iconPath: ICONS.egg, name: 'The Cosmic Egg', desc: 'Chaos like a hen\'s egg — and Pángǔ born within it, the first form in the formless.' },
        { iconPath: ICONS.mountain, name: 'The Separation', desc: 'Heaven rose ten feet daily, earth thickened ten feet, and he grew between them — 18,000 years of pushing.' },
        { iconPath: ICONS.sun, name: 'The Transformation', desc: 'His body becomes the world: eyes to sun and moon, limbs to mountains, blood to rivers.' },
        { iconPath: ICONS.hammer, name: 'The Chisel and Axe', desc: 'Folk art arms him with the tools of separation — the first worker, carving sky from stone.' },
      ],
    },
    symbols: [
      { name: 'The egg', meaning: 'Chaos as potential — the undivided whole that must crack to become a world' },
      { name: 'The horns', meaning: 'His folk-iconography — the shaggy, horned giant of the first morning' },
      { name: 'The pillars of his limbs', meaning: 'The four limbs as the four sacred mountains — the body as geography' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Pángǔ's myth exists in two sentences of immense consequence, recorded by Xú Zhěng in the 3rd century CE — and expanded by a civilization into its canonical account of how the world began.</p>`,
      myths: [
        { tag: 'The Egg', title: 'Three-Five Calendar Record', text: `<p class='myth-text'>Xú Zhěng's Sānwǔ lìjì gives the founding text: "Heaven and earth were chaos like a hen's egg, and Pángǔ was born within it. After eighteen thousand years, heaven and earth opened: the bright, light qì rose to become heaven; the dark, heavy qì sank to become earth. Pángǔ stood between them, changing nine times daily — heaven rising ten feet a day, earth thickening ten feet, and Pángǔ growing ten feet — for eighteen thousand years more."</p>` },
        { tag: 'The Death', title: 'The Body Becomes the World', text: `<p class='myth-text'>When the separation was fixed, Pángǔ died — and the transformation began: his breath became wind and cloud, his voice thunder, his left eye the sun and his right the moon, his four limbs the four sacred mountains, his blood the rivers, his veins the roads, his flesh the soil, his hair the stars, his skin and body-hair grass and trees, his sweat rain — and, in the most anthropologically piquant line, his fleas and lice, quickened by the wind, became the black-haired people.</p>` },
        { tag: 'The Late Arrival', title: 'China\'s Youngest Creator', text: `<p class='myth-text'>The myth's strangest fact is its date: no pre-Han text mentions Pángǔ, and scholars trace his entry through southern traditions — the Yao and Miao genealogies of the dog-ancestor Pán Hù, phonetically adjacent — absorbed and cosmicized in the Wei-Jin centuries. China's canonical creation is thus a relative newcomer, adopted so completely that every schoolchild now learns it as the oldest story.</p>` },
      ],
    },
    syncretism: `<p>The Pángǔ–Pán Hù debate is one of Chinese mythology's famous problems: the southern dog-ancestor of the Yao and She peoples and the cosmic giant share a syllable and a region, and scholars from the Republican era onward have argued transmission in both directions. Comparative mythology places him with the dismembered primordial beings — Vedic Púruṣa, Norse Ymir — whose bodies become worlds: China's version is distinctive for making the giant's death not a murder but a completion.</p>`,
    culturalLegacy: `<p>"Since Pángǔ separated heaven and earth" is the standard Chinese formula for "since the beginning of time," and his myth opens every children's account of Chinese prehistory. The transformation — body to landscape — gave Chinese poetry one of its deepest image-families, the mountain-as-body. UNESCO-listed school textbooks, animated films, and the giant's statues across southern China (Henan's Tongbai county claims his birthplace) keep the youngest creator as the most familiar.</p>`,
    archaeology: `No cult-temple of Pángǔ predates the myth's literary arrival, but his material afterlife is real: the Pángǔ temples of Tongbai (Henan) and the southern shrines of Guangdong and Guangxi mark the festival of his "birth" in the tenth lunar month. The textual archaeology is exact — Xú Zhěng's Sānwǔ lìjì and the Wǔyùn lìnián jì (both 3rd century, preserved in encyclopedias) are the two struts of the whole tradition, and the history of their quotation is the history of the myth itself.`,
    extendedMeditation: `<p>Pángǔ is the god of the long work: eighteen thousand years of pushing, unnoticed, until the sky stayed up on its own. He never saw the world he made — he became it. He asks of everyone engaged in slow, unglamorous creation: what are you growing between the heaven and the earth of your time — and will it stand when you are done?</p>`,
    sources: [{ name: 'Xu Zheng' }, { name: 'Birrell' }, { name: 'Shiji' }, { name: 'Chinese classics' }, { name: 'Chinese folklore' }, { name: 'Shan Hai Jing' }],
  },

  yanluo: {
    pronunciationNote:
      'Yánluó 阎罗 abbreviates Yánluówáng 阎罗王, "King Yama" — the Sanskrit Yamarāja worn down by two millennia of Chinese speech. The second tone on yán and the rising luó are fixed by tradition; the full Sanskrit form survives in Buddhist ritual language beside the everyday king.',
    originalScriptNote: `<p>Written 阎罗 (simplified) / 閻羅 (traditional): the gate-radical graphs chosen purely for sound, transcribing Yama-. The Chinese name is thus a phonetic fossil of the Silk Road — Sanskrit carried into characters, then naturalized so completely that most speakers never know it was a loanword.</p>`,
    domains: {
      title: 'The Judge of the Dead',
      subtitle: 'The Ten Courts, the Record Books, and the Mirror of Deeds',
      lead: `<p class='lead-text'>Yánluó is the magistrate at the centre of the Chinese afterlife: the Indian god Yama enthroned in a Chinese courtroom, judging the dead from their own record books. Before him, the myth insists, wealth and rank are nothing — the only evidence is what you did.</p>`,
      cards: [
        { iconPath: ICONS.scale, name: 'The Record Books', desc: 'The registers of life and death: every deed entered, nothing argued away.' },
        { iconPath: ICONS.eye, name: 'The Mirror', desc: 'The karma-mirror that shows each soul its own actions — the courtroom\'s only witness.' },
        { iconPath: ICONS.gate, name: 'The Ten Courts', desc: 'Dìyù\'s bureaucracy: ten tribunals, his the fifth and most feared.' },
        { iconPath: ICONS.scroll, name: 'The Ledger of Lifespan', desc: 'He holds the book of allotted years — the deadline no bribe extends.' },
      ],
    },
    symbols: [
      { name: 'The judge\'s cap', meaning: 'The Chinese magistrate\'s hat on an Indian god — the Silk Road in one image' },
      { name: 'The brush', meaning: 'The instrument of the verdict — deaths recorded, sentences written' },
      { name: 'The ox-head and horse-face', meaning: 'His bailiffs: the two wardens who fetch the souls of the dead' },
    ],
    mythology: {
      lead: `<p class='lead-text'>Yánluó's mythology is procedural: not adventures but cases. His stories are judgments — and the judgments are always, the texts insist, simply the soul's own deeds read back to it.</p>`,
      myths: [
        { tag: 'The Origin', title: 'Yama, the First Mortal', text: `<p class='myth-text'>Before he was a king of hell he was the first man to die: the Ṛgveda's Yama chose mortality, found the road to the other world, and became the guide and host of the fathers — honoured with songs and offerings. Buddhism inherited him as the dharma-king who interrogates the dead: the three messengers — old age, sickness, death — are his summonses, sent to every house.</p>` },
        { tag: 'The Court', title: 'The Fifth Tribunal', text: `<p class='myth-text'>The Chinese Ten Kings system, formed by the Tang, stations Yánluó in the fifth court — the great reckoning after the first four screenings. There the record books are opened, the mirror of deeds is raised, and the verdict is assigned: paradise, rebirth, or the numbered hells. One legend says he once held the first court but was demoted for leniency — even the king of the dead is audited.</p>` },
        { tag: 'The Mercy', title: 'Bao Zheng on the Bench', text: `<p class='myth-text'>Chinese folklore kept electing incorruptible mortals to his office: the Song-dynasty judge Bao Zheng — "Justice Bao" of a hundred operas — was said to judge the living by day and the dead by night as Yánluó's incarnation. The identification is the myth's message: the perfect magistrate is already doing the underworld's work, and the underworld is only the courtroom made honest.</p>` },
      ],
    },
    syncretism: `<p>He is the supreme case of Buddhist localization: Yama became Yánluó in China, Enma in Japan (with his own mirror and the red-faced scowl of a thousand temple gates), Yeomna in Korea, and the judges of Vietnamese and Central Asian afterlives. Daoism staffed his courts with its own celestial bureaucrats; folk religion added Mèngpó's tea and the City God as his local deputies. The whole edifice — Indian god, Chinese paperwork, village morality — is East Asia's most successful religious import.</p>`,
    culturalLegacy: `<p>"Meeting Yánluó" (见阎罗) remains the everyday Chinese idiom for dying; "Yánwáng ye" names any pitiless authority. Japanese Enma anchors a thousand festivals and anime (Jigoku Shōjo's Enma Ai made him a household name to a new century). The judgment imagery — mirror, ledger, no bribes — shaped East Asian ethics as deeply as any scripture: a whole civilization's conscience, staffed by one borrowed god.</p>`,
    archaeology: `The Ten Kings paintings — sets of hanging scrolls showing each court — survive from the Ningbo workshops of the 12th–13th centuries (the finest sets in Nara and the Metropolitan Museum), with Yánluó's tribunal at their dramatic centre. Fengdu ghost city's temples stage the full bureaucratic underworld in statuary. Dunhuang documents preserve the Sūtra of the Ten Kings, the charter-text of the whole system, copied in tens of thousands for the dead's benefit.`,
    extendedMeditation: `<p>Yánluó is the god of the life review. His court invents nothing and forgives nothing; it only reads — and the terror and the comfort are the same: the record is exact. He asks the question his mirror has posed for two thousand years: if the book of your deeds were opened tonight, would you need a lawyer — or only a witness?</p>`,
    sources: [{ name: 'Rigveda' }, { name: 'Chinese Buddhist canon' }, { name: 'Teiser' }, { name: 'Chinese folk religion' }, { name: 'Chinese Buddhist texts' }, { name: 'Buddhist texts' }],
  },
};
