/**
 * GET /uploads/* — creative file serving.
 *
 * On Vercel, uploads are written to /tmp (the deployment bundle is
 * read-only); this function streams them back with an immutable cache and a
 * strict traversal guard. Locally the Express platform server serves
 * platform/api/public/uploads directly and this route is bypassed.
 *
 * Contract: vercel.json rewrites /uploads/:slug* here; req.query.slug is the
 * slash-joined path.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { uploadsRoot } = require('../../platform/api/upload-storage.js');

const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let slugParts = req.query.slug;
  // The capture arrives as ONE slash-joined string; split it (unsplit,
  // slugParts.length is a character count and slugParts[0] a single letter).
  if (typeof slugParts === 'string') slugParts = slugParts.split('/').filter(Boolean);
  // Every segment is validated, not just the whole: no empty, dot, or
  // backslash segments ever reach the filesystem.
  const segments = (Array.isArray(slugParts) ? slugParts : []).filter(
    (s) => s && s !== '.' && s !== '..' && !s.includes('\\')
  );
  const rel = segments.join('/');
  const root = uploadsRoot();
  const abs = path.join(root, rel);
  if (!rel || (!abs.startsWith(root + path.sep) && abs !== root)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  const ext = path.extname(abs).toLowerCase();
  const type = CONTENT_TYPES[ext];
  if (!type) return res.status(404).json({ error: 'Not found' });

  let data;
  try {
    data = fs.readFileSync(abs);
  } catch {
    return res.status(404).json({ error: 'Not found' });
  }
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(200).send(data);
};
