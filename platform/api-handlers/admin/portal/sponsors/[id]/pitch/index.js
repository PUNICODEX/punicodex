/**
 * POST /api/admin/portal/sponsors/:id/pitch/
 *
 * Renders the founding-sponsorship pitch email for a scouting prospect and
 * sends it. Body: { to, businessName?, recipientSite?, customNote?, offer? }.
 * Leasing permission required. Preview-first: { preview: true } renders the
 * exact email without delivering, counting, or changing status.
 *
 * Founding-code provisioning: the prospect's linked code is reused while it
 * is live; otherwise a temple-scoped single-use code is created (default
 * `free_months` × 1 — overridable via offer.kind per pitch) and bound to the
 * prospect so re-pitches quote the same code.
 */

const {
  setPortalCors,
  sendError,
  parseIdParam,
  portalAuth,
} = require('../../../../../../../api/admin/portal/_portal.js');
const discountService = require('../../../../../../api/discount-service.js');
const { sendEmail } = require('../../../../../../api/email.js');
const { logAction } = require('../../../../../../api/admin-actions.js');
const prospects = require('../../../../../../db/business-prospects.js');
const {
  buildPitchEmail,
  loadTemple,
  buildResonanceBullets,
} = require('../../../../../../api/pitch-email.js');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PITCHES_PER_PROSPECT = 3;

/** Same liveness rules as discount-service.validateCode — a pitch must never
 *  quote a code that would fail at the temple checkout. */
function codeIsLive(row) {
  if (!row || !row.active) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return false;
  if (row.max_uses != null && row.used_count >= row.max_uses) return false;
  return true;
}

/** Deterministic coupon-safe code name for a prospect's founding code. */
function codeNameFor(prospect) {
  const slug = String(prospect.domain || prospect.business_name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  return `SCOUT-${String(prospect.temple_id).toUpperCase().slice(0, 10)}-${slug}`.slice(0, 40);
}

async function ensureFoundingCode(prospect, offer, actor) {
  if (prospect.code_id) {
    const existing = await discountService.getCodeById(prospect.code_id);
    if (codeIsLive(existing)) return existing;
  }
  const kind = offer?.kind || 'free_months';
  const fields = {
    code: codeNameFor(prospect),
    kind,
    appliesTo: prospect.temple_id,
    maxUses: 1,
    note: `Scout pitch: ${prospect.business_name}${prospect.domain ? ` (${prospect.domain})` : ''}`,
  };
  if (kind === 'percent_off') fields.percent = offer.percent ?? 100;
  if (kind === 'fixed_off') fields.fixedCents = offer.fixedCents;
  if (kind === 'free_months' || kind === 'trial_extension')
    fields.freeMonths = offer.freeMonths ?? 1;
  if (kind === 'free_months_then_price') {
    fields.freeMonths = offer.freeMonths ?? 1;
    fields.thenPriceCents = offer.thenPriceCents;
  }
  const created = await discountService.createCode(fields, actor);
  await prospects.linkCode(prospect.id, created.id);
  return created;
}

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    const id = parseIdParam(req);
    if (id == null) return res.status(400).json({ error: 'Invalid prospect id' });

    const prospect = await prospects.getProspectById(id);
    if (!prospect) return res.status(404).json({ error: 'Sponsor prospect not found' });

    const wantsPreview = (req.body || {}).preview === true;
    if (!wantsPreview && prospect.status === 'active') {
      return res
        .status(409)
        .json({ error: `${prospect.business_name} is already an active sponsor` });
    }
    if (!wantsPreview && prospect.status === 'declined') {
      return res
        .status(409)
        .json({ error: `${prospect.business_name} has declined — do not re-contact` });
    }
    if (!wantsPreview && Number(prospect.pitch_count) >= MAX_PITCHES_PER_PROSPECT) {
      return res.status(429).json({
        error: `Already pitched ${prospect.pitch_count}× — further sends need a human decision`,
      });
    }

    const body = req.body || {};
    const to = typeof body.to === 'string' ? body.to.trim() : '';
    if (!EMAIL_RE.test(to)) {
      return res.status(400).json({ error: 'A valid recipient email is required' });
    }

    const businessName =
      typeof body.businessName === 'string' && body.businessName.trim()
        ? body.businessName.trim().slice(0, 120)
        : prospect.business_name;
    const recipientSite =
      typeof body.recipientSite === 'string' && body.recipientSite.trim()
        ? body.recipientSite.trim().slice(0, 200)
        : prospect.domain;
    const customNote =
      typeof body.customNote === 'string' && body.customNote.trim()
        ? body.customNote.trim().slice(0, 600)
        : null;

    const temple = loadTemple(prospect.temple_id);
    if (!temple) {
      return res.status(400).json({ error: `Unknown temple: ${prospect.temple_id}` });
    }

    // Provision (or reuse) the founding code even in preview mode so the
    // rendered email quotes the real code — reading a draft must show truth.
    const codeRow = await ensureFoundingCode(prospect, body.offer || {}, auth);
    const slots = await discountService.slotsForCode(codeRow);
    const patterns = buildResonanceBullets(temple.slug, businessName);
    // The sponsor brain: bespoke, explained resonance for THIS business on
    // THIS temple (namesake / industry seat / keyword+lore axes).
    const brain = require('../../../../../../api/sponsor-brain.js').explainMatch(
      {
        businessName,
        domain: recipientSite,
        industry: prospect.industry_name,
        industrySeat: prospect.industry_seat,
      },
      temple.slug
    );
    const pitch = buildPitchEmail({
      codeRow,
      temple,
      businessName,
      recipientSite,
      customNote,
      patterns,
      slots: slots.length ? slots : null,
      brain,
    });

    if (wantsPreview) {
      return res.json({
        preview: true,
        to,
        subject: pitch.subject,
        html: pitch.html,
        text: pitch.text,
        previewText: pitch.preview,
      });
    }

    const sent = await sendEmail({
      to,
      subject: pitch.subject,
      html: pitch.html,
      text: pitch.text,
      fromName: 'Martin Khoury (PuniCodex)',
      headers: {
        'List-Unsubscribe': '<mailto:support@punicodex.com?subject=not-for-us>',
      },
    });
    if (!sent.success) {
      return res.status(502).json({ error: 'Email delivery failed', detail: sent.error });
    }

    await prospects.markPitched(id);
    await logAction({
      adminUserId: auth.user?.id ?? null,
      action: 'portal.sponsor.pitch',
      target: `business_prospect:${id}`,
      meta: {
        prospectId: id,
        to,
        business: prospect.business_name,
        temple: prospect.temple_id,
        code: codeRow.code,
        mocked: sent.mocked === true,
        by: auth.user?.email ?? null,
      },
    });

    return res.json({
      sent: true,
      mocked: sent.mocked === true,
      to,
      subject: pitch.subject,
      preview: pitch.preview,
    });
  } catch (err) {
    sendError(res, err);
  }
};
