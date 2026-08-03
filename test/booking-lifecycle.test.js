/**
 * Booking lifecycle — stitched end-to-end journey.
 *
 * The full advertiser money path in one continuous flow, on an isolated copy
 * of the golden DB with Stripe and email mocked at the boundary:
 *   sendVerification -> checkVerification -> createBookingRequest (checkout
 *   session) -> Stripe webhook activation (+ tenant provisioning) -> creative
 *   upload (+ WebP sibling) -> admin approval -> slot shows creative publicly.
 *
 * The individual services have their own suites; this proves the joints.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';

const { prepareTestDb } = require('./helpers/test-db.js');
const testDb = prepareTestDb(__filename);

// The golden DB predates the tenant-portal migration; production applies it
// on cold start, so the isolated copy gets the same treatment here.
{
  const Database = require('better-sqlite3');
  const tmpDb = new Database(testDb);
  require('../platform/db/migrate-tenant-portal.js').migrate(tmpDb);
  tmpDb.close();
}

// Mock the Stripe SDK before any service loads.
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    webhooks: {
      constructEvent: (payload) =>
        JSON.parse(Buffer.isBuffer(payload) ? payload.toString('utf8') : payload),
    },
    checkout: {
      sessions: {
        create: async (config) => ({
          id: 'cs_test_mock',
          url: 'https://checkout.stripe.com/mock',
          mode: config.mode || 'payment',
        }),
      },
    },
  }),
};

// Capture email at the boundary (verification codes + notifications).
const emailModulePath = require.resolve('../platform/api/email.js');
const realEmail = require(emailModulePath);
const deliveredCodes = new Map();
const sentMail = [];
require.cache[emailModulePath].exports = {
  ...realEmail,
  sendVerificationCode: async ({ email, code }) => {
    deliveredCodes.set(email, code);
    return { success: true, mocked: true };
  },
  sendEmail: async (msg) => {
    sentMail.push(msg);
    return { success: true, mocked: true };
  },
  notifyApproved: async ({ email, slotName }) => {
    sentMail.push({ to: email, subject: `approved:${slotName}` });
    return { success: true, mocked: true };
  },
};

const {
  sendVerification,
  checkVerification,
  createBookingRequest,
} = require('../platform/api/booking-service');
const { uploadBookingCreative } = require('../platform/api/booking-upload');
const { approveBooking } = require('../platform/api/admin-booking-service');
const { getSlots, getBookingByToken } = require('../platform/api/bookings');

const EMAIL = 'journey@example.com';
let passed = 0;
let failed = 0;

async function test(name, fn) {
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
  console.log('\n▸ Booking Lifecycle E2E\n');

  let verificationToken;
  let booking;
  const slotState = {};

  await test('1. email verification code is delivered and exchanges for a session token', async () => {
    await sendVerification(EMAIL);
    const code = deliveredCodes.get(EMAIL);
    assert.ok(code && code.length === 6, '6-digit code delivered via email boundary');
    const bad = await checkVerification(EMAIL, '000000').then(
      () => null,
      (e) => e
    );
    assert.ok(bad && bad.status === 400, 'wrong code rejected');
    // Re-send because the failed attempt may consume nothing but be safe.
    await sendVerification(EMAIL);
    const result = await checkVerification(EMAIL, deliveredCodes.get(EMAIL));
    assert.ok(result.verified && result.verificationToken, 'verified session issued');
    verificationToken = result.verificationToken;
  });

  await test('2. booking request creates a pending booking and checkout session', async () => {
    const { get } = require('../platform/db/operational');
    const slot = await get(
      "SELECT id, width, height, price_cents FROM ad_slots WHERE is_bundle = 0 AND status = 'available' ORDER BY id LIMIT 1"
    );
    assert.ok(slot, 'golden DB must seed an available slot');
    slotState.slot = slot;
    const result = await createBookingRequest({
      slotId: slot.id,
      email: EMAIL,
      companyName: 'Journey Co',
      websiteUrl: 'https://journey.example.com',
      leaseMonths: 1,
      verificationToken,
    });
    assert.ok(result?.bookingId, 'booking id returned');
    booking = { id: result.bookingId, token: result.token };
    const row = await get('SELECT * FROM bookings WHERE id = $1', [booking.id]);
    assert.strictEqual(row.email, EMAIL);
    assert.strictEqual(row.stripe_session_id, 'cs_test_mock', 'checkout session recorded');
    assert.strictEqual(row.slot_id, slot.id);
    // The slot is now held — a second request for the same slot must conflict.
    await sendVerification(EMAIL);
    const secondToken = (await checkVerification(EMAIL, deliveredCodes.get(EMAIL)))
      .verificationToken;
    const conflict = await createBookingRequest({
      slotId: slot.id,
      email: EMAIL,
      companyName: 'Rival Co',
      leaseMonths: 1,
      verificationToken: secondToken,
    }).then(
      () => null,
      (e) => e
    );
    assert.ok(conflict && (conflict.status === 400 || conflict.status === 409));
  });

  await test('3. stripe webhook activates the booking and provisions the tenant account', async () => {
    const payload = JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_mock',
          mode: 'payment',
          payment_intent: 'pi_mock',
          amount_total: slotState.slot.price_cents,
          metadata: { type: 'booking' },
        },
      },
    });
    // Invoke the real serverless handler (raw stream body + signature header),
    // which runs processWebhook and then tenant provisioning.
    const webhookHandler = require('../api/webhook/index.js');
    const http = require('node:http');
    const result = await new Promise((resolve, reject) => {
      const req = new http.IncomingMessage(null);
      req.method = 'POST';
      req.url = '/api/webhook/';
      req.headers = { 'stripe-signature': 'sig_mock' };
      const res = new http.ServerResponse(req);
      let statusCode = 200;
      res.setHeader = () => {};
      res.status = (code) => {
        statusCode = code;
        return res;
      };
      res.json = (data) => resolve({ status: statusCode, body: data });
      res.end = () => resolve({ status: statusCode, body: null });
      req.push(payload);
      req.push(null);
      webhookHandler(req, res).catch(reject);
    });
    assert.strictEqual(result.status, 200);
    assert.deepStrictEqual(result.body, { received: true });

    const { get } = require('../platform/db/operational');
    const row = await get('SELECT status FROM bookings WHERE id = $1', [booking.id]);
    assert.strictEqual(
      row.status,
      'pending_upload',
      'paid booking must advance to pending_upload (awaiting creative)'
    );
    // Tenant self-service provisioning fires on activation.
    const account = await get('SELECT * FROM tenant_accounts WHERE email = $1', [EMAIL]);
    assert.ok(account, 'tenant account provisioned by the webhook');
    const tokenRow = await get('SELECT * FROM tenant_tokens WHERE account_id = $1', [account.id]);
    assert.ok(tokenRow, 'set-password token issued');
  });

  await test('4. creative upload stores original + WebP sibling and moves to pending_approval', async () => {
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(slotState.slot.width, slotState.slot.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, slotState.slot.width, slotState.slot.height);
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('Journey Co', 40, 80);
    const png = canvas.toBuffer('image/png');
    const result = await uploadBookingCreative(
      booking.token,
      { image: `data:image/png;base64,${png.toString('base64')}`, filename: 'journey.png' },
      {}
    );
    assert.strictEqual(result.status, 200);
    assert.ok(result.body.webpPath, 'webp sibling produced');
    const updated = await getBookingByToken(booking.token);
    assert.strictEqual(updated.status, 'pending_approval');
    assert.ok(updated.creative_path.endsWith('.png'));
  });

  await test('5. admin approval publishes the creative on the public slot listing', async () => {
    const { get } = require('../platform/db/operational');
    const result = await approveBooking(booking.id, 'Looks great', 'test-admin-token');
    assert.strictEqual(result.status, 'approved');
    const slots = await getSlots('nike');
    const slot = slots.find((s) => s.id === slotState.slot.id);
    assert.ok(slot, 'slot present in listing');
    assert.ok(slot.creative_path, 'creative path public');
    assert.ok(
      slot.creative_webp_path?.endsWith('.webp'),
      'webp rendition advertised to the display layer'
    );
    // Audit trail recorded the approval.
    const audit = await get(
      "SELECT * FROM admin_actions WHERE action = 'admin.booking.approve' AND booking_id = $1",
      [booking.id]
    );
    assert.ok(audit, 'approval audit-logged');
    // The advertiser was notified by email.
    assert.ok(
      sentMail.some((m) => m.to === EMAIL),
      'approval notification emailed'
    );
    // Clean up uploaded files.
    const rel = slot.creative_path.replace('/uploads/', '');
    fs.rmSync(
      path.join(__dirname, '..', 'platform', 'api', 'public', 'uploads', rel.split('/')[0]),
      {
        recursive: true,
        force: true,
      }
    );
  });

  console.log(`\nBooking Lifecycle E2E: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
