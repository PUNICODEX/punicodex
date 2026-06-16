/**
 * Semantic Search — Vector embeddings for query understanding.
 *
 * Uses Xenova/all-MiniLM-L6-v2 (384-dim) for local embedding generation.
 * Hybrid search: FTS5 for recall + vector similarity for re-ranking.
 *
 * This module now delegates model lifecycle and in-memory vector caching to
 * platform/api/embeddings.js for a single, warmed embedding pipeline.
 */

const {
  embedText,
  findSimilarSites,
  getSiteEmbedding,
  cosineSimilarity,
  EMBEDDING_DIM,
} = require('./embeddings');

/**
 * Re-rank FTS results with vector similarity.
 *
 * Both FTS score and vector similarity are normalized to [0, 1] within the result set
 * before blending, preventing scale mismatch.
 */
function rerankWithVectors(ftsResults, queryEmbedding, alpha = 0.3) {
  if (!queryEmbedding || ftsResults.length === 0) return ftsResults;

  const similarities = new Map();
  for (const r of ftsResults) {
    const vec = getSiteEmbedding(r.id);
    if (vec) {
      similarities.set(r.id, cosineSimilarity(queryEmbedding, vec));
    }
  }

  if (similarities.size === 0) return ftsResults;

  // Normalize vector similarities to [0, 1] within this result set.
  let minSim = Infinity,
    maxSim = -Infinity;
  for (const sim of similarities.values()) {
    if (sim < minSim) minSim = sim;
    if (sim > maxSim) maxSim = sim;
  }
  const simRange = maxSim - minSim || 1;

  // Additive semantic boost: scale normalized vector similarity by alpha.
  return ftsResults
    .map((r) => {
      const hasEmbedding = similarities.has(r.id);
      const rawSim = hasEmbedding ? similarities.get(r.id) : minSim;
      const vectorNorm = hasEmbedding ? (rawSim - minSim) / simRange : 0;
      const semanticBonus = vectorNorm * alpha;

      const newRankScore = (r.rankScore || 0) + semanticBonus;
      return {
        ...r,
        semanticScore: vectorNorm,
        rankScore: newRankScore,
        scoreBreakdown: {
          ...r.scoreBreakdown,
          semantic: parseFloat(semanticBonus.toFixed(4)),
          total: parseFloat(newRankScore.toFixed(4)),
        },
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore);
}

/**
 * Pure vector search across ALL cached embeddings. Used as fallback when FTS returns nothing.
 * Returns array of { siteId, similarity } sorted by similarity DESC.
 */
function searchAllVectors(queryEmbedding, _dbInstance, limit = 20) {
  if (!queryEmbedding) return [];
  const results = findSimilarSites(queryEmbedding, limit);
  return results.map((r) => ({
    siteId: r.siteId,
    similarity: r.score,
    punycode: null,
  }));
}

/**
 * Compute similarities for given site IDs against query embedding.
 * Kept for backward compatibility; uses the in-memory cache.
 */
function computeSimilaritiesForSites(siteIds, queryEmbedding) {
  const similarities = new Map();
  for (const siteId of siteIds) {
    const vec = getSiteEmbedding(siteId);
    if (vec) {
      similarities.set(siteId, cosineSimilarity(queryEmbedding, vec));
    }
  }
  return similarities;
}

module.exports = {
  embedText,
  rerankWithVectors,
  searchAllVectors,
  computeSimilaritiesForSites,
  EMBEDDING_DIM,
};
