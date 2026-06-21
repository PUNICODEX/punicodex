/**
 * Admin Booking Routes Tests
 *
 * Exercises the Vercel serverless wrappers for the admin booking lifecycle
 * against an isolated copy of the SQLite database.
 */

const assert = require('node:assert');
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test-admin-password-for-ci';

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const { login: adminLogin } = require('../platform/api/admin.js');
const { invoke, adminHeader } = require('./helpers/http.js');

let adminToken;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 3).join('\n'));
    process.exit(1);
  }
}

async function runTests() {
  console.log('\n▸ Admin Booking Routes Tests\n');

  adminToken = (await adminLogin(process.env.ADMIN_PASSWORD)).token;

  const bookingsHandler = require('../api/admin/bookings/index.js');

  await test('GET /api/admin/bookings requires admin token', async () => {
    const noAuth = await invoke(bookingsHandler, 'GET', '/api/admin/bookings');
    assert.strictEqual(noAuth.status, 401);
  });

  await test('GET /api/admin/bookings lists bookings and stats', async () => {
    const res = await invoke(bookingsHandler, 'GET', '/api/admin/bookings', {
      headers: adminHeader(adminToken),
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.bookings));
    assert.ok(typeof res.body.stats === 'object');
  });

  let createdId;

  await test('POST /api/admin/bookings creates a booking', async () => {
    const res = await invoke(bookingsHandler, 'POST', '/api/admin/bookings', {
      headers: adminHeader(adminToken),
      body: {
        slotId: 1,
        email: 'advertiser@example.com',
        companyName: 'Test Co',
        websiteUrl: 'https://example.com',
        customHeading: 'Great Products',
        customSubtitle: 'Try us today for great deals',
        leaseMonths: 1,
        trialMonths: 0,
      },
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'pending_upload');
    assert.ok(res.body.bookingId);
    createdId = res.body.bookingId;
  });

  await test('POST /api/admin/bookings/:id/approve', async () => {
    const handler = require('../api/admin/bookings/[id]/approve/index.js');
    const res = await invoke(handler, 'POST', `/api/admin/bookings/${createdId}/approve`, {
      headers: adminHeader(adminToken),
      body: { note: 'Looks good' },
      params: { id: String(createdId) },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'approved');
  });

  await test('POST /api/admin/bookings/:id/golive', async () => {
    const handler = require('../api/admin/bookings/[id]/golive/index.js');
    const res = await invoke(handler, 'POST', `/api/admin/bookings/${createdId}/golive`, {
      headers: adminHeader(adminToken),
      params: { id: String(createdId) },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'live');
  });

  await test('POST /api/admin/bookings/:id/end', async () => {
    const handler = require('../api/admin/bookings/[id]/end/index.js');
    const res = await invoke(handler, 'POST', `/api/admin/bookings/${createdId}/end`, {
      headers: adminHeader(adminToken),
      params: { id: String(createdId) },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ended');
  });

  await test('POST /api/admin/bookings rejects a slot that is already reserved', async () => {
    const createRes = await invoke(bookingsHandler, 'POST', '/api/admin/bookings', {
      headers: adminHeader(adminToken),
      body: {
        slotId: 9,
        email: 'reserved-slot@example.com',
        companyName: 'Reserved Co',
        leaseMonths: 1,
        trialMonths: 0,
      },
    });
    assert.strictEqual(createRes.status, 201);

    const secondRes = await invoke(bookingsHandler, 'POST', '/api/admin/bookings', {
      headers: adminHeader(adminToken),
      body: {
        slotId: 9,
        email: 'reserved-slot-2@example.com',
        companyName: 'Reserved Two',
        leaseMonths: 1,
        trialMonths: 0,
      },
    });
    assert.strictEqual(secondRes.status, 409);
  });

  await test('POST /api/admin/bookings/:id/golive rejects an unapproved booking', async () => {
    const createRes = await invoke(bookingsHandler, 'POST', '/api/admin/bookings', {
      headers: adminHeader(adminToken),
      body: {
        slotId: 10,
        email: 'unapproved-golive@example.com',
        companyName: 'Unapproved Co',
        leaseMonths: 1,
        trialMonths: 0,
      },
    });
    assert.strictEqual(createRes.status, 201);

    const handler = require('../api/admin/bookings/[id]/golive/index.js');
    const res = await invoke(
      handler,
      'POST',
      `/api/admin/bookings/${createRes.body.bookingId}/golive`,
      {
        headers: adminHeader(adminToken),
        params: { id: String(createRes.body.bookingId) },
      }
    );
    assert.strictEqual(res.status, 409);
  });

  let rejectedId;

  await test('POST /api/admin/bookings/:id/reject', async () => {
    const createRes = await invoke(bookingsHandler, 'POST', '/api/admin/bookings', {
      headers: adminHeader(adminToken),
      body: {
        slotId: 8,
        email: 'rejected@example.com',
        companyName: 'Bad Actor',
        leaseMonths: 1,
        trialMonths: 0,
      },
    });
    rejectedId = createRes.body.bookingId;

    const handler = require('../api/admin/bookings/[id]/reject/index.js');
    const res = await invoke(handler, 'POST', `/api/admin/bookings/${rejectedId}/reject`, {
      headers: adminHeader(adminToken),
      body: { note: 'Policy violation' },
      params: { id: String(rejectedId) },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'rejected');
  });

  await test('GET /api/admin/revenue returns revenue stats', async () => {
    const handler = require('../api/admin/revenue/index.js');
    const res = await invoke(handler, 'GET', '/api/admin/revenue?days=7', {
      headers: adminHeader(adminToken),
    });
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body.totalRevenueCents === 'number');
    assert.ok(Array.isArray(res.body.daily));
  });

  await test('POST /api/admin/trial-reminders returns counts', async () => {
    const handler = require('../api/admin/trial-reminders/index.js');
    const res = await invoke(handler, 'POST', '/api/admin/trial-reminders', {
      headers: adminHeader(adminToken),
    });
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body.checked === 'number');
  });

  console.log('\nAdmin Booking Routes: all tests passed');
}

runTests();
