/**
 * PÚNYCODEX — CJK script risk module
 *
 * Detects fullwidth ASCII spoofs, kana↔kanji lookalikes, simplified/traditional
 * collisions, and mixed-script attacks in CJK text.
 */

const CJK_RANGES = [
  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0x3400, 0x4dbf], // CJK Extension A
  [0xf900, 0xfaff], // CJK Compatibility Ideographs
  [0x3040, 0x309f], // Hiragana
  [0x30a0, 0x30ff], // Katakana
  [0xff01, 0xff60], // Fullwidth ASCII / punctuation
  [0xff65, 0xff9f], // Halfwidth Katakana
  [0x3000, 0x303f], // CJK Symbols and Punctuation
];

// Katakana characters that are frequent visual stand-ins for CJK ideographs.
const KANA_LOOKALIKES = new Map([
  ['カ', '力'],
  ['タ', '夕'],
  ['ニ', '二'],
  ['エ', '工'],
  ['オ', '才'],
  ['チ', '千'],
  ['ト', '卜'],
  ['ロ', '口'],
  ['ハ', '八'],
  ['ヘ', '丿'],
  ['ヤ', '也'],
  ['ヨ', '彐'],
]);

const SIMPLIFIED_FORMS = new Set([
  '国',
  '体',
  '会',
  '员',
  '书',
  '长',
  '门',
  '见',
  '贝',
  '车',
  '东',
  '龙',
  '马',
  '鸟',
  '来',
  '鱼',
  '电',
  '头',
  '发',
  '开',
]);

const TRADITIONAL_FORMS = new Set([
  '國',
  '體',
  '會',
  '員',
  '書',
  '長',
  '門',
  '見',
  '貝',
  '車',
  '東',
  '龍',
  '馬',
  '鳥',
  '來',
  '魚',
  '電',
  '頭',
  '髮',
  '開',
]);

function isCjkCodePoint(cp) {
  return CJK_RANGES.some(([start, end]) => cp >= start && cp <= end);
}

function isCjk(ch) {
  return isCjkCodePoint(ch.codePointAt(0));
}

function hasCjk(str) {
  for (const ch of String(str)) {
    if (isCjk(ch)) return true;
  }
  return false;
}

function hasFullwidthAscii(str) {
  for (const ch of String(str)) {
    const cp = ch.codePointAt(0);
    if (cp >= 0xff01 && cp <= 0xff5e) return true;
  }
  return false;
}

function hasKanaLookalike(str) {
  for (const ch of String(str)) {
    if (KANA_LOOKALIKES.has(ch)) return true;
  }
  return false;
}

function hasLatin(str) {
  for (const ch of String(str)) {
    const cp = ch.codePointAt(0);
    if ((cp >= 0x0041 && cp <= 0x005a) || (cp >= 0x0061 && cp <= 0x007a)) return true;
  }
  return false;
}

function hasSimplifiedTraditionalCollision(str) {
  let simplified = false;
  let traditional = false;
  for (const ch of String(str)) {
    if (SIMPLIFIED_FORMS.has(ch)) simplified = true;
    if (TRADITIONAL_FORMS.has(ch)) traditional = true;
  }
  return simplified && traditional;
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
  if (isCjkCodePoint(cp)) return 'CJK';
  if (cp >= 0x0041 && cp <= 0x007a) return 'Latin';
  if (cp >= 0x0600 && cp <= 0x06ff) return 'Arabic';
  if (cp >= 0x0900 && cp <= 0x097f) return 'Devanagari';
  if (cp >= 0x0400 && cp <= 0x04ff) return 'Cyrillic';
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

function analyzeCjk(input) {
  const str = String(input);
  if (!hasCjk(str)) {
    return { scriptFamily: 'CJK', present: false, riskScore: 0, risks: [] };
  }

  const risks = [];
  let score = 0;

  if (hasFullwidthAscii(str)) {
    risks.push('fullwidth-form');
    score += 0.5;
  }

  if (hasKanaLookalike(str) && hasLatin(str)) {
    risks.push('kana-lookalike');
    score += 0.4;
  }

  if (hasSimplifiedTraditionalCollision(str)) {
    risks.push('simplified-traditional-collision');
    score += 0.3;
  }

  if (hasMixedScript(str)) {
    risks.push('mixed-script');
    score += 0.3;
  }

  return {
    scriptFamily: 'CJK',
    present: true,
    riskScore: Math.min(1, score),
    risks,
  };
}

module.exports = {
  isCjk,
  hasCjk,
  analyzeCjk,
  hasFullwidthAscii,
};
