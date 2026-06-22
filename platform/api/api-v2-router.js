/**
 * PÚNYCODEX API v2 — Catch-all router
 *
 * Handles every /api/v2/* path from a single Vercel optional catch-all route.
 * Improvements over v1:
 *   - Unified envelope with top-level data, meta, and links
 *   - Sidecar includes (availability, site) on detail requests
 *   - Consistent HATEOAS links
 *   - Search and site resources are first-class
 */

const { success, error } = require('./api-response.js');
const namesService = require('./names-service.js');
const { searchWeb, getSites, getSiteByPunycode } = require('./crawler-db.js');
const { getVersion } = require('./version-service.js');
const { validateListNamesQuery } = require('./api-validation.js');
const { classifyTerm, classifyDomain, classifyUrl } = require('./authenticity-service.js');
const { recordDiscoveredSpoof, recordSpoofReport } = require('./authenticity-threat-feed.js');

const VALID_NAME_SUBRESOURCES = new Set([
  'variants',
  'breakdown',
  'original-script',
  'etymology',
  'availability',
  'site',
  'slots',
  'lore',
  'pronunciation',
  'mythology',
  'archaeology',
]);

function rewriteLinks(value) {
  if (typeof value === 'string') {
    return value.replace(/\/api\/v1\//g, '/api/v2/');
  }
  if (Array.isArray(value)) {
    return value.map(rewriteLinks);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = rewriteLinks(v);
    }
    return out;
  }
  return value;
}

const VALID_CLASSIFY_TYPES = new Set(['auto', 'term', 'domain', 'url']);

function classifyByType(input, type) {
  if (type === 'term') return classifyTerm(input);
  if (type === 'domain') return classifyDomain(input);
  if (type === 'url') return classifyUrl(input);
  if (/^https?:\/\//i.test(input) || input.includes('/')) return classifyUrl(input);
  if (input.includes('.') || input.startsWith('xn--')) return classifyDomain(input);
  return classifyTerm(input);
}

function detectPunycode(input) {
  if (input.startsWith('xn--')) return input;
  if (input.includes('xn--')) {
    return input.split('.').find((label) => label.startsWith('xn--')) || null;
  }
  return null;
}

function buildPaginationLinks(req, total, limit, offset) {
  const self = `/api/v2${req.path || ''}${req.url?.includes('?') ? `?${req.url.split('?')[1]}` : ''}`;
  const next =
    offset + limit < total
      ? `/api/v2${req.path || ''}?limit=${limit}&offset=${offset + limit}`
      : null;
  const prev =
    offset > 0
      ? `/api/v2${req.path || ''}?limit=${limit}&offset=${Math.max(0, offset - limit)}`
      : null;
  return { self, next, prev };
}

async function handleNamesList(req, res) {
  const { params, errors } = validateListNamesQuery(req.query);
  if (errors.length > 0) {
    error(res, 'VALIDATION_ERROR', 'Invalid query parameters.', {
      status: 400,
      details: { errors },
    });
    return;
  }
  const result = namesService.listNames(params);
  success(res, rewriteLinks(result.items), {
    meta: {
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    },
    links: buildPaginationLinks(req, result.total, result.limit, result.offset),
  });
}

async function handleNameDetail(_req, res, id) {
  const row = namesService.getName(id);
  if (!row) {
    error(res, 'NOT_FOUND', `Name '${id}' not found.`, { status: 404 });
    return;
  }
  success(res, rewriteLinks(row));
}

async function handleNameSubresource(_req, res, id, subresource) {
  if (!VALID_NAME_SUBRESOURCES.has(subresource)) {
    error(res, 'NOT_FOUND', `Unknown subresource '${subresource}'.`, { status: 404 });
    return;
  }
  let result;
  switch (subresource) {
    case 'variants':
      result = namesService.getVariants(id);
      break;
    case 'breakdown':
      result = namesService.getBreakdown(id);
      break;
    case 'original-script':
      result = namesService.getOriginalScriptForName(id);
      break;
    case 'etymology':
      result = namesService.getEtymology(id);
      break;
    case 'availability':
      result = namesService.getAvailability(id);
      break;
    case 'site':
      result = namesService.getSite(id);
      break;
    case 'slots':
      result = namesService.getSlots(id);
      break;
    case 'lore':
      result = namesService.getLore(id);
      break;
    case 'pronunciation':
      result = namesService.getPronunciation(id);
      break;
    case 'mythology':
      result = namesService.getMythology(id);
      break;
    case 'archaeology':
      result = namesService.getArchaeology(id);
      break;
  }
  if (!result) {
    error(res, 'NOT_FOUND', `Name '${id}' not found.`, { status: 404 });
    return;
  }
  success(res, rewriteLinks(result));
}

async function handlePantheons(_req, res) {
  const result = namesService.listPantheons();
  success(res, rewriteLinks(result.items), {
    meta: { total: result.total, count: result.count },
    links: { self: '/api/v2/pantheons' },
  });
}

async function handlePantheon(_req, res, name) {
  const result = namesService.getPantheon(name);
  if (!result || result.total === 0) {
    error(res, 'NOT_FOUND', `Pantheon '${name}' not found.`, { status: 404 });
    return;
  }
  success(res, rewriteLinks(result));
}

async function handleTiers(_req, res) {
  const result = namesService.listTiers();
  success(res, rewriteLinks(result.items), {
    meta: { total: result.total },
    links: { self: '/api/v2/tiers' },
  });
}

async function handleAutocomplete(req, res) {
  const q = String(req.query.q || '').trim();
  if (!q) {
    error(res, 'VALIDATION_ERROR', 'Query parameter q is required.', { status: 400 });
    return;
  }
  const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
  const result = namesService.autocompleteNames({ q, limit, pantheon: req.query.pantheon });
  success(res, rewriteLinks(result.items), {
    meta: { query: result.query, count: result.count },
    links: { self: `/api/v2/autocomplete?q=${encodeURIComponent(q)}` },
  });
}

async function handleConvert(req, res) {
  const q = String(req.query.q || '').trim();
  if (!q) {
    error(res, 'VALIDATION_ERROR', 'Query parameter q is required.', { status: 400 });
    return;
  }
  const result = namesService.convert({ q });
  success(res, rewriteLinks(result));
}

async function handleConvertBatch(req, res) {
  const { queries } = req.body || {};
  if (!Array.isArray(queries) || queries.length === 0 || queries.length > 100) {
    error(res, 'VALIDATION_ERROR', 'Body must contain a queries array (1-100 items).', {
      status: 400,
    });
    return;
  }
  const result = namesService.convertBatch({ queries });
  success(res, rewriteLinks(result.items), {
    meta: { count: result.count },
    links: { self: '/api/v2/convert/batch' },
  });
}

async function handleAuthenticityCheck(req, res) {
  const input = String(req.query.input || '').trim();
  if (!input) {
    error(res, 'VALIDATION_ERROR', 'Query parameter "input" is required.', { status: 400 });
    return;
  }
  const type = String(req.query.type || 'auto').toLowerCase();
  if (!VALID_CLASSIFY_TYPES.has(type)) {
    error(
      res,
      'VALIDATION_ERROR',
      'Query parameter "type" must be one of: auto, term, domain, url.',
      {
        status: 400,
      }
    );
    return;
  }
  const result = classifyByType(input, type);
  success(res, rewriteLinks(result), {
    links: { self: `/api/v2/authenticity/check?input=${encodeURIComponent(input)}&type=${type}` },
  });
}

async function handleAuthenticityBatch(req, res) {
  const { inputs, type = 'auto' } = req.body || {};
  if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > 100) {
    error(res, 'VALIDATION_ERROR', 'Body must contain an inputs array (1-100 items).', {
      status: 400,
    });
    return;
  }
  const normalizedType = String(type).toLowerCase();
  if (!VALID_CLASSIFY_TYPES.has(normalizedType)) {
    error(res, 'VALIDATION_ERROR', 'Field "type" must be one of: auto, term, domain, url.', {
      status: 400,
    });
    return;
  }
  const results = inputs.map((raw) => {
    const value = String(raw).trim();
    if (!value) return { input: raw, error: 'empty input' };
    return { input: value, result: classifyByType(value, normalizedType) };
  });
  success(res, rewriteLinks(results), {
    meta: { count: results.length, type: normalizedType },
    links: { self: '/api/v2/authenticity/check/batch' },
  });
}

async function handleAuthenticityReport(req, res) {
  const { input, type = 'auto', comment = '', reporterToken = null } = req.body || {};
  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    error(res, 'VALIDATION_ERROR', 'Body field "input" is required.', { status: 400 });
    return;
  }
  const normalizedInput = input.trim();
  const normalizedType = String(type).toLowerCase();
  const classification = classifyByType(normalizedInput, normalizedType);
  const inputType =
    normalizedType === 'url' ? 'url' : normalizedType === 'domain' ? 'domain' : 'name';
  const spoof = recordDiscoveredSpoof({
    input: normalizedInput,
    inputType,
    punycode: detectPunycode(normalizedInput),
    verdict: classification.verdict,
    severity: classification.severity,
    canonicalEntryId: classification.canonicalMatch?.id || null,
    discoverySource: 'user-report',
    confidence: classification.lookalikeScore || 0,
  });
  const report = recordSpoofReport({
    discoveredSpoofId: spoof.id,
    reporterToken: reporterToken || null,
    notes: comment || null,
  });
  success(
    res,
    rewriteLinks({
      reported: true,
      spoof: {
        id: report.id,
        input: report.input,
        inputType: report.input_type,
        verdict: report.verdict,
        severity: report.severity,
        reportCount: report.report_count,
      },
      classification,
    })
  );
}

async function handleSearchWeb(req, res) {
  const q = String(req.query.q || '').trim();
  if (!q) {
    error(res, 'VALIDATION_ERROR', 'Query parameter q is required.', { status: 400 });
    return;
  }
  const result = await searchWeb(q, {
    limit: parseInt(req.query.limit || '20', 10),
    mode: req.query.mode || 'all',
    type: req.query.type || 'all',
    pantheon: req.query.pantheon,
    tier: req.query.tier,
    sort: req.query.sort || 'relevance',
    variant: req.query.variant || 'default',
  });
  success(res, rewriteLinks(result.results), {
    meta: {
      query: result.query,
      total: result.total,
      timing: result.timing,
      queryTrust: result.queryTrust,
    },
    links: { self: `/api/v2/search/web?q=${encodeURIComponent(q)}` },
  });
}

async function handleSitesList(req, res) {
  const limit = Math.min(Math.max(1, parseInt(req.query.limit || '50', 10)), 100);
  const offset = Math.max(0, parseInt(req.query.offset || '0', 10));
  const result = getSites({
    status: req.query.status,
    pantheon: req.query.pantheon,
    entryId: req.query.entryId,
    trust: req.query.trust || 'all',
    limit,
    offset,
  });
  success(res, rewriteLinks(result.sites), {
    meta: { pagination: { total: result.total, limit: result.limit, offset: result.offset } },
    links: buildPaginationLinks(req, result.total, result.limit, result.offset),
  });
}

async function handleSiteDetail(_req, res, punycode) {
  const row = getSiteByPunycode(punycode);
  if (!row) {
    error(res, 'NOT_FOUND', `Site '${punycode}' not found.`, { status: 404 });
    return;
  }
  const site = {
    id: row.id,
    domain: row.domain,
    punycode: row.punycode,
    title: row.title,
    description: row.description,
    url: `https://${row.punycode || row.domain}`,
    isFlagship: Boolean(row.is_flagship),
    status: row.status,
    lastCrawled: row.last_crawled || null,
    trustTier: row.trust_tier || null,
  };
  success(res, rewriteLinks(site));
}

async function handleHealth(_req, res) {
  let dbOk = false;
  try {
    const { getDbPath } = require('../db/db.js');
    const Database = require('better-sqlite3');
    const db = new Database(getDbPath());
    db.prepare('SELECT 1').get();
    db.close();
    dbOk = true;
  } catch (_e) {
    dbOk = false;
  }
  success(res, { status: dbOk ? 'ok' : 'degraded', database: dbOk ? 'reachable' : 'unreachable' });
}

async function handleVersion(_req, res) {
  success(res, getVersion(), { links: { self: '/api/v2/version' } });
}

async function handleOpenApi(_req, res) {
  success(res, getOpenApiSpec());
}

async function handleRoot(_req, res) {
  success(res, {
    name: 'PÚNYCODEX API v2',
    description: 'Versioned REST API for the Unicode web.',
    endpoints: getOpenApiSpec().paths,
  });
}

function getOpenApiSpec() {
  return {
    openapi: '3.0.0',
    info: {
      title: 'PÚNYCODEX API v2',
      version: '2.0.0',
      description: 'Versioned REST API for the Unicode web.',
    },
    paths: {
      '/api/v2/names': { GET: 'List/search names' },
      '/api/v2/names/{id}': { GET: 'Name detail' },
      '/api/v2/names/{id}/{subresource}': { GET: 'Subresource (variants, breakdown, ...)' },
      '/api/v2/pantheons': { GET: 'List pantheons' },
      '/api/v2/pantheons/{name}': { GET: 'Pantheon entries' },
      '/api/v2/tiers': { GET: 'Tier documentation' },
      '/api/v2/autocomplete': { GET: 'Autocomplete names' },
      '/api/v2/convert': { GET: 'Convert a query' },
      '/api/v2/convert/batch': { POST: 'Batch convert' },
      '/api/v2/authenticity/check': { GET: 'Classify a name, domain, or URL' },
      '/api/v2/authenticity/check/batch': { POST: 'Batch classify' },
      '/api/v2/authenticity/report': { POST: 'Report a suspicious input' },
      '/api/v2/search/web': { GET: 'Web search' },
      '/api/v2/sites': { GET: 'List indexed sites' },
      '/api/v2/sites/{punycode}': { GET: 'Site detail' },
      '/api/v2/health': { GET: 'Health check' },
      '/api/v2/version': { GET: 'Dataset version' },
      '/api/v2/openapi.json': { GET: 'This spec' },
    },
  };
}

async function route(req, res) {
  const slug = Array.isArray(req.query.slug) ? req.query.slug : [];
  const method = req.method;

  // Root docs
  if (slug.length === 0 || slug[0] === '') {
    if (method === 'GET') return handleRoot(req, res);
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const [resource, identifier, subresource] = slug;

  if (resource === 'names') {
    if (!identifier) {
      if (method === 'GET') return handleNamesList(req, res);
      error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
      return;
    }
    if (subresource) {
      if (method === 'GET') return handleNameSubresource(req, res, identifier, subresource);
      error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
      return;
    }
    if (method === 'GET') return handleNameDetail(req, res, identifier);
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  if (resource === 'pantheons') {
    if (!identifier) {
      if (method === 'GET') return handlePantheons(req, res);
      error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
      return;
    }
    if (method === 'GET') return handlePantheon(req, res, identifier);
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  if (resource === 'tiers') {
    if (method === 'GET') return handleTiers(req, res);
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  if (resource === 'autocomplete') {
    if (method === 'GET') return handleAutocomplete(req, res);
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  if (resource === 'convert') {
    if (identifier === 'batch') {
      if (method === 'POST') return handleConvertBatch(req, res);
      error(res, 'METHOD_NOT_ALLOWED', 'Only POST is allowed.', { status: 405 });
      return;
    }
    if (method === 'GET') return handleConvert(req, res);
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  if (resource === 'authenticity') {
    if (identifier === 'check') {
      if (subresource === 'batch') {
        if (method === 'POST') return handleAuthenticityBatch(req, res);
        error(res, 'METHOD_NOT_ALLOWED', 'Only POST is allowed.', { status: 405 });
        return;
      }
      if (method === 'GET') return handleAuthenticityCheck(req, res);
      error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
      return;
    }
    if (identifier === 'report') {
      if (method === 'POST') return handleAuthenticityReport(req, res);
      error(res, 'METHOD_NOT_ALLOWED', 'Only POST is allowed.', { status: 405 });
      return;
    }
    error(res, 'NOT_FOUND', `Unknown authenticity resource '${identifier}'.`, { status: 404 });
    return;
  }

  if (resource === 'search') {
    if (identifier === 'web') {
      if (method === 'GET') return handleSearchWeb(req, res);
      error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
      return;
    }
    error(res, 'NOT_FOUND', `Unknown search vertical '${identifier}'.`, { status: 404 });
    return;
  }

  if (resource === 'sites') {
    if (!identifier) {
      if (method === 'GET') return handleSitesList(req, res);
      error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
      return;
    }
    if (method === 'GET') return handleSiteDetail(req, res, identifier);
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  if (resource === 'health') {
    if (method === 'GET') return handleHealth(req, res);
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  if (resource === 'version') {
    if (method === 'GET') return handleVersion(req, res);
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  if (resource === 'openapi.json') {
    if (method === 'GET') return handleOpenApi(req, res);
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  error(res, 'NOT_FOUND', `Unknown resource '${resource}'.`, { status: 404 });
}

module.exports = { route };
