/**
 * POST /api/v1/authenticity/check/batch
 *
 * Classify up to 100 names, domains, or URLs in one request.
 */

const { createApiHandler } = require('../../../../../platform/api/api-handler.js');
const { success, error } = require('../../../../../platform/api/api-response.js');
const {
  classifyTerm,
  classifyDomain,
  classifyUrl,
} = require('../../../../../platform/api/authenticity-service.js');
const { buildEvidence } = require('../../../../../platform/api/evidence-builder.js');

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

  const { inputs, type = 'auto' } = req.body || {};
  if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > 100) {
    error(res, 'VALIDATION_ERROR', 'Body must contain an inputs array (1-100 items).', {
      status: 400,
    });
    return;
  }

  const normalizedType = String(type).toLowerCase();
  if (!VALID_TYPES.has(normalizedType)) {
    error(res, 'VALIDATION_ERROR', 'Field "type" must be one of: auto, term, domain, url.', {
      status: 400,
    });
    return;
  }

  const results = inputs.map((raw) => {
    const input = String(raw).trim();
    if (!input) {
      return { input, error: 'empty input' };
    }
    const result = classifyByType(input, normalizedType);
    return {
      input,
      result: { ...result, evidence: buildEvidence(input, result) },
    };
  });

  success(res, results, {
    meta: { count: results.length, type: normalizedType },
    links: { self: '/api/v1/authenticity/check/batch' },
  });
});
