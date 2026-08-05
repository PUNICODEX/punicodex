/**
 * Creative upload storage.
 *
 * Two backends, one call:
 *   - Vercel Blob when BLOB_READ_WRITE_TOKEN is set (production): files are
 *     durable, served from Vercel's CDN, and the returned value is the
 *     absolute public blob URL — stored verbatim as creative_path.
 *   - Local disk otherwise (dev): platform/api/public/uploads, served by the
 *     Express platform server; the returned value is the /uploads/… path.
 *     (On Vercel without the token the root is /tmp — ephemeral per instance,
 *     like the SQLite booking state before Postgres.)
 *
 * Callers must treat creative_path as opaque: it may be a site-relative
 * /uploads/ path or an absolute https:// blob URL. Display layers resolve
 * both via resolveCreativeUrl below.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function blobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

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

/**
 * Persist a creative buffer and return its public URL/path.
 * @param {string} subdir — e.g. the booking id (or booking/slot id)
 * @param {string} filename — sanitized filename with extension
 * @param {Buffer} buffer — the normalized image bytes
 * @param {string} contentType — e.g. 'image/png'
 * @returns {Promise<{url: string}>}
 */
async function storeCreativeBuffer(subdir, filename, buffer, contentType = 'image/png') {
  if (blobEnabled()) {
    const { put } = require('@vercel/blob');
    const blob = await put(`${subdir}/${filename}`, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    });
    return { url: blob.url };
  }
  const dir = ensureUploadsDir(subdir);
  const abs = path.join(dir, filename);
  fs.writeFileSync(abs, buffer);
  return { url: `/uploads/${subdir}/${filename}` };
}

/**
 * Display-layer helper: a stored creative reference may be a site-relative
 * /uploads/ path or an absolute blob URL. Resolve for rendering against an
 * optional API base.
 */
function resolveCreativeUrl(creativePath, apiBase = '') {
  if (!creativePath) return null;
  if (/^https?:\/\//.test(creativePath)) return creativePath;
  return `${apiBase}${creativePath}`;
}

module.exports = {
  blobEnabled,
  uploadsRoot,
  ensureUploadsDir,
  storeCreativeBuffer,
  resolveCreativeUrl,
};
