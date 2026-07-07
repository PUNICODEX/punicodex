/**
 * Vercel serverless handler for the Scholarly Edition API.
 *
 * Mounted as a catch-all under /api/v1/scholars/* so the Express router
 * can serve /health, /temples, /auth, and all other sub-routes.
 */

const express = require('express');
const scholarsRouter = require('../../../platform/scholars/router');

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

module.exports = (req, res) => {
  app(req, res);
};
