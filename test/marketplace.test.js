/**
 * PÚNYCODEX — Marketplace tests
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
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

test('registrar price comparison', () => {
  marketplace.setRegistrarPrice('com', 'namecheap', { price: 1099, currency: 'USD' });
  const prices = marketplace.compareRegistrars('zeus.com');
  assert.ok(prices.some((p) => p.registrar === 'namecheap' && p.price === 1099));
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

if (!process.exitCode) {
  console.log('\n✓ All Marketplace tests passed');
} else {
  console.log('\n✗ Some Marketplace tests failed');
  process.exit(1);
}
