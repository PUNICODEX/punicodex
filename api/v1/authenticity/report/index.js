/**
 * POST /api/v1/authenticity/report
 *
 * Report a suspicious name, domain, or URL to the threat feed.
 */

const { createApiHandler } = require('../../../../platform/api/api-handler.js');
const { success, error } = require('../../../../platform/api/api-response.js');
const {
  classifyTerm,
  classifyDomain,
  classifyUrl,
} = require('../../../../platform/api/authenticity-service.js');
const {
  recordDiscoveredSpoof,
  recordSpoofReport,
} = require('../../../../platform/api/authenticity-threat-feed.js');

function classifyByType(input, type) {
  if (type === 'term') return classifyTerm(input);
  if (type === 'domain') return classifyDomain(input);
  if (type === 'url') return classifyUrl(input);
  if (/^https?:\/\//i.test(input) || input.includes('/')) return classifyUrl(input);
  if (input.includes('.') || input.startsWith('xn--')) return classifyDomain(input);
  return classifyTerm(input);
}

function detectPunycode(input) {
  if (input.startsWith('xn--')) return input;
  if (input.includes('xn--')) {
    return input.split('.').find((label) => label.startsWith('xn--')) || null;
  }
  return null;
}

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only POST is allowed.', { status: 405 });
    return;
  }

  const { input, type = 'auto', comment = '', reporterToken = null } = req.body || {};
  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    error(res, 'VALIDATION_ERROR', 'Body field "input" is required.', { status: 400 });
    return;
  }

  const normalizedInput = input.trim();
  const normalizedType = String(type).toLowerCase();
  const classification = classifyByType(normalizedInput, normalizedType);

  const inputType =
    normalizedType === 'url' ? 'url' : normalizedType === 'domain' ? 'domain' : 'name';

  const spoof = recordDiscoveredSpoof({
    input: normalizedInput,
    inputType,
    punycode: detectPunycode(normalizedInput),
    verdict: classification.verdict,
    severity: classification.severity,
    canonicalEntryId: classification.canonicalMatch?.id || null,
    discoverySource: 'user-report',
    confidence: classification.lookalikeScore || 0,
  });

  const report = recordSpoofReport({
    discoveredSpoofId: spoof.id,
    reporterToken: reporterToken || null,
    notes: comment || null,
  });

  success(res, {
    reported: true,
    spoof: {
      id: report.id,
      input: report.input,
      inputType: report.input_type,
      verdict: report.verdict,
      severity: report.severity,
      reportCount: report.report_count,
    },
    classification,
  });
});
