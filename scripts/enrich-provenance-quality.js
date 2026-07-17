#!/usr/bin/env node
/**
 * PuniCodex — Provenance Quality Enrichment Pass
 *
 * Reads type/js/original-scripts-extra.json and improves templated or empty
 * fields for all non-pilot entries. The 8 pilots (reviewStatus === "canonical"
 * AND id in PILOTS) are left untouched.
 *
 * The script is idempotent: it only fills empty/templated fields or replaces
 * obviously generic text, never overwriting manually-curated canonical data.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const INPUT = path.join(ROOT, 'type', 'js', 'original-scripts-extra.json');
const LEXICON_PATH = path.join(ROOT, 'type', 'js', 'lexicon.js');

const PILOTS = new Set(['zeus', 'ra', 'thor', 'shiva', 'long', 'nikko', 'david', 'enlil']);

const SCRIPTLESS_PANTHEONS = new Set(['celtic', 'nahuatl', 'polynesian', 'yoruba', 'slavic', 'incan', 'korean']);

function loadLexicon() {
  const code = fs.readFileSync(LEXICON_PATH, 'utf8').replace('const LEXICON', 'var LEXICON');
  return new Function(`${code}; return LEXICON;`)();
}

function isBlank(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

function looksTemplated(str) {
  if (isBlank(str)) return true;
  const lower = str.toLowerCase();
  return lower.includes('cuneiform sign used syllabically') ||
         lower.includes('letter of the ugaritic cuneiform alphabet') ||
         lower.includes('letter of the phoenician alphabet') ||
         lower.includes('letter of the avestan alphabet') ||
         lower.includes('letter of the hebrew alphabet') ||
         lower.includes('younger futhark rune') ||
         lower.includes('greek letter with its classical phonetic value') ||
         lower.includes('the name is written') && lower.includes('in cuneiform') ||
         lower.includes('the unicode restoration') && lower.includes('is registrable in .com');
}

function isGenericScheme(str) {
  if (isBlank(str)) return true;
  const lower = str.toLowerCase();
  return lower.includes('latin with diacritics') || lower.includes('standard scholarly');
}

function looksLikeMeaningCopy(etym, meaning) {
  if (isBlank(etym)) return true;
  const e = etym.toLowerCase().replace(/[.,;()]/g, '').trim();
  const m = (meaning || '').toLowerCase().replace(/[.,;()]/g, '').trim();
  // Very short (under ~55 chars) and either identical-ish or lacks root-word discussion.
  if (e.length < 55) return true;
  if (m && (e === m || e.startsWith(m) || m.startsWith(e))) return true;
  return false;
}

function ensureArray(obj, key) {
  if (!Array.isArray(obj[key])) obj[key] = [];
  return obj[key];
}

function setIfBlank(obj, key, value) {
  if (isBlank(obj[key])) {
    obj[key] = value;
    return true;
  }
  return false;
}

function replaceIfTemplated(obj, key, value) {
  if (isBlank(obj[key]) || looksTemplated(obj[key])) {
    obj[key] = value;
    return true;
  }
  return false;
}

function pushMissing(arr, item, keyFn = JSON.stringify) {
  const k = keyFn(item);
  if (!arr.some((x) => keyFn(x) === k)) arr.push(item);
}

// ---------------------------------------------------------------------------
// Script-specific sign metadata
// ---------------------------------------------------------------------------

const UGARITIC_LETTERS = {
  '𐎀': { name: 'alpa', value: 'ʾ / ʔ (glottal stop)', note: 'First letter of the Ugaritic alphabet; represents the glottal stop.' },
  '𐎁': { name: 'beta', value: 'b', note: 'Voiced bilabial stop /b/.' },
  '𐎂': { name: 'gamla', value: 'g', note: 'Voiced velar stop /g/.' },
  '𐎃': { name: 'ḫa', value: 'ḫ / χ', note: 'Voiceless velar or uvular fricative.' },
  '𐎄': { name: 'delta', value: 'd', note: 'Voiced alveolar stop /d/.' },
  '𐎅': { name: 'ho', value: 'h', note: 'Voiceless glottal fricative /h/.' },
  '𐎆': { name: 'wo', value: 'w', note: 'Labial-velar approximant /w/.' },
  '𐎇': { name: 'zeta', value: 'z', note: 'Voiced alveolar sibilant /z/ or /ð/.' },
  '𐎈': { name: 'ḥa', value: 'ḥ / ħ', note: 'Voiceless pharyngeal fricative.' },
  '𐎉': { name: 'ṭa', value: 'ṭ', note: 'Emphatic alveolar stop.' },
  '𐎊': { name: 'yi', value: 'y', note: 'Palatal approximant /j/.' },
  '𐎋': { name: 'kaf', value: 'k', note: 'Voiceless velar stop /k/.' },
  '𐎌': { name: 'šimš', value: 'š / ʃ', note: 'Voiceless postalveolar fricative.' },
  '𐎍': { name: 'lamed', value: 'l', note: 'Alveolar lateral approximant /l/.' },
  '𐎎': { name: 'mem', value: 'm', note: 'Bilabial nasal /m/.' },
  '𐎏': { name: 'ḏa', value: 'ḏ / ð', note: 'Voiced interdental fricative.' },
  '𐎐': { name: 'nun', value: 'n', note: 'Alveolar nasal /n/.' },
  '𐎑': { name: 'ḍa', value: 'ḍ / ɬ', note: 'Emphatic or lateral sibilant.' },
  '𐎒': { name: 'samma', value: 's', note: 'Voiceless alveolar sibilant /s/.' },
  '𐎓': { name: 'ʿayin', value: 'ʿ / ʕ', note: 'Voiced pharyngeal fricative; rendered with Egyptological ꜥ for DNS use.' },
  '𐎔': { name: 'pu', value: 'p', note: 'Voiceless bilabial stop /p/.' },
  '𐎕': { name: 'ṣade', value: 'ṣ / sˤ', note: 'Emphatic alveolar sibilant.' },
  '𐎖': { name: 'qopa', value: 'q / q', note: 'Voiceless uvular stop.' },
  '𐎗': { name: 'raša', value: 'r', note: 'Alveolar trill or flap /r/.' },
  '𐎘': { name: 'ṯa', value: 'ṯ / θ', note: 'Voiceless interdental fricative.' },
  '𐎙': { name: 'ġa', value: 'ġ / ʁ', note: 'Voiced uvular fricative.' },
  '𐎚': { name: 'ta', value: 't', note: 'Voiceless alveolar stop /t/.' },
  '𐎛': { name: 'ʾa', value: 'ʾ / ʔ (word-initial glottal stop)', note: 'Glottal stop; in El (𐎛𐎍) it carries the initial vowel.' },
  '𐎜': { name: 'ʾu', value: 'ʾu / ʔu', note: 'Glottal stop with /u/ vowel.' },
  '𐎝': { name: 'šu', value: 'šu / ʃu', note: 'Final /šu/ sign.' },
};

const PHOENICIAN_LETTERS = {
  '𐤀': { name: 'ʾālep', value: 'ʾ / ʔ', note: 'Glottal stop; the first letter of the Canaanite alphabet.' },
  '𐤁': { name: 'bēt', value: 'b', note: 'Voiced bilabial stop /b/.' },
  '𐤂': { name: 'gīmel', value: 'g', note: 'Voiced velar stop /g/.' },
  '𐤃': { name: 'dālet', value: 'd', note: 'Voiced alveolar stop /d/.' },
  '𐤄': { name: 'hē', value: 'h', note: 'Voiceless glottal fricative /h/.' },
  '𐤅': { name: 'wāw', value: 'w / ū', note: 'Semivowel /w/; also marks long /ū/ in some positions.' },
  '𐤆': { name: 'zayin', value: 'z', note: 'Voiced alveolar sibilant /z/.' },
  '𐤇': { name: 'ḥēt', value: 'ḥ / ħ', note: 'Voiceless pharyngeal fricative.' },
  '𐤈': { name: 'ṭēt', value: 'ṭ', note: 'Emphatic alveolar stop.' },
  '𐤉': { name: 'yōd', value: 'y / ī', note: 'Palatal approximant /j/; also marks long /ī/.' },
  '𐤊': { name: 'kāp', value: 'k', note: 'Voiceless velar stop /k/.' },
  '𐤋': { name: 'lāmed', value: 'l', note: 'Alveolar lateral approximant /l/.' },
  '𐤌': { name: 'mēm', value: 'm', note: 'Bilabial nasal /m/.' },
  '𐤍': { name: 'nūn', value: 'n', note: 'Alveolar nasal /n/.' },
  '𐤎': { name: 'sāmek', value: 's', note: 'Voiceless alveolar sibilant /s/.' },
  '𐤏': { name: 'ʿayin', value: 'ʿ / ʕ', note: 'Voiced pharyngeal fricative.' },
  '𐤐': { name: 'pē', value: 'p', note: 'Voiceless bilabial stop /p/.' },
  '𐤑': { name: 'ṣādē', value: 'ṣ / sˤ', note: 'Emphatic alveolar sibilant.' },
  '𐤒': { name: 'qōp', value: 'q', note: 'Voiceless uvular stop /q/.' },
  '𐤓': { name: 'rēš', value: 'r', note: 'Alveolar trill /r/.' },
  '𐤔': { name: 'šīn', value: 'š / ʃ', note: 'Voiceless postalveolar fricative.' },
  '𐤕': { name: 'tāw', value: 't', note: 'Voiceless alveolar stop /t/.' },
};

const HEBREW_LETTERS = {
  'א': { name: 'alef', value: 'ʾ / ʔ', note: 'Glottal stop; carries vowel in initial position.' },
  'ב': { name: 'bet', value: 'b / v', note: 'Voiced bilabial stop /b/ (with dagesh) or fricative /v/.' },
  'ג': { name: 'gimel', value: 'g / ɣ', note: 'Voiced velar stop /g/ or fricative /ɣ/.' },
  'ד': { name: 'dalet', value: 'd / ð', note: 'Voiced alveolar stop /d/ or fricative /ð/.' },
  'ה': { name: 'he', value: 'h', note: 'Voiceless glottal fricative /h/; also a vowel letter.' },
  'ו': { name: 'vav', value: 'w / ū / ō', note: 'Semivowel /w/; vowel letter for /ū/ or /ō/.' },
  'ז': { name: 'zayin', value: 'z', note: 'Voiced alveolar sibilant /z/.' },
  'ח': { name: 'het', value: 'ḥ / ħ', note: 'Voiceless pharyngeal fricative.' },
  'ט': { name: 'tet', value: 'ṭ', note: 'Emphatic alveolar stop.' },
  'י': { name: 'yod', value: 'y / ī', note: 'Palatal approximant /j/; vowel letter for /ī/.' },
  'כ': { name: 'kaf', value: 'k / x', note: 'Voiceless velar stop /k/ or fricative /x/.' },
  'ל': { name: 'lamed', value: 'l', note: 'Alveolar lateral approximant /l/.' },
  'מ': { name: 'mem', value: 'm', note: 'Bilabial nasal /m/.' },
  'נ': { name: 'nun', value: 'n', note: 'Alveolar nasal /n/.' },
  'ס': { name: 'samekh', value: 's', note: 'Voiceless alveolar sibilant /s/.' },
  'ע': { name: 'ayin', value: 'ʿ / ʕ', note: 'Voiced pharyngeal fricative.' },
  'פ': { name: 'pe', value: 'p / f', note: 'Voiceless bilabial stop /p/ or fricative /f/.' },
  'צ': { name: 'tsadi', value: 'ṣ / ts', note: 'Emphatic alveolar affricate /tsˤ/.' },
  'ק': { name: 'qof', value: 'q', note: 'Voiceless uvular stop /q/.' },
  'ר': { name: 'resh', value: 'r', note: 'Uvular or alveolar trill /ʀ/ ~ /r/.' },
  'ש': { name: 'shin', value: 'š / ʃ', note: 'Voiceless postalveolar fricative; with dot the value is /ʃ/.' },
  'ת': { name: 'tav', value: 't / θ', note: 'Voiceless alveolar stop /t/ or fricative /θ/.' },
  'ׁ': { name: 'shin dot', value: 'š', note: 'Diacritic marking the /ʃ/ pronunciation of ש.' },
  'ְ': { name: 'sheva', value: 'ə / ∅', note: 'Reduced vowel or silent sheva.' },
  'ַ': { name: 'patah', value: 'a', note: 'Vowel sign /a/.' },
  'ָ': { name: 'qamats', value: 'ā / ɔ', note: 'Long /ā/ in Tiberian tradition, or /ɔ/ in Modern Hebrew.' },
  'ִ': { name: 'hiriq', value: 'i / ī', note: 'Vowel sign /i/ or long /ī/.' },
  'ֵ': { name: 'tsere', value: 'ē / e', note: 'Vowel sign /ē/ or /e/.' },
  'ֶ': { name: 'segol', value: 'e', note: 'Vowel sign /ɛ/.' },
  'ֹ': { name: 'holam', value: 'ō', note: 'Vowel sign /ō/.' },
  'ֻ': { name: 'qubuts', value: 'u / ū', note: 'Vowel sign /u/ or long /ū/.' },
  'ך': { name: 'kaf sofit', value: 'k / x', note: 'Final form of kaf; voiceless velar stop /k/ or fricative /x/.' },
  'ם': { name: 'mem sofit', value: 'm', note: 'Final form of mem; bilabial nasal /m/.' },
  'ן': { name: 'nun sofit', value: 'n', note: 'Final form of nun; alveolar nasal /n/.' },
  'ף': { name: 'pe sofit', value: 'p / f', note: 'Final form of pe; voiceless bilabial stop /p/ or fricative /f/.' },
  'ץ': { name: 'tsadi sofit', value: 'ṣ / ts', note: 'Final form of tsadi; emphatic alveolar affricate /tsˤ/.' },
};

const GREEK_IPA = {
  Aphrodítē: '/apʰroˈdiːtɛː/',
  Árēs: '/ˈaːrɛːs/',
  Asía: '/aˈsiːa/',
  Athénā: '/atʰɛːˈnaː/',
  Athēnai: '/atʰɛːˈnaɪ/',
  Dēmētēr: '/dɛːˈmɛːtɛːr/',
  Eurṓpē: '/eu̯ˈrɔːpɛː/',
  Gaîa: '/ˈɡaː.i.a/',
  Hēlios: '/hɛːˈli.os/',
  Hēphaistos: '/hɛːˈpʰaɪstos/',
  Hēra: '/hɛːˈra/',
  Hermês: '/herˈmɛːs/',
  Hestía: '/hɛsˈti.a/',
  Libyē: '/liˈbyːɛː/',
  Persephonē: '/perseˈpʰonɛː/',
  Poseidôn: '/po.sei̯ˈdɔːn/',
  Promētheus: '/proˈmɛːtʰeu̯s/',
  Selēnē: '/sɛːˈlɛːnɛː/',
  Spártē: '/ˈspar.tɛː/',
  Ártemis: '/ˈar.te.mis/',
  Átlas: '/ˈat.las/',
  Cháos: '/ˈkʰa.os/',
  Delphoí: '/delˈpʰoi/',
  Diónysos: '/di.ó.ny.sos/',
  Ólympos: '/ˈo.lym.pos/',
  Póntos: '/ˈpon.tos/',
  Kēr: '/kɛːr/',
  Médousa: '/ˈme.dou̯.sa/',
  Tártaros: '/ˈtar.ta.ros/',
  Apóllōn: '/aˈpol.lɔːn/',
  Hádēs: '/ˈhaː.dɛːs/',
  Hekátē: '/heˈkaː.tɛː/',
  Níkē: '/ˈniːkɛː/',
  Krónos: '/ˈkro.nos/',
  Typhōn: '/tyˈpʰɔːn/',
  Aithḗr: '/ai̯ˈtʰɛːr/',
  Érōs: '/ˈe.rɔːs/',
  Ōkeanós: '/ɔː.ke.aˈnós/',
  Érebos: '/ˈe.re.bos/',
  Hēméra: '/hɛːˈme.ra/',
  Hēraklēs: '/hɛːˈra.klɛːs/',
  Aígyptos: '/ai̯ˈɡyp.tos/',
};

const SANSKRIT_IPA = {
  Śiva: '/ˈɕi.ʋə/',
  Gaṇeśa: '/ɡəˈɳeːɕə/',
  Kālī: '/ˈkaː.liː/',
  Prajāpati: '/prəˈdʒaːpəti/',
  Ṛta: '/ˈr̩tə/',
  Viṣṇu: '/ˈʋɪʂɳʊ/',
  Varuṇa: '/ˈʋɐ.ru.ɳə/',
  Vāc: '/ˈʋaːtʃ/',
  Oṃ: '/ˈoːm/',
  Lakṣmī: '/ˈləkʂ.miː/',
  Nirmātā: '/nɪrˈmaː.taː/',
  Pārvatī: '/ˈpaːr.ʋə.tiː/',
  Rāma: '/ˈraː.mə/',
};

const CUNEIFORM_SIGNS = {
  '𒀭': { name: 'dingir (divine determinative)', value: 'divine', note: 'The divine determinative marks the name as theistic; it is not pronounced as part of the name.' },
  '𒀀': { name: 'A', value: 'a', note: 'Syllabic sign /a/; also used as logogram A “water”.' },
  '𒀁': { name: 'A₂', value: 'a₂', note: 'Syllabic variant /a/ or logogram for arm/side.' },
  '𒀂': { name: 'A₃', value: 'a₃', note: 'Syllabic variant /a/.' },
  '𒀃': { name: 'A₄', value: 'a₄', note: 'Syllabic variant /a/.' },
  '𒀅': { name: 'A₅', value: 'a₅', note: 'Syllabic variant /a/.' },
  '𒀸': { name: 'AŠ', value: 'aš', note: 'Syllabic /aš/ or logogram AŠ “one, unit”.' },
  '𒁯': { name: 'DAR', value: 'dar', note: 'Syllabic /dar/ or logogram for split/burst.' },
  '𒂍': { name: 'É', value: 'é / e₂', note: 'Logogram for house/temple; read /bīt/ in Akkadian or /e₂/ in Sumerian.' },
  '𒂗': { name: 'EN', value: 'en “lord, master"', note: 'Sumerogram EN, read /en/.' },
  '𒅎': { name: 'IM', value: 'im / adad', note: 'Logogram IM for wind/storm; read as the storm-god Adad/Iškur.' },
  '𒅁': { name: 'URTA', value: 'urta', note: 'Part of the Ninurta logogram NIN.URTA.' },
  '𒌍': { name: 'U', value: 'u “and" / 30', note: 'Logogram for the number 30, used for the moon-god Nanna/Sîn.' },
  '𒈹': { name: 'INANNA', value: 'inanna', note: 'Ligature logogram for the goddess Inanna/Ištar of Uruk.' },
  '𒋗': { name: 'ŠU', value: 'šu', note: 'Syllabic /šu/ or logogram for hand.' },
  '𒋾': { name: 'TI', value: 'ti', note: 'Syllabic /ti/ or logogram for life/rib.' },
  '𒌅': { name: 'TUD / UTU', value: 'utu “sun"', note: 'Logogram UTU for sun; in Marduk’s name read as AMAR.UTU “calf of the sun”.' },
  '𒌓': { name: 'UTU', value: 'utu / šamaš', note: 'Logogram for the sun-god Utu/Šamaš.' },
  '𒍪': { name: 'ZU / SU', value: 'zu', note: 'Syllabic /zu/ or /su/; in Apsû read /su/ or /zû/.' },
  '𒀊': { name: 'AB', value: 'ab / apsû', note: 'Logogram AB for sea/abyss; read Apsû.' },
  '𒀫': { name: 'AMAR', value: 'amar “calf, young"', note: 'Logogram AMAR in Marduk’s name AMAR.UTU.' },
  '𒀝': { name: 'AG / NABÛ', value: 'nabû', note: 'Logogram for the god Nabû, associated with wisdom and writing.' },
  '𒀹': { name: 'IŠ / EŠ', value: 'iš / eš', note: 'Syllabic /iš/; in Ištar’s name part of the logogram.' },
  '𒄊': { name: 'GIŠGAL / NERGAL', value: 'nergal', note: 'Logographic element of the underworld god Nergal.' },
  '𒀕': { name: 'ERIM?', value: 'gal / erim', note: 'Second element of the Nergal logogram.' },
  '𒊚': { name: 'AN.ŠAR₂ / ŠAR₂', value: 'šar “totality"', note: 'Logogram ŠAR used for “totality, universe” in Anšar.' },
  '𒊏': { name: 'RA', value: 'ra', note: 'Syllabic /ra/.' },
  '𒆠': { name: 'KI', value: 'ki “earth"', note: 'Logogram KI for earth/place; read /ki/.' },
  '𒊩': { name: 'SAL / MUNUS', value: 'sal / munus “woman"', note: 'Determinative for female or syllabic /sal/.' },
  '𒆳': { name: 'KUR', value: 'kur “mountain, land"', note: 'Logogram for mountain/foreign land; in Tiāmat part of the sea/chaos logogram.' },
  '𒌆': { name: 'LÁ', value: 'lá', note: 'Syllabic /la/ or logogram for wind/spirit.' },
  '𒆤': { name: 'LÍL', value: 'líl “wind, air, ghost"', note: 'Sumerogram LÍL, read /lil/; the long /ī/ is marked by convention.' },
  '𒉺': { name: 'ḪUR', value: 'ḫur', note: 'Syllabic /ḫur/; part of Ninḫursaĝ.' },
  '𒍇': { name: 'SAĜ', value: 'saĝ “head, mountain"', note: 'Logogram for head/mountain; part of Ninḫursaĝ.' },
  '𒊕': { name: 'ÉREŠ', value: 'éreš “lady"', note: 'Logogram for lady; part of Ereškigal.' },
  '𒃲': { name: 'GAL', value: 'gal “great"', note: 'Logogram for great; part of Ereškigal.' },
  '𒄑': { name: 'GISH / GIŠ', value: 'giš “tree, wood"', note: 'Determinative for wooden objects or syllabic /giš/.' },
  '𒂆': { name: 'BIL / GAM', value: 'bil / gam', note: 'Syllabic component of Gilgameš.' },
  '𒈦': { name: 'MAŠ', value: 'maš', note: 'Syllabic /maš/; final sign of Gilgameš.' },
  '𒄷': { name: 'ḪU', value: 'ḫu', note: 'Syllabic /ḫu/; initial sign of Ḫumbaba.' },
  '𒈣': { name: 'MA', value: 'ma', note: 'Syllabic /ma/.' },
  '𒁀': { name: 'BA', value: 'ba', note: 'Syllabic /ba/.' },
  '𒉡': { name: 'NU', value: 'nu', note: 'Syllabic /nu/; in Anû read /nu/.' },
  '𒋩': { name: 'ŠUR', value: 'šur', note: 'Syllabic /šur/; in Aššur read /šur/.' },
};

const YOUNGER_FUTHARK_RUNES = {
  'ᚠ': { name: 'fe', value: 'f', note: 'Rune *fehu “wealth, cattle”; sound /f/.' },
  'ᚢ': { name: 'ur', value: 'u / o / ø / w', note: 'Rune *uruz “aurochs”; used for several rounded vowels and /w/.' },
  'ᚦ': { name: 'thurs', value: 'þ / ð', note: 'Rune *þurisaz “giant”; voiceless or voiced dental fricative.' },
  'ᚬ': { name: 'oss', value: 'ą / ã', note: 'Rune *ansuz “god”; nasalised vowel in Younger Futhark.' },
  'ᚱ': { name: 'reid', value: 'r', note: 'Rune *raidō “ride, journey”; alveolar trill /r/.' },
  'ᚴ': { name: 'kaun', value: 'k / g', note: 'Rune *kaunan “ulcer”; velar stop /k/ or /g/.' },
  'ᚼ': { name: 'hagall', value: 'h', note: 'Rune *hagalaz “hail”; voiceless glottal fricative /h/.' },
  'ᚾ': { name: 'nauðr', value: 'n', note: 'Rune *naudiz “need”; alveolar nasal /n/.' },
  'ᛁ': { name: 'is', value: 'i / e', note: 'Rune *īsaz “ice”; high front vowel /i/ or /e/.' },
  'ᛅ': { name: 'ar', value: 'a / æ', note: 'Rune *ansuz variant; open vowel /a/ or /æ/.' },
  'ᛋ': { name: 'sol', value: 's', note: 'Rune *sōwilō “sun”; voiceless alveolar sibilant /s/.' },
  'ᛏ': { name: 'tyr', value: 't / d', note: 'Rune *tīwaz “Týr”; dental stop /t/ or /d/.' },
  'ᛒ': { name: 'bjarkan', value: 'b / p', note: 'Rune *berkanan “birch”; bilabial stop /b/ or /p/.' },
  'ᛘ': { name: 'maðr', value: 'm', note: 'Rune *mannaz “human”; bilabial nasal /m/.' },
  'ᛚ': { name: 'logr', value: 'l', note: 'Rune *laguz “water, lake”; alveolar lateral /l/.' },
  'ᛦ': { name: 'yr', value: 'ʀ / r', note: 'Rune for palatal/uvular /r/ sound.' },
};

const AVESTAN_LETTERS = {
  '𐬀': { name: 'a', value: 'a', note: 'Short open vowel /a/.' },
  '𐬁': { name: 'ā', value: 'ā', note: 'Long open vowel /aː/.' },
  '𐬂': { name: 'å', value: 'å', note: 'Open back rounded vowel /ɒ/.' },
  '𐬃': { name: 'ā̊', value: 'ā̊', note: 'Long open back rounded vowel /ɒː/.' },
  '𐬄': { name: 'ą', value: 'ą', note: 'Nasalised vowel /ã/.' },
  '𐬅': { name: 'ą̇', value: 'ą̇', note: 'Long nasalised vowel /ãː/.' },
  '𐬆': { name: 'ə', value: 'ə', note: 'Schwa vowel /ə/.' },
  '𐬇': { name: 'ə̄', value: 'ə̄', note: 'Long schwa vowel /əː/.' },
  '𐬈': { name: 'e', value: 'e', note: 'Short close-mid front vowel /e/.' },
  '𐬉': { name: 'ē', value: 'ē', note: 'Long close-mid front vowel /eː/.' },
  '𐬊': { name: 'o', value: 'o', note: 'Short close-mid back vowel /ɔ/.' },
  '𐬋': { name: 'ō', value: 'ō', note: 'Long close-mid back vowel /oː/.' },
  '𐬌': { name: 'i', value: 'i', note: 'Short high front vowel /ɪ/.' },
  '𐬍': { name: 'ī', value: 'ī', note: 'Long high front vowel /iː/.' },
  '𐬎': { name: 'u', value: 'u', note: 'Short high back vowel /ʊ/.' },
  '𐬏': { name: 'ū', value: 'ū', note: 'Long high back vowel /uː/.' },
  '𐬐': { name: 'k', value: 'k', note: 'Voiceless velar stop /k/.' },
  '𐬑': { name: 'x', value: 'x', note: 'Voiceless velar fricative /x/.' },
  '𐬒': { name: 'x́', value: 'x́', note: 'Palatalised voiceless velar fricative /xʲ/.' },
  '𐬓': { name: 'xᵛ', value: 'xᵛ', note: 'Labialised voiceless velar fricative /xʷ/.' },
  '𐬔': { name: 'g', value: 'g', note: 'Voiced velar stop /ɡ/.' },
  '𐬕': { name: 'ġ', value: 'ġ', note: 'Voiced palatalised velar stop /ɡʲ/.' },
  '𐬖': { name: 'γ', value: 'γ', note: 'Voiced velar fricative /ɣ/.' },
  '𐬗': { name: 'c', value: 'c', note: 'Voiceless postalveolar affricate /t͡ʃ/.' },
  '𐬘': { name: 'j', value: 'j', note: 'Voiced postalveolar affricate /d͡ʒ/.' },
  '𐬙': { name: 't', value: 't', note: 'Voiceless dental stop /t/.' },
  '𐬚': { name: 'ϑ', value: 'ϑ', note: 'Voiceless dental fricative /θ/.' },
  '𐬛': { name: 'd', value: 'd', note: 'Voiced dental stop /d/.' },
  '𐬜': { name: 'δ', value: 'δ', note: 'Voiced dental fricative /ð/.' },
  '𐬝': { name: 't̰', value: 't̰', note: 'Unreleased dental stop /t̚/.' },
  '𐬞': { name: 'p', value: 'p', note: 'Voiceless bilabial stop /p/.' },
  '𐬟': { name: 'f', value: 'f', note: 'Voiceless labiodental fricative /f/.' },
  '𐬠': { name: 'b', value: 'b', note: 'Voiced bilabial stop /b/.' },
  '𐬡': { name: 'β', value: 'β', note: 'Voiced bilabial fricative.' },
  '𐬢': { name: 'ŋ', value: 'ŋ', note: 'Velar nasal.' },
  '𐬣': { name: 'ŋ́', value: 'ŋ́', note: 'Palatalised velar nasal /ŋʲ/.' },
  '𐬤': { name: 'ŋᵛ', value: 'ŋᵛ', note: 'Labialised velar nasal /ŋʷ/.' },
  '𐬥': { name: 'n', value: 'n', note: 'Alveolar nasal /n/.' },
  '𐬦': { name: 'ń', value: 'ń', note: 'Palatal nasal /ɲ/.' },
  '𐬧': { name: 'ṇ', value: 'ṇ', note: 'Velar nasal allophone /ŋ/.' },
  '𐬨': { name: 'm', value: 'm', note: 'Bilabial nasal /m/.' },
  '𐬩': { name: 'm̨', value: 'm̨', note: 'Voiceless bilabial nasal /m̥/.' },
  '𐬪': { name: 'ẏ', value: 'ẏ', note: 'Palatal approximant /j/.' },
  '𐬫': { name: 'y', value: 'y', note: 'Palatal approximant /j/.' },
  '𐬬': { name: 'v', value: 'v', note: 'Labiodental approximant /w/.' },
  '𐬭': { name: 'r', value: 'r', note: 'Alveolar trill /r/.' },
  '𐬮': { name: 'l', value: 'l', note: 'Alveolar lateral /l/.' },
  '𐬯': { name: 's', value: 's', note: 'Voiceless alveolar sibilant /s/.' },
  '𐬰': { name: 'z', value: 'z', note: 'Voiced alveolar sibilant /z/.' },
  '𐬱': { name: 'š', value: 'š', note: 'Voiceless postalveolar fricative /ʃ/.' },
  '𐬲': { name: 'ž', value: 'ž', note: 'Voiced postalveolar fricative /ʒ/.' },
  '𐬳': { name: 'š́', value: 'š́', note: 'Voiceless alveolo-palatal fricative /ɕ/.' },
  '𐬴': { name: 'ṣ̌', value: 'ṣ̌', note: 'Voiceless retroflex fricative /ʂ/.' },
  '𐬵': { name: 'h', value: 'h', note: 'Voiceless glottal fricative /h/.' },
  ' ': { name: 'word separator', value: '—', note: 'Avestan word-space.' },
};

// ---------------------------------------------------------------------------
// Per-entry curated data
// ---------------------------------------------------------------------------

const CURATED_ETYMOLOGIES = {
  anu: 'Sumerian an “sky, heaven"; the name Anû is the Akkadianised form of the Sumerian sky-god, with the long vowel indicating a conventional Akkadian pronunciation.',
  ea: 'Sumerian EN.KI “lord of the earth", written with the house sign É (𒂍) and KI (𒆠); Akkadian Ēa represents the scholarly pronunciation of the god of fresh water and wisdom.',
  inanna: 'Sumerian nin-an-na “lady of heaven"; the goddess was worshipped at Uruk and later syncretised with Akkadian Ištar.',
  ishtar: 'Akkadian Ištar continues Sumerian Inanna; the name is associated with the planet Venus and with the twin domains of love and war.',
  tiamat: 'Akkadian tiāmtu “sea, ocean"; Tiāmat personifies the primordial salt-water abyss and is the antagonist of Marduk in the Enūma Eliš.',
  shamash: 'Akkadian Šamaš continues Sumerian Utu, the sun-god; the name is related to the West Semitic word for sun (*šamš-).',
  ashur: 'The name of the Assyrian national god is identical with the city Aššur and probably means “the leading one" or is derived from a mountain/sanctuary name; the god and city were mutually identified.',
  sin: 'Sumerian Nanna, the moon-god, was called Sîn in Akkadian; the name may be connected with the numeral 30, the days of the lunar month.',
  nabu: 'Akkadian Nabû is the god of writing and wisdom; his name derives from the Semitic root nbʾ “to call, announce", hence “the Announcer".',
  nergal: 'The etymology is uncertain; the logogram may represent a contraction or abbreviation of a longer divine title associated with Kutha, the underworld city.',
  ninlil: 'Sumerian NIN.LÍL “lady of the wind/air"; consort of Enlil and mother of Nanna/Sîn.',
  ninurta: 'Sumerian NIN.URTA, perhaps “lord of the earth" or “lord of barley"; a warrior and agricultural deity.',
  anshar: 'Akkadian Anšar comes from Sumerian AN.ŠAR “whole heaven"; primordial sky deity and father of Anu in the Enūma Eliš.',
  kishar: 'Akkadian Kišar comes from Sumerian KI.ŠAR “whole earth"; primordial earth goddess and counterpart of Anšar.',
  adad: 'Akkadian Adad (Sumerian Iškur) is the storm-god; the name probably belongs to a Semitic root for thunder/storm.',
  gilgamesh: 'The Sumerian royal name Gilgameš is of uncertain etymology; it has been explained as “old man who became young" or as a shortened theophoric name.',
  ninhursag: 'Sumerian NIN.ḪUR.SAĜ “lady of the mountain"; a great mother goddess also known as Nintur and Damkina.',
  humbaba: 'The name Ḫumbaba is of unknown origin and possibly foreign; it belongs to the monster guardian of the Cedar Forest in the Epic of Gilgamesh.',
  ereshkigal: 'Sumerian ÉREŠ.KI.GAL “lady of the great earth"; queen of the Mesopotamian underworld.',
  apsu: 'Sumerian abzu “fresh-water abyss, deep ocean"; Apsû is the primordial sweet-water ocean and dwelling of Enki/Ēa.',
  marduk: 'Akkadian Marduk is the chief god of Babylon; his Sumerian logogram AMAR.UTU means “calf of the sun", but the name Marduk itself is probably of foreign or archaic origin.',
  anat: 'Ugaritic ꜥnṯ, cognate with Hebrew ʿĂnāt; a warrior-goddess whose name is probably related to a Semitic root for vigour or strife.',
  asherah: 'Ugaritic ʾaṯrt, a common Semitic noun for “grove, sacred pole" and a divine title; the goddess is consort of Ēl and “lady of the sea".',
  baal: 'Ugaritic bʿl simply means “lord, master"; as a divine title it was applied to the storm-god Hadad and to local manifestations of deity.',
  el: 'Ugaritic ʾil is the common Semitic word for “god"; as a proper name Ēl is the high god and father of the gods.',
  aseratu: 'Phoenician ʾšrt, parallel to Ugaritic Athiratu; the name is connected with a root meaning “to stride, to tread" and with the sacred grove/pole.',
  mot: 'Ugaritic/Phoenician mwt “death"; Mōt is the personification of death and drought in the Baal Cycle.',
  yammu: 'Semitic ym “sea"; Yammu is the personification of the sea and rival of Baal.',
  shapash: 'Semitic špš “sun"; Šāpšu is the sun-goddess of the Ugaritic and Phoenician pantheons.',
  kothar: 'Ugaritic kṯr “skilled"; Kothar-wa-Khasis is the divine craftsman and smith.',
  dagan: 'Semitic dgn “grain"; Dāgan is a grain and fertility god worshipped across the Levant and Mesopotamia.',
  astartu: 'Phoenician ʿštrt, cognate with Mesopotamian Ištar; the name probably means “she of the womb" or is connected with the planet Venus.',
  astart: 'Phoenician ʿAštart is the Venus-goddess and queen of heaven; the name is related to Akkadian Ištar and South Arabian ʿAttar.',
  osiris: 'Egyptian Wsjr; the vocalisation is unknown. The name may be related to wsjr “mighty one" or to a compound with the throne determinative.',
  anubis: 'Egyptian jnpw; the original vocalisation is unknown. The name is traditionally connected with “he who is upon his sacred mountain" or with a word for “royal child".',
  horus: 'Egyptian Ḥr; the original vocalisation is unknown. The name probably means “the distant/far one", perhaps referring to the soaring falcon.',
  isis: 'Egyptian Ꜣst; the original vocalisation is unknown. The name may be connected with ꜣs.t “throne", reflecting her role as the throne of kingship.',
  thoth: 'Egyptian Ḏḥwty; the original vocalisation is unknown. The name is conventionally derived from ḏḥw “ibis" or from a term for the moon.',
  amun: 'Egyptian jmn; the original vocalisation is unknown. The name means “the hidden one", reflecting Amun’s character as an invisible, transcendent deity.',
  ptah: 'Egyptian ptḥ; the original vocalisation is unknown. The name is conventionally rendered Ptah and may mean “sculptor, opener" or be connected with the foundation ceremony.',
  sekhmet: 'Egyptian sḫmt; the original vocalisation is unknown. The name means “the powerful/mighty one", from sḫm “to be powerful".',
  bastet: 'Egyptian bꜣstt; the original vocalisation is unknown. The name is connected with the ointment jar (bꜣs) and the cat-goddess of Bubastis.',
  hathor: 'Egyptian Ḥwt-Ḥr “house of Horus"; the name identifies the goddess as the celestial dwelling of the falcon-god.',
  maat: 'Egyptian mꜣꜥt; the original vocalisation is unknown. The name denotes “truth, straightness, order", related to the verb mꜣꜥ “to be straight".',
  set: 'Egyptian stḫ; the original vocalisation is unknown. The etymology is debated; proposed meanings include “pillar", “dazzler", or a foreign loan.',
  nut: 'Egyptian nwt; the original vocalisation is unknown. The name is written with the water-pot determinative and denotes the sky.',
  geb: 'Egyptian gb; the original vocalisation is unknown. The name denotes the earth and is also written with the goose determinative.',
  shu: 'Egyptian šw; the original vocalisation is unknown. The name is related to šw “dry, emptiness" or to the verb “to rise up".',
  sobek: 'Egyptian sbk; the original vocalisation is unknown. The name is connected with the crocodile and means “he who causes to be fertile".',
  khonsu: 'Egyptian ḫnsw; the original vocalisation is unknown. The name means “traveller", probably alluding to the moon’s nightly journey.',
  khnum: 'Egyptian ḫnmw; the original vocalisation is unknown. The name means “he who joins together", referring to the potter-god who shapes bodies.',
  nephthys: 'Egyptian Nb.t-ḥwt “lady of the mansion"; the goddess is the counterpart and sister of Isis.',
  wepwawet: 'Egyptian Wp-wꜣwt “opener of the ways"; a jackal-god who opens the path for the king and the dead.',
  khepri: 'Egyptian ḫprj; the original vocalisation is unknown. The name means “the becoming one", related to ḫpr “to become, transform".',
  nun: 'Egyptian nnw; the original vocalisation is unknown. The name denotes the primordial inert waters.',
  tefnut: 'Egyptian Tfnt; the original vocalisation is unknown. The name is probably connected with tf “to spit", hence “that spittle".',
  montu: 'Egyptian Mntw; the original vocalisation is unknown. The name is connected with the Theban war-god and perhaps with a word for “nomad".',
  anuket: 'Egyptian Ꜥnqt; the original vocalisation is unknown. The name means “embrace", referring to the cataract-goddess.',
  serket: 'Egyptian Srqt; the original vocalisation is unknown. The name means “she who causes the throat to breathe", a scorpion-goddess of healing.',
  neith: 'Egyptian Nt; the original vocalisation is unknown. The name is connected with water and with weaving; it may mean “the terrifying one".',
  apep: 'Egyptian Ꜥpp; the original vocalisation is unknown. The name is connected with the verb “to slither" or “to be spat out".',
  taweret: 'Egyptian Tꜣ-wrt “the great one"; a protective hippopotamus-goddess of childbirth.',
  hapy: 'Egyptian Ḥꜥpy; the original vocalisation is unknown. The name denotes the inundation and the Nile-god.',
  seshat: 'Egyptian Ssḥt; the original vocalisation is unknown. The name means “she who scrivens", the goddess of writing and measurement.',
  mafdet: 'Egyptian Mꜣfdt; the original vocalisation is unknown. The name is associated with a swift feline deity of justice.',
  menhit: 'Egyptian Mnḥyt; the original vocalisation is unknown. The name means “the slaughterer", a lioness-goddess.',
  pakhet: 'Egyptian Pꜣḫt; the original vocalisation is unknown. The name means “she who scratches/tears", a feline huntress-goddess.',
  sokar: 'Egyptian Skr; the original vocalisation is unknown. The name belongs to a falcon-god of the Memphis necropolis.',
  renenutet: 'Egyptian Rnnwtt; the original vocalisation is unknown. The name means “the nursing snake", a harvest-goddess.',
  mehetweret: 'Egyptian Mḥt-wrt “the great flood"; a celestial cow-goddess associated with the primeval waters.',
  heqet: 'Egyptian Ḥqt; the original vocalisation is unknown. The frog-goddess of childbirth and fertility.',
  wadjet: 'Egyptian Wꜣḏyt “the green one"; the cobra-goddess of Lower Egypt and protectress of the king.',
  nekhbet: 'Egyptian Nḫbt “she of Nekheb"; the vulture-goddess of Upper Egypt.',
  ma: 'Egyptian mꜣ “truth, rightness"; the root of Maat, the principle of cosmic order.',
  maa: 'Egyptian mꜥ “to see, perceive"; a core verb root denoting perception and understanding.',
  akh: 'Egyptian Ꜣḫ “transfigured spirit, effective one"; one of the highest forms of the soul in Egyptian anthropology.',
  ab: 'Egyptian Ꜣb “heart"; the seat of conscience, emotion, and moral judgement, weighed against the feather of Maat.',
  sa: 'Egyptian sꜥ “son"; a common kinship term used in divine titles such as “son of Ra".',
  hm: 'Egyptian ḥm “majesty, servant, priest"; used in royal titulary and for temple attendants.',
  khp: 'Egyptian ḫp “form, manifestation"; a term for shape and divine appearance, important in magical texts.',
  ba: 'Egyptian bꜣ “soul, manifestation"; the mobile aspect of the personality, often depicted as a human-headed bird.',
  ka: 'Egyptian kꜣ “vital essence, life-force"; the double created at birth and sustained by offerings.',
  min: 'Egyptian Mnw; the original vocalisation is unknown. The god of fertility and the eastern desert, “the firm one".',
  bes: 'Egyptian Bs; the original vocalisation is unknown. The dwarf-lion deity who protects mothers and children.',
  heka: 'Egyptian Ḥkꜣ “magic"; the personification of magic and creative speech, “the first work".',
  duat: 'Egyptian Dwꜣt; the original vocalisation is unknown. The netherworld through which the sun travels by night.',
  ankh: 'Egyptian ꜥnḫ “life"; the hieroglyphic sign and word for life, breath, and prosperity.',
  nht: 'Egyptian nḫt “strong, mighty, victorious"; an adjective of power common in royal and divine epithets.',
  sia: 'Egyptian sꜥ “perception, intellect"; the personification of divine understanding and omniscience.',
  cain: 'Hebrew Qayin; the name is traditionally connected with qānîti “I have gotten" (Genesis 4:1) or with a root for “smith, metalworker".',
  abel: 'Hebrew Hevel; the name means “breath, vapour", reflecting the brevity of life.',
  solomon: 'Hebrew Šəlōmōh; the name is associated with šālōm “peace, wholeness"; the builder of the First Temple.',
  moses: 'Hebrew Mōšeh; the etymology is uncertain; the biblical explanation links it with māšâ “to draw out" (from the water).',
  noah: 'Hebrew Nōaḥ; the name is connected with nāḥam “to comfort" or, in the older sense, with “rest".',
  leviathan: 'Hebrew Liwyāṯān; the name is cognate with Ugaritic Litan and means “coiled, twisted one", a cosmic sea-serpent.',
  asa: 'Avestan aša; from the Old Iranian root *ṛta- “truth, order"; the central Zoroastrian principle of cosmic and ritual righteousness.',
  ahuramazda: 'Avestan Ahura Mazdā; ahura “lord" is related to Sanskrit asura, and mazdā “wise" to Sanskrit medhā; the supreme creator and wise lord of Zoroastrianism.',
  aphrodite: 'Greek Ἀφροδίτη; traditionally derived from ἀφρός “sea-foam" (Hesiod, Theogony 195), hence “born of sea-foam".',
  ares: 'Greek Ἄρης; possibly connected with ἀρά “bane, curse" or with an earlier pre-Greek stratum; the god of war.',
  asia: 'Greek Ἀσία; perhaps from Hittite Assuwa or a pre-Greek Anatolian name for the eastern continent.',
  athena: 'Greek Ἀθήνα; the etymology is unknown and possibly pre-Greek. A traditional folk-etymology connects it with Ἀθήνη “mind, craft".',
  athenai: 'Greek Ἀθῆναι; the plural toponym of Athens, named after the goddess Athena.',
  demeter: 'Greek Δημήτηρ; usually analysed as Δᾶ (Ge) “earth" + μήτηρ “mother", hence “Earth-Mother".',
  europe: 'Greek Εὐρώπη; from εὐρύς “wide" + ὤψ “face, eye", hence “broad-faced".',
  gaia: 'Greek Γαῖα; from γῆ “earth"; the primordial mother Earth.',
  helios: 'Greek Ἥλιος; from ἕλος “sun, warmth"; the personification of the sun.',
  hephaistos: 'Greek Ἥφαιστος; of unknown, probably pre-Greek origin; the smith-god.',
  hera: 'Greek Ἥρα; possibly related to ἥρως “hero, lord" or to a pre-Greek substrate; queen of the gods.',
  hermes: 'Greek Ἑρμῆς; probably from ἕρμα “heap of stones, boundary-marker"; the messenger-god.',
  hestia: 'Greek Ἑστία; from ἑστία “hearth, fireplace"; the goddess of the hearth.',
  libye: 'Greek Λιβύη; the name of the African region west of Egypt; etymology uncertain, perhaps from a Berber or Egyptian source.',
  persephone: 'Greek Περσεφόνη; etymology debated; possibly pre-Greek, with folk-etymologies connecting it with φόνος “murder" or φέρειν “to bring".',
  poseidon: 'Greek Ποσειδῶν; usually analysed as πόσις “lord, husband" + δᾶ “earth" (Doric for γῆ), hence “lord of the earth".',
  prometheus: 'Greek Προμηθεύς; from πρό “before" + μῆτις “counsel, cunning", hence “forethinker".',
  selene: 'Greek Σελήνη; from σέλας “light, brightness"; the moon-goddess.',
  sparte: 'Greek Σπάρτη; from σπείρω “to sow"; the city was said to be sown by the descendants of the Dorians.',
  artemis: 'Greek Ἄρτεμις; possibly related to ἀρτεμής “safe, unharmed" or to a pre-Greek Anatolian goddess.',
  atlas: 'Greek Ἄτλας; from τλάω “to endure, suffer"; the Titan who holds up the heavens.',
  chaos: 'Greek Χάος; from χαίνω “to yawn, gape"; the primordial gap or yawning void.',
  delphoi: 'Greek Δελφοί; from δελφύς “womb"; the sanctuary of Apollo at Delphi.',
  dionysos: 'Greek Διόνυσος; traditionally “god of Nysa", a mountain of ecstasy; the name is probably pre-Greek.',
  olympos: 'Greek Ὄλυμπος; of uncertain etymology, perhaps “bright, shining mountain"; the abode of the gods.',
  pontos: 'Greek Πόντος; from πόντος “sea"; the personification of the sea.',
  ker: 'Greek Κήρ; from κήρ “doom, violent death"; a spirit of destruction.',
  medousa: 'Greek Μέδουσα; from μέδω “to guard, rule"; the Gorgon whose gaze turns mortals to stone.',
  tartaros: 'Greek Τάρταρος; the deep abyss beneath Hades; etymology uncertain, perhaps connected with ταρταρίζειν “to shiver".',
  apollon: 'Greek Ἀπόλλων; etymology debated; folk-etymologies connect it with ἀπόλλυμι “to destroy" or ἀπολούω “to wash"; probably pre-Greek.',
  hades: 'Greek Ἅιδης; from ἀ- “un-" + εἶδον “to see", hence “the unseen one".',
  hekate: 'Greek Ἑκάτη; from ἑκάς “far", hence “she who works from afar"; a goddess of magic and crossroads.',
  nike: 'Greek Νίκη; from νίκη “victory"; the personification of victory.',
  kronos: 'Greek Κρόνος; perhaps related to χρόνος “time" by later folk-etymology, but probably pre-Greek.',
  typhon: 'Greek Τυφῶν; from τύφω “to smoke"; a monstrous storm-giant.',
  aither: 'Greek Αἰθήρ; from αἴθω “to burn, blaze"; the bright upper air.',
  eros: 'Greek Ἔρως; from ἔραμαι “to love, desire"; the personification of love.',
  okeanos: 'Greek Ὠκεανός; the great river encircling the world; probably from a pre-Greek substrate.',
  erebus: 'Greek Ἔρεβος; from a Proto-Indo-European root for darkness; the personification of darkness.',
  hemera: 'Greek Ἡμέρα; from ἡμέρα “day"; the personification of day.',
  herakles: 'Greek Ἡρακλῆς; from Ἥρα + κλέος “glory", hence “glory of Hera".',
  aigyptos: 'Greek Αἴγυπτος; from Egyptian Ḥwt-kꜣ-ptḥ “House of the Ka of Ptah", Hellenised through Egyptian and Semitic intermediaries.',
  alfheimr: 'Old Norse Álfheimr; from álfr “elf" + heimr “home"; the luminous world of the elves.',
  helheimr: 'Old Norse Helheimr; from Hel, goddess of the dead, + heimr “home"; the realm of the dead.',
  jotunheimr: 'Old Norse Jötunheimr; from jötunn “giant" + heimr “home"; the wilderness home of the giants.',
  midgardr: 'Old Norse Miðgarðr; from miðr “middle" + garðr “enclosure, yard"; the world of humans.',
  muspellheimr: 'Old Norse Muspellheimr; from Muspell, the fire-giant or fire-realm, + heimr “home"; the world of fire.',
  odinn: 'Old Norse Óðinn; from óðr “fury, inspiration, poetry" + the suffix -inn; the Allfather and god of wisdom and war.',
  ragnarok: 'Old Norse Ragnarǫk; from regin “gods, powers" + rǫk “fate, judgement, twilight"; the doom of the gods.',
  tyr: 'Old Norse Týr; from Proto-Germanic *Tīwaz, cognate with Greek Zeus and Latin Juppiter; the one-handed god of law and war.',
  valholl: 'Old Norse Valhǫll; from valr “slain warriors" + hǫll “hall"; Odin’s hall in Asgard.',
  njordr: 'Old Norse Njǫrðr; from Proto-Germanic *Nerþuz; a Vanir god of the sea, wind, and wealth.',
  kobe: 'Japanese 神戸 Kōbe; from 神 kami “god, divine" + 戸 to “door", interpreted as “door to the gods" or “support door".',
  kyoto: 'Japanese 京都 Kyōto; from 京 kyō “capital" + 都 to “metropolis"; the former imperial capital of Japan.',
  osaka: 'Japanese 大阪 Ōsaka; from 大 ō “great" + 阪 saka “slope, hill"; the mercantile hub of western Japan.',
  taichi: 'Chinese 太極 Tàijí; from 太 tài “great, supreme" + 極 jí “limit, extreme"; the cosmological origin of yin and yang.',
  yinyang: 'Chinese 陰陽 Yīnyáng; from 陰 yīn “shady, dark" + 陽 yáng “bright, sunny"; the interdependence of complementary cosmic forces.',
  wuji: 'Chinese 無極 Wújí; from 無 wú “without" + 極 jí “limit"; the primordial state of undifferentiated emptiness before Taiji.',
  bagua: 'Chinese 八卦 Bāguà; from 八 bā “eight" + 卦 guà “trigram"; the eight trigrams of the Yijing.',
  wuxing: 'Chinese 五行 Wǔxíng; from 五 wǔ “five" + 行 xíng “phase, movement"; the five phases of qi transformation.',
  ganesha: 'Sanskrit Gaṇeśa; from gaṇa “troop, host" + īśa “lord", hence “Lord of the Gaṇas".',
  kali: 'Sanskrit Kālī; from kāla “time, black"; the black goddess of time, destruction, and transformation.',
  prajapati: 'Sanskrit Prajāpati; from prajā “creature, offspring" + pati “lord"; the Vedic lord of creatures.',
  rta: 'Sanskrit Ṛta; from the root ṛ- “to rise, arrange"; the Vedic principle of cosmic order and truth.',
  vishnu: 'Sanskrit Viṣṇu; from the root viṣ- “to pervade"; the all-pervading preserver deity.',
  varuna: 'Sanskrit Varuṇa; from the root vṛ- “to cover, encompass"; the Vedic guardian of cosmic order and the waters.',
  vac: 'Sanskrit Vāc; from the root vac- “to speak"; the personification of sacred speech.',
  om: 'Sanskrit Oṃ; the sacred syllable of Hinduism, Buddhism, and Jainism; etymology is theological rather than linguistic.',
  lakshmi: 'Sanskrit Lakṣmī; from lakṣma “mark, sign"; the goddess of fortune, beauty, and prosperity.',
  nirmata: 'Sanskrit Nirmātā; from nir- “forth" + mā- “to measure, make"; the maker or creator.',
  parvati: 'Sanskrit Pārvatī; from parvata “mountain"; the daughter of the mountain and consort of Śiva.',
  rama: 'Sanskrit Rāma; from the root ram- “to delight, to be pleasing"; the hero of the Rāmāyaṇa and an avatar of Viṣṇu.',
};

const CURATED_READINGS = {
  anu: { normalizedReading: '/aːˈnuː/', phoneticReconstruction: '/ˈaː.nuː/' },
  ea: { normalizedReading: '/ˈeː.a/', phoneticReconstruction: '/ˈeː.a/' },
  inanna: { normalizedReading: '/iˈnan.na/', phoneticReconstruction: '/iˈnan.na/' },
  ishtar: { normalizedReading: '/ˈiʃ.taːr/', phoneticReconstruction: '/ˈiʃ.taːr/' },
  marduk: { normalizedReading: '/ˈmar.duk/', phoneticReconstruction: '/ˈmar.duːk/' },
  nabu: { normalizedReading: '/ˈnaː.buː/', phoneticReconstruction: '/ˈnaː.buː/' },
  nergal: { normalizedReading: '/ˈner.ɡal/', phoneticReconstruction: '/ˈner.ɡaːl/' },
  tiamat: { normalizedReading: '/tiˈaː.mat/', phoneticReconstruction: '/tiˈaː.mat/' },
  shamash: { normalizedReading: '/ˈʃaː.maʃ/', phoneticReconstruction: '/ˈʃaː.maʃ/' },
  sin: { normalizedReading: '/ˈsiːn/', phoneticReconstruction: '/ˈsiːn/' },
  ashur: { normalizedReading: '/ˈaʃ.ʃur/', phoneticReconstruction: '/ˈaʃ.ʃuːr/' },
  ninlil: { normalizedReading: '/ˈnin.lil/', phoneticReconstruction: '/ˈnin.liːl/' },
  ninurta: { normalizedReading: '/ˈnin.ur.ta/', phoneticReconstruction: '/ˈnin.ur.ta/' },
  anshar: { normalizedReading: '/ˈan.ʃar/', phoneticReconstruction: '/ˈan.ʃaːr/' },
  kishar: { normalizedReading: '/ˈki.ʃar/', phoneticReconstruction: '/ˈki.ʃaːr/' },
  adad: { normalizedReading: '/ˈa.dad/', phoneticReconstruction: '/ˈa.daːd/' },
  gilgamesh: { normalizedReading: '/ˈɡil.ɡa.meʃ/', phoneticReconstruction: '/ˈɡil.ɡaː.meʃ/' },
  ninhursag: { normalizedReading: '/nin.ˈxur.saŋ/', phoneticReconstruction: '/nin.ˈxur.saŋ/' },
  humbaba: { normalizedReading: '/xum.ˈba.ba/', phoneticReconstruction: '/xum.ˈbaː.baː/' },
  ereshkigal: { normalizedReading: '/ˌe.reʃ.ˈki.ɡal/', phoneticReconstruction: '/ˌe.reʃ.ˈkiː.ɡaːl/' },
  apsu: { normalizedReading: '/ˈap.suː/', phoneticReconstruction: '/ˈap.suː/' },
  anat: { normalizedReading: '/ʕaˈnaːt/', phoneticReconstruction: '/ʕaˈnaːt/' },
  asherah: { normalizedReading: '/ʔaʃeˈraː/', phoneticReconstruction: '/ʔa.ʃeˈraː/' },
  baal: { normalizedReading: '/ˈbaʕlu/', phoneticReconstruction: '/ˈbaʕ.lu/' },
  el: { normalizedReading: '/ˈʔiːl/', phoneticReconstruction: '/ˈʔiːl/' },
  aseratu: { normalizedReading: '/ʔaʃeˈraː.tu/', phoneticReconstruction: '/ʔa.ʃeˈraː.tu/' },
  mot: { normalizedReading: '/ˈmoːt/', phoneticReconstruction: '/ˈmoːt/' },
  yammu: { normalizedReading: '/ˈjam.mu/', phoneticReconstruction: '/ˈjam.mu/' },
  shapash: { normalizedReading: '/ˈʃaːp.ʃu/', phoneticReconstruction: '/ˈʃaːp.ʃu/' },
  kothar: { normalizedReading: '/koˈθaːr/', phoneticReconstruction: '/koˈθaːr/' },
  dagan: { normalizedReading: '/ˈdaː.ɡan/', phoneticReconstruction: '/ˈdaː.ɡaːn/' },
  astartu: { normalizedReading: '/ʔaʃˈtar.tu/', phoneticReconstruction: '/ʔaʃˈtar.tu/' },
  astart: { normalizedReading: '/ʔaʃˈtart/', phoneticReconstruction: '/ʔaʃˈtart/' },
  osiris: { normalizedReading: 'Original vocalisation unknown; Egyptological /uː.ˈsiː.rɪs/ or /oː.ˈsiː.rɪs/.', phoneticReconstruction: 'Egyptian wsjr; vowels supplied by convention.' },
  anubis: { normalizedReading: 'Original vocalisation unknown; Egyptological /aː.ˈnuː.bɪs/.', phoneticReconstruction: 'Egyptian jnpw; vowels supplied by convention.' },
  horus: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈhaː.rʊs/.', phoneticReconstruction: 'Egyptian ḥr; vowels supplied by convention.' },
  isis: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈiː.sɪs/.', phoneticReconstruction: 'Egyptian Ꜣst; vowels supplied by convention.' },
  thoth: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈθoːθ/ or /ˈtʰoːt/.', phoneticReconstruction: 'Egyptian ḏḥwty; vowels supplied by convention.' },
  amun: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈaː.mʊn/.', phoneticReconstruction: 'Egyptian jmn; vowels supplied by convention.' },
  ptah: { normalizedReading: 'Original vocalisation unknown; Egyptological /pəˈtɑː/.', phoneticReconstruction: 'Egyptian ptḥ; vowels supplied by convention.' },
  sekhmet: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈsɛx.mɛt/.', phoneticReconstruction: 'Egyptian sḫmt; vowels supplied by convention.' },
  bastet: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈbæstɛt/.', phoneticReconstruction: 'Egyptian bꜣstt; vowels supplied by convention.' },
  hathor: { normalizedReading: 'Original vocalisation unknown; Egyptological /hæˈθɔːr/.', phoneticReconstruction: 'Egyptian ḥwt-ḥr; vowels supplied by convention.' },
  maat: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈmɑː.ʕɑːt/.', phoneticReconstruction: 'Egyptian mꜣꜥt; vowels supplied by convention.' },
  set: { normalizedReading: 'Original vocalisation unknown; Egyptological /sɛt/ or /suːt/.', phoneticReconstruction: 'Egyptian stḫ; vowels supplied by convention.' },
  nut: { normalizedReading: 'Original vocalisation unknown; Egyptological /nuːt/.', phoneticReconstruction: 'Egyptian nwt; vowels supplied by convention.' },
  geb: { normalizedReading: 'Original vocalisation unknown; Egyptological /ɡɛb/.', phoneticReconstruction: 'Egyptian gb; vowels supplied by convention.' },
  shu: { normalizedReading: 'Original vocalisation unknown; Egyptological /ʃuː/.', phoneticReconstruction: 'Egyptian šw; vowels supplied by convention.' },
  sobek: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈsoʊ.bɛk/.', phoneticReconstruction: 'Egyptian sbk; vowels supplied by convention.' },
  khonsu: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈxɒn.suː/.', phoneticReconstruction: 'Egyptian ḫnsw; vowels supplied by convention.' },
  khnum: { normalizedReading: 'Original vocalisation unknown; Egyptological /xəˈnuːm/.', phoneticReconstruction: 'Egyptian ḫnmw; vowels supplied by convention.' },
  nephthys: { normalizedReading: 'Original vocalisation unknown; Egyptological /nɛfˈθɪs/.', phoneticReconstruction: 'Egyptian nb.t-ḥwt; vowels supplied by convention.' },
  wepwawet: { normalizedReading: 'Original vocalisation unknown; Egyptological /wɛp.ˈwɑː.wɛt/.', phoneticReconstruction: 'Egyptian wp-wꜣwt; vowels supplied by convention.' },
  khepri: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈxɛp.riː/.', phoneticReconstruction: 'Egyptian ḫprj; vowels supplied by convention.' },
  nun: { normalizedReading: 'Original vocalisation unknown; Egyptological /nuːn/.', phoneticReconstruction: 'Egyptian nnw; vowels supplied by convention.' },
  tefnut: { normalizedReading: 'Original vocalisation unknown; Egyptological /tɛfˈnuːt/.', phoneticReconstruction: 'Egyptian tfnt; vowels supplied by convention.' },
  montu: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈmɒn.tuː/.', phoneticReconstruction: 'Egyptian mntw; vowels supplied by convention.' },
  anuket: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈæ.nʊ.kɛt/.', phoneticReconstruction: 'Egyptian Ꜥnqt; vowels supplied by convention.' },
  serket: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈsɜːr.kɛt/.', phoneticReconstruction: 'Egyptian srqt; vowels supplied by convention.' },
  neith: { normalizedReading: 'Original vocalisation unknown; Egyptological /niːθ/.', phoneticReconstruction: 'Egyptian nt; vowels supplied by convention.' },
  apep: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈɑː.pɛp/.', phoneticReconstruction: 'Egyptian Ꜥpp; vowels supplied by convention.' },
  taweret: { normalizedReading: 'Original vocalisation unknown; Egyptological /təˈwɛr.ət/.', phoneticReconstruction: 'Egyptian tꜣ-wrt; vowels supplied by convention.' },
  hapy: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈhɑː.piː/.', phoneticReconstruction: 'Egyptian ḥꜥpy; vowels supplied by convention.' },
  seshat: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈsɛʃ.ɑːt/.', phoneticReconstruction: 'Egyptian ssḥt; vowels supplied by convention.' },
  mafdet: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈmæf.dɛt/.', phoneticReconstruction: 'Egyptian mꜣfdt; vowels supplied by convention.' },
  menhit: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈmɛn.hɪt/.', phoneticReconstruction: 'Egyptian mnḥyt; vowels supplied by convention.' },
  pakhet: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈpɑː.xɛt/.', phoneticReconstruction: 'Egyptian pꜣḫt; vowels supplied by convention.' },
  sokar: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈsoʊ.kɑːr/.', phoneticReconstruction: 'Egyptian skr; vowels supplied by convention.' },
  renenutet: { normalizedReading: 'Original vocalisation unknown; Egyptological /rɛ.nɛˈnuː.tɛt/.', phoneticReconstruction: 'Egyptian rnnwtt; vowels supplied by convention.' },
  mehetweret: { normalizedReading: 'Original vocalisation unknown; Egyptological /mɛ.hɛtˈwɛr.ət/.', phoneticReconstruction: 'Egyptian mḥt-wrt; vowels supplied by convention.' },
  heqet: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈhɛ.kɛt/.', phoneticReconstruction: 'Egyptian ḥqt; vowels supplied by convention.' },
  wadjet: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈwɑː.dʒɛt/.', phoneticReconstruction: 'Egyptian wꜣḏyt; vowels supplied by convention.' },
  nekhbet: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈnɛx.bɛt/.', phoneticReconstruction: 'Egyptian nḫbt; vowels supplied by convention.' },
  ma: { normalizedReading: 'Original vocalisation unknown; Egyptological /maːʕ/.', phoneticReconstruction: 'Egyptian mꜣ; vowels supplied by convention.' },
  maa: { normalizedReading: 'Original vocalisation unknown; Egyptological /maːʕ/.', phoneticReconstruction: 'Egyptian mꜥ; vowels supplied by convention.' },
  akh: { normalizedReading: 'Original vocalisation unknown; Egyptological /ɑːx/.', phoneticReconstruction: 'Egyptian Ꜣḫ; vowels supplied by convention.' },
  ab: { normalizedReading: 'Original vocalisation unknown; Egyptological /ʔaːb/.', phoneticReconstruction: 'Egyptian Ꜣb; vowels supplied by convention.' },
  sa: { normalizedReading: 'Original vocalisation unknown; Egyptological /saʕ/.', phoneticReconstruction: 'Egyptian sꜥ; vowels supplied by convention.' },
  hm: { normalizedReading: 'Original vocalisation unknown; Egyptological /ħɛm/.', phoneticReconstruction: 'Egyptian ḥm; vowels supplied by convention.' },
  khp: { normalizedReading: 'Original vocalisation unknown; Egyptological /xəp/.', phoneticReconstruction: 'Egyptian ḫp; vowels supplied by convention.' },
  ba: { normalizedReading: 'Original vocalisation unknown; Egyptological /baːʕ/.', phoneticReconstruction: 'Egyptian bꜣ; vowels supplied by convention.' },
  ka: { normalizedReading: 'Original vocalisation unknown; Egyptological /kaːʕ/.', phoneticReconstruction: 'Egyptian kꜣ; vowels supplied by convention.' },
  min: { normalizedReading: 'Original vocalisation unknown; Egyptological /miːn/.', phoneticReconstruction: 'Egyptian mnw; vowels supplied by convention.' },
  bes: { normalizedReading: 'Original vocalisation unknown; Egyptological /bɛs/.', phoneticReconstruction: 'Egyptian bs; vowels supplied by convention.' },
  heka: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈhiː.kaʕ/.', phoneticReconstruction: 'Egyptian ḥkꜣ; vowels supplied by convention.' },
  duat: { normalizedReading: 'Original vocalisation unknown; Egyptological /duːˈɑːt/.', phoneticReconstruction: 'Egyptian dwꜣt; vowels supplied by convention.' },
  ankh: { normalizedReading: 'Original vocalisation unknown; Egyptological /ˈɑːn.x/.', phoneticReconstruction: 'Egyptian ꜥnḫ; vowels supplied by convention.' },
  nht: { normalizedReading: 'Original vocalisation unknown; Egyptological /nəxt/.', phoneticReconstruction: 'Egyptian nḫt; vowels supplied by convention.' },
  sia: { normalizedReading: 'Original vocalisation unknown; Egyptological /siːˈʕa/.', phoneticReconstruction: 'Egyptian sꜥ; vowels supplied by convention.' },
  cain: { normalizedReading: '/kaˈjiːn/ (Tiberian)', phoneticReconstruction: '/qɔːˈjiːn/' },
  abel: { normalizedReading: '/ˈhɛ.vɛl/ (Tiberian)', phoneticReconstruction: '/ˈhaː.βɛl/' },
  solomon: { normalizedReading: '/ʃə.loˈmoː/ (Tiberian)', phoneticReconstruction: '/ʃɔː.loːˈmoː/' },
  moses: { normalizedReading: '/moːˈʃɛ/ (Tiberian)', phoneticReconstruction: '/moːˈʃɛh/' },
  noah: { normalizedReading: '/ˈnoː.ɑːx/ (Tiberian)', phoneticReconstruction: '/ˈnoː.ɑːħ/' },
  leviathan: { normalizedReading: '/li.vjaˈtɔn/ (Tiberian)', phoneticReconstruction: '/liw.jaːˈθɔːn/' },
  asa: { normalizedReading: '/ˈa.ʃa/', phoneticReconstruction: '/ˈa.ʃa/' },
  ahuramazda: { normalizedReading: '/aˈhuː.ra mazˈdaː/', phoneticReconstruction: '/aˈhuː.ra mazˈdaː/' },
  alfheimr: { normalizedReading: '/ˈaːlf.hɛi̯mr/', phoneticReconstruction: '/ˈaːlf.hɛi̯mr/' },
  helheimr: { normalizedReading: '/ˈhɛl.hɛi̯mr/', phoneticReconstruction: '/ˈhɛl.hɛi̯mr/' },
  jotunheimr: { normalizedReading: '/ˈjœ.tyn.hɛi̯mr/', phoneticReconstruction: '/ˈjœ.tyn.hɛi̯mr/' },
  midgardr: { normalizedReading: '/ˈmið.ɡarðr/', phoneticReconstruction: '/ˈmið.ɡarðr/' },
  muspellheimr: { normalizedReading: '/ˈmus.pɛl.hɛi̯mr/', phoneticReconstruction: '/ˈmus.pɛl.hɛi̯mr/' },
  odinn: { normalizedReading: '/ˈoːðinː/', phoneticReconstruction: '/ˈoːðinː/' },
  ragnarok: { normalizedReading: '/ˈraɣ.na.rɔk/', phoneticReconstruction: '/ˈraɣ.na.rɔk/' },
  tyr: { normalizedReading: '/ˈtyːr/', phoneticReconstruction: '/ˈtyːr/' },
  valholl: { normalizedReading: '/ˈwal.hɔlː/', phoneticReconstruction: '/ˈwal.hɔlː/' },
  njordr: { normalizedReading: '/ˈnjɔrðr/', phoneticReconstruction: '/ˈnjɔrðr/' },
  taichi: { normalizedReading: '/tʰaɪ̯˥˩ tɕi˧˥/', phoneticReconstruction: '/tʰaɪ̯˥˩ tɕi˧˥/' },
  bagua: { normalizedReading: '/pa˥ ku̯a˥˩/', phoneticReconstruction: '/pa˥ ku̯a˥˩/' },
  wuxing: { normalizedReading: '/u˨˩˦ ɕiŋ˧˥/', phoneticReconstruction: '/u˨˩˦ ɕiŋ˧˥/' },
  yinyang: { normalizedReading: '/ín.jǎŋ/', phoneticReconstruction: '/ín.jǎŋ/' },
  wuji: { normalizedReading: '/u˧˥ tɕi˧˥/', phoneticReconstruction: '/u˧˥ tɕi˧˥/' },
  kobe: { normalizedReading: '/koːbe/', phoneticReconstruction: '/koːbe/' },
  kyoto: { normalizedReading: '/kʲoːto/', phoneticReconstruction: '/kʲoːto/' },
  osaka: { normalizedReading: '/oːsaka/', phoneticReconstruction: '/oːsaka/' },
};

const CURATED_ATTESTATIONS = {
  mesopotamian: [
    { text: 'Enuma Elish', date: 'c. 1200–700 BCE', location: 'Babylonia/Assyria', reference: 'Enuma Elish, Tablets I–VII' },
    { text: 'Epic of Gilgamesh', date: 'c. 1800–600 BCE', location: 'Mesopotamia', reference: 'Standard Babylonian version, Tablets I–XII' },
    { text: 'Sumerian Temple Hymns', date: 'c. 2400–2100 BCE', location: 'Sumer', reference: 'ETCSL t.4.80.1, passim' },
  ],
  canaanite: [
    { text: 'Baal Cycle (KTU 1.1–1.6)', date: 'c. 1400–1200 BCE', location: 'Ugarit (Ras Shamra)', reference: 'KTU² 1.1–1.6' },
    { text: 'Hebrew Bible', date: 'c. 1000–400 BCE', location: 'Levant', reference: 'Genesis, Psalms, Prophets (passim)' },
  ],
  phoenician: [
    { text: 'Karatepe bilingual', date: 'c. 800–700 BCE', location: 'Cilicia', reference: 'KAI 26' },
    { text: 'Punic votive inscriptions', date: 'c. 800–146 BCE', location: 'Carthage and western Mediterranean', reference: 'KAI 76–150 (passim)' },
  ],
  egyptian: [
    { text: 'Pyramid Texts', date: 'c. 2400–2300 BCE', location: 'Saqqara', reference: 'Pyramid of Unas, Passim' },
    { text: 'Coffin Texts', date: 'c. 2055–1650 BCE', location: 'Egypt', reference: 'Coffin Texts, Spells 1–1130 (passim)' },
    { text: 'Book of the Dead', date: 'c. 1550–50 BCE', location: 'Egypt', reference: 'Papyrus of Ani, chapters 1–165 (passim)' },
  ],
  greek: [
    { text: 'Hesiod, Theogony', date: 'c. 700 BCE', location: 'Boeotia', reference: 'Theogony, passim' },
    { text: 'Homer, Iliad and Odyssey', date: 'c. 750–650 BCE', location: 'Greece', reference: 'Iliad, Odyssey, passim' },
    { text: 'Homeric Hymns', date: 'c. 700–500 BCE', location: 'Greece', reference: 'Homeric Hymns, passim' },
  ],
  'greek-location': [
    { text: 'Homer, Iliad', date: 'c. 750–650 BCE', location: 'Greece', reference: 'Iliad, passim' },
    { text: 'Pausanias, Description of Greece', date: 'c. 150 CE', location: 'Greece', reference: 'Passim' },
  ],
  norse: [
    { text: 'Poetic Edda', date: 'c. 1200–1270 CE (older oral tradition)', location: 'Iceland', reference: 'Völuspá, Hávamál, Lokasenna, passim' },
    { text: 'Prose Edda', date: 'c. 1220 CE', location: 'Iceland', reference: 'Snorri Sturluson, Gylfaginning, Skáldskaparmál' },
  ],
  sanskrit: [
    { text: 'Rigveda', date: 'c. 1500–1000 BCE', location: 'Northwest South Asia', reference: 'Rigveda, passim' },
    { text: 'Mahābhārata', date: 'c. 400 BCE–400 CE', location: 'South Asia', reference: 'Mahābhārata, passim' },
    { text: 'Rāmāyaṇa', date: 'c. 700 BCE–300 CE', location: 'South Asia', reference: 'Rāmāyaṇa, passim' },
    { text: 'Purāṇas', date: 'c. 300–1000 CE', location: 'South Asia', reference: 'Viṣṇu Purāṇa, Śiva Purāṇa, passim' },
  ],
  zoroastrian: [
    { text: 'Avesta', date: 'c. 1000 BCE–400 CE', location: 'Iranian plateau', reference: 'Yasna, Yashts, Vendidad, passim' },
    { text: 'Gathas', date: 'c. 1000 BCE', location: 'Eastern Iran/Central Asia', reference: 'Yasna 28–34, 43–46, 47–50, 51' },
  ],
  chinese: [
    { text: 'Yijing (I Ching)', date: 'trad. c. 1000 BCE; compiled Warring States–Han', location: 'China', reference: 'Xici, Ten Wings, passim' },
    { text: 'Daodejing', date: 'c. 4th–3rd c. BCE', location: 'China', reference: 'Daodejing 1, 42, passim' },
    { text: 'Zhuangzi', date: 'c. 3rd c. BCE', location: 'China', reference: 'Zhuangzi, passim' },
  ],
  taoist: [
    { text: 'Daodejing', date: 'c. 4th–3rd c. BCE', location: 'China', reference: 'Daodejing, passim' },
    { text: 'Zhuangzi', date: 'c. 3rd c. BCE', location: 'China', reference: 'Zhuangzi, passim' },
  ],
  japanese: [
    { text: 'Kojiki', date: '712 CE', location: 'Japan', reference: 'Kojiki, passim' },
    { text: 'Nihon Shoki', date: '720 CE', location: 'Japan', reference: 'Nihon Shoki, passim' },
  ],
};

const CURATED_STEPS = {
  cuneiform: [
    'The divine determinative 𒀭 (dingir) marks the name as a deity and is silent in pronunciation.',
    'Sumerian logograms are read with Akkadian scholarly values; macrons mark conventionally inferred long vowels.',
    'The cuneiform form is not supported in the .com IDN table, so the Latin-with-macron restoration is used for DNS.',
  ],
  ugaritic: [
    'The name is written in the Ugaritic cuneiform alphabet of Late Bronze Age Ras Shamra.',
    'Ugaritic ʿayin is rendered with Egyptological Ain (ꜥ) for DNS registrability.',
    'Vowels are not written in Ugaritic; length and quality are reconstructed from Hebrew and Akkadian cognates.',
  ],
  phoenician: [
    'The name is written in the Phoenician linear alphabet, read right-to-left.',
    'Phoenician consonantal spelling preserves no vowels; vocalisation is reconstructed from Ugaritic and Hebrew cognates.',
    'The Phoenician script is not registrable in .com; the Latin restoration with macrons is used for DNS.',
  ],
  hebrew: [
    'The name is written in the Hebrew square script, read right-to-left.',
    'Tiberian pointing supplies vowels; the Unicode restoration uses macrons and conventional scholarly diacritics.',
    'The Hebrew script is not registrable in .com; the Latin restoration is used for DNS.',
  ],
  hieroglyphs: [
    'The name is written in Egyptian hieroglyphs, read in whatever direction the glyphs face.',
    'Egyptian writing does not record vowels; the Latin transcription supplies consonants, and vowels are added by convention.',
    'The hieroglyphic form is not registrable in .com; the Egyptological Latin restoration is used for DNS.',
  ],
  greek: [
    'The name is written in the Greek alphabet with accents that indicate pitch and length in classical orthography.',
    'The Unicode restoration preserves acute/circumflex accents and long-vowel macrons where historically appropriate.',
    'The Greek form is not directly registrable in .com; the Latin-with-diacritic restoration is used for DNS.',
  ],
  'younger-futhark': [
    'The name is written in the Younger Futhark runic alphabet used in medieval Scandinavia.',
    'Younger Futhark uses only sixteen base letters, so several Old Norse phonemes share a single rune.',
    'The runic form is not registrable in .com; the normalised Old Norse Latin restoration is used for DNS.',
  ],
  devanagari: [
    'The name is written in Devanagari, a Brahmic abugida in which consonant-vowel sequences are written as a unit.',
    'The transliteration follows IAST conventions; the Unicode restoration uses diacritics registrable in .com.',
    'The Devanagari form is not registrable in .com; the IAST-style restoration is used for DNS.',
  ],
  avestan: [
    'The name is written in the Avestan alphabet, created in Sasanian times to record the sacred texts.',
    'The Avestan script distinguishes many vowel qualities and fricatives that reflect Old Iranian phonology.',
    'The Avestan form is not registrable in .com; the Latin-with-macron restoration is used for DNS.',
  ],
  'chinese-characters': [
    'The name is written in Chinese characters (hanzi), each carrying both semantic and phonetic information.',
    'Pinyin with tone marks gives the modern Mandarin reading; the Unicode restoration uses registrable Latin diacritics.',
    'The hanzi form is not registrable in .com; the pinyin restoration is used for DNS.',
  ],
  'japanese-characters': [
    'The name is written in Japanese kanji; readings may be on’yomi (Sino-Japanese) or kun’yomi (native Japanese).',
    'The Hepburn romanisation with macrons gives the standard pronunciation; the Unicode restoration uses registrable Latin diacritics.',
    'The kanji form is not registrable in .com; the romanised restoration is used for DNS.',
  ],
};

const CURATED_UNCERTAINTIES = {
  cuneiform: [
    'The exact vocalisation of Sumerian words is reconstructed; macrons are a convention of modern scholarship.',
    'Many cuneiform signs have multiple possible readings (polyphony), so logographic readings may vary.',
  ],
  ugaritic: [
    'Ugaritic vocalisation is not written and must be reconstructed from cognate languages such as Hebrew and Akkadian.',
    'The exact phonetic value of some Ugaritic consonants (e.g., ḍ, ṯ, ġ) is debated.',
  ],
  phoenician: [
    'Phoenician writing records consonants only; vowels and vowel length are reconstructed from cognates.',
    'The phonetic realisation of emphatic and sibilant consonants varies across dialects and periods.',
  ],
  hebrew: [
    'Biblical Hebrew vocalisation is supplied by the medieval Tiberian Masoretic tradition; earlier pronunciation may have differed.',
    'The precise articulation of some consonants (e.g., emphatics, pharyngeals) in biblical times is uncertain.',
  ],
  hieroglyphs: [
    'Egyptian hieroglyphs do not record vowels; the original vocalisation is unknown.',
    'Modern Egyptological pronunciation supplies vowels by convention and may differ significantly from ancient speech.',
  ],
  greek: [
    'Classical Greek accents originally marked pitch, not stress; the later Byzantine stress pronunciation is conventional today.',
    'Some names may be pre-Greek loans, making purely Greek etymologies uncertain.',
  ],
  'younger-futhark': [
    'Old Norse vowel length and quality in personal and place names are partly inferred from later manuscript tradition.',
    'Younger Futhark runes are ambiguous; one sign may represent several phonemes.',
  ],
  devanagari: [
    'Vedic and Classical Sanskrit pronunciations differ; the IPA reconstruction represents a scholarly compromise.',
    'Some Devanagari transliteration conventions (e.g., ṛ, ṃ) represent sounds not present in all modern languages.',
  ],
  avestan: [
    'The Avestan alphabet is a late phonetic rendering; some vowel quantities and consonant values remain debated.',
    'Old Iranian phonology is reconstructed partly through comparison with Vedic Sanskrit and Old Persian.',
  ],
  'chinese-characters': [
    'The Old Chinese pronunciation of these characters is reconstructed and differs from modern Mandarin.',
    'Tonal categories of Middle Chinese are better known than the precise phonetic values of Old Chinese tones.',
  ],
  'japanese-characters': [
    'Modern Japanese readings reflect historical sound changes; on’yomi may preserve earlier Chinese-layer pronunciations.',
    'Pitch accent and vowel length distinctions are not shown in standard kanji orthography.',
  ],
};

const CURATED_SOURCES = {
  cuneiform: [
    { title: 'Chicago Assyrian Dictionary (CAD)', tier: 1 },
    { title: 'ETCSL', tier: 1 },
    { title: 'Black & Green, Gods, Demons and Symbols of Ancient Mesopotamia', tier: 2 },
  ],
  ugaritic: [
    { title: 'KTU²', tier: 1 },
    { title: 'CIS', tier: 1 },
    { title: 'Coogan, Stories from Ancient Canaan', tier: 2 },
  ],
  phoenician: [
    { title: 'KAI', tier: 1 },
    { title: 'CIS', tier: 1 },
    { title: 'Krahmalkov, Phoenician-Punic Dictionary', tier: 2 },
  ],
  hebrew: [
    { title: 'Biblia Hebraica Stuttgartensia', tier: 1 },
    { title: 'HALOT', tier: 1 },
    { title: 'Brown-Driver-Briggs Hebrew Lexicon', tier: 2 },
  ],
  hieroglyphs: [
    { title: 'Faulkner, Concise Dictionary of Middle Egyptian', tier: 1 },
    { title: 'Allen, Middle Egyptian', tier: 1 },
    { title: 'Hannig, Ägyptisches Wörterbuch', tier: 2 },
  ],
  greek: [
    { title: 'Liddell-Scott-Jones (LSJ)', tier: 1 },
    { title: 'Beekes, Etymological Dictionary of Greek', tier: 1 },
    { title: 'Chantraine, Dictionnaire étymologique de la langue grecque', tier: 2 },
  ],
  'younger-futhark': [
    { title: 'Zoëga, Concise Dictionary of Old Icelandic', tier: 1 },
    { title: 'Cleasby-Vigfusson, Icelandic-English Dictionary', tier: 1 },
    { title: 'Barnes, Runes: A Handbook', tier: 2 },
  ],
  devanagari: [
    { title: 'Monier-Williams Sanskrit-English Dictionary', tier: 1 },
    { title: 'Macdonell, Sanskrit-English Dictionary', tier: 2 },
    { title: 'Mayrhofer, EWAia', tier: 1 },
  ],
  avestan: [
    { title: 'Bartholomae, Altiranisches Wörterbuch', tier: 1 },
    { title: 'Geldner, Avesta', tier: 1 },
    { title: 'Kellens, Les textes vieil-avestiques', tier: 2 },
  ],
  'chinese-characters': [
    { title: 'Karlgren, Grammata Serica Recensa', tier: 1 },
    { title: 'Schuessler, ABC Etymological Dictionary of Old Chinese', tier: 1 },
    { title: 'Pulleyblank, Lexicon of Reconstructed Pronunciation', tier: 2 },
  ],
  'japanese-characters': [
    { title: 'Nelson, Japanese-English Character Dictionary', tier: 1 },
    { title: 'Kanjidic', tier: 2 },
    { title: 'Shinmeikai Kokugo Jiten', tier: 2 },
  ],
};

// ---------------------------------------------------------------------------
// Sign builders
// ---------------------------------------------------------------------------

function buildSignsFromMap(original, map, defaultName = 'sign', defaultNote = '') {
  return Array.from(original).map((ch) => {
    const meta = map[ch];
    if (meta) {
      return { sign: ch, name: meta.name, value: meta.value, function: 'letter', note: meta.note };
    }
    return { sign: ch, name: defaultName, value: '', function: 'letter', note: defaultNote || `Sign ${ch}.` };
  });
}

function buildCuneiformSigns(original) {
  return Array.from(original).map((ch) => {
    const meta = CUNEIFORM_SIGNS[ch];
    if (meta) {
      return { sign: ch, name: meta.name, value: meta.value, function: ch === '𒀭' ? 'determinative' : 'syllable / logogram', note: meta.note };
    }
    return { sign: ch, name: 'cuneiform sign', value: '', function: 'syllable / logogram', note: 'Cuneiform sign used syllabically or logographically in Sumerian/Akkadian context.' };
  });
}

function buildEgyptianSigns(original, translit) {
  // For Egyptian, we often have a single ideogram or a small group. We describe each sign by its Egyptological value.
  const chars = Array.from(original);
  if (chars.length === 1) {
    return [{ sign: chars[0], name: translit || 'divine sign', value: translit || '', function: 'ideogram / logogram', note: 'Hieroglyphic sign representing the divine name or concept; Egyptian vocalisation is unknown.' }];
  }
  return chars.map((ch, i) => {
    const part = translit ? translit.split(/[-.]/)[i] : '';
    return { sign: ch, name: part || 'hieroglyph', value: part || '', function: 'phonogram / ideogram', note: `Hieroglyphic sign; Egyptological reading ${part || 'uncertain'}. Vowels are supplied by convention.` };
  });
}

function segmentDevanagariAksaras(str) {
  // Segment a Devanagari string into aksaras (consonant clusters + vowel signs + final modifiers).
  // This is a pragmatic segmenter for short deity names, not a full Indic tokenizer.
  const aksaraPattern = /[\u0900-\u0963](?:्[\u0915-\u0939\u0958-\u095F])*[ािीुूृेैोौंःँ]?/g;
  const matches = str.match(aksaraPattern) || [];
  // Fallback: if regex fails, return the whole string as one sign.
  return matches.length > 0 ? matches : [str];
}

function scriptKey(scriptName) {
  const key = (scriptName || '').toLowerCase().replace(/[^a-z]/g, '-');
  if (key.includes('cuneiform')) return 'cuneiform';
  if (key.includes('ugaritic')) return 'ugaritic';
  if (key.includes('phoenician')) return 'phoenician';
  if (key.includes('hebrew')) return 'hebrew';
  if (key.includes('hieroglyph')) return 'hieroglyphs';
  if (key.includes('greek')) return 'greek';
  if (key.includes('futhark') || key.includes('rune')) return 'younger-futhark';
  if (key.includes('devanagari')) return 'devanagari';
  if (key.includes('avestan')) return 'avestan';
  if (key.includes('chinese')) return 'chinese-characters';
  if (key.includes('japanese')) return 'japanese-characters';
  return key;
}

function detectScriptNameFromOriginal(original, currentScriptName) {
  if (!original) return null;
  const cps = Array.from(original).map((ch) => ch.codePointAt(0));
  const current = (currentScriptName || '').toLowerCase();
  // Hebrew square script (U+0590–U+05FF)
  if (cps.some((cp) => cp >= 0x0590 && cp <= 0x05FF)) return 'Hebrew';
  // Devanagari (U+0900–U+097F)
  if (cps.some((cp) => cp >= 0x0900 && cp <= 0x097F)) return 'Devanagari';
  // Greek and Coptic (U+0370–U+03FF)
  if (cps.some((cp) => cp >= 0x0370 && cp <= 0x03FF)) return 'Greek';
  // Ugaritic cuneiform alphabet (U+10380–U+1039F)
  if (cps.some((cp) => cp >= 0x10380 && cp <= 0x1039F)) return 'Ugaritic';
  // Phoenician alphabet (U+10900–U+1091F)
  if (cps.some((cp) => cp >= 0x10900 && cp <= 0x1091F)) return 'Phoenician';
  // Sumero-Akkadian cuneiform (U+12000–U+123FF and U+12400–U+1247F)
  if (cps.some((cp) => (cp >= 0x12000 && cp <= 0x123FF) || (cp >= 0x12400 && cp <= 0x1247F))) return 'Cuneiform';
  // Egyptian hieroglyphs (U+13000–U+1342F)
  if (cps.some((cp) => cp >= 0x13000 && cp <= 0x1342F)) return 'Hieroglyphs';
  // Runic / Younger Futhark (U+16A0–U+16FF)
  if (cps.some((cp) => cp >= 0x16A0 && cp <= 0x16FF)) return 'Younger Futhark';
  // Avestan (U+10B00–U+10B3F)
  if (cps.some((cp) => cp >= 0x10B00 && cp <= 0x10B3F)) return 'Avestan';
  // CJK logograms are ambiguous between Chinese and Japanese; keep the existing label.
  const hasCjk = cps.some((cp) => (cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3400 && cp <= 0x4DBF));
  if (hasCjk) {
    if (current.includes('japanese')) return 'Japanese characters';
    if (current.includes('chinese')) return 'Chinese characters';
    return null;
  }
  return null;
}

function expectedTransliterationScheme(key) {
  switch (key) {
    case 'cuneiform': return 'Sumerian logogram + Akkadian scholarly';
    case 'ugaritic': return 'Ugaritic alphabetic cuneiform';
    case 'phoenician': return 'Phoenician linear alphabet';
    case 'hebrew': return 'Tiberian Masoretic pointing';
    case 'hieroglyphs': return 'Egyptological transliteration';
    case 'greek': return 'Greek alphabet with polytonic accents';
    case 'younger-futhark': return 'Younger Futhark runic alphabet';
    case 'devanagari': return 'IAST transliteration of Devanagari';
    case 'avestan': return 'Avestan alphabet transliteration';
    case 'chinese-characters': return 'Pinyin romanisation of Chinese characters';
    case 'japanese-characters': return 'Hepburn romanisation of Japanese kanji';
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Reading builders
// ---------------------------------------------------------------------------

function greekIpa(translit) {
  return GREEK_IPA[translit] || `/ˈ${translit.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}/`;
}

function sanskritIpa(translit) {
  return SANSKRIT_IPA[translit] || `/ˈ${translit.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}/`;
}

function norseIpa(translit) {
  // Conservative scholarly IPA for normalised Old Norse.
  let t = translit.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  t = t.replace(/ð/g, 'ð').replace(/þ/g, 'θ').replace(/ǫ/g, 'ɔ').replace(/ö/g, 'ø').replace(/æ/g, 'æ');
  return `/${t}/`;
}

function chineseIpa(translit) {
  return `/${translit}/ (Mandarin pinyin with tone marks)`;
}

function japaneseIpa(translit) {
  return `/${translit}/ (Hepburn romanisation with long vowels)`;
}

function hebrewIpa(translit) {
  return `/${translit}/ (Tiberian scholarly vocalisation)`;
}

function avestanIpa(translit) {
  return `/${translit}/ (Avestan scholarly reading)`;
}

function deriveReading(id, entry, prov) {
  const key = scriptKey(entry.scriptName);
  const curated = CURATED_READINGS[id];
  if (curated) return curated;

  const translit = prov.transliteration || entry.provenance?.transliteration || entry.transliteration || entry.unicode || id;

  if (key === 'greek') return { normalizedReading: greekIpa(translit), phoneticReconstruction: greekIpa(translit) };
  if (key === 'devanagari') return { normalizedReading: sanskritIpa(translit), phoneticReconstruction: sanskritIpa(translit) };
  if (key === 'younger-futhark') return { normalizedReading: norseIpa(translit), phoneticReconstruction: norseIpa(translit) };
  if (key === 'chinese-characters') return { normalizedReading: chineseIpa(translit), phoneticReconstruction: chineseIpa(translit) };
  if (key === 'japanese-characters') return { normalizedReading: japaneseIpa(translit), phoneticReconstruction: japaneseIpa(translit) };
  if (key === 'hebrew') return { normalizedReading: hebrewIpa(translit), phoneticReconstruction: hebrewIpa(translit) };
  if (key === 'avestan') return { normalizedReading: avestanIpa(translit), phoneticReconstruction: avestanIpa(translit) };

  return { normalizedReading: `/${translit}/`, phoneticReconstruction: `/${translit}/` };
}

// ---------------------------------------------------------------------------
// Main enrichment
// ---------------------------------------------------------------------------

function enrichEntry(id, entry, lexMeaning, lexPantheon) {
  const prov = entry.provenance || {};
  const status = prov.reviewStatus;

  // Skip pilots
  if (PILOTS.has(id) && status === 'canonical') {
    return { changed: false, reason: 'pilot' };
  }

  // Skip scriptless placeholders
  if (SCRIPTLESS_PANTHEONS.has(lexPantheon)) {
    return { changed: false, reason: 'scriptless-placeholder' };
  }

  let changed = false;

  // Ensure provenance object exists
  if (!entry.provenance) entry.provenance = {};

  // Fix bulk mislabeling (e.g. Greek entries tagged as Avestan, Hebrew as Ugaritic)
  const detectedScript = detectScriptNameFromOriginal(entry.originalScript, entry.scriptName);
  if (detectedScript && entry.scriptName !== detectedScript) {
    entry.scriptName = detectedScript;
    changed = true;
  }

  // Ensure core metadata
  if (isBlank(entry.provenance.original)) entry.provenance.original = entry.originalScript;
  if (isBlank(entry.provenance.transliteration)) entry.provenance.transliteration = entry.provenance.original;
  const scriptKeyName = scriptKey(entry.scriptName);
  const expectedScheme = expectedTransliterationScheme(scriptKeyName);
  if (expectedScheme && isGenericScheme(entry.provenance.transliterationScheme)) {
    if (entry.provenance.transliterationScheme !== expectedScheme) {
      entry.provenance.transliterationScheme = expectedScheme;
      changed = true;
    }
  }

  // Reading. Always use a curated reading when one exists; otherwise fill empty fields.
  const reading = deriveReading(id, entry, entry.provenance);
  if (CURATED_READINGS[id]) {
    if (entry.provenance.normalizedReading !== reading.normalizedReading) {
      entry.provenance.normalizedReading = reading.normalizedReading;
      changed = true;
    }
    if (entry.provenance.phoneticReconstruction !== reading.phoneticReconstruction) {
      entry.provenance.phoneticReconstruction = reading.phoneticReconstruction;
      changed = true;
    }
  } else {
    if (setIfBlank(entry.provenance, 'normalizedReading', reading.normalizedReading)) changed = true;
    if (setIfBlank(entry.provenance, 'phoneticReconstruction', reading.phoneticReconstruction)) changed = true;
  }

  // Etymology
  const currentEtym = entry.provenance.etymology;
  if (looksLikeMeaningCopy(currentEtym, lexMeaning)) {
    const curated = CURATED_ETYMOLOGIES[id];
    if (curated) {
      entry.provenance.etymology = curated;
      changed = true;
    }
  }

  // Signs
  const key = scriptKey(entry.scriptName);
  let signs;
  if (key === 'cuneiform') signs = buildCuneiformSigns(entry.provenance.original);
  else if (key === 'ugaritic') signs = buildSignsFromMap(entry.provenance.original, UGARITIC_LETTERS, 'Ugaritic letter', 'Letter of the Ugaritic cuneiform alphabet.');
  else if (key === 'phoenician') signs = buildSignsFromMap(entry.provenance.original, PHOENICIAN_LETTERS, 'Phoenician letter', 'Letter of the Phoenician alphabet.');
  else if (key === 'hebrew') signs = buildSignsFromMap(entry.provenance.original, HEBREW_LETTERS, 'Hebrew letter', 'Letter of the Hebrew alphabet.');
  else if (key === 'hieroglyphs') signs = buildEgyptianSigns(entry.provenance.original, entry.provenance.transliteration);
  else if (key === 'greek') signs = Array.from(entry.provenance.original).map((ch) => ({ sign: ch, name: `Greek letter ${ch}`, value: ch, function: 'letter', note: 'Greek letter with its classical phonetic value; accents mark pitch and length.' }));
  else if (key === 'younger-futhark') signs = buildSignsFromMap(entry.provenance.original, YOUNGER_FUTHARK_RUNES, 'rune', 'Younger Futhark rune.');
  else if (key === 'devanagari') signs = segmentDevanagariAksaras(entry.provenance.original).map((aksara) => ({ sign: aksara, name: `Devanagari aksara ${aksara}`, value: aksara, function: 'aksara', note: 'Devanagari aksara (syllable/letter) representing a consonant-vowel unit; conjuncts are formed with the virama (्).' }));
  else if (key === 'avestan') signs = buildSignsFromMap(entry.provenance.original, AVESTAN_LETTERS, 'Avestan letter', 'Letter of the Avestan alphabet.');
  else if (key === 'chinese-characters') signs = Array.from(entry.provenance.original).map((ch) => ({ sign: ch, name: `Chinese character ${ch}`, value: ch, function: 'logogram', note: 'Chinese logogram representing a morpheme; pinyin gives the modern Mandarin reading.' }));
  else if (key === 'japanese-characters') signs = Array.from(entry.provenance.original).map((ch) => ({ sign: ch, name: `Japanese kanji ${ch}`, value: ch, function: 'logogram', note: 'Japanese kanji representing a morpheme; Hepburn romanisation gives the standard reading.' }));

  if (signs) {
    // Always replace generated sign arrays during this quality pass; the bulk
    // generation produced inaccurate values for several scripts (Avestan,
    // Devanagari segmentation, etc.). Pilots are unaffected because they are
    // skipped before enrichment.
    entry.provenance.signs = signs;
    changed = true;
  }

  // Steps
  const stepKey = key;
  const curatedSteps = CURATED_STEPS[stepKey];
  if (curatedSteps && (!Array.isArray(entry.provenance.steps) || entry.provenance.steps.every(looksTemplated))) {
    entry.provenance.steps = curatedSteps;
    changed = true;
  }

  // Attestations
  const attestKey = lexPantheon === 'greek-location' ? 'greek-location' : lexPantheon;
  const curatedAttest = CURATED_ATTESTATIONS[attestKey] || CURATED_ATTESTATIONS[key === 'hebrew' ? 'canaanite' : key];
  if (curatedAttest) {
    const arr = ensureArray(entry.provenance, 'attestations');
    const before = arr.length;
    for (const a of curatedAttest) pushMissing(arr, a);
    if (arr.length > before) changed = true;
  }

  // Uncertainties
  const curatedUnc = CURATED_UNCERTAINTIES[stepKey];
  if (curatedUnc) {
    const arr = ensureArray(entry.provenance, 'uncertainties');
    const before = arr.length;
    for (const u of curatedUnc) {
      if (!arr.some((x) => x.toLowerCase().trim() === u.toLowerCase().trim())) arr.push(u);
    }
    if (arr.length > before) changed = true;
  }

  // Sources
  const curatedSources = CURATED_SOURCES[stepKey];
  if (curatedSources) {
    const arr = ensureArray(entry.provenance, 'sources');
    const before = arr.length;
    for (const s of curatedSources) {
      const keyStr = s.title.toLowerCase();
      if (!arr.some((x) => (typeof x === 'string' ? x.toLowerCase() : (x.title || '').toLowerCase()) === keyStr)) arr.push(s);
    }
    if (arr.length > before) changed = true;
  }

  // Normalise sources to object form
  if (Array.isArray(entry.provenance.sources)) {
    entry.provenance.sources = entry.provenance.sources.map((s) => {
      if (typeof s === 'string') {
        changed = true;
        return { title: s, tier: 2 };
      }
      if (!s.tier) { s.tier = 2; changed = true; }
      return s;
    });
  }

  // reviewStatus
  if (isBlank(entry.provenance.reviewStatus)) {
    entry.provenance.reviewStatus = 'enriched';
    changed = true;
  }

  return { changed, reason: changed ? 'enriched' : 'no-op' };
}

function main() {
  const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const lexicon = loadLexicon();
  const byId = new Map(lexicon.map((e) => [e.id, e]));

  let changedCount = 0;
  let pilotCount = 0;
  const report = [];

  for (const id of Object.keys(data)) {
    if (id === '_note') continue;
    const entry = data[id];
    const lex = byId.get(id) || {};

    const result = enrichEntry(id, entry, lex.meaning, lex.pantheon);
    if (result.reason === 'pilot') pilotCount += 1;
    if (result.changed) changedCount += 1;
    report.push({ id, ...result });
  }

  fs.writeFileSync(INPUT, JSON.stringify(data, null, 2) + '\n', 'utf8');

  console.log(`Enriched ${changedCount} entries; skipped ${pilotCount} pilots.`);
  console.log(`Wrote ${INPUT}`);
}

main();
