/**
 * POST /api/v1/policy/evaluate
 *
 * Evaluate an input against an enterprise policy.
 */

const { createApiHandler } = require('../../../../api/api-handler.js');
const { success, error } = require('../../../../api/api-response.js');
const {
  classifyTerm,
  classifyDomain,
  classifyUrl,
} = require('../../../../api/authenticity-service.js');
const { evaluatePolicy, normalizePolicy } = require('../../../../api/policy-engine.js');
const { getTier } = require('../../../../api/tier-definitions.js');

const VALID_TYPES = new Set(['auto', 'term', 'domain', 'url']);

function classifyByType(input, type) {
  if (type === 'term') return classifyTerm(input);
  if (type === 'domain') return classifyDomain(input);
  if (type === 'url') return classifyUrl(input);
  if (/^https?:\/\//i.test(input) || input.includes('/')) return classifyUrl(input);
  if (input.includes('.') || input.startsWith('xn--')) return classifyDomain(input);
  return classifyTerm(input);
}

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only POST is allowed.', { status: 405 });
    return;
  }

  const body = req.body || {};
  const input = String(body.input || '').trim();
  if (!input) {
    error(res, 'VALIDATION_ERROR', 'Body field "input" is required.', { status: 400 });
    return;
  }

  const type = String(body.type || 'auto').toLowerCase();
  if (!VALID_TYPES.has(type)) {
    error(res, 'VALIDATION_ERROR', 'Field "type" must be one of: auto, term, domain, url.', {
      status: 400,
    });
    return;
  }

  const policy = normalizePolicy(body.policy || {});
  const tenantId = body.tenantId || policy.tenantId;
  const verdict = classifyByType(input, type);
  const evaluation = evaluatePolicy(verdict, {
    tenantId,
    policy,
    allowlist: body.allowlist,
    blocklist: body.blocklist,
  });
  const tier = getTier(verdict.verdict, verdict.severity);

  success(
    res,
    {
      input,
      type,
      tenantId,
      verdict: {
        verdict: verdict.verdict,
        severity: verdict.severity,
        identityId: verdict.identityId || null,
        targetIdentity: verdict.targetIdentity || null,
      },
      action: evaluation.action,
      reason: evaluation.reason,
      uiTheme: evaluation.uiTheme,
      policyId: evaluation.policyId,
      tier: {
        level: tier.level,
        label: tier.label,
        color: tier.color,
        icon: tier.icon,
      },
      siemPayload: evaluation.siemPayload || undefined,
    },
    {
      links: { self: '/api/v1/policy/evaluate' },
    }
  );
});
