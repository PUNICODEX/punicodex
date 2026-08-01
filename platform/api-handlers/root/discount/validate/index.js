/**
 * POST /api/discount/validate
 *
 * Public, rate-limited validation of a sponsorship discount code for the
 * temple sponsor CTA. Body: { code, temple, leaseMonths }.
 *
 * Scope: temple SPONSORSHIPS (ad-slot bookings) only. This system never
 * touches patrons — patronage has no discount codes and no endpoint.
 *
 * Privacy contract: every failure returns the identical { valid:false,
 * reason:'invalid_code' } shape, whether the code is unknown, inactive,
 * expired, exhausted, or scoped to another temple — the response never
 * reveals whether a code exists beyond what the sponsor typed. Internals
 * (max_uses, used_count, created_by, note) are never exposed. The price is
 * resolved server-side from the temple's bundle slot; the client never
 * states the price.
 *
 * CORS is pinned to https://punicodex.com (the sponsor form's origin).
 */

const { handleError } = require('../../../../../api/_utils');
const { checkPublicRateLimitByReq } = require('../../../../api/public-rate-limiter');
const discountService = require('../../../../api/discount-service');
const { get } = require('../../../../db/operational');

const ALLOWED_ORIGIN = 'https://punicodex.com';

function setValidateCors(req, res) {
  if (req.headers?.origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

// The sponsorship application price is the temple's Full Page Takeover
// bundle price; fall back to the temple's most expensive slot.
async function templePriceCents(temple) {
  const bundle = await get(
    'SELECT price_cents FROM ad_slots WHERE site_slug = $1 AND is_bundle = 1 ORDER BY price_cents DESC LIMIT 1',
    [temple]
  );
  if (bundle) return bundle.price_cents;
  const any = await get(
    'SELECT MAX(price_cents) AS price_cents FROM ad_slots WHERE site_slug = $1',
    [temple]
  );
  return any?.price_cents ?? null;
}

module.exports = async (req, res) => {
  setValidateCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (
      !(await checkPublicRateLimitByReq(req, res, 'discount-validate', { tier: 'public-strict' }))
    ) {
      return;
    }

    const body = req.body || {};
    const code = typeof body.code === 'string' ? body.code.trim().slice(0, 40) : '';
    const temple = typeof body.temple === 'string' ? body.temple.trim().toLowerCase() : '';
    const leaseMonths = parseInt(body.leaseMonths, 10);
    const slotId = body.slotId == null || body.slotId === '' ? null : parseInt(body.slotId, 10);

    if (!code || !/^[a-z0-9-]{1,64}$/.test(temple) || ![1, 12].includes(leaseMonths)) {
      return res
        .status(400)
        .json({ error: 'code, temple, and leaseMonths (1 or 12) are required' });
    }
    if (body.slotId != null && body.slotId !== '' && !Number.isInteger(slotId)) {
      return res.status(400).json({ error: 'slotId must be an integer when provided' });
    }

    // Per-slot pricing when a frame is named (slot-scoped codes need it);
    // otherwise the temple's bundle (takeover) reference price.
    let priceCents = null;
    if (slotId !== null) {
      const slot = await get('SELECT price_cents FROM ad_slots WHERE id = $1 AND site_slug = $2', [
        slotId,
        temple,
      ]);
      if (!slot) {
        return res.status(404).json({ error: 'Unknown slot for this temple' });
      }
      priceCents = slot.price_cents;
    } else {
      priceCents = await templePriceCents(temple);
    }
    if (priceCents == null) {
      return res.status(404).json({ error: 'Unknown temple' });
    }

    const result = await discountService.validateCode({
      code,
      siteSlug: temple,
      leaseMonths,
      priceCents,
      slotId,
    });
    if (!result.valid) {
      // One generic shape for every failure — never reveal whether the code
      // exists, only that what the sponsor typed does not work.
      return res.json({ valid: false, reason: 'invalid_code' });
    }

    return res.json({
      valid: true,
      code: result.code,
      terms: result.terms,
      pricing: result.pricing,
      // A nil term is complimentary: no card, no checkout, no auto-renewal.
      complimentary: result.pricing.finalCents === 0,
    });
  } catch (err) {
    handleError(res, err);
  }
};
