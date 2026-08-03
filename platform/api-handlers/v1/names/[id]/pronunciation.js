/**
 * GET /api/v1/names/:id/pronunciation
 *
 * Engine-derived pronunciation (IPA, respelling, SSML, notes, mora timing).
 * The implementation lives in ../pronunciation/index.js and is shared with
 * the static /api/v1/names/pronunciation?id={entryId} route; this wrapper
 * keeps the router's route-pattern ↔ handler-path convention intact and
 * carries the explicit method guard the OpenAPI contract suite requires.
 */

const { error } = require('../../../../api/api-response.js');
const handler = require('../pronunciation/index.js');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
  }
  return handler(req, res);
};
