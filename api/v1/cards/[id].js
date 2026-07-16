/**
 * GET /api/v1/cards/:id
 * Return every card variant (standard + original-script foil) for one
 * lexicon entry id, e.g. /api/v1/cards/zeus
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');
const { success, error } = require('../../../platform/api/api-response.js');
const cardsService = require('../../../platform/api/cards-service.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const entryId = (req.query && req.query.id) || (req.params && req.params.id);
  if (!entryId || typeof entryId !== 'string') {
    error(res, 'VALIDATION_ERROR', 'A card entry id is required.', { status: 400 });
    return;
  }

  const result = cardsService.getCardsForEntry(entryId);
  if (!result) {
    error(res, 'NOT_FOUND', `No cards found for entry '${entryId}'.`, { status: 404 });
    return;
  }

  success(res, result, {
    links: {
      self: `/api/v1/cards/${entryId}`,
      collection: '/api/v1/cards',
      temple: `/sites/${entryId}/`,
    },
  });
});
