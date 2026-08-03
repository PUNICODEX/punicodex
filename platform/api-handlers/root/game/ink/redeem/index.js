/**
 * POST /api/game/ink/redeem
 *
 * Redeem a completed Ink checkout exactly once. The browser returns from
 * Stripe with the session id; we verify payment with Stripe, grant the ink
 * (idempotent on stripe_session_id), and return the grant for the client to
 * apply locally. Server-verified: a session credits once, ever.
 *
 * Body: { sessionId } → { ok, ink, bundle, alreadyRedeemed? }
 */

const { handleError, setCors } = require('../../../../../../api/_utils');
const { checkPublicRateLimitByReq } = require('../../../../../api/public-rate-limiter');
const { get, run } = require('../../../../../db/operational');

const BUNDLE_INK = { spark: 500, flare: 1200, inferno: 3300 };

// Idempotent migration on serverless cold start (Vercel SQLite is ephemeral).
const { getDb } = require('../../../../../db/connection.js');
try {
  require('../../../../../db/migrate-game-ink.js').migrate(getDb());
} catch (err) {
  console.error('[game/ink/redeem] migration failed:', err.message);
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (
      !(await checkPublicRateLimitByReq(req, res, 'game-ink-redeem', { tier: 'public-strict' }))
    ) {
      return;
    }

    const body = req.body || {};
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
      return res.status(400).json({ error: 'A valid Stripe session id is required' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    let session = null;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (stripeErr) {
      // Unknown/expired session ids are client errors, not server faults.
      if (stripeErr && (stripeErr.code === 'resource_missing' || stripeErr.statusCode === 404)) {
        return res.status(400).json({ error: 'Unknown checkout session' });
      }
      throw stripeErr;
    }
    if (session?.payment_status !== 'paid') {
      return res.status(402).json({ error: 'This checkout has not been paid' });
    }
    if (session.metadata?.type !== 'game_ink') {
      return res.status(400).json({ error: 'Not an Ink checkout' });
    }

    const bundle = session.metadata.bundle;
    const ink = BUNDLE_INK[bundle] || Number(session.metadata.ink) || 0;
    if (!ink) return res.status(400).json({ error: 'Unknown Ink bundle' });

    // Idempotent claim: insert-or-ignore, then flip redeemed exactly once.
    await run(
      `INSERT INTO game_ink_purchases (stripe_session_id, bundle, email, ink_granted, amount_cents, currency, redeemed)
       VALUES ($1, $2, $3, $4, $5, $6, 0)
       ON CONFLICT (stripe_session_id) DO NOTHING`,
      [
        sessionId,
        bundle,
        session.customer_details?.email || null,
        ink,
        session.amount_total || 0,
        session.currency || 'usd',
      ]
    );
    const claimed = await run(
      'UPDATE game_ink_purchases SET redeemed = 1, redeemed_at = CURRENT_TIMESTAMP WHERE stripe_session_id = $1 AND redeemed = 0',
      [sessionId]
    );

    if (claimed.changes === 0) {
      const row = await get(
        'SELECT ink_granted, bundle FROM game_ink_purchases WHERE stripe_session_id = $1',
        [sessionId]
      );
      return res.json({
        ok: true,
        ink: row?.ink_granted || 0,
        bundle: row?.bundle || bundle,
        alreadyRedeemed: true,
      });
    }

    return res.json({ ok: true, ink, bundle });
  } catch (err) {
    handleError(res, err);
  }
};
