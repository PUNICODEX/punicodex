const { updateClaimStripeSession, markClaimPaid } = require('./claims');
const { extendBooking } = require('./bookings');
const {
  createPatronCheckoutRecord,
  markPatronPaid,
  cancelPatronBySubscriptionId,
} = require('./patron-service');

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

function addMonthsUtc(date, months) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

async function createCheckoutSession({ claimId, email, unicodeVariant, templateType }) {
  const amount = templateType === 'premium' ? PRICE_PREMIUM : PRICE_BASE;

  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `PUNICODEX Domain Claim: ${unicodeVariant}`,
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

  await updateClaimStripeSession(claimId, session.id);
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
    // Belt-and-braces lease termination: even if our expiry cron never runs,
    // Stripe stops billing when the paid lease term ends (creation + lease
    // months — the same window goLive stamps into bookings.ends_at).
    const leaseEnd = addMonthsUtc(new Date(), leaseMonths);
    sessionConfig.subscription_data = {
      trial_period_days: trialMonths * 30,
      cancel_at: Math.floor(leaseEnd.getTime() / 1000),
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

async function createPatronCheckoutSession({
  templeId,
  email,
  displayName,
  title,
  message,
  amountCents,
  socialPlatform,
  socialUrl,
  siteName = 'PUNICODEX',
}) {
  const patron = await createPatronCheckoutRecord({
    templeId,
    email,
    displayName,
    title,
    message,
    amountCents,
    socialPlatform,
    socialUrl,
  });

  const amount = patron.amountCents;
  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${siteName} Temple Patron`,
            description: `Monthly patronage of ${patron.displayName} on the ${siteName} temple`,
          },
          unit_amount: amount,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.PLATFORM_URL || 'http://localhost:3456'}/sites/${templeId}/?patron=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.PLATFORM_URL || 'http://localhost:3456'}/sites/${templeId}/?patron=canceled`,
    customer_email: patron.email,
    metadata: {
      type: 'patron',
      patron_id: String(patron.id),
      temple_id: String(patron.templeId),
    },
    subscription_data: {
      metadata: {
        patron_id: String(patron.id),
        temple_id: String(patron.templeId),
      },
    },
  });

  return { sessionUrl: session.url, sessionId: session.id, patronId: patron.id };
}

async function createCreativeCheckoutSession({ purchaseId, email, assetTitle, amountCents }) {
  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `PuniCodex Creative Asset: ${assetTitle}`,
            description: 'Single-use license for myth-inspired student creative work',
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.PLATFORM_URL || 'http://localhost:3456'}/creatives/?purchase={CHECKOUT_SESSION_ID}&paid=1`,
    cancel_url: `${process.env.PLATFORM_URL || 'http://localhost:3456'}/creatives/?purchase={CHECKOUT_SESSION_ID}&canceled=1`,
    customer_email: email,
    metadata: {
      type: 'creative_purchase',
      creative_purchase_id: String(purchaseId),
    },
  });

  return { sessionUrl: session.url, sessionId: session.id };
}

async function createStoreCheckoutSession({ order, product }) {
  const base = process.env.PLATFORM_URL || 'http://localhost:3456';
  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description:
              order.variant_label && order.variant_label !== 'One size'
                ? `PuniCodex merch — ${order.variant_label}`
                : 'PuniCodex merch — printed on demand',
          },
          unit_amount: product.unitPriceCents,
        },
        quantity: order.quantity,
      },
    ],
    mode: 'payment',
    shipping_address_collection: { allowed_countries: ['US', 'GB', 'AU', 'CA', 'DE', 'FR', 'NZ'] },
    success_url: `${base}/store/?order=${order.order_ref}&session_id={CHECKOUT_SESSION_ID}&paid=1`,
    cancel_url: `${base}/store/?order=${order.order_ref}&canceled=1`,
    customer_email: order.customer_email || undefined,
    metadata: {
      type: 'store_order',
      order_ref: order.order_ref,
      ...(order.artwork_key ? { artwork_key: order.artwork_key } : {}),
    },
    payment_intent_data: {
      metadata: {
        type: 'store_order',
        order_ref: order.order_ref,
        ...(order.artwork_key ? { artwork_key: order.artwork_key } : {}),
      },
    },
  });

  return { sessionUrl: session.url, sessionId: session.id };
}

/**
 * Resolve a sponsor booking from a Stripe subscription id. Sponsorship
 * subscriptions (monthly/annual leases) persist their subscription id on the
 * booking row at payment time.
 */
async function findBookingBySubscriptionId(subscriptionId) {
  const { get } = require('../db/operational');
  return get(
    `
      SELECT b.*, s.name AS slot_name, s.slug AS slot_slug
      FROM bookings b
      JOIN ad_slots s ON b.slot_id = s.id
      WHERE b.stripe_subscription_id = $1
    `,
    [subscriptionId]
  );
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

    if (metadata.type === 'patron') {
      const patronId = parseInt(metadata.patron_id, 10);
      const subscriptionId = session.subscription;
      const customerId = session.customer;
      const amountTotal = session.amount_total || 0;
      const patron = await markPatronPaid(patronId, subscriptionId, customerId, amountTotal);
      return { event: 'payment.success', type: 'patron', patron };
    }

    if (metadata.type === 'booking') {
      const { markBookingPaid } = require('./bookings');
      const isSubscription = session.mode === 'subscription';
      const paymentIntent = isSubscription ? session.subscription || null : session.payment_intent;
      const amountTotal = isSubscription ? 0 : session.amount_total;
      const subscriptionId = isSubscription ? session.subscription || null : null;
      const booking = await markBookingPaid(session.id, paymentIntent, amountTotal, subscriptionId);
      return { event: 'payment.success', type: 'booking', booking, mode: session.mode };
    }
    if (metadata.type === 'booking_renewal') {
      const bookingId = parseInt(metadata.booking_id, 10);
      const extensionMonths = parseInt(metadata.extension_months, 10) || 12;
      const renewal = await extendBooking(
        bookingId,
        extensionMonths,
        session.amount_total || 0,
        session.id
      );
      if (renewal?.extended) {
        const { notifyRenewalConfirmed } = require('./email');
        notifyRenewalConfirmed({
          email: renewal.booking.email,
          slotName: renewal.booking.slot_name,
          siteSlug: renewal.booking.site_slug,
          amountCents: session.amount_total || 0,
          newEndDate: renewal.booking.ends_at,
          bookingToken: renewal.booking.analytics_token,
        }).catch(() => {});
      }
      return {
        event: 'payment.success',
        type: 'booking_renewal',
        booking: renewal?.booking ?? null,
      };
    }
    if (metadata.type === 'creative_purchase') {
      const { markCreativePurchasePaid } = require('./creative-marketplace-db');
      const purchase = await markCreativePurchasePaid(
        session.id,
        session.payment_intent,
        session.amount_total || 0
      );
      return { event: 'payment.success', type: 'creative_purchase', purchase };
    }
    if (metadata.type === 'store_order') {
      const { markStoreOrderPaid } = require('./store-orders');
      const order = markStoreOrderPaid({
        orderRef: metadata.order_ref,
        stripeSessionId: session.id,
        stripePaymentIntent: session.payment_intent,
        session,
      });
      return { event: 'payment.success', type: 'store_order', order };
    }
    const claim = await markClaimPaid(session.id, session.payment_intent);
    return { event: 'payment.success', type: 'claim', claim };
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription || null;
    // Dunning: when a sponsor's subscription invoice fails, mark the booking
    // past_due and tell them why — otherwise billing silently stops and the
    // placement dies later at lease expiry with no explanation.
    if (subscriptionId) {
      const booking = await findBookingBySubscriptionId(subscriptionId);
      if (booking) {
        const { setBillingStatus } = require('./bookings');
        await setBillingStatus(booking.id, 'past_due');
        const { notifyPaymentFailed, getDashboardUrl, getSiteDisplayName } = require('./email');
        notifyPaymentFailed(booking.email, {
          slotName: booking.slot_name,
          siteName: getSiteDisplayName(booking.site_slug),
          dashboardUrl: getDashboardUrl(booking.analytics_token, booking.site_slug),
        }).catch(() => {});
        return { event: 'invoice.payment_failed', type: 'booking', booking };
      }
    }
    return { event: event.type, claim: null, booking: null, patron: null };
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const patron = await cancelPatronBySubscriptionId(subscription.id);
    if (patron) {
      return { event: 'subscription.cancelled', type: 'patron', patron };
    }
    // A sponsor who cancels through the Stripe portal: end the placement and
    // tell them it ended. The subscription is ALREADY deleted, so skip the
    // Stripe cancel inside endBooking — it aborts the whole end when the
    // cancel call fails, and cancelling a deleted subscription fails.
    const booking = await findBookingBySubscriptionId(subscription.id);
    if (booking && ['live', 'approved'].includes(booking.status)) {
      const { endBooking } = require('./bookings');
      await endBooking(booking.id, { skipStripeCancel: true });
      const { notifyRevoked } = require('./email');
      notifyRevoked({
        email: booking.email,
        slotName: booking.slot_name,
        companyName: booking.company_name,
        siteSlug: booking.site_slug,
      }).catch(() => {});
      return { event: 'subscription.cancelled', type: 'booking', bookingId: booking.id };
    }
  }

  return { event: event.type, claim: null, booking: null, patron: null };
}

module.exports = {
  createCheckoutSession,
  createBookingCheckoutSession,
  createRenewalCheckoutSession,
  createCreativeCheckoutSession,
  createPatronCheckoutSession,
  createStoreCheckoutSession,
  handleWebhook,
  getStripe,
  PRICE_BASE,
  PRICE_PREMIUM,
};
