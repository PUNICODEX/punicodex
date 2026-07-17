/**
 * PUNICODEX — Threat Intelligence Stream Tests (Phase 8)
 */

const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb('threat-stream.test.js');

const {
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
} = require('../platform/api/threat-stream.js');
const { clusterSpoof, autoPromoteClusters } = require('../platform/api/clustering.js');
const { computeReputation, rescoreAll } = require('../platform/api/reputation-model.js');
const {
  handleThreatFeedList,
  handleThreatFeedStats,
  handleThreatFeedStream,
} = require('../platform/api/threat-routes.js');
const { getDb } = require('../platform/db/connection.js');
const { EventEmitter } = require('node:events');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  for (const t of tests) {
    try {
      t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }
  console.log(`\nThreat Stream: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    json(data) {
      this.body = data;
    },
    write(chunk) {
      this.body = (this.body || '') + chunk;
    },
  };
  return res;
}

test('migrateThreatGraph creates schema idempotently', () => {
  const db = getDb();
  migrateThreatGraph(db);
  migrateThreatGraph(db);
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='clusters'")
    .all();
  assert.strictEqual(tables.length, 1);
});

test('crawlerAdapter converts discovered site to event', () => {
  const event = crawlerAdapter({
    domain: 'xn--fake-zeus.com',
    lexiconEntryId: 'zeus',
    asn: 'AS1234',
    nameserver: 'ns1.example.com',
    discoveredAt: '2026-01-01T00:00:00Z',
  });
  assert.strictEqual(event.input, 'xn--fake-zeus.com');
  assert.strictEqual(event.type, 'domain');
  assert.strictEqual(event.source, 'crawler');
  assert.strictEqual(event.targetIdentityId, 'zeus');
  assert.strictEqual(event.metadata.asn, 'AS1234');
});

test('external feed adapters return normalized events', () => {
  const openPhish = openPhishAdapter('http://evil.example.com');
  assert.strictEqual(openPhish.source, 'openphish');

  const phishTank = phishTankAdapter({
    url: 'http://phish.example.com',
    targetIdentityId: 'paypal',
  });
  assert.strictEqual(phishTank.source, 'phishtank');
  assert.strictEqual(phishTank.targetIdentityId, 'paypal');

  const urlhaus = urlhausAdapter({
    url: 'http://malware.example.com',
    date_added: '2026-01-02T00:00:00Z',
  });
  assert.strictEqual(urlhaus.source, 'urlhaus');

  const userReport = userReportAdapter({
    input: 'fake-ares.com',
    type: 'domain',
    targetIdentityId: 'ares',
  });
  assert.strictEqual(userReport.source, 'user-report');

  const ctLog = ctLogAdapter({ hostnames: ['fake1.com', 'fake2.com'], targetIdentityId: 'zeus' });
  assert.strictEqual(ctLog.length, 2);

  const partner = partnerFeedAdapter([{ input: 'fake.com', source: 'partner-x' }]);
  assert.strictEqual(partner.length, 1);
  assert.strictEqual(partner[0].source, 'partner-x');
});

test('ingestEvent writes relationship and dedupes by input+source', () => {
  const db = getDb();
  const first = ingestEvent(
    {
      input: 'fake-zeus-1.com',
      type: 'domain',
      source: 'crawler',
      targetIdentityId: 'zeus',
      discoveredAt: '2026-06-01T00:00:00Z',
    },
    db
  );
  assert.ok(first.relationship.id);

  const second = ingestEvent(
    {
      input: 'fake-zeus-1.com',
      type: 'domain',
      source: 'crawler',
      targetIdentityId: 'zeus',
      discoveredAt: '2026-06-02T00:00:00Z',
    },
    db
  );
  assert.strictEqual(second.relationship.id, first.relationship.id);
});

test('clusterSpoof groups same target + pattern within 7-day window', () => {
  const db = getDb();
  const result = ingestEvent(
    {
      input: 'fakezeus123.com',
      type: 'domain',
      source: 'crawler',
      targetIdentityId: 'zeus',
      discoveredAt: '2026-06-01T00:00:00Z',
      metadata: { asn: 'AS1234' },
    },
    db
  );
  const cluster = clusterSpoof(result, db);
  assert.ok(cluster.id);

  const result2 = ingestEvent(
    {
      input: 'fakezeus456.com',
      type: 'domain',
      source: 'crawler',
      targetIdentityId: 'zeus',
      discoveredAt: '2026-06-03T00:00:00Z',
      metadata: { asn: 'AS1234' },
    },
    db
  );
  const cluster2 = clusterSpoof(result2, db);
  assert.strictEqual(cluster2.id, cluster.id);
});

test('computeReputation weighs high-confidence sources higher', () => {
  const openPhishScore = computeReputation(
    { source: 'openphish', discoveredAt: new Date().toISOString() },
    { size: 1 }
  );
  const crawlerScore = computeReputation(
    { source: 'crawler', discoveredAt: new Date().toISOString() },
    { size: 1 }
  );
  assert.ok(openPhishScore > crawlerScore, 'openphish score should exceed crawler score');
});

test('rescoreAll updates relationship scores', () => {
  const db = getDb();
  ingestEvent({ input: 'rescore-a.com', type: 'domain', source: 'openphish' }, db);
  ingestEvent({ input: 'rescore-b.com', type: 'domain', source: 'crawler' }, db);
  const results = rescoreAll(db);
  assert.ok(results.length >= 2);
  const a = db
    .prepare("SELECT reputation_score FROM spoof_relationships WHERE input = 'rescore-a.com'")
    .get();
  assert.ok(a.reputation_score > 0);
});

test('autoPromoteClusters promotes high-confidence large clusters', () => {
  const db = getDb();
  const cluster = db
    .prepare(`
      INSERT INTO clusters (pattern, target_identity_id, status, confidence, first_seen, last_seen)
      VALUES (@pattern, @targetIdentityId, 'open', 0.95, @firstSeen, @lastSeen)
      RETURNING *
    `)
    .get({
      pattern: 'fakenike',
      targetIdentityId: 'nike',
      firstSeen: '2026-06-01T00:00:00Z',
      lastSeen: '2026-06-01T00:00:00Z',
    });

  for (let i = 0; i < 10; i++) {
    db.prepare(`
      INSERT INTO spoof_relationships (input, type, target_identity_id, cluster_id, source, discovered_at)
      VALUES (@input, 'domain', 'nike', @clusterId, 'openphish', @discoveredAt)
    `).run({
      input: `fakenike${i}.com`,
      clusterId: cluster.id,
      discoveredAt: '2026-06-01T00:00:00Z',
    });
  }

  const promoted = autoPromoteClusters(db, 5);
  assert.ok(promoted.some((p) => p.clusterId === cluster.id && p.to === 'blocked'));

  const blocked = db
    .prepare('SELECT * FROM blocked_inputs WHERE input = @input')
    .get({ input: 'fakenike0.com' });
  assert.ok(blocked);
});

test('handleThreatFeedList filters by source and target_identity_id', () => {
  const db = getDb();
  ingestEvent(
    { input: 'feed-query.com', type: 'domain', source: 'openphish', targetIdentityId: 'zeus' },
    db
  );

  const req = {
    query: { source: 'openphish', target_identity_id: 'zeus', limit: '10', offset: '0' },
  };
  const res = mockRes();
  handleThreatFeedList(req, res);
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.success);
  assert.ok(res.body.data.some((r) => r.input === 'feed-query.com'));
});

test('handleThreatFeedStats returns status/source/cluster breakdowns', () => {
  const db = getDb();
  ingestEvent({ input: 'stats-test.com', type: 'domain', source: 'phishtank' }, db);

  const req = { query: {} };
  const res = mockRes();
  handleThreatFeedStats(req, res);
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.success);
  assert.ok(Array.isArray(res.body.data.bySource));
  assert.ok(res.body.data.bySource.some((s) => s.source === 'phishtank'));
});

test('handleThreatFeedStream sets SSE headers', () => {
  const req = new EventEmitter();
  req.query = { interval: '1000' };
  const res = mockRes();
  handleThreatFeedStream(req, res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers['content-type'], 'text/event-stream');
  assert.ok(res.body.includes('event: connected'));
  req.emit('close');
});

test('createThreatStream returns consumer with adapters', () => {
  const stream = createThreatStream();
  assert.ok(stream.adapters.openPhish);
  assert.ok(stream.adapters.crawler);
  assert.strictEqual(typeof stream.ingest, 'function');
});

run();
