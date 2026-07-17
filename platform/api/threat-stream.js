/**
 * PUNICODEX — Threat Intelligence Stream Ingest (Phase 8)
 *
 * Pluggable stream consumer that normalizes threat events from crawlers,
 * external feeds, and user reports into a shared graph schema.
 */

const fs = require('node:fs');
const path = require('node:path');
const { getDb } = require('../db/connection.js');
const { recordDiscoveredSpoof } = require('./authenticity-threat-feed.js');

const THREAT_GRAPH_SQL_PATH = path.join(__dirname, '..', 'db', 'threat-graph.sql');

function migrateThreatGraph(db = getDb()) {
  const sql = fs.readFileSync(THREAT_GRAPH_SQL_PATH, 'utf8');
  db.exec(sql);
}

function normalizeInputType(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'url') return 'url';
  if (t === 'term' || t === 'name') return 'term';
  return 'domain';
}

function extractHost(input) {
  if (!input) return null;
  if (input.includes('://')) {
    try {
      return new URL(input).hostname;
    } catch (_e) {
      return null;
    }
  }
  if (input.includes('/')) return input.split('/')[0];
  return input;
}

function registrableDomain(host) {
  if (!host) return null;
  const labels = host.toLowerCase().split('.');
  if (labels.length >= 2) return labels.slice(-2).join('.');
  return host;
}

function patternBase(input) {
  const host = extractHost(input) || input;
  const domain = registrableDomain(host) || host;
  if (!domain) return 'unknown';
  return domain.replace(/\d+$/, '').replace(/\./g, '_');
}

function createEvent(event) {
  const metadata = event.metadata || {};
  return {
    input: event.input,
    type: normalizeInputType(event.type),
    source: event.source || 'unknown',
    discoveredAt: event.discoveredAt || new Date().toISOString(),
    targetIdentityId: event.targetIdentityId || null,
    metadata: {
      asn: metadata.asn || null,
      nameserver: metadata.nameserver || null,
      registrar: metadata.registrar || null,
      etld: metadata.etld || registrableDomain(extractHost(event.input)),
      host: metadata.host || extractHost(event.input),
    },
  };
}

function crawlerAdapter(discoveredSite) {
  const input = discoveredSite.domain || discoveredSite.punycode || discoveredSite.url;
  return createEvent({
    input,
    type: 'domain',
    source: 'crawler',
    discoveredAt:
      discoveredSite.discoveredAt || discoveredSite.lastCrawled || new Date().toISOString(),
    targetIdentityId: discoveredSite.lexiconEntryId || discoveredSite.targetIdentityId || null,
    metadata: {
      asn: discoveredSite.asn || null,
      nameserver: discoveredSite.nameserver || null,
      registrar: discoveredSite.registrar || null,
      etld: discoveredSite.etld || null,
      host: discoveredSite.host || null,
    },
  });
}

function ctLogAdapter(certificateEntry) {
  const hostnames = Array.isArray(certificateEntry.hostnames)
    ? certificateEntry.hostnames
    : (certificateEntry.hostname || '')
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean);
  return hostnames.map((hostname) =>
    createEvent({
      input: hostname,
      type: 'domain',
      source: 'ct-log',
      discoveredAt: certificateEntry.discoveredAt || new Date().toISOString(),
      targetIdentityId: certificateEntry.targetIdentityId || null,
      metadata: certificateEntry.metadata || {},
    })
  );
}

function openPhishAdapter(url) {
  return createEvent({
    input: url,
    type: 'url',
    source: 'openphish',
    discoveredAt: new Date().toISOString(),
  });
}

function phishTankAdapter(entry) {
  return createEvent({
    input: entry.url || entry.phish_detail_url,
    type: 'url',
    source: 'phishtank',
    discoveredAt: entry.discoveredAt || new Date().toISOString(),
    targetIdentityId: entry.targetIdentityId || null,
    metadata: entry.metadata || {},
  });
}

function urlhausAdapter(entry) {
  return createEvent({
    input: entry.url,
    type: 'url',
    source: 'urlhaus',
    discoveredAt: entry.date_added || entry.discoveredAt || new Date().toISOString(),
    targetIdentityId: entry.targetIdentityId || null,
    metadata: entry.metadata || {},
  });
}

function userReportAdapter(report) {
  return createEvent({
    input: report.input || report.url || report.domain,
    type: report.type || 'domain',
    source: 'user-report',
    discoveredAt: report.discoveredAt || new Date().toISOString(),
    targetIdentityId: report.targetIdentityId || null,
    metadata: report.metadata || {},
  });
}

function partnerFeedAdapter(payload) {
  const events = Array.isArray(payload) ? payload : [payload];
  return events.map((item) =>
    createEvent({
      input: item.input || item.url || item.domain,
      type: item.type || 'domain',
      source: item.source || 'partner-feed',
      discoveredAt: item.discoveredAt || new Date().toISOString(),
      targetIdentityId: item.targetIdentityId || null,
      metadata: item.metadata || {},
    })
  );
}

function createThreatStream(config = {}) {
  const adapters = config.adapters || {
    crawler: crawlerAdapter,
    ctLog: ctLogAdapter,
    openPhish: openPhishAdapter,
    phishTank: phishTankAdapter,
    urlhaus: urlhausAdapter,
    userReport: userReportAdapter,
    partnerFeed: partnerFeedAdapter,
  };

  return {
    adapters,
    ingest: (event) => ingestEvent(event, config.db),
  };
}

function ingestEvent(event, db = getDb()) {
  migrateThreatGraph(db);

  const normalized = createEvent(event);
  const metadata = normalized.metadata || {};

  const existing = db
    .prepare('SELECT * FROM spoof_relationships WHERE input = @input AND source = @source LIMIT 1')
    .get({ input: normalized.input, source: normalized.source });

  let relationship;
  if (existing) {
    db.prepare(`
      UPDATE spoof_relationships
      SET discovered_at = MAX(discovered_at, @discoveredAt),
          status = COALESCE(@status, status)
      WHERE id = @id
    `).run({
      discoveredAt: normalized.discoveredAt,
      status: event.status || null,
      id: existing.id,
    });
    relationship = db
      .prepare('SELECT * FROM spoof_relationships WHERE id = @id')
      .get({ id: existing.id });
  } else {
    const insertSpoof = db.prepare(`
      INSERT INTO spoof_relationships (
        input, type, target_identity_id, cluster_id, campaign_id,
        discovered_at, source, reputation_score, status
      )
      VALUES (
        @input, @type, @targetIdentityId, NULL, NULL,
        @discoveredAt, @source, @reputationScore, 'open'
      )
      RETURNING *
    `);
    relationship = insertSpoof.get({
      input: normalized.input,
      type: normalized.type,
      targetIdentityId: normalized.targetIdentityId,
      discoveredAt: normalized.discoveredAt,
      source: normalized.source,
      reputationScore: event.reputationScore || 0,
    });
  }

  // Also mirror to discovered_spoofs for backwards compatibility.
  try {
    recordDiscoveredSpoof({
      input: normalized.input,
      inputType: normalized.type === 'url' ? 'url' : normalized.type === 'term' ? 'name' : 'domain',
      punycode: normalized.input.startsWith('xn--') ? normalized.input : null,
      verdict: event.verdict || 'lookalike-domain',
      severity: event.severity || 'medium',
      canonicalEntryId: normalized.targetIdentityId,
      discoverySource: normalized.source,
      confidence: event.reputationScore || 0,
    });
  } catch (_e) {
    // Best-effort mirror; do not fail ingestion if discovered_spoofs table is unavailable.
  }

  return {
    relationship,
    metadata,
    patternBase: patternBase(normalized.input),
  };
}

module.exports = {
  migrateThreatGraph,
  createThreatStream,
  ingestEvent,
  crawlerAdapter,
  ctLogAdapter,
  openPhishAdapter,
  phishTankAdapter,
  urlhausAdapter,
  userReportAdapter,
  partnerFeedAdapter,
  patternBase,
  extractHost,
  registrableDomain,
};
