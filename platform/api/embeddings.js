/**
 * PUNYCODEX Embeddings — semantic vector layer for search and archetype scoring.
 *
 * Loads the Xenova/all-MiniLM-L6-v2 model once at startup, caches site embeddings
 * in memory, and provides fast cosine-similarity search over the indexed corpus.
 * Embeddings are persisted to the SQLite `embeddings` table for durability and
 * fast cold-start reload.
 */

const Database = require('better-sqlite3');
const { pipeline } = require('@xenova/transformers');
const { getDbPath } = require('../db/db');

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384;

let db;
let embedderPromise = null;
let embeddingCache = null; // Map<siteId, Float32Array>

function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
  }
  return db;
}

/**
 * Load (or return the existing) embedding pipeline.
 * The first call downloads/initializes the model; subsequent calls reuse it.
 */
function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = pipeline('feature-extraction', MODEL_NAME, {
      quantized: true,
    });
  }
  return embedderPromise;
}

/**
 * Extract a plain-text corpus from a site row for embedding.
 */
function siteCorpus(site) {
  const parts = [
    site.title || '',
    site.description || '',
    site.h1 || '',
    site.first_p || '',
    site.og_description || '',
    site.twitter_description || '',
    site.meta_keywords || '',
    site.tenant_name || '',
    site.tenant_category || '',
    site.tenant_front_url || '',
  ];
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Embed arbitrary text into a 384-dim Float32Array.
 */
async function embedText(text) {
  const extractor = await getEmbedder();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return new Float32Array(output.data);
}

/**
 * Embed a site row (title/description/content/tenant metadata).
 */
async function embedSite(site) {
  const corpus = siteCorpus(site);
  if (!corpus) return null;
  return embedText(corpus);
}

/**
 * Serialize a Float32Array to a Buffer for SQLite storage.
 */
function embeddingToBuffer(vec) {
  return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
}

/**
 * Deserialize a Buffer/Uint8Array to a Float32Array.
 */
function bufferToEmbedding(buf) {
  if (!buf) return null;
  const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  if (buffer.length !== EMBEDDING_DIM * 4) {
    return null;
  }
  return new Float32Array(buffer.buffer, buffer.byteOffset, EMBEDDING_DIM);
}

/**
 * Persist a site embedding and refresh the in-memory cache.
 */
async function upsertSiteEmbedding(siteId, site) {
  const vector = await embedSite(site);
  if (!vector) return null;

  const dbConn = getDb();
  dbConn
    .prepare(
      `
      INSERT INTO embeddings (site_id, embedding, model)
      VALUES (?, ?, ?)
      ON CONFLICT(site_id) DO UPDATE SET
        embedding = excluded.embedding,
        model = excluded.model,
        created_at = CURRENT_TIMESTAMP
    `
    )
    .run(siteId, embeddingToBuffer(vector), MODEL_NAME);

  ensureCache();
  embeddingCache.set(siteId, vector);
  return vector;
}

/**
 * Load an embedding directly from the database.
 */
function getSiteEmbedding(siteId) {
  ensureCache();
  if (embeddingCache.has(siteId)) return embeddingCache.get(siteId);

  const row = getDb().prepare('SELECT embedding FROM embeddings WHERE site_id = ?').get(siteId);
  if (!row) return null;

  const vec = bufferToEmbedding(row.embedding);
  if (vec) embeddingCache.set(siteId, vec);
  return vec;
}

/**
 * Build the in-memory embedding cache from SQLite.
 */
function ensureCache() {
  if (embeddingCache) return;
  embeddingCache = new Map();

  const rows = getDb().prepare('SELECT site_id, embedding FROM embeddings ORDER BY site_id').all();
  for (const row of rows) {
    const vec = bufferToEmbedding(row.embedding);
    if (vec) embeddingCache.set(row.site_id, vec);
  }
}

/**
 * Cosine similarity between two normalized vectors.
 * Both inputs are assumed to be unit vectors (Xenova normalize=true).
 */
function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

/**
 * Find the top-k most similar sites for a query embedding.
 * Returns [{ siteId, score }] sorted descending by similarity.
 */
function findSimilarSites(queryEmbedding, k = 10, excludeSiteIds = new Set()) {
  ensureCache();
  const scores = [];
  for (const [siteId, vec] of embeddingCache.entries()) {
    if (excludeSiteIds.has(siteId)) continue;
    const score = cosineSimilarity(queryEmbedding, vec);
    scores.push({ siteId, score });
  }
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, k);
}

/**
 * Compute semantic similarity between a query string and a site row.
 */
async function similarityForSite(query, site) {
  const [queryVec, siteVec] = await Promise.all([embedText(query), embedSite(site)]);
  if (!queryVec || !siteVec) return 0;
  return cosineSimilarity(queryVec, siteVec);
}

/**
 * Warm the embedding cache and backfill missing embeddings for active sites.
 */
async function warmEmbeddings() {
  const dbConn = getDb();
  const sites = dbConn
    .prepare(
      `
      SELECT s.* FROM indexed_sites s
      WHERE s.status = 'active'
      AND s.id NOT IN (SELECT site_id FROM embeddings)
    `
    )
    .all();

  let processed = 0;
  for (const site of sites) {
    try {
      await upsertSiteEmbedding(site.id, site);
      processed++;
    } catch (err) {
      console.error(`Failed to embed site ${site.id}/${site.domain}:`, err.message);
    }
  }
  return { total: sites.length, processed };
}

/**
 * Reset the in-memory cache (useful after bulk imports in long-running processes).
 */
function clearCache() {
  embeddingCache = null;
}

module.exports = {
  embedText,
  embedSite,
  upsertSiteEmbedding,
  getSiteEmbedding,
  findSimilarSites,
  similarityForSite,
  cosineSimilarity,
  warmEmbeddings,
  clearCache,
  EMBEDDING_DIM,
  MODEL_NAME,
};
