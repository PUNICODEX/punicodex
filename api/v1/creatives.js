/**
 * Vercel serverless handler for the Student Creative Marketplace API.
 *
 * Reached through vercel.json rewrites for every /api/v1/creatives/* path.
 */

const express = require('express');
const creativeRouter = require('../../platform/api/creative-marketplace');

const app = express();
app.use(creativeRouter);

// JSON 404 for unmatched routes.
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found', code: 404 });
});

// JSON error handler.
app.use((err, _req, res, _next) => {
  console.error('[creatives] unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error', code: 500 });
});

const PREFIX = '/api/v1/creatives';
const PREFIX_WITH_SLASH = '/api/v1/creatives/';

module.exports = (req, res) => {
  const rawUrl = req.url || '/';
  const queryIndex = rawUrl.indexOf('?');
  const pathPart = queryIndex >= 0 ? rawUrl.slice(0, queryIndex) : rawUrl;
  const query = queryIndex >= 0 ? rawUrl.slice(queryIndex) : '';

  let subPath;
  const queryPath = req.query && typeof req.query.path === 'string' ? req.query.path : '';

  if (pathPart === PREFIX || pathPart === PREFIX_WITH_SLASH) {
    subPath = queryPath ? `/${queryPath}` : '/';
  } else if (pathPart.startsWith(PREFIX_WITH_SLASH)) {
    subPath = pathPart.slice(PREFIX.length) || '/';
  } else if (queryPath) {
    subPath = `/${queryPath}`;
  } else {
    subPath = '/';
  }

  req.url = subPath + query;
  app(req, res);
};
