/** Debug probe for the booking lifecycle (not a test). */
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy';
const { prepareTestDb } = require('../test/helpers/test-db.js');
prepareTestDb('debug-lifecycle');
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    webhooks: { constructEvent: (p) => (typeof p === 'string' ? JSON.parse(p) : p) },
    checkout: { sessions: { create: async () => ({ id: 'cs_test_mock', url: 'x', mode: 'payment' }) } },
  }),
};
const emailModulePath = require.resolve('../platform/api/email.js');
const realEmail = require(emailModulePath);
const codes = new Map();
require.cache[emailModulePath].exports = {
  ...realEmail,
  sendVerificationCode: async ({ email, code }) => {
    codes.set(email, code);
    return { success: true };
  },
  sendEmail: async () => ({ success: true }),
};
(async () => {
  const bs = require('../platform/api/booking-service');
  const { processWebhook } = require('../platform/api/webhook-handler');
  const { uploadBookingCreative } = require('../platform/api/booking-upload');
  const { get } = require('../platform/db/operational');
  const slot = await get(
    "SELECT id, width, height, price_cents FROM ad_slots WHERE is_bundle = 0 AND status = 'available' ORDER BY id LIMIT 1"
  );
  console.log('slot:', JSON.stringify(slot));
  await bs.sendVerification('dbg@example.com');
  const v = await bs.checkVerification('dbg@example.com', codes.get('dbg@example.com'));
  const r = await bs.createBookingRequest({
    slotId: slot.id,
    email: 'dbg@example.com',
    companyName: 'Dbg',
    leaseMonths: 1,
    verificationToken: v.verificationToken,
  });
  console.log('booking result:', JSON.stringify(r));
  const b = await get('SELECT * FROM bookings WHERE id = $1', [r.bookingId]);
  console.log('status pre-webhook:', b.status, '| session:', b.stripe_session_id);
  const res = await processWebhook(
    JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_mock',
          mode: 'payment',
          payment_intent: 'pi',
          amount_total: slot.price_cents,
          metadata: { type: 'booking' },
        },
      },
    }),
    'sig'
  );
  console.log('webhook result:', JSON.stringify(res && { type: res.type, mode: res.mode }));
  const b2 = await get('SELECT status, stripe_payment_intent FROM bookings WHERE id = $1', [
    r.bookingId,
  ]);
  console.log('status post-webhook:', JSON.stringify(b2));
  const { createCanvas } = require('canvas');
  const c = createCanvas(slot.width, slot.height);
  c.getContext('2d').fillRect(0, 0, slot.width, slot.height);
  const png = c.toBuffer('image/png');
  const up = await uploadBookingCreative(
    r.token,
    { image: `data:image/png;base64,${png.toString('base64')}`, filename: 'x.png' },
    {}
  );
  console.log('upload:', JSON.stringify(up));
})().catch((e) => {
  console.error('ERR', e.message, e.stack ? e.stack.split('\n')[1] : '');
  process.exit(1);
});
