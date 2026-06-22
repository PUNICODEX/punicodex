/**
 * PÚNYCODEX — Indic script risk module
 *
 * Detects ZWJ/ZWNJ conjunct manipulation, vowel-sign stacking, and
 * mixed-script anomalies in Devanagari, Bengali, Tamil, and related Indic
 * scripts.
 */

const INDIC_BLOCKS = [
  ['Devanagari', 0x0900, 0x097f],
  ['Bengali', 0x0980, 0x09ff],
  ['Gurmukhi', 0x0a00, 0x0a7f],
  ['Gujarati', 0x0a80, 0x0aff],
  ['Oriya', 0x0b00, 0x0b7f],
  ['Tamil', 0x0b80, 0x0bff],
  ['Telugu', 0x0c00, 0x0c7f],
  ['Kannada', 0x0c80, 0x0cff],
  ['Malayalam', 0x0d00, 0x0d7f],
  ['Sinhala', 0x0d80, 0x0dff],
];

const ZWJ = 0x200d;
const ZWNJ = 0x200c;

function getIndicScriptName(cp) {
  for (const [name, start, end] of INDIC_BLOCKS) {
    if (cp >= start && cp <= end) return name;
  }
  return null;
}

function isIndicCodePoint(cp) {
  return getIndicScriptName(cp) !== null;
}

function isIndic(ch) {
  return isIndicCodePoint(ch.codePointAt(0));
}

function hasIndic(str) {
  for (const ch of String(str)) {
    if (isIndic(ch)) return true;
  }
  return false;
}

// Approximate dependent vowel sign (matra) ranges, excluding virama.
function isVowelSign(cp, scriptName) {
  switch (scriptName) {
    case 'Devanagari':
      return (cp >= 0x093e && cp <= 0x094c && cp !== 0x094d) || cp === 0x0955 || cp === 0x0956;
    case 'Bengali':
      return (
        (cp >= 0x09be && cp <= 0x09c4) ||
        cp === 0x09c7 ||
        cp === 0x09c8 ||
        cp === 0x09cb ||
        cp === 0x09cc
      );
    case 'Gurmukhi':
      return (
        cp === 0x0a3e ||
        cp === 0x0a3f ||
        cp === 0x0a40 ||
        cp === 0x0a41 ||
        cp === 0x0a42 ||
        cp === 0x0a47 ||
        cp === 0x0a48 ||
        cp === 0x0a4b ||
        cp === 0x0a4c
      );
    case 'Gujarati':
      return (
        (cp >= 0x0abe && cp <= 0x0ac5 && cp !== 0x0ac4) ||
        (cp >= 0x0ac7 && cp <= 0x0ac9) ||
        (cp >= 0x0acb && cp <= 0x0acd && cp !== 0x0acd)
      );
    case 'Oriya':
      return cp >= 0x0b3e && cp <= 0x0b44 && cp !== 0x0b4d;
    case 'Tamil':
      return (
        (cp >= 0x0bbe && cp <= 0x0bc2) ||
        (cp >= 0x0bc6 && cp <= 0x0bc8) ||
        (cp >= 0x0bca && cp <= 0x0bcd && cp !== 0x0bcd)
      );
    case 'Telugu':
      return (
        (cp >= 0x0c3e && cp <= 0x0c44) ||
        (cp >= 0x0c46 && cp <= 0x0c48) ||
        (cp >= 0x0c4a && cp <= 0x0c4d && cp !== 0x0c4d)
      );
    case 'Kannada':
      return (
        (cp >= 0x0cbe && cp <= 0x0cc4) ||
        (cp >= 0x0cc6 && cp <= 0x0cc8) ||
        (cp >= 0x0cca && cp <= 0x0ccd && cp !== 0x0ccd)
      );
    case 'Malayalam':
      return (
        (cp >= 0x0d3e && cp <= 0x0d44) ||
        (cp >= 0x0d46 && cp <= 0x0d48) ||
        (cp >= 0x0d4a && cp <= 0x0d4d && cp !== 0x0d4d)
      );
    case 'Sinhala':
      return (
        (cp >= 0x0dd0 && cp <= 0x0dd6) ||
        (cp >= 0x0dd8 && cp <= 0x0ddf) ||
        (cp >= 0x0dca && cp <= 0x0dcf && cp !== 0x0dca)
      );
    default:
      return false;
  }
}

function hasVowelSignStacking(str) {
  const chars = [...String(str)];
  let previousScript = null;
  let previousWasVowel = false;

  for (const ch of chars) {
    const cp = ch.codePointAt(0);
    const scriptName = getIndicScriptName(cp);
    const currentIsVowel = scriptName && isVowelSign(cp, scriptName);

    if (currentIsVowel && previousWasVowel && previousScript === scriptName) {
      return true;
    }

    previousScript = scriptName;
    previousWasVowel = currentIsVowel;
  }
  return false;
}

function hasMultipleIndicScripts(str) {
  const scripts = new Set();
  for (const ch of String(str)) {
    const name = getIndicScriptName(ch.codePointAt(0));
    if (name) scripts.add(name);
  }
  return scripts.size > 1;
}

function isInvisible(cp) {
  return (
    cp === 0x200b ||
    cp === 0x200c ||
    cp === 0x200d ||
    cp === 0x2060 ||
    cp === 0xfeff ||
    (cp >= 0x202a && cp <= 0x202e) ||
    (cp >= 0x2066 && cp <= 0x2069) ||
    (cp >= 0xfe00 && cp <= 0xfe0f) ||
    (cp >= 0xe0100 && cp <= 0xe01ef)
  );
}

function isControl(cp) {
  return (cp >= 0x0000 && cp <= 0x001f) || (cp >= 0x007f && cp <= 0x009f);
}

function getRealScript(ch) {
  const cp = ch.codePointAt(0);
  if (isInvisible(cp) || isControl(cp)) return 'Inherited';
  const indic = getIndicScriptName(cp);
  if (indic) return indic;
  if (cp >= 0x0041 && cp <= 0x007a) return 'Latin';
  if (cp >= 0x0600 && cp <= 0x06ff) return 'Arabic';
  if (cp >= 0x3040 && cp <= 0x309f) return 'Hiragana';
  if (cp >= 0x30a0 && cp <= 0x30ff) return 'Katakana';
  if (cp >= 0x4e00 && cp <= 0x9fff) return 'CJK';
  return 'Other';
}

function hasMixedScript(str) {
  const scripts = new Set();
  for (const ch of String(str)) {
    const script = getRealScript(ch);
    if (script !== 'Inherited') scripts.add(script);
  }
  return scripts.size > 1;
}

function analyzeIndic(input) {
  const str = String(input);
  if (!hasIndic(str)) {
    return { scriptFamily: 'Indic', present: false, riskScore: 0, risks: [] };
  }

  const risks = [];
  let score = 0;

  if (str.includes(String.fromCodePoint(ZWJ))) {
    risks.push('zwj-manipulation');
    score += 0.35;
  }

  if (str.includes(String.fromCodePoint(ZWNJ))) {
    risks.push('zwnj-manipulation');
    score += 0.2;
  }

  if (hasVowelSignStacking(str)) {
    risks.push('vowel-sign-stacking');
    score += 0.3;
  }

  if (hasMultipleIndicScripts(str)) {
    risks.push('mixed-indic-scripts');
    score += 0.4;
  }

  if (hasMixedScript(str)) {
    risks.push('mixed-script');
    score += 0.25;
  }

  return {
    scriptFamily: 'Indic',
    present: true,
    riskScore: Math.min(1, score),
    risks,
  };
}

module.exports = {
  isIndic,
  hasIndic,
  analyzeIndic,
};
