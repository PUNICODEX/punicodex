/**
 * PuniCodex — Student Creative Marketplace watermark and upload pipeline
 *
 * Handles validation, EXIF stripping, thumbnail/preview generation, and
 * diagonal watermarking for student creative uploads.
 */

const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, loadImage } = require('canvas');
const { imageSize } = require('image-size');

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'creatives');
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const PREVIEW_MAX_WIDTH = 1200;
const PREVIEW_MAX_HEIGHT = 1200;
const THUMBNAIL_SIZE = 400;
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function parseBase64Image(image) {
  const match = image.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) return { error: 'Invalid image format. Must be a base64 data URI (PNG, JPG, WebP).' };
  const mimeType = match[1].replace('image/jpg', 'image/jpeg');
  const buffer = Buffer.from(match[3], 'base64');
  if (buffer.length > MAX_FILE_BYTES) {
    return { error: `Image must be under ${MAX_FILE_BYTES / 1024 / 1024}MB` };
  }
  return { mimeType, buffer };
}

function validateImage(buffer) {
  let dimensions;
  try {
    dimensions = imageSize(buffer);
  } catch (err) {
    return { error: `Could not read image dimensions: ${err.message}` };
  }

  if (
    !ALLOWED_MIME_TYPES.includes(
      dimensions.type === 'jpg' ? 'image/jpeg' : `image/${dimensions.type}`
    )
  ) {
    return { error: `Unsupported image type: ${dimensions.type}. Use PNG, JPG, or WebP.` };
  }

  if (dimensions.width < 200 || dimensions.height < 200) {
    return { error: 'Image must be at least 200 × 200 px' };
  }

  return { dimensions };
}

function resizeToFit(srcWidth, srcHeight, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight, 1);
  return {
    width: Math.round(srcWidth * ratio),
    height: Math.round(srcHeight * ratio),
  };
}

async function loadImageFromBuffer(buffer) {
  return loadImage(buffer);
}

function canvasFromImage(image, width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);
  return { canvas, ctx };
}

function applyDiagonalWatermark(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);

  const fontSize = Math.max(14, Math.floor(Math.min(width, height) / 22));
  ctx.font = `700 ${fontSize}px "DejaVu Sans", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const text = 'PuniCodex STUDENT WORK — PREVIEW';
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const lineHeight = fontSize * 1.4;

  // Tiled watermark across a large rotated area so it covers the image.
  const cols = Math.ceil((width * 1.5) / (textWidth + 80));
  const rows = Math.ceil((height * 1.5) / lineHeight);

  for (let row = -rows; row <= rows; row += 1) {
    for (let col = -cols; col <= cols; col += 1) {
      const x = col * (textWidth + 80);
      const y = row * lineHeight + (col % 2) * (lineHeight / 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillText(text, x, y);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = Math.max(1, fontSize / 16);
      ctx.strokeText(text, x, y);
    }
  }

  ctx.restore();
  return canvas;
}

function extensionForMime(mimeType) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

async function saveCanvas(canvas, filePath, mimeType) {
  const ext = extensionForMime(mimeType);
  const fullPath = `${filePath}.${ext}`;
  const out = fs.createWriteStream(fullPath);
  let stream;
  if (ext === 'png') {
    stream = canvas.createPNGStream({ compressionLevel: 6 });
  } else if (ext === 'webp') {
    // canvas does not natively support WebP streams; fall back to PNG.
    stream = canvas.createPNGStream({ compressionLevel: 6 });
  } else {
    stream = canvas.createJPEGStream({ quality: 0.92, progressive: true });
  }
  await new Promise((resolve, reject) => {
    stream.pipe(out);
    out.on('finish', resolve);
    out.on('error', reject);
    stream.on('error', reject);
  });
  return fullPath;
}

async function processCreativeUpload({ imageBase64, assetId, mimeType: requestedMimeType }) {
  ensureUploadsDir();

  const parsed = parseBase64Image(imageBase64);
  if (parsed.error) return { error: parsed.error };

  const validation = validateImage(parsed.buffer);
  if (validation.error) return { error: validation.error };

  const mimeType =
    requestedMimeType && ALLOWED_MIME_TYPES.includes(requestedMimeType)
      ? requestedMimeType
      : parsed.mimeType;

  let originalImage;
  try {
    originalImage = await loadImageFromBuffer(parsed.buffer);
  } catch (err) {
    return { error: `Could not decode image: ${err.message}` };
  }

  const srcWidth = originalImage.width;
  const srcHeight = originalImage.height;
  const assetDir = path.join(UPLOADS_DIR, String(assetId));
  if (!fs.existsSync(assetDir)) fs.mkdirSync(assetDir, { recursive: true });

  const baseName = `${Date.now()}`;

  // Original: re-encoded to strip metadata.
  const originalCanvas = createCanvas(srcWidth, srcHeight);
  originalCanvas.getContext('2d').drawImage(originalImage, 0, 0);
  const originalPath = await saveCanvas(
    originalCanvas,
    path.join(assetDir, `${baseName}_original`),
    mimeType
  );

  // Preview: scaled to fit max bounds, then watermarked.
  const previewDims = resizeToFit(srcWidth, srcHeight, PREVIEW_MAX_WIDTH, PREVIEW_MAX_HEIGHT);
  const previewCanvas = createCanvas(previewDims.width, previewDims.height);
  previewCanvas
    .getContext('2d')
    .drawImage(originalImage, 0, 0, previewDims.width, previewDims.height);
  applyDiagonalWatermark(previewCanvas);
  const previewPath = await saveCanvas(
    previewCanvas,
    path.join(assetDir, `${baseName}_preview`),
    mimeType
  );

  // Thumbnail: square cover crop.
  const thumbCanvas = createCanvas(THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  const thumbCtx = thumbCanvas.getContext('2d');
  const coverDims = resizeToFit(srcWidth, srcHeight, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  const offsetX = (THUMBNAIL_SIZE - coverDims.width) / 2;
  const offsetY = (THUMBNAIL_SIZE - coverDims.height) / 2;
  thumbCtx.drawImage(originalImage, offsetX, offsetY, coverDims.width, coverDims.height);
  const thumbnailPath = await saveCanvas(
    thumbCanvas,
    path.join(assetDir, `${baseName}_thumb`),
    mimeType
  );

  return {
    originalPath: `/uploads/creatives/${assetId}/${path.basename(originalPath)}`,
    previewPath: `/uploads/creatives/${assetId}/${path.basename(previewPath)}`,
    thumbnailPath: `/uploads/creatives/${assetId}/${path.basename(thumbnailPath)}`,
    dimensions: validation.dimensions,
    mimeType,
  };
}

module.exports = {
  processCreativeUpload,
  parseBase64Image,
  validateImage,
  applyDiagonalWatermark,
  UPLOADS_DIR,
  MAX_FILE_BYTES,
  ALLOWED_MIME_TYPES,
};
