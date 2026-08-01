/**
 * GET /api/v1/authenticity/check
 *
 * Classify a single name, domain, or URL for authenticity.
 */

const { createApiHandler } = require('../../../../api/api-handler.js');
const { success, error } = require('../../../../api/api-response.js');
const {
  classifyTerm,
  classifyDomain,
  classifyUrl,
} = require('../../../../api/authenticity-service.js');
const { buildEvidence } = require('../../../../api/evidence-builder.js');
const { withResultCache } = require('../../../../api/cache.js');
const { getVersion } = require('../../../../api/version-service.js');

const VALID_TYPES = new Set(['auto', 'term', 'domain', 'url']);
const MODEL_VERSION = getVersion().version;

function classifyByType(input, type) {
  if (type === 'term') return classifyTerm(input);
  if (type === 'domain') return classifyDomain(input);
  if (type === 'url') return classifyUrl(input);
  // auto: try URL, then domain, then term
  if (/^https?:\/\//i.test(input) || input.includes('/')) return classifyUrl(input);
  if (input.includes('.') || input.startsWith('xn--')) return classifyDomain(input);
  return classifyTerm(input);
}

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const input = String(req.query.input || '').trim();
  if (!input) {
    error(res, 'VALIDATION_ERROR', 'Query parameter "input" is required.', { status: 400 });
    return;
  }

  const type = String(req.query.type || 'auto').toLowerCase();
  if (!VALID_TYPES.has(type)) {
    error(
      res,
      'VALIDATION_ERROR',
      'Query parameter "type" must be one of: auto, term, domain, url.',
      {
        status: 400,
      }
    );
    return;
  }

  const policyHash = req.headers['x-tenant-id'] || 'default';
  const result = await withResultCache(
    { input, type, modelVersion: MODEL_VERSION, policyHash },
    () => {
      const r = classifyByType(input, type);
      return { ...r, evidence: buildEvidence(input, r) };
    }
  );
  success(res, result, {
    links: { self: `/api/v1/authenticity/check/?input=${encodeURIComponent(input)}&type=${type}` },
  });
});
