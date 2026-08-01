/**
 * GET /api/v1/policy
 *
 * Returns the default/tenant authenticity policy.
 */

const { createApiHandler } = require('../../../api/api-handler.js');
const { success } = require('../../../api/api-response.js');
const { DEFAULT_POLICY, normalizePolicy } = require('../../../api/policy-engine.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    const { error } = require('../../../api/api-response.js');
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const tenantId = req.query.tenant || DEFAULT_POLICY.tenantId;
  const policy = normalizePolicy({ ...DEFAULT_POLICY, tenantId });

  success(res, policy, {
    links: {
      self: `/api/v1/policy${tenantId !== 'default' ? `?tenant=${encodeURIComponent(tenantId)}` : ''}`,
    },
  });
});
