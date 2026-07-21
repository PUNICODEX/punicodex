const { processWebhook } = require('../../platform/api/webhook-handler');
const { handleError, setCors } = require('../_utils');
const { getDb } = require('../../platform/db/connection');
const { migrate: migratePatrons } = require('../../platform/db/migrate-patrons');

// Idempotent: the Vercel SQLite database lives in ephemeral /tmp, so make sure
// the patrons table exists before patron checkout.session.completed events are
// applied (patron activation runs through platform/api/stripe.js handleWebhook).
migratePatrons(getDb());

/**
 * Tenant portal provisioning (additive): when a booking or patron activates,
 * create-or-find the tenant account for the contact email and email the
 * portal link (one-time set-password link on first use). Fire-and-forget —
 * a provisioning or email failure must never fail the webhook.
 */
async function provisionTenantPortalAccount(result) {
  try {
    if (!result?.type) return;
    let email = null;
    let kind = null;
    if (result.type === 'booking' && result.booking?.email) {
      email = result.booking.email;
      kind = 'sponsor';
    } else if (result.type === 'patron' && result.patron?.email) {
      email = result.patron.email;
      kind = 'patron';
    }
    if (!email) return;

    const tenantPortal = require('../../platform/api/tenant-portal');
    const { notifyTenantAccountProvisioned } = require('../../platform/api/email');
    const { token } = await tenantPortal.provisionTenantAccount(email, { kind });
    const setPasswordUrl = token
      ? `${process.env.PLATFORM_URL || 'http://localhost:3456'}/account/?token=${encodeURIComponent(token)}`
      : null;
    await notifyTenantAccountProvisioned({ email, kind, setPasswordUrl }).catch(() => {});
  } catch (err) {
    console.error('Tenant portal provisioning error:', err.message);
  }
}

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const rawBody = await getRawBody(req);
    const result = await processWebhook(rawBody, signature);
    await provisionTenantPortalAccount(result);

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    handleError(res, err);
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
