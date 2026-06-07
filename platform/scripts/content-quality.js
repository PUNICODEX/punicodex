/**
 * Content Quality Scoring (Phase 3)
 * Readability (Flesch-Kincaid), freshness decay, duplicate detection (simhash).
 */

/**
 * Count syllables in a word using a simple heuristic.
 */
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/**
 * Calculate Flesch Reading Ease score.
 * Higher = easier to read. 90-100 = very easy, 0-30 = very difficult.
 */
function fleschReadingEase(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (sentences.length === 0 || words.length === 0) return 0;

  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = words.reduce((sum, w) => sum + countSyllables(w), 0) / words.length;

  return 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
}

/**
 * Calculate Flesch-Kincaid Grade Level.
 * Returns approximate US school grade level.
 */
function fleschKincaidGrade(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (sentences.length === 0 || words.length === 0) return 0;

  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = words.reduce((sum, w) => sum + countSyllables(w), 0) / words.length;

  return (0.39 * avgSentenceLength) + (11.8 * avgSyllablesPerWord) - 15.59;
}

/**
 * Calculate freshness score based on published date.
 * 1.0 = very fresh, 0.0 = very stale.
 */
function freshnessScore(publishedDate) {
  if (!publishedDate) return 0.5; // Unknown = neutral

  const now = new Date();
  const pub = new Date(publishedDate);
  if (isNaN(pub.getTime())) return 0.5;

  const daysDiff = (now - pub) / (1000 * 60 * 60 * 24);

  if (daysDiff <= 30) return 1.0;
  if (daysDiff <= 90) return 0.85;
  if (daysDiff <= 180) return 0.7;
  if (daysDiff <= 365) return 0.55;
  if (daysDiff <= 730) return 0.4;
  return 0.25;
}

/**
 * Simple simhash for duplicate content detection.
 * Returns a 64-bit hash string.
 */
function simhash(text) {
  // Simple tokenization
  const tokens = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);

  // Count token frequencies
  const freq = {};
  for (const t of tokens) {
    freq[t] = (freq[t] || 0) + 1;
  }

  // Build hash vector
  const vector = new Array(64).fill(0);

  for (const [token, count] of Object.entries(freq)) {
    const hash = djb2Hash(token);
    for (let i = 0; i < 64; i++) {
      const bit = (hash >> i) & 1;
      vector[i] += bit ? count : -count;
    }
  }

  // Build final hash
  let result = 0n;
  for (let i = 0; i < 64; i++) {
    if (vector[i] > 0) {
      result |= 1n << BigInt(i);
    }
  }

  return result.toString(16).padStart(16, '0');
}

function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash >>> 0; // Convert to unsigned 32-bit
}

/**
 * Hamming distance between two simhash strings.
 */
function hammingDistance(hash1, hash2) {
  const h1 = BigInt('0x' + hash1);
  const h2 = BigInt('0x' + hash2);
  let xor = h1 ^ h2;
  let distance = 0;
  while (xor !== 0n) {
    distance++;
    xor &= xor - 1n;
  }
  return distance;
}

/**
 * Check if two texts are likely duplicates.
 * Threshold: hamming distance < 3 means very similar/duplicate.
 */
function isDuplicate(text1, text2, threshold = 3) {
  const h1 = simhash(text1);
  const h2 = simhash(text2);
  return hammingDistance(h1, h2) <= threshold;
}

/**
 * Compute all content quality metrics for a crawled site.
 */
function computeContentQuality(site) {
  const text = [
    site.title || '',
    site.description || '',
    site.h1 || '',
    site.first_p || '',
    site.content_snippet || ''
  ].join('. ');

  const flesch = fleschReadingEase(text);
  const grade = fleschKincaidGrade(text);
  const fresh = freshnessScore(site.published_date);
  const sim = simhash(text);

  // Normalize readability to 0-1 score (higher = better)
  // Flesch 0-100 range: clamp and invert (higher ease = better)
  const readabilityScore = Math.min(Math.max(flesch / 100, 0), 1);

  return {
    flesch_reading_ease: parseFloat(flesch.toFixed(2)),
    flesch_kincaid_grade: parseFloat(grade.toFixed(2)),
    freshness_score: parseFloat(fresh.toFixed(3)),
    readability_score: parseFloat(readabilityScore.toFixed(3)),
    simhash: sim,
    word_count: text.split(/\s+/).filter(w => w.length > 0).length
  };
}

module.exports = {
  fleschReadingEase,
  fleschKincaidGrade,
  freshnessScore,
  simhash,
  hammingDistance,
  isDuplicate,
  computeContentQuality,
  countSyllables
};
