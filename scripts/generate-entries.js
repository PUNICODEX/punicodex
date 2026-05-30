/**
 * Lexicon Entry Batch Generator
 * Auto-generates breakdowns from ASCII + Unicode pairs
 */

const fs = require('fs');
const path = require('path');

// Helper: determine breakdown type from ASCII char and Unicode output
function inferType(char, to) {
  if (!to) return 'drop';
  
  const base = char.toLowerCase();
  const toLower = to.toLowerCase();
  
  // Same character (case-insensitive)
  if (toLower === base) return 'same';
  
  // Capitalized
  if (to === char.toUpperCase() && to.length === 1) return 'same';
  
  const stressedChars = 'áéíóúýàèìòùỳâêîôûŷäëïöüÿãẽĩõũỹőűǿ';
  const longVowels = 'āēīōūȳ';
  const dualChars = 'ấếốậềợ';
  
  // Check if to is just the base letter with diacritics
  const decomposed = to.normalize('NFD');
  const baseChar = decomposed.charAt(0).toLowerCase();
  
  if (baseChar === base) {
    const diacritics = decomposed.slice(1);
    const hasAcute = diacritics.includes('\u0301');
    const hasCircum = diacritics.includes('\u0302');
    const hasGrave = diacritics.includes('\u0300');
    const hasMacron = diacritics.includes('\u0304');
    const hasDiaeresis = diacritics.includes('\u0308');
    const hasTilde = diacritics.includes('\u0303');
    const hasDoubleAcute = diacritics.includes('\u030B');
    
    if ((hasAcute || hasCircum || hasGrave || hasDoubleAcute) && hasMacron) return 'dual';
    if (hasMacron) return 'length';
    if (hasAcute || hasCircum || hasGrave || hasDoubleAcute) return 'stress';
    if (hasDiaeresis || hasTilde) return 'stress'; // treat as stress variant
  }
  
  // Long vowels as different letters (eta, omega)
  if ((base === 'e' && toLower === 'η') || (base === 'o' && toLower === 'ω') ||
      (base === 'a' && toLower === 'ᾱ') || (base === 'i' && toLower === 'ῑ') ||
      (base === 'u' && toLower === 'ῡ')) {
    return 'length';
  }
  
  // Special characters (thorn, eth, theta, etc.)
  return 'special';
}

function generateNote(char, to, type, pantheon) {
  if (!to) {
    if (char === 'h' && pantheon === 'norse') return 'Dropped: merged into thorn/eth';
    if (pantheon === 'egyptian') return 'Dropped: vowel not written';
    return 'Dropped';
  }
  
  const notes = {
    same: {
      greek: (c, t) => t === c.toUpperCase() ? `${c.toUpperCase()} uppercase` : `${c} same`,
      default: (c, t) => t === c.toUpperCase() ? 'Same, capitalized' : 'Same'
    },
    stress: {
      greek: (c, t) => `Acute on ${c}`,
      default: (c, t) => `Stress on ${c}`
    },
    length: {
      greek: (c, t) => {
        if (t === 'η' || t === 'ῆ' || t === 'ή') return 'Eta: long e';
        if (t === 'ω' || t === 'ῶ' || t === 'ώ') return 'Omega: long o';
        if (t === 'ᾱ') return 'Long alpha';
        if (t === 'ῑ') return 'Long iota';
        if (t === 'ῡ') return 'Long upsilon';
        return 'Macron: long vowel';
      },
      default: (c, t) => 'Long vowel'
    },
    dual: {
      default: (c, t) => 'Stress + length'
    },
    special: {
      norse: (c, t) => {
        if (t === 'Þ' || t === 'þ') return 'Thorn: voiceless dental fricative';
        if (t === 'ð') return 'Eth: voiced dental fricative';
        if (t === 'ǫ' || t === 'Ǫ') return 'O with ogonek';
        if (t === 'æ' || t === 'Æ') return 'Ash: diphthong';
        if (t === 'ø' || t === 'Ø') return 'O-slash';
        return 'Special character';
      },
      egyptian: (c, t) => {
        if (t === 'ꜥ' || t === 'Ꜣ') return 'Ayin: voiced pharyngeal';
        if (t === 'ḥ' || t === 'Ḥ') return 'H with dot: voiceless pharyngeal';
        if (t === 'ḫ' || t === 'Ḫ') return 'H with breve: voiceless velar';
        if (t === 'ḏ' || t === 'Ḏ') return 'D with dot: palatalized';
        if (t === 'ṯ' || t === 'Ṯ') return 'T with dot: palatalized';
        if (t === 'š' || t === 'Š') return 'Shin';
        return 'Special phonetic character';
      },
      sanskrit: (c, t) => {
        if (t === 'ṣ' || t === 'Ṣ') return 'S with dot: retroflex s';
        if (t === 'ś' || t === 'Ś') return 'S with acute: palatal s';
        if (t === 'ṇ' || t === 'Ṇ') return 'N with dot: retroflex n';
        if (t === 'ṅ' || t === 'Ṅ') return 'N with dot above: velar n';
        if (t === 'ñ' || t === 'Ñ') return 'N with tilde: palatal n';
        if (t === 'ṭ' || t === 'Ṭ') return 'T with dot: retroflex t';
        if (t === 'ḍ' || t === 'Ḍ') return 'D with dot: retroflex d';
        if (t === 'ḥ' || t === 'Ḥ') return 'H with dot: visarga';
        if (t === 'ṃ' || t === 'Ṃ') return 'M with dot: anusvara';
        if (t === 'ṛ' || t === 'Ṛ') return 'R with dot: vocalic r';
        if (t === 'ḷ' || t === 'Ḷ') return 'L with dot: vocalic l';
        if (t === 'ṉ' || t === 'Ṉ') return 'N with line below: retroflex n';
        if (t === 'ṯ' || t === 'Ṯ') return 'T with line below: retroflex t';
        if (t === 'ḻ' || t === 'Ḻ') return 'L with line below: retroflex l';
        if (t === 'ṟ' || t === 'Ṟ') return 'R with line below: retroflex r';
        if (t === 'ṅ' || t === 'Ṅ') return 'N with dot above: velar nasal';
        return 'Special character';
      },
      default: (c, t) => 'Special character'
    },
    drop: {
      default: (c, t) => 'Dropped'
    }
  };
  
  const noteFn = (notes[type] && notes[type][pantheon]) || (notes[type] && notes[type].default) || (() => 'Transformed');
  return noteFn(char, to);
}

function generateBreakdown(ascii, unicode, pantheon) {
  // Handle merge cases first (e.g., th→Þ)
  const merges = [];
  
  // Try to align ASCII to Unicode
  let ui = 0;
  const breakdown = [];
  
  for (let ai = 0; ai < ascii.length; ai++) {
    const char = ascii[ai];
    
    // Check for common digraphs
    if (ai < ascii.length - 1) {
      const digraph = ascii.slice(ai, ai + 2).toLowerCase();
      const rest = unicode.slice(ui);
      
      // th → Þ/þ/ð
      if (digraph === 'th' && rest.match(/^[Þþð]/)) {
        breakdown.push({ char, to: rest[0], type: 'special', note: generateNote(char, rest[0], 'special', pantheon) });
        breakdown.push({ char: ascii[ai + 1], to: '', type: 'drop', note: generateNote(ascii[ai + 1], '', 'drop', pantheon) });
        ui += 1;
        ai += 1;
        continue;
      }
      // dh → ð
      if (digraph === 'dh' && rest.match(/^[ð]/)) {
        breakdown.push({ char, to: rest[0], type: 'special', note: generateNote(char, rest[0], 'special', pantheon) });
        breakdown.push({ char: ascii[ai + 1], to: '', type: 'drop', note: generateNote(ascii[ai + 1], '', 'drop', pantheon) });
        ui += 1;
        ai += 1;
        continue;
      }
      // ng → ṅ/ŋ
      if (digraph === 'ng' && rest.match(/^[ṅŋ]/)) {
        breakdown.push({ char, to: rest[0], type: 'special', note: generateNote(char, rest[0], 'special', pantheon) });
        breakdown.push({ char: ascii[ai + 1], to: '', type: 'drop', note: generateNote(ascii[ai + 1], '', 'drop', pantheon) });
        ui += 1;
        ai += 1;
        continue;
      }
      // kh → ḫ
      if (digraph === 'kh' && rest.match(/^[ḫḪ]/)) {
        breakdown.push({ char, to: rest[0], type: 'special', note: generateNote(char, rest[0], 'special', pantheon) });
        breakdown.push({ char: ascii[ai + 1], to: '', type: 'drop', note: generateNote(ascii[ai + 1], '', 'drop', pantheon) });
        ui += 1;
        ai += 1;
        continue;
      }
      // sh → š/ś/ṣ
      if (digraph === 'sh' && rest.match(/^[šŠśŚṣṢ]/)) {
        breakdown.push({ char, to: rest[0], type: 'special', note: generateNote(char, rest[0], 'special', pantheon) });
        breakdown.push({ char: ascii[ai + 1], to: '', type: 'drop', note: generateNote(ascii[ai + 1], '', 'drop', pantheon) });
        ui += 1;
        ai += 1;
        continue;
      }
      // ae → æ
      if (digraph === 'ae' && rest.match(/^[æÆ]/)) {
        breakdown.push({ char, to: rest[0], type: 'special', note: generateNote(char, rest[0], 'special', pantheon) });
        breakdown.push({ char: ascii[ai + 1], to: '', type: 'drop', note: generateNote(ascii[ai + 1], '', 'drop', pantheon) });
        ui += 1;
        ai += 1;
        continue;
      }
    }
    
    if (ui < unicode.length) {
      const to = unicode[ui];
      const type = inferType(char, to);
      const note = generateNote(char, to, type, pantheon);
      breakdown.push({ char, to, type, note });
      ui += 1;
    } else {
      breakdown.push({ char, to: '', type: 'drop', note: generateNote(char, '', 'drop', pantheon) });
    }
  }
  
  return breakdown;
}

function generateEntry(data) {
  const { id, ascii, unicode, greek, pantheon, tier, tierLabel, domain, meaning, sources } = data;
  const breakdown = generateBreakdown(ascii, unicode, pantheon);
  
  // Verify breakdown produces unicode
  const reconstructed = breakdown.map(b => b.to).join('');
  if (reconstructed !== unicode) {
    console.warn(`MISMATCH for ${id}: reconstructed "${reconstructed}" !== unicode "${unicode}"`);
  }
  
  return {
    id, ascii, unicode, greek: greek || '—',
    pantheon, tier, tierLabel,
    domain, meaning,
    sources: sources || [],
    breakdown
  };
}

module.exports = { generateEntry, generateBreakdown };

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--test') {
    // Test the generator
    const tests = [
      { id: 'test1', ascii: 'achilles', unicode: 'Achillēs', pantheon: 'greek' },
      { id: 'test2', ascii: 'niflheimr', unicode: 'Niflheimr', pantheon: 'norse' },
      { id: 'test3', ascii: 'anu', unicode: 'Anu', pantheon: 'mesopotamian' },
    ];
    tests.forEach(t => {
      const bd = generateBreakdown(t.ascii, t.unicode, t.pantheon);
      console.log(`\n${t.ascii} → ${t.unicode}`);
      console.log(JSON.stringify(bd, null, 2));
    });
  }
}
