/**
 * Vercel serverless handler for the Scholarly Edition API.
 *
 * Creates a mini Express app, mounts the scholars router at the root,
 * and exports the app so Vercel can dispatch /api/v1/scholars/* requests.
 */

const express = require('express');
const scholarsRouter = require('../../platform/scholars/router');

const app = express();
app.use(scholarsRouter);

module.exports = app;
