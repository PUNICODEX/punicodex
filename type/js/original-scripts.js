/**
 * PuniCodex — Original script resolution and provenance
 *
 * The legacy lexicon stores the "original script" in a field named `greek`.
 * That works for Greek, Chinese, Japanese and Taoist entries, but for other
 * traditions it is either empty ("—") or a Greek transliteration. This module
 * introduces a clean `originalScript` concept, keeps the Greek/CJK fallback for
 * backward compatibility, and supplies curated original scripts plus
 * step-by-step provenance for non-Greek traditions.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ═════════════════════════════════════════════════════════════════════════════
// Script display names by pantheon
// ═════════════════════════════════════════════════════════════════════════════

const SCRIPT_NAMES = {
  greek: 'Greek',
  'greek-location': 'Greek',
  egyptian: 'Hieroglyphs',
  mesopotamian: 'Cuneiform',
  abrahamic: 'Hebrew',
  canaanite: 'Ugaritic / Phoenician',
  phoenician: 'Phoenician',
  hittite: 'Cuneiform / Luwian hieroglyphs',
  norse: 'Runes',
  sanskrit: 'Devanagari',
  buddhist: 'Source-language script',
  chinese: 'Chinese characters',
  japanese: 'Japanese characters',
  taoist: 'Chinese characters',
  korean: 'Korean script',
  celtic: 'Celtic transcription',
  nahuatl: 'Nahuatl transcription',
  polynesian: 'Polynesian transcription',
  yoruba: 'Yoruba transcription',
  slavic: 'Slavic transcription',
  zoroastrian: 'Avestan / Old Persian',
  incan: 'Incan transcription',
  baltic: 'Lithuanian / Baltic',
};

// Pantheons for which no indigenous per-name script is attested. The page will
// label the Latin-with-diacritics form honestly as a scholarly transliteration.
const SCRIPTLESS_PANTHEONS = new Set([
  'celtic',
  'nahuatl',
  'polynesian',
  'yoruba',
  'slavic',
  'incan',
  'korean',
  'baltic',
  'aboriginal',
]);

// ═════════════════════════════════════════════════════════════════════════════
// Curated original-script data
// ═════════════════════════════════════════════════════════════════════════════

const ORIGINAL_SCRIPTS = {
  anubis: {
    originalScript: '𓇋𓈖𓊊𓅱',
    scriptName: 'Hieroglyphs',
    provenance: {
      original: '𓇋𓈖𓊊𓅱',
      transliteration: 'jnpw',
      steps: [
        'M17 reed (𓇋) = j',
        'N35 ripple of water (𓈖) = n',
        'O31 mouth and basket (𓊊) = p',
        'G43 quail chick (𓅱) = w',
        'jnpw is the jackal god of the necropolis, later Greek Ἄνουβις (Anubis)'
      ],
      sources: [
        'Faulkner',
        'Allen, Middle Egyptian',
        'Gardiner'
      ],
    },
  },
  steh: {
    originalScript: '𓋴𓏏𓐍',
    scriptName: 'Hieroglyphs',
    provenance: {
      original: '𓋴𓏏𓐍',
      transliteration: 'stḫ',
      steps: [
        'S29 folded cloth (𓋴) = s',
        'X1 bread loaf (𓏏) = t',
        'V28 wick of twisted flax (𓐍) = ḫ (cheth)',
        'stḫ is the god of the desert and foreign lands, Greek Σήθ (Seth)'
      ],
      sources: [
        'Faulkner',
        'Allen, Middle Egyptian',
        'Gardiner'
      ],
    },
  },
  seshat: {
    originalScript: '𓋴𓈙𓄿𓏏',
    scriptName: 'Hieroglyphs',
    provenance: {
      original: '𓋴𓈙𓄿𓏏',
      transliteration: 'sšꜣt',
      steps: [
        'S29 folded cloth (𓋴) = s',
        'Q1 hillside (𓈙) = š',
        'G1 vulture (𓄿) = ꜣ',
        'X1 bread loaf (𓏏) = t',
        'sšꜣt is the goddess of writing and reckoning, "the female scribe"'
      ],
      sources: [
        'Faulkner',
        'Allen, Middle Egyptian',
        'Gardiner'
      ],
    },
  },
  hp: {
    originalScript: '𓎛𓊪',
    scriptName: 'Hieroglyphs',
    provenance: {
      original: '𓎛𓊪',
      transliteration: 'ḥp',
      steps: [
        '𓎛 twisted wick of plant fibre = ḥ',
        'Q3 basket (𓊪) = p',
        'ḥp is the consonantal skeleton of ḥꜥpj, the Nile inundation god'
      ],
      sources: [
        'Faulkner',
        'Gardiner'
      ],
    },
  },
  amsa: {
    originalScript: 'अंश',
    scriptName: 'Devanagari',
    provenance: {
      original: 'अंश',
      transliteration: 'aṃśa',
      steps: [
        'अ = a',
        'ं anusvāra = ṃ (nasal)',
        'श = śa',
        'aṃśa is one of the Ādityas, a solar portion or ray'
      ],
      sources: [
        'Rigveda',
        'Monier-Williams'
      ],
    },
  },
  daksa: {
    originalScript: 'दक्ष',
    scriptName: 'Devanagari',
    provenance: {
      original: 'दक्ष',
      transliteration: 'dakṣa',
      steps: [
        'द = da',
        'क = ka',
        'ष = ṣa (retroflex)',
        'dakṣa is the Prajāpati of ritual order and father of many gods'
      ],
      sources: [
        'Rigveda',
        'Monier-Williams'
      ],
    },
  },
  dhatr: {
    originalScript: 'धातृ',
    scriptName: 'Devanagari',
    provenance: {
      original: 'धातृ',
      transliteration: 'dhātṛ',
      steps: [
        'ध = dha',
        'आ = ā (long)',
        'तृ = tṛ (vocalic ṛ)',
        'dhātṛ is the Āditya of creation and ordinance, "the Establisher"'
      ],
      sources: [
        'Rigveda',
        'Monier-Williams'
      ],
    },
  },
  pusan: {
    originalScript: 'पूषन्',
    scriptName: 'Devanagari',
    provenance: {
      original: 'पूषन्',
      transliteration: 'pūṣan',
      steps: [
        'प = pa',
        'ू = ū (long)',
        'ष = ṣa',
        'न् = na',
        'pūṣan is the Vedic solar god who protects travelers and herds'
      ],
      sources: [
        'Rigveda',
        'Monier-Williams'
      ],
    },
  },
  tvastr: {
    originalScript: 'त्वष्टृ',
    scriptName: 'Devanagari',
    provenance: {
      original: 'त्वष्टृ',
      transliteration: 'tvaṣṭṛ',
      steps: [
        'त्व = tva',
        'ष = ṣa',
        'टृ = ṭṛ (vocalic ṛ)',
        'tvaṣṭṛ is the divine craftsman who shapes the forms of the gods'
      ],
      sources: [
        'Rigveda',
        'Monier-Williams'
      ],
    },
  },

  aaru: {
    originalScript: '𓂝𓄿𓂋𓅱',
    scriptName: 'Hieroglyphs',
    provenance: {
      original: '𓂝𓄿𓂋𓅱',
      transliteration: 'Ꜥꜣrw',
      steps: [
        'D36 forearm (𓂝) = Ꜥ',
        'G1 vulture (𓄿) = ꜣ',
        'D21 mouth (𓂋) = r',
        'G43 quail chick (𓅱) = w',
        'Ꜥꜣrw is the \'Field of Reeds\', the paradisal afterlife destination in Egyptian funerary texts'
      ],
      sources: [
        'Faulkner',
        'Allen, Middle Egyptian',
        'Gardiner'
      ],
    },
  },
  ahuramazda: {
    originalScript: '𐬀𐬵𐬎𐬭𐬀 𐬨𐬀𐬰𐬛𐬁',
    scriptName: 'Avestan',
    provenance: {
      original: '𐬀𐬵𐬎𐬭𐬀 𐬨𐬀𐬰𐬛𐬁',
      transliteration: 'Ahura Mazdā',
      steps: [
        'The Avestan script writes the sounds of the Avesta phonetically.',
        'Unicode restoration AhuraMazdā corresponds to Avestan Ahura Mazdā.',
        'The long final vowel in Mazdā is written with the distinct ā letter (𐬁).'
      ],
      sources: [
        'Avesta',
        'Gathas',
        'Bartholomae'
      ],
    },
  },
  alfheimr: {
    originalScript: 'ᛅᛚᚠᚼᛁᛘᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛅᛚᚠᚼᛁᛘᚱ',
      transliteration: 'alfhimr',
      steps: [
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᛚ (lögr) writes /l/',
        'ᚠ (fé) writes both /f/ and /v/',
        'The spelling alfhimr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  ameretat: {
    originalScript: '𐬀𐬨𐬆𐬭𐬆𐬙𐬁𐬙',
    scriptName: 'Avestan',
    provenance: {
      original: '𐬀𐬨𐬆𐬭𐬆𐬙𐬁𐬙',
      transliteration: 'Amərətāt',
      steps: [
        'Amərətāt pairs with Haurvatāt as the Amesha Spenta of immortality.',
        'Both medial vowels are schwa ə (𐬆).',
        'The ending -tāt uses long ā (𐬁) before final t (𐬙).'
      ],
      sources: [
        'Avesta',
        'Bartholomae'
      ],
    },
  },
  anahita: {
    originalScript: '𐬀𐬭𐬆𐬛𐬎𐬎𐬍 𐬯𐬏𐬭𐬁 𐬀𐬥𐬁𐬵𐬌𐬙𐬀',
    scriptName: 'Avestan',
    provenance: {
      original: '𐬀𐬭𐬆𐬛𐬎𐬎𐬍 𐬯𐬏𐬭𐬁 𐬀𐬥𐬁𐬵𐬌𐬙𐬀',
      transliteration: 'Arəduuī Sūrā Anāhitā',
      steps: [
        'Anāhitā\'s full Avestan epithet is Arəduuī Sūrā Anāhitā.',
        'The long ī in Arəduuī and long ū in Sūrā are written with distinct letters (𐬍, 𐬏).',
        'The common name Anāhitā begins with a-, long ā-, h, i, t, ā.'
      ],
      sources: [
        'Avesta',
        'Bartholomae'
      ],
    },
  },
  andvari: {
    originalScript: 'ᛅᚾᛏᚠᛅᚱᛁ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛅᚾᛏᚠᛅᚱᛁ',
      transliteration: 'antfari',
      steps: [
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᚾ (nauðr) writes /n/',
        'ᛏ (Týr) writes both /t/ and /d/',
        'The spelling antfari is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  angramainyu: {
    originalScript: '𐬀𐬢𐬭𐬀 𐬨𐬀𐬌𐬥𐬌𐬌𐬎',
    scriptName: 'Avestan',
    provenance: {
      original: '𐬀𐬢𐬭𐬀 𐬨𐬀𐬌𐬥𐬌𐬌𐬎',
      transliteration: 'Aŋra Mainiiu',
      steps: [
        'Avestan distinguishes the velar nasal ŋ (𐬢) written here in aŋra.',
        'Unicode restoration AngraMainyu simplifies the nasal to n.',
        'The diphthongal ending -iiu is written with two i letters followed by u.'
      ],
      sources: [
        'Avesta',
        'Bartholomae'
      ],
    },
  },
  angrboda: {
    originalScript: 'ᛅᚾᚴᚱᛒᚢᚦᛅ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛅᚾᚴᚱᛒᚢᚦᛅ',
      transliteration: 'ankrbuþa',
      steps: [
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᚾ (nauðr) writes /n/',
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'The spelling ankrbuþa is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  apsu: {
    originalScript: '𒀊𒍪',
    scriptName: 'Cuneiform',
    provenance: {
      original: '𒀊𒍪',
      transliteration: 'Apsû',
      steps: [
        'Sumerogram AB.ZU (𒀊𒍪), read in Akkadian as apsû',
        'Akkadian /apsû/ denotes the subterranean freshwater abyss',
        'The circumflex in Apsû marks vowel-contraction length, not Greek-style stress'
      ],
      sources: [
        'Chicago Assyrian Dictionary (CAD), apsû',
        'Black & Green, Gods, Demons and Symbols of Ancient Mesopotamia',
        'Enuma Elish (Tablet I)'
      ],
    },
  },
  anu: {
    originalScript: '𒀭𒀀𒉡',
    scriptName: 'Cuneiform',
    provenance: {
      original: '𒀭𒀀𒉡',
      transliteration: 'Anû',
      steps: [
        'Divine determinative 𒀭 (dingir) marks Anu as a deity',
        '𒀀 (A) writes the vowel /a/',
        '𒉡 (NU) writes the syllable /nu/',
        'dA-nu is read Anû, the Sumerian/Akkadian sky god whose name means "heaven, sky"'
      ],
      sources: [
        'ETCSL',
        'Black & Green, Gods, Demons and Symbols of Ancient Mesopotamia',
        'George, House Most High'
      ],
    },
  },
  asgardr: {
    originalScript: 'ᛅᛋᚴᛅᚱᚦᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛅᛋᚴᛅᚱᚦᚱ',
      transliteration: 'askarþr',
      steps: [
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᛋ (sól) writes /s/',
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'The spelling askarþr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  ashavahishta: {
    originalScript: '𐬀𐬴𐬀 𐬬𐬀𐬵𐬌𐬱𐬙𐬀',
    scriptName: 'Avestan',
    provenance: {
      original: '𐬀𐬴𐬀 𐬬𐬀𐬵𐬌𐬱𐬙𐬀',
      transliteration: 'Aṣ̌a Vahišta',
      steps: [
        'Aṣ̌a \'Truth\' begins with the Avestan letter ṣ̌ (𐬴).',
        'Vahišta shows the Avestan treatment of š (𐬱) and h (𐬵).',
        'The phrase appears throughout the Gathas as the highest Asha.'
      ],
      sources: [
        'Avesta',
        'Gathas',
        'Bartholomae'
      ],
    },
  },
  athrawan: {
    originalScript: '𐬁𐬚𐬭𐬀𐬎𐬎𐬀𐬥',
    scriptName: 'Avestan',
    provenance: {
      original: '𐬁𐬚𐬭𐬀𐬎𐬎𐬀𐬥',
      transliteration: 'Āθrauuan',
      steps: [
        'Āθrauuan denotes the priest, derived from ātar \'fire\'.',
        'The initial long ā is written with the distinct letter 𐬁.',
        'The sequence auu- is written with a (𐬀) followed by two u letters (𐬎𐬎).'
      ],
      sources: [
        'Avesta',
        'Bartholomae'
      ],
    },
  },
  audumla: {
    originalScript: 'ᛅᚢᚦᚢᛘᛚᛅ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛅᚢᚦᚢᛘᛚᛅ',
      transliteration: 'auþumla',
      steps: [
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᚦ (þurs) writes both þ and ð',
        'The spelling auþumla is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  baldr: {
    originalScript: 'ᛒᛅᛚᛏᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛒᛅᛚᛏᚱ',
      transliteration: 'baltr',
      steps: [
        'ᛒ (bjarkan) writes both /b/ and /p/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᛚ (lögr) writes /l/',
        'The spelling baltr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  baugi: {
    originalScript: 'ᛒᛅᚢᚴᛁ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛒᛅᚢᚴᛁ',
      transliteration: 'bauki',
      steps: [
        'ᛒ (bjarkan) writes both /b/ and /p/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'The spelling bauki is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  bestla: {
    originalScript: 'ᛒᛁᛋᛏᛚᛅ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛒᛁᛋᛏᛚᛅ',
      transliteration: 'bistla',
      steps: [
        'ᛒ (bjarkan) writes both /b/ and /p/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᛋ (sól) writes /s/',
        'The spelling bistla is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  bragi: {
    originalScript: 'ᛒᚱᛅᚴᛁ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛒᚱᛅᚴᛁ',
      transliteration: 'braki',
      steps: [
        'ᛒ (bjarkan) writes both /b/ and /p/',
        'ᚱ (reið) writes /r/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'The spelling braki is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  brokkr: {
    originalScript: 'ᛒᚱᚢᚴᚴᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛒᚱᚢᚴᚴᚱ',
      transliteration: 'brukkr',
      steps: [
        'ᛒ (bjarkan) writes both /b/ and /p/',
        'ᚱ (reið) writes /r/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'The spelling brukkr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  brynhildr: {
    originalScript: 'ᛒᚱᚢᚾᚼᛁᛚᛏᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛒᚱᚢᚾᚼᛁᛚᛏᚱ',
      transliteration: 'brunhiltr',
      steps: [
        'ᛒ (bjarkan) writes both /b/ and /p/',
        'ᚱ (reið) writes /r/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'The spelling brunhiltr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  draupnir: {
    originalScript: 'ᛏᚱᛅᚢᛒᚾᛁᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛏᚱᛅᚢᛒᚾᛁᚱ',
      transliteration: 'traubnir',
      steps: [
        'ᛏ (Týr) writes both /t/ and /d/',
        'ᚱ (reið) writes /r/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'The spelling traubnir is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  dumuzid: {
    originalScript: '𒀭𒌉𒍣',
    scriptName: 'Cuneiform',
    provenance: {
      original: '𒀭𒌉𒍣',
      transliteration: 'Dumuzid',
      steps: [
        'The divine determinative 𒀭 (dingir) marks Dumuzi as a deity',
        '𒌉 (DUMU) means \'son, child\'',
        '𒍣 (ZI) means \'faithful, true, life\'',
        'DUMU.ZI is read Dumuzid, \'faithful son\', attested from Early Dynastic texts and the Sumerian King List'
      ],
      sources: [
        'ETCSL',
        'Jacobsen',
        'Kramer'
      ],
    },
  },
  eggther: {
    originalScript: 'ᛁᚴᚴᚦᛁᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛁᚴᚴᚦᛁᚱ',
      transliteration: 'ikkþir',
      steps: [
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'ᚦ (þurs) writes both þ and ð',
        'The spelling ikkþir is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  eir: {
    originalScript: 'ᛁᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛁᚱ',
      transliteration: 'ir',
      steps: [
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚱ (reið) writes /r/',
        'The spelling ir is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  enkidu: {
    originalScript: '𒂗𒆠𒄭',
    scriptName: 'Cuneiform',
    provenance: {
      original: '𒂗𒆠𒄭',
      transliteration: 'Enkidu',
      steps: [
        '𒂗 (EN) = \'lord\'',
        '𒆠 (KI) = \'place, earth\'',
        '𒄭 (DU10) = \'good, pleasant\'',
        'EN.KI.DU10 means \'lord of the good/pleasant place\', the wild companion of Gilgamesh'
      ],
      sources: [
        'Epic of Gilgamesh',
        'ETCSL'
      ],
    },
  },
  fafnir: {
    originalScript: 'ᚠᛅᚠᚾᛁᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚠᛅᚠᚾᛁᚱ',
      transliteration: 'fafnir',
      steps: [
        'ᚠ (fé) writes both /f/ and /v/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᚾ (nauðr) writes /n/',
        'The spelling fafnir is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  fenrir: {
    originalScript: 'ᚠᛁᚾᚱᛁᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚠᛁᚾᚱᛁᚱ',
      transliteration: 'finrir',
      steps: [
        'ᚠ (fé) writes both /f/ and /v/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚾ (nauðr) writes /n/',
        'The spelling finrir is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  forseti: {
    originalScript: 'ᚠᚢᚱᛋᛁᛏᛁ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚠᚢᚱᛋᛁᛏᛁ',
      transliteration: 'fursiti',
      steps: [
        'ᚠ (fé) writes both /f/ and /v/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᚱ (reið) writes /r/',
        'The spelling fursiti is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  freyja: {
    originalScript: 'ᚠᚱᛅᚢᛁᛅ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚠᚱᛅᚢᛁᛅ',
      transliteration: 'frauia',
      steps: [
        'ᚠ (fé) writes both /f/ and /v/',
        'ᚱ (reið) writes /r/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'The spelling frauia is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels',
        'Reconstructed from Proto-Norse *frawjōn; the au diphthong is written ᛅᚢ and -ja with ᛁᛅ.'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  freyr: {
    originalScript: 'ᚠᚱᛅᚢᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚠᚱᛅᚢᚱ',
      transliteration: 'fraur',
      steps: [
        'ᚠ (fé) writes both /f/ and /v/',
        'ᚱ (reið) writes /r/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'The spelling fraur is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels',
        'Reconstructed from Proto-Norse *frawjaR; the au diphthong is written ᛅᚢ.'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  frigg: {
    originalScript: 'ᚠᚱᛁᚴᚴ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚠᚱᛁᚴᚴ',
      transliteration: 'frikk',
      steps: [
        'ᚠ (fé) writes both /f/ and /v/',
        'ᚱ (reið) writes /r/',
        'ᛁ (ís) writes both /i/ and /e/',
        'The spelling frikk is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  fulla: {
    originalScript: 'ᚠᚢᛚᛚᛅ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚠᚢᛚᛚᛅ',
      transliteration: 'fulla',
      steps: [
        'ᚠ (fé) writes both /f/ and /v/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᛚ (lögr) writes /l/',
        'The spelling fulla is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  garm: {
    originalScript: 'ᚴᛅᚱᛘ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚴᛅᚱᛘ',
      transliteration: 'karm',
      steps: [
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᚱ (reið) writes /r/',
        'The spelling karm is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  garmr: {
    originalScript: 'ᚴᛅᚱᛘᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚴᛅᚱᛘᚱ',
      transliteration: 'karmr',
      steps: [
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᚱ (reið) writes /r/',
        'The spelling karmr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  gefjon: {
    originalScript: 'ᚴᛁᚠᛁᚢᚾ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚴᛁᚠᛁᚢᚾ',
      transliteration: 'kifiun',
      steps: [
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚠ (fé) writes both /f/ and /v/',
        'The spelling kifiun is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  geirrodr: {
    originalScript: 'ᚴᛁᚱᚱᚢᚦᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚴᛁᚱᚱᚢᚦᚱ',
      transliteration: 'kirruþr',
      steps: [
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚱ (reið) writes /r/',
        'The spelling kirruþr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  ginnungagap: {
    originalScript: 'ᚴᛁᚾᚾᚢᚾᚴᛅᚴᛅᛒ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚴᛁᚾᚾᚢᚾᚴᛅᚴᛅᛒ',
      transliteration: 'kinnunkakab',
      steps: [
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚾ (nauðr) writes /n/',
        'The spelling kinnunkakab is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  gula: {
    originalScript: '𒀭𒄖𒆷',
    scriptName: 'Cuneiform',
    provenance: {
      original: '𒀭𒄖𒆷',
      transliteration: 'Gula',
      steps: [
        'Divine determinative 𒀭 (dingir) marks the goddess',
        '𒄖 (GU) and 𒆷 (LA) form the Sumerogram GU.LA, read as the healing goddess Gula',
        'dGU.LA is the Babylonian/Sumerian goddess of healing, \'the great doctoress\''
      ],
      sources: [
        'CAD',
        'Black-Green'
      ],
    },
  },
  gunnr: {
    originalScript: 'ᚴᚢᚾᚾᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚴᚢᚾᚾᚱ',
      transliteration: 'kunnr',
      steps: [
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᚾ (nauðr) writes /n/',
        'The spelling kunnr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  haoma: {
    originalScript: '𐬵𐬀𐬊𐬨𐬀',
    scriptName: 'Avestan',
    provenance: {
      original: '𐬵𐬀𐬊𐬨𐬀',
      transliteration: 'Haoma',
      steps: [
        'Haoma is the sacred plant and divinity praised in Yasna 9–10.',
        'The initial h is the Avestan letter h (𐬵).',
        'The diphthong ao is written with a (𐬀) followed by o (𐬊).'
      ],
      sources: [
        'Avesta',
        'Bartholomae'
      ],
    },
  },
  hati: {
    originalScript: 'ᚼᛅᛏᛁ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚼᛅᛏᛁ',
      transliteration: 'hati',
      steps: [
        'ᚼ (hagall) writes /h/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᛏ (Týr) writes both /t/ and /d/',
        'The spelling hati is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  haurvatat: {
    originalScript: '𐬵𐬀𐬎𐬭𐬬𐬀𐬙𐬁𐬙',
    scriptName: 'Avestan',
    provenance: {
      original: '𐬵𐬀𐬎𐬭𐬬𐬀𐬙𐬁𐬙',
      transliteration: 'Haurvatāt',
      steps: [
        'Haurvatāt is one of the Amesha Spentas, associated with wholeness.',
        'The long final āt is written with ā (𐬁) plus t (𐬙).',
        'The sequence au is written with a (𐬀) followed by u (𐬎).'
      ],
      sources: [
        'Avesta',
        'Bartholomae'
      ],
    },
  },
  heimdallr: {
    originalScript: 'ᚼᛁᛘᛏᛅᛚᛚᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚼᛁᛘᛏᛅᛚᛚᚱ',
      transliteration: 'himtallr',
      steps: [
        'ᚼ (hagall) writes /h/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᛘ (maðr) writes /m/',
        'The spelling himtallr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  hel: {
    originalScript: 'ᚼᛁᛚ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚼᛁᛚ',
      transliteration: 'hil',
      steps: [
        'ᚼ (hagall) writes /h/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᛚ (lögr) writes /l/',
        'The spelling hil is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  helheimr: {
    originalScript: 'ᚼᛁᛚᚼᛁᛘᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚼᛁᛚᚼᛁᛘᚱ',
      transliteration: 'hilhimr',
      steps: [
        'ᚼ (hagall) writes /h/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᛚ (lögr) writes /l/',
        'The spelling hilhimr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  hermod: {
    originalScript: 'ᚼᛁᚱᛘᚢᚦᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚼᛁᚱᛘᚢᚦᚱ',
      transliteration: 'hirmuþr',
      steps: [
        'ᚼ (hagall) writes /h/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚱ (reið) writes /r/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/, including long ó',
        'ᚦ (þurs) writes both þ and ð',
        'final ᚱ writes the nominative ending -r',
        'The spelling hirmuþr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  hodr: {
    originalScript: 'ᚼᚢᚦᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚼᚢᚦᚱ',
      transliteration: 'huþr',
      steps: [
        'ᚼ (hagall) writes /h/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᚦ (þurs) writes both þ and ð',
        'The spelling huþr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  hraesvelgr: {
    originalScript: 'ᚼᚱᛅᛋᚠᛁᛚᚴᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚼᚱᛅᛋᚠᛁᛚᚴᚱ',
      transliteration: 'hrasfilkr',
      steps: [
        'ᚼ (hagall) writes /h/',
        'ᚱ (reið) writes /r/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'The spelling hrasfilkr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  hrungnir: {
    originalScript: 'ᚼᚱᚢᚾᚴᚾᛁᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚼᚱᚢᚾᚴᚾᛁᚱ',
      transliteration: 'hrunknir',
      steps: [
        'ᚼ (hagall) writes /h/',
        'ᚱ (reið) writes /r/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'The spelling hrunknir is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  hymir: {
    originalScript: 'ᚼᚢᛘᛁᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚼᚢᛘᛁᚱ',
      transliteration: 'humir',
      steps: [
        'ᚼ (hagall) writes /h/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᛘ (maðr) writes /m/',
        'The spelling humir is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  iounn: {
    originalScript: 'ᛁᚦᚢᚾᚾ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛁᚦᚢᚾᚾ',
      transliteration: 'iþunn',
      steps: [
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚦ (þurs) writes both þ and ð',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'The spelling iþunn is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  jormungandr: {
    originalScript: 'ᛁᚢᚱᛘᚢᚾᚴᛅᚾᛏᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛁᚢᚱᛘᚢᚾᚴᛅᚾᛏᚱ',
      transliteration: 'iurmunkantr',
      steps: [
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᚱ (reið) writes /r/',
        'The spelling iurmunkantr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  jotunheimr: {
    originalScript: 'ᛁᚢᛏᚢᚾᚼᛁᛘᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛁᚢᛏᚢᚾᚼᛁᛘᚱ',
      transliteration: 'iutunhimr',
      steps: [
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᛏ (Týr) writes both /t/ and /d/',
        'The spelling iutunhimr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  kebechet: {
    originalScript: '𓈎𓃀𓎛𓏏',
    scriptName: 'Hieroglyphs',
    provenance: {
      original: '𓈎𓃀𓎛𓏏',
      transliteration: 'Kbh.t',
      steps: [
        'N29 sandy hill-slope (𓈎) = q, anglicized as k in the project\'s \'Kebehet\'',
        'D58 leg/foot (𓃀) = b',
        'V28 twisted wick (𓎛) = ḥ',
        'X1 bread loaf (𓏏) = t',
        'Kbh.t / Qebehet means \'cooling water\', the serpent goddess who purifies the dead'
      ],
      sources: [
        'Faulkner',
        'Allen, Middle Egyptian'
      ],
    },
  },
  khshathravairya: {
    originalScript: '𐬑𐬱𐬀𐬚𐬭𐬀 𐬬𐬀𐬌𐬭𐬌𐬌𐬀',
    scriptName: 'Avestan',
    provenance: {
      original: '𐬑𐬱𐬀𐬚𐬭𐬀 𐬬𐬀𐬌𐬭𐬌𐬌𐬀',
      transliteration: 'Xšaθra Vairiia',
      steps: [
        'The initial cluster xš- is written with x (𐬑) and š (𐬱).',
        'The medial θ in Xšaθra corresponds to the Avestan letter θ (𐬚).',
        'Vairiia writes the glide -y- with a doubled i (𐬌𐬌), a common Avestan orthography.'
      ],
      sources: [
        'Avesta',
        'Bartholomae'
      ],
    },
  },
  logi: {
    originalScript: 'ᛚᚢᚴᛁ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛚᚢᚴᛁ',
      transliteration: 'luki',
      steps: [
        'ᛚ (lögr) writes /l/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'The spelling luki is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  loki: {
    originalScript: 'ᛚᚢᚴᛁ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛚᚢᚴᛁ',
      transliteration: 'luki',
      steps: [
        'ᛚ (lögr) writes /l/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'The spelling luki is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  magni: {
    originalScript: 'ᛘᛅᚴᚾᛁ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛘᛅᚴᚾᛁ',
      transliteration: 'makni',
      steps: [
        'ᛘ (maðr) writes /m/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'The spelling makni is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  midgardr: {
    originalScript: 'ᛘᛁᚦᚴᛅᚱᚦᛁ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛘᛁᚦᚴᛅᚱᚦᛁ',
      transliteration: 'miþkarþi',
      steps: [
        'ᛘ (maðr) writes /m/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚦ (þurs) writes both þ and ð',
        'Attested in Viking-Age inscriptions: The dative form miþkarþi occurs on the Fyrby runestone (Sö 56).'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  mithra: {
    originalScript: '𐬨𐬌𐬚𐬭𐬀',
    scriptName: 'Avestan',
    provenance: {
      original: '𐬨𐬌𐬚𐬭𐬀',
      transliteration: 'Miθra',
      steps: [
        'Yasht 10, the hymn to Mithra, preserves this spelling.',
        'The intervocalic -th- of the restoration corresponds to Avestan θ (𐬚).',
        'Unicode restoration Mithra uses the same consonants as the Avestan original.'
      ],
      sources: [
        'Avesta',
        'Bartholomae'
      ],
    },
  },
  mjolnir: {
    originalScript: 'ᛘᛁᚢᛚᚾᛁᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛘᛁᚢᛚᚾᛁᚱ',
      transliteration: 'miulnir',
      steps: [
        'ᛘ (maðr) writes /m/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'The spelling miulnir is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  modi: {
    originalScript: 'ᛘᚢᚦᛁ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛘᚢᚦᛁ',
      transliteration: 'muþi',
      steps: [
        'ᛘ (maðr) writes /m/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᚦ (þurs) writes both þ and ð',
        'The spelling muþi is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  muspellheimr: {
    originalScript: 'ᛘᚢᛋᛒᛁᛚᛚᚼᛁᛘᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛘᚢᛋᛒᛁᛚᛚᚼᛁᛘᚱ',
      transliteration: 'musbillhimr',
      steps: [
        'ᛘ (maðr) writes /m/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᛋ (sól) writes /s/',
        'The spelling musbillhimr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  nal: {
    originalScript: 'ᚾᛅᛚ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚾᛅᛚ',
      transliteration: 'nal',
      steps: [
        'ᚾ (nauðr) writes /n/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᛚ (lögr) writes /l/',
        'The spelling nal is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  namtar: {
    originalScript: '𒀭𒉆𒋻',
    scriptName: 'Cuneiform',
    provenance: {
      original: '𒀭𒉆𒋻',
      transliteration: 'Namtar',
      steps: [
        'Divine determinative 𒀭 (dingir) marks this chthonic being',
        '𒉆 (NAM) = \'fate, destiny\'',
        '𒋻 (TAR) = \'to cut, allot\'',
        'dNAM.TAR is the fate-demon and vizier of Ereshkigal in the Mesopotamian underworld'
      ],
      sources: [
        'Epic of Gilgamesh',
        'ETCSL',
        'Black-Green'
      ],
    },
  },
  nanna: {
    originalScript: 'ᚾᛅᚾᚾᛅ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚾᛅᚾᚾᛅ',
      transliteration: 'nanna',
      steps: [
        'ᚾ (nauðr) writes /n/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'The spelling nanna is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  nidhogg: {
    originalScript: 'ᚾᛁᚦᚼᚢᚴᚴᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚾᛁᚦᚼᚢᚴᚴᚱ',
      transliteration: 'niþhukkr',
      steps: [
        'ᚾ (nauðr) writes /n/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚦ (þurs) writes both þ and ð',
        'The spelling niþhukkr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  niflheimr: {
    originalScript: 'ᚾᛁᚠᛚᚼᛁᛘᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚾᛁᚠᛚᚼᛁᛘᚱ',
      transliteration: 'niflhimr',
      steps: [
        'ᚾ (nauðr) writes /n/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚠ (fé) writes both /f/ and /v/',
        'The spelling niflhimr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  njordr: {
    originalScript: 'ᚾᛁᚢᚱᚦᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚾᛁᚢᚱᚦᚱ',
      transliteration: 'niurþr',
      steps: [
        'ᚾ (nauðr) writes /n/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'The spelling niurþr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  odinn: {
    originalScript: 'ᚢᚦᛁᚾ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚢᚦᛁᚾ',
      transliteration: 'uþin',
      steps: [
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᚦ (þurs) writes both þ and ð',
        'ᛁ (ís) writes both /i/ and /e/',
        'Attested in Viking-Age inscriptions: The spelling uþin is well attested in Viking-Age runic inscriptions.'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  ragnarok: {
    originalScript: 'ᚱᛅᚴᚾᛅᚱᚢᚴ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚱᛅᚴᚾᛅᚱᚢᚴ',
      transliteration: 'raknaruk',
      steps: [
        'ᚱ (reið) writes /r/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'The spelling raknaruk is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  rashnu: {
    originalScript: '𐬭𐬀𐬱𐬥𐬎',
    scriptName: 'Avestan',
    provenance: {
      original: '𐬭𐬀𐬱𐬥𐬎',
      transliteration: 'Rašnu',
      steps: [
        'Rašnu is the yazata of justice who weighs souls.',
        'The š is written with Avestan letter š (𐬱).',
        'The final u is the short vowel u (𐬎).'
      ],
      sources: [
        'Avesta',
        'Bartholomae'
      ],
    },
  },
  ratatoskr: {
    originalScript: 'ᚱᛅᛏᛅᛏᚢᛋᚴᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚱᛅᛏᛅᛏᚢᛋᚴᚱ',
      transliteration: 'ratatuskr',
      steps: [
        'ᚱ (reið) writes /r/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᛏ (Týr) writes both /t/ and /d/',
        'The spelling ratatuskr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  reginn: {
    originalScript: 'ᚱᛁᚴᛁᚾᚾ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚱᛁᚴᛁᚾᚾ',
      transliteration: 'rikinn',
      steps: [
        'ᚱ (reið) writes /r/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'The spelling rikinn is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  rig: {
    originalScript: 'ᚱᛁᚴ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚱᛁᚴ',
      transliteration: 'rik',
      steps: [
        'ᚱ (reið) writes /r/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'The spelling rik is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  saga: {
    originalScript: 'ᛋᛅᚴᛅ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛋᛅᚴᛅ',
      transliteration: 'saka',
      steps: [
        'ᛋ (sól) writes /s/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'The spelling saka is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  sia: {
    originalScript: '𓋴𓇌𓄿',
    scriptName: 'Hieroglyphs',
    provenance: {
      original: '𓋴𓇌𓄿',
      transliteration: 'sjꜣ',
      steps: [
        'S29 folded cloth (𓋴) represents the uniliteral s',
        'M17 dual reed leaves (𓇌) write the glide y/j',
        'G1 vulture (𓄿) represents the alef ꜣ',
        'Together sjꜣ writes Sia, the personified perception/knowledge attested from the Pyramid Texts onward — Faulkner’s dictionary headword',
        'An attested variant skeleton sꜥ (with the ayin forearm 𓂝) is preserved at sꜥ.com and noted here for completeness',
        'A god determinative may be added in fuller spellings'
      ],
      sources: [
        'Faulkner',
        'Gardiner'
      ],
    },
  },
  sif: {
    originalScript: 'ᛋᛁᚠ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛋᛁᚠ',
      transliteration: 'sif',
      steps: [
        'ᛋ (sól) writes /s/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚠ (fé) writes both /f/ and /v/',
        'The spelling sif is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  sigyn: {
    originalScript: 'ᛋᛁᚴᚢᚾ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛋᛁᚴᚢᚾ',
      transliteration: 'sikun',
      steps: [
        'ᛋ (sól) writes /s/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'The spelling sikun is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  sindri: {
    originalScript: 'ᛋᛁᚾᛏᚱᛁ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛋᛁᚾᛏᚱᛁ',
      transliteration: 'sintri',
      steps: [
        'ᛋ (sól) writes /s/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚾ (nauðr) writes /n/',
        'The spelling sintri is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  skadi: {
    originalScript: 'ᛋᚴᛅᚦᛁ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛋᚴᛅᚦᛁ',
      transliteration: 'skaþi',
      steps: [
        'ᛋ (sól) writes /s/',
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'The spelling skaþi is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  skoll: {
    originalScript: 'ᛋᚴᚢᛚᛚ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛋᚴᚢᛚᛚ',
      transliteration: 'skull',
      steps: [
        'ᛋ (sól) writes /s/',
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'The spelling skull is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  skuld: {
    originalScript: 'ᛋᚴᚢᛚᛏ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛋᚴᚢᛚᛏ',
      transliteration: 'skult',
      steps: [
        'ᛋ (sól) writes /s/',
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'The spelling skult is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  spentaarmaiti: {
    originalScript: '𐬯𐬞𐬆𐬥𐬙𐬀 𐬁𐬭𐬨𐬀𐬌𐬙𐬌',
    scriptName: 'Avestan',
    provenance: {
      original: '𐬯𐬞𐬆𐬥𐬙𐬀 𐬁𐬭𐬨𐬀𐬌𐬙𐬌',
      transliteration: 'Spənta Ārmaiti',
      steps: [
        'Spənta uses schwa ə (𐬆) before the n (𐬥).',
        'Ārmaiti begins with long ā (𐬁).',
        'The goddess is named in the Gathas as the personification of devotion.'
      ],
      sources: [
        'Avesta',
        'Gathas',
        'Bartholomae'
      ],
    },
  },
  spentamainyu: {
    originalScript: '𐬯𐬞𐬆𐬥𐬙𐬀 𐬨𐬀𐬌𐬥𐬌𐬌𐬎',
    scriptName: 'Avestan',
    provenance: {
      original: '𐬯𐬞𐬆𐬥𐬙𐬀 𐬨𐬀𐬌𐬥𐬌𐬌𐬎',
      transliteration: 'Spənta Mainiiu',
      steps: [
        'Spənta \'holy/bounteous\' is written with schwa ə (𐬆).',
        'The Avestan spelling matches the amesha spenta epithet in the Younger Avesta.',
        'Mainiiu ends in the diphthongal sequence -iiu.'
      ],
      sources: [
        'Avesta',
        'Bartholomae'
      ],
    },
  },
  sraosha: {
    originalScript: '𐬯𐬭𐬀𐬊𐬱𐬀',
    scriptName: 'Avestan',
    provenance: {
      original: '𐬯𐬭𐬀𐬊𐬱𐬀',
      transliteration: 'Sraoša',
      steps: [
        'Sraoša is the Avestan yazata of obedience and divine hearing.',
        'The š sound is written with Avestan š (𐬱).',
        'The diphthong ao is written with a (𐬀) followed by o (𐬊).'
      ],
      sources: [
        'Avesta',
        'Bartholomae'
      ],
    },
  },
  surt: {
    originalScript: 'ᛋᚢᚱᛏ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛋᚢᚱᛏ',
      transliteration: 'surt',
      steps: [
        'ᛋ (sól) writes /s/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᚱ (reið) writes /r/',
        'The spelling surt is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  surtr: {
    originalScript: 'ᛋᚢᚱᛏᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛋᚢᚱᛏᚱ',
      transliteration: 'surtr',
      steps: [
        'ᛋ (sól) writes /s/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᚱ (reið) writes /r/',
        'The spelling surtr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  suttungr: {
    originalScript: 'ᛋᚢᛏᛏᚢᚾᚴᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛋᚢᛏᛏᚢᚾᚴᚱ',
      transliteration: 'suttunkr',
      steps: [
        'ᛋ (sól) writes /s/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᛏ (Týr) writes both /t/ and /d/',
        'The spelling suttunkr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  svartalfaheimr: {
    originalScript: 'ᛋᚠᛅᚱᛏᛅᛚᚠᛅᚼᛁᛘᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛋᚠᛅᚱᛏᛅᛚᚠᛅᚼᛁᛘᚱ',
      transliteration: 'sfartalfahimr',
      steps: [
        'ᛋ (sól) writes /s/',
        'ᚠ (fé) writes both /f/ and /v/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'The spelling sfartalfahimr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  syn: {
    originalScript: 'ᛋᚢᚾ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛋᚢᚾ',
      transliteration: 'sun',
      steps: [
        'ᛋ (sól) writes /s/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᚾ (nauðr) writes /n/',
        'The spelling sun is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  thjazi: {
    originalScript: 'ᚦᛁᛅᛋᛁ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚦᛁᛅᛋᛁ',
      transliteration: 'þiasi',
      steps: [
        'ᚦ (þurs) writes both þ and ð',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'The spelling þiasi is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  thor: {
    originalScript: 'ᚦᚢᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚦᚢᚱ',
      transliteration: 'þur',
      steps: [
        'ᚦ (þurs) writes both þ and ð',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᚱ (reið) writes /r/',
        'Attested in Viking-Age inscriptions: The form þur appears on Viking-Age artefacts such as the Mannegårde coin graffiti.'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  thrud: {
    originalScript: 'ᚦᚱᚢᚦᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚦᚱᚢᚦᚱ',
      transliteration: 'þruþr',
      steps: [
        'ᚦ (þurs) writes both þ and ð',
        'ᚱ (reið) writes /r/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'The spelling þruþr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  thrymr: {
    originalScript: 'ᚦᚱᚢᛘᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚦᚱᚢᛘᚱ',
      transliteration: 'þrumr',
      steps: [
        'ᚦ (þurs) writes both þ and ð',
        'ᚱ (reið) writes /r/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'The spelling þrumr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  tyr: {
    originalScript: 'ᛏᚢᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᛏᚢᚱ',
      transliteration: 'tur',
      steps: [
        'ᛏ (Týr) writes both /t/ and /d/',
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᚱ (reið) writes /r/',
        'The spelling tur is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  ullr: {
    originalScript: 'ᚢᛚᛚᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚢᛚᛚᚱ',
      transliteration: 'ullr',
      steps: [
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᛚ (lögr) writes /l/',
        'ᚱ (reið) writes /r/',
        'The spelling ullr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  uppsala: {
    originalScript: 'ᚢᛒᛒᛋᛅᛚᛅ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚢᛒᛒᛋᛅᛚᛅ',
      transliteration: 'ubbsala',
      steps: [
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᛒ (bjarkan) writes both /b/ and /p/',
        'ᛋ (sól) writes /s/',
        'The spelling ubbsala is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  urdr: {
    originalScript: 'ᚢᚱᚦᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚢᚱᚦᚱ',
      transliteration: 'urþr',
      steps: [
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᚱ (reið) writes /r/',
        'ᚦ (þurs) writes both þ and ð',
        'The spelling urþr is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  valholl: {
    originalScript: 'ᚢᛅᛚᚼᚢᛚ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚢᛅᛚᚼᚢᛚ',
      transliteration: 'ualhul',
      steps: [
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᛚ (lögr) writes /l/',
        'The spelling ualhul is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels',
        'Initial /v/ continues Proto-Germanic *w-, represented by ᚢ (úr).'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  vali: {
    originalScript: 'ᚢᛅᛚᛁ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚢᛅᛚᛁ',
      transliteration: 'uali',
      steps: [
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᛚ (lögr) writes /l/',
        'The spelling uali is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels',
        'Initial /v/ continues Proto-Germanic *w-, represented by ᚢ (úr).'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  vanaheimr: {
    originalScript: 'ᚢᛅᚾᚼᛁᛘᛁᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚢᛅᚾᚼᛁᛘᛁᚱ',
      transliteration: 'uanhimir',
      steps: [
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᛅ (ár) writes /a/, /á/ and /æ/',
        'ᚾ (nauðr) writes /n/',
        'The spelling uanhimir is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels',
        'Initial /v/ continues Proto-Germanic *w-, represented by ᚢ (úr).'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  verdandi: {
    originalScript: 'ᚠᛁᚱᚦᛅᚾᛏᛁ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚠᛁᚱᚦᛅᚾᛏᛁ',
      transliteration: 'firþanti',
      steps: [
        'ᚠ (fé) writes both /f/ and /v/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚱ (reið) writes /r/',
        'The spelling firþanti is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  verethragna: {
    originalScript: '𐬬𐬆𐬭𐬆𐬚𐬭𐬀𐬖𐬥𐬀',
    scriptName: 'Avestan',
    provenance: {
      original: '𐬬𐬆𐬭𐬆𐬚𐬭𐬀𐬖𐬥𐬀',
      transliteration: 'Vərəθraγna',
      steps: [
        'Verethragna is the yazata of victory, celebrated in Yasht 14.',
        'The medial θ corresponds to Avestan θ (𐬚).',
        'The voiced velar fricative γ is written with Avestan γ (𐬖).'
      ],
      sources: [
        'Avesta',
        'Bartholomae'
      ],
    },
  },
  vidarr: {
    originalScript: 'ᚢᛁᚦᛅᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚢᛁᚦᛅᚱ',
      transliteration: 'uiþar',
      steps: [
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᛁ (ís) writes both /i/ and /e/',
        'ᚦ (þurs) writes both þ and ð',
        'The spelling uiþar is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels',
        'Initial /v/ continues Proto-Germanic *w-, represented by ᚢ (úr).'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  vohumanah: {
    originalScript: '𐬬𐬊𐬵𐬎 𐬨𐬀𐬥𐬀𐬵',
    scriptName: 'Avestan',
    provenance: {
      original: '𐬬𐬊𐬵𐬎 𐬨𐬀𐬥𐬀𐬵',
      transliteration: 'Vohu Manah',
      steps: [
        'Vohu Manah is one of the Amesha Spentas praised in the Gathas.',
        'The final -h in Vohu and Manah represents Avestan h (𐬵).',
        'The vowel o in Vohu is written with the Avestan letter o (𐬊).'
      ],
      sources: [
        'Avesta',
        'Gathas',
        'Bartholomae'
      ],
    },
  },
  yggdrasill: {
    originalScript: 'ᚢᚴᚴᛏᚱᛅᛋᛁᛚᛚ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚢᚴᚴᛏᚱᛅᛋᛁᛚᛚ',
      transliteration: 'ukktrasill',
      steps: [
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᚴ (kaun) writes both /k/ and /g/ (and the ng cluster)',
        'ᛏ (Týr) writes both /t/ and /d/',
        'The spelling ukktrasill is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
  ymir: {
    originalScript: 'ᚢᛘᛁᚱ',
    scriptName: 'Younger Futhark',
    provenance: {
      original: 'ᚢᛘᛁᚱ',
      transliteration: 'umir',
      steps: [
        'ᚢ (úr) writes the rounded back vowels /u, o, ø, ǫ, y/ and /w/',
        'ᛘ (maðr) writes /m/',
        'ᛁ (ís) writes both /i/ and /e/',
        'The spelling umir is a normalized phonetic reconstruction; Younger Futhark does not distinguish voiced/voiceless stops or separate short and long vowels'
      ],
      sources: [
        'Cleasby-Vigfusson',
        'Poetic Edda',
        'Prose Edda',
        'Zoëga'
      ],
    },
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════════════════════════

function isPlaceholder(value) {
  return !value || value === '—' || value.trim() === '';
}

function containsGreekOrCjk(value) {
  if (!value) return false;
  return (
    /[\u0370-\u03FF\u1F00-\u1FFF]/.test(value) || // Greek
    /[\u0900-\u097F]/.test(value) || // Devanagari
    /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(value) // CJK
  );
}

function getMapped(entry) {
  if (!entry?.id) return undefined;
  return ORIGINAL_SCRIPTS[entry.id];
}

function getOriginalScript(entry) {
  if (!entry) return null;

  // 1. Explicit field on the lexicon entry
  if (!isPlaceholder(entry.originalScript)) {
    return entry.originalScript;
  }

  // 2. Curated mapping
  const mapped = getMapped(entry);
  if (mapped && !isPlaceholder(mapped.originalScript)) {
    return mapped.originalScript;
  }

  // 3. Backward-compatible Greek/CJK fallback. We only fall back to the
  //    legacy `greek` field when it actually contains Greek, Devanagari or CJK
  //    characters — never a Greek transliteration of a Semitic name.
  if (!isPlaceholder(entry.greek) && containsGreekOrCjk(entry.greek)) {
    return entry.greek;
  }

  return null;
}

function getScriptName(entry) {
  if (!entry) return 'Original';
  const mapped = getMapped(entry);
  if (mapped?.scriptName) return mapped.scriptName;
  return SCRIPT_NAMES[entry.pantheon] || 'Original Script';
}

function hasOriginalScript(entry) {
  return getOriginalScript(entry) !== null;
}

function getOriginalScriptLabel(entry) {
  if (hasOriginalScript(entry)) return 'Original Script';
  if (entry?.pantheon && SCRIPTLESS_PANTHEONS.has(entry.pantheon)) {
    return 'Scholarly Transliteration';
  }
  return 'Scholarly Transliteration';
}

function getProvenance(entry) {
  if (!entry) return null;
  const mapped = getMapped(entry);
  if (mapped?.provenance) return mapped.provenance;
  return null;
}

function getNoScriptNote(entry) {
  if (!entry) return '';
  const pantheon = entry.pantheon || 'this tradition';
  if (entry.pantheon && SCRIPTLESS_PANTHEONS.has(entry.pantheon)) {
    return `No indigenous writing system is securely attested for individual ${pantheon} names. The form shown is a modern scholarly transliteration.`;
  }
  return `The original script for this ${pantheon} name has not yet been added to PUNICODEX. The form shown is a scholarly transliteration.`;
}

// ═════════════════════════════════════════════════════════════════════════════
// Enriched provenance helpers (Phase A provenance overhaul)
// ═════════════════════════════════════════════════════════════════════════════

function getScriptSpecimen(entry) {
  return getOriginalScript(entry) || '—';
}

function getScriptMeta(entry) {
  const mapped = getMapped(entry);
  return {
    scriptName: getScriptName(entry),
    scriptFamily: mapped?.scriptFamily || '',
    writingDirection: mapped?.writingDirection || '',
    timePeriod: mapped?.timePeriod || '',
    region: mapped?.region || '',
  };
}

function getProvenance(entry) {
  if (!entry) return null;
  const mapped = getMapped(entry);
  if (mapped?.provenance) return mapped.provenance;
  return null;
}

function getRichProvenance(entry) {
  if (!entry) return null;
  const mapped = getMapped(entry);
  const provenance = mapped?.provenance || null;
  if (!provenance) return null;

  const scriptSpecimen = getScriptSpecimen(entry);
  const scriptMeta = getScriptMeta(entry);

  return {
    scriptSpecimen,
    scriptName: scriptMeta.scriptName,
    scriptFamily: scriptMeta.scriptFamily,
    writingDirection: scriptMeta.writingDirection,
    timePeriod: scriptMeta.timePeriod,
    region: scriptMeta.region,
    transliteration: provenance.transliteration || entry.unicode || '',
    transliterationScheme: provenance.transliterationScheme || '',
    normalizedReading: provenance.normalizedReading || '',
    phoneticReconstruction: provenance.phoneticReconstruction || '',
    signs: getSigns(entry),
    steps: provenance.steps || [],
    etymology: provenance.etymology || '',
    semantics: provenance.semantics || '',
    variants: provenance.variants || [],
    attestations: provenance.attestations || [],
    uncertainties: provenance.uncertainties || [],
    dnsNotes: provenance.dnsNotes || '',
    punycodeReflection: provenance.punycodeReflection || '',
    sources: normalizeSources(provenance.sources),
    editorsNote: provenance.editorsNote || '',
    curationDate: provenance.curationDate || '',
    reviewStatus: provenance.reviewStatus || 'draft',
  };
}

function getSigns(entry) {
  const mapped = getMapped(entry);
  const provenance = mapped?.provenance;
  if (Array.isArray(provenance?.signs) && provenance.signs.length > 0) {
    return provenance.signs;
  }
  const specimen = getOriginalScript(entry);
  if (!specimen || specimen === '—') return [];
  // Fallback: one card per Unicode scalar. This is intentionally naive; curated
  // sign arrays should be provided for logographic/abjad scripts.
  return Array.from(specimen).map((sign) => ({
    sign,
    name: '',
    value: '',
    function: 'letter',
    reading: '',
    note: '',
  }));
}

function getAttestations(entry) {
  const provenance = getProvenance(entry);
  return provenance?.attestations || [];
}

function getEtymology(entry) {
  const provenance = getProvenance(entry);
  return provenance?.etymology || '';
}

function getDnsNotes(entry) {
  const provenance = getProvenance(entry);
  return provenance?.dnsNotes || '';
}

function normalizeSources(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((s) => {
    if (typeof s === 'string') return { title: s, tier: 2 };
    return {
      title: s.title || '',
      author: s.author || '',
      year: s.year || '',
      pages: s.pages || '',
      url: s.url || '',
      tier: s.tier || 2,
    };
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Sanskrit / Buddhist IAST → Devanagari converter
// ═════════════════════════════════════════════════════════════════════════════

const IAST_VOWELS = {
  a: 'अ',
  ā: 'आ',
  i: 'इ',
  ī: 'ई',
  u: 'उ',
  ū: 'ऊ',
  ṛ: 'ऋ',
  ṝ: 'ॄ',
  ḷ: 'ऌ',
  ḹ: 'ॡ',
  e: 'ए',
  ai: 'ऐ',
  o: 'ओ',
  au: 'औ',
  ṃ: 'ं',
  ḥ: 'ः',
};

const IAST_CONSONANTS = {
  k: 'क',
  kh: 'ख',
  g: 'ग',
  gh: 'घ',
  ṅ: 'ङ',
  c: 'च',
  ch: 'छ',
  j: 'ज',
  jh: 'झ',
  ñ: 'ञ',
  ṭ: 'ट',
  ṭh: 'ठ',
  ḍ: 'ड',
  ḍh: 'ढ',
  ṇ: 'ण',
  t: 'त',
  th: 'थ',
  d: 'द',
  dh: 'ध',
  n: 'न',
  p: 'प',
  ph: 'फ',
  b: 'ब',
  bh: 'भ',
  m: 'म',
  y: 'य',
  r: 'र',
  l: 'ल',
  v: 'व',
  ś: 'श',
  ṣ: 'ष',
  s: 'स',
  h: 'ह',
};

const IAST_VOWEL_SIGNS = {
  a: '',
  ā: 'ा',
  i: 'ि',
  ī: 'ी',
  u: 'ु',
  ū: 'ू',
  ṛ: 'ृ',
  ṝ: 'ॄ',
  ḷ: 'ॢ',
  ḹ: 'ॣ',
  e: 'े',
  ai: 'ै',
  o: 'ो',
  au: 'ौ',
};

const IAST_TOKENS = Object.keys(IAST_VOWELS)
  .concat(Object.keys(IAST_CONSONANTS))
  .sort((a, b) => b.length - a.length);

function iastTokenize(text) {
  const tokens = [];
  let i = 0;
  const normalized = text.toLowerCase().normalize('NFC');
  while (i < normalized.length) {
    let matched = false;
    for (const token of IAST_TOKENS) {
      if (normalized.startsWith(token, i)) {
        tokens.push(token);
        i += token.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Pass through unknown characters (spaces, punctuation, hyphens)
      tokens.push(normalized[i]);
      i += 1;
    }
  }
  return tokens;
}

function iastToDevanagari(text) {
  const tokens = iastTokenize(text);
  let output = '';
  let pendingConsonant = false;

  for (let idx = 0; idx < tokens.length; idx++) {
    const token = tokens[idx];
    const nextToken = tokens[idx + 1];

    if (IAST_VOWELS[token]) {
      if (token === 'ṃ' || token === 'ḥ') {
        output += IAST_VOWELS[token];
        pendingConsonant = false;
        continue;
      }
      if (pendingConsonant) {
        output += IAST_VOWEL_SIGNS[token] || '';
        pendingConsonant = false;
      } else {
        output += IAST_VOWELS[token];
      }
      continue;
    }

    if (IAST_CONSONANTS[token]) {
      if (pendingConsonant) {
        output += '्';
      }
      output += IAST_CONSONANTS[token];
      pendingConsonant = true;
      continue;
    }

    // Unknown / punctuation
    if (pendingConsonant) {
      output += '्';
      pendingConsonant = false;
    }
    output += token;
  }

  if (pendingConsonant) {
    output += '्';
  }

  return output;
}

function buildSanskritProvenance(entry, devanagari) {
  return {
    original: devanagari,
    transliteration: entry.unicode,
    steps: [
      `Sanskrit ${entry.unicode} is written in Devanagari as ${devanagari}`,
      'IAST transliteration maps each Devanagari vowel and consonant to a Latin equivalent',
      'Macrons mark long vowels (ā, ī, ū); dots beneath consonants mark retroflex articulation (ṭ, ḍ, ṇ, ṣ)',
    ],
    sources: ['Monier-Williams Sanskrit-English Dictionary', 'Macdonell, Sanskrit Grammar for Students'],
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Merge curated extra data (non-Sanskritic scripts)
// ═════════════════════════════════════════════════════════════════════════════

const extraPath = path.join(__dirname, 'original-scripts-extra.json');
try {
  const extra = JSON.parse(fs.readFileSync(extraPath, 'utf8'));
  for (const [id, data] of Object.entries(extra)) {
    if (id.startsWith('_')) continue;
    // Curated extra data overrides the in-file defaults so the canonical
    // source can evolve without touching this module.
    ORIGINAL_SCRIPTS[id] = data;
  }
} catch (err) {
  // Extra file is optional during development
}

// ═════════════════════════════════════════════════════════════════════════════
// Optional: populate missing Sanskrit / Buddhist Devanagari at runtime
// ═════════════════════════════════════════════════════════════════════════════

function populateFromLexicon(lexiconPath) {
  const fullPath = path.resolve(lexiconPath || path.join(__dirname, 'lexicon.js'));
  const code = fs.readFileSync(fullPath, 'utf8').replace('const LEXICON', 'var LEXICON');
  const lexicon = new Function(`${code}; return LEXICON;`)();

  for (const entry of lexicon) {
    if (entry.id in ORIGINAL_SCRIPTS) continue;

    if (entry.pantheon === 'sanskrit' || entry.pantheon === 'buddhist') {
      const devanagari = iastToDevanagari(entry.unicode);
      if (devanagari && devanagari !== entry.unicode) {
        ORIGINAL_SCRIPTS[entry.id] = {
          originalScript: devanagari,
          scriptName: 'Devanagari',
          provenance: buildSanskritProvenance(entry, devanagari),
        };
      }
    }
  }
}

// Populate Sanskrit/Buddhist mappings automatically so the site does not claim
// a Latin transliteration is the original script for those traditions.
populateFromLexicon();

// ═════════════════════════════════════════════════════════════════════════════
// Exports
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  ORIGINAL_SCRIPTS,
  SCRIPT_NAMES,
  SCRIPTLESS_PANTHEONS,
  iastToDevanagari,
  isPlaceholder,
  containsGreekOrCjk,
  getOriginalScript,
  getScriptName,
  hasOriginalScript,
  getOriginalScriptLabel,
  getProvenance,
  getRichProvenance,
  getSigns,
  getAttestations,
  getEtymology,
  getDnsNotes,
  getNoScriptNote,
  populateFromLexicon,
};
