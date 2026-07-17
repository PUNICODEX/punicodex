/**
 * PuniCodex — Partner program tests
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const {
  registerPartner,
  validatePartnerKey,
  submitRecord,
  queryRecords,
  listPartners,
} = require('../platform/api/partners');

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

console.log('Partner Tests');

test('register and validate partner key', () => {
  const partner = registerPartner({
    name: unique('Test Partner'),
    tier: 'pro',
    scopes: ['read', 'write'],
  });
  assert.ok(partner.apiKey);
  const validated = validatePartnerKey(partner.apiKey);
  assert.ok(validated);
  assert.strictEqual(validated.tier, 'pro');
  assert.ok(validatePartnerKey('invalid-key') === null);
});

test('submit and query records', () => {
  const partner = registerPartner({ name: unique('Record Partner') });
  const validated = validatePartnerKey(partner.apiKey);
  const record = {
    recordId: unique('rec'),
    domain: 'zeús.com',
    punycode: 'xn--zes-fma.com',
    license: 'CC BY 4.0',
  };
  submitRecord(validated.id, record);
  const results = queryRecords({ q: record.recordId, limit: 10 });
  assert.ok(results.total >= 1);
  assert.ok(results.records.some((r) => r.recordId === record.recordId));
});

test('list partners', () => {
  registerPartner({ name: unique('List Partner') });
  const list = listPartners();
  assert.ok(list.length > 0);
});

if (!process.exitCode) {
  console.log('\n✓ All Partner tests passed');
} else {
  console.log('\n✗ Some Partner tests failed');
  process.exit(1);
}
