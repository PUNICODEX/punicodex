/**
 * Unicode confusable / homoglyph detection for PUNYCODEX.
 *
 * Unicode grants many ways to write visually identical or near-identical
 * strings (Latin "a" vs Cyrillic "а", Greek "ο" vs Latin "o", etc.).
 * For a search engine whose entire purpose is correct Unicode
 * transliterations, we must be able to:
 *   1. Detect when a user query contains confusable characters.
 *   2. Warn when a result may be a lookalike of a canonical name.
 *   3. Map lookalikes back to canonical Latin forms where possible.
 */

/**
 * Map from confusable character → canonical ASCII/Latin equivalent.
 * This is intentionally conservative: only map characters that are
 * visually identical to a Latin letter in common sans-serif fonts.
 */
const CONFUSABLE_TO_ASCII = new Map([
  // Latin lookalikes
  ['0', 'o'],
  ['1', 'l'],
  ['!', 'i'],
  ['|', 'l'],
  ['¡', 'i'],
  // Greek
  ['α', 'a'],
  ['β', 'b'],
  ['γ', 'y'],
  ['δ', 'd'],
  ['ε', 'e'],
  ['ζ', 'z'],
  ['η', 'n'],
  ['θ', 'o'],
  ['ι', 'i'],
  ['κ', 'k'],
  ['λ', 'l'],
  ['μ', 'u'],
  ['ν', 'v'],
  ['ξ', 'x'],
  ['ο', 'o'],
  ['π', 'p'],
  ['ρ', 'p'],
  ['σ', 'o'],
  ['ς', 's'],
  ['τ', 't'],
  ['υ', 'u'],
  ['φ', 'o'],
  ['χ', 'x'],
  ['ψ', 'u'],
  ['ω', 'w'],
  // Cyrillic
  ['а', 'a'],
  ['б', 'b'],
  ['в', 'b'],
  ['г', 'r'],
  ['д', 'a'],
  ['е', 'e'],
  ['ё', 'e'],
  ['ж', 'x'],
  ['з', '3'],
  ['и', 'u'],
  ['й', 'u'],
  ['к', 'k'],
  ['л', 'n'],
  ['м', 'm'],
  ['н', 'n'],
  ['о', 'o'],
  ['п', 'n'],
  ['р', 'p'],
  ['с', 'c'],
  ['т', 't'],
  ['у', 'y'],
  ['ф', 'f'],
  ['х', 'x'],
  ['ц', 'u'],
  ['ч', '4'],
  ['ш', 'w'],
  ['щ', 'w'],
  ['ъ', 'b'],
  ['ы', 'bl'],
  ['ь', 'b'],
  ['э', '3'],
  ['ю', 'io'],
  ['я', 'r'],
  // Armenian / Georgian / other common scripts that visually collide
  ['ա', 'a'],
  ['ბ', 'b'],
  ['გ', 'g'],
  ['დ', 'd'],
  ['ე', 'e'],
  ['ვ', 'v'],
  ['ზ', 'z'],
  ['თ', 't'],
  ['ი', 'i'],
  ['კ', 'k'],
  ['ლ', 'l'],
  ['მ', 'm'],
  ['ნ', 'n'],
  ['ო', 'o'],
  ['პ', 'p'],
  ['ჟ', 'j'],
  ['რ', 'r'],
  ['ს', 's'],
  ['ტ', 't'],
  ['უ', 'u'],
  ['ფ', 'p'],
  ['ქ', 'k'],
  ['ღ', 'g'],
  ['ყ', 'q'],
  ['შ', 'w'],
  ['ჩ', 'ch'],
  ['ც', 'c'],
  ['ძ', 'z'],
  ['წ', 'ts'],
  ['ჭ', 'ch'],
  ['ხ', 'x'],
  ['ჯ', 'j'],
  ['ჰ', 'h'],
]);

const _ASCII_CHARS = new Set(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._'.split('')
);

/**
 * Return true if a string contains any non-ASCII characters.
 */
function hasNonAscii(str) {
  for (const ch of String(str)) {
    if (ch.charCodeAt(0) > 127) return true;
  }
  return false;
}

/**
 * Count confusable characters in a string and return the canonical ASCII fold.
 */
function analyzeConfusables(str) {
  const s = String(str);
  let confusableCount = 0;
  let canonical = '';
  const found = [];

  for (const ch of s) {
    const mapped = CONFUSABLE_TO_ASCII.get(ch);
    if (mapped) {
      confusableCount++;
      canonical += mapped;
      if (!found.includes(ch)) found.push(ch);
    } else {
      canonical += ch;
    }
  }

  return {
    hasConfusables: confusableCount > 0,
    confusableCount,
    canonical,
    found,
    risk: confusableCount / Math.max(s.length, 1),
  };
}

/**
 * Compare two strings after folding confusables to ASCII.
 * Returns 0–1 similarity (1 = identical after folding).
 */
function foldedSimilarity(a, b) {
  const fa = analyzeConfusables(a).canonical.toLowerCase();
  const fb = analyzeConfusables(b).canonical.toLowerCase();
  if (fa === fb) return 1;
  const max = Math.max(fa.length, fb.length);
  if (max === 0) return 0;
  // Character-level match count
  let matches = 0;
  for (let i = 0; i < Math.min(fa.length, fb.length); i++) {
    if (fa[i] === fb[i]) matches++;
  }
  return matches / max;
}

/**
 * Given a query and a list of candidate canonical names, find the best
 * canonical match after confusable folding.
 */
function findCanonicalLookalike(query, candidates) {
  let best = null;
  let bestScore = 0;
  const q = String(query).toLowerCase();
  for (const c of candidates) {
    const score = foldedSimilarity(q, String(c).toLowerCase());
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore >= 0.85 ? { canonical: best, score: bestScore } : null;
}

module.exports = {
  hasNonAscii,
  analyzeConfusables,
  foldedSimilarity,
  findCanonicalLookalike,
  CONFUSABLE_TO_ASCII,
};
