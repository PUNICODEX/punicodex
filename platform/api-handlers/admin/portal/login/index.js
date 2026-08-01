/**
 * POST /api/admin/portal/login
 *
 * Per-user admin portal login. Rate-limited on the shared 'admin-login'
 * bucket (same as the legacy shared-password login). Returns 503 when the
 * portal has not been bootstrapped (ADMIN_PASSWORD not configured).
 */

const { checkPublicRateLimitByReq } = require('../../../../api/public-rate-limiter');
const {
  setPortalCors,
  sendError,
  portalAuth,
} = require('../../../../../api/admin/portal/_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!(await checkPublicRateLimitByReq(req, res, 'admin-login'))) {
    return;
  }

  try {
    const { email, password } = req.body || {};
    const result = await portalAuth.login(email, password);
    if (!result.success) {
      const status = result.code === 'portal_unconfigured' ? 503 : 401;
      return res.status(status).json({ error: result.message, code: result.code });
    }
    return res.json({
      success: true,
      token: result.token,
      user: result.user,
      role: result.role,
      requirePasswordChange: result.requirePasswordChange,
    });
  } catch (err) {
    sendError(res, err);
  }
};
