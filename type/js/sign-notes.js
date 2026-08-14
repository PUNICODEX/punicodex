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

  // ── Hangul syllable blocks (Korean shamanic names) ───────────
  '하': { name: 'ha', value: 'ha', note: 'Syllable block 하 — ㅎ h + ㅏ a.' },
  '나': { name: 'na', value: 'na', note: 'Syllable block 나 — ㄴ n + ㅏ a.' },
  '님': { name: 'nim', value: 'nim', note: 'Syllable block 님 — ㄴ n + ㅣ i + final ㅁ m.' },
  '할': { name: 'hal', value: 'hal', note: 'Syllable block 할 — ㅎ h + ㅏ a + final ㄹ l.' },
  '머': { name: 'meo', value: 'mʌ', note: 'Syllable block 머 — ㅁ m + ㅓ ō/ŏ.' },
  '니': { name: 'ni', value: 'ni', note: 'Syllable block 니 — ㄴ n + ㅣ i.' },
  '단': { name: 'dan', value: 'dan', note: 'Syllable block 단 — ㄷ d + ㅏ a + final ㄴ n.' },
  '군': { name: 'gun', value: 'gun', note: 'Syllable block 군 — ㄱ g + ㅜ u + final ㄴ n.' },
  '환': { name: 'hwan', value: 'hwan', note: 'Syllable block 환 — ㅎ h + ㅘ wa + final ㄴ n.' },
  '웅': { name: 'ung', value: 'ung', note: 'Syllable block 웅 — ㅇ (silent onset) + ㅜ u + final ㅇ ng.' },
  '삼': { name: 'sam', value: 'sam', note: 'Syllable block 삼 — ㅅ s + ㅏ a + final ㅁ m.' },
  '신': { name: 'sin', value: 'sin', note: 'Syllable block 신 — ㅅ s + ㅣ i + final ㄴ n.' },
  '조': { name: 'jo', value: 'jo', note: 'Syllable block 조 — ㅈ j + ㅗ o.' },
  '왕': { name: 'wang', value: 'wang', note: 'Syllable block 왕 — ㅇ (silent) + ㅗㅏ wa + final ㅇ ng.' },
  '서': { name: 'seo', value: 'sʌ', note: 'Syllable block 서 — ㅅ s + ㅓ ō/ŏ.' },
  '낭': { name: 'nang', value: 'nang', note: 'Syllable block 낭 — ㄴ n + ㅏ a + final ㅇ ng.' },
  '용': { name: 'yong', value: 'yong', note: 'Syllable block 용 — ㅇ (silent) + ㅛ yo + final ㅇ ng.' },
  '마': { name: 'ma', value: 'ma', note: 'Syllable block 마 — ㅁ m + ㅏ a.' },
  '고': { name: 'go', value: 'go', note: 'Syllable block 고 — ㄱ g + ㅗ o.' },
  '칠': { name: 'chil', value: 'chil', note: 'Syllable block 칠 — ㅊ ch + ㅣ i + final ㄹ l.' },
  '성': { name: 'seong', value: 'sʌŋ', note: 'Syllable block 성 — ㅅ s + ㅓ ō/ŏ + final ㅇ ng.' },
  '백': { name: 'baek', value: 'pɛk', note: 'Syllable block 백 — ㅂ b + ㅐ ae + final ㄱ k.' },
  '두': { name: 'du', value: 'du', note: 'Syllable block 두 — ㄷ d + ㅜ u.' },
  '산': { name: 'san', value: 'san', note: 'Syllable block 산 — ㅅ s + ㅏ a + final ㄴ n.' },

  // ── Egyptian hieroglyphs (Gardiner sign list) ────────────────
  '𓊨': { name: 'Q1 (seat)', value: 'st', note: 'The seat sign Q1 writes st — the first sound of wsjr (Osiris).' },
  '𓁹': { name: 'D4 (eye)', value: 'ir', note: 'The eye sign D4 writes ir — part of wsjr, “Osiris”.' },
  '𓀭': { name: 'A40 (seated god)', value: 'divine det.', note: 'A40, the seated god — the divine determinative; classifies the name as a god, unpronounced.' },
  '𓎛': { name: 'V28 (wick)', value: 'ḥ', note: 'The wick sign V28 writes ḥ — a breathy h.' },
  '𓐑': { name: 'AA5 (oar)', value: 'ḥp', note: 'The oar sign AA5 writes ḥp — as in Ḥp, the Apis bull.' },
  '𓊪': { name: 'Q3 (stool)', value: 'p', note: 'The stool sign Q3 writes p.' },
  '𓃒': { name: 'E1 (bull)', value: 'Apis det.', note: 'E1, the bull — the determinative of the Apis, marking the sacred animal.' },
  '𓅃': { name: 'G5 (Horus falcon)', value: 'ḥr', note: 'The falcon G5 writes Ḥr — Horus himself.' },
  '𓏤': { name: 'Z1 (stroke)', value: 'determinative', note: 'The single stroke Z1 marks the word as written exactly as it reads.' },
  '𓄡': { name: 'F32 (animal belly)', value: 'ẖ', note: 'The belly sign F32 writes ẖ — the soft kh sound.' },
  '𓂋': { name: 'D21 (mouth)', value: 'r', note: 'The mouth sign D21 writes r.' },
  '𓂧': { name: 'D46 (hand)', value: 'd', note: 'The hand sign D46 writes d.' },
  '𓀔': { name: 'A17 (child)', value: 'ẖrd det.', note: 'A17, the child — the determinative of ẖrd, “the child”.' },
  '𓏎': { name: 'W25 (legs)', value: 'in', note: 'The sign W25 writes in — the opening of ỉn-ḥrt, “He who brings back the Distant One”.' },
  '𓈖': { name: 'N35 (water)', value: 'n', note: 'The water ripple N35 writes n.' },
  '𓁷': { name: 'D2 (face)', value: 'ḥr', note: 'The face sign D2 writes ḥr.' },
  '𓏏': { name: 'X1 (bread)', value: 't', note: 'The bread loaf X1 writes t.' },
  '𓈐': { name: 'N31 (road)', value: 'road', note: 'The road sign N31 — part of the ḥrt (Distant One) spelling.' },
  '𓅆': { name: 'G7 (falcon on standard)', value: 'divine det.', note: 'G7, the falcon on the standard — a divine determinative closing the god’s name.' },

  // ── Hanja (Korean names' Chinese-character forms) ────────────
  '檀': { name: 'dan (sandalwood)', value: 'dan', note: 'The character 檀, “sandalwood” — as in Dangun 檀君.' },
  '君': { name: 'gun (prince)', value: 'gun', note: 'The character 君, “prince, ruler”.' },
  '桓': { name: 'hwan (pillar)', value: 'hwan', note: 'The character 桓, “pillar; firm” — as in Hwanung 桓雄.' },
  '雄': { name: 'ung (hero)', value: 'ung', note: 'The character 雄, “hero; male”.' },
  '三': { name: 'sam (three)', value: 'sam', note: 'The character 三, “three”.' },
  '神': { name: 'sin (spirit)', value: 'sin', note: 'The character 神, “spirit, god”.' },
  '竈': { name: 'jo (hearth)', value: 'jo', note: 'The character 竈, “hearth, stove” — as in Jowangsin 竈王神.' },
  '王': { name: 'wang (king)', value: 'wang', note: 'The character 王, “king”.' },
  '城': { name: 'seong (wall)', value: 'seong', note: 'The character 城, “city wall”.' },
  '隍': { name: 'hwang (moat)', value: 'hwang', note: 'The character 隍, “moat” — with 城 it forms the guardian’s title.' },
  '龍': { name: 'yong (dragon)', value: 'yong', note: 'The character 龍, “dragon”.' },
  '麻': { name: 'ma (hemp)', value: 'ma', note: 'The character 麻, “hemp” — as in Mago 麻姑.' },
  '姑': { name: 'go (maiden)', value: 'go', note: 'The character 姑, “maiden”.' },
  '七': { name: 'chil (seven)', value: 'chil', note: 'The character 七, “seven”.' },
  '星': { name: 'seong (star)', value: 'seong', note: 'The character 星, “star”.' },
  '白': { name: 'baek (white)', value: 'baek', note: 'The character 白, “white”.' },
  '頭': { name: 'du (head)', value: 'du', note: 'The character 頭, “head” — as in Baekdusan 白頭山.' },
  '山': { name: 'san (mountain)', value: 'san', note: 'The character 山, “mountain”.' },
};

module.exports = { SIGN_NOTES };
