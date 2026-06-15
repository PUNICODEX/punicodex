#!/usr/bin/env node
/**
 * Pantheon-aware fallback lore content for flagships without a rich catalog entry.
 * The output mirrors the structure of scripts/lore-catalog.json so that the same
 * CSS and HTML templates can render it elegantly.
 */


function iconSvg(pathData, stroke = 'var(--primary)') {
  return `<svg viewBox="0 0 64 64" fill="none" stroke="${stroke}" stroke-width="1.5"><path d="${pathData}"/></svg>`;
}

// ── Icon path library (64×64 viewBox) ──
const ICONS = {
  flame: 'M32 8C24 16 20 28 24 36C26 40 30 42 32 48C34 42 38 40 40 36C44 28 40 16 32 8Z',
  sun: 'M32 16C24 16 18 24 18 32C18 44 26 52 32 56C38 52 46 44 46 32C46 24 40 16 32 16ZM32 8V12M32 52V56M16 32H12M52 32H56M20 20L17 17M44 44L47 47M20 44L17 47M44 20L47 17',
  lightning:
    'M16 40C20 28 28 24 32 24C36 24 44 28 48 40C44 36 36 32 32 32C28 32 20 36 16 40ZM32 8V24M24 16L32 8L40 16M8 48H56',
  wave: 'M8 36C16 28 24 44 32 36C40 28 48 44 56 36M8 48C16 40 24 56 32 48C40 40 48 56 56 48',
  trident:
    'M32 8V48M24 16C24 16 20 8 16 8C12 8 8 16 8 16M24 16C24 16 28 8 32 8C36 8 40 16 40 16M40 16C40 16 44 8 48 8C52 8 56 16 56 16M32 48L24 56M32 48L40 56',
  spear: 'M16 16L48 48M48 48L56 56M48 48L40 56M48 48L56 40M16 16L8 8M16 16L24 8M16 16L8 24',
  shield: 'M32 8L56 16V32C56 44 32 56 32 56C32 56 8 44 8 32V16L32 8Z',
  heart:
    'M32 52C32 52 8 36 8 22C8 14 14 8 22 8C26 8 30 10 32 14C34 10 38 8 42 8C50 8 56 14 56 22C56 36 32 52 32 52Z',
  rose: 'M32 8C28 12 24 16 24 22C24 28 28 32 32 36C36 32 40 28 40 22C40 16 36 12 32 8ZM32 36V56M24 44H40',
  mirror:
    'M32 8C22 8 14 18 14 32C14 46 22 56 32 56C42 56 50 46 50 32C50 18 42 8 32 8ZM32 16C38 16 42 24 42 32C42 40 38 48 32 48C26 48 22 40 22 32C22 24 26 16 32 16Z',
  book: 'M16 16H48V48H16V16ZM24 24H40V40H24V24Z',
  scroll: 'M16 12H20V52H16V12ZM44 12H48V52H44V12ZM20 16H44V20H20V16ZM20 44H44V48H20V44Z',
  owl: 'M32 12C24 12 18 20 18 32C18 44 24 52 32 52C40 52 46 44 46 32C46 20 40 12 32 12ZM24 26C26 26 28 28 28 30C28 32 26 34 24 34C22 34 20 32 20 30C20 28 22 26 24 26ZM40 26C42 26 44 28 44 30C44 32 42 34 40 34C38 34 36 32 36 30C36 28 38 26 40 26ZM32 38C30 38 28 40 28 42H36C36 40 34 38 32 38Z',
  torch:
    'M32 8C28 12 24 18 24 24C24 30 28 34 32 38C36 34 40 30 40 24C40 18 36 12 32 8ZM32 38V52M24 52H40',
  key: 'M20 28C20 21 25 16 32 16C39 16 44 21 44 28C44 35 39 40 32 40C30 40 28 39 26 38L18 46L14 42L22 34C21 32 20 30 20 28ZM32 24C30 24 28 26 28 28C28 30 30 32 32 32C34 32 36 30 36 28C36 26 34 24 32 24Z',
  cypress: 'M32 8C28 20 24 32 24 44C24 48 28 52 32 56C36 52 40 48 40 44C40 32 36 20 32 8ZM32 44V56',
  grain:
    'M32 8V24M32 32V48M24 16C24 16 28 24 32 24C36 24 40 16 40 16M24 32C24 32 28 40 32 40C36 40 40 32 40 32M24 48C24 48 28 56 32 56C36 56 40 48 40 48',
  cornucopia:
    'M16 48C20 32 28 24 32 20C36 24 44 32 48 48C44 44 36 40 32 40C28 40 20 44 16 48ZM32 20V12',
  serpent:
    'M16 32C16 24 24 16 32 16C40 16 48 24 48 32C48 40 40 48 32 48C28 48 24 46 20 44M16 32C12 32 8 36 8 40C8 44 12 48 16 48M48 32C52 32 56 28 56 24C56 20 52 16 48 16',
  mountain: 'M8 56L24 24L32 40L44 16L56 56H8Z',
  wheel:
    'M32 8C18 8 8 18 8 32C8 46 18 56 32 56C46 56 56 46 56 32C56 18 46 8 32 8ZM32 16C40 16 48 24 48 32C48 40 40 48 32 48C24 48 16 40 16 32C16 24 24 16 32 16ZM32 24C28 24 24 28 24 32C24 36 28 40 32 40C36 40 40 36 40 32C40 28 36 24 32 24Z',
  wing: 'M8 32C16 24 24 24 32 28C40 24 48 24 56 32C48 36 40 36 32 32C24 36 16 36 8 32ZM8 40C16 32 24 32 32 36C40 32 48 32 56 40C48 44 40 44 32 40C24 44 16 44 8 40Z',
  hammer: 'M20 12L28 20M28 20L20 28M28 20L48 40M48 40L56 32M48 40L40 48M24 48L40 32',
  anvil: 'M16 40H48V48H16V40ZM20 32H44V40H20V32ZM24 24H40V32H24V24Z',
  bow: 'M16 48C16 24 24 8 32 8C40 8 48 24 48 48M16 48H48M32 8V56',
  arrow: 'M8 32H48M48 32L40 24M48 32L40 40',
  lyre: 'M20 48V24C20 16 26 12 32 12C38 12 44 16 44 24V48M20 48H44M24 24V48M28 20V48M36 20V48M40 24V48',
  eye: 'M32 16C22 16 14 24 8 32C14 40 22 48 32 48C42 48 50 40 56 32C50 24 42 16 32 16ZM32 24C36 24 40 28 40 32C40 36 36 40 32 40C28 40 24 36 24 32C24 28 28 24 32 24Z',
  scales:
    'M32 8V44M16 20H48M16 20L8 36H24L16 20ZM48 20L40 36H56L48 20ZM32 44C28 44 24 48 24 52H40C40 48 36 44 32 44Z',
  lion: 'M16 16C20 12 28 12 32 16C36 12 44 12 48 16C52 20 52 28 48 32C52 36 52 44 48 48C44 52 36 52 32 48C28 52 20 52 16 48C12 44 12 36 16 32C12 28 12 20 16 16ZM24 24C26 24 28 26 28 28C28 30 26 32 24 32C22 32 20 30 20 28C20 26 22 24 24 24ZM40 24C42 24 44 26 44 28C44 30 42 32 40 32C38 32 36 30 36 28C36 26 38 24 40 24Z',
  gate: 'M8 8H56V56H8V8ZM16 16V48M24 16V48M32 16V48M40 16V48M48 16V48M16 16H48',
  temple: 'M32 8L56 24H8L32 8ZM16 24V48H48V24M24 32H40V48H24V32Z',
  map: 'M8 16L24 8L40 16L56 8V48L40 56L24 48L8 56V16ZM24 8V48M40 16V56',
  crown: 'M16 40L24 24L32 40L40 24L48 40V48H16V40Z',
  tree: 'M32 8C24 16 16 24 16 32C16 40 24 44 32 48C40 44 48 40 48 32C48 24 40 16 32 8ZM32 48V56',
  serpent2:
    'M12 32C12 20 20 12 32 12C44 12 52 20 52 32C52 44 44 52 32 52C24 52 16 48 12 40M12 32H8M52 32H56',
  lotus:
    'M32 8C28 16 24 24 24 32C24 44 28 52 32 56C36 52 40 44 40 32C40 24 36 16 32 8ZM16 32C16 24 22 18 32 18C42 18 48 24 48 32',
  star: 'M32 8L38 24H56L42 34L48 52L32 42L16 52L22 34L8 24H26L32 8Z',
  moon: 'M24 8C34 8 42 18 42 32C42 46 34 56 24 56C30 48 34 40 34 32C34 24 30 16 24 8Z',
  horse:
    'M16 32C16 24 22 16 32 16C40 16 44 22 48 28C52 28 56 32 56 36V48H48V40C44 44 38 44 32 44C24 44 16 40 16 32ZM16 32V48H24V32',
  bridge: 'M8 40C16 24 24 16 32 16C40 16 48 24 56 40M8 48H56',
  scales2: 'M32 8V40M12 24H52M12 24L4 40H20L12 24ZM52 24L44 40H60L52 24Z',
};

function getDomainCards(entry) {
  const theme = [entry.domain, entry.meaning].filter(Boolean).join(' ').toLowerCase();
  const cards = [];
  const add = (key, name, desc) => {
    if (cards.length >= 4) return;
    const path = ICONS[key];
    if (path) cards.push({ iconPath: path, name, desc });
  };

  if (theme.includes('sky') || theme.includes('thunder') || theme.includes('king of gods')) {
    add(
      'lightning',
      'Lord of the Sky',
      'The celestial heights, thunder, and the sovereignty that holds the cosmos together.'
    );
    add(
      'crown',
      'Divine Kingship',
      'Authority over gods and mortals, the final arbiter of justice and order.'
    );
  }
  if (theme.includes('sea') || theme.includes('water') || theme.includes('ocean')) {
    add(
      'wave',
      'Mastery of Waters',
      'The restless sea, the deep, and the life that teems beneath the surface.'
    );
    add(
      'trident',
      'Three-Pronged Sceptre',
      'A weapon and emblem of dominion over rivers, storms, and earthquakes.'
    );
  }
  if (theme.includes('sun') || theme.includes('light')) {
    add(
      'sun',
      'Solar Radiance',
      'The eye that sees all, the fire that nourishes and burns, the measure of time.'
    );
    add(
      'eye',
      'All-Seeing Gaze',
      'Nothing hidden escapes notice; light is both gift and judgment.'
    );
  }
  if (theme.includes('war') || theme.includes('battle') || theme.includes('warrior')) {
    add(
      'spear',
      'Divine Warrior',
      'The clash of arms, the discipline of the phalanx, and the courage that turns the tide.'
    );
    add(
      'shield',
      'Protector of the City',
      'The wall between civilization and chaos, the defense of hearth and law.'
    );
  }
  if (theme.includes('love') || theme.includes('desire') || theme.includes('beauty')) {
    add(
      'heart',
      'Desire and Union',
      'The force that draws beings together, the beauty that compels worship.'
    );
    add(
      'rose',
      'Fragile and Fierce',
      'Love as both tenderness and conquest, fragrant and thorned.'
    );
  }
  if (theme.includes('wisdom') || theme.includes('knowledge') || theme.includes('craft')) {
    add('book', 'Keeper of Knowledge', 'The arts of writing, strategy, medicine, and memory.');
    add(
      'owl',
      'Sharp-Eyed Counsel',
      'Wisdom that sees through deception and chooses the better path.'
    );
  }
  if (theme.includes('death') || theme.includes('underworld')) {
    add(
      'key',
      'Keeper of the Gate',
      'The boundary between living and dead, the keys that lock and release.'
    );
    add(
      'torch',
      'Light in Darkness',
      'The flame that guides souls and reveals what daylight hides.'
    );
  }
  if (theme.includes('fertility') || theme.includes('harvest') || theme.includes('earth')) {
    add(
      'grain',
      'Fruit of the Field',
      'The grain that feeds cities, the cycle of sowing and reaping.'
    );
    add(
      'cornucopia',
      'Abundance',
      'The overflowing horn, the sign that the earth is generous when honored.'
    );
  }
  if (theme.includes('fire') || theme.includes('forge') || theme.includes('smith')) {
    add(
      'flame',
      'Sacred Fire',
      'The transformative fire that refines metal, purifies offerings, and reveals truth.'
    );
    add(
      'anvil',
      'Divine Craft',
      'The workshop where raw matter is shaped into beauty and weaponry.'
    );
  }
  if (theme.includes('hunt') || theme.includes('wild')) {
    add(
      'bow',
      'Huntress of the Wild',
      'The untamed places, the chase, and the swift mercy of the arrow.'
    );
    add(
      'mountain',
      'High Places',
      'The peaks and forests where the wild things run and the goddess walks.'
    );
  }
  if (theme.includes('music') || theme.includes('prophecy') || theme.includes('healing')) {
    add(
      'lyre',
      'Music and Harmony',
      'The lyre that orders emotion, the song that heals and prophesies.'
    );
    add('eye', 'Prophetic Sight', 'The inner eye that reads omens and the will of the gods.');
  }
  if (theme.includes('time') || theme.includes('age')) {
    add('wheel', 'The Turning Age', 'The cycle of ages, the devouring march of time.');
    add('scythe', 'The Reaper', 'Time as the harvester of all things, gentle and inexorable.');
  }
  if (theme.includes('messenger') || theme.includes('travel') || theme.includes('commerce')) {
    add('wing', 'Swift Messenger', 'The winged sandal and staff, speed between realms.');
    add(
      'scroll',
      'Written Word',
      'Contracts, letters, and the record-keeping that makes trade possible.'
    );
  }
  if (
    entry.pantheon === 'greek-location' ||
    entry.pantheon === 'japanese' ||
    entry.pantheon.includes('location')
  ) {
    add(
      'map',
      'Geographic Heart',
      'A place whose name became a synonym for a whole culture or way of life.'
    );
    add('temple', 'Sacred Center', 'Temples, festivals, and the rituals that made the city holy.');
    add('crown', 'Political Power', 'A seat of kings, assemblies, or empires that shaped history.');
  }

  // Ensure at least something relevant
  if (cards.length < 2) {
    add(
      'flame',
      'Sacred Presence',
      `The power of ${entry.unicode} made present in fire, ritual, and invocation.`
    );
    add(
      'altar',
      'Altar and Offering',
      'The place where mortals and the divine meet in exchange and praise.'
    );
  }
  if (cards.length < 2) {
    add(
      'star',
      'Celestial Mark',
      'A name written in the sky, a point of orientation for myth and navigation.'
    );
  }
  return cards.slice(0, 4);
}

function getSymbols(entry) {
  const theme = [entry.domain, entry.meaning].filter(Boolean).join(' ').toLowerCase();
  const symbols = [];
  const add = (name, meaning) => {
    if (symbols.length >= 4) return;
    symbols.push({ name, meaning });
  };
  if (theme.includes('sky') || theme.includes('thunder')) {
    add('Eagle', 'The bird that rides the storm and carries the god’s will');
    add('Thunderbolt', 'The weapon that enforces cosmic law');
  }
  if (theme.includes('sea')) {
    add('Trident', 'Three prongs for rule over sea, sky, and earth');
    add('Dolphin', 'The creature that guides ships and loves the god');
  }
  if (theme.includes('sun')) {
    add('Solar disc', 'The round face of the sun, sometimes winged');
    add('Chariot', 'The vehicle that carries light across the sky');
  }
  if (theme.includes('war')) {
    add('Spear', 'The first weapon, the sign of contested ground');
    add('Helmet', 'The armor of the warrior-god, polished and feared');
  }
  if (theme.includes('love')) {
    add('Dove', 'The bird of desire and faithful union');
    add('Rose', 'Beauty that opens and wounds');
  }
  if (theme.includes('wisdom')) {
    add('Owl', 'The bird that sees in darkness, emblem of counsel');
    add('Aegis', 'The protective mantle stamped with power');
  }
  if (theme.includes('death')) {
    add('Torch', 'Light turned downward into the underworld');
    add('Cypress', 'The tree that marks the boundary of the dead');
  }
  if (theme.includes('fertility')) {
    add('Sheaf of wheat', 'The gathered harvest, the gift of cultivated earth');
    add('Serpent', 'The earth’s hidden vitality, shedding and renewed');
  }
  if (theme.includes('fire')) {
    add('Flame', 'The visible body of fire, never the same twice');
    add('Tongs', 'The tools that handle what mortals cannot touch');
  }
  if (theme.includes('hunt')) {
    add('Bow', 'The crescent of the hunt, swift and silent');
    add('Deer', 'The animal that moves between wild and sacred');
  }
  if (theme.includes('music')) {
    add('Lyre', 'The seven-stringed instrument that orders emotion');
    add('Laurel', 'The tree whose leaves crown poets and victors');
  }
  if (theme.includes('time')) {
    add('Sickle', 'The curved blade that harvests years');
    add('Hourglass', 'The measured fall of sand that none can stop');
  }
  if (entry.pantheon === 'greek-location' || entry.pantheon === 'japanese') {
    add('Fortifications', 'Walls that defined the city against enemies and time');
    add('Coin', 'The small face of the city, stamped and traded across seas');
  }
  if (symbols.length === 0) {
    add('Sacred flame', 'The fire that burns on altars in the name’s honor');
    add('Laurel wreath', 'Victory, purity, and the favor of the divine');
    add('Libation bowl', 'The vessel from which offerings are poured');
  }
  return symbols.slice(0, 4);
}

function describeMarks(entry) {
  const u = entry.unicode;
  const pantheon = entry.pantheon;
  if (pantheon === 'greek' || pantheon === 'greek-location') {
    const hasStress = /[άέήίόύώ]/u.test(u) || /[ÁÉÍÓÚáéíóú]/u.test(u);
    const hasLength = /[ηωᾱῑῡḗṓ]/u.test(u) || /[ēōāīū]/u.test(u);
    if (hasStress && hasLength)
      return 'The Greek form carries both pitch accent and vowel length: the acute or circumflex marks a rise in pitch, while η, ω, or a macron marks duration. Together they preserve the full prosodic signature of the name.';
    if (hasStress)
      return 'The Greek form carries an acute or circumflex accent, marking a rise or rise-fall in pitch. Without it, the name flattens into modern stress rather than ancient melody.';
    if (hasLength)
      return 'The Greek form preserves long vowels — η, ω, or macron-length α, ι, υ. These durations distinguish meanings and meter, and they are the first things lost in plain ASCII.';
    return 'The Greek form preserves distinctions of spelling and dialect that plain ASCII erases. Even where accent marks are not used, the classical orthography carries philological weight.';
  }
  if (pantheon === 'sanskrit' || pantheon === 'buddhist') {
    return 'The IAST transliteration uses macrons (ā, ī, ū) for long vowels and dots beneath consonants (ṭ, ḍ, ṇ, ṣ) for retroflex articulation. These marks are not decorative: they distinguish words and preserve the meter of Vedic verse.';
  }
  if (pantheon === 'norse') {
    return 'Old Norse orthography uses thorn (þ) and eth (ð) for the two "th" sounds, and the letter ǫ for a rounded back vowel. Macrons mark long vowels. These letters encode pronunciations that modern English "th" cannot capture.';
  }
  if (pantheon === 'egyptian') {
    return 'The Egyptological transliteration uses special letters — ꜥ (ain), ꜣ (aleph), ḥ, ṯ, ḏ — to render consonants that have no exact English equivalent. The vowels are not recorded in hieroglyphs and must be reconstructed from Coptic and comparative evidence.';
  }
  if (pantheon === 'mesopotamian') {
    return 'Cuneiform writing mixes logograms (Sumerograms) and syllabic signs. The circumflex in Akkadian names often marks vowel length from contraction, not Greek-style stress. Divine names are usually preceded by the determinative 𒀭 (dingir), "god."';
  }
  if (pantheon === 'zoroastrian') {
    return 'Avestan script uses caron letters — š, ž, č — for sounds distinct from their plain counterparts. The caron is not a stress mark; it records the actual pronunciation of the ancient liturgical language preserved by the Zoroastrian priesthood.';
  }
  if (pantheon === 'japanese') {
    return 'Hepburn romanization marks long vowels with macrons (ō, ū) to distinguish them from short vowels. In Japanese these length differences can change meaning; the macron is therefore a feature of the name, not an ornament.';
  }
  if (pantheon === 'chinese' || pantheon === 'taoist') {
    return 'Pinyin romanization uses tone marks (acute, grave, caron, overline) to distinguish syllables that would otherwise be homophones. The tone is as much a part of the name as the consonants and vowels.';
  }
  if (pantheon === 'celtic' || pantheon === 'slavic') {
    return 'The acute accent marks stress or vowel quality in the scholarly transliteration. It separates the name from its later, flattened forms and signals that the original language had distinctions plain ASCII cannot show.';
  }
  return 'The restored Unicode form preserves diacritics and script distinctions that plain ASCII erases: vowel length, stress, aspiration, or other phonetic features that make the name specific.';
}

function getPronunciationStub(entry) {
  const marksNote = describeMarks(entry);
  const pantheonLabel = entry.pantheon === 'greek-location' ? 'Greek' : entry.pantheon;
  const approx = approximatePronunciation(entry);
  const kin = kinFor(entry);
  const note = `${entry.unicode} is ${entry.tierLabel || `Tier ${entry.tier}`}. ${marksNote}`;

  return {
    ipa: approx.ipa,
    ipaLabel: `${pantheonLabel.charAt(0).toUpperCase() + pantheonLabel.slice(1)} Approximation`,
    phonemes: approx.phonemes,
    approximation: approx.text,
    kin,
    note,
  };
}

function approximatePronunciation(entry) {
  const u = entry.unicode;

  // Greek rough approximation
  if (entry.pantheon === 'greek' || entry.pantheon === 'greek-location') {
    return {
      ipa: '/reconstructed/',
      text: `Traditional English pronunciation tends to stress the first syllable, but the ancient ${u.includes('η') || u.includes('ῡ') || u.includes('ω') || /[āō]/u.test(u) ? 'long vowels gave the name a measured, singing quality' : 'pitch accent gave the name a rise and fall that modern English does not reproduce'}.`,
      phonemes: [
        {
          symbol: 'Vowels',
          desc: 'Ancient Greek had twelve vowels, including long and short pairs; the restored form preserves length where it matters.',
        },
        {
          symbol: 'Accent',
          desc:
            u.includes('Ά') || /[άέήίόύώ]/u.test(u)
              ? 'The acute marks a rise in pitch, not stress — the name was sung as much as spoken.'
              : 'The circumflex marks a rise-and-fall pitch on a long vowel, the signature of elevated diction.',
        },
        {
          symbol: 'Consonants',
          desc: 'Classical Greek distinguished aspirated stops (ph, th, kh) from plain ones; these are not English f, th, or kh.',
        },
      ],
    };
  }

  // Sanskrit
  if (entry.pantheon === 'sanskrit' || entry.pantheon === 'buddhist') {
    return {
      ipa: '/ʋaːtʃ/',
      text: `Pronounce each written letter: long vowels are held, retroflex consonants curl the tongue, and aspiration is audible. Stress in Sanskrit is usually on the penultimate syllable if it is heavy.`,
      phonemes: [
        {
          symbol: 'Macron',
          desc: 'ā, ī, ū are long; they are held roughly twice as long as short vowels and can change meaning.',
        },
        {
          symbol: 'Retroflex',
          desc: 'ṭ, ḍ, ṇ, ṣ, ḥ are pronounced with the tongue curled back — a sound English lacks.',
        },
        {
          symbol: 'Aspiration',
          desc: 'kh, gh, th, dh, ph, bh are not clusters but single aspirated consonants.',
        },
      ],
    };
  }

  // Norse
  if (entry.pantheon === 'norse') {
    return {
      ipa: '/reconstructed/',
      text: 'Old Norse pronunciation had short and long vowels, a rolled r, and two distinct "th" sounds (þ and ð). Modern Icelandic is the closest living relative.',
      phonemes: [
        {
          symbol: 'þ / ð',
          desc: 'Thorn (þ) is voiceless "th" as in "thin"; eth (ð) is voiced "th" as in "this".',
        },
        {
          symbol: 'ǫ / ö',
          desc: 'The rounded back vowel ǫ (and later ö) has no exact English equivalent.',
        },
        {
          symbol: 'Length',
          desc: 'Macrons mark long vowels and consonants; length often distinguishes meaning.',
        },
      ],
    };
  }

  // Egyptian
  if (entry.pantheon === 'egyptian') {
    return {
      ipa: '/reconstructed/',
      text: 'Hieroglyphs record consonants, not vowels. Egyptologists supply vowels from Coptic and comparative Semitic evidence; the exact ancient pronunciation is partly unknown.',
      phonemes: [
        {
          symbol: 'ꜥ / ꜣ',
          desc: 'Ain (ꜥ) is a voiced pharyngeal fricative; aleph (ꜣ) is a glottal stop or laryngeal sound.',
        },
        {
          symbol: 'ḫ / ḥ',
          desc: 'Velar and pharyngeal voiceless fricatives — sounds from the back of the throat.',
        },
        {
          symbol: 'Vowels',
          desc: 'Not written; the transliteration is a scholarly convention, not a phonetic transcript.',
        },
      ],
    };
  }

  // Mesopotamian
  if (entry.pantheon === 'mesopotamian') {
    return {
      ipa: '/reconstructed/',
      text: 'Akkadian and Sumerian had vowel length, emphatic consonants, and syllabic values that cuneiform signs only partly capture. The circumflex often marks length from contraction.',
      phonemes: [
        {
          symbol: 'Circumflex',
          desc: 'In Akkadian, a circumflex usually indicates a long vowel arising from contraction, not stress.',
        },
        {
          symbol: 'Emphatics',
          desc: 'ṭ, ṣ, ḳ are pronounced with a tight, back-of-throat articulation distinct from plain t, s, k.',
        },
        {
          symbol: 'Sumerograms',
          desc: 'A single cuneiform sign can represent a Sumerian word read in Akkadian.',
        },
      ],
    };
  }

  // Zoroastrian
  if (entry.pantheon === 'zoroastrian') {
    return {
      ipa: '/aʃa/',
      text: 'Avestan has a clear, open vowel system and distinguishes plain and palatal/postalveolar sibilants. The caron letters (š, ž, č) are genuine phonemes, not accent marks.',
      phonemes: [
        { symbol: 'a', desc: 'Open unrounded vowel, similar to the "a" in "father."' },
        {
          symbol: 'š',
          desc: 'Voiceless postalveolar fricative [ʃ], like English "sh" but sharper.',
        },
        {
          symbol: 'Length',
          desc: 'Vowel quantity matters in Avestan; long vowels are held distinctly longer.',
        },
      ],
    };
  }

  // Japanese
  if (entry.pantheon === 'japanese') {
    return {
      ipa: '/reconstructed/',
      text: 'Hepburn romanization gives a close approximation. Long vowels (ō, ū) are held, and r is flapped like a soft Spanish r.',
      phonemes: [
        {
          symbol: 'Long vowels',
          desc: 'ō and ū are held about twice as long as short o and u; they can change meaning.',
        },
        { symbol: 'R', desc: 'Japanese r is a single flap, not the English retroflex r.' },
        {
          symbol: 'Pitch',
          desc: 'Japanese uses pitch accent; the name has a characteristic rise and fall.',
        },
      ],
    };
  }

  // Generic fallback
  return {
    ipa: '/reconstructed/',
    text: `The restored form ${entry.unicode} is pronounced with the diacritics it displays. Each mark — macron, acute, caron, or dot — records a sound or quantity that plain ${entry.ascii} cannot show.`,
    phonemes: [
      {
        symbol: 'Vowels',
        desc: 'Long vowels (macrons) are held; accented vowels carry pitch or stress depending on the language.',
      },
      {
        symbol: 'Consonants',
        desc: 'Special letters (š, þ, ḥ, ṣ, etc.) encode sounds that English lacks.',
      },
      {
        symbol: 'Tradition',
        desc: `The ${entry.pantheon} sound system gives the name its particular weight and resonance.`,
      },
    ],
  };
}

function kinFor(entry) {
  const pantheon = entry.pantheon;
  if (pantheon === 'greek' || pantheon === 'greek-location') {
    return [
      {
        label: 'Greek root',
        form:
          entry.meaning ||
          'The name belongs to the Greek lexicon and its Indo-European background.',
      },
      {
        label: 'Latin',
        form: 'Many Greek names were borrowed into Latin and then into the modern European languages.',
      },
    ];
  }
  if (pantheon === 'sanskrit' || pantheon === 'buddhist') {
    return [
      {
        label: 'PIE',
        form: 'Indo-European *wekʷ- "to speak" and related roots underlie much Sanskrit vocabulary.',
      },
      {
        label: 'Modern',
        form: 'The name survives in Hindi and other modern Indian languages, often in ritual or scholarly use.',
      },
    ];
  }
  if (pantheon === 'norse') {
    return [
      {
        label: 'Old Norse',
        form: 'The form is attested in the Poetic and Prose Eddas, skaldic verse, and runic inscriptions.',
      },
      {
        label: 'Modern',
        form: 'The name persists in Icelandic, Faroese, Scandinavian place names, and modern fantasy.',
      },
    ];
  }
  if (pantheon === 'egyptian') {
    return [
      {
        label: 'Coptic',
        form: 'Coptic is the final stage of Egyptian and provides clues to vowel pronunciation.',
      },
      {
        label: 'Greek',
        form: 'Many Egyptian names reached us through Greek transcriptions in Herodotus and later authors.',
      },
    ];
  }
  if (pantheon === 'mesopotamian') {
    return [
      { label: 'Sumerian', form: 'Many names begin as Sumerian logograms read in Akkadian.' },
      {
        label: 'Akkadian',
        form: 'The East Semitic form is recorded in syllabic cuneiform and lexical lists.',
      },
    ];
  }
  if (pantheon === 'zoroastrian') {
    return [
      {
        label: 'Avestan',
        form: 'The liturgical language of the Zoroastrian canon, closely related to Old Persian and Sanskrit.',
      },
      {
        label: 'Old Persian',
        form: 'The imperial language of the Achaemenids preserves related terms such as arta.',
      },
    ];
  }
  if (pantheon === 'japanese') {
    return [
      {
        label: 'Japanese',
        form: 'Written in kanji and pronounced with the native Japanese reading (kun) or Sino-Japanese reading (on).',
      },
      {
        label: 'Modern',
        form: 'The name is still used in modern Japanese as a place name, given name, or cultural reference.',
      },
    ];
  }
  return [
    {
      label: 'Tradition',
      form: `The ${pantheon} form preserves sounds and spellings lost in plain ASCII.`,
    },
    {
      label: 'Modern',
      form: 'The name continues to appear in scholarship, place names, and contemporary media.',
    },
  ];
}

function getMythStub(entry) {
  const meaning = entry.meaning || entry.domain;
  const domain = entry.domain;
  const pantheon = entry.pantheon;

  const lead = `<p class='lead-text'>${entry.unicode} belongs to the ${pantheon} tradition as <strong>${domain}</strong>. ${meaning ? `The name is understood as "${meaning}."` : ''} Across hymns, inscriptions, and later literature, ${entry.unicode} became a point where human experience — ${domain.toLowerCase()} — was gathered into divine form.</p>`;

  const myths = [];
  if (entry.etymology?.protoForm) {
    myths.push({
      tag: 'Etymology',
      title: 'The Root Beneath the Name',
      text: `<p class='myth-text'>The name reaches back to ${entry.etymology.protoForm}${entry.etymology.protoGloss ? `, meaning “${entry.etymology.protoGloss}”` : ''}. That root shaped cult titles, hymns, and ritual addresses across centuries before it settled into the form we know. Etymology is not just word history; it is a map of how a divine power was recognized and named.</p>`,
    });
  }

  myths.push({
    tag: 'Cult',
    title: 'Worship and Invocation',
    text: `<p class='myth-text'>Shrines, festivals, and votive offerings across the ${pantheon} world invoked ${entry.unicode} as ${domain.toLowerCase()}. Worshippers did not simply tell stories about this power; they enacted it through sacrifice, song, and the careful observance of ritual. The name was a password: to speak it correctly was to align oneself with the force it named.</p>`,
  });

  myths.push({
    tag: 'Literature',
    title: 'The Name in Text and Memory',
    text: `<p class='myth-text'>Poets and priests wove ${entry.unicode} into hymns, genealogies, and mythic narratives. Whether as a major protagonist or a background power, the name carried a charge that later authors returned to again and again. Each retelling adjusted the portrait, but the core identity — ${domain.toLowerCase()} — remained recognizable.</p>`,
  });

  myths.push({
    tag: 'Legacy',
    title: 'From Ancient Cult to Modern Imagination',
    text: `<p class='myth-text'>After the temples fell silent, the name lived on in language, art, and the names of places and stars. It entered classical education, romantic poetry, and modern fantasy. To restore ${entry.unicode} in Unicode is not nostalgia; it is the recognition that a name with this much history still has work to do.</p>`,
  });

  return { lead, myths };
}

// ── Exported builders (return the same HTML structure as the catalog branch) ──

function buildPronunciationContent(entry) {
  const p = getPronunciationStub(entry);
  const phonemes = p.phonemes
    .map(
      (ph, i) => `
      <div class="phoneme" style="--delay:${i * 100}ms">
        <span class="phoneme-symbol">${ph.symbol}</span>
        <span class="phoneme-desc">${ph.desc}</span>
      </div>`
    )
    .join('');
  const kin = p.kin.map((k) => `<li><strong>${k.label}</strong> ${k.form}</li>`).join('');

  return `
    <div class="pronunciation-grid">
      <div class="pronunciation-main reveal-up">
        <div class="ipa-display">
          <span class="ipa-text">${p.ipa}</span>
          <span class="ipa-label">${p.ipaLabel}</span>
        </div>
        ${phonemes ? `<div class="pronunciation-breakdown">${phonemes}</div>` : ''}
      </div>
      <div class="pronunciation-sidebar reveal-up" data-delay="150">
        <div class="sidebar-card">
          <h4 class="sidebar-title">Modern Approximation</h4>
          <p class="sidebar-text">${p.approximation}</p>
          ${kin ? `<div class="sidebar-divider"></div><h4 class="sidebar-title">Etymological Kin</h4><ul class="kin-list">${kin}</ul>` : ''}
        </div>
        ${p.note ? `<div class="sidebar-card accent-card"><h4 class="sidebar-title">The Accent / Script Rule</h4><p class="sidebar-text">${p.note}</p></div>` : ''}
      </div>
    </div>`;
}

function buildSymbolsContent(entry) {
  const cards = getDomainCards(entry);
  const symbols = getSymbols(entry);

  const cardsHtml = cards
    .map(
      (c, i) => `
      <div class="domain-card reveal-up" ${i > 0 ? `data-delay="${i * 100}"` : ''}>
        <div class="domain-icon">${iconSvg(c.iconPath)}</div>
        <h4 class="domain-name">${c.name}</h4>
        <p class="domain-desc">${c.desc}</p>
      </div>`
    )
    .join('');

  const symbolsHtml = symbols
    .map(
      (s) => `
      <div class="symbol-item">
        <span class="symbol-name">${s.name}</span>
        <span class="symbol-meaning">${s.meaning}</span>
      </div>`
    )
    .join('');

  const lead = `<p class='lead-text'>The iconography of <strong>${entry.unicode}</strong> gathers around <strong>${entry.domain}</strong>. These attributes are not arbitrary decorations; they are a visual theology — a way of seeing the god's power at a glance.</p>`;

  return `
    <div class="domains-intro reveal-up">${lead}</div>
    <div class="domains-grid">${cardsHtml}</div>
    <div class="symbols-section reveal-up"><h3 class="symbols-title">Sacred Symbols</h3><div class="symbols-list">${symbolsHtml}</div></div>`;
}

function buildMythologyContent(entry) {
  const m = getMythStub(entry);
  const myths = m.myths
    .map(
      (my, i) => `
      <div class="myth-card reveal-up" ${i > 0 ? `data-delay="${i * 100}"` : ''}>
        <div class="myth-marker"></div>
        <div class="myth-content">
          <span class="myth-tag">${my.tag}</span>
          <h3 class="myth-title">${my.title}</h3>
          ${my.text}
        </div>
      </div>`
    )
    .join('');

  return `
    ${m.lead}
    <div class="myths-timeline">${myths}</div>`;
}

module.exports = {
  buildPronunciationContent,
  buildSymbolsContent,
  buildMythologyContent,
};
