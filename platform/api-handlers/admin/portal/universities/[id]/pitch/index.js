/**
 * POST /api/admin/portal/universities/:id/pitch/
 *
 * Renders the academic-collaboration pitch email for a university prospect
 * and sends it. Body: { to, contactName?, departments?, customNote? }.
 * Scholars permission required. Fire-and-report like the founding pitches:
 * the response carries the rendered subject either way, plus `mocked: true`
 * when RESEND_API_KEY is unset.
 */

const {
  setPortalCors,
  sendError,
  parseIdParam,
  portalAuth,
} = require('../../../../../../../api/admin/portal/_portal.js');
const { sendEmail } = require('../../../../../../api/email.js');
const { logAction } = require('../../../../../../api/admin-actions.js');
const prospects = require('../../../../../../db/university-prospects.js');
const { buildUniversityPitch } = require('../../../../../../api/university-pitch-email.js');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PITCHES_PER_PROSPECT = 3;

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'scholars');
    if (!auth) return;

    const id = parseIdParam(req);
    if (id == null) return res.status(400).json({ error: 'Invalid prospect id' });

    const prospect = await prospects.getProspectById(id);
    if (!prospect) return res.status(404).json({ error: 'University prospect not found' });
    if (prospect.status === 'active') {
      return res
        .status(409)
        .json({ error: `${prospect.institution_name} is already an active collaborator` });
    }
    if (prospect.status === 'declined') {
      return res
        .status(409)
        .json({ error: `${prospect.institution_name} has declined — do not re-contact` });
    }
    if (Number(prospect.pitch_count) >= MAX_PITCHES_PER_PROSPECT) {
      return res.status(429).json({
        error: `Already pitched ${prospect.pitch_count}× — further sends need a human decision`,
      });
    }

    const body = req.body || {};
    const to = typeof body.to === 'string' ? body.to.trim() : '';
    if (!EMAIL_RE.test(to)) {
      return res.status(400).json({ error: 'A valid recipient email is required' });
    }

    const contactName =
      typeof body.contactName === 'string' && body.contactName.trim()
        ? body.contactName.trim().slice(0, 120)
        : null;
    const customNote =
      typeof body.customNote === 'string' && body.customNote.trim()
        ? body.customNote.trim().slice(0, 600)
        : null;
    let departments = null;
    if (Array.isArray(body.departments)) {
      departments = body.departments
        .map((d) => String(d || '').trim())
        .filter(Boolean)
        .slice(0, 4);
      if (!departments.length) departments = null;
    }

    const pitch = buildUniversityPitch({ prospect, contactName, customNote, departments });

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
      action: 'portal.university.pitch',
      target: `university_prospect:${id}`,
      meta: {
        prospectId: id,
        to,
        institution: prospect.institution_name,
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
