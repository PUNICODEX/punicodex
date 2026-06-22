/**
 * GET /api/v1/policy
 *
 * Returns the default/tenant authenticity policy.
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');
const { success } = require('../../../platform/api/api-response.js');
const { DEFAULT_POLICY, normalizePolicy } = require('../../../platform/api/policy-engine.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    const { error } = require('../../../platform/api/api-response.js');
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
