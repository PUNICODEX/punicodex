/**
 * PuniCodex — Upload guard for every creative/image upload surface.
 *
 * Shared defenses for the three upload pipelines (sponsor booking upload,
 * tenant-portal change requests, student creative marketplace):
 *
 *   1. Magic-byte sniffing — the declared data-URI MIME is NOT trusted. The
 *      buffer must actually start with the PNG / JPEG / WebP signature and the
 *      sniffed type must match the declared type. This rejects executables,
 *      HTML/SVG polyglots, ZIPs, and mislabeled payloads at the door, before
 *      any decoder touches them.
 *   2. Pre-decode dimension bomb guard — imageSize reads the header without
 *      decoding pixels, so a 4MB PNG claiming 100,000×100,000 px is rejected
 *      for a few bytes of work instead of gigabytes of decompression (the
 *      classic image-bomb DoS).
 *   3. Decoder pixel budget — the sharp pipeline gets an explicit
 *      limitInputPixels so anything the header check missed still cannot
 *      make libvips allocate unbounded memory.
 *
 * Malware-hosting defense is architectural: every pipeline re-encodes from
 * decoded pixels (sharp for sponsor/tenant uploads, canvas for the
 * marketplace), so the stored bytes are always freshly-encoded images —
 * any embedded payload dies at the re-encode. This module makes sure nothing
 * hostile ever reaches the decoder.
 */

'use strict';

const { imageSize } = require('image-size');

// Creative slots are temple banners; even 2× retina masters are far below
// these ceilings. Legitimate uploads never come near them.
const MAX_DIMENSION = 8192;
const MAX_INPUT_PIXELS = 32 * 1024 * 1024; // 32MP ≈ ≤128MB transient decode buffer

const MIME_BY_SNIFFED_TYPE = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
};

function sniffImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 && // P
    buffer[2] === 0x4e && // N
    buffer[3] === 0x47 && // G
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  // WebP: 'RIFF' + 4-byte size + 'WEBP'
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp';
  }
  return null;
}

/**
 * Validate an upload buffer before any decoder sees it.
 * @returns {{error: string}} | {{width: number, height: number, mimeType: string}}
 */
function guardImageBuffer(buffer, declaredMimeType) {
  const sniffed = sniffImageType(buffer);
  if (!sniffed) {
    return { error: 'File contents do not match an allowed image format (PNG, JPG, WebP).' };
  }
  const mimeType = MIME_BY_SNIFFED_TYPE[sniffed];
  const declared = declaredMimeType === 'image/jpg' ? 'image/jpeg' : declaredMimeType;
  if (declared && declared !== mimeType) {
    return { error: 'File contents do not match the declared image type.' };
  }

  let dimensions;
  try {
    dimensions = imageSize(buffer);
  } catch (err) {
    return { error: `Could not read image dimensions: ${err.message}` };
  }
  if (!dimensions?.width || !dimensions?.height) {
    return { error: 'Could not determine image dimensions.' };
  }
  const { width, height } = dimensions;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    return {
      error: `Image dimensions (${width}×${height}) exceed the maximum ${MAX_DIMENSION}px per side.`,
    };
  }
  if (width * height > MAX_INPUT_PIXELS) {
    return {
      error: `Image has too many pixels (${width}×${height}); maximum is ${MAX_INPUT_PIXELS / 1024 / 1024}MP.`,
    };
  }
  return { width, height, mimeType };
}

module.exports = {
  MAX_DIMENSION,
  MAX_INPUT_PIXELS,
  sniffImageType,
  guardImageBuffer,
};
