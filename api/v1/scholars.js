/**
 * Vercel serverless handler for the Scholarly Edition API.
 *
 * Creates a mini Express app, mounts the scholars router at the root,
 * and exports a function handler so Vercel can dispatch /api/v1/scholars/* requests.
 */

const express = require('express');
const scholarsRouter = require('../../platform/scholars/router');

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
