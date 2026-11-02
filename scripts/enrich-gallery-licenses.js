#!/usr/bin/env node
/**
 * Enrich scripts/gallery-data.json with per-image licensing metadata from
 * the Wikimedia Commons API (LicenseShortName / Artist / Credit), and add a
 * canonical Commons file page URL for every image. Idempotent: images that
 * already carry `license` are skipped, so re-runs only fill gaps.
 *
 * The Art galleries' lightbox renders this metadata so every artwork is
 * click-to-expand with honest licensing details (the /store/art/galleries/
 * contract with visitors).
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const GALLERY_PATH = path.join(ROOT, 'scripts', 'gallery-data.json');
const data = JSON.parse(fs.readFileSync(GALLERY_PATH, 'utf8'));

// upload.wikimedia.org thumb URL → Commons File:title
// .../thumb/0/0b/Name.jpg/960px-Name.jpg(.webp) or .../0/0b/Name.jpg direct
function fileTitleFromSrc(src) {
  try {
    const u = new URL(src);
    const parts = u.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    // thumb render names: {w}px-Name.jpg, page1-{w}px-Name.pdf.jpg,
    // lossy-page1-{w}px-Name.tif.jpg — cut everything up to the {w}px- marker.
    // `?width=` requests render as {w}px-thumbnail.jpg, losing the title —
    // recover it from the original-name path segment before it.
    const m = last.match(/^(?:lossy-|lossless-)?(?:page\d+-)?\d+px-(.+)$/);
    if (m) {
      let t = m[1];
      if (/^thumbnail\.[a-z]+$/i.test(t)) {
        const orig = parts[parts.length - 2] || '';
        if (orig) t = orig;
      }
      t = t.replace(/\.webp$/, '');
      // multi-page renders append .jpg/.png to the true extension
      t = t.replace(/\.(svg|tif|tiff|pdf|djvu)\.(jpg|png|webp)$/i, '.$1');
      return decodeURIComponent(t).replace(/_/g, ' ');
    }
    // direct original upload
    return decodeURIComponent(last).replace(/_/g, ' ');
  } catch {
    return null;
  }
}

function commonsPageUrl(title) {
  return 'https://commons.wikimedia.org/wiki/File:' + title.replace(/ /g, '_');
}

// Collect all images needing enrichment
const needs = [];
for (const [id, g] of Object.entries(data)) {
  for (const im of g.images || []) {
    if (im.license) continue;
    const title = fileTitleFromSrc(im.src);
    if (title) needs.push({ id, im, title });
  }
}
console.log(`images needing enrichment: ${needs.length}`);

const API = 'https://commons.wikimedia.org/w/api.php';
async function fetchBatch(batch) {
  const titles = batch.map((b) => 'File:' + b.title).join('|');
  const url =
    `${API}?action=query&format=json&prop=imageinfo&iiprop=extmetadata&` +
    `titles=${encodeURIComponent(titles)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PuniCodex-GalleryEnricher/1.0 (https://punicodex.com)' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  return res.json();
}

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

(async () => {
  let filled = 0;
  let failed = 0;
  const CHUNK = 40;
  for (let i = 0; i < needs.length; i += CHUNK) {
    const batch = needs.slice(i, i + CHUNK);
    let json = null;
    try {
      json = await fetchBatch(batch);
    } catch (e) {
      failed += batch.length;
      continue;
    }
    const pages = (json.query && json.query.pages) || {};
    const byTitle = {};
    for (const p of Object.values(pages)) {
      if (p.title) byTitle[p.title.replace(/^File:/, '')] = p;
    }
    for (const { im, title } of batch) {
      const p = byTitle[title];
      const em = p && p.imageinfo && p.imageinfo[0] && p.imageinfo[0].extmetadata;
      if (!em) {
        failed++;
        continue;
      }
      im.license = stripHtml(em.LicenseShortName && em.LicenseShortName.value) || 'See source';
      const artist = stripHtml(em.Artist && em.Artist.value);
      if (artist) im.artist = artist.slice(0, 200);
      im.sourceUrl = commonsPageUrl(title);
      filled++;
    }
    if ((i / CHUNK) % 5 === 0) console.log(`  ${Math.min(i + CHUNK, needs.length)}/${needs.length}`);
    // polite pacing
    await new Promise((r) => setTimeout(r, 150));
  }
  // deterministic key order for byte-stable output
  const out = {};
  for (const id of Object.keys(data).sort()) out[id] = data[id];
  fs.writeFileSync(GALLERY_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`enriched: ${filled}, unresolved: ${failed}`);
})();
