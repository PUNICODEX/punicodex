/**
 * PuniCodex — Canonical Sign Notes Registry
 *
 * Scholarly one-line notes for individual signs (letters, runes, cuneiform
 * signs, akṣaras) displayed in the /ink/ Signs grid. Fills the gaps where an
 * entry's per-sign provenance carries no note — the generator
 * (scripts/generate-ink-index.js) consults this registry as a fallback.
 *
 * Doctrine (ACCURACY.md): phonetic values, conventional sign readings, and
 * attested names only. Rune-name glosses come from the rune poems (the
 * attested name's meaning), never from occult "rune meaning" tables.
 * Cuneiform notes give the conventional Assyriological reading (the Unicode
 * sign name) and, where standard, its logographic role.
 */

const SIGN_NOTES = {
  // ── Avestan ───────────────────────────────────────────────────
  '𐬢': { name: 'nge', value: 'ŋ', note: 'The letter nge — the velar nasal /ŋ/, written before velar consonants.' },
  '𐬌': { name: 'i', value: 'i', note: 'Short vowel /i/.' },
  '𐬥': { name: 'ne', value: 'n', note: 'The letter ne — the dental nasal /n/.' },
  '𐬚': { name: 'θe', value: 'θ', note: 'The letter θe — the voiceless dental fricative /θ/ (English th).' },
  '𐬯': { name: 'se', value: 's', note: 'The letter se — the voiceless sibilant /s/.' },
  '𐬞': { name: 'pe', value: 'p', note: 'The letter pe — the voiceless bilabial stop /p/.' },
  '𐬆': { name: 'aē', value: 'aē', note: 'The diphthong aē — a closing diphthong of Avestan.' },
  '𐬙': { name: 'te', value: 't', note: 'The letter te — the voiceless dental stop /t/.' },
  '𐬬': { name: 've', value: 'v', note: 'The letter ve — the voiced labial fricative /v~w/.' },
  '𐬊': { name: 'o', value: 'o', note: 'Short vowel /o/.' },
  '𐬴': { name: 'š́e', value: 'ɕ', note: 'The letter š́e — the voiceless palatal sibilant /ɕ/.' },
  '𐬱': { name: 'še', value: 'ʃ', note: 'The letter še — the voiceless postalveolar fricative /ʃ/ (sh).' },
  '𐬑': { name: 'xe', value: 'x', note: 'The letter xe — the voiceless velar fricative /x/ (Scottish loch).' },
  '𐬍': { name: 'ī', value: 'iː', note: 'Long vowel /iː/.' },
  '𐬏': { name: 'ū', value: 'uː', note: 'Long vowel /uː/.' },
  '𐬖': { name: 'ghe', value: 'ɣ', note: 'The letter ghe — the voiced velar fricative /ɣ/.' },

  // ── Cuneiform ─────────────────────────────────────────────────
  '𒌉': { name: 'TUR', value: 'tur', note: 'The sign TUR — syllabic value tur; as a logogram it writes "son; small".' },
  '𒍣': { name: 'ZI', value: 'zi', note: 'The sign ZI — syllabic value zi/si; as a logogram it writes "life".' },
  '𒄭': { name: 'HI', value: 'hi', note: 'The sign HI — syllabic value hi (also ḫi); one of the most frequent signs in the corpus.' },
  '𒄖': { name: 'GU', value: 'gu', note: 'The sign GU — syllabic value gu (also ku, qû by context).' },
  '𒆷': { name: 'LA', value: 'la', note: 'The sign LA — syllabic value la.' },
  '𒉆': { name: 'NAM', value: 'nam', note: 'The sign NAM — the abstract-noun formative nam- ("-ness"); also syllabic nam.' },
  '𒋻': { name: 'TAR', value: 'tar', note: 'The sign TAR — syllabic value tar; as a logogram, "to cut" (tarāsu).' },

  // ── Devanagari ────────────────────────────────────────────────
  // Vowels (independent forms)
  'अ': { name: 'a', value: 'ɐ', note: 'Short vowel /ɐ/ — the inherent vowel every consonant carries.' },
  'आ': { name: 'ā', value: 'aː', note: 'Long vowel /aː/.' },
  'इ': { name: 'i', value: 'i', note: 'Short vowel /i/.' },
  'ई': { name: 'ī', value: 'iː', note: 'Long vowel /iː/.' },
  'उ': { name: 'u', value: 'u', note: 'Short vowel /u/.' },
  'ऊ': { name: 'ū', value: 'uː', note: 'Long vowel /uː/.' },
  'ए': { name: 'e', value: 'eː', note: 'The vowel e — long by nature in Sanskrit, /eː/.' },
  'ऐ': { name: 'ai', value: 'ɐi', note: 'The diphthong ai /ɐi/.' },
  'ओ': { name: 'o', value: 'oː', note: 'The vowel o — long by nature in Sanskrit, /oː/.' },
  'औ': { name: 'au', value: 'ɐu', note: 'The diphthong au /ɐu/.' },
  // Dependent vowel signs (mātrās)
  'ा': { name: 'ā (mātrā)', value: 'aː', note: 'Vowel sign ā — lengthens the consonant’s inherent vowel to /aː/.' },
  'ि': { name: 'i (mātrā)', value: 'i', note: 'Vowel sign i /i/ — written before the consonant it follows.' },
  'ी': { name: 'ī (mātrā)', value: 'iː', note: 'Vowel sign ī /iː/ — follows its consonant.' },
  'ु': { name: 'u (mātrā)', value: 'u', note: 'Vowel sign u /u/ — written below its consonant.' },
  'ू': { name: 'ū (mātrā)', value: 'uː', note: 'Vowel sign ū /uː/ — written below its consonant.' },
  'ृ': { name: 'ṛ (mātrā)', value: 'r̩', note: 'Vowel sign ṛ — the vocalic r /r̩/, a vowel made of the r-sound itself.' },
  'े': { name: 'e (mātrā)', value: 'eː', note: 'Vowel sign e /eː/ — written above its consonant.' },
  'ै': { name: 'ai (mātrā)', value: 'ɐi', note: 'Vowel sign ai /ɐi/ — written above its consonant.' },
  'ो': { name: 'o (mātrā)', value: 'oː', note: 'Vowel sign o /oː/.' },
  'ौ': { name: 'au (mātrā)', value: 'ɐu', note: 'Vowel sign au /ɐu/.' },
  // Other marks
  'ं': { name: 'anusvāra', value: 'ṃ', note: 'Anusvāra — nasalizes the vowel, /ṃ/; the dot above.' },
  '्': { name: 'virāma', value: '∅', note: 'Virāma (halant) — cancels the inherent vowel, joining consonants into a cluster.' },
  // Consonants
  'क': { name: 'ka', value: 'k', note: 'ka — voiceless velar stop /k/.' },
  'ग': { name: 'ga', value: 'ɡ', note: 'ga — voiced velar stop /ɡ/.' },
  'घ': { name: 'gha', value: 'ɡʱ', note: 'gha — aspirated voiced velar stop /ɡʱ/.' },
  'ङ': { name: 'ṅa', value: 'ŋ', note: 'ṅa — the velar nasal /ŋ/ (as in English sing).' },
  'च': { name: 'ca', value: 'tɕ', note: 'ca — voiceless palatal stop /tɕ/ (like English ch).' },
  'ज': { name: 'ja', value: 'dʑ', note: 'ja — voiced palatal stop /dʑ/ (like English j).' },
  'ञ': { name: 'ña', value: 'ɲ', note: 'ña — the palatal nasal /ɲ/ (as in Spanish ñ).' },
  'ट': { name: 'ṭa', value: 'ʈ', note: 'ṭa — voiceless retroflex stop /ʈ/, tongue curled back.' },
  'ठ': { name: 'ṭha', value: 'ʈʰ', note: 'ṭha — aspirated voiceless retroflex stop /ʈʰ/.' },
  'ड': { name: 'ḍa', value: 'ɖ', note: 'ḍa — voiced retroflex stop /ɖ/.' },
  'ण': { name: 'ṇa', value: 'ɳ', note: 'ṇa — the retroflex nasal /ɳ/.' },
  'त': { name: 'ta', value: 't̪', note: 'ta — voiceless dental stop /t̪/, tongue on the teeth.' },
  'थ': { name: 'tha', value: 't̪ʰ', note: 'tha — aspirated voiceless dental stop /t̪ʰ/.' },
  'द': { name: 'da', value: 'd̪', note: 'da — voiced dental stop /d̪/.' },
  'ध': { name: 'dha', value: 'd̪ʱ', note: 'dha — aspirated voiced dental stop /d̪ʱ/.' },
  'न': { name: 'na', value: 'n̪', note: 'na — the dental nasal /n̪/.' },
  'प': { name: 'pa', value: 'p', note: 'pa — voiceless bilabial stop /p/.' },
  'ब': { name: 'ba', value: 'b', note: 'ba — voiced bilabial stop /b/.' },
  'भ': { name: 'bha', value: 'bʱ', note: 'bha — aspirated voiced bilabial stop /bʱ/.' },
  'य': { name: 'ya', value: 'j', note: 'ya — the palatal glide /j/ (English y).' },
  'र': { name: 'ra', value: 'r', note: 'ra — the trilled or tapped /r/.' },
  'ष': { name: 'ṣa', value: 'ʂ', note: 'ṣa — the retroflex sibilant /ʂ/.' },
  'स': { name: 'sa', value: 's', note: 'sa — the dental sibilant /s/.' },
  'ह': { name: 'ha', value: 'ɦ', note: 'ha — the voiced glottal fricative /ɦ/.' },
  // Roman transliteration letters that appear inside Devanagari entries
  'á': { name: 'á (udātta)', value: 'á', note: 'Vedic pitch accent — the udātta (raised tone) marker in romanized text, not a Devanagari sign.' },
  'í': { name: 'í (udātta)', value: 'í', note: 'Vedic pitch accent — the udātta (raised tone) marker in romanized text, not a Devanagari sign.' },
  'é': { name: 'é (udātta)', value: 'é', note: 'Vedic pitch accent — the udātta (raised tone) marker in romanized text, not a Devanagari sign.' },

  // ── Ugaritic cuneiform alphabet ───────────────────────────────
  '𐎗': { name: 'rēš', value: 'r', note: 'Rēš — “head”; the r-letter of the Ugaritic alphabet.' },

  // ── Younger Futhark ───────────────────────────────────────────
  'ᛅ': { name: 'ár', value: 'a', note: 'Ár — “good year”; the a-rune of the Younger Futhark, named in the rune poems.' },
  'ᛋ': { name: 'sól', value: 's', note: 'Sól — “sun”; the s-rune, named in the rune poems.' },
  'ᚴ': { name: 'kaun', value: 'k', note: 'Kaun — “ulcer”; the k-rune of the Younger Futhark, per the Norwegian rune poem.' },
  'ᚱ': { name: 'reið', value: 'r', note: 'Reið — “ride, journey”; the r-rune, named in the rune poems.' },
  'ᚦ': { name: 'þurs', value: 'θ', note: 'Þurs — “giant, ogre”; the þ-rune (English th), named in the rune poems.' },
  'ᛒ': { name: 'bjarkan', value: 'b', note: 'Bjarkan — “birch”; the b-rune, named in the rune poems.' },
};

module.exports = { SIGN_NOTES };
