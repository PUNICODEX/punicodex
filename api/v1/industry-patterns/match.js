/**
 * GET /api/v1/industry-patterns/match?q=&limit=
 *
 * Ranks industries against a free-text sponsor query using the canonical
 * alias vocabulary ("plumber" → water-utilities, "poet" → publishing-media).
 * Powers the Find Your Pattern autocomplete on /patterns/.
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');
const { success, error } = require('../../../platform/api/api-response.js');
const industryPatternService = require('../../../platform/api/industry-pattern-service.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const q = String(req.query?.q || '').trim();
  const parsed = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(parsed) ? Math.max(1, Math.min(20, parsed)) : 8;

  // A missing/blank query is an empty result set, not an error — the
  // autocomplete fires this endpoint as the user types and clears.
  const matches = q ? industryPatternService.matchIndustryAliases(q, limit) : [];

  success(
    res,
    { query: q, count: matches.length, matches },
    {
      links: {
        self: `/api/v1/industry-patterns/match?q=${encodeURIComponent(q)}&limit=${limit}`,
        industries: '/api/v1/industry-patterns/industries',
        full: '/api/v1/industry-patterns',
      },
    }
  );
});
