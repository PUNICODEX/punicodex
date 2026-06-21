const { updateClaimStripeSession, markClaimPaid } = require('./claims');
const { extendBooking } = require('./bookings');

function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }
  return key;
}

function getStripe() {
  const stripe = require('stripe');
  return stripe(getStripeSecretKey());
}

const PRICE_BASE = 1500; // $15.00 in cents
const PRICE_PREMIUM = 3500; // $35.00 in cents

async function createCheckoutSession({ claimId, email, unicodeVariant, templateType }) {
  const amount = templateType === 'premium' ? PRICE_PREMIUM : PRICE_BASE;

  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `PUNYCODEX Domain Claim: ${unicodeVariant}`,
            description: `Unicode domain restoration + temple deployment`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.PLATFORM_URL || 'http://localhost:3456'}/claim-success?id=${claimId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.PLATFORM_URL || 'http://localhost:3456'}/claim?id=${claimId}&canceled=true`,
    customer_email: email,
    metadata: {
      type: 'claim',
      claim_id: String(claimId),
      unicode_variant: unicodeVariant,
    },
  });

  updateClaimStripeSession(claimId, session.id);
  return { sessionUrl: session.url, sessionId: session.id };
}

async function createBookingCheckoutSession({
  bookingId,
  email,
  slotName,
  amountCents,
  token,
  leaseMonths = 1,
  trialMonths = 0,
  siteSlug = 'nike',
  siteName = 'Níkē',
}) {
  const isTrial = trialMonths > 0;
  const durationLabel = leaseMonths === 12 ? '12-month' : '30-day';
  const trialLabel = isTrial ? `${trialMonths}-month free trial, then ` : '';

  const lineItem = {
    price_data: {
      currency: 'usd',
      product_data: {
        name: `${siteName} Ad Space: ${slotName}`,
        description: `${trialLabel}${durationLabel} advertising placement on ${siteName}.com`,
      },
      unit_amount: amountCents,
    },
    quantity: 1,
  };

  const sessionConfig = {
    payment_method_types: ['card'],
    line_items: [lineItem],
    success_url: `${process.env.PLATFORM_URL || 'http://localhost:3456'}/sites/${siteSlug}/?booking=${token}&paid=1`,
    cancel_url: `${process.env.PLATFORM_URL || 'http://localhost:3456'}/sites/${siteSlug}/?booking=${token}&canceled=1`,
    customer_email: email,
    metadata: {
      type: 'booking',
      booking_id: String(bookingId),
      slot_name: slotName,
      lease_months: String(leaseMonths),
      trial_months: String(trialMonths),
    },
  };

  if (isTrial) {
    sessionConfig.mode = 'subscription';
    lineItem.price_data.recurring = { interval: 'month' };
    sessionConfig.subscription_data = {
      trial_period_days: trialMonths * 30,
      metadata: {
        booking_id: String(bookingId),
      },
    };
  } else {
    sessionConfig.mode = 'payment';
  }

  const session = await getStripe().checkout.sessions.create(sessionConfig);

  return { sessionUrl: session.url, sessionId: session.id, mode: sessionConfig.mode };
}

async function createRenewalCheckoutSession({
  bookingId,
  email,
  slotName,
  amountCents,
  token,
  extensionMonths = 12,
  siteSlug = 'nike',
  siteName = 'Níkē',
}) {
  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${siteName} Ad Space Renewal: ${slotName}`,
            description: `Extend your advertising placement by ${extensionMonths} months on ${siteName}.com`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.PLATFORM_URL || 'http://localhost:3456'}/sites/${siteSlug}/?booking=${token}&renewed=1`,
    cancel_url: `${process.env.PLATFORM_URL || 'http://localhost:3456'}/sites/${siteSlug}/?booking=${token}&canceled=1`,
    customer_email: email,
    metadata: {
      type: 'booking_renewal',
      booking_id: String(bookingId),
      slot_name: slotName,
      extension_months: String(extensionMonths),
    },
  });

  return { sessionUrl: session.url, sessionId: session.id };
}

async function handleWebhook(payload, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata || {};

    if (metadata.type === 'booking') {
      const { markBookingPaid } = require('./bookings');
      const isSubscription = session.mode === 'subscription';
      const paymentIntent = isSubscription ? session.subscription || null : session.payment_intent;
      const amountTotal = isSubscription ? 0 : session.amount_total;
      const subscriptionId = isSubscription ? session.subscription || null : null;
      const booking = markBookingPaid(session.id, paymentIntent, amountTotal, subscriptionId);
      return { event: 'payment.success', type: 'booking', booking, mode: session.mode };
    }
    if (metadata.type === 'booking_renewal') {
      const bookingId = parseInt(metadata.booking_id, 10);
      const extensionMonths = parseInt(metadata.extension_months, 10) || 12;
      const booking = extendBooking(bookingId, extensionMonths, session.amount_total || 0);
      return { event: 'payment.success', type: 'booking_renewal', booking };
    }
    const claim = markClaimPaid(session.id, session.payment_intent);
    return { event: 'payment.success', type: 'claim', claim };
  }

  return { event: event.type, claim: null, booking: null };
}

module.exports = {
  createCheckoutSession,
  createBookingCheckoutSession,
  createRenewalCheckoutSession,
  handleWebhook,
  PRICE_BASE,
  PRICE_PREMIUM,
};
