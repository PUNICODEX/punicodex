/**
 * PÚNYCODEX — Confusable Atlas
 *
 * A structured, multi-dimensional map of Unicode characters that can be used
 * to impersonate Latin/ASCII names. It powers the skeleton-fold similarity
 * check behind the Authenticity Checker.
 *
 * The atlas is intentionally conservative: a character is only considered
 * confusable if it is visually identical or near-identical to a Latin letter
 * in common sans-serif fonts.
 */

const { analyzeConfusables } = require('./confusables');

/**
 * Map from confusable character → canonical ASCII/Latin equivalent(s).
 * Multi-character values (e.g., Cyrillic ы → "bl") are allowed.
 */
const CONFUSABLE_TO_ASCII = new Map([
  // Latin lookalikes
  ['0', 'o'],
  ['1', 'l'],
  ['!', 'i'],
  ['|', 'l'],
  ['¡', 'i'],
  ['Ɩ', 'l'],
  ['׀', 'l'],
  ['∣', 'l'],
  ['⼁', 'l'],
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
  // Armenian
  ['ա', 'a'],
  ['բ', 'b'],
  ['գ', 'g'],
  ['դ', 'd'],
  ['ե', 'e'],
  ['զ', 'z'],
  ['է', 'e'],
  ['ը', 'e'],
  ['թ', 't'],
  ['ժ', 'zh'],
  ['ի', 'i'],
  ['լ', 'l'],
  ['խ', 'kh'],
  ['ծ', 'ts'],
  ['կ', 'k'],
  ['հ', 'h'],
  ['ձ', 'dz'],
  ['ղ', 'gh'],
  ['ճ', 'ch'],
  ['մ', 'm'],
  ['յ', 'y'],
  ['ն', 'n'],
  ['շ', 'sh'],
  ['ո', 'vo'],
  ['չ', 'ch'],
  ['պ', 'p'],
  ['ջ', 'j'],
  ['ռ', 'r'],
  ['ս', 's'],
  ['վ', 'v'],
  ['տ', 't'],
  ['ր', 'r'],
  ['ց', 'ts'],
  ['ւ', 'w'],
  ['փ', 'p'],
  ['ք', 'k'],
  ['օ', 'o'],
  ['ֆ', 'f'],
  // Georgian
  ['ა', 'a'],
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

/**
 * Contextual substitutions: pairs or short sequences that look like another
 * character when rendered.
 */
const CONTEXTUAL_SUBSTITUTIONS = [
  { pattern: 'rn', replacement: 'm' },
  { pattern: 'vv', replacement: 'w' },
  { pattern: 'cl', replacement: 'd' },
  { pattern: 'nn', replacement: 'm' },
  { pattern: 'ii', replacement: 'n' },
  { pattern: 'lI', replacement: 'U' },
];

/**
 * Risk score for pairs of scripts appearing together in one label.
 * Higher = more dangerous. Latin paired with itself is safe (0).
 */
const SCRIPT_RISK_MATRIX = new Map([
  ['Latin|Latin', 0],
  ['Latin|Greek', 0.6],
  ['Latin|Cyrillic', 0.9],
  ['Latin|Armenian', 0.7],
  ['Latin|Georgian', 0.7],
  ['Latin|Arabic', 0.8],
  ['Latin|Devanagari', 0.6],
  ['Latin|CJK', 0.5],
  ['Greek|Cyrillic', 0.7],
  ['Cyrillic|Greek', 0.7],
]);

function getScriptRisk(scriptA, scriptB) {
  if (!scriptA || !scriptB || scriptA === scriptB) return 0;
  const key = `${scriptA}|${scriptB}`;
  const reverse = `${scriptB}|${scriptA}`;
  return SCRIPT_RISK_MATRIX.get(key) ?? SCRIPT_RISK_MATRIX.get(reverse) ?? 0.5;
}

/**
 * Fold a string to its Latin/ASCII skeleton by replacing confusable characters
 * and applying contextual substitutions. The skeleton is used for visual
 * similarity comparison.
 */
function buildSkeleton(str) {
  const s = String(str).normalize('NFKC');

  // Replace known confusable characters.
  let skeleton = '';
  for (const ch of s) {
    skeleton += CONFUSABLE_TO_ASCII.get(ch) ?? ch;
  }

  // Apply contextual substitutions.
  for (const { pattern, replacement } of CONTEXTUAL_SUBSTITUTIONS) {
    skeleton = skeleton.split(pattern).join(replacement);
  }

  // Strip diacritics from Latin letters.
  skeleton = skeleton
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC');

  return skeleton.toLowerCase();
}

/**
 * Compute a 0–1 visual similarity between two strings using skeleton fold.
 */
function skeletonSimilarity(a, b) {
  const sa = buildSkeleton(a);
  const sb = buildSkeleton(b);
  if (sa === sb) return 1;
  const max = Math.max(sa.length, sb.length);
  if (max === 0) return 0;
  const distance = levenshtein(sa, sb);
  return 1 - distance / max;
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const prev = new Array(n + 1);
  const curr = new Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }

  return curr[n];
}

/**
 * Find the best canonical candidate that is visually similar after skeleton
 * folding. Returns null if no candidate reaches the threshold.
 */
function findCanonicalLookalike(query, candidates, threshold = 0.85) {
  let best = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = skeletonSimilarity(query, String(candidate));
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return bestScore >= threshold ? { candidate: best, score: bestScore } : null;
}

/**
 * Analyze a string with the atlas and return a richer report than the legacy
 * confusables module.
 */
function analyzeWithAtlas(str) {
  const base = analyzeConfusables(str);
  const skeleton = buildSkeleton(str);
  return {
    ...base,
    skeleton,
    hasConfusables: base.hasConfusables || skeleton !== String(str).toLowerCase().normalize('NFKC'),
  };
}

module.exports = {
  CONFUSABLE_TO_ASCII,
  CONTEXTUAL_SUBSTITUTIONS,
  SCRIPT_RISK_MATRIX,
  getScriptRisk,
  buildSkeleton,
  skeletonSimilarity,
  findCanonicalLookalike,
  analyzeWithAtlas,
};
