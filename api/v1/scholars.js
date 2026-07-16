/**
 * Vercel serverless handler for the Scholarly Edition API.
 *
 * Reached through vercel.json rewrites for every /api/v1/scholars/* path.
 * Normalises req.url so the internal Express router receives the sub-path
 * it expects (e.g. /health, /temples/zeus, /auth/magic-link).
 */

const express = require('express');
const { getDb } = require('../../platform/db/connection');
const { migrate: migrateScholars } = require('../../platform/db/migrate-scholars');
const { migrate: migrateQuality } = require('../../platform/db/migrate-scholars-quality');
const { seedScholarsFromManifests } = require('../../platform/db/scholars/seed');
const scholarsRouter = require('../../platform/scholars/router');

// Ensure Scholars tables exist before handling requests. Both migrations are
// idempotent; safe to run on every serverless cold start.
migrateScholars(getDb());
migrateQuality(getDb());

// Seed canonical manifest content into the (on Vercel, ephemeral) database.
// Idempotent: repeat cold starts skip existing temples and never touch
// sections that already carry content. A seed failure must never take the
// API down, so it is logged and swallowed.
try {
  seedScholarsFromManifests({
    logger: { log: () => {}, warn: () => {}, error: console.error },
  });
} catch (err) {
  console.error('[scholars] seed failed:', err);
}

const app = express();
app.use(scholarsRouter);

// JSON 404 for unmatched routes.
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found', code: 404 });
});

// JSON error handler.
app.use((err, _req, res, _next) => {
  console.error('[scholars] unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error', code: 500 });
});

const PREFIX = '/api/v1/scholars';
const PREFIX_WITH_SLASH = '/api/v1/scholars/';

module.exports = (req, res) => {
  const rawUrl = req.url || '/';
  const queryIndex = rawUrl.indexOf('?');
  const pathPart = queryIndex >= 0 ? rawUrl.slice(0, queryIndex) : rawUrl;
  const query = queryIndex >= 0 ? rawUrl.slice(queryIndex) : '';

  let subPath;
  const queryPath = req.query && typeof req.query.path === 'string' ? req.query.path : '';

  if (pathPart === PREFIX || pathPart === PREFIX_WITH_SLASH) {
    // Vercel rewrite destination: use the captured path from the query param.
    subPath = queryPath ? '/' + queryPath : '/';
  } else if (pathPart.startsWith(PREFIX_WITH_SLASH)) {
    // Original URL preserved: strip the function prefix.
    subPath = pathPart.slice(PREFIX.length) || '/';
  } else if (queryPath) {
    subPath = '/' + queryPath;
  } else {
    subPath = '/';
  }

  req.url = subPath + query;
  app(req, res);
};
