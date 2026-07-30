/**
 * POST /api/game/ink/checkout
 *
 * Pure Ink purchase for Mythic Duel — no account required: Stripe collects
 * the email; the ink is redeemed by the returning browser (redeem-once,
 * server-verified, idempotent on the Stripe session id).
 *
 * Body: { bundle: 'spark' | 'flare' | 'inferno' }
 * → { url } (Stripe Checkout session URL)
 */

const { handleError, setCors } = require('../../_utils');
const { checkPublicRateLimitByReq } = require('../../../platform/api/public-rate-limiter');

const BUNDLES = {
  spark: { id: 'spark', name: 'Spark of Ink — 500 ✦', ink: 500, amountCents: 499 },
  flare: { id: 'flare', name: 'Flare of Ink — 1,200 ✦', ink: 1200, amountCents: 999 },
  inferno: { id: 'inferno', name: 'Inferno of Ink — 3,300 ✦', ink: 3300, amountCents: 1999 },
};

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!(await checkPublicRateLimitByReq(req, res, 'game-ink-checkout', { tier: 'public-strict' }))) {
      return;
    }

    const body = req.body || {};
    const bundle = BUNDLES[body.bundle];
    if (!bundle) {
      return res.status(400).json({ error: `bundle must be one of: ${Object.keys(BUNDLES).join(', ')}` });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const origin = 'https://punicodex.com';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: bundle.amountCents,
            product_data: {
              name: bundle.name,
              description: `${bundle.ink.toLocaleString('en-US')} Ink for Mythic Duel — the trading-card game of the Unicode Pantheon.`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { type: 'game_ink', bundle: bundle.id, ink: String(bundle.ink) },
      success_url: `${origin}/game/?ink_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/game/`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    handleError(res, err);
  }
};
