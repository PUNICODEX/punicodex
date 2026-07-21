/**
 * WebP rendition helper for uploaded images.
 *
 * Uploads are stored under platform/api/public/uploads/ as PNG/JPEG (the
 * original is always kept as the ultimate fallback). This module writes a
 * `.webp` sibling next to the original at upload time and lets serializers
 * advertise the sibling only when it actually exists on disk, so display
 * code can emit <picture><source type="image/webp"> + <img> without ever
 * risking a broken image for older uploads or failed conversions.
 *
 * sharp is required lazily so a missing/broken native binary degrades to
 * "no webp rendition" instead of failing the upload itself.
 */

const fs = require('node:fs');
const path = require('node:path');

const WEBP_QUALITY = 82;

let sharp = null;
let sharpFailed = false;
function getSharp() {
  if (sharp || sharpFailed) return sharp;
  try {
    sharp = require('sharp');
  } catch (err) {
    sharpFailed = true;
    console.error('[image-webp] sharp unavailable, WebP renditions disabled:', err.message);
  }
  return sharp;
}

/**
 * Public-path convention: the WebP rendition of /uploads/5/123.png lives at
 * /uploads/5/123.webp. Returns null for paths that are already webp or have
 * no convertible extension.
 */
function webpSiblingPath(publicPath) {
  if (typeof publicPath !== 'string' || publicPath.length === 0) return null;
  if (/\.webp$/i.test(publicPath)) return null;
  if (!/\.(png|jpe?g)$/i.test(publicPath)) return null;
  return publicPath.replace(/\.(png|jpe?g)$/i, '.webp');
}

/**
 * Encode `buffer` as WebP next to `absFilePath` (same basename, .webp
 * extension). When `buffer` is omitted the file is read from disk. Returns
 * the absolute webp path, or null when sharp is unavailable or encoding
 * fails. Never throws — uploads must not fail because an optional rendition
 * could not be produced.
 */
async function writeWebpSibling(absFilePath, buffer) {
  const lib = getSharp();
  if (!lib) return null;
  try {
    const webpPath = absFilePath.replace(/\.(png|jpe?g)$/i, '.webp');
    if (webpPath === absFilePath) return null;
    await lib(buffer ?? fs.readFileSync(absFilePath), { failOn: 'truncated' })
      .webp({ quality: WEBP_QUALITY })
      .toFile(webpPath);
    return webpPath;
  } catch (err) {
    console.error('[image-webp] conversion failed for', absFilePath, err.message);
    return null;
  }
}

const PUBLIC_UPLOADS_ROOT = path.join(__dirname, 'public', 'uploads');

/**
 * Returns the public webp path when the sibling exists on disk, else null.
 * Used by serializers so the display layer only emits <source type="image/webp">
 * for renditions that really exist.
 */
function existingWebpFor(publicPath) {
  const sibling = webpSiblingPath(publicPath);
  if (!sibling || !sibling.startsWith('/uploads/')) return null;
  const abs = path.join(PUBLIC_UPLOADS_ROOT, sibling.slice('/uploads/'.length));
  try {
    return fs.existsSync(abs) ? sibling : null;
  } catch (_err) {
    return null;
  }
}

module.exports = {
  WEBP_QUALITY,
  webpSiblingPath,
  writeWebpSibling,
  existingWebpFor,
};
