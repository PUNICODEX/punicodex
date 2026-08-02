/**
 * POST /api/admin/portal/discounts/:id/pitch/
 *
 * Renders the founding-sponsorship pitch email for a discount code and sends
 * it to the prospect. Body: { to, businessName, recipientSite?, customNote? }.
 * Leasing role required. The send is fire-and-report: the response carries the
 * rendered subject either way, plus `mocked: true` when RESEND_API_KEY is unset.
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
const { buildPitchEmail, loadTemple, buildResonanceBullets } = require('../../../../../../api/pitch-email.js');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    const id = parseIdParam(req);
    if (id == null) return res.status(400).json({ error: 'Invalid discount code id' });

    const body = req.body || {};
    const to = typeof body.to === 'string' ? body.to.trim() : '';
    if (!EMAIL_RE.test(to)) return res.status(400).json({ error: 'A valid recipient email is required' });

    const businessName =
      typeof body.businessName === 'string' && body.businessName.trim()
        ? body.businessName.trim().slice(0, 120)
        : null;
    if (!businessName) return res.status(400).json({ error: 'businessName is required' });

    const recipientSite =
      typeof body.recipientSite === 'string' && body.recipientSite.trim()
        ? body.recipientSite.trim().slice(0, 200)
        : null;
    const customNote =
      typeof body.customNote === 'string' && body.customNote.trim()
        ? body.customNote.trim().slice(0, 600)
        : null;

    const codeRow = await discountService.getCodeById(id);
    if (!codeRow) return res.status(404).json({ error: 'Discount code not found' });
    // A dead code must never be emailed to a prospect: the pitch quotes the
    // code verbatim and redeeming it would fail at the temple checkout. Same
    // liveness rules as discount-service.validateCode.
    if (!codeRow.active) return res.status(400).json({ error: 'Discount code is inactive' });
    if (codeRow.expires_at && new Date(codeRow.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Discount code has expired' });
    }
    if (codeRow.max_uses != null && codeRow.used_count >= codeRow.max_uses) {
      return res.status(400).json({ error: 'Discount code has no uses remaining' });
    }
    if (codeRow.applies_to === 'all') {
      return res.status(400).json({ error: 'Pitch emails need a temple-scoped code' });
    }

    const temple = loadTemple(codeRow.applies_to);
    if (!temple) return res.status(400).json({ error: `Unknown temple: ${codeRow.applies_to}` });

    const patterns = buildResonanceBullets(temple.slug, businessName);
    const pitch = buildPitchEmail({ codeRow, temple, businessName, recipientSite, customNote, patterns });

    const sent = await sendEmail({ to, subject: pitch.subject, html: pitch.html, text: pitch.text });
    if (!sent.success) {
      return res.status(502).json({ error: 'Email delivery failed', detail: sent.error });
    }

    // Audit trail: who pitched which code to whom (mocked sends included —
    // they are still operator actions taken against a prospect).
    await logAction({
      adminUserId: auth.user?.id ?? null,
      action: 'portal.discount.pitch',
      target: `discount_code:${id}`,
      meta: { codeId: id, to, code: codeRow.code, mocked: sent.mocked === true, by: auth.user?.email ?? null },
    });

    return res.json({
      sent: true,
      mocked: sent.mocked === true,
      to,
      subject: pitch.subject,
    });
  } catch (err) {
    sendError(res, err);
  }
};
