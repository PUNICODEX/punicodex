/**
 * Embed Sites — Generate vector embeddings for semantic search.
 *
 * Uses Xenova/all-MiniLM-L6-v2 (384-dim) for local, free embedding generation.
 * Stores Float32Array embeddings as BLOB in SQLite.
 */
const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, '..', 'db', 'punycodex.db');
const MODEL = 'Xenova/all-MiniLM-L6-v2';

function serializeEmbedding(floatArray) {
  // Only capture the actual view, not the entire underlying buffer
  return Buffer.from(floatArray.buffer, floatArray.byteOffset, floatArray.byteLength);
}

function deserializeEmbedding(buf) {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

function cosineSimilarity(a, b) {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

async function embedSites() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  console.log(`🧠 Loading embedding model: ${MODEL}...`);
  const { pipeline } = require('@xenova/transformers');
  const embedder = await pipeline('feature-extraction', MODEL, {
    quantized: true, // Use quantized model for faster inference
  });
  console.log('   Model loaded.\n');

  const sites = db
    .prepare(`
    SELECT s.id, s.domain, s.punycode, s.title, s.description, s.h1, s.first_p, s.content_snippet, s.content_hash
    FROM indexed_sites s
    WHERE s.status = 'active'
  `)
    .all();

  console.log(`Embedding ${sites.length} sites...\n`);

  const insertStmt = db.prepare(`
    INSERT INTO embeddings (site_id, embedding, model_version, content_hash)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(site_id) DO UPDATE SET
      embedding = excluded.embedding,
      model_version = excluded.model_version,
      content_hash = excluded.content_hash,
      created_at = datetime('now')
  `);

  const BATCH_SIZE = 32;
  let embedded = 0;
  const startTime = Date.now();

  for (let i = 0; i < sites.length; i += BATCH_SIZE) {
    const batch = sites.slice(i, i + BATCH_SIZE);

    // Build text for each site from all available fields
    const texts = batch.map((site) => {
      const parts = [
        site.title,
        site.description,
        site.h1,
        site.first_p,
        site.content_snippet,
      ].filter(Boolean);
      const text = parts.join('. ').trim();
      // If still very short, include the domain name as context
      return (text.length > 10 ? text : `${site.domain}. ${site.punycode}`).substring(0, 512);
    });

    // Generate embeddings
    const outputs = await embedder(texts, { pooling: 'mean', normalize: true });

    // Store in database
    db.transaction(() => {
      for (let j = 0; j < batch.length; j++) {
        const site = batch[j];
        const vec = outputs[j].data; // Float32Array
        const buf = serializeEmbedding(vec);
        insertStmt.run(site.id, buf, MODEL, site.content_hash || '');
        embedded++;
      }
    })();

    if (embedded % 100 === 0 || embedded === sites.length) {
      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`  ... ${embedded}/${sites.length} embedded (${elapsed.toFixed(1)}s)`);
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\n✅ Embedding complete: ${embedded} sites in ${totalTime.toFixed(1)}s`);

  // Quick sanity check: test similarity on a sample pair
  const sample = db
    .prepare(`
    SELECT e.site_id, s.punycode, e.embedding
    FROM embeddings e
    JOIN indexed_sites s ON e.site_id = s.id
    WHERE s.pantheon = 'greek'
    LIMIT 2
  `)
    .all();

  if (sample.length === 2) {
    const a = deserializeEmbedding(sample[0].embedding);
    const b = deserializeEmbedding(sample[1].embedding);
    const sim = cosineSimilarity(a, b);
    console.log(
      `   Sample similarity (${sample[0].punycode} ↔ ${sample[1].punycode}): ${sim.toFixed(3)}`
    );
  }

  db.close();
}

if (require.main === module) {
  embedSites().catch((err) => {
    console.error('Embedding failed:', err);
    process.exit(1);
  });
}

module.exports = { embedSites, cosineSimilarity, deserializeEmbedding };
