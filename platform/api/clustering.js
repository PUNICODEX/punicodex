/**
 * PUNICODEX — Threat Clustering Engine (Phase 8)
 *
 * Groups spoof relationships into clusters by pattern, target identity,
 * ASN/nameserver, and time window.
 */

const { getDb } = require('../db/connection.js');
const { migrateThreatGraph, patternBase } = require('./threat-stream.js');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function withinWindow(d1, d2, windowMs = SEVEN_DAYS_MS) {
  const a = new Date(d1).getTime();
  const b = new Date(d2).getTime();
  return Number.isNaN(a) || Number.isNaN(b) || Math.abs(a - b) <= windowMs;
}

function clusterMatches(cluster, event) {
  if (cluster.pattern !== patternBase(event.input)) return false;
  if (cluster.target_identity_id !== (event.targetIdentityId || null)) return false;

  const meta = event.metadata || {};
  const hasSharedInfrastructure =
    (cluster.asn && meta.asn && cluster.asn === meta.asn) ||
    (cluster.nameserver && meta.nameserver && cluster.nameserver === meta.nameserver);
  const noInfrastructure = !cluster.asn && !cluster.nameserver && !meta.asn && !meta.nameserver;
  if (!hasSharedInfrastructure && !noInfrastructure) return false;

  return withinWindow(cluster.first_seen, event.discoveredAt);
}

function findCluster(event, db = getDb()) {
  migrateThreatGraph(db);
  const base = patternBase(event.input);
  const candidates = db
    .prepare(
      `
      SELECT * FROM clusters
      WHERE pattern = @pattern
        AND (target_identity_id IS @targetIdentityId OR target_identity_id = @targetIdentityId)
        AND status != 'false_positive'
      ORDER BY last_seen DESC
      LIMIT 50
    `
    )
    .all({
      pattern: base,
      targetIdentityId: event.targetIdentityId || null,
    });

  for (const candidate of candidates) {
    if (clusterMatches(candidate, event)) return candidate;
  }
  return null;
}

function createCluster(event, db = getDb()) {
  migrateThreatGraph(db);
  const meta = event.metadata || {};
  const base = patternBase(event.input);

  const stmt = db.prepare(`
    INSERT INTO clusters (
      first_seen, last_seen, target_identity_id, pattern,
      asn, nameserver, registrar, status, confidence
    )
    VALUES (
      @discoveredAt, @discoveredAt, @targetIdentityId, @pattern,
      @asn, @nameserver, @registrar, 'open', @confidence
    )
    RETURNING *
  `);
  return stmt.get({
    discoveredAt: event.discoveredAt || new Date().toISOString(),
    targetIdentityId: event.targetIdentityId || null,
    pattern: base,
    asn: meta.asn || null,
    nameserver: meta.nameserver || null,
    registrar: meta.registrar || null,
    confidence: event.confidence || 0,
  });
}

function linkRelationshipToCluster(relationshipId, clusterId, db = getDb()) {
  db.prepare(`
    UPDATE spoof_relationships
    SET cluster_id = @clusterId,
        status = CASE WHEN (SELECT status FROM clusters WHERE id = @clusterId) = 'blocked'
                 THEN 'blocked' ELSE status END
    WHERE id = @relationshipId
  `).run({ relationshipId, clusterId });

  db.prepare(`
    UPDATE clusters
    SET last_seen = MAX(last_seen, (SELECT discovered_at FROM spoof_relationships WHERE id = @relationshipId)),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = @clusterId
  `).run({ relationshipId, clusterId });
}

function clusterSpoof(inputEvent, db = getDb()) {
  migrateThreatGraph(db);
  const event = inputEvent.relationship && inputEvent.event ? inputEvent.event : inputEvent;
  const relationship = inputEvent.relationship && inputEvent.event ? inputEvent.relationship : null;

  let cluster = findCluster(event, db);
  if (!cluster) {
    cluster = createCluster(event, db);
  }

  if (relationship?.id) {
    linkRelationshipToCluster(relationship.id, cluster.id, db);
  }

  return cluster;
}

function reclusterOpen(db = getDb()) {
  migrateThreatGraph(db);
  const unclustered = db
    .prepare(
      "SELECT * FROM spoof_relationships WHERE cluster_id IS NULL AND status != 'false_positive'"
    )
    .all();

  const results = [];
  for (const row of unclustered) {
    const event = {
      input: row.input,
      type: row.type,
      targetIdentityId: row.target_identity_id,
      discoveredAt: row.discovered_at,
      metadata: {},
    };
    const cluster = clusterSpoof({ relationship: row, event }, db);
    results.push({ relationshipId: row.id, clusterId: cluster.id });
  }
  return results;
}

function countClusterMembers(clusterId, db = getDb()) {
  return db
    .prepare('SELECT COUNT(*) as c FROM spoof_relationships WHERE cluster_id = @clusterId')
    .get({ clusterId }).c;
}

function autoPromoteClusters(db = getDb(), threshold = 5) {
  migrateThreatGraph(db);
  const openClusters = db
    .prepare("SELECT * FROM clusters WHERE status IN ('open','reviewing')")
    .all();

  const promotions = [];
  for (const cluster of openClusters) {
    const size = countClusterMembers(cluster.id, db);
    const confidence = cluster.confidence || 0;

    if (size >= 10 && confidence > 0.9) {
      db.prepare(`
        UPDATE clusters
        SET status = 'blocked', auto_promoted = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `).run({ id: cluster.id });

      db.prepare(`
        UPDATE spoof_relationships
        SET status = 'blocked'
        WHERE cluster_id = @clusterId
      `).run({ clusterId: cluster.id });

      const members = db
        .prepare('SELECT input, type FROM spoof_relationships WHERE cluster_id = @clusterId')
        .all({ clusterId: cluster.id });
      const insertBlocked = db.prepare(`
        INSERT OR IGNORE INTO blocked_inputs (input, type, cluster_id, reason)
        VALUES (@input, @type, @clusterId, @reason)
      `);
      for (const member of members) {
        insertBlocked.run({
          input: member.input,
          type: member.type,
          clusterId: cluster.id,
          reason: 'auto-promoted cluster',
        });
      }

      if (cluster.target_identity_id) {
        db.prepare(`
          INSERT OR IGNORE INTO identity_blocked_patterns (identity_id, pattern, reason)
          VALUES (@identityId, @pattern, @reason)
        `).run({
          identityId: cluster.target_identity_id,
          pattern: cluster.pattern,
          reason: 'auto-promoted cluster',
        });
      }

      promotions.push({ clusterId: cluster.id, from: cluster.status, to: 'blocked', size });
    } else if (size >= threshold && confidence > 0.9) {
      db.prepare(`
        UPDATE clusters
        SET status = 'reviewing', auto_promoted = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `).run({ id: cluster.id });
      promotions.push({ clusterId: cluster.id, from: cluster.status, to: 'reviewing', size });
    }
  }
  return promotions;
}

module.exports = {
  clusterSpoof,
  reclusterOpen,
  autoPromoteClusters,
  findCluster,
  createCluster,
  countClusterMembers,
  withinWindow,
};
