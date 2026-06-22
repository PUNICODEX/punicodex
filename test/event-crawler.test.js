/**
 * Event Crawler Tests
 */

const assert = require('node:assert');
const {
  enqueueEvent,
  listPendingEvents,
  processPendingEvents,
} = require('../platform/api/event-crawler-service');
const { migrateThreatFeed } = require('../platform/api/authenticity-threat-feed');
const { getDb } = require('../platform/db/connection');
const { domainToASCII } = require('node:url');

migrateThreatFeed();

// Remove artifacts left by earlier versions of this test.
const oldTestPunycode = domainToASCII('\u0430res.com');
getDb().prepare('DELETE FROM indexed_sites WHERE punycode = ?').run(oldTestPunycode);

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }

  console.log(`\nEvent Crawler: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('enqueues a crawl event', () => {
  const id = enqueueEvent({
    source: 'webhook',
    domain: 'example.com',
    eventType: 'update',
    priority: 1,
  });
  assert.ok(id);
});

test('lists pending events', () => {
  const events = listPendingEvents({ limit: 10 });
  assert.ok(events.length > 0);
  assert.strictEqual(events[0].status, 'pending');
});

test('processes pending events', async () => {
  const results = await processPendingEvents({ limit: 5 });
  assert.ok(Array.isArray(results));
});

test('crawler records homograph spoof to threat feed', async () => {
  // Use a mixed-script name that does not map to a Greek canonical entry,
  // so the temporary crawl artifact cannot interfere with search pagination tests.
  const unicodeDomain = '\u0430fake-noname.com'; // Cyrillic а + fake-noname.com
  const punycode = domainToASCII(unicodeDomain);
  getDb().prepare('DELETE FROM discovered_spoofs WHERE input = ?').run(punycode);
  getDb().prepare('DELETE FROM indexed_sites WHERE punycode = ?').run(punycode);

  enqueueEvent({ source: 'dns_change', domain: unicodeDomain, eventType: 'update', priority: 1 });
  await processPendingEvents({ limit: 5 });

  const row = getDb().prepare('SELECT * FROM discovered_spoofs WHERE input = ?').get(punycode);
  assert.ok(row, 'homograph spoof should be recorded in threat feed');
  assert.ok(['homograph-spoof', 'mixed-script-spoof', 'lookalike-domain'].includes(row.verdict));

  // Clean up the temporary crawl artifact so later tests see a stable index.
  getDb().prepare('DELETE FROM indexed_sites WHERE punycode = ?').run(punycode);
  getDb()
    .prepare('DELETE FROM crawl_history WHERE site_id NOT IN (SELECT id FROM indexed_sites)')
    .run();
});

run();
