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

  // Rate limiting is defense-in-depth — a limiter outage (Redis down, config
  // drift) must never take the login surface down with it. Fail open and log.
  try {
    if (!(await checkPublicRateLimitByReq(req, res, 'admin-login'))) {
      return;
    }
  } catch (err) {
    console.error('admin-login rate limiter error (fail-open):', err && err.message);
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
    // TEMPORARY diagnostic (admin-login 500 investigation, round 2): the
    // bcryptjs swap did not cure the 500 — surface the full stack so the
    // remaining failing dependency is identifiable. Remove once fixed.
    console.error('admin-portal login error:', err);
    try {
      return res.status(500).json({
        error: 'Internal server error',
        debug:
          process.env.VERCEL === '1'
            ? String((err && (err.stack || err.code || err.message)) || err).slice(0, 900)
            : undefined,
      });
    } catch (e) {
      sendError(res, err);
    }
  }
};
