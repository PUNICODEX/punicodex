/**
 * PÚNYCODEX API v1 — Standard response envelope and helpers
 */

const crypto = require('node:crypto');

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || 'https://punycodex.com,http://localhost:3456')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

function generateRequestId() {
  return `req_${crypto.randomBytes(8).toString('hex')}`;
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Vary', 'Origin');
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(key, value);
  }
}

function success(res, data, options = {}) {
  const { status = 200, meta = {}, links } = options;
  const requestId = res.locals?.requestId || generateRequestId();
  const payload = {
    success: true,
    data,
    meta: {
      requestId,
      version: res.locals?.apiVersion || 'v1',
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
  if (links !== undefined) payload.links = links;
  res.status(status).json(payload);
}

function error(res, code, message, options = {}) {
  const requestId = res.locals?.requestId || generateRequestId();
  const statusCode =
    options.status ||
    (code === 'NOT_FOUND'
      ? 404
      : code === 'VALIDATION_ERROR'
        ? 400
        : code === 'UNAUTHORIZED'
          ? 401
          : code === 'FORBIDDEN'
            ? 403
            : code === 'RATE_LIMIT_EXCEEDED'
              ? 429
              : 500);

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: options.details || {},
    },
    meta: {
      requestId,
      version: res.locals?.apiVersion || 'v1',
      timestamp: new Date().toISOString(),
    },
  });
}

function handleApiError(res, err) {
  console.error('API v1 error:', err);
  error(res, 'INTERNAL_ERROR', err.message || 'Internal server error', { status: 500 });
}

function withRequestId(req, res, next) {
  res.locals = res.locals || {};
  res.locals.requestId = req.headers['x-request-id'] || generateRequestId();
  next();
}

module.exports = {
  setCors,
  success,
  error,
  handleApiError,
  withRequestId,
  generateRequestId,
};
