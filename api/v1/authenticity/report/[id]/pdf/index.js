/**
 * GET /api/v1/authenticity/report/:id/pdf
 *
 * Generates a forensics PDF evidence package for a given input.
 * The report id is accepted as a path parameter but the input to report on
 * is supplied via the `input` query parameter so reports can be generated
 * deterministically without persistent storage.
 */

const { createApiHandler } = require('../../../../../../platform/api/api-handler.js');
const { error } = require('../../../../../../platform/api/api-response.js');
const {
  classifyTerm,
  classifyDomain,
  classifyUrl,
} = require('../../../../../../platform/api/authenticity-service.js');
const { buildEvidence } = require('../../../../../../platform/api/evidence-builder.js');
const { generateForensicsPdf } = require('../../../../../../platform/api/forensics-pdf.js');

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

  const result = classifyByType(input, type);
  const evidence = buildEvidence(input, result);
  const { buffer, contentType, reportId } = generateForensicsPdf(input, result, evidence);

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="punicodex-report-${reportId}.pdf"`);
  res.setHeader('Content-Length', buffer.length);
  res.status(200).send(buffer);
});
