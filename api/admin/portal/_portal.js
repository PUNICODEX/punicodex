/**
 * Shared helpers for the /api/admin/portal/* handlers.
 * Underscore-prefixed: not routed as a serverless function by Vercel.
 */

const { setCors, handleError, getRouteParam } = require('../../_utils.js');
const portalAuth = require('../../../platform/api/admin-portal-auth.js');
const portalService = require('../../../platform/api/admin-portal-service.js');

function setPortalCors(req, res) {
  setCors(req, res);
  // The portal uses PATCH; the shared CORS helper only advertises GET/POST.
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
}

function sendError(res, err) {
  if (err.status) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  return handleError(res, err);
}

function parseIdParam(req, name = 'id') {
  const raw = getRouteParam(req, name);
  const id = parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
}

function parseLimitOffset(req, { defaultLimit = 100, maxLimit = 500 } = {}) {
  const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || defaultLimit, 1), maxLimit);
  const offset = Math.max(parseInt(req.query?.offset, 10) || 0, 0);
  return { limit, offset };
}

module.exports = {
  setPortalCors,
  sendError,
  parseIdParam,
  parseLimitOffset,
  getRouteParam,
  portalAuth,
  portalService,
};
