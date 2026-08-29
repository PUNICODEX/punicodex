#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, '.superpowers', 'promotions', 'hittite');
const ASSET_SRC = path.join(ROOT, 'ascii pantheon 28-08-26', 'punycodex');
const { LEXICON } = require(path.join(ROOT, 'type', 'js', 'lexicon.js'));

function mkdir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

function writeTxt(p, text) {
  fs.writeFileSync(p, text.trim() + '\n');
}

const ENTRIES = [
  {
    id: 'arinniti',
    unicode: 'Arinna',
    ascii: 'arinniti',
    domain: 'Sun Goddess, Supreme',
    meaning: 'Of Arinna',
    tier: '2',
    titleForm: 'Arinna',
    ipa: '/aˈrin.na/',
    ipaLabel: 'Hittite Reconstruction',
    kinForms: [
      { label: 'Hittite', form: 'dUTU URUA-ri-in-na / Arinna, Sun Goddess of Arinna, queen of heaven' },
      { label: 'Cuneiform', form: '𒀭𒌓 𒌷𒀀𒊑𒅖𒈾 (divine sun + city Arinna)' },
      { label: 'Akkadian/Hurrian contact', form: 'The Hittite state pantheon assimilated solar and cosmic sovereignty under the Arinna cult' }
    ],
    colors: { primary: '#D4A02A', secondary: '#8B5A00', glow: 'rgba(212,160,42,0.35)' },
    patterns: 'faith\nleadership\npublishing-media\nhistory-archives\neducation'
  },
  {
    id: 'hannahannas',
    unicode: 'Ḫannaḫannas',
    ascii: 'hannahannas',
    domain: 'Mother, Grandmother',
    meaning: 'Grandmother',
    tier: '1',
    titleForm: 'Ḫannaḫannas',
    ipa: '/χanːaχannas/',
    ipaLabel: 'Hittite Reconstruction',
    kinForms: [
      { label: 'Hittite', form: 'Ḫannaḫannaš, the grandmother goddess of birth and family' },
      { label: 'Cuneiform', form: '𒄷𒀭𒈾𒄷𒀭𒈾𒀸 (ḫa-an-na-ḫa-an-na-aš)' },
      { label: 'Function', form: 'Midwife, maternal protector, searcher for the vanished Telipinu' }
    ],
    colors: { primary: '#A0527C', secondary: '#6B3A52', glow: 'rgba(160,82,124,0.35)' },
    patterns: 'wellness-mind\nwedding-family\nhealthcare-pharma\npublishing-media\neducation'
  },
  {
    id: 'inaras',
    unicode: 'Inaras',
    ascii: 'inaras',
    domain: 'Wild Animals, Hunt',
    meaning: 'Unknown',
    tier: '2',
    titleForm: 'Inaras',
    ipa: '/iˈnaːras/',
    ipaLabel: 'Hittite Reconstruction',
    kinForms: [
      { label: 'Hittite', form: 'Inaras, goddess of the wild animals and the open steppe' },
      { label: 'Cuneiform', form: '𒄿𒈾𒀸 (i-na-ra-aš)' },
      { label: 'Mythic role', form: 'Mistress of animals who traps the dragon Illuyanka with a mortal ally' }
    ],
    colors: { primary: '#5A8A3A', secondary: '#2E4A1E', glow: 'rgba(90,138,58,0.3)' },
    patterns: 'environment-climate\ntravel-tourism\npublishing-media\nmusic-arts\neducation'
  },
  {
    id: 'kumarbis',
    unicode: 'Kumarbiš',
    ascii: 'kumarbis',
    domain: 'Grain, Father of Gods',
    meaning: 'Unknown',
    tier: '1',
    titleForm: 'Kumarbiš',
    ipa: '/kuˈmarbiʃ/',
    ipaLabel: 'Hurrian/Hittite Reconstruction',
    kinForms: [
      { label: 'Hurrian', form: 'Kumarbi, the father of gods and god of grain' },
      { label: 'Hittite', form: 'Kumarbiš, opponent of Tarḫunash and ancestor of the storm-god' },
      { label: 'Cuneiform', form: '𒀭𒆳𒀀𒊒𒁉 (ku-mar-bi)' }
    ],
    colors: { primary: '#8B6914', secondary: '#4A3810', glow: 'rgba(139,105,20,0.35)' },
    patterns: 'agriculture-food\nleadership\npublishing-media\nmythic-restoration\nhistory-archives'
  },
  {
    id: 'tarhunash',
    unicode: 'Tarḫunash',
    ascii: 'tarhunash',
    domain: 'Storm, Weather, King',
    meaning: 'The conqueror',
    tier: '1',
    titleForm: 'Tarḫunash',
    ipa: '/tarˈχunas/',
    ipaLabel: 'Hittite Reconstruction',
    kinForms: [
      { label: 'Hittite', form: 'Tarḫunaš / Tarḫunnaš, storm-god and king of heaven' },
      { label: 'Cuneiform', form: '𒀭𒅎 (ᵈIM, the storm-god logogram) + phonetic tar-ḫu-na-aš' },
      { label: 'Luwian counterpart', form: 'Tarḫunt-, the Anatolian storm-god of many local shrines' }
    ],
    colors: { primary: '#3A6B9A', secondary: '#1A3A5A', glow: 'rgba(58,107,154,0.4)' },
    patterns: 'storm-forecasting\nleadership\nsoftware-tech\npublishing-media\nhistory-archives'
  },
  {
    id: 'wurusemu',
    unicode: 'Wurušemu',
    ascii: 'wurusemu',
    domain: 'Earth, Fertility',
    meaning: 'Unknown',
    tier: '1',
    titleForm: 'Wurušemu',
    ipa: '/wuruˈʃemu/',
    ipaLabel: 'Hittite Reconstruction',
    kinForms: [
      { label: 'Hittite', form: 'Wurušemu, great goddess of the earth and mother of Telipinu' },
      { label: 'Cuneiform', form: '𒉿𒊒𒅆𒅎 (wu-ru-ši-me / Wurušemu)' },
      { label: 'Function', form: 'Earth-mother, fertility source, source of vegetation and prosperity' }
    ],
    colors: { primary: '#6B8E23', secondary: '#3A4F13', glow: 'rgba(107,142,35,0.35)' },
    patterns: 'agriculture-food\nwellness-mind\nenvironment-climate\npublishing-media\nhistory-archives'
  }
];

function sourcesFor(entry) {
  const base = [
    'Hoffner, H. A., Hittite Myths, 2nd ed. (1998).',
    'Haas, V., Geschichte der hethitischen Religion (1994).',
    'CHD (Chicago Hittite Dictionary), ed. Güterbock, Hoffner, and van den Hout.',
    'van den Hout, T. P. J., The Elements of Hittite (2011).',
    'Kloekhorst, A., Etymological Dictionary of the Hittite Inherited Lexicon (2008).'
  ];
  const specific = {
    arinniti: [
      'CTH 376 — Prayer to the Sun Goddess of Arinna.',
      'Singer, I., Hittite Prayers (2002).',
      'Gurney, O. R., Some Aspects of Hittite Religion (1977).'
    ],
    hannahannas: [
      'CTH 345 — The Myth of Telipinu.',
      'CTH 348 — Telipinu and the Daughter of the Sea God.',
      'Beckman, G., Hittite Birth Rituals (1983).'
    ],
    inaras: [
      'CTH 321 — The Myth of Illuyanka.',
      'Watkins, C., How to Kill a Dragon (1995).',
      'Hoffner, H. A., "The Hittite Myth of Illuyankas," JAOS (1962).'
    ],
    kumarbis: [
      'CTH 344 — Kingship in Heaven / The Song of Emergence.',
      'CTH 345.2 — The Song of Ullikummi.',
      'Siegelová, J., "Appu-Märchen" und "Hedammu-Mythus" (1971).'
    ],
    tarhunash: [
      'CTH 330 — The Ritual of Tunnawiya.',
      'CTH 321 — The Myth of Illuyanka.',
      'Taracha, P., Religions of Second Millennium Anatolia (2009).'
    ],
    wurusemu: [
      'CTH 345 — The Myth of Telipinu.',
      'CTH 348 — Telipinu and the Daughter of the Sea God.',
      'Haas, V., "Die hethitische Literatur" (2006).'
    ]
  };
  return [...specific[entry.id], ...base];
}

function lore(entry) {
  const data = {
    arinniti: {
      title: 'ARINNA — Queen of Heaven',
      subtitle: 'Solar Sovereignty · State Cult · Divine Kingship',
      lead: `<p class='lead-text'><strong>Arinna</strong> is the Sun Goddess of Arinna, the supreme deity of the Hittite state pantheon. Her cult center at the city of Arinna made her the divine patron of Hittite kingship, and Hittite monarchs styled themselves her beloved son. Unlike the Hattian sun-god, she is a goddess of the sun disk whose warmth and radiance guarantee fertility, justice, and cosmic order. Prayers to her are among the most elaborate compositions in the Hittite language, showing a theology in which the king, the land, and the cosmos are bound together under one solar sovereign.</p>`,
      cards: [
        { iconPath: 'M32 8L38 26H56L42 38L48 56L32 46L16 56L22 38L8 26H26L32 8Z', name: 'Queen of Heaven', desc: 'Supreme deity of the Hittite state pantheon, enthroned above gods and kings.' },
        { iconPath: 'M32 12C20 12 12 22 12 34C12 46 20 54 32 54C44 54 52 46 52 34C52 22 44 12 32 12ZM32 18V50M18 34H46', name: 'Sun Disk', desc: 'The radiant sun wheel whose light sustains grain, law, and life across Hatti.' },
        { iconPath: 'M12 32C20 24 28 24 32 28C36 24 44 24 52 32C48 40 40 44 32 44C24 44 16 40 12 32Z', name: 'Divine Mother of Kings', desc: 'Hittite kings are her beloved children; her blessing legitimates royal rule.' },
        { iconPath: 'M20 48V32H12V24H20V20C20 14 24 10 32 10C40 10 44 14 44 20V24H52V32H44V48H20ZM32 16C28 16 26 18 26 22V24H38V22C38 18 36 16 32 16Z', name: 'Cult Center at Arinna', desc: 'The city of Arinna housed her chief temple and seasonal state festivals.' }
      ],
      symbols: [
        { name: 'Sun disk', meaning: 'The radiant wheel of the sun, source of life and royal authority.' },
        { name: 'Lion', meaning: 'Her animal companion and symbol of sovereign power.' },
        { name: 'Throne', meaning: 'The seat of supreme kingship in heaven and on earth.' },
        { name: 'Golden crown', meaning: 'The solar diadem that marks her as queen of the gods.' },
        { name: 'Winged sun', meaning: 'The sun in motion across the sky, seeing all that happens below.' }
      ],
      mythologyLead: `<p class='lead-text'>The mythology of Arinna is not a cycle of adventures but a theology of sovereignty. Her prayers present her as the all-seeing, all-ruling sun who knows the hearts of gods and mortals and who holds the king accountable for justice.</p>`,
      myths: [
        { tag: 'State theology', title: 'The Queen of Heaven', text: `<p class='myth-text'>In the great prayer CTH 376 the Sun Goddess of Arinna is invoked as the supreme power who sees and hears everything on earth. She is the mother of the king, the mistress of the land of Hatti, and the one before whom both gods and humans appear. The text makes clear that Hittite kingship is not absolute: it is a delegated responsibility held under her gaze.</p>` },
        { tag: 'Solar journey', title: 'The Sun Who Crosses the Sky', text: `<p class='myth-text'>Each day the Sun Goddess rises in the east and travels across the heavens in a chariot. At night she passes through the underworld or returns to her house, so that her absence is never total. Her journey is the cosmic clock by which festivals, oaths, and royal decrees are timed.</p>` },
        { tag: 'Divine legitimation', title: 'Mother of the King', text: `<p class='myth-text'>Hittite kings regularly call themselves the 'beloved son' of the Sun Goddess of Arinna. This is more than flattery: it is a theological claim that royal authority flows from her and that the welfare of the king, the queen, and the land depends on her continued favor.</p>` },
        { tag: 'Cosmic order', title: 'The All-Seeing Judge', text: `<p class='myth-text'>Because the sun sees everything, the goddess is a natural guarantor of oaths and treaties. Deities are called to witness treaties as the sun rises, and perjury before the sun is a cosmic crime that invites famine, plague, and defeat.</p>` }
      ],
      syncretism: `<p class='lead-text'>Arinna absorbed and transformed older Hattic and Mesopotamian solar traditions.</p><p>The Hattian sun-god Estan was originally male; in the Hittite state pantheon the solar deity of Arinna became female and supreme, probably under Hurrian and Syrian influence. She has been compared to the Mesopotamian sun-god Shamash, who also oversees justice, and to the Egyptian sun-god Re as a royal patron. Yet her theology is distinct: she is not primarily a warrior but a mother-queen whose radiance is the condition for ordered life. The shift from a male to a female supreme solar deity is one of the most striking features of Hittite religious history.</p>`,
      culturalLegacy: `<p class='lead-text'>Arinna survives as a paradigm of sacred kingship and solar queenship.</p><p>Scholars of ancient Near Eastern religion study her cult to understand how a state creates a national deity, and feminist historians of religion note the unusual prominence of a supreme goddess in a major Bronze Age empire. Her name appears in studies of Hittite prayer, royal ideology, and comparative solar mythology. For PuniCodex, Arinna represents the restoration of a name that once stood at the center of an imperial state: the queen of heaven whose light was synonymous with legitimate rule.</p>`,
      etymology: {
        protoForm: 'Arinna',
        protoLanguage: 'Hittite',
        protoGloss: 'the city Arinna; "of Arinna"',
        derivation: 'The divine name derives from the city Arinna, whose tutelary deity rose to become the supreme goddess of the Hittite state. The name means "of Arinna" and identifies the goddess with the cult center that housed her chief temple.',
        certainty: 'attested'
      },
      nameVariations: [
        { form: 'Arinna', note: 'Standard scholarly form, Sun Goddess of Arinna.' },
        { form: 'UTU URUA-ri-in-na', note: 'Cuneiform writing with divine sun-god logogram and city determinative.' },
        { form: 'Sun Goddess of Arinna', note: 'Descriptive English title used in Hittite studies.' }
      ],
      originalScriptNote: `<p>The name is attested in Hittite cuneiform as <strong>𒀭𒌓 𒌷𒀀𒊑𒅖𒈾</strong> — the divine sun-god logogram combined with the city name Arinna. The scholarly transliteration is <em>dUTU URUArinna</em>. The Unicode restoration <strong>Arinna</strong> reproduces the capitalized citation form used in modern Hittitology; the ASCII form <em>arinniti</em> is a DNS compromise that does not correspond to the ancient spelling.</p>`,
      extendedMeditation: `<p>To contemplate Arinna is to contemplate the sun as sovereign. Her light does not merely illuminate; it legitimates. Every field that ripens, every oath that is sworn, every king who rules does so under her gaze. In an age of digital networks, the restoration of her name reminds us that sovereignty was once imagined not as domination but as radiant care: the queen of heaven who sees all and provides for all.</p>`
    },
    hannahannas: {
      title: 'ḪANNAḪANNAS — The Grandmother Goddess',
      subtitle: 'Birth · Midwifery · Maternal Protection',
      lead: `<p class='lead-text'><strong>Ḫannaḫannas</strong> is the Hittite "grandmother" goddess, a figure of birth, family, and domestic protection. Her name is a transparent Hittite word meaning "grandmother," and she appears most memorably in the myth of the vanished god Telipinu, where she is sent to search for the angry deity whose withdrawal has blighted the land. As midwife and maternal mediator, she moves between the human household and the divine assembly, easing the passage of new life into the world and the return of absent gods to it.</p>`,
      cards: [
        { iconPath: 'M32 8C20 8 12 18 12 30C12 42 20 52 32 52C44 52 52 42 52 30C52 18 44 8 32 8ZM32 16V44M16 30H48', name: 'Grandmother', desc: 'Her name literally means "grandmother," marking her as elder, helper, and wise woman.' },
        { iconPath: 'M16 48C24 32 28 24 32 20C36 24 40 32 48 48H16Z', name: 'Midwife', desc: 'She attends births and protects infants, mothers, and the household.' },
        { iconPath: 'M32 12L36 24H48L40 32L44 44L32 38L20 44L24 32L16 24H28L32 12Z', name: 'Searcher', desc: 'In the Telipinu myth she goes out to find the vanished god and restore fertility.' },
        { iconPath: 'M12 32C20 24 28 24 32 28C36 24 44 24 52 32C48 40 40 44 32 44C24 44 16 40 12 32Z', name: 'Household Guardian', desc: 'She binds the family together across generations and protects the home.' }
      ],
      symbols: [
        { name: 'Spindle', meaning: 'The tool of the elder woman and the thread of life she helps to spin.' },
        { name: 'Cradle', meaning: 'The place of birth and the protection of infants.' },
        { name: 'Hearth fire', meaning: 'The domestic fire that must be kept alive for family and fertility.' },
        { name: 'Fruit tree', meaning: 'The flourishing household and the renewal of generations.' },
        { name: 'Walking staff', meaning: 'Her role as searcher who travels to bring back the lost god.' }
      ],
      mythologyLead: `<p class='lead-text'>Ḫannaḫannas appears in myth and ritual as the one who mends what has been broken by divine anger or human need.</p>`,
      myths: [
        { tag: 'Birth ritual', title: 'The Midwife of the Gods', text: `<p class='myth-text'>In Hittite birth rituals the grandmother goddess is invoked to protect the mother and child, to open the womb, and to ensure a safe delivery. Her presence turns a dangerous passage into a protected one, and offerings are made to her alongside other deities of birth and destiny.</p>` },
        { tag: 'Telipinu myth', title: 'The Search for the Vanished God', text: `<p class='myth-text'>When Telipinu storms from the assembly and hides himself, the world withers. The Sun Goddess sends Ḫannaḫannas to look for him. The text treats her as the right messenger: a grandmother's persistence and care can coax back even the most angry god.</p>` },
        { tag: 'Domestic cult', title: 'Guardian of the Household', text: `<p class='myth-text'>Beyond state temples, grandmother figures in Hittite religion protected the household, the storehouse, and the family line. Offerings to Ḫannaḫannas were offerings to the continuity of life itself.</p>` },
        { tag: 'Mediation', title: 'Elder of the Assembly', text: `<p class='myth-text'>As grandmother, she occupies a unique place in the divine assembly: old enough to speak plainly, gentle enough to be heard, and trusted by gods and humans alike to find a way forward.</p>` }
      ],
      syncretism: `<p class='lead-text'>Ḫannaḫannas belongs to a broad ancient Near Eastern and Mediterranean type: the divine midwife and grandmother.</p><p>She can be compared to Roman Bona Dea, Greek Eileithyia, and the Mesopotamian divine midwife Mami/Nintur, all of whom preside over birth and the protection of women. Unlike those figures, however, Ḫannaḫannas is explicitly defined by kinship — she is the grandmother, not merely a birth goddess. This makes her a rare personification of intergenerational care in Bronze Age religion.</p>`,
      culturalLegacy: `<p class='lead-text'>Ḫannaḫannas is little known outside Hittite studies, but her role is culturally significant.</p><p>She is one of the few Bronze Age goddesses whose primary identity is familial rather than political or martial. Modern scholars of religion cite her in discussions of divine kinship, birth ritual, and the status of elder women in ancient societies. For PuniCodex, her restoration honors the quiet but essential divine work of birth, household, and reconciliation.</p>`,
      etymology: {
        protoForm: 'ḫannaḫannaš',
        protoLanguage: 'Hittite',
        protoGloss: 'grandmother',
        derivation: 'The name is the ordinary Hittite word for grandmother, doubled for affection or emphasis. Its transparency makes it unusual among divine names and underlines the goddess\'s domestic, familial character.',
        certainty: 'certain'
      },
      nameVariations: [
        { form: 'Ḫannaḫannas', note: 'Standard scholarly romanization, nominative singular.' },
        { form: 'Ḫannaḫannaš', note: 'Hittitological transliteration with final š.' },
        { form: 'Grandmother Goddess', note: 'Descriptive English title used in studies of Hittite religion.' }
      ],
      originalScriptNote: `<p>The name is attested in Hittite cuneiform as <strong>𒄷𒀭𒈾𒄷𒀭𒈾𒀸</strong> — ḫa-an-na-ḫa-an-na-aš. The two <em>ḫ</em> sounds represent the voiceless velar or uvular fricative /χ/, written with the cuneiform ḫ-sign. The Unicode restoration <strong>Ḫannaḫannas</strong> preserves these distinctive consonants; the ASCII form <em>hannahannas</em> collapses them to plain h.</p>`,
      extendedMeditation: `<p>Ḫannaḫannas teaches that the greatest powers are sometimes the most ordinary. She is not a storm-god or a queen of heaven; she is the grandmother who knows how to find the lost, how to ease a birth, and how to keep a family whole. In restoring her name we restore the dignity of that role: the elder whose patience and care hold the world together.</p>`
    },
    inaras: {
      title: 'INARAS — Mistress of the Wild',
      subtitle: 'Wild Animals · Hunt · Steppe',
      lead: `<p class='lead-text'><strong>Inaras</strong> is the Hittite goddess of the wild animals and the open steppe. She appears most dramatically in the Myth of Illuyanka, where she persuades a mortal named Ḫupašiya to help her trap the dragon that has defeated the storm-god. Her domain is the untamed country beyond the city: the grazing herds, the swift gazelles, and the dangerous borderlands where civilization meets wilderness.</p>`,
      cards: [
        { iconPath: 'M12 32C20 24 28 24 32 28C36 24 44 24 52 32C48 40 40 44 32 44C24 44 16 40 12 32Z', name: 'Mistress of Animals', desc: 'She rules the wild herds and the creatures of the steppe.' },
        { iconPath: 'M32 8L36 24H52L40 34L44 50L32 42L20 50L24 34L12 24H28L32 8Z', name: 'The Trap', desc: 'She devises the feast that lures the dragon Illuyanka to his doom.' },
        { iconPath: 'M20 48V32H12V24H20V20C20 14 24 10 32 10C40 10 44 14 44 20V24H52V32H44V48H20ZM32 16C28 16 26 18 26 22V24H38V22C38 18 36 16 32 16Z', name: 'Steppe Wanderer', desc: 'Her home is the open grassland, not the palace or the temple.' },
        { iconPath: 'M16 48C24 32 28 24 32 20C36 24 40 32 48 48H16Z', name: 'Divine Huntress', desc: 'She knows the ways of animals and the arts of the chase.' }
      ],
      symbols: [
        { name: 'Gazelle', meaning: 'The swift animal of the steppe, emblem of her wild domain.' },
        { name: 'Bow and arrow', meaning: 'The tools of the hunt and the means by which she governs animals.' },
        { name: 'Feast', meaning: 'The banquet of beer and wine by which Illuyanka is lulled and trapped.' },
        { name: 'Steppe grass', meaning: 'The open land that is her kingdom.' },
        { name: 'Serpent/dragon', meaning: 'The enemy she helps to defeat, symbol of chaotic waters.' }
      ],
      mythologyLead: `<p class='lead-text'>Inaras is best known from a single, brilliant episode, but that episode reveals a goddess of cunning, sovereignty over animals, and alliance between divine and mortal.</p>`,
      myths: [
        { tag: 'Illuyanka myth', title: 'The Feast of the Dragon', text: `<p class='myth-text'>After the storm-god Tarḫunash is defeated by the dragon Illuyanka, Inaras takes action. She prepares an enormous feast of beer, wine, and every kind of food, then goes to the mortal Ḫupašiya and proposes a bargain: if he helps her trap the dragon, she will sleep with him. Ḫupašiya agrees. The dragon and his children eat and drink until they cannot return to their hole, and Ḫupašiya binds them so that Tarḫunash can destroy them.</p>` },
        { tag: 'Mortal alliance', title: 'Inaras and Ḫupašiya', text: `<p class='myth-text'>The myth places a mortal at the center of divine victory. Inaras does not defeat the dragon alone; she enlists human cunning and desire. After the deed she warns Ḫupašiya not to look out the window while she is away, but he disobeys and sees his family. The story ends with the establishment of a ritual in memory of the event.</p>` },
        { tag: 'Wild domain', title: 'Lady of the Steppe', text: `<p class='myth-text'>As goddess of the wild animals, Inaras guarantees the abundance of game and the balance between human hunters and animal herds. Her domain is the dangerous, fertile margin between the settled land of Hatti and the wilderness beyond.</p>` },
        { tag: 'Ritual foundation', title: 'The Annual Festival', text: `<p class='myth-text'>The myth of Illuyanka was not only entertainment; it grounded an annual festival in which the defeat of the dragon was ritually re-enacted. Inaras's cunning was thus remembered every year as the beginning of the storm-god's renewed power.</p>` }
      ],
      syncretism: `<p class='lead-text'>Inaras shares traits with several ancient Mediterranean and Near Eastern figures.</p><p>Her role as mistress of animals recalls the Greek Potnia Theron, the Mistress of Animals who presides over wild creatures, and Artemis in her capacity as huntress. The dragon-slaying story has close Indo-European parallels, especially the dragon fight of the storm-god. Inaras's liaison with a mortal helper also resembles stories in which a goddess enlists a human hero. Yet her Hittite form is distinct: she is not a virgin huntress but a sovereign of the steppe who uses sex, food, and cunning as weapons.</p>`,
      culturalLegacy: `<p class='lead-text'>Inaras survives in scholarly memory as the Hittite Mistress of Animals and the architect of the dragon's defeat.</p><p>She appears in studies of Indo-European dragon combat, comparative mythology, and the role of goddesses in ancient Near Eastern narrative. The Myth of Illuyanka is one of the most widely cited Hittite texts, and Inaras's role in it makes her a key figure for understanding how divine and mortal agency interact in Hittite thought. For PuniCodex, she represents the wild, cunning dimension of the pantheon: the goddess who knows the borderlands and how to turn an enemy's appetite into his destruction.</p>`,
      etymology: {
        protoForm: 'Inaras',
        protoLanguage: 'Hittite',
        protoGloss: 'unknown; possibly connected to a word for wild or steppe',
        derivation: 'The etymology of Inaras is uncertain. The name may be a Hattic or substrate survival, or it may be connected to an Anatolian word for the wild country or its animals.',
        certainty: 'uncertain'
      },
      nameVariations: [
        { form: 'Inaras', note: 'Standard scholarly romanization.' },
        { form: 'Inara', note: 'Alternative nominative form sometimes used in modern works.' },
        { form: 'i-na-ra-aš', note: 'Cuneiform syllabic spelling.' }
      ],
      originalScriptNote: `<p>The name is attested in Hittite cuneiform as <strong>𒄿𒈾𒀸</strong> (i-na-ra-aš). The Unicode restoration <strong>Inaras</strong> gives the scholarly citation form; the ASCII form <em>inaras</em> is a domain-name convenience.</p>`,
      extendedMeditation: `<p>Inaras is the goddess of the edge: the place where the city ends and the steppe begins, where human craft meets animal instinct, and where cunning can defeat strength. Her story warns that even a dragon's power can be undone by appetite, and that the wild is not simply chaos but a realm with its own sovereign.</p>`
    },
    kumarbis: {
      title: 'KUMARBIŠ — Father of the Gods',
      subtitle: 'Grain · Divine Succession · Chthonic Power',
      lead: `<p class='lead-text'><strong>Kumarbiš</strong> is the Hurrian father of the gods, adopted into Hittite religion as the antagonist of the storm-god Tarḫunash. He is a deity of grain and fertility whose power is rooted in the earth rather than the sky. In the great succession myth known as "Kingship in Heaven," Kumarbiš overthrows the sky-god Anu by biting off his genitals, then becomes pregnant with the storm-god and other gods. His body thus becomes the womb from which the new cosmic order is born, making him both defeated rival and ancestral source.</p>`,
      cards: [
        { iconPath: 'M32 8C20 8 12 18 12 30C12 42 20 52 32 52C44 52 52 42 52 30C52 18 44 8 32 8ZM32 16V44M16 30H48', name: 'Father of Gods', desc: 'He generates the storm-god and the pantheon from his own body.' },
        { iconPath: 'M16 48C24 32 28 24 32 20C36 24 40 32 48 48H16Z', name: 'God of Grain', desc: 'His power is tied to fertility, agriculture, and the stored wealth of the earth.' },
        { iconPath: 'M20 48V32H12V24H20V20C20 14 24 10 32 10C40 10 44 14 44 20V24H52V32H44V48H20ZM32 16C28 16 26 18 26 22V24H38V22C38 18 36 16 32 16Z', name: 'The Overthrower', desc: 'He rises against Anu and seizes kingship through cunning and violence.' },
        { iconPath: 'M32 12L36 24H52L40 34L44 50L32 42L20 50L24 34L12 24H28L32 12Z', name: 'Chthonic Ancestor', desc: 'Though defeated, he remains the source from which the storm-god springs.' }
      ],
      symbols: [
        { name: 'Grain', meaning: 'The agricultural wealth that is his domain and his body.' },
        { name: 'Sickle or knife', meaning: 'The tool of the harvester and the weapon of succession.' },
        { name: 'Earth/mountain', meaning: 'The chthonic realm from which he challenges the sky.' },
        { name: 'Serpent or dragon', meaning: 'His offspring and allies, creatures of the underworld and the waters.' },
        { name: 'The nine gods', meaning: 'The divine children born from his body, including the storm-god.' }
      ],
      mythologyLead: `<p class='lead-text'>Kumarbiš is the central figure of the Hurro-Hittite succession myth and one of the most complex gods in ancient Near Eastern literature.</p>`,
      myths: [
        { tag: 'Kingship in Heaven', title: 'The Overthrow of Anu', text: `<p class='myth-text'>In the Hurro-Hittite "Kingship in Heaven," Anu has ruled for nine years after deposing Alalu. Kumarbiš, his servant, rebels. When Anu tries to flee to the sky, Kumarbiš grabs him by the feet, pulls him down, and bites off his genitals. From this act Kumarbiš becomes pregnant with three gods: the storm-god Tarḫunash, the river Tigris, and the god Tašmišu.</p>` },
        { tag: 'Birth of the storm-god', title: 'The Womb of the Father', text: `<p class='myth-text'>Kumarbiš gives birth to the gods from his own body — a striking reversal of ordinary gender roles that expresses his chthonic, generative power. The storm-god Tarḫunash is born from his split skull or his genitals, depending on the version, and immediately becomes the rival who will supplant him.</p>` },
        { tag: 'Song of Ullikummi', title: 'The Stone Monster', text: `<p class='myth-text'>In the "Song of Ullikummi," Kumarbiš creates a giant stone monster to challenge the storm-god and the other gods. The monster grows so large that it threatens heaven itself, forcing the gods to combine their powers to defeat it. The story shows Kumarbiš as a persistent, creative adversary who will not accept defeat.</p>` },
        { tag: 'Succession cycle', title: 'From Alalu to Tarḫunash', text: `<p class='myth-text'>The full cosmic succession is Alalu → Anu → Kumarbiš → Tarḫunash. Kumarbiš is the pivotal third term: he ends the sky-god's reign but cannot establish his own dynasty against the storm-god who rises from him. He is both revolution and failed restoration.</p>` }
      ],
      syncretism: `<p class='lead-text'>Kumarbiš belongs to a Near Eastern and Mediterranean pattern of displaced father-gods.</p><p>The Greek Kronos, who castrates his father Ouranos and is later overthrown by Zeus, is the closest parallel. The Roman Saturnus preserves a similar memory of an older agricultural god displaced by Jupiter. The Hurrian-Hittite version is more explicitly tied to grain and fertility and adds the remarkable motif of male pregnancy. Some scholars argue that the Kumarbiš cycle influenced Hesiod's Theogony, either directly or through shared Near Eastern traditions.</p>`,
      culturalLegacy: `<p class='lead-text'>Kumarbiš is a foundational figure in the study of ancient Near Eastern and comparative mythology.</p><p>The "Kingship in Heaven" and "Song of Ullikummi" texts are standard sources for courses and research on Hittite religion, Indo-European myth, and the origins of Greek theogony. Kumarbiš appears in encyclopedias, scholarly monographs, and debates about cultural borrowing between Anatolia and Greece. For PuniCodex, he represents the chthonic source of divine succession: the grain-father whose defeat is also the birth of the storm.</p>`,
      etymology: {
        protoForm: 'Kumarbiš / Kumarbi',
        protoLanguage: 'Hurrian',
        protoGloss: 'unknown; possibly connected to grain or fertility',
        derivation: 'The name is Hurrian and probably connected with Kumarbiš\'s role as a grain or fertility deity. Its exact etymology remains uncertain.',
        certainty: 'uncertain'
      },
      nameVariations: [
        { form: 'Kumarbiš', note: 'Hittite scholarly romanization with final š.' },
        { form: 'Kumarbi', note: 'Standard Hurrian form.' },
        { form: 'ku-mar-bi', note: 'Cuneiform syllabic spelling.' }
      ],
      originalScriptNote: `<p>The name is attested in Hittite cuneiform as <strong>𒀭𒆳𒀀𒊒𒁉</strong> (ᵈku-mar-bi). The Hurrian <em>š</em> sound is written with the cuneiform š-sign. The Unicode restoration <strong>Kumarbiš</strong> preserves this distinctive consonant; the ASCII form <em>kumarbis</em> collapses it to s.</p>`,
      extendedMeditation: `<p>Kumarbiš embodies the paradox of the old god: he is the foundation that the new order must both destroy and inherit. His body is the field from which the storm springs. To meditate on him is to recognize that every revolution carries the seed of the past within it, and that fertility and defeat can be two names for the same power.</p>`
    },
    tarhunash: {
      title: 'TARḪUNASH — The Storm King',
      subtitle: 'Storm · Weather · Divine Kingship',
      lead: `<p class='lead-text'><strong>Tarḫunash</strong> is the Hittite storm-god, the most widely worshipped male deity of the Hittite pantheon and the king of heaven after the cosmic succession. His name means "The Conqueror," and his weapons are thunder, lightning, and rain. He is the guarantor of kingship, the defender of Hatti against its enemies, and the bringer of the storms that fertilize the Anatolian plateau. From his many local shrines to his role in the great myths, Tarḫunash is the divine face of power that is both destructive and life-giving.</p>`,
      cards: [
        { iconPath: 'M32 8L36 24H52L40 34L44 50L32 42L20 50L24 34L12 24H28L32 8Z', name: 'Thunderbolt', desc: 'His weapon is the lightning that strikes enemies and summons rain.' },
        { iconPath: 'M16 48C24 32 28 24 32 20C36 24 40 32 48 48H16Z', name: 'Storm Clouds', desc: 'He rides the clouds that bring the seasonal rains to Anatolia.' },
        { iconPath: 'M20 48V32H12V24H20V20C20 14 24 10 32 10C40 10 44 14 44 20V24H52V32H44V48H20ZM32 16C28 16 26 18 26 22V24H38V22C38 18 36 16 32 16Z', name: 'King of Heaven', desc: 'He holds the kingship of the gods after the defeat of Kumarbiš.' },
        { iconPath: 'M32 12L36 24H52L40 34L44 50L32 42L20 50L24 34L12 24H28L32 12Z', name: 'Divine Warrior', desc: 'He battles dragons, sea monsters, and hostile mountains to preserve order.' }
      ],
      symbols: [
        { name: 'Thunderbolt', meaning: 'The weapon of divine judgment and the spark that fertilizes the sky.' },
        { name: 'Bull', meaning: 'The animal of storm and potency, often associated with the storm-god.' },
        { name: 'Mountain', meaning: 'His home and throne, often Hazzi near the Mediterranean coast.' },
        { name: 'Rain', meaning: 'The life-giving water he sends to fields and herds.' },
        { name: 'Club/mace', meaning: 'The weapon with which he smites chaotic forces.' }
      ],
      mythologyLead: `<p class='lead-text'>Tarḫunash is the hero of several Hittite myths and the recipient of countless prayers and rituals.</p>`,
      myths: [
        { tag: 'Illuyanka myth', title: 'The Dragon Slayer', text: `<p class='myth-text'>In the first version of the Illuyanka myth, Tarḫunash is defeated by the dragon and loses his heart and eyes. His son marries the dragon's daughter and recovers them, allowing Tarḫunash to return and destroy the dragon. In the second version, Inaras and Ḫupašiya trick the dragon into drunkenness, and Tarḫunash slays him. Both versions make the storm-god the guarantor of cosmic order against chaotic water.</p>` },
        { tag: 'Kingship in Heaven', title: 'The New King', text: `<p class='myth-text'>After Kumarbiš seizes kingship from Anu, the storm-god Tarḫunash rises to challenge him. The struggle between them continues through the birth of monstrous opponents, especially Ullikummi the stone giant. Tarḫunash's eventual victory establishes the reign of the storm-god as the present order of the cosmos.</p>` },
        { tag: 'Sea god conflict', title: 'Lord of the Stormy Sea', text: `<p class='myth-text'>Hittite texts also tell of conflicts between the storm-god and the sea-god. These stories reflect the importance of the Mediterranean coast to Hittite religion and the need to subordinate chaotic waters — whether sea or storm — to divine rule.</p>` },
        { tag: 'State cult', title: 'Protector of Hatti', text: `<p class='myth-text'>In royal prayers and treaties, Tarḫunash is invoked as the protector of the king and the land of Hatti. His favor brings victory in battle, abundance in harvest, and stability in dynasty. Every Hittite king ruled, in part, under the thunder of Tarḫunash.</p>` }
      ],
      syncretism: `<p class='lead-text'>Tarḫunash is the Anatolian counterpart of several Indo-European and Near Eastern storm-gods.</p><p>His name is cognate with Luwian Tarḫunt- and with the Hattic Taru, and he shares functions with the Greek Zeus, the Roman Jupiter, the Norse Thor, and the Vedic Indra. All are thunder-wielding kings who defeat serpentine or chaotic forces. The Hittite form is distinctive for its close association with Anatolian kingship and its integration with older Hattic and Hurrian traditions.</p>`,
      culturalLegacy: `<p class='lead-text'>Tarḫunash remains one of the best-known Hittite gods.</p><p>He appears in every introduction to Hittite religion, in studies of Indo-European mythology, and in discussions of the storm-god type across ancient cultures. His name and iconography have influenced later Anatolian and Syrian religious art. For PuniCodex, Tarḫunash is the storm made sovereign: the name that reminds us that power in the ancient world was imagined as weather, judgment, and rain.</p>`,
      etymology: {
        protoForm: 'Tarḫunash / Tarḫunnaš',
        protoLanguage: 'Hittite',
        protoGloss: 'the conqueror; the storm-god',
        derivation: 'The name derives from a Hittite verb meaning "to conquer, to overpower," fitting for a deity whose thunderbolt defeats enemies and whose rain overcomes drought. The Luwian form Tarḫunt- preserves the same root.',
        certainty: 'attested'
      },
      nameVariations: [
        { form: 'Tarḫunash', note: 'Standard Hittite scholarly romanization.' },
        { form: 'Tarḫunnaš', note: 'Alternative Hittite form with double n.' },
        { form: 'Tarḫuntaš', note: 'Variant spelling in some texts.' },
        { form: 'ᵈIM', note: 'Cuneiform logogram for the storm-god.' }
      ],
      originalScriptNote: `<p>The name is attested in Hittite cuneiform both syllabically as <strong>𒀭𒋻𒄷𒈾𒀸</strong> (tar-ḫu-na-aš) and logographically as <strong>𒀭𒅎</strong> (ᵈIM, the storm-god sign). The phoneme <em>ḫ</em> represents a voiceless velar or uvular fricative. The Unicode restoration <strong>Tarḫunash</strong> preserves this sound in scholarly transcription; the ASCII form <em>tarhunash</em> reduces it to h.</p>`,
      extendedMeditation: `<p>Tarḫunash is the sky's answer to disorder. His thunder is not mere noise but the voice of legitimate power, and his rain is the gift that follows judgment. To restore his name is to remember that the ancients did not separate sovereignty from nature: the king of heaven was also the weather, and justice came on the wings of a storm.</p>`
    },
    wurusemu: {
      title: 'WURUŠEMU — The Great Earth Mother',
      subtitle: 'Earth · Fertility · Motherhood',
      lead: `<p class='lead-text'><strong>Wurušemu</strong> is the great Hittite earth-goddess and the mother of the vanishing god Telipinu. Her name is connected to the earth itself, and her domain is fertility, vegetation, and the prosperity of the land. In the myths of Telipinu, her son's anger or disappearance causes the world to wither, and her grief mirrors the barrenness of the fields. She is not a warrior but the patient source from which all growth springs, and her restoration is the restoration of abundance.</p>`,
      cards: [
        { iconPath: 'M16 48C24 32 28 24 32 20C36 24 40 32 48 48H16Z', name: 'Earth Mother', desc: 'She is the living earth from which crops, herds, and human life arise.' },
        { iconPath: 'M32 8C20 8 12 18 12 30C12 42 20 52 32 52C44 52 52 42 52 30C52 18 44 8 32 8ZM32 16V44M16 30H48', name: 'Mother of Telipinu', desc: 'Her son is the vanishing god of vegetation; his moods shape the seasons.' },
        { iconPath: 'M12 32C20 24 28 24 32 28C36 24 44 24 52 32C48 40 40 44 32 44C24 44 16 40 12 32Z', name: 'Fertility Source', desc: 'Her favor brings grain, fruit, and the multiplying of animals.' },
        { iconPath: 'M20 48V32H12V24H20V20C20 14 24 10 32 10C40 10 44 14 44 20V24H52V32H44V48H20ZM32 16C28 16 26 18 26 22V24H38V22C38 18 36 16 32 16Z', name: 'Lady of the Vineyard', desc: 'She is associated with vineyards, wine, and the cultivated abundance of Anatolia.' }
      ],
      symbols: [
        { name: 'Earth', meaning: 'The ground itself as living body and source of fertility.' },
        { name: 'Grain sheaf', meaning: 'The harvest that rises from her body.' },
        { name: 'Vine', meaning: 'The cultivated plant that binds her to wine and festival.' },
        { name: 'Mother and child', meaning: 'Her relationship with Telipinu as a model of divine generation.' },
        { name: 'Watering jar', meaning: 'The vessel that brings moisture to thirsty fields.' }
      ],
      mythologyLead: `<p class='lead-text'>Wurušemu's mythology is inseparable from that of her son Telipinu, but she has her own dignity as the great earth-mother.</p>`,
      myths: [
        { tag: 'Telipinu myth', title: 'The Vanishing Son', text: `<p class='myth-text'>When Telipinu storms out of the divine assembly, taking fertility with him, the world turns barren. Wurušemu searches for him, grieves for him, and eventually helps to bring him back. Her motherhood is not passive; it is the emotional and cosmic force that makes restoration possible.</p>` },
        { tag: 'Agricultural cycle', title: 'The Seasons of the Earth', text: `<p class='myth-text'>The anger and return of Telipinu mirror the agricultural cycle of Anatolia: the dry season when growth hides, and the rainy season when vegetation returns. Wurušemu is the constant earth beneath this cycle, the ground that remains fertile even when her son is absent.</p>` },
        { tag: 'Divine genealogy', title: 'Mother of Gods', text: `<p class='myth-text'>Wurušemu is called the mother of Telipinu and is linked to other deities of vegetation and fertility. Her divine household is a model of the human household projected onto the cosmos: mother, son, and the land they sustain together.</p>` },
        { tag: 'Healing ritual', title: 'Restorer of Abundance', text: `<p class='myth-text'>Rituals addressed to Wurušemu and her son aim to restore fertility, heal disease, and end drought. The goddess is invoked as the source from which prosperity can always return if the proper offerings and gestures are made.</p>` }
      ],
      syncretism: `<p class='lead-text'>Wurušemu belongs to the ancient Near Eastern and Mediterranean family of great mother goddesses.</p><p>She can be compared to Cybele, the Phrygian mother of the gods whose cult spread throughout the Roman world, and to the Greek Demeter, goddess of grain and the agricultural cycle. Like them, she is associated with mountains, lions, and the fertility of the land. Some scholars see Wurušemu as an early Anatolian precursor of the later Cybele cult. Her connection with the vanishing god Telipinu also recalls the Mesopotamian stories of Dumuzi and Inanna, where divine disappearance and return shape the seasons.</p>`,
      culturalLegacy: `<p class='lead-text'>Wurušemu is less famous than the storm-god or the sun goddess, but she is essential to understanding Hittite religion.</p><p>Scholars study her as part of the Anatolian mother-goddess tradition and as the divine mother in the Telipinu cycle. Her name appears in discussions of Hittite fertility ritual, the myth of the vanishing god, and the prehistory of the Cybele cult. For PuniCodex, Wurušemu is the earth itself made divine: the mother whose body feeds the world and whose patience outlasts every season of loss.</p>`,
      etymology: {
        protoForm: 'Wurušemu',
        protoLanguage: 'Hittite',
        protoGloss: 'unknown; connected with earth/fertility',
        derivation: 'The etymology of Wurušemu is uncertain. The name is Hittite and appears in texts associated with earth, fertility, and the vanishing god Telipinu.',
        certainty: 'uncertain'
      },
      nameVariations: [
        { form: 'Wurušemu', note: 'Standard scholarly romanization.' },
        { form: 'Wurusemu', note: 'ASCII-friendly form, without the š.' },
        { form: 'wu-ru-ši-me', note: 'Cuneiform syllabic spelling.' }
      ],
      originalScriptNote: `<p>The name is attested in Hittite cuneiform as <strong>𒉿𒊒𒅆𒅎</strong> (wu-ru-ši-me). The sign <em>ši</em> represents the voiceless postalveolar fricative /ʃ/, written in modern transcription as <em>š</em>. The Unicode restoration <strong>Wurušemu</strong> preserves this distinctive letter; the ASCII form <em>wurusemu</em> collapses it to s.</p>`,
      extendedMeditation: `<p>Wurušemu is the silence beneath the seasons. While storm-gods battle and vanishing gods rage, she remains: the earth that receives seed, that holds water, that feeds the generations. Her restoration is a reminder that the most fundamental powers are often the quietest, and that every return to abundance begins with the patient ground.</p>`
    }
  };

  const d = data[entry.id];
  const phonemes = {
    arinniti: [
      { symbol: 'A-', desc: 'Open vowel [a], the light initial syllable of the solar name.' },
      { symbol: '-rin-', desc: 'Tapped or trilled [r] with close front vowel [i] and nasal [n].' },
      { symbol: '-na', desc: 'Final syllable with nasal [n] and open vowel [a].' }
    ],
    hannahannas: [
      { symbol: 'Ḫan-', desc: 'Voiceless velar/uvular fricative [χ] followed by open [a] and nasal [n].' },
      { symbol: '-naḫ-', desc: 'Repeated syllable with second fricative [χ], the doubled grandmother-name.' },
      { symbol: '-an-nas', desc: 'Nasal cluster and final syllable marking the nominative ending.' }
    ],
    inaras: [
      { symbol: 'I-', desc: 'Close front vowel [i], the light first syllable.' },
      { symbol: '-na-', desc: 'Syllable with nasal [n] and open vowel [a].' },
      { symbol: '-ras', desc: 'Tapped [r] with open [a] and final sibilant [s].' }
    ],
    kumarbis: [
      { symbol: 'Ku-', desc: 'Rounded back vowel [u] after velar stop [k].' },
      { symbol: '-mar-', desc: 'Nasal [m], open [a], and tapped [r], the central syllables.' },
      { symbol: '-biš', desc: 'Bilabial stop [b] plus close front vowel and voiceless postalveolar fricative [ʃ].' }
    ],
    tarhunash: [
      { symbol: 'Tar-', desc: 'Voiceless alveolar stop [t], open [a], and tapped [r].' },
      { symbol: '-ḫu-', desc: 'Voiceless velar/uvular fricative [χ] followed by rounded [u].' },
      { symbol: '-nash', desc: 'Nasal [n] plus open [a] and final sibilant cluster.' }
    ],
    wurusemu: [
      { symbol: 'Wu-', desc: 'Rounded [u] with glide [w], the opening of the earth-name.' },
      { symbol: '-ru-', desc: 'Tapped [r] between two rounded vowels.' },
      { symbol: '-še-', desc: 'Voiceless postalveolar fricative [ʃ] followed by close-mid [e].' },
      { symbol: '-mu', desc: 'Final bilabial nasal [m] with rounded [u].' }
    ]
  }[entry.id];
  return {
    pronunciation: {
      ipa: entry.ipa,
      ipaLabel: entry.ipaLabel,
      phonemes,
      approximation: `Scholarly reconstruction ${entry.ipa}; the exact ancient pronunciation is debated.`,
      kin: entry.kinForms,
      note: `${entry.unicode} is Tier ${entry.tier}: the restored form preserves the scholarly citation shape ${entry.tier === '1' ? 'with distinctive Hittite consonants (ḫ/š) that the ASCII form loses' : 'but adds no distinctive diacritic; the ASCII form is a domain-name convenience'}; the cuneiform original is written in the Sumero-Akkadian syllabary.`
    },
    domains: {
      title: d.title,
      subtitle: d.subtitle,
      lead: d.lead,
      cards: d.cards
    },
    symbols: d.symbols,
    mythology: {
      lead: d.mythologyLead,
      myths: d.myths
    },
    etymology: d.etymology,
    nameVariations: d.nameVariations,
    originalScriptNote: d.originalScriptNote,
    syncretism: d.syncretism,
    culturalLegacy: d.culturalLegacy,
    extendedMeditation: d.extendedMeditation,
    sources: sourcesFor(entry).map(name => ({ name })),
    archaeology: `The texts that name ${entry.unicode} were excavated from the Hittite royal archives at Boğazköy-Hattusa and related sites in central Anatolia, including temple storerooms and administrative buildings within the citadel. The tablets belong to the corpus of Hittite cuneiform literature preserved in the imperial chancery, with duplicates and parallels in Hurrian, Hattic, Luwian, and other Anatolian traditions. Many were written or copied during the Empire period (c. 1400–1180 BCE), though some compositions may descend from older oral or written sources. The clay tablets were baked, either deliberately or by the fire that destroyed the city, which helped preserve them for modern excavation and study.`
  };
}

function scholars(entry) {
  const l = lore(entry);
  const cuneiformNote = {
    arinniti: '𒀭𒌓 𒌷𒀀𒊑𒅖𒈾 (dUTU URUArinna)',
    hannahannas: '𒄷𒀭𒈾𒄷𒀭𒈾𒀸 (ḫa-an-na-ḫa-an-na-aš)',
    inaras: '𒄿𒈾𒀸 (i-na-ra-aš)',
    kumarbis: '𒀭𒆳𒀀𒊒𒁉 (ᵈku-mar-bi)',
    tarhunash: '𒀭𒋻𒄷𒈾𒀸 (tar-ḫu-na-aš)',
    wurusemu: '𒉿𒊒𒅆𒅎 (wu-ru-ši-me)'
  }[entry.id];

  const overview = `**${entry.unicode}** (*${entry.ascii}*) — ${entry.domain} · ${entry.meaning} — belongs to the Hittite tradition, where it is catalogued under the domain "${entry.domain}". The name means "${entry.meaning}"[^1].

${l.domains.lead.replace(/<p class='lead-text'><strong>/, '**').replace(/<\/strong>/, '**').replace(/<\/p>/g, '').replace(/<p class='lead-text'>/g, '\n\n').replace(/<em>/g, '*').replace(/<\/em>/g, '*').replace(/<strong>/g, '**').replace(/<\/strong>/g, '**')}

PuniCodex restores the name as **${entry.unicode}**. The plain ASCII form *${entry.ascii}* survives as a modern convenience imposed by the early domain-name system; the restoration, not the fallback, is the form the project defends as philologically complete[^2].`;

  const theName = `The name is attested in Hittite cuneiform as **${cuneiformNote}**. Etymologically it means "${entry.meaning}"[^1].

The ASCII form *${entry.ascii}* survives only because the early domain-name system could not carry distinctive Anatolian consonants; it is a technological compromise, not an ancient spelling. The Unicode restoration **${entry.unicode}** recovers the full scholarly transliteration directly in the address bar. ${entry.tier === '1' ? 'Because the restoration restores the distinctive Hittite consonant ' + (entry.id === 'tarhunash' || entry.id === 'hannahannas' ? 'ḫ' : 'š') + ', the entry is classified Tier 1.' : 'The restoration needs no distinctive letters or diacritics its ASCII form would lose, which places the name in Tier 2.'}

The letter-by-letter transformation runs:

${entry.breakdown.map(b => `- **${b.char}** → **${b.to || '—'}** — ${b.note}`).join('\n')}`;

  const pronunciation = `The reconstructed pronunciation of the name is **${entry.ipa}** — ${entry.ipaLabel}[^1].

Kindred and historical forms of the name:

${entry.kinForms.map(k => `- **${k.label}** — ${k.form}`).join('\n')}

${entry.unicode} is Tier ${entry.tier}: ${entry.tier === '1' ? 'the restored form preserves a distinctive Hittite consonant (' + (entry.id === 'tarhunash' || entry.id === 'hannahannas' ? 'ḫ' : 'š') + ') that the ASCII form loses, making the Unicode restoration information-rich.' : 'the restored form preserves only the capitalized scholarly citation; it carries no distinctive diacritic or non-ASCII letter beyond the initial capital.'}`;

  const originalScript = `The name is preserved in Hittite cuneiform as **${cuneiformNote}** — Sumero-Akkadian cuneiform (Hittite scribal tradition), attested Hittite Empire, c. 1400–1180 BCE, in Anatolia / north Syria. The script is written left-to-right.[^1]

The scholarly transliteration is *${cuneiformNote.split('(')[1].replace(')', '')}* (Hittitological), giving the normalized reading ${entry.ipa}.

The rendering proceeds step by step:

- The cuneiform signs represent syllables in the Hittite adaptation of the Mesopotamian script.
- Divine names are commonly written with the divine determinative 𒀭 (dingir) or with a divine logogram.
- Modern Hittitology normalizes these spellings to the Latin transcription **${entry.unicode}**.`;

  const domains = `${l.domains.lead.replace(/<p class='lead-text'><strong>/, '**').replace(/<\/strong>/, '**').replace(/<\/p>/g, '').replace(/<p class='lead-text'>/g, '\n\n').replace(/<em>/g, '*').replace(/<\/em>/g, '*').replace(/<strong>/g, '**').replace(/<\/strong>/g, '**')}

### ${l.domains.cards[0].name}

${l.domains.cards[0].desc}[^2]

### ${l.domains.cards[1].name}

${l.domains.cards[1].desc}

### ${l.domains.cards[2].name}

${l.domains.cards[2].desc}

### ${l.domains.cards[3].name}

${l.domains.cards[3].desc}`;

  const symbols = `The iconography associated with **${entry.unicode}** concentrates in a small set of recurring attributes, each a compressed statement about the name:[^1]

${l.symbols.map(s => `- **${s.name}** — ${s.meaning}`).join('\n')}`;

  const mythology = `${l.mythology.myths.slice(0, 3).map(m => `### ${m.title}\n\n${m.text.replace(/<p class='myth-text'>/g, '').replace(/<\/p>/g, '').replace(/<em>/g, '*').replace(/<\/em>/g, '*').replace(/<strong>/g, '**').replace(/<\/strong>/g, '**')}`).join('\n\n')}`;

  const syncretism = l.syncretism.replace(/<p class='lead-text'>/g, '').replace(/<\/p>/g, '\n\n').replace(/<em>/g, '*').replace(/<\/em>/g, '*').replace(/<strong>/g, '**').replace(/<\/strong>/g, '**').trim();

  const culturalLegacy = l.culturalLegacy.replace(/<p class='lead-text'>/g, '').replace(/<\/p>/g, '\n\n').replace(/<em>/g, '*').replace(/<\/em>/g, '*').replace(/<strong>/g, '**').replace(/<\/strong>/g, '**').trim();

  const archaeology = l.archaeology;

  const scholarlySources = `The account of ${entry.unicode} given in this edition rests on the witnesses and reference works listed below. The cuneiform texts secure the form and meaning of the name; modern scholarship supplies context and interpretation.

${sourcesFor(entry).map((s, i) => `- [^${i + 1}] ${s}`).join('\n')}`;

  return {
    entryId: entry.id,
    contentVersion: 1,
    sections: {
      overview: { body: overview, sources: sourcesFor(entry).slice(0, 2).map(c => ({ citation: c })), generatedFrom: ['lore:domains', 'lexicon:meaning', 'archetype:tier'], bespoke: false },
      'the-name': { body: theName, sources: sourcesFor(entry).slice(0, 1).map(c => ({ citation: c })), generatedFrom: ['lexicon:greek', 'lexicon:meaning', 'lexicon:breakdown', 'archetype:tier'], bespoke: false },
      pronunciation: { body: pronunciation, sources: sourcesFor(entry).slice(0, 1).map(c => ({ citation: c })), generatedFrom: ['lore:pronunciation'], bespoke: false },
      'original-script': { body: originalScript, sources: sourcesFor(entry).slice(0, 1).map(c => ({ citation: c })), generatedFrom: ['original-scripts:provenance'], bespoke: false },
      domains: { body: domains, sources: sourcesFor(entry).slice(0, 2).map(c => ({ citation: c })), generatedFrom: ['lore:domains'], bespoke: false },
      symbols: { body: symbols, sources: sourcesFor(entry).slice(0, 1).map(c => ({ citation: c })), generatedFrom: ['lore:symbols'], bespoke: false },
      mythology: { body: mythology, sources: sourcesFor(entry).slice(0, 2).map(c => ({ citation: c })), generatedFrom: ['lore:mythology'], bespoke: false },
      syncretism: { body: syncretism, sources: sourcesFor(entry).slice(0, 1).map(c => ({ citation: c })), generatedFrom: ['lore:syncretism', 'lexicon:pantheon'], bespoke: false },
      'cultural-legacy': { body: culturalLegacy, sources: sourcesFor(entry).slice(0, 1).map(c => ({ citation: c })), generatedFrom: ['lore:culturalLegacy'], bespoke: false },
      archaeology: { body: archaeology, sources: sourcesFor(entry).slice(0, 1).map(c => ({ citation: c })), generatedFrom: ['lore:archaeology'], bespoke: false },
      'scholarly-sources': { body: scholarlySources, sources: sourcesFor(entry).map(c => ({ citation: c })), generatedFrom: ['lore:sources', 'source-catalog'], bespoke: false }
    }
  };
}

function blog(entry) {
  const l = lore(entry);
  const cuneiformNote = {
    arinniti: '𒀭𒌓 𒌷𒀀𒊑𒅖𒈾 (dUTU URUArinna)',
    hannahannas: '𒄷𒀭𒈾𒄷𒀭𒈾𒀸 (ḫa-an-na-ḫa-an-na-aš)',
    inaras: '𒄿𒈾𒀸 (i-na-ra-aš)',
    kumarbis: '𒀭𒆳𒀀𒊒𒁉 (ᵈku-mar-bi)',
    tarhunash: '𒀭𒋻𒄷𒈾𒀸 (tar-ḫu-na-aš)',
    wurusemu: '𒉿𒊒𒅆𒅎 (wu-ru-ši-me)'
  }[entry.id];

  const tierReason = entry.tier === '1'
    ? `the restoration recovers a distinctive Hittite consonant — ${entry.id === 'tarhunash' || entry.id === 'hannahannas' ? 'the voiceless velar/uvular fricative ḫ' : 'the voiceless postalveolar fricative š'} — that the ASCII form collapses to a plain Latin letter. That consonant is not a decorative flourish; it is a structural feature of Hittite phonology that modern Hittitology preserves in every scholarly transliteration. The restoration therefore carries genuine information that *${entry.ascii}* loses.`
    : `the restoration preserves the capitalized scholarly citation form but does not add any diacritic or special letter that the ASCII form would lose. The Unicode form **${entry.unicode}** is therefore the conventional proper-noun spelling, while *${entry.ascii}* remains a technological fallback. This places the name in Tier 2, not because the restoration is unimportant, but because the information it adds is orthographic convention rather than distinctive phonetic content.`;

  const body = `# How ${entry.unicode} became a name the internet can speak

Every address bar is a choice. When you type **${entry.unicode}**, you are not typing a novelty; you are restoring a name that the early DNS, built for English typewriters, could not carry. The plain ASCII form *${entry.ascii}* is a leftover of that constraint, not the name itself. This post is the long version of the restoration: where the name comes from, how the Hittite tradition wrote it, how it is pronounced, what the myths and the material record preserve, and why its Unicode form matters as a working scholarly citation. The claim throughout is simple — the original spelling is not decoration. It is the name.

## At a Glance

- **Restored name:** ${entry.unicode}
- **ASCII form:** ${entry.ascii}
- **Meaning:** "${entry.meaning}"
- **Domain of influence:** ${entry.domain}
- **Pantheon:** Hittite
- **Classification:** Tier ${entry.tier}
- **Original script:** ${cuneiformNote}
- **Live domain:** none — this is a domainless flagship

## Overview

**${entry.unicode}** (*${entry.ascii}*) — ${entry.domain} · ${entry.meaning} — belongs to the Hittite tradition, where it is catalogued under the domain "${entry.domain}". The name means "${entry.meaning}".

${l.domains.lead.replace(/<p class='lead-text'>/g, '').replace(/<\/p>/g, '\n\n').replace(/<em>/g, '*').replace(/<\/em>/g, '*').replace(/<strong>/g, '**').replace(/<\/strong>/g, '**')}

This temple treats **${entry.unicode}** as a flagship of the Hittite pantheon: a name whose restoration preserves scholarly accuracy and opens a window onto one of the great Bronze Age civilizations of Anatolia. The entry is domainless, meaning no Unicode domain is currently owned for it, but the restoration remains the reference form that PuniCodex defends.

## The Name

The name comes from ${l.etymology.protoLanguage} *${l.etymology.protoForm}*, meaning "${l.etymology.protoGloss}". In the Hittite scholarly tradition the normalized form is **${entry.unicode}**, written in cuneiform as **${cuneiformNote}**. The spelling is attested in tablets excavated from the Hittite capital at Boğazköy-Hattusa and related archives.

The ASCII form *${entry.ascii}* survives only because the early domain-name system could not carry distinctive Anatolian letters. It is a technological compromise, not an ancient spelling. The Unicode restoration **${entry.unicode}** recovers the full scholarly transliteration directly in the address bar. ${entry.tier === '1' ? 'Most importantly, the restoration restores the distinctive Hittite consonant that the ASCII form erases, preserving information that Hittitology treats as essential.' : 'The restoration preserves the capitalized proper-noun form that scholarship uses, distinguishing the deity from a common word or an arbitrary string.'}

## Pronunciation

The reconstructed pronunciation of the name is **${entry.ipa}** — ${entry.ipaLabel}.

For English-speaking readers, the closest practical approximation is conservative: Hittite phonology included consonants that English does not distinguish, and the exact values of some vowels remain debated. The key point is that **${entry.unicode}** is a proper noun from a dead language reconstructed by scholars, not a word whose ancient sound has been recorded. When we speak it aloud, we are continuing an act of scholarly recovery.

Kindred and historical forms of the name:

${entry.kinForms.map(k => `- **${k.label}** — ${k.form}`).join('\n')}

The pronunciation notes supplied here follow the conventions of the Chicago Hittite Dictionary and the standard handbooks of Hittite grammar. They are reconstructions, not recordings, and they will be refined as the discipline advances.

## Original Script and Scholarly Transliteration

The name is preserved in Hittite cuneiform, the wedge-shaped script the Hittites adapted from Mesopotamian models to write their own language. The cuneiform tablets that name **${entry.unicode}** were produced in the Hittite Empire between roughly 1400 and 1180 BCE, in Anatolia and northern Syria.

The original cuneiform is **${cuneiformNote}**. This is not an alphabet in the modern sense but a mixed system of logograms and syllabic signs. Divine names are often written with the divine determinative 𒀭 (dingir) or with a divine logogram such as 𒀭𒌓 (dUTU, the sun-god sign) for solar deities. Modern Hittitologists convert these signs into the Latin transcription **${entry.unicode}**.

The label "Original Script" is therefore partly a convenience. The cuneiform is the original writing system, and the Latin form is a scholarly transliteration. PuniCodex uses **${entry.unicode}** as the restoration because it is the form in which the name is cited, taught, and searched in contemporary scholarship. The ASCII form *${entry.ascii}* is a domain-name compromise; the Unicode form is the scholarly citation form.

## The Mythology

${l.mythology.lead.replace(/<p class='lead-text'>/g, '').replace(/<\/p>/g, '')}

${l.mythology.myths.map(m => `### ${m.title}\n\n${m.text.replace(/<p class='myth-text'>/g, '').replace(/<\/p>/g, '').replace(/<em>/g, '*').replace(/<\/em>/g, '*').replace(/<strong>/g, '**').replace(/<\/strong>/g, '**')}`).join('\n\n')}

## Why Tier ${entry.tier} Is the Right Classification

PuniCodex classifies every restoration by how much information the Unicode form recovers compared with the plain ASCII fallback. For **${entry.unicode}**, ${tierReason}

This classification is mechanical and rule-based. It does not measure the cultural importance of the deity; it measures the philological information carried by the spelling. **${entry.unicode}** is ${entry.tier === '1' ? 'a Tier 1 restoration because the Unicode form preserves a distinctive Anatolian consonant that ASCII cannot represent.' : 'a Tier 2 restoration because the Unicode form preserves the scholarly citation form without adding distinctive phonetic letters.'} Either way, the restoration is defended as the preferred form.

## Citation and Respect

Hittite religion is a subject of scholarly study, not a living tradition with unbroken custodial continuity. That does not mean the material should be treated casually. The names, myths, and rituals preserved in Hittite texts belong to the cultural heritage of Anatolia and to the broader human record. PuniCodex presents them with the accuracy and respect due to any ancient tradition.

The scholarly sources listed below are real works by real scholars. They do not claim final certainty — Hittitology is a living field — but they do represent the current consensus. Readers who want to go further should consult the Chicago Hittite Dictionary, Hoffner's *Hittite Myths*, and the growing body of editions and translations available through academic presses and online corpora.

## The Meaning Behind the Name

The etymology of **${entry.unicode}** is ${l.etymology.certainty === 'certain' ? 'transparent' : l.etymology.certainty === 'attested' ? 'secure' : 'uncertain'}. The best current understanding is: ${l.etymology.derivation}

Names are not labels attached at random. In the ancient Near East, a divine name carried the deity's character, domain, and power. To know the name was to know how to address the god in prayer, oath, and ritual. The restoration **${entry.unicode}** therefore does more than beautify a domain string; it preserves the scholarly form in which the name's meaning has been transmitted.

## Mythology and Worldview

Hittite mythology is not a single canon but a multilingual archive. Texts survive in Hittite, Hurrian, Hattic, Luwian, and other languages, reflecting the cosmopolitan character of the Hittite Empire. **${entry.unicode}** appears in this archive as ${entry.domain.toLowerCase()}.

The Hittite worldview located the gods in specific places: mountains, rivers, cities, and the sky. The king was the priest who maintained the relationship between human society and these divine powers. Myths were not only stories; they were scripts for ritual action. The defeat of a dragon, the return of a vanished god, or the enthronement of a storm-king was re-enacted in festivals that guaranteed the continuing order of the world.

${l.syncretism.replace(/<p class='lead-text'>/g, '').replace(/<\/p>/g, '\n\n').replace(/<em>/g, '*').replace(/<\/em>/g, '*').replace(/<strong>/g, '**').replace(/<\/strong>/g, '**')}

## Cultural Significance Today

${l.culturalLegacy.replace(/<p class='lead-text'>/g, '').replace(/<\/p>/g, '\n\n').replace(/<em>/g, '*').replace(/<\/em>/g, '*').replace(/<strong>/g, '**').replace(/<\/strong>/g, '**')}

Beyond scholarship, the names of the Hittite gods matter because they are part of the deep history of Anatolia and the ancient Near East. Turkey's archaeological heritage, museum collections, and ongoing excavations at Boğazköy-Hattusa keep this civilization visible. Restoring **${entry.unicode}** as a Unicode flagship is one small way to keep the Hittite past present in the digital infrastructure of the present.

## The Hittite Empire in Context

To understand **${entry.unicode}**, it helps to remember the world in which the name was spoken. The Hittite Empire dominated central Anatolia from roughly 1650 to 1180 BCE, with its capital at Boğazköy-Hattusa in the modern Turkish province of Çorum. Hittite kings ruled a multi-ethnic realm that spoke Hittite, Hurrian, Hattic, Luwian, Palaic, and other languages, and their archives preserve documents in all of them.

The Hittites were not isolated. They corresponded with Egyptian pharaohs, married into Babylonian royalty, traded with Aegean states, and fought and negotiated with the powers of Mesopotamia and the Levant. Their religion reflects this openness: the storm-god has Hurrian and Hattic antecedents, the sun goddess draws on Syrian and Mesopotamian solar theology, and the myths were translated and adapted from Hurrian originals. **${entry.unicode}** belongs to this cosmopolitan religious world.

The empire fell around 1180 BCE, during the Bronze Age collapse that affected the whole eastern Mediterranean. The capital was abandoned, the archives were buried, and the name **${entry.unicode}** fell silent for more than three millennia. Its recovery began in the early twentieth century, when German archaeologists excavated Hattusa and scholars began to decipher the cuneiform tablets.

## The Cuneiform Witness

The Hittites wrote on clay tablets with a stylus, impressing wedge-shaped signs into the wet clay. The script they used was borrowed from Mesopotamia, but they adapted it to their own language. A Hittite text may mix three kinds of signs: syllabic signs that represent sounds (such as 𒀀 = a), logograms that represent whole words (such as 𒀭 = "god"), and determinatives that classify a word (such as 𒌷 marking a place name).

For divine names, this means that **${entry.unicode}** could be written phonetically, syllable by syllable, or with a divine logogram, or with a combination. Modern scholars normalize these writings into the Latin alphabet. That normalization is not arbitrary: it follows conventions established by generations of Hittitologists and recorded in reference works such as the Chicago Hittite Dictionary.

The cuneiform tablets were not mass-produced books. They were working documents of the royal administration: ritual scripts, prayers, treaties, omen collections, and literary compositions. Many are broken or fragmentary, and new joins and readings continue to change our understanding. The name **${entry.unicode}** therefore comes to us through an ongoing process of reconstruction, and the Unicode restoration participates in that process by keeping the scholarly form visible.

## Reading the Name Today

When you read **${entry.unicode}** today, you are doing something the Hittites never did. You are reading a Latin-alphabet transliteration of a cuneiform name on a digital screen. The chain of mediation is long: clay tablet → excavation → photography → transliteration → Unicode font → browser rendering. Yet each step is governed by scholarly convention, and the result is a name that can be cited, searched, and taught.

The ASCII form *${entry.ascii}* interrupts this chain. It is not a transliteration; it is a domain-name artifact. It exists because the early DNS allowed only a limited set of characters, and because registrars and browsers were built around that limitation. Restoring **${entry.unicode}** as the flagship form does not erase *${entry.ascii}* — the fallback remains useful for technical compatibility — but it does establish the scholarly form as the primary identity of the name.

For students encountering Hittite religion for the first time, this distinction matters. A name is not a string; it is a node in a network of language, ritual, and history. **${entry.unicode}** in Unicode keeps that network visible.

## Why This Restoration Matters

The early internet was built on ASCII. That decision made sense for the technology of the 1960s, but it encoded an assumption that the only names worth typing were the ones that fit an English typewriter. Every restored Unicode name is a correction of that assumption.

**${entry.unicode}** matters because it is a real name from a real civilization, not a brand or a novelty. Its restoration says that the address bar can carry the scholarly form of an ancient divine name, and that the digital public sphere has room for the Hittite pantheon alongside the better-known Greek and Roman gods.

For researchers, the restoration provides a stable, citable form. For the public, it is an invitation to learn about a Bronze Age empire that wrote laws, negotiated treaties, and prayed to gods whose names we can now type exactly as scholars write them.

The Hittite corpus is one of the great recoveries of ancient literature. In the last century, scholars have brought back myths, prayers, laws, letters, and treaties from the silence of three thousand years. Restoring the names in Unicode is the next, modest step: making sure that the recovered names are not flattened again by the technical conventions of the present.

## A Note on Sources and Respect

This post rests on the scholarly consensus represented in the sources below. Hittite texts are often fragmentary, and interpretations change as new tablets are discovered and old readings revised. PuniCodex does not invent citations or claim certainty where the evidence is uncertain.

When names from extinct traditions enter modern use, the responsibility is accuracy and respect rather than custodial permission. We present **${entry.unicode}** as a subject of scholarly study and cultural heritage, not as a living object of worship. The goal is to preserve the name correctly and to point readers toward the real scholarship that makes such preservation possible.

## Related Names

The Hittite pantheon is a network of related figures whose stories intersect. **${entry.unicode}** connects to other deities in the Hittite corpus:

${entry.id === 'arinniti' ? '- **Tarḫunash** — the storm-god and king of heaven, often invoked alongside the Sun Goddess of Arinna in royal theology.\n- **Arinna** — the city whose tutelary deity rose to become supreme goddess of the state.\n- **Teššub** — the Hurrian storm-god whose mythology parallels that of Tarḫunash.\n- **Anu** — the sky-god whose succession myth shapes Hittite cosmic history.' : ''}${entry.id === 'hannahannas' ? '- **Telipinu** — the vanished god she helps to find and restore.\n- **Wurušemu** — the earth-goddess and mother of Telipinu.\n- **Ḫupašiya** — the mortal helper in the Illuyanka myth, connected through the broader Telipinu cycle.\n- **Tarḫunash** — the storm-god whose order is restored when the vanished gods return.' : ''}${entry.id === 'inaras' ? '- **Tarḫunash** — the storm-god whom she helps by trapping Illuyanka.\n- **Illuyanka** — the dragon she defeats through cunning.\n- **Ḫupašiya** — the mortal who assists her in the dragon trap.\n- **Kumarbiš** — the father of gods whose succession struggles run parallel to the dragon myth.' : ''}${entry.id === 'kumarbis' ? '- **Tarḫunash** — the storm-god who defeats Kumarbiš and succeeds him as king of heaven.\n- **Anu** — the sky-god whom Kumarbiš overthrows.\n- **Alalu** — the first king of heaven, predecessor of Anu.\n- **Ullikummi** — the stone monster Kumarbiš creates to challenge the gods.' : ''}${entry.id === 'tarhunash' ? '- **Kumarbiš** — the father of gods and rival for cosmic kingship.\n- **Illuyanka** — the dragon he defeats.\n- **Inaras** — the goddess who helps him trap the dragon.\n- **Arinna** — the sun goddess with whom he shares state theology.' : ''}${entry.id === 'wurusemu' ? '- **Telipinu** — her son, the vanished god of vegetation.\n- **Ḫannaḫannas** — the grandmother goddess sent to search for Telipinu.\n- **Tarḫunash** — the storm-god whose order is threatened when Telipinu vanishes.\n- **Cybele** — the later Phrygian mother-goddess with whom Wurušemu is sometimes compared.' : ''}

## Sources

${sourcesFor(entry).map(s => `- ${s}`).join('\n')}

---

*This post is part of the PuniCodex Hittite pantheon restoration project. For the full entry, visit the temple page for **${entry.unicode}**.*`;

  return {
    entryId: entry.id,
    title: `How ${entry.unicode} became a name the internet can speak`,
    description: `Explore the Unicode restoration of ${entry.unicode} and why the Hittite form still matters in 2026.`,
    keywords: [entry.unicode, entry.ascii, 'hittite mythology', 'Unicode domain', 'original script', 'PuniCodex', 'IDN', 'cuneiform'],
    tags: ['hittite', `Tier ${entry.tier}`, 'Unicode', 'original script', 'restoration'],
    author: 'PuniCodex Team',
    publishedAt: '2026-08-28',
    body,
    readingTime: '12 min read'
  };
}

function effectCode(entry) {
  const c = entry.colors;
  const themes = {
    arinniti: {
      label: 'Solar Disc',
      description: 'A slowly rotating solar disc with radiating rays and drifting light motes for the Sun Goddess of Arinna.',
      code: `const rays = [];
  for (let i = 0; i < 36; i++) rays.push({ a: (i / 36) * Math.PI * 2, speed: 0.001 + Math.random() * 0.001 });
  const motes = [];
  for (let i = 0; i < 60; i++) motes.push({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 1.5, life: Math.random() });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    const g = ctx.createRadialGradient(width * 0.75, height * 0.3, 0, width * 0.75, height * 0.3, width * 0.6);
    g.addColorStop(0, '#4a3010');
    g.addColorStop(1, '#0a0a10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    const cx = width * 0.75, cy = height * 0.3;
    ctx.translate(cx, cy);
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '${c.primary}';
    ctx.lineWidth = 1;
    for (const r of rays) {
      const len = 120 + Math.sin(t * r.speed) * 30;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(r.a + t * 0.002) * len, Math.sin(r.a + t * 0.002) * len);
      ctx.stroke();
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '${c.primary}';
    for (const m of motes) {
      const x = (m.x + t * 0.0001) % 1 * width;
      const y = (m.y + t * 0.00005) % 1 * height;
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();`
    },
    hannahannas: {
      label: 'Spindle Stars',
      description: 'Soft spindle-like threads and drifting hearth sparks for the grandmother goddess.',
      code: `const threads = [];
  for (let i = 0; i < 24; i++) threads.push({ x: Math.random(), y: Math.random(), a: Math.random() * Math.PI, len: 60 + Math.random() * 100, speed: 0.0005 + Math.random() * 0.001 });
  const sparks = [];
  for (let i = 0; i < 40; i++) sparks.push({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random(), life: Math.random() });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#120d14';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '${c.primary}';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.2;
    for (const th of threads) {
      const x = th.x * width;
      const y = th.y * height;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(th.a + t * th.speed);
      ctx.beginPath();
      ctx.moveTo(-th.len / 2, 0);
      ctx.lineTo(th.len / 2, 0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '${c.secondary}';
    for (const s of sparks) {
      const x = (s.x + Math.sin(t * 0.001 + s.life) * 0.02) * width;
      const y = (s.y - t * 0.0001) % 1 * height;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();`
    },
    inaras: {
      label: 'Steppe Wind',
      description: 'Drifting grass-like lines and animal-shaped motes for the goddess of the wild steppe.',
      code: `const blades = [];
  for (let i = 0; i < 50; i++) blades.push({ x: Math.random(), h: 20 + Math.random() * 40, sway: Math.random() });
  const motes = [];
  for (let i = 0; i < 30; i++) motes.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2 });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0a120d';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '${c.primary}';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.25;
    for (const b of blades) {
      const x = b.x * width;
      const y = height * 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(t * 0.002 + b.sway) * 15, y - b.h);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '${c.secondary}';
    for (const m of motes) {
      const x = (m.x + t * 0.0002) % 1 * width;
      const y = height * 0.3 + Math.sin(t * 0.001 + m.x * 10) * 30;
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();`
    },
    kumarbis: {
      label: 'Chthonic Grain',
      description: 'Slow golden spirals and underground sparks for the father of gods and grain deity.',
      code: `const spirals = [];
  for (let i = 0; i < 12; i++) spirals.push({ x: Math.random(), y: Math.random(), r: 40 + Math.random() * 80, speed: 0.002 + Math.random() * 0.002 });
  const grains = [];
  for (let i = 0; i < 80; i++) grains.push({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random() });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#110f0a';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '${c.primary}';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.2;
    for (const s of spirals) {
      const cx = s.x * width;
      const cy = s.y * height;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.1) {
        const r = (a / (Math.PI * 4)) * s.r;
        const x = cx + Math.cos(a + t * s.speed) * r;
        const y = cy + Math.sin(a + t * s.speed) * r * 0.5;
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '${c.secondary}';
    for (const g of grains) {
      const x = (g.x + t * 0.00005) % 1 * width;
      const y = (g.y + t * 0.00003) % 1 * height;
      ctx.beginPath();
      ctx.arc(x, y, g.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();`
    },
    tarhunash: {
      label: 'Storm Rays',
      description: 'Forked lightning flashes and rain streaks for the Hittite storm-god.',
      code: `let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#0a1018');
    g.addColorStop(1, '#1a2040');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '${c.secondary}';
    ctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() - 0.5) * 40, height);
      ctx.stroke();
    }
    if (Math.random() > 0.94) {
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '${c.primary}';
      ctx.lineWidth = 2;
      let x = width * (0.3 + Math.random() * 0.4);
      let y = 0;
      ctx.beginPath();
      ctx.moveTo(x, y);
      while (y < height * 0.7) {
        x += (Math.random() - 0.5) * 100;
        y += 30 + Math.random() * 50;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();`
    },
    wurusemu: {
      label: 'Earth Roots',
      description: 'Slow-growing root-like tendrils and rising particles for the great earth mother.',
      code: `const roots = [];
  for (let i = 0; i < 20; i++) roots.push({ x: Math.random(), w: 1 + Math.random() * 2, speed: 0.0003 + Math.random() * 0.0003 });
  const motes = [];
  for (let i = 0; i < 60; i++) motes.push({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 1.5, life: Math.random() });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0a120a';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '${c.primary}';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    for (const r of roots) {
      const x = r.x * width;
      ctx.beginPath();
      ctx.moveTo(x, height);
      let cx = x, cy = height;
      for (let j = 0; j < 30; j++) {
        cx += Math.sin(t * r.speed + j * 0.3 + r.x * 10) * 8;
        cy -= height * 0.015;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '${c.secondary}';
    for (const m of motes) {
      const x = (m.x + Math.sin(t * 0.001 + m.life) * 0.02) * width;
      const y = (m.y - t * 0.0001 * m.life) % 1 * height;
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();`
    }
  };
  return themes[entry.id];
}

function main() {
  mkdir(OUT);
  let maxWords = 0;
  for (const entry of ENTRIES) {
    const lex = LEXICON.find(e => e.id === entry.id);
    if (lex && lex.breakdown) entry.breakdown = lex.breakdown;
    const dir = path.join(OUT, entry.id);
    mkdir(dir);
    mkdir(path.join(dir, 'assets'));

    writeJson(path.join(dir, 'lore.json'), lore(entry));
    writeJson(path.join(dir, 'scholars.json'), scholars(entry));
    const blogData = blog(entry);
    writeJson(path.join(dir, 'blog.json'), blogData);
    const wc = blogData.body.split(/\s+/).filter(w => w.length > 0).length;
    maxWords = Math.max(maxWords, wc);
    writeTxt(path.join(dir, 'patterns.txt'), entry.patterns);
    writeTxt(path.join(dir, 'gallery.md'), 'curate via Commons');
    const fx = effectCode(entry);
    writeJson(path.join(dir, 'effect.json'), {
      canvasId: `${entry.id}-canvas`,
      label: fx.label,
      description: fx.description,
      code: fx.code
    });
    writeJson(path.join(dir, 'archetype-colors.json'), entry.colors);

    const srcDir = path.join(ASSET_SRC, entry.id);
    if (fs.existsSync(srcDir)) {
      for (const f of ['mascot', 'logomark', 'logolockup']) {
        const src = path.join(srcDir, `${entry.id}_${f}.png`);
        const dst = path.join(dir, 'assets', `${entry.id}_${f}.png`);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
        } else {
          console.warn(`Missing asset: ${src}`);
        }
      }
    } else {
      console.warn(`No source asset folder for ${entry.id}`);
    }

    console.log(`Wrote fragments for ${entry.id} (blog ${wc} words)`);
  }
  console.log(`Max blog word count: ${maxWords}`);
}

main();
