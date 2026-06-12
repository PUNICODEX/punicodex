/**
 * Semantic Search — Vector embeddings for query understanding.
 *
 * Uses Xenova/all-MiniLM-L6-v2 (384-dim) for local embedding generation.
 * Hybrid search: FTS5 for recall + vector similarity for re-ranking.
 */
const Database = require('better-sqlite3');
const path = require('path');
const { getDbPath } = require('../db/db');

const MODEL = 'Xenova/all-MiniLM-L6-v2';
let embedder = null;
let modelLoading = false;
let modelLoadError = null;

const DB_PATH = getDbPath();

async function getEmbedder() {
  if (embedder) return embedder;
  if (modelLoadError) throw modelLoadError;
  if (modelLoading) {
    while (modelLoading) await new Promise(r => setTimeout(r, 100));
    if (embedder) return embedder;
    throw modelLoadError || new Error('Model failed to load');
  }
  modelLoading = true;
  try {
    const { pipeline } = require('@xenova/transformers');
    embedder = await pipeline('feature-extraction', MODEL, { quantized: true });
    console.log('[semantic] Embedding model loaded');
  } catch (e) {
    modelLoadError = e;
    console.error('[semantic] Failed to load model:', e.message);
  } finally {
    modelLoading = false;
  }
  return embedder;
}

function deserializeEmbedding(buf) {
  if (buf instanceof Float32Array) return buf;
  const arr = new Uint8Array(buf);
  return new Float32Array(arr.buffer, arr.byteOffset, arr.byteLength / 4);
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

async function embedText(text) {
  const pipe = await getEmbedder();
  if (!pipe) return null;
  const output = await pipe(text.substring(0, 512), { pooling: 'mean', normalize: true });
  return output.data;
}

/**
 * Compute similarities for given site IDs against query embedding.
 * Accepts an optional db instance to avoid opening a new connection.
 */
function computeSimilaritiesForSites(siteIds, queryEmbedding, dbInstance) {
  if (!queryEmbedding || siteIds.length === 0) return new Map();

  const shouldClose = !dbInstance;
  const db = dbInstance || new Database(DB_PATH);
  if (shouldClose) db.pragma('journal_mode = WAL');

  const placeholders = siteIds.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT site_id, embedding
    FROM embeddings
    WHERE site_id IN (${placeholders})
  `).all(...siteIds);

  if (shouldClose) db.close();

  const similarities = new Map();
  for (const row of rows) {
    similarities.set(row.site_id, cosineSimilarity(queryEmbedding, deserializeEmbedding(row.embedding)));
  }
  return similarities;
}

/**
 * Pure vector search across ALL embeddings. Used as fallback when FTS returns nothing.
 * Returns array of { site_id, similarity } sorted by similarity DESC.
 */
function searchAllVectors(queryEmbedding, dbInstance, limit = 20) {
  if (!queryEmbedding) return [];

  const shouldClose = !dbInstance;
  const db = dbInstance || new Database(DB_PATH);
  if (shouldClose) db.pragma('journal_mode = WAL');

  const rows = db.prepare(`
    SELECT e.site_id, e.embedding, s.punycode
    FROM embeddings e
    JOIN indexed_sites s ON e.site_id = s.id
    WHERE s.status = 'active'
  `).all();

  if (shouldClose) db.close();

  const results = [];
  for (const row of rows) {
    const sim = cosineSimilarity(queryEmbedding, deserializeEmbedding(row.embedding));
    results.push({ siteId: row.site_id, similarity: sim, punycode: row.punycode });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, limit);
}

/**
 * Re-rank FTS results with vector similarity.
 *
 * Both FTS score and vector similarity are normalized to [0, 1] within the result set
 * before blending, preventing scale mismatch.
 */
function rerankWithVectors(ftsResults, queryEmbedding, alpha = 0.30) {
  if (!queryEmbedding || ftsResults.length === 0) return ftsResults;

  const similarities = computeSimilaritiesForSites(
    ftsResults.map(r => r.id), queryEmbedding
  );

  // Normalize vector similarities to [0, 1]
  let minSim = Infinity, maxSim = -Infinity;
  for (const sim of similarities.values()) {
    if (sim < minSim) minSim = sim;
    if (sim > maxSim) maxSim = sim;
  }
  const simRange = (maxSim - minSim) || 1;

  // Normalize FTS scores to [0, 1] (lower composite_score = better match)
  const ftsScores = ftsResults.map(r => r.rankScore || 0);
  const minFts = Math.min(...ftsScores);
  const maxFts = Math.max(...ftsScores);
  const ftsRange = (maxFts - minFts) || 1;

  return ftsResults.map(r => {
    const hasEmbedding = similarities.has(r.id);
    const rawSim = hasEmbedding ? similarities.get(r.id) : minSim;
    const vectorNorm = hasEmbedding ? ((rawSim - minSim) / simRange) : 0;

    // FTS: invert so lower score = higher normalized value
    const ftsNorm = 1 - ((r.rankScore - minFts) / ftsRange);

    // Blend both in [0, 1] range
    const finalScore = ftsNorm * (1 - alpha) + vectorNorm * alpha;

    return {
      ...r,
      semanticScore: vectorNorm,
      ftsNorm,
      finalScore,
      scoreBreakdown: {
        ...r.scoreBreakdown,
        semanticSimilarity: parseFloat(vectorNorm.toFixed(3)),
        ftsNormalized: parseFloat(ftsNorm.toFixed(3))
      }
    };
  }).sort((a, b) => b.finalScore - a.finalScore);
}

module.exports = {
  getEmbedder,
  embedText,
  rerankWithVectors,
  searchAllVectors,
  computeSimilaritiesForSites,
  cosineSimilarity,
  deserializeEmbedding
};
