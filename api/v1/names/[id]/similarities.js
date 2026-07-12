/**
 * GET /api/v1/names/:id/similarities
 *
 * Lists cross-cultural similarity edges for a single lexicon entry.
 */

const { createApiHandler } = require('../../../../platform/api/api-handler.js');
const { success, error } = require('../../../../platform/api/api-response.js');
const {
  validateId,
  validateInteger,
  validateString,
} = require('../../../../platform/api/api-validation.js');
const namesService = require('../../../../platform/api/names-service.js');
const similarityService = require('../../../../platform/api/similarity-service.js');

function getId(req) {
  return req.params?.id || req.query?.id || req.url.split('/')[req.url.split('/').length - 2];
}

function parseQuery(query) {
  const limit = validateInteger(query?.limit, 'limit', {
    min: 1,
    max: 200,
    defaultValue: 50,
  });
  const minStrength = validateInteger(query?.minStrength, 'minStrength', {
    min: 1,
    max: 3,
    defaultValue: 1,
  });
  const relationship = validateString(query?.relationship, 'relationship', {
    maxLength: 128,
  });
  const category = validateString(query?.category, 'category', {
    maxLength: 64,
  });

  const errors = [];
  if (limit.error) errors.push(limit.error);
  if (minStrength.error) errors.push(minStrength.error);
  if (relationship) errors.push(relationship);
  if (category) errors.push(category);

  return {
    params: {
      limit: limit.value,
      minStrength: minStrength.value,
      relationship: query?.relationship || undefined,
      category: query?.category || undefined,
    },
    errors,
  };
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

  const { params, errors } = parseQuery(req.query);
  if (errors.length > 0) {
    error(res, 'VALIDATION_ERROR', 'Invalid query parameters.', {
      status: 400,
      details: { errors },
    });
    return;
  }

  // Verify the entry exists in the lexicon.
  const entry = namesService.getName(id);
  if (!entry) {
    error(res, 'NOT_FOUND', `No entry found for id: ${id}`, { status: 404 });
    return;
  }

  const result = similarityService.getSimilarities(id, params);
  if (!result) {
    error(res, 'NOT_FOUND', `No entry found for id: ${id}`, { status: 404 });
    return;
  }

  success(res, result, {
    links: {
      self: `/api/v1/names/${id}/similarities`,
      entry: `/api/v1/names/${id}`,
      graph: `/api/v1/names/${id}/graph`,
    },
  });
});
