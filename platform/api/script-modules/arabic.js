/**
 * PÚNYCODEX — Arabic / Persian / Urdu script risk module
 *
 * Detects dotless/dotted substitution, Kashida elongation, contextual-form
 * anomalies, joiner manipulation, and mixed-script attacks in the Arabic
 * script family.
 */

const ARABIC_RANGES = [
  [0x0600, 0x06ff],
  [0x0750, 0x077f],
  [0x08a0, 0x08ff],
  [0xfb50, 0xfdff],
  [0xfe70, 0xfeff],
];

// Letters whose identity is strongly determined by dots.
const DOTTED_ARABIC = new Set([
  0x0628, // ب
  0x062a, // ت
  0x062b, // ث
  0x0646, // ن
  0x064a, // ي
  0x067e, // پ
  0x0686, // چ
  0x0698, // ژ
  0x06af, // گ
  0x0642, // ق
  0x0641, // ف
  0x0636, // ض
  0x0635, // ص
  0x0630, // ذ
  0x0632, // ز
  0x0634, // ش
]);

// Dotless or ambiguous forms that can impersonate dotted letters.
const DOTLESS_ARABIC = new Set([
  0x066e, // ٮ dotless beh
  0x066f, // ٯ dotless qaf
  0x06a1, // ڡ dotless feh
  0x06ba, // ں noon ghunna
]);

const KASHIDA = 0x0640;
const ZWJ = 0x200d;
const ZWNJ = 0x200c;

function isArabicCodePoint(cp) {
  return ARABIC_RANGES.some(([start, end]) => cp >= start && cp <= end);
}

function isArabic(ch) {
  return isArabicCodePoint(ch.codePointAt(0));
}

function hasArabic(str) {
  for (const ch of String(str)) {
    if (isArabic(ch)) return true;
  }
  return false;
}

function hasDotlessDottedMix(str) {
  let dotted = false;
  let dotless = false;
  for (const ch of String(str)) {
    const cp = ch.codePointAt(0);
    if (DOTTED_ARABIC.has(cp)) dotted = true;
    if (DOTLESS_ARABIC.has(cp)) dotless = true;
  }
  return dotted && dotless;
}

function kashidaCount(str) {
  let count = 0;
  for (const ch of String(str)) {
    if (ch.codePointAt(0) === KASHIDA) count += 1;
  }
  return count;
}

function hasLeadingOrTrailingKashida(str) {
  const s = String(str);
  const chars = [...s];
  if (chars.length === 0) return false;
  return chars[0].codePointAt(0) === KASHIDA || chars[chars.length - 1].codePointAt(0) === KASHIDA;
}

function hasContextualPresentationForm(str) {
  for (const ch of String(str)) {
    const cp = ch.codePointAt(0);
    if ((cp >= 0xfb50 && cp <= 0xfdff) || (cp >= 0xfe70 && cp <= 0xfeff)) return true;
  }
  return false;
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
  if (isArabicCodePoint(cp)) return 'Arabic';
  if (cp >= 0x0041 && cp <= 0x007a) return 'Latin';
  if (cp >= 0x0370 && cp <= 0x03ff) return 'Greek';
  if (cp >= 0x0400 && cp <= 0x04ff) return 'Cyrillic';
  if (cp >= 0x0900 && cp <= 0x097f) return 'Devanagari';
  if (cp >= 0x3040 && cp <= 0x309f) return 'Hiragana';
  if (cp >= 0x30a0 && cp <= 0x30ff) return 'Katakana';
  if (cp >= 0x4e00 && cp <= 0x9fff) return 'CJK';
  if (cp >= 0x0590 && cp <= 0x05ff) return 'Hebrew';
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

function analyzeArabic(input) {
  const str = String(input);
  if (!hasArabic(str)) {
    return { scriptFamily: 'Arabic', present: false, riskScore: 0, risks: [] };
  }

  const risks = [];
  let score = 0;

  if (hasDotlessDottedMix(str)) {
    risks.push('dotless-dotted-mix');
    score += 0.45;
  }

  const kc = kashidaCount(str);
  if (kc > 0) {
    risks.push('kashida-elongation');
    score += kc >= 3 || hasLeadingOrTrailingKashida(str) ? 0.4 : 0.2;
  }

  if (hasContextualPresentationForm(str)) {
    risks.push('contextual-form-anomaly');
    score += 0.3;
  }

  if (str.includes(String.fromCodePoint(ZWJ)) || str.includes(String.fromCodePoint(ZWNJ))) {
    risks.push('joiner-manipulation');
    score += 0.2;
  }

  if (hasMixedScript(str)) {
    risks.push('mixed-script');
    score += 0.25;
  }

  return {
    scriptFamily: 'Arabic',
    present: true,
    riskScore: Math.min(1, score),
    risks,
  };
}

module.exports = {
  isArabic,
  hasArabic,
  analyzeArabic,
};
