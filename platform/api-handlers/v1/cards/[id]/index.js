/**
 * GET /api/v1/cards/:id
 * Return every card variant (standard + original-script foil) for one
 * lexicon entry id, e.g. /api/v1/cards/zeus
 */

const { createApiHandler } = require('../../../../api/api-handler.js');
const { success, error } = require('../../../../api/api-response.js');
const cardsService = require('../../../../api/cards-service.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const fromQuery = req.query?.id || req.params?.id;
  const pathname = (req.url || '').split('?')[0].replace(/\/+$/, '');
  const entryId = fromQuery || pathname.split('/').pop();
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
