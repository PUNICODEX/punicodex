/**
 * Upload storage root.
 *
 * Local development serves platform/api/public/uploads statically (the
 * Express platform server). On Vercel the deployment bundle is read-only, so
 * writes go to /tmp — ephemeral per instance, exactly like the SQLite
 * booking state itself (see AGENTS.md "SQLite on Vercel lives in /tmp and is
 * ephemeral"). The /api/uploads/[[...slug]] function serves files from this
 * root in production; the local server keeps serving the directory directly.
 *
 * Durable production creative storage (Vercel Blob / external object store)
 * is a deliberate follow-up decision — the booking system's durability
 * decision (external Postgres) and this one travel together.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function uploadsRoot() {
  return process.env.VERCEL
    ? path.join('/tmp', 'punicodex-uploads')
    : path.join(__dirname, 'public', 'uploads');
}

function ensureUploadsDir(subdir = '') {
  const dir = subdir ? path.join(uploadsRoot(), subdir) : uploadsRoot();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = { uploadsRoot, ensureUploadsDir };
