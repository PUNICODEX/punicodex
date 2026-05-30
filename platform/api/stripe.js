const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const { updateClaimStripeSession, markClaimPaid } = require('./claims');

const PRICE_BASE = 1500; // $15.00 in cents
const PRICE_PREMIUM = 3500; // $35.00 in cents

async function createCheckoutSession({ claimId, email, unicodeVariant, templateType }) {
  const amount = templateType === 'premium' ? PRICE_PREMIUM : PRICE_BASE;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `PUNYCODEX Domain Claim: ${unicodeVariant}`,
          description: `Unicode domain restoration + temple deployment`,
        },
        unit_amount: amount,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.PLATFORM_URL || 'http://localhost:3456'}/claim-success?id=${claimId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.PLATFORM_URL || 'http://localhost:3456'}/claim?id=${claimId}&canceled=true`,
    customer_email: email,
    metadata: {
      claim_id: String(claimId),
      unicode_variant: unicodeVariant,
    },
  });

  updateClaimStripeSession(claimId, session.id);
  return { sessionUrl: session.url, sessionId: session.id };
}

async function handleWebhook(payload, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.log('No webhook secret configured, skipping verification');
    return null;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const claim = markClaimPaid(session.id, session.payment_intent);
    return { event: 'payment.success', claim };
  }

  return { event: event.type, claim: null };
}

module.exports = {
  createCheckoutSession,
  handleWebhook,
  PRICE_BASE,
  PRICE_PREMIUM
};
