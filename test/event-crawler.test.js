/**
 * Event Crawler Tests
 */

const assert = require('node:assert');
const {
  enqueueEvent,
  listPendingEvents,
  processPendingEvents,
} = require('../platform/api/event-crawler-service');

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

run();
