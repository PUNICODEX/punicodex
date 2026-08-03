/**
 * GET /api/v1/names/:id/pronunciation
 *
 * Engine-derived pronunciation (IPA, respelling, SSML, notes, mora timing).
 * The implementation lives in ../pronunciation/index.js and is shared with
 * the static /api/v1/names/pronunciation?id={entryId} route; this file keeps
 * the router's route-pattern ↔ handler-path convention intact.
 */

module.exports = require('../pronunciation/index.js');
