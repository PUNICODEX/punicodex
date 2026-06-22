/**
 * GET /api/v1/transparency-report
 *
 * Public quarterly transparency report generated from regulatory tables.
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');
const { success } = require('../../../platform/api/api-response.js');
const { generateTransparencyReport } = require('../../../platform/api/transparency-service.js');
const { migrateRegulatory } = require('../../../platform/db/migrate-regulatory.js');

module.exports = createApiHandler(async (_req, res) => {
  migrateRegulatory();
  success(res, generateTransparencyReport());
});
