/**
 * PuniCodex — Marketplace tests
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const { prepareTestDb, cleanupTestDb } = require('./helpers/test-db');

const suiteName = 'marketplace';
prepareTestDb(__filename);

const marketplace = require('../platform/api/marketplace');

function unique(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err.message);
    process.exitCode = 1;
  }
}

console.log('Marketplace Tests');

test('lease inquiry CRUD', () => {
  const token = unique('session-m1');
  const inquiry = marketplace.createLeaseInquiry(token, {
    entryId: 'zeus',
    email: 'test@example.com',
    message: 'Interested',
  });
  assert.ok(inquiry.id);
  assert.strictEqual(inquiry.status, 'inquiry');
  const list = marketplace.getLeaseInquiries(token);
  assert.ok(list.some((i) => i.id === inquiry.id));
});

test('lease status can be updated', () => {
  const token = unique('session-m-status');
  const inquiry = marketplace.createLeaseInquiry(token, {
    entryId: 'athena',
    email: 'test@example.com',
    message: 'Offer',
  });
  marketplace.updateLeaseStatus(inquiry.id, 'negotiating');
  const list = marketplace.getLeaseInquiries(token);
  const updated = list.find((i) => i.id === inquiry.id);
  assert.ok(updated);
  assert.strictEqual(updated.status, 'negotiating');
});

test('premium listings', () => {
  const listing = marketplace.createPremiumListing('zeus', {
    tier: 'crown',
    headline: 'Crown Jewel',
    askingPrice: 50000,
  });
  assert.strictEqual(listing.headline, 'Crown Jewel');
  assert.strictEqual(listing.askingPrice, 50000);
  const all = marketplace.listPremiumListings(10);
  assert.ok(all.some((l) => l.entryId === 'zeus'));
});

test('premium listing upsert updates existing row', () => {
  const entryId = unique('upsert-entry');
  marketplace.createPremiumListing(entryId, { tier: 'featured', headline: 'First' });
  const updated = marketplace.createPremiumListing(entryId, {
    tier: 'crown',
    headline: 'Second',
    askingPrice: 1234,
  });
  assert.strictEqual(updated.tier, 'crown');
  assert.strictEqual(updated.headline, 'Second');
  assert.strictEqual(updated.askingPrice, 1234);
});

test('registrar price comparison', () => {
  marketplace.setRegistrarPrice('com', 'namecheap', { price: 1099, currency: 'USD' });
  const prices = marketplace.compareRegistrars('zeus.com');
  assert.ok(prices.some((p) => p.registrar === 'namecheap' && p.price === 1099));
});

test('registrar comparison defaults to com when domain has no dot', () => {
  marketplace.setRegistrarPrice('com', 'porkbun', { price: 999, currency: 'USD' });
  const prices = marketplace.compareRegistrars('zeus');
  assert.ok(prices.some((p) => p.registrar === 'porkbun' && p.price === 999));
});

test('reviews', () => {
  const token = unique('session-m2');
  const entryId = unique('test-entry');
  marketplace.addReview(token, { entryId, rating: 5, review: 'Magnificent domain.' });
  const reviews = marketplace.getReviews(entryId);
  assert.strictEqual(reviews.count, 1);
  assert.strictEqual(reviews.average, 5);
  assert.ok(reviews.reviews[0].review.includes('Magnificent'));
});

test('review ratings outside 1-5 are rejected', () => {
  const token = unique('session-m3');
  const entryId = unique('test-entry-rating');
  assert.throws(
    () => marketplace.addReview(token, { entryId, rating: 0, review: 'Too low' }),
    /entryId and rating 1-5 required/
  );
  assert.throws(
    () => marketplace.addReview(token, { entryId, rating: 6, review: 'Too high' }),
    /entryId and rating 1-5 required/
  );
});

if (!process.exitCode) {
  console.log('\n✓ All Marketplace tests passed');
} else {
  console.log('\n✗ Some Marketplace tests failed');
}

cleanupTestDb(suiteName);

if (process.exitCode) {
  process.exit(1);
}
