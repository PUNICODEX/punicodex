/**
 * PuniCodex — Right-to-left attack detector
 *
 * Detects bidirectional override characters that flip visual order, exposes
 * the logical vs. simplified visual order, and computes a risk score.
 */

const BIDI_OVERRIDE_CODE_POINTS = new Set([
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

const BIDI_MARK_CODE_POINTS = new Set([
  0x200e, // LRM
  0x200f, // RLM
  0x061c, // ALM
]);

function isBidiOverride(ch) {
  return BIDI_OVERRIDE_CODE_POINTS.has(ch.codePointAt(0));
}

function isBidiMark(ch) {
  return BIDI_MARK_CODE_POINTS.has(ch.codePointAt(0));
}

function hasBidiOverride(str) {
  for (const ch of String(str)) {
    if (isBidiOverride(ch)) return true;
  }
  return false;
}

function hasBidiMark(str) {
  for (const ch of String(str)) {
    if (isBidiMark(ch)) return true;
  }
  return false;
}

function collectBidiChars(str) {
  const found = [];
  const chars = [...String(str)];
  for (let i = 0; i < chars.length; i += 1) {
    const cp = chars[i].codePointAt(0);
    if (BIDI_OVERRIDE_CODE_POINTS.has(cp) || BIDI_MARK_CODE_POINTS.has(cp)) {
      found.push({
        char: chars[i],
        position: i,
        type: BIDI_OVERRIDE_CODE_POINTS.has(cp) ? 'override' : 'mark',
      });
    }
  }
  return found;
}

/**
 * Compute a naive visual-order approximation for isolated override attacks:
 * if an override character is present, reverse the logical string. This is
 * not a full BiDi implementation; it is sufficient to demonstrate that the
 * visual order diverges from the logical order.
 */
function computeVisualOrder(str) {
  const s = String(str);
  if (!hasBidiOverride(s)) return s;
  return [...s].reverse().join('');
}

function analyzeRtl(input) {
  const str = String(input);
  const bidiChars = collectBidiChars(str);
  const hasOverride = bidiChars.some((c) => c.type === 'override');
  const hasMark = bidiChars.some((c) => c.type === 'mark');
  const visualOrder = computeVisualOrder(str);

  let score = 0;
  if (hasOverride) score = 1;
  else if (hasMark) score = 0.3;

  return {
    hasBidiOverride: hasOverride,
    hasBidiMark: hasMark,
    bidiChars,
    logicalOrder: str,
    visualOrder,
    orderMismatch: visualOrder !== str,
    riskScore: score,
    risk: hasOverride ? 'rtl-override' : hasMark ? 'rtl-mark' : 'none',
  };
}

module.exports = {
  isBidiOverride,
  isBidiMark,
  hasBidiOverride,
  hasBidiMark,
  collectBidiChars,
  computeVisualOrder,
  analyzeRtl,
};
