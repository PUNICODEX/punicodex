/**
 * PageRank Computation
 *
 * Computes authority scores for all indexed sites using:
 * 1. Iterative PageRank on the link graph (nofollow links excluded from flow)
 * 2. Authority score = blended signal of PageRank + incoming links + quality
 */
const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, '..', 'db', 'punycodex.db');
const DAMPING = 0.85;
const CONVERGENCE = 0.0001;
const MAX_ITERATIONS = 100;

function computePageRank(db) {
  console.log('🔗 Computing PageRank...\n');

  // Get all active sites
  const sites = db
    .prepare(
      "SELECT id, domain, punycode, quality_score FROM indexed_sites WHERE status = 'active'"
    )
    .all();
  if (sites.length === 0) {
    console.log('No active sites to rank.');
    return;
  }

  const _siteIds = sites.map((s) => s.id);
  const idToIndex = new Map();
  sites.forEach((s, i) => idToIndex.set(s.id, i));
  const n = sites.length;

  // Get all follow links between active sites
  const links = db
    .prepare(`
    SELECT from_site_id, to_site_id
    FROM links
    WHERE nofollow = 0
      AND from_site_id IN (SELECT id FROM indexed_sites WHERE status = 'active')
      AND to_site_id IN (SELECT id FROM indexed_sites WHERE status = 'active')
  `)
    .all();

  // Build adjacency list and out-degree count
  const adjacency = new Array(n).fill(null).map(() => []);
  const outDegree = new Array(n).fill(0);

  for (const link of links) {
    const fromIdx = idToIndex.get(link.from_site_id);
    const toIdx = idToIndex.get(link.to_site_id);
    if (fromIdx === undefined || toIdx === undefined) continue;
    adjacency[fromIdx].push(toIdx);
    outDegree[fromIdx]++;
  }

  // Initialize PageRank uniformly
  let pr = new Array(n).fill(1.0 / n);
  let newPr = new Array(n);

  // Iterative computation
  let iteration = 0;
  let maxDelta = Infinity;

  while (iteration < MAX_ITERATIONS && maxDelta > CONVERGENCE) {
    maxDelta = 0;
    const danglingSum = pr.reduce((sum, rank, i) => (outDegree[i] === 0 ? sum + rank : sum), 0);

    for (let i = 0; i < n; i++) {
      let incoming = 0;
      // Sum contributions from all pages that link to i
      for (let j = 0; j < n; j++) {
        if (outDegree[j] > 0 && adjacency[j].includes(i)) {
          incoming += pr[j] / outDegree[j];
        }
      }

      newPr[i] = (1 - DAMPING) / n + DAMPING * incoming + (DAMPING * danglingSum) / n;

      const delta = Math.abs(newPr[i] - pr[i]);
      if (delta > maxDelta) maxDelta = delta;
    }

    [pr, newPr] = [newPr, pr]; // Swap arrays
    iteration++;
  }

  console.log(`  Iterations: ${iteration}`);
  console.log(`  Final max delta: ${maxDelta.toExponential(3)}`);
  console.log(`  Links in graph: ${links.length}`);
  console.log(`  Sites in graph: ${n}\n`);

  // Normalize PageRank to 0-100 scale for easier ranking math
  const maxPr = Math.max(...pr);
  const minPr = Math.min(...pr);
  const range = maxPr - minPr || 1;

  // Update database
  const updatePr = db.prepare(
    'UPDATE indexed_sites SET pagerank = ?, authority_score = ? WHERE id = ?'
  );
  const updateIncoming = db.prepare(
    'UPDATE indexed_sites SET incoming_links = (SELECT COUNT(*) FROM links WHERE to_site_id = ? AND nofollow = 0) WHERE id = ?'
  );

  let updated = 0;
  db.transaction(() => {
    for (let i = 0; i < n; i++) {
      const site = sites[i];
      const normalizedPr = ((pr[i] - minPr) / range) * 100;

      // Update incoming link count first
      updateIncoming.run(site.id, site.id);

      // Get fresh incoming count
      const incomingRow = db
        .prepare('SELECT incoming_links FROM indexed_sites WHERE id = ?')
        .get(site.id);
      const incoming = incomingRow ? incomingRow.incoming_links : 0;

      // Authority score blends: PageRank (40%), incoming links (30%), quality (30%)
      const linkSignal = Math.min(incoming / 10, 1.0) * 100; // Cap at 10 incoming links = max
      const qualitySignal = (site.quality_score || 0.5) * 100;
      const authority = normalizedPr * 0.4 + linkSignal * 0.3 + qualitySignal * 0.3;

      updatePr.run(normalizedPr, authority, site.id);
      updated++;
    }
  })();

  // Stats
  const stats = db
    .prepare(`
    SELECT
      MIN(pagerank) as min_pr,
      MAX(pagerank) as max_pr,
      AVG(pagerank) as avg_pr,
      MIN(authority_score) as min_auth,
      MAX(authority_score) as max_auth,
      AVG(authority_score) as avg_auth,
      SUM(incoming_links) as total_links
    FROM indexed_sites
    WHERE status = 'active'
  `)
    .get();

  console.log('✅ PageRank updated:');
  console.log(`   Sites updated: ${updated}`);
  console.log(
    `   PageRank range: ${stats.min_pr.toFixed(2)} → ${stats.max_pr.toFixed(2)} (avg ${stats.avg_pr.toFixed(2)})`
  );
  console.log(
    `   Authority range: ${stats.min_auth.toFixed(2)} → ${stats.max_auth.toFixed(2)} (avg ${stats.avg_auth.toFixed(2)})`
  );
  console.log(`   Total follow links: ${stats.total_links}\n`);
}

// Main
if (require.main === module) {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  try {
    computePageRank(db);
  } catch (e) {
    console.error('PageRank computation failed:', e);
    process.exit(1);
  } finally {
    db.close();
  }
}

module.exports = { computePageRank };
