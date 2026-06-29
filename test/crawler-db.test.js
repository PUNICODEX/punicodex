/**
 * Crawler DB / web search tests (platform/api/crawler-db.js).
 */

const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');
const { makeIndexedSite } = require('./helpers/factories.js');

const suiteName = 'crawler-db.test.js';
prepareTestDb(suiteName);

const crawlerDb = require('../platform/api/crawler-db.js');
const ltr = require('../platform/api/ltr-service.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function run() {
  console.log('\n▸ Crawler DB Tests\n');

  test('getSites returns paginated sites', () => {
    const result = crawlerDb.getSites({ limit: 5, offset: 0 });
    assert.ok(Array.isArray(result.sites));
    assert.ok(result.sites.length <= 5);
    assert.ok(typeof result.total === 'number');
  });

  test('getSites filters by status', () => {
    const result = crawlerDb.getSites({ status: 'active', limit: 10 });
    assert.ok(result.sites.every((s) => s.status === 'active'));
  });

  test('getSites filters by trust tier', () => {
    const result = crawlerDb.getSites({ trust: 'canonical', limit: 10 });
    assert.ok(result.sites.every((s) => s.trust_tier === 'canonical'));
  });

  test('getSiteByPunycode returns a site', () => {
    const site = crawlerDb.getSiteByPunycode('xn--rs-lia5r.com');
    assert.ok(site);
    assert.strictEqual(site.punycode, 'xn--rs-lia5r.com');
  });

  test('getSiteByPunycode returns undefined for unknown site', () => {
    assert.strictEqual(crawlerDb.getSiteByPunycode('xn--unknown-xyz.com'), undefined);
  });

  test('searchSites finds sites by query', () => {
    const sites = crawlerDb.searchSites('ares', 10);
    assert.ok(sites.length > 0);
    assert.ok(
      sites.some((s) => s.entry_ascii === 'ares' || s.title?.toLowerCase().includes('ares'))
    );
  });

  await testAsync('searchWeb returns results for zeus', async () => {
    const result = await crawlerDb.searchWeb('zeus', { limit: 5 });
    assert.ok(Array.isArray(result.results));
    assert.ok(result.total > 0);
    assert.strictEqual(result.query, 'zeus');
    assert.ok(result.results.every((r) => r.trustTier));
  });

  await testAsync('searchWeb pagination respects limit and offset', async () => {
    // Create two deterministic tenant sites so pagination behavior is isolated
    // from the current corpus (the word "greek" is not guaranteed to match
    // anything after temple regeneration).
    const token = `pagtest-${Math.random().toString(36).slice(2, 8)}`;
    const site1 = makeIndexedSite({
      title: `${token} one`,
      tenantName: 'Pagination Tenant 1',
      tenantCategory: 'test',
      status: 'active',
    });
    const site2 = makeIndexedSite({
      title: `${token} two`,
      tenantName: 'Pagination Tenant 2',
      tenantCategory: 'test',
      status: 'active',
    });
    try {
      const page1 = await crawlerDb.searchWeb(token, { limit: 1, offset: 0 });
      const page2 = await crawlerDb.searchWeb(token, { limit: 1, offset: 2 });
      assert.ok(page1.results.length > 0, 'first page should contain results');
      assert.ok(page1.total >= page1.results.length, 'total should account for all matches');
      assert.strictEqual(page2.results.length, 0, 'offset beyond total should be empty');
    } finally {
      site1.cleanup();
      site2.cleanup();
    }
  });

  await testAsync('searchWeb total is accurate under fallbacks', async () => {
    const result = await crawlerDb.searchWeb('definitely-not-a-real-query-12345', { limit: 5 });
    assert.ok(result.total >= 0);
    assert.ok(result.results.length <= 5);
  });

  await testAsync('searchWeb results include snippets', async () => {
    const result = await crawlerDb.searchWeb('zeus', { limit: 3 });
    if (result.results.length > 0) {
      assert.ok(result.results[0].snippet || result.results[0].description);
      assert.ok(result.results[0].title);
    }
  });

  await testAsync('searchWeb includes tenant site when available', async () => {
    const site = makeIndexedSite({
      entryId: 'zeus',
      title: 'Zeus Tenant Front',
      tenantName: 'Crawler Test Tenant',
      tenantCategory: 'cloud',
      tenantFrontUrl: 'https://tenant.example.com',
      status: 'active',
      trustTier: 'canonical',
    });
    const result = await crawlerDb.searchWeb('zeus', { limit: 10 });
    const hasTenant = result.results.some((r) => r.tenant?.name === 'Crawler Test Tenant');
    assert.ok(hasTenant, 'expected tenant site to appear in search results');
    site.cleanup();
  });

  await testAsync('searchWeb applies LTR boost to clicked sites', async () => {
    const result = await crawlerDb.searchWeb('ares', { limit: 10 });
    if (result.results.length < 2) {
      console.log('    (skipped: fewer than 2 ares results)');
      return;
    }
    const first = result.results[0];
    const second = result.results[1];
    for (let i = 0; i < 5; i++) {
      ltr.recordClick({ query: 'ares', siteId: second.id, position: 1, source: 'test' });
    }
    const boosted = await crawlerDb.searchWeb('ares', { limit: 10 });
    const boostedSecond = boosted.results.find((r) => r.id === second.id);
    const boostedFirst = boosted.results.find((r) => r.id === first.id);
    assert.ok(boostedSecond, 'clicked site still in results');
    assert.ok(boostedFirst, 'previous top site still in results');
    assert.ok(
      boosted.results.findIndex((r) => r.id === second.id) <=
        boosted.results.findIndex((r) => r.id === first.id),
      'clicked site should not rank below the previous top site'
    );
  });

  await testAsync('searchWeb applies rank variant', async () => {
    const control = await crawlerDb.searchWeb('zeus', { limit: 5, variant: 'control' });
    const freshness = await crawlerDb.searchWeb('zeus', { limit: 5, variant: 'freshness' });
    assert.ok(control.results.length > 0, 'control should return results');
    assert.ok(freshness.results.length > 0, 'freshness should return results');
    assert.ok(
      freshness.results.some((r) => Object.hasOwn(r.scoreBreakdown || {}, 'variant')),
      'freshness results should carry a variant score breakdown'
    );
    assert.strictEqual(freshness.rankVariant, 'freshness');
    assert.strictEqual(control.rankVariant, 'control');
  });

  test('availability CRUD', () => {
    const before = crawlerDb.getAvailability('hades');
    crawlerDb.setAvailability('hades', 'hades.com', 'hades.com', 'available');
    const after = crawlerDb.getAvailability('hades');
    assert.ok(after);
    assert.strictEqual(after.status, 'available');
    if (before) {
      crawlerDb.setAvailability('hades', before.domain, before.punycode, before.status);
    } else {
      const db = new (require('better-sqlite3'))(require('../platform/db/db.js').getDbPath());
      db.prepare("DELETE FROM availability WHERE entry_id = 'hades'").run();
      db.close();
    }
  });

  test('getCrawlerStats returns dashboard numbers', () => {
    const stats = crawlerDb.getCrawlerStats();
    assert.ok(typeof stats.total_sites === 'number');
    assert.ok(typeof stats.active_sites === 'number');
    assert.ok(typeof stats.available_entries === 'number');
    assert.ok(Array.isArray(stats.by_pantheon));
    assert.ok(typeof stats.queue.pending === 'number');
  });

  test('submitDomain validates invalid input', async () => {
    const result = await crawlerDb.submitDomain({ domain: 'not a valid domain !!!' });
    assert.ok(result.error || result.status === 'invalid');
  });

  test('findDuplicateClusters runs without error', () => {
    const clusters = crawlerDb.findDuplicateClusters({ limit: 50 });
    assert.ok(Array.isArray(clusters));
  });

  testAsync('generatePeopleAlsoAsk handles empty and edge input', async () => {
    const empty = await crawlerDb.generatePeopleAlsoAsk('zzzzzzzz-no-entry');
    assert.ok(Array.isArray(empty));
    const normal = await crawlerDb.generatePeopleAlsoAsk('zeus');
    assert.ok(Array.isArray(normal));
  });

  console.log(`\nCrawler DB: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
