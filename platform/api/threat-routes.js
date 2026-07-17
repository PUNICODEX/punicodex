/**
 * PUNICODEX — Threat Feed API Route Handlers (Phase 8)
 *
 * Shared handlers used by both Express (v1) and the Vercel v2 router.
 */

const { getDb } = require('../db/connection.js');
const { migrateThreatGraph, ingestEvent } = require('./threat-stream.js');
const { clusterSpoof, reclusterOpen, autoPromoteClusters } = require('./clustering.js');
const { computeReputation, rescoreAll } = require('./reputation-model.js');
const { countClusterMembers } = require('./clustering.js');

function parsePagination(query) {
  const limit = Math.min(Math.max(1, parseInt(query.limit, 10) || 50), 200);
  const offset = Math.max(0, parseInt(query.offset, 10) || 0);
  return { limit, offset };
}

function handleThreatFeedList(req, res) {
  const db = getDb();
  migrateThreatGraph(db);

  const { limit, offset } = parsePagination(req.query);
  const conditions = ['1=1'];
  const params = { limit, offset };

  if (req.query.target_identity_id) {
    conditions.push('target_identity_id = @targetIdentityId');
    params.targetIdentityId = req.query.target_identity_id;
  }
  if (req.query.status) {
    conditions.push('status = @status');
    params.status = req.query.status;
  }
  if (req.query.source) {
    conditions.push('source = @source');
    params.source = req.query.source;
  }
  if (req.query.cluster_id) {
    conditions.push('cluster_id = @clusterId');
    params.clusterId = parseInt(req.query.cluster_id, 10);
  }

  const where = conditions.join(' AND ');
  const total = db
    .prepare(`SELECT COUNT(*) as c FROM spoof_relationships WHERE ${where}`)
    .get(params).c;
  const items = db
    .prepare(
      `
      SELECT * FROM spoof_relationships
      WHERE ${where}
      ORDER BY discovered_at DESC
      LIMIT @limit OFFSET @offset
    `
    )
    .all(params);

  res.json({
    success: true,
    data: items,
    meta: { total, limit, offset },
  });
}

function handleThreatFeedStats(_req, res) {
  const db = getDb();
  migrateThreatGraph(db);

  const byStatus = db
    .prepare('SELECT status, COUNT(*) as count FROM spoof_relationships GROUP BY status')
    .all();
  const bySource = db
    .prepare('SELECT source, COUNT(*) as count FROM spoof_relationships GROUP BY source')
    .all();
  const byCluster = db
    .prepare(
      `
      SELECT cluster_id, COUNT(*) as count
      FROM spoof_relationships
      WHERE cluster_id IS NOT NULL
      GROUP BY cluster_id
    `
    )
    .all();

  res.json({
    success: true,
    data: { byStatus, bySource, byCluster },
  });
}

function handleThreatFeedIngest(req, res) {
  const db = getDb();
  migrateThreatGraph(db);

  const event = req.body;
  if (!event?.input) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'event.input is required' },
    });
    return;
  }

  const result = ingestEvent(event, db);
  const cluster = clusterSpoof(result, db);

  const memberCount = countClusterMembers(cluster.id, db);
  const reputationScore = computeReputation(
    { source: event.source, discoveredAt: event.discoveredAt },
    { ...cluster, size: memberCount }
  );

  db.prepare('UPDATE spoof_relationships SET reputation_score = @score WHERE id = @id').run({
    score: reputationScore,
    id: result.relationship.id,
  });

  res.status(201).json({
    success: true,
    data: {
      relationship: result.relationship,
      cluster,
      reputationScore,
    },
  });
}

function handleThreatFeedClusterReview(req, res) {
  const db = getDb();
  migrateThreatGraph(db);

  const clusterId = parseInt(req.params.clusterId, 10);
  const { status } = req.body || {};
  const validStatuses = ['open', 'reviewing', 'blocked', 'false_positive'];
  if (Number.isNaN(clusterId) || !validStatuses.includes(status)) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'clusterId and valid status required' },
    });
    return;
  }

  db.prepare(
    'UPDATE clusters SET status = @status, updated_at = CURRENT_TIMESTAMP WHERE id = @id'
  ).run({
    status,
    id: clusterId,
  });

  if (status === 'blocked' || status === 'false_positive') {
    db.prepare('UPDATE spoof_relationships SET status = @status WHERE cluster_id = @clusterId').run(
      {
        status,
        clusterId,
      }
    );
  }

  const cluster = db.prepare('SELECT * FROM clusters WHERE id = @id').get({ id: clusterId });
  res.json({ success: true, data: cluster });
}

function handleThreatFeedCampaigns(req, res) {
  const db = getDb();
  migrateThreatGraph(db);

  const identityId = req.params.identityId;
  const days = Math.min(Math.max(1, parseInt(req.query.days, 10) || 30), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const items = db
    .prepare(
      `
      SELECT sr.*, c.pattern, c.status as cluster_status
      FROM spoof_relationships sr
      LEFT JOIN clusters c ON sr.cluster_id = c.id
      WHERE sr.target_identity_id = @identityId
        AND sr.discovered_at >= @since
      ORDER BY sr.discovered_at DESC
    `
    )
    .all({ identityId, since });

  res.json({
    success: true,
    data: items,
    meta: { identityId, days },
  });
}

function handleThreatFeedStream(req, res) {
  const db = getDb();
  migrateThreatGraph(db);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.status(200);
  res.write('event: connected\ndata: {}\n\n');

  const intervalMs = parseInt(req.query.interval, 10) || 5000;
  let lastId = 0;

  const interval = setInterval(() => {
    const recent = db
      .prepare('SELECT * FROM spoof_relationships WHERE id > @lastId ORDER BY id ASC LIMIT 10')
      .all({ lastId });
    if (recent.length > 0) {
      lastId = recent[recent.length - 1].id;
      res.write(`event: ingest\ndata: ${JSON.stringify({ items: recent })}\n\n`);
    }
  }, intervalMs);

  req.on('close', () => {
    clearInterval(interval);
  });
}

function handleThreatNightly(_req, res) {
  const db = getDb();
  const reclustered = reclusterOpen(db);
  const rescored = rescoreAll(db);
  const promoted = autoPromoteClusters(db, 5);

  res.json({
    success: true,
    data: { reclustered: reclustered.length, rescored: rescored.length, promoted },
  });
}

module.exports = {
  handleThreatFeedList,
  handleThreatFeedStats,
  handleThreatFeedIngest,
  handleThreatFeedClusterReview,
  handleThreatFeedCampaigns,
  handleThreatFeedStream,
  handleThreatNightly,
};
