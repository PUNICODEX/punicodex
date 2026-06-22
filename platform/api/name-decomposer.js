/**
 * PÚNYCODEX — Name Decomposer
 *
 * Breaks any Unicode string into a per-character attestation: script,
 * confusable mapping, invisible-character flags, and deviation from a
 * canonical Latin/ASCII baseline. This is the evidence trail behind every
 * authenticity verdict.
 */

const { analyzeConfusables } = require('./confusables');
const { CONFUSABLE_TO_ASCII } = require('./confusable-atlas');

// Characters that are visually invisible or control-oriented.
const INVISIBLE_CODE_POINTS = new Set([
  0x200b, // zero width space
  0x200c, // zero width non-joiner
  0x200d, // zero width joiner
  0x2060, // word joiner
  0xfeff, // zero width no-break space (BOM)
  0x202a, // LRE
  0x202b, // RLE
  0x202c, // PDF
  0x202d, // LRO
  0x202e, // RLO
  0x2066, // LRI
  0x2067, // RLI
  0x2068, // FSI
  0x2069, // PDI
]);

// Combining diacritical marks block.
const COMBINING_DIACRITIC_RANGE = [0x0300, 0x036f];

function isCombiningDiacritic(cp) {
  return cp >= COMBINING_DIACRITIC_RANGE[0] && cp <= COMBINING_DIACRITIC_RANGE[1];
}

function isInvisible(cp) {
  return INVISIBLE_CODE_POINTS.has(cp);
}

function isControl(cp) {
  return (cp >= 0x0000 && cp <= 0x001f) || (cp >= 0x007f && cp <= 0x009f);
}

/**
 * Return the broad script family for a character. Punctuation, combining
 * marks, and symbols are reported as 'Common' so they do not trigger
 * mixed-script detection on their own.
 */
function getScript(ch) {
  const cp = ch.codePointAt(0);

  if (isInvisible(cp) || isControl(cp)) return 'Inherited';
  if (isCombiningDiacritic(cp)) return 'Inherited';

  // Common / punctuation / symbols / digits
  if (
    (cp >= 0x0000 && cp <= 0x0040) ||
    (cp >= 0x005b && cp <= 0x0060) ||
    (cp >= 0x007b && cp <= 0x00bf) ||
    cp === 0x00d7 ||
    cp === 0x00f7 ||
    (cp >= 0x2000 && cp <= 0x206f) // General punctuation / format chars
  ) {
    return 'Common';
  }

  if (cp >= 0x0041 && cp <= 0x007a) return 'Latin';
  if (cp >= 0x00c0 && cp <= 0x017f) return 'Latin';
  if (cp >= 0x0180 && cp <= 0x024f) return 'Latin';
  if (cp >= 0x1e00 && cp <= 0x1eff) return 'Latin';
  if (cp >= 0x0370 && cp <= 0x03ff) return 'Greek';
  if (cp >= 0x0400 && cp <= 0x04ff) return 'Cyrillic';
  if (cp >= 0x0530 && cp <= 0x058f) return 'Armenian';
  if (cp >= 0x10a0 && cp <= 0x10ff) return 'Georgian';
  if (cp >= 0x2e80 && cp <= 0x9fff) return 'CJK';
  if (cp >= 0xac00 && cp <= 0xd7af) return 'Hangul';
  if (cp >= 0x0600 && cp <= 0x06ff) return 'Arabic';
  if (cp >= 0x0750 && cp <= 0x077f) return 'Arabic';
  if (cp >= 0x0900 && cp <= 0x097f) return 'Devanagari';
  if (cp >= 0x12000 && cp <= 0x123ff) return 'Cuneiform';
  if (cp >= 0x16a0 && cp <= 0x16ff) return 'Runic';

  return 'Other';
}

/**
 * Detect whether a string mixes two or more real scripts (ignoring Common
 * and Inherited characters).
 */
function hasMixedScripts(str) {
  const scripts = new Set();
  for (const ch of String(str)) {
    const script = getScript(ch);
    if (script !== 'Inherited' && script !== 'Common') {
      scripts.add(script);
    }
  }
  return scripts.size > 1;
}

/**
 * Decompose a string into per-character attestations.
 */
function decompose(str) {
  const s = String(str);
  const confusable = analyzeConfusables(s);
  const chars = [];
  let position = 0;

  for (const ch of s) {
    const cp = ch.codePointAt(0);
    const script = getScript(ch);
    const mapped = CONFUSABLE_TO_ASCII.get(ch);

    chars.push({
      char: ch,
      codePoint: cp,
      position,
      script,
      isAscii: cp <= 127,
      isInvisible: isInvisible(cp),
      isControl: isControl(cp),
      isCombiningDiacritic: isCombiningDiacritic(cp),
      isDiacritic: isCombiningDiacritic(cp),
      confusableMapping: mapped || null,
      isConfusable: mapped !== undefined,
      deviationScore: computeCharDeviation(ch, script, mapped),
    });

    position += 1;
  }

  return {
    raw: s,
    normalized: s.normalize('NFKC'),
    length: chars.length,
    hasMixedScripts: hasMixedScripts(s),
    scripts: [
      ...new Set(chars.map((c) => c.script).filter((s) => s !== 'Inherited' && s !== 'Common')),
    ],
    invisibleChars: chars
      .filter((c) => c.isInvisible)
      .map((c) => ({ char: c.char, position: c.position })),
    confusableAnalysis: confusable,
    chars,
  };
}

function computeCharDeviation(ch, script, mapped) {
  const cp = ch.codePointAt(0);

  // Pure ASCII Latin letters and digits are the baseline.
  if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a) || (cp >= 0x30 && cp <= 0x39)) {
    return 0;
  }

  // Legitimate Latin extended characters used in scholarly restorations
  // (macrons, acutes, etc.) are low deviation.
  if (script === 'Latin' && !mapped) return 0.1;

  // Confusable characters that map to ASCII are high deviation because they
  // can impersonate the canonical form.
  if (mapped) return 0.85;

  // Non-Latin scripts are medium deviation; mixed-script detection handles
  // the rest of the risk signal.
  if (script !== 'Latin' && script !== 'Common' && script !== 'Inherited') return 0.5;

  // Common symbols, punctuation, etc.
  return 0.05;
}

/**
 * Compute a 0–1 visual deviation score for the whole string.
 */
function computeVisualDeviation(str) {
  const decomposition = decompose(str);
  if (decomposition.length === 0) return 0;

  const visibleChars = decomposition.chars.filter((c) => !c.isInvisible);
  if (visibleChars.length === 0) return 0;

  const total = visibleChars.reduce((sum, c) => sum + c.deviationScore, 0);
  const average = total / visibleChars.length;
  const mixed = decomposition.hasMixedScripts ? 0.25 : 0;
  const invisible = decomposition.invisibleChars.length > 0 ? 0.2 : 0;

  return Math.min(1, average + mixed + invisible);
}

module.exports = {
  getScript,
  hasMixedScripts,
  decompose,
  computeVisualDeviation,
  isInvisible,
  isCombiningDiacritic,
};
