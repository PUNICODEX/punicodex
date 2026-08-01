/**
 * GET /api/v1/transparency-report
 *
 * Public quarterly transparency report generated from regulatory tables.
 */

const { createApiHandler } = require('../../../api/api-handler.js');
const { success, error } = require('../../../api/api-response.js');
const { generateTransparencyReport } = require('../../../api/transparency-service.js');
const { migrateRegulatory } = require('../../../db/migrate-regulatory.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }
  migrateRegulatory();
  success(res, generateTransparencyReport());
});
