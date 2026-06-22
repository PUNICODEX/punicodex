/**
 * POST /api/v1/authenticity/abuse-report
 *
 * Authenticated, rate-limited third-party abuse report ingestion.
 */

const { createApiHandler } = require('../../../../platform/api/api-handler.js');
const { success, error } = require('../../../../platform/api/api-response.js');
const {
  createAbuseReport,
  VALID_CATEGORIES,
} = require('../../../../platform/api/abuse-service.js');
const { migrateRegulatory } = require('../../../../platform/db/migrate-regulatory.js');

module.exports = createApiHandler(
  async (req, res) => {
    if (req.method !== 'POST') {
      error(res, 'METHOD_NOT_ALLOWED', 'Only POST is allowed.', { status: 405 });
      return;
    }

    const body = req.body || {};
    const { domain, category, description, evidence, reporter_contact } = body;

    if (!domain || typeof domain !== 'string') {
      error(res, 'VALIDATION_ERROR', 'Field "domain" is required.', { status: 400 });
      return;
    }
    if (!VALID_CATEGORIES.has(category)) {
      error(
        res,
        'VALIDATION_ERROR',
        `Field "category" must be one of: ${[...VALID_CATEGORIES].join(', ')}.`,
        { status: 400 }
      );
      return;
    }

    migrateRegulatory();

    try {
      const report = await createAbuseReport({
        reporterContact: reporter_contact,
        domain,
        category,
        description,
        evidence,
      });
      success(res, { report });
    } catch (err) {
      if (err.code === 'RATE_LIMIT_EXCEEDED') {
        error(res, 'RATE_LIMIT_EXCEEDED', err.message, { status: 429 });
        return;
      }
      error(res, 'VALIDATION_ERROR', err.message, { status: 400 });
    }
  },
  { requireAuth: true, scopes: ['abuse:write'] }
);
