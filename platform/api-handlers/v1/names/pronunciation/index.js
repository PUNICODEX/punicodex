/**
 * GET /api/v1/names/pronunciation?id={entryId}
 * GET /api/v1/names/:id/pronunciation
 *
 * The derived pronunciation for a lexicon entry, computed from the restored
 * orthography by the pronunciation rules engine (type/js/pronunciation-
 * rules.js): IPA, syllables, stress index, voiceover respelling, SSML,
 * reading notes, and the full mora-based timing model (per-syllable morae,
 * beat string, stress-pitch contour, base mora duration, total/per-syllable
 * duration estimates). Fallback traditions return derived:false with
 * timing:null; Egyptian returns conventional:true.
 */

const { createApiHandler } = require('../../../../api/api-handler.js');
const { success, error } = require('../../../../api/api-response.js');
const { validateId } = require('../../../../api/api-validation.js');
const { LEXICON } = require('../../../../../type/js/lexicon.js');
const { derivePronunciation } = require('../../../../../type/js/pronunciation-rules.js');

const entriesById = new Map(LEXICON.map((e) => [e.id, e]));

function getId(req) {
  return req.params?.id || req.query?.id || '';
}

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const { value: id, error: idError } = validateId(getId(req));
  if (idError) {
    error(res, 'VALIDATION_ERROR', idError.message, {
      status: 400,
      details: { errors: [idError] },
    });
    return;
  }

  const entry = entriesById.get(id);
  if (!entry) {
    error(res, 'NOT_FOUND', `No entry found for id: ${id}`, { status: 404 });
    return;
  }

  success(
    res,
    { id, ...derivePronunciation(entry) },
    {
      links: {
        self: `/api/v1/names/${encodeURIComponent(id)}/pronunciation`,
        name: `/api/v1/names/${encodeURIComponent(id)}`,
        temple: `/sites/${encodeURIComponent(id)}/`,
      },
    }
  );
});
