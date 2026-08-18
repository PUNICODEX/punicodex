/**
 * Account Endpoint Contract Tests
 *
 * Negative-path and enrichment contracts for the advertiser self-service
 * service layer (platform/api/tenant-portal.js):
 *
 * - publishOwnBooking / pauseOwnBooking / updateOwnBookingMeta: unknown id
 *   → 404, non-numeric id → 400, wrong account → 403 not_owner, and the
 *   per-status conflicts (publish only from approved, pause only from live,
 *   meta only in image-changeable statuses).
 * - Input validation: over-limit subtitle, whitespace/scheme/wrong-type
 *   destination URLs, wrong-type heading/subtitle (the validateMeta type
 *   guard), and the empty-string URL clear.
 * - getMe enrichment: hasCreative across booking-creative / slot_creatives /
 *   no-creative states — including the negative `hasCreative: false` case —
 *   pendingImageRequest across pending / rejected request states, cross-account
 *   isolation, and the owner-scoped dashboardToken.
 *
 * The happy paths (owned publish, owned pause, meta edit + re-review, char
 * limits, https rule, slot_creatives hasCreative) live in
 * account-booking-controls.test.js and are not duplicated here.
 *
 * DB bootstrap mirrors test/booking-publish-pause.test.js: an isolated copy
 * of the golden SQLite DB via prepareTestDb(__filename).
 */

const assert = require('node:assert');

process.env.PLATFORM_URL = 'https://punicodex.com';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';

const Database = require('better-sqlite3');
const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const tenantPortal = require('../platform/api/tenant-portal.js');
const { createBooking, goLive, getBookingById } = require('../platform/api/bookings.js');

function db() {
  return new Database(getTestDbPath(__filename));
}

let emailCounter = 0;
function nextEmail(tag) {
  emailCounter += 1;
  return `contracts-${tag}-${emailCounter}@contracts.test`;
}

function allocSlot() {
  const d = db();
  const row = d
    .prepare(
      "SELECT id, site_slug FROM ad_slots WHERE is_bundle = 0 AND status = 'available' ORDER BY id LIMIT 1"
    )
    .get();
  d.close();
  if (!row) throw new Error('no available slot left in the test DB');
  return row;
}

async function makeAccount(email) {
  const { account } = await tenantPortal.provisionTenantAccount(email);
  assert.ok(account?.id, `account provisioned for ${email}`);
  return account;
}

async function makeBooking(email, { status = 'pending_upload', creative = false } = {}) {
  const slot = allocSlot();
  const { id } = await createBooking({
    slotId: slot.id,
    email,
    companyName: 'Contract Test Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: slot.site_slug,
  });
  const d = db();
  if (creative) {
    d.prepare(
      "UPDATE bookings SET creative_path = '/uploads/test/contracts-creative.png' WHERE id = ?"
    ).run(id);
  }
  d.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
  d.close();
  return id;
}

async function expectPortalError(promise, status, { code, match } = {}) {
  await assert.rejects(promise, (err) => {
    assert.strictEqual(err.status, status, `expected ${status}, got ${err.status}: ${err.message}`);
    if (code) assert.strictEqual(err.code, code);
    if (match) assert.match(err.message, match);
    return true;
  });
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// ─── publishOwnBooking contracts ──────────────────────────────

test('publishOwnBooking: unknown booking id → 404', async () => {
  const account = await makeAccount(nextEmail('pub-404'));
  await expectPortalError(tenantPortal.publishOwnBooking(account, 999999999), 404, {
    match: /not found/i,
  });
});

test('publishOwnBooking: non-numeric booking id → 400', async () => {
  const account = await makeAccount(nextEmail('pub-400'));
  await expectPortalError(tenantPortal.publishOwnBooking(account, 'abc'), 400, {
    match: /numeric/,
  });
});

test('publishOwnBooking: approved booking without any creative → 409', async () => {
  const account = await makeAccount(nextEmail('pub-nocreative'));
  const id = await makeBooking(account.email, { status: 'approved' });
  await expectPortalError(tenantPortal.publishOwnBooking(account, id), 409, {
    match: /creative is required/,
  });
  assert.strictEqual((await getBookingById(id)).status, 'approved', 'booking must not move');
});

test('publishOwnBooking: already live (double publish) → 409', async () => {
  const account = await makeAccount(nextEmail('pub-double'));
  const id = await makeBooking(account.email, { status: 'approved', creative: true });
  await goLive(id);
  await expectPortalError(tenantPortal.publishOwnBooking(account, id), 409, {
    match: /Cannot publish/,
  });
  assert.strictEqual((await getBookingById(id)).status, 'live', 'booking stays live');
});

test('publishOwnBooking: ended booking → 409', async () => {
  const account = await makeAccount(nextEmail('pub-ended'));
  const id = await makeBooking(account.email, { status: 'ended', creative: true });
  await expectPortalError(tenantPortal.publishOwnBooking(account, id), 409, {
    match: /Cannot publish/,
  });
});

test('publishOwnBooking: rejected booking → 409', async () => {
  const account = await makeAccount(nextEmail('pub-rejected'));
  const id = await makeBooking(account.email, { status: 'rejected', creative: true });
  await expectPortalError(tenantPortal.publishOwnBooking(account, id), 409, {
    match: /Cannot publish/,
  });
});

// ─── pauseOwnBooking contracts ────────────────────────────────

test('pauseOwnBooking: unknown booking id → 404', async () => {
  const account = await makeAccount(nextEmail('pause-404'));
  await expectPortalError(tenantPortal.pauseOwnBooking(account, 999999999), 404, {
    match: /not found/i,
  });
});

test("pauseOwnBooking: another account's booking → 403 not_owner", async () => {
  const owner = await makeAccount(nextEmail('pause-owner'));
  const stranger = await makeAccount(nextEmail('pause-stranger'));
  const id = await makeBooking(owner.email, { status: 'approved', creative: true });
  await goLive(id);
  await expectPortalError(tenantPortal.pauseOwnBooking(stranger, id), 403, {
    code: 'not_owner',
  });
  assert.strictEqual((await getBookingById(id)).status, 'live', 'rejected pause must not move');
});

test('pauseOwnBooking: pending_upload (not live) → 409', async () => {
  const account = await makeAccount(nextEmail('pause-early'));
  const id = await makeBooking(account.email, { status: 'pending_upload' });
  await expectPortalError(tenantPortal.pauseOwnBooking(account, id), 409);
  assert.strictEqual((await getBookingById(id)).status, 'pending_upload');
});

test('pauseOwnBooking: ended booking → 409', async () => {
  const account = await makeAccount(nextEmail('pause-ended'));
  const id = await makeBooking(account.email, { status: 'ended', creative: true });
  await expectPortalError(tenantPortal.pauseOwnBooking(account, id), 409);
});

// ─── updateOwnBookingMeta contracts ───────────────────────────

test('updateOwnBookingMeta: unknown booking id → 404', async () => {
  const account = await makeAccount(nextEmail('meta-404'));
  await expectPortalError(
    tenantPortal.updateOwnBookingMeta(account, 999999999, { customHeading: 'Hi' }),
    404,
    { match: /not found/i }
  );
});

test("updateOwnBookingMeta: another account's booking → 403 not_owner", async () => {
  const owner = await makeAccount(nextEmail('meta-owner'));
  const stranger = await makeAccount(nextEmail('meta-stranger'));
  const id = await makeBooking(owner.email, { status: 'pending_upload' });
  await expectPortalError(
    tenantPortal.updateOwnBookingMeta(stranger, id, { customHeading: 'Hijack' }),
    403,
    { code: 'not_owner' }
  );
  assert.strictEqual(
    (await getBookingById(id)).custom_heading,
    null,
    'rejected edit must not write anything'
  );
});

test('updateOwnBookingMeta: non-numeric booking id → 400', async () => {
  const account = await makeAccount(nextEmail('meta-400'));
  await expectPortalError(
    tenantPortal.updateOwnBookingMeta(account, 'not-a-number', { customHeading: 'Hi' }),
    400,
    { match: /numeric/ }
  );
});

test('updateOwnBookingMeta: ended booking is not editable → 400', async () => {
  const account = await makeAccount(nextEmail('meta-ended'));
  const id = await makeBooking(account.email, { status: 'ended' });
  await expectPortalError(
    tenantPortal.updateOwnBookingMeta(account, id, { customHeading: 'Zombie' }),
    400,
    { match: /Cannot edit ad copy in status: ended/ }
  );
});

test('updateOwnBookingMeta: pending_payment booking is not editable → 400', async () => {
  const account = await makeAccount(nextEmail('meta-unpaid'));
  const id = await makeBooking(account.email, { status: 'pending_payment' });
  await expectPortalError(
    tenantPortal.updateOwnBookingMeta(account, id, { customHeading: 'Early' }),
    400,
    { match: /Cannot edit ad copy in status: pending_payment/ }
  );
});

test('updateOwnBookingMeta: subtitle over the slot char limit → 400', async () => {
  const account = await makeAccount(nextEmail('meta-longsub'));
  const id = await makeBooking(account.email, { status: 'pending_upload' });
  await expectPortalError(
    tenantPortal.updateOwnBookingMeta(account, id, {
      customSubtitle: 'x'.repeat(120), // over every slot shape's subtitle limit (max 100)
    }),
    400,
    { match: /Subtitle exceeds/ }
  );
  assert.strictEqual(
    (await getBookingById(id)).custom_subtitle,
    null,
    'rejected edit must not write anything'
  );
});

test('updateOwnBookingMeta: non-string heading → 400 (type guard)', async () => {
  const account = await makeAccount(nextEmail('meta-typehead'));
  const id = await makeBooking(account.email, { status: 'pending_upload' });
  await expectPortalError(
    tenantPortal.updateOwnBookingMeta(account, id, { customHeading: 42 }),
    400,
    { match: /customHeading must be a string/ }
  );
});

test('updateOwnBookingMeta: non-string subtitle → 400 (type guard)', async () => {
  const account = await makeAccount(nextEmail('meta-typesub'));
  const id = await makeBooking(account.email, { status: 'pending_upload' });
  await expectPortalError(
    tenantPortal.updateOwnBookingMeta(account, id, { customSubtitle: { text: 'hi' } }),
    400,
    { match: /customSubtitle must be a string/ }
  );
});

test('updateOwnBookingMeta: destination URL with whitespace → 400', async () => {
  const account = await makeAccount(nextEmail('meta-spaceurl'));
  const id = await makeBooking(account.email, { status: 'pending_upload' });
  await expectPortalError(
    tenantPortal.updateOwnBookingMeta(account, id, { websiteUrl: 'https://exa mple.com' }),
    400,
    { match: /https/ }
  );
});

test('updateOwnBookingMeta: non-https scheme destination → 400', async () => {
  const account = await makeAccount(nextEmail('meta-scheme'));
  const id = await makeBooking(account.email, { status: 'pending_upload' });
  await expectPortalError(
    tenantPortal.updateOwnBookingMeta(account, id, { websiteUrl: 'javascript:alert(1)' }),
    400,
    { match: /https/ }
  );
});

test('updateOwnBookingMeta: non-string destination → 400', async () => {
  const account = await makeAccount(nextEmail('meta-typeurl'));
  const id = await makeBooking(account.email, { status: 'pending_upload' });
  await expectPortalError(tenantPortal.updateOwnBookingMeta(account, id, { websiteUrl: 42 }), 400, {
    match: /https/,
  });
});

test('updateOwnBookingMeta: empty-string destination clears the link', async () => {
  const account = await makeAccount(nextEmail('meta-clear'));
  const id = await makeBooking(account.email, { status: 'pending_upload' });
  const d = db();
  d.prepare("UPDATE bookings SET website_url = 'https://old.example.com' WHERE id = ?").run(id);
  d.close();
  const result = await tenantPortal.updateOwnBookingMeta(account, id, { websiteUrl: '' });
  assert.deepStrictEqual(result, { success: true });
  assert.strictEqual(
    (await getBookingById(id)).website_url,
    null,
    'empty string clears the destination link'
  );
});

// ─── getMe enrichment contracts ───────────────────────────────

test('getMe: a booking with no creative anywhere reports hasCreative: false', async () => {
  const account = await makeAccount(nextEmail('me-nocreative'));
  const id = await makeBooking(account.email, { status: 'pending_upload' });
  const me = await tenantPortal.getMe(account);
  const booking = me.resources.bookings.find((b) => b.id === id);
  assert.ok(booking, 'owned booking appears in getMe');
  assert.strictEqual(booking.hasCreative, false, 'no creative anywhere → honestly false');
  assert.strictEqual(booking.pendingImageRequest, false);
});

test('getMe: a slot_creatives row with a NULL creative_path does not count as a creative', async () => {
  const account = await makeAccount(nextEmail('me-nullcreative'));
  const id = await makeBooking(account.email, { status: 'approved' });
  const d = db();
  d.prepare(
    `INSERT INTO slot_creatives (booking_id, slot_id, creative_path, custom_heading)
     VALUES (?, (SELECT slot_id FROM bookings WHERE id = ?), NULL, 'copy only')`
  ).run(id, id);
  d.close();
  const me = await tenantPortal.getMe(account);
  const booking = me.resources.bookings.find((b) => b.id === id);
  assert.strictEqual(
    booking.hasCreative,
    false,
    'a copy-only slot_creatives row is not a creative'
  );
});

test('getMe: pendingImageRequest tracks the request lifecycle (pending → true, rejected → false)', async () => {
  const account = await makeAccount(nextEmail('me-reqlifecycle'));
  const id = await makeBooking(account.email, { status: 'live', creative: true });

  const d = db();
  const requestId = d
    .prepare(
      `INSERT INTO tenant_change_requests (account_id, target_kind, target_id, type, payload, status)
       VALUES (?, 'booking', ?, 'image', '{}', 'pending') RETURNING id`
    )
    .get(account.id, id).id;
  d.close();

  let me = await tenantPortal.getMe(account);
  assert.strictEqual(
    me.resources.bookings.find((b) => b.id === id).pendingImageRequest,
    true,
    'a pending image request is flagged'
  );

  const d2 = db();
  d2.prepare("UPDATE tenant_change_requests SET status = 'rejected' WHERE id = ?").run(requestId);
  d2.close();

  me = await tenantPortal.getMe(account);
  assert.strictEqual(
    me.resources.bookings.find((b) => b.id === id).pendingImageRequest,
    false,
    'a rejected request clears the flag'
  );
});

test('getMe: never lists another account’s bookings', async () => {
  const owner = await makeAccount(nextEmail('me-realowner'));
  const stranger = await makeAccount(nextEmail('me-outsider'));
  const id = await makeBooking(owner.email, { status: 'live', creative: true });

  const me = await tenantPortal.getMe(stranger);
  assert.ok(
    !me.resources.bookings.some((b) => b.id === id),
    'a stranger’s panel must not contain the booking'
  );
});

test('getMe: the owner receives their dashboardToken; the shape carries the panel fields', async () => {
  const account = await makeAccount(nextEmail('me-token'));
  const id = await makeBooking(account.email, { status: 'approved', creative: true });
  const me = await tenantPortal.getMe(account);
  const booking = me.resources.bookings.find((b) => b.id === id);
  assert.ok(booking, 'owned booking appears');
  const raw = await getBookingById(id);
  assert.strictEqual(
    booking.dashboardToken,
    raw.analytics_token,
    'the owner gets the dashboard credential'
  );
  assert.strictEqual(booking.status, 'approved');
  assert.strictEqual(typeof booking.slotName, 'string');
  assert.strictEqual(typeof booking.slotSlug, 'string');
  assert.strictEqual(typeof booking.isBundle, 'boolean');
  assert.strictEqual(booking.customHeading, '');
  assert.strictEqual(booking.customSubtitle, '');
});

async function run() {
  console.log('\n▸ Account Endpoint Contract Tests\n');
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
  console.log(`\nAccount Endpoint Contracts: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
