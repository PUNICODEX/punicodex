/**
 * Change-Request Pipeline Tests
 *
 * Service-level contracts for the sponsor creative-swap queue
 * (platform/api/tenant-portal.js createChangeRequest / reviewChangeRequest):
 *
 * - A staged request leaves the booking completely untouched until review.
 * - Approval applies atomically: the booking gets the staged creative AND the
 *   request flips to approved in the same transaction; the swap is visible in
 *   the public getSlots payload.
 * - Approval re-validates the target at review time: a booking that changed
 *   hands or left the creative-changeable statuses since the request fails
 *   with 409 target_moved, the request stays pending, and the booking keeps
 *   its creative.
 * - Re-request after reject works; requests on ended/cancelled/unpaid
 *   bookings are refused; requests on another account's booking are refused.
 *
 * Route-level coverage (auth gating, queue listing, double-review 409,
 * patron social links, audit rows) lives in tenant-portal.test.js and is not
 * duplicated here.
 *
 * DB bootstrap mirrors test/booking-publish-pause.test.js: an isolated copy
 * of the golden SQLite DB via prepareTestDb(__filename).
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

process.env.PLATFORM_URL = 'https://punicodex.com';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';

const Database = require('better-sqlite3');
const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const tenantPortal = require('../platform/api/tenant-portal.js');
const { createBooking, getBookingById, getSlots } = require('../platform/api/bookings.js');

function db() {
  return new Database(getTestDbPath(__filename));
}

// 1×1 transparent PNG (ratio 1.0 — passes the 600×600 slot aspect check
// after the normalizer cover-crops it to the square frame).
const PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

let emailCounter = 0;
function nextEmail(tag) {
  emailCounter += 1;
  return `cr-${tag}-${emailCounter}@changerequest.test`;
}

// Image requests normalize against the slot's exact frame, so allocate a
// square (600×600) box slot for them.
function allocSquareSlot() {
  const d = db();
  const row = d
    .prepare(
      `SELECT id, site_slug FROM ad_slots
        WHERE is_bundle = 0 AND status = 'available' AND width = 600 AND height = 600
        ORDER BY id LIMIT 1`
    )
    .get();
  d.close();
  if (!row) throw new Error('no available 600x600 slot left in the test DB');
  return row;
}

async function makeAccount(email) {
  const { account } = await tenantPortal.provisionTenantAccount(email);
  assert.ok(account?.id, `account provisioned for ${email}`);
  return account;
}

async function makeBooking(email, status = 'approved') {
  const slot = allocSquareSlot();
  const { id } = await createBooking({
    slotId: slot.id,
    email,
    companyName: 'Change Request Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: slot.site_slug,
  });
  const d = db();
  d.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
  d.close();
  return { id, slotId: slot.id, siteSlug: slot.site_slug };
}

async function expectPortalError(promise, status, { code, match } = {}) {
  await assert.rejects(promise, (err) => {
    assert.strictEqual(err.status, status, `expected ${status}, got ${err.status}: ${err.message}`);
    if (code) assert.strictEqual(err.code, code);
    if (match) assert.match(err.message, match);
    return true;
  });
}

function requestRow(id) {
  const d = db();
  const row = d.prepare('SELECT * FROM tenant_change_requests WHERE id = ?').get(id);
  d.close();
  return row;
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('staged: creating an image request leaves the booking completely untouched', async () => {
  const account = await makeAccount(nextEmail('staged'));
  const { id } = await makeBooking(account.email, 'approved');
  const before = await getBookingById(id);

  const request = await tenantPortal.createChangeRequest(account, {
    type: 'image',
    target: id,
    payload: { image: PNG_1X1, filename: 'swap.png' },
  });
  assert.strictEqual(request.status, 'pending');
  assert.strictEqual(request.targetKind, 'booking');
  assert.ok(
    request.payload.creativePath.startsWith('/uploads/tenant-requests/'),
    `staged under tenant-requests: ${request.payload.creativePath}`
  );

  const after = await getBookingById(id);
  assert.strictEqual(after.status, before.status, 'booking status untouched by staging');
  assert.strictEqual(after.creative_path, before.creative_path, 'creative untouched by staging');
  assert.strictEqual(
    after.creative_original_name,
    before.creative_original_name,
    'original name untouched by staging'
  );
});

test('approve: applies the staged creative atomically and the swap is visible in getSlots', async () => {
  const account = await makeAccount(nextEmail('apply'));
  const { id, slotId, siteSlug } = await makeBooking(account.email, 'approved');
  const request = await tenantPortal.createChangeRequest(account, {
    type: 'image',
    target: id,
    payload: { image: PNG_1X1, filename: 'approved-swap.png' },
  });

  const reviewed = await tenantPortal.reviewChangeRequest(request.id, 'approve', {
    note: 'On brand',
    reviewer: { user: { id: 1, email: 'admin@punicodex.com' } },
  });
  assert.strictEqual(reviewed.status, 'approved');
  assert.ok(reviewed.reviewedAt, 'review timestamp recorded');

  const booking = await getBookingById(id);
  assert.strictEqual(booking.creative_path, request.payload.creativePath, 'staged file applied');
  assert.strictEqual(booking.creative_original_name, 'approved-swap.png');
  assert.strictEqual(booking.status, 'approved', 'approval never moves the booking status');

  const slot = (await getSlots(siteSlug)).find((s) => s.id === slotId);
  assert.ok(slot, 'slot present in the public listing');
  assert.strictEqual(
    slot.creative_path,
    request.payload.creativePath,
    'the public payload serves the approved creative'
  );
});

test('approve: a booking that changed hands since the request fails with target_moved and nothing applies', async () => {
  const account = await makeAccount(nextEmail('moved'));
  const { id } = await makeBooking(account.email, 'approved');
  const request = await tenantPortal.createChangeRequest(account, {
    type: 'image',
    target: id,
    payload: { image: PNG_1X1, filename: 'moved-swap.png' },
  });

  // The booking is reassigned after the request was staged.
  const d = db();
  d.prepare("UPDATE bookings SET email = 'new-owner@changerequest.test' WHERE id = ?").run(id);
  d.close();

  await expectPortalError(
    tenantPortal.reviewChangeRequest(request.id, 'approve', {
      reviewer: { user: { id: 1, email: 'admin@punicodex.com' } },
    }),
    409,
    { code: 'target_moved' }
  );

  const row = requestRow(request.id);
  assert.strictEqual(
    row.status,
    'pending',
    'failed approval must roll back — request stays pending'
  );

  const booking = await getBookingById(id);
  assert.strictEqual(booking.creative_path, null, 'no creative applied to a moved target');
});

test('approve: a booking that ended since the request fails with target_moved and nothing applies', async () => {
  const account = await makeAccount(nextEmail('ended'));
  const { id } = await makeBooking(account.email, 'approved');
  const request = await tenantPortal.createChangeRequest(account, {
    type: 'image',
    target: id,
    payload: { image: PNG_1X1, filename: 'ended-swap.png' },
  });

  // The booking ends after the request was staged.
  const d = db();
  d.prepare("UPDATE bookings SET status = 'ended' WHERE id = ?").run(id);
  d.close();

  await expectPortalError(
    tenantPortal.reviewChangeRequest(request.id, 'approve', {
      reviewer: { user: { id: 1, email: 'admin@punicodex.com' } },
    }),
    409,
    { code: 'target_moved', match: /no longer accepting creative changes/ }
  );

  const row = requestRow(request.id);
  assert.strictEqual(
    row.status,
    'pending',
    'failed approval must roll back — request stays pending'
  );

  const booking = await getBookingById(id);
  assert.strictEqual(booking.status, 'ended');
  assert.strictEqual(booking.creative_path, null, 'no creative applied to a dead booking');
});

test('reject: leaves the booking untouched and a re-request after reject succeeds', async () => {
  const account = await makeAccount(nextEmail('rerequest'));
  const { id } = await makeBooking(account.email, 'approved');

  const first = await tenantPortal.createChangeRequest(account, {
    type: 'image',
    target: id,
    payload: { image: PNG_1X1, filename: 'first-try.png' },
  });
  const rejected = await tenantPortal.reviewChangeRequest(first.id, 'reject', {
    note: 'Too dark',
    reviewer: { user: { id: 1, email: 'admin@punicodex.com' } },
  });
  assert.strictEqual(rejected.status, 'rejected');
  assert.strictEqual(rejected.reviewerNote, 'Too dark');

  const booking = await getBookingById(id);
  assert.strictEqual(booking.creative_path, null, 'rejection never touches the booking');

  const second = await tenantPortal.createChangeRequest(account, {
    type: 'image',
    target: id,
    payload: { image: PNG_1X1, filename: 'second-try.png' },
  });
  assert.strictEqual(second.status, 'pending', 'a fresh request after reject is accepted');
  assert.notStrictEqual(second.id, first.id);
});

test('serial requests: the latest approval wins the frame', async () => {
  const account = await makeAccount(nextEmail('serial'));
  const { id } = await makeBooking(account.email, 'approved');

  const first = await tenantPortal.createChangeRequest(account, {
    type: 'image',
    target: id,
    payload: { image: PNG_1X1, filename: 'v1.png' },
  });
  await tenantPortal.reviewChangeRequest(first.id, 'approve', {
    reviewer: { user: { id: 1, email: 'admin@punicodex.com' } },
  });
  assert.strictEqual((await getBookingById(id)).creative_original_name, 'v1.png');

  const second = await tenantPortal.createChangeRequest(account, {
    type: 'image',
    target: id,
    payload: { image: PNG_1X1, filename: 'v2.png' },
  });
  await tenantPortal.reviewChangeRequest(second.id, 'approve', {
    reviewer: { user: { id: 1, email: 'admin@punicodex.com' } },
  });
  const booking = await getBookingById(id);
  assert.strictEqual(booking.creative_original_name, 'v2.png', 'the newer approval replaces v1');
  assert.strictEqual(booking.creative_path, second.payload.creativePath);
});

test('create: a request on an ended booking is refused with 400', async () => {
  const account = await makeAccount(nextEmail('ended'));
  const { id } = await makeBooking(account.email, 'ended');
  await expectPortalError(
    tenantPortal.createChangeRequest(account, {
      type: 'image',
      target: id,
      payload: { image: PNG_1X1, filename: 'zombie.png' },
    }),
    400,
    { match: /Cannot change the creative in status: ended/ }
  );
});

test('create: a request on a cancelled booking is refused with 400', async () => {
  const account = await makeAccount(nextEmail('cancelled'));
  const { id } = await makeBooking(account.email, 'cancelled');
  await expectPortalError(
    tenantPortal.createChangeRequest(account, {
      type: 'image',
      target: id,
      payload: { image: PNG_1X1, filename: 'zombie.png' },
    }),
    400,
    { match: /Cannot change the creative in status: cancelled/ }
  );
});

test('create: a request on an unpaid (pending_payment) booking is refused with 400', async () => {
  const account = await makeAccount(nextEmail('unpaid'));
  const { id } = await makeBooking(account.email, 'pending_payment');
  await expectPortalError(
    tenantPortal.createChangeRequest(account, {
      type: 'image',
      target: id,
      payload: { image: PNG_1X1, filename: 'early.png' },
    }),
    400,
    { match: /Cannot change the creative in status: pending_payment/ }
  );
});

test('create: a request on a rejected booking is allowed (sponsor fixes the creative)', async () => {
  const account = await makeAccount(nextEmail('fixrejected'));
  const { id } = await makeBooking(account.email, 'rejected');
  const request = await tenantPortal.createChangeRequest(account, {
    type: 'image',
    target: id,
    payload: { image: PNG_1X1, filename: 'fixed.png' },
  });
  assert.strictEqual(request.status, 'pending');
});

test('create: a request on another account’s booking → 403 not_owner', async () => {
  const owner = await makeAccount(nextEmail('realowner'));
  const stranger = await makeAccount(nextEmail('outsider'));
  const { id } = await makeBooking(owner.email, 'approved');
  await expectPortalError(
    tenantPortal.createChangeRequest(stranger, {
      type: 'image',
      target: id,
      payload: { image: PNG_1X1, filename: 'hijack.png' },
    }),
    403,
    { code: 'not_owner' }
  );
});

test('create: a non-numeric target → 400', async () => {
  const account = await makeAccount(nextEmail('badtarget'));
  await expectPortalError(
    tenantPortal.createChangeRequest(account, {
      type: 'image',
      target: 'not-a-number',
      payload: { image: PNG_1X1, filename: 'x.png' },
    }),
    400,
    { match: /numeric/ }
  );
});

test('review: an invalid action → 400', async () => {
  const account = await makeAccount(nextEmail('badaction'));
  const { id } = await makeBooking(account.email, 'approved');
  const request = await tenantPortal.createChangeRequest(account, {
    type: 'image',
    target: id,
    payload: { image: PNG_1X1, filename: 'x.png' },
  });
  await expectPortalError(
    tenantPortal.reviewChangeRequest(request.id, 'maybe', {
      reviewer: { user: { id: 1, email: 'admin@punicodex.com' } },
    }),
    400,
    { match: /action must be/ }
  );
  assert.strictEqual(requestRow(request.id).status, 'pending', 'invalid action changes nothing');
});

test('review: an unknown request id → 404', async () => {
  await expectPortalError(
    tenantPortal.reviewChangeRequest(999999999, 'approve', {
      reviewer: { user: { id: 1, email: 'admin@punicodex.com' } },
    }),
    404,
    { match: /not found/i }
  );
});

test('listChangeRequests returns only the account’s own requests', async () => {
  const accountA = await makeAccount(nextEmail('list-a'));
  const accountB = await makeAccount(nextEmail('list-b'));
  const bookingA = await makeBooking(accountA.email, 'approved');
  const bookingB = await makeBooking(accountB.email, 'approved');

  const reqA = await tenantPortal.createChangeRequest(accountA, {
    type: 'image',
    target: bookingA.id,
    payload: { image: PNG_1X1, filename: 'a.png' },
  });
  await tenantPortal.createChangeRequest(accountB, {
    type: 'image',
    target: bookingB.id,
    payload: { image: PNG_1X1, filename: 'b.png' },
  });

  const listA = await tenantPortal.listChangeRequests(accountA);
  assert.ok(
    listA.some((r) => r.id === reqA.id),
    'own request listed'
  );
  assert.ok(
    listA.every((r) => r.accountId === accountA.id),
    'no foreign requests leak into the list'
  );
});

async function run() {
  console.log('\n▸ Change-Request Pipeline Tests\n');
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${err.message}`);
      if (err.stack) console.error(err.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
  console.log(`\nChange-Request Pipeline: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();

process.on('exit', () => {
  // Best-effort cleanup of staged creative files written into the repo's
  // uploads tree (mirrors tenant-portal.test.js).
  try {
    fs.rmSync(
      path.join(__dirname, '..', 'platform', 'api', 'public', 'uploads', 'tenant-requests'),
      { recursive: true, force: true }
    );
  } catch {
    /* best effort */
  }
});
