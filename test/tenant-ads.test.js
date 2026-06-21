/**
 * Tenant Search Advertising Tests
 */

const assert = require('node:assert');
const {
  createTenantAd,
  getTenantAd,
  listTenantAds,
  findTenantAdsForQuery,
  getTenantAdsForEntry,
  updateTenantAd,
  deleteTenantAd,
  recordTenantAdEvent,
} = require('../platform/api/tenant-ads-service');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  let passed = 0;
  let failed = 0;

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

  console.log(`\nTenant Ads: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

let createdId;

test('creates a tenant ad for a known entry', () => {
  const ad = createTenantAd({
    entryId: 'zeus',
    companyName: 'Olympian Hosting',
    websiteUrl: 'https://olympian.example.com',
    displayUrl: 'olympian.example.com',
    headline: 'Rule the skies with Olympian Hosting',
    description: 'Premium domains for thunderous brands.',
    bidScore: 2.5,
  });
  assert.ok(ad);
  assert.strictEqual(ad.entryId, 'zeus');
  assert.strictEqual(ad.status, 'active');
  createdId = ad.id;
});

test('retrieves a tenant ad by id', () => {
  const ad = getTenantAd(createdId);
  assert.ok(ad);
  assert.strictEqual(ad.companyName, 'Olympian Hosting');
});

test('lists tenant ads for an entry', () => {
  const ads = listTenantAds({ entryId: 'zeus', status: 'active' });
  assert.ok(ads.length > 0);
  assert.ok(ads.some((a) => a.id === createdId));
});

test('finds ads by exact entry query', () => {
  const ads = findTenantAdsForQuery('zeus');
  assert.ok(ads.length > 0);
  assert.ok(ads.some((a) => a.entryId === 'zeus'));
});

test('finds ads by Unicode query', () => {
  const ads = findTenantAdsForQuery('Zeús');
  assert.ok(ads.length > 0);
  assert.ok(ads.some((a) => a.entryId === 'zeus'));
});

test('finds ads for a temple entry', () => {
  const ads = getTenantAdsForEntry('zeus');
  assert.ok(ads.length > 0);
});

test('updates tenant ad status', () => {
  const ad = updateTenantAd(createdId, { status: 'paused' });
  assert.strictEqual(ad.status, 'paused');
  updateTenantAd(createdId, { status: 'active' });
});

test('rejects creating an ad for an unknown entry', () => {
  assert.throws(
    () =>
      createTenantAd({
        entryId: 'not-a-real-entry',
        companyName: 'Test',
        websiteUrl: 'https://example.com',
        headline: 'Test',
      }),
    /Unknown lexicon entry/
  );
});

test('rejects creating an ad without required fields', () => {
  assert.throws(() => createTenantAd({ entryId: 'zeus' }));
});

test('respects active date windows', () => {
  const expiredAd = createTenantAd({
    entryId: 'zeus',
    companyName: 'Expired Ad',
    websiteUrl: 'https://expired.example.com',
    headline: 'Expired',
    activeUntil: new Date(Date.now() - 86400000),
  });
  const activeAds = getTenantAdsForEntry('zeus');
  assert.ok(!activeAds.some((a) => a.id === expiredAd.id));
  deleteTenantAd(expiredAd.id);
});

test('records analytics events', () => {
  assert.doesNotThrow(() => {
    recordTenantAdEvent({
      tenantAdId: createdId,
      eventType: 'impression',
      ip: '127.0.0.1',
      userAgent: 'test',
      referrer: 'test',
    });
  });
});

test('deletes a tenant ad', () => {
  deleteTenantAd(createdId);
  assert.strictEqual(getTenantAd(createdId), null);
});

run();
