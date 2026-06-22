/**
 * PÚNYCODEX — Confusable Atlas V2
 *
 * A structured, multi-dimensional map of Unicode characters that can be used
 * to impersonate Latin/ASCII names. It powers the skeleton-fold similarity
 * check behind the Authenticity Checker.
 *
 * The atlas loads its character database from platform/db/confusables.json and
 * remains backward-compatible with the V1 API.
 */

const path = require('node:path');
const { analyzeConfusables } = require('./confusables');
const { renderedSimilarity } = require('./glyph-renderer');

const CONFUSABLE_DB = require(path.join(__dirname, '..', 'db', 'confusables.json'));

/**
 * Map from confusable character → canonical ASCII/Latin equivalent(s).
 * Multi-character values (e.g., Cyrillic ы → "bl") are allowed.
 */
const CONFUSABLE_TO_ASCII = new Map(
  CONFUSABLE_DB.entries.map((entry) => [entry.char, entry.target])
);

// LRU cache for buildSkeleton. Inputs are short strings, but the same
// protected-identity candidates are compared against thousands of inputs, so
// caching skeletons removes the dominant repeated work from findCanonicalMatch.
const SKELETON_CACHE_LIMIT = 20000;
const skeletonCache = new Map();

function getCachedSkeleton(str) {
  const key = String(str);
  if (skeletonCache.has(key)) {
    // Move to end for LRU eviction ordering.
    const value = skeletonCache.get(key);
    skeletonCache.delete(key);
    skeletonCache.set(key, value);
    return value;
  }
  const value = buildSkeletonUncached(key);
  if (skeletonCache.size >= SKELETON_CACHE_LIMIT) {
    const firstKey = skeletonCache.keys().next().value;
    skeletonCache.delete(firstKey);
  }
  skeletonCache.set(key, value);
  return value;
}

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
function buildSkeletonUncached(str) {
  // Replace known confusable characters first, before NFKC expansion, so that
  // parenthesized / squared / enclosed letter forms fold to their plain letter
  // rather than expanding to punctuation + letter. Then run NFKC and apply the
  // map again so that compatibility-normalized digits (e.g., fullwidth １ → 1)
  // still fold to their ASCII confusable target (1 → l).
  let skeleton = '';
  for (const ch of String(str)) {
    skeleton += CONFUSABLE_TO_ASCII.get(ch) ?? ch;
  }

  skeleton = skeleton.normalize('NFKC');

  let post = '';
  for (const ch of skeleton) {
    post += CONFUSABLE_TO_ASCII.get(ch) ?? ch;
  }
  skeleton = post;

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

function buildSkeleton(str) {
  return getCachedSkeleton(str);
}

/**
 * Compute a 0–1 visual similarity between two strings using skeleton fold.
 */
function skeletonSimilarity(a, b) {
  const sa = getCachedSkeleton(a);
  const sb = getCachedSkeleton(b);
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

function rawCharSimilarity(a, b) {
  const sa = String(a).normalize('NFKC');
  const sb = String(b).normalize('NFKC');
  const charsA = [...sa];
  const charsB = [...sb];
  const max = Math.max(charsA.length, charsB.length);
  if (max === 0) return 1;
  const min = Math.min(charsA.length, charsB.length);
  let matches = 0;
  for (let i = 0; i < min; i++) {
    if (charsA[i] === charsB[i]) matches++;
  }
  return matches / max;
}

/**
 * Compute a perceptual similarity that combines skeleton folding, rendered
 * similarity, and raw character equality. The raw penalty ensures that
 * purely stylistic variants (e.g., 𝒜pple vs apple) are not scored as
 * identical even though they fold to the same ASCII form.
 *
 * Options:
 *   - weightSkeleton (number, default 0.45)
 *   - weightRendered (number, default 0.45)
 *   - weightRaw (number, default 0.10)
 */
function perceptualSimilarity(a, b, options = {}) {
  const { weightSkeleton = 0.45, weightRendered = 0.45, weightRaw = 0.1 } = options;
  const skeleton = skeletonSimilarity(a, b);
  const rendered = renderedSimilarity(a, b);
  const raw = rawCharSimilarity(a, b);
  return skeleton * weightSkeleton + rendered * weightRendered + raw * weightRaw;
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
  renderedSimilarity,
  levenshtein,
  findCanonicalLookalike,
  analyzeWithAtlas,
  perceptualSimilarity,
};
