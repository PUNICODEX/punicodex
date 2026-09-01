'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

const testDb = prepareTestDb(__filename);
process.env.PUNICODEX_TEST_DB_PATH = testDb;

const { runMigration } = require('../platform/db/migrate-site-analytics-v5.js');
runMigration();

const { closeDb } = require('../platform/db/connection.js');
const { run } = require('../platform/db/operational.js');
const { detectAnomalies } = require('../platform/api/analytics-anomaly.js');

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDay(offsetDays) {
  return new Date(Date.now() - offsetDays * DAY_MS).toISOString().slice(0, 10);
}

function isoAt(day, hour = 12) {
  return `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`;
}

async function insertPageViews(templeId, day, count, isBot = 0) {
  for (let i = 0; i < count; i++) {
    await run(
      `
        INSERT INTO site_analytics_events_v2
          (event_name, temple_id, session_hash, is_bot, created_at)
        VALUES ('page_view', $1, $2, $3, $4)
      `,
      [templeId, `sess-${templeId}-${day}-${i}`, isBot, isoAt(day, i % 24)]
    );
  }
}

async function insertEngagements(templeId, day, count, visibleMs) {
  for (let i = 0; i < count; i++) {
    await run(
      `
        INSERT INTO site_analytics_events_v2
          (event_name, temple_id, session_hash, is_bot, properties, created_at)
        VALUES ('engagement', $1, $2, 0, $3, $4)
      `,
      [
        templeId,
        `sess-${templeId}-${day}-${i}`,
        JSON.stringify({ visible_ms: visibleMs }),
        isoAt(day, i % 24),
      ]
    );
  }
}

test('detects a synthetic page-view spike', async () => {
  const days = 7;
  const templeId = 'pv-spike';
  for (let i = 1; i < days; i++) {
    await insertPageViews(templeId, isoDay(i), 10);
  }
  const spikeDay = isoDay(0);
  await insertPageViews(templeId, spikeDay, 120);

  const anomalies = await detectAnomalies({ days, zThreshold: 2 });
  const pageViewAnomalies = anomalies.filter((a) => a.metric === 'page_views');
  assert.ok(pageViewAnomalies.length > 0, 'expected a page-view anomaly');
  const spike = pageViewAnomalies.find((a) => a.date === spikeDay && a.templeId === templeId);
  assert.ok(spike, 'spike day anomaly missing');
  assert.strictEqual(spike.value, 120);
  assert.ok(Math.abs(spike.zScore) > 2);
  assert.ok(['medium', 'high', 'critical'].includes(spike.severity));
});

test('does not flag baseline days', async () => {
  const anomalies = await detectAnomalies({ days: 7, zThreshold: 2 });
  const baseline = anomalies.filter((a) => a.value === 10);
  assert.strictEqual(baseline.length, 0);
});

test('respects the z-threshold', async () => {
  const anomalies = await detectAnomalies({ days: 7, zThreshold: 10 });
  assert.strictEqual(anomalies.length, 0);
});

test('ignores bot page views', async () => {
  const day = isoDay(0);
  const templeId = 'bot-spike';
  await insertPageViews(templeId, day, 200, 1);
  const anomalies = await detectAnomalies({ days: 7, zThreshold: 2 });
  const botSpike = anomalies.find((a) => a.templeId === templeId);
  assert.strictEqual(botSpike, undefined);
});

test('filters by templeId', async () => {
  const days = 7;
  const targetId = 'ares-filter';
  for (let i = 0; i < days; i++) {
    await insertPageViews(targetId, isoDay(i), 10);
  }
  await insertPageViews(targetId, isoDay(0), 120);
  await insertPageViews('apollo-filter', isoDay(0), 120);

  const anomalies = await detectAnomalies({ days, zThreshold: 2, templeId: targetId });
  assert.ok(anomalies.every((a) => a.templeId === targetId));
  assert.ok(anomalies.some((a) => a.templeId === targetId));
});

test('detects a synthetic engagement-time spike', async () => {
  const days = 7;
  const templeId = 'eng-spike';
  for (let i = 1; i < days; i++) {
    await insertEngagements(templeId, isoDay(i), 5, 5000);
  }
  await insertEngagements(templeId, isoDay(0), 5, 120000);

  const anomalies = await detectAnomalies({ days, zThreshold: 2 });
  const engagementAnomalies = anomalies.filter((a) => a.metric === 'engagement');
  assert.ok(engagementAnomalies.length > 0, 'expected an engagement anomaly');
  const spike = engagementAnomalies.find((a) => a.date === isoDay(0) && a.templeId === templeId);
  assert.ok(spike, 'engagement spike missing');
  assert.ok(spike.value > 50000);
  assert.ok(Math.abs(spike.zScore) > 2);
});

test('returns an empty array when no data exists', async () => {
  const anomalies = await detectAnomalies({ days: 7, zThreshold: 2, templeId: 'nonexistent' });
  assert.deepStrictEqual(anomalies, []);
});

test('severity escalates with larger z-scores', async () => {
  const days = 30;
  const templeId = 'severity-test';
  for (let i = 1; i < days; i++) {
    await insertPageViews(templeId, isoDay(i), 10);
  }
  await insertPageViews(templeId, isoDay(0), 1000);

  const anomalies = await detectAnomalies({ days, zThreshold: 2 });
  const spike = anomalies.find((a) => a.templeId === templeId && a.metric === 'page_views');
  assert.ok(spike);
  assert.ok(['high', 'critical'].includes(spike.severity), `severity was ${spike.severity}`);
});

test('result includes expected fields for every anomaly', async () => {
  const anomalies = await detectAnomalies({ days: 7, zThreshold: 2 });
  for (const a of anomalies) {
    assert.ok(typeof a.date === 'string' && a.date.length === 10);
    assert.ok(typeof a.templeId === 'string' && a.templeId.length > 0);
    assert.ok(a.metric === 'page_views' || a.metric === 'engagement');
    assert.ok(Number.isFinite(a.value));
    assert.ok(Number.isFinite(a.expected));
    assert.ok(Number.isFinite(a.zScore));
    assert.ok(['medium', 'high', 'critical'].includes(a.severity));
  }
});

test('anomalies are sorted by date, temple, and metric', async () => {
  const anomalies = await detectAnomalies({ days: 7, zThreshold: 2 });
  for (let i = 1; i < anomalies.length; i++) {
    const a = anomalies[i - 1];
    const b = anomalies[i];
    const keyA = `${a.date}|${a.templeId}|${a.metric}`;
    const keyB = `${b.date}|${b.templeId}|${b.metric}`;
    assert.ok(keyA <= keyB, `sort order violated: ${keyA} > ${keyB}`);
  }
});

test('close test database', () => {
  closeDb();
  assert.ok(true);
});
