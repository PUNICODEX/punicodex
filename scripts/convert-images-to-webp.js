#!/usr/bin/env node
/**
 * PuniCodex — WebP conversion + picture markup updater.
 *
 * Scans raster images referenced by the public site, converts missing or
 * stale PNG/JPG siblings to WebP (quality 85), and updates templates + HTML
 * to use <picture> with WebP source + original fallback. Adds explicit
 * width/height attributes to reduce CLS and lazy-loads below-the-fold images.
 *
 * Run: node scripts/convert-images-to-webp.js
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function writeFileWithRetry(filePath, data, encoding = 'utf8', retries = 5, delay = 100) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      fs.writeFileSync(filePath, data, encoding);
      return;
    } catch (err) {
      const isTransient =
        err.code === 'EBUSY' ||
        err.code === 'EAGAIN' ||
        err.code === 'UNKNOWN' ||
        err.code === 'EPERM';
      if (attempt === retries || !isTransient) {
        throw err;
      }
      const ms = delay * attempt;
      console.warn(`  transient write error for ${filePath} (${err.code}), retrying in ${ms}ms...`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    }
  }
}

function writeFileAtomic(filePath, data, encoding = 'utf8') {
  const tmpPath = `${filePath}.tmp.${process.pid}`;
  writeFileWithRetry(tmpPath, data, encoding);
  // The rename is just as lock-prone on Windows (AV scanners grab the fresh
  // .tmp file): retry with the same transient backoff as the write itself.
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      fs.renameSync(tmpPath, filePath);
      return;
    } catch (err) {
      const isTransient =
        err.code === 'EBUSY' ||
        err.code === 'EAGAIN' ||
        err.code === 'UNKNOWN' ||
        err.code === 'EPERM';
      if (attempt === 5 || !isTransient) {
        try {
          fs.unlinkSync(tmpPath);
        } catch {}
        throw err;
      }
      const ms = 100 * attempt;
      console.warn(`  transient rename error for ${filePath} (${err.code}), retrying in ${ms}ms...`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    }
  }
}

const LAZY_LOAD_CLASSES = new Set([
  'footer-logomark',
  'pantheon-mascot-img',
  'scholars-media-thumb',
  'gallery-lightbox-img',
  'creative-thumb',
]);

function runPython() {
  const pyPath = path.join(ROOT, 'scripts', 'convert-images-to-webp.py');
  const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', [pyPath], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });

  if (result.error) {
    console.error('Python helper failed to spawn:', result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error('Python helper exited with code', result.status);
    console.error(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }

  try {
    return JSON.parse(result.stdout.split('\n').filter(Boolean).pop() || '{}');
  } catch {
    console.error('Could not parse Python helper output:', result.stdout);
    return { converted: [], count: 0 };
  }
}

function getImageDimensions(imgPath) {
  const base = path.basename(imgPath || '');
  // Site mascots / lockups / logomarks share identical canvas sizes.
  if (/mascot\.(png|jpe?g|webp)$/i.test(base)) return { width: 1024, height: 1536 };
  if (/logolockup\.(png|jpe?g|webp)$/i.test(base)) return { width: 1536, height: 1024 };
  if (/logomark\.(png|jpe?g|webp)$/i.test(base)) return { width: 1024, height: 1024 };
  // Public mascot directory.
  if (/assets\/images\/mascots\/[^/]+_mascot\.(png|webp)$/i.test(imgPath.replace(/\\/g, '/'))) {
    return { width: 1024, height: 1536 };
  }
  // OG default fallback.
  if (/og-default\.(png|webp)$/i.test(base)) return { width: 1200, height: 630 };

  // Fallback: read from disk for any other raster.
  if (imgPath && fs.existsSync(imgPath)) {
    const python = process.platform === 'win32' ? 'python' : 'python3';
    const script = `
import json, sys
from PIL import Image
with Image.open(sys.argv[1]) as im:
    print(json.dumps({"width": im.width, "height": im.height}))
`;
    const result = spawnSync(python, ['-c', script, imgPath], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024,
    });
    try {
      return JSON.parse(result.stdout.trim().split('\n').pop() || '{}');
    } catch {
      return {};
    }
  }
  return {};
}

function resolveImagePath(htmlDir, src) {
  if (!src || src.startsWith('http') || src.startsWith('data:')) return null;
  const rel = src.startsWith('/') ? src.slice(1) : path.join(htmlDir, src);
  return path.resolve(ROOT, rel);
}

function normalizeAttributeOrder(tag, attrs) {
  // Preserve existing attributes while ensuring width/height/loading/decoding are present.
  let updated = tag;
  for (const [key, value] of Object.entries(attrs)) {
    const escaped = value.replace(/"/g, '&quot;');
    const regex = new RegExp(`\\b${key}="[^"]*"`, 'i');
    if (regex.test(updated)) {
      updated = updated.replace(regex, `${key}="${escaped}"`);
    } else {
      updated = updated.replace(/\s*\/?>$/, ` ${key}="${escaped}"$&`);
    }
  }
  return updated;
}

function updateImgTag(match, htmlDir, dimCache) {
  const fullTag = match[0];
  const classMatch = fullTag.match(/\bclass="([^"]+)"/);
  const classes = classMatch ? classMatch[1].split(/\s+/) : [];
  const srcMatch = fullTag.match(/\bsrc="([^"]+)"/);
  const src = srcMatch ? srcMatch[1] : null;

  const isLazyCandidate = classes.some((c) => LAZY_LOAD_CLASSES.has(c));

  const imgPath = resolveImagePath(htmlDir, src);
  const dims = imgPath ? getOrCacheDims(imgPath, dimCache) : {};

  const updates = {};
  if (dims.width && dims.height) {
    updates.width = String(dims.width);
    updates.height = String(dims.height);
  }
  if (isLazyCandidate && !/\bloading=/.test(fullTag)) {
    updates.loading = 'lazy';
  }
  if (isLazyCandidate && !/\bdecoding=/.test(fullTag)) {
    updates.decoding = 'async';
  }
  if (!updates.width) return fullTag;

  return normalizeAttributeOrder(fullTag, updates);
}

function getOrCacheDims(imgPath, cache) {
  if (!cache[imgPath]) {
    cache[imgPath] = getImageDimensions(imgPath);
  }
  return cache[imgPath];
}

function needsPictureWrap(src) {
  if (!src) return false;
  const ext = path.extname(src).toLowerCase();
  return ['.png', '.jpg', '.jpeg'].includes(ext);
}

function wrapImgInPicture(match) {
  const fullTag = match[0];
  const srcMatch = fullTag.match(/\bsrc="([^"]+)"/);
  const src = srcMatch ? srcMatch[1] : null;
  if (!needsPictureWrap(src)) return fullTag;

  const webpSrc = src.replace(/\.(png|jpe?g)$/i, '.webp');
  return `<picture><source srcset="${webpSrc}" type="image/webp">${fullTag}</picture>`;
}

function updatePictureBlock(block, htmlDir, dimCache) {
  // Update the inner <img> of an existing <picture> block.
  return block.replace(/<img\b[^>]*>/gi, (tag) => {
    return updateImgTag({ 0: tag, index: 0, input: block }, htmlDir, dimCache);
  });
}

function updateHtmlFile(filePath, dimCache) {
  const original = fs.readFileSync(filePath, 'utf8');
  const htmlDir =
    path
      .dirname(filePath)
      .replace(ROOT, '')
      .replace(/^[\\/]/, '') || '.';

  let updated = original;

  // 1. Update existing <picture>...</picture> blocks and replace with placeholders.
  const pictureRegex = /<picture\b[^>]*>.*?<\/picture>/gis;
  const pictureMap = new Map();
  let pictureIndex = 0;
  updated = updated.replace(pictureRegex, (block) => {
    const replacement = updatePictureBlock(block, htmlDir, dimCache);
    const key = `__PICTURE_PLACEHOLDER_${pictureIndex++}__`;
    pictureMap.set(key, replacement);
    return key;
  });

  // 2. Wrap standalone raster <img> tags in <picture> and update attributes.
  updated = updated.replace(/<img\b[^>]*>/gi, (tag) => {
    const wrapped = wrapImgInPicture({ 0: tag, index: 0, input: '' });
    const block = wrapped === tag ? tag : wrapped;
    return updatePictureBlock(block, htmlDir, dimCache);
  });

  // 3. Restore updated <picture> blocks.
  for (const [key, value] of pictureMap) {
    updated = updated.replace(key, value);
  }

  // 4. Replace og-default.svg with og-default.webp in meta / twitter / JSON-LD.
  updated = updated.replace(
    /(content=["'][^"']*)\/assets\/images\/og-default\.svg(["'])/gi,
    '$1/assets/images/og-default.webp$2'
  );
  updated = updated.replace(
    /"url":\s*"https:\/\/punicodex\.com\/assets\/images\/og-default\.svg"/gi,
    '"url": "https://punicodex.com/assets/images/og-default.webp"'
  );

  if (updated !== original) {
    writeFileAtomic(filePath, updated, 'utf8');
    return true;
  }
  return false;
}

function main() {
  console.log('▸ Running WebP conversion helper...');
  const result = runPython();
  if (result.error) {
    console.error('✗ Conversion failed:', result.error);
    process.exit(1);
  }
  console.log(`  Converted ${result.count || 0} image(s)`);

  const dimCache = {};
  const htmlDirs = [path.join(ROOT, 'templates', 'flagship'), path.join(ROOT, 'sites')];
  const rootHtmlFiles = [
    'index.html',
    'search.html',
    'oracle.html',
    'about/index.html',
    'appraise/index.html',
    'authenticity/index.html',
    'codex/index.html',
    'codex/anatomy-of-a-punycode-domain/index.html',
    'codex/building-the-temple/index.html',
    'codex/why-greek-accents-matter/index.html',
    'connections/index.html',
    'contact/index.html',
    'creatives/index.html',
    'game/index.html',
    'lexicon/index.html',
    'mobile/index.html',
    'pantheon/index.html',
    'privacy/index.html',
    'realms/index.html',
    'store/index.html',
    'tiers/index.html',
    'type/index.html',
  ];

  let updatedFiles = 0;

  console.log('▸ Updating templates + generated HTML...');

  for (const dir of htmlDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir, { recursive: true });
    let processed = 0;
    for (const rel of files) {
      const full = path.join(dir, rel);
      if (!full.endsWith('.html')) continue;
      if (!fs.statSync(full).isFile()) continue;
      if (updateHtmlFile(full, dimCache)) updatedFiles++;
      processed++;
      if (processed % 200 === 0) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
      }
    }
  }

  for (const rel of rootHtmlFiles) {
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full) && updateHtmlFile(full, dimCache)) updatedFiles++;
  }

  console.log(`  Updated ${updatedFiles} HTML file(s)`);
  console.log('✓ WebP conversion and markup update complete.');
}

main();
