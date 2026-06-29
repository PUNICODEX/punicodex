/**
 * PÚNYCODEX API v1 — Lightweight request validation
 *
 * Manual validation keeps the API layer dependency-free while still providing
 * clear, structured error messages. If the project later adopts Zod, these
 * helpers can be swapped without changing endpoint code.
 */

const VALID_PANTHEONS = new Set([
  'greek',
  'greek-location',
  'norse',
  'egyptian',
  'sanskrit',
  'celtic',
  'mesopotamian',
  'polynesian',
  'japanese',
  'nahuatl',
  'yoruba',
  'slavic',
  'zoroastrian',
  'incan',
  'chinese',
  'buddhist',
  'taoist',
  'korean',
  'canaanite',
  'phoenician',
  'hittite',
]);

const VALID_TIERS = new Set(['dual', '1', '2']);
const VALID_SORTS = new Set(['relevance', 'alphabetical', 'tier']);
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

function toError(field, message) {
  return { field, message };
}

function validateString(value, field, options = {}) {
  const { required = false, maxLength = 256, allowed } = options;
  if (value === undefined || value === null || value === '') {
    if (required) return toError(field, `${field} is required`);
    return null;
  }
  if (typeof value !== 'string') return toError(field, `${field} must be a string`);
  if (value.length > maxLength)
    return toError(field, `${field} must be at most ${maxLength} characters`);
  if (allowed && !allowed.has(value))
    return toError(field, `${field} must be one of: ${[...allowed].join(', ')}`);
  return null;
}

function validateInteger(value, field, options = {}) {
  const { required = false, min = 0, max = Number.MAX_SAFE_INTEGER, defaultValue } = options;
  if (value === undefined || value === null || value === '') {
    if (defaultValue !== undefined) return { value: defaultValue, error: null };
    if (required) return { value: undefined, error: toError(field, `${field} is required`) };
    return { value: undefined, error: null };
  }
  const num = Number(value);
  if (!Number.isInteger(num))
    return { value: undefined, error: toError(field, `${field} must be an integer`) };
  if (num < min)
    return { value: undefined, error: toError(field, `${field} must be at least ${min}`) };
  if (num > max)
    return { value: undefined, error: toError(field, `${field} must be at most ${max}`) };
  return { value: num, error: null };
}

function validateBooleanString(value, field) {
  if (value === undefined || value === null || value === '')
    return { value: undefined, error: null };
  if (value === 'true') return { value: true, error: null };
  if (value === 'false') return { value: false, error: null };
  return { value: undefined, error: toError(field, `${field} must be 'true' or 'false'`) };
}

function validateId(value, field = 'id') {
  if (!value || typeof value !== 'string')
    return { value: undefined, error: toError(field, `${field} is required`) };
  if (!/^[a-z0-9_-]+$/.test(value))
    return { value: undefined, error: toError(field, `${field} contains invalid characters`) };
  return { value, error: null };
}

function validateListNamesQuery(query) {
  const qparams = query || {};
  const errors = [];

  const q = validateString(qparams.q, 'q', { required: false, maxLength: 128 });
  if (q) errors.push(q);

  const pantheon = validateString(qparams.pantheon, 'pantheon', { allowed: VALID_PANTHEONS });
  if (pantheon) errors.push(pantheon);

  const tier = validateString(qparams.tier, 'tier', { allowed: VALID_TIERS });
  if (tier) errors.push(tier);

  const hasSite = validateBooleanString(qparams.hasSite, 'hasSite');
  if (hasSite.error) errors.push(hasSite.error);

  const sort = validateString(qparams.sort, 'sort', { allowed: VALID_SORTS });
  if (sort) errors.push(sort);

  const limit = validateInteger(qparams.limit, 'limit', {
    min: 1,
    max: MAX_LIMIT,
    defaultValue: DEFAULT_LIMIT,
  });
  if (limit.error) errors.push(limit.error);

  const offset = validateInteger(qparams.offset, 'offset', { min: 0, defaultValue: 0 });
  if (offset.error) errors.push(offset.error);

  if (errors.length > 0) {
    return { errors };
  }

  return {
    params: {
      q: qparams.q || undefined,
      pantheon: qparams.pantheon || undefined,
      tier: qparams.tier || undefined,
      hasSite: hasSite.value,
      sort: qparams.sort || 'relevance',
      limit: limit.value,
      offset: offset.value,
    },
    errors: [],
  };
}

function validateConvertQuery(query) {
  const qparams = query || {};
  const errors = [];
  const q = validateString(qparams.q, 'q', { required: true, maxLength: 256 });
  if (q) errors.push(q);

  if (errors.length > 0) return { errors };
  return { params: { q: qparams.q.trim() }, errors: [] };
}

function validateBatchConvertBody(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    errors.push(toError('body', 'Request body must be an object'));
    return { errors };
  }
  const { queries } = body;
  if (!Array.isArray(queries)) {
    errors.push(toError('queries', 'queries must be an array'));
    return { errors };
  }
  if (queries.length === 0) errors.push(toError('queries', 'queries must not be empty'));
  if (queries.length > 100) errors.push(toError('queries', 'queries must not exceed 100 items'));

  const normalized = [];
  for (let i = 0; i < queries.length; i++) {
    const item = queries[i];
    if (typeof item !== 'string' || item.trim() === '') {
      errors.push(toError(`queries[${i}]`, 'Each query must be a non-empty string'));
    } else {
      normalized.push(item.trim());
    }
  }

  if (errors.length > 0) return { errors };
  return { params: { queries: normalized }, errors: [] };
}

function validateAutocompleteQuery(query) {
  const qparams = query || {};
  const errors = [];
  const q = validateString(qparams.q, 'q', { required: true, maxLength: 128 });
  if (q) errors.push(q);

  const limit = validateInteger(qparams.limit, 'limit', { min: 1, max: 20, defaultValue: 8 });
  if (limit.error) errors.push(limit.error);

  const pantheon = validateString(qparams.pantheon, 'pantheon', { allowed: VALID_PANTHEONS });
  if (pantheon) errors.push(pantheon);

  if (errors.length > 0) return { errors };
  return {
    params: { q: qparams.q.trim(), limit: limit.value, pantheon: qparams.pantheon || 'all' },
    errors: [],
  };
}

function validateAvailabilityBody(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    errors.push(toError('body', 'Request body must be an object'));
    return { errors };
  }
  const statusErr = validateString(body.status, 'status', {
    required: true,
    allowed: new Set(['available', 'registered', 'unknown']),
  });
  if (statusErr) errors.push(statusErr);

  if (errors.length > 0) return { errors };
  return { params: { status: body.status }, errors: [] };
}

function validateAppraiseQuery(query) {
  const qparams = query || {};
  const errors = [];
  const q = validateString(qparams.q, 'q', { required: true, maxLength: 256 });
  if (q) errors.push(q);

  if (errors.length > 0) return { errors };
  return { params: { q: qparams.q.trim() }, errors: [] };
}

function validateAppraiseBatchBody(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    errors.push(toError('body', 'Request body must be an object'));
    return { errors };
  }
  const { domains } = body;
  if (!Array.isArray(domains)) {
    errors.push(toError('domains', 'domains must be an array'));
    return { errors };
  }
  if (domains.length === 0) errors.push(toError('domains', 'domains must not be empty'));
  if (domains.length > 100) errors.push(toError('domains', 'domains must not exceed 100 items'));

  const normalized = [];
  for (let i = 0; i < domains.length; i++) {
    const item = domains[i];
    if (typeof item !== 'string' || item.trim() === '') {
      errors.push(toError(`domains[${i}]`, 'Each domain must be a non-empty string'));
    } else {
      normalized.push(item.trim());
    }
  }

  if (errors.length > 0) return { errors };
  return { params: { domains: normalized }, errors: [] };
}

module.exports = {
  VALID_PANTHEONS,
  VALID_TIERS,
  VALID_SORTS,
  validateListNamesQuery,
  validateConvertQuery,
  validateBatchConvertBody,
  validateAutocompleteQuery,
  validateAvailabilityBody,
  validateAppraiseQuery,
  validateAppraiseBatchBody,
  validateId,
  validateString,
  validateInteger,
};
