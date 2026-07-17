/**
 * PUNICODEX — Threat Reputation Model (Phase 8)
 *
 * Computes a 0–1 reputation score for a threat event based on source
 * authority, cluster size, domain age, and time decay.
 */

const { getDb } = require('../db/connection.js');
const { migrateThreatGraph } = require('./threat-stream.js');
const { countClusterMembers } = require('./clustering.js');

const SOURCE_WEIGHTS = {
  openphish: 0.9,
  phishtank: 0.9,
  urlhaus: 0.9,
  'user-report': 0.7,
  crawler: 0.4,
  'ct-log': 0.5,
  'partner-feed': 0.6,
  unknown: 0.3,
};

function sourceWeight(source) {
  const key = String(source || '').toLowerCase();
  return SOURCE_WEIGHTS[key] ?? SOURCE_WEIGHTS.unknown;
}

function clusterSizeBoost(clusterSize) {
  if (clusterSize >= 20) return 0.25;
  if (clusterSize >= 10) return 0.15;
  if (clusterSize >= 5) return 0.1;
  if (clusterSize >= 2) return 0.05;
  return 0;
}

function domainAgeScore(_domainAgeDays) {
  // Placeholder for DNS/WHOIS derived domain age.
  // Newly registered domains are riskier, so a low age returns a higher score.
  return 0;
}

function timeDecay(daysSinceSeen) {
  return Math.exp(-daysSinceSeen / 30);
}

function computeReputation(event, cluster) {
  const sourceScore = sourceWeight(event.source);
  const size = cluster ? cluster.size || 1 : 1;
  const sizeScore = clusterSizeBoost(size);
  const agePenalty = domainAgeScore(event.domainAgeDays);

  const now = new Date();
  const seen = new Date(event.discoveredAt || now);
  const daysSinceSeen = Math.max(0, (now.getTime() - seen.getTime()) / (1000 * 60 * 60 * 24));
  const decay = timeDecay(daysSinceSeen);

  const raw = sourceScore + sizeScore + agePenalty;
  const normalized = Math.min(1, Math.max(0, raw));
  return Number((normalized * decay).toFixed(6));
}

function rescoreAll(db = getDb()) {
  migrateThreatGraph(db);
  const relationships = db.prepare('SELECT * FROM spoof_relationships').all();
  const update = db.prepare(`
    UPDATE spoof_relationships
    SET reputation_score = @score
    WHERE id = @id
  `);
  const clusterCache = new Map();

  const results = [];
  for (const row of relationships) {
    let cluster = clusterCache.get(row.cluster_id);
    if (row.cluster_id && cluster === undefined) {
      const clusterRow = db
        .prepare('SELECT * FROM clusters WHERE id = @id')
        .get({ id: row.cluster_id });
      cluster = clusterRow ? { ...clusterRow, size: countClusterMembers(clusterRow.id, db) } : null;
      clusterCache.set(row.cluster_id, cluster);
    }

    const event = {
      source: row.source,
      discoveredAt: row.discovered_at,
      domainAgeDays: null,
    };
    const score = computeReputation(event, cluster);
    update.run({ score, id: row.id });
    results.push({ id: row.id, score });
  }
  return results;
}

module.exports = {
  computeReputation,
  rescoreAll,
  sourceWeight,
  clusterSizeBoost,
  timeDecay,
  domainAgeScore,
};
