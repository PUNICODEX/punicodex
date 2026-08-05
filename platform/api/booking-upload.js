/**
 * Shared creative upload logic used by both the local dev server
 * (platform/server.js) and the Vercel API handler (api/bookings/[[...slug]].js).
 */

const fs = require('node:fs');
const path = require('node:path');
const {
  getBookingByToken,
  getSlotById,
  saveCreative,
  saveSlotCreative,
  getBundleMembers,
} = require('./bookings');
const { validateCreativeDimensions } = require('./image-meta');
const { writeWebpSibling, webpSiblingPath } = require('./image-webp');
const { ensureUploadsDir, storeCreativeBuffer } = require('./upload-storage');
const sharp = require('sharp');

/**
 * Normalize any sane upload into the slot's frame: EXIF auto-rotate (phone
 * photos), center-crop to the slot aspect ratio, downscale to at most 2× the
 * slot dimensions (retina). Returns a PNG buffer. This is the server-side
 * guarantee behind the page's "it will be cropped to fit" promise; the
 * client-side normalizer is only a payload optimization.
 */
async function normalizeCreativeBuffer(buffer, slotWidth, slotHeight) {
  const targetW = Math.max(1, slotWidth * 2);
  const targetH = Math.max(1, slotHeight * 2);
  let img = sharp(buffer, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  if (!meta.width || !meta.height) throw new Error('Could not read image dimensions');
  const slotRatio = targetW / targetH;
  const imgRatio = meta.width / meta.height;
  if (Math.abs(slotRatio - imgRatio) / slotRatio > 0.005) {
    // Different aspect: cover-crop to the slot frame, centered.
    img = img.resize({ width: targetW, height: targetH, fit: 'cover', position: 'centre' });
  } else if (meta.width > targetW) {
    img = img.resize({ width: targetW, withoutEnlargement: true });
  }
  return img.png().toBuffer();
}

function parseBase64Image(image) {
  const match = image.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) return { error: 'Invalid image format. Must be base64 data URI.' };
  const mimeType = match[1];
  const buffer = Buffer.from(match[3], 'base64');
  // 4MB decoded cap: the upload surfaces normalize client-side (center-crop
  // to slot aspect, downscale to 2× slot dims), so anything past this is a
  // hand-rolled caller, not a sponsor — and Vercel's 4.5MB body limit caps
  // the wire size regardless.
  if (buffer.length > 4 * 1024 * 1024) {
    return { error: 'Image must be under 4MB' };
  }
  return { mimeType, buffer };
}

async function uploadBookingCreative(token, { image, filename }, { notifyAdminPending }) {
  if (!image || !filename) {
    return { status: 400, body: { error: 'image and filename required' } };
  }

  const booking = await getBookingByToken(token);
  if (!booking) return { status: 404, body: { error: 'Booking not found' } };

  // Credential matrix: the analytics token is a VIEW credential, shareable
  // with the sponsor's team — so it may only write while nothing is public:
  // the first creative (pending_upload, approved) and resubmission after a
  // rejection. Anything under review or live changes through the
  // session-authed advertiser panel, where the change is attributed to the
  // tenant account.
  if (!['pending_upload', 'approved', 'rejected'].includes(booking.status)) {
    return {
      status: 403,
      body: {
        error:
          booking.status === 'pending_approval' || booking.status === 'live'
            ? 'This placement is managed from the advertiser panel — sign in there to change your creative.'
            : `Cannot upload in status: ${booking.status}`,
      },
    };
  }

  const parsed = parseBase64Image(image);
  if (parsed.error) return { status: 400, body: { error: parsed.error } };

  // Server-side normalization: rotate, crop to the slot frame, cap at 2× —
  // any sane photo fits, exactly as the upload UI promises.
  let finalBuffer;
  try {
    finalBuffer = await normalizeCreativeBuffer(parsed.buffer, booking.width, booking.height);
  } catch (err) {
    return {
      status: 400,
      body: { error: `We could not process this image (${err.message}). Try a different file.` },
    };
  }

  const dimError = validateCreativeDimensions(finalBuffer, booking.width, booking.height);
  if (dimError) {
    return { status: 400, body: { error: dimError } };
  }

  const slotDir = ensureUploadsDir(String(booking.id));
  const safeName = `${Date.now()}.png`;
  const stored = await storeCreativeBuffer(String(booking.id), safeName, finalBuffer, 'image/png');
  // The WebP sibling is a local-file optimization; Blob serves the
  // normalized PNG directly from the CDN.
  const webpWritten = stored.url.startsWith('/uploads/')
    ? await writeWebpSibling(path.join(slotDir, safeName), finalBuffer)
    : false;

  const publicPath = stored.url;
  await saveCreative(booking.id, publicPath, filename);

  if (notifyAdminPending) {
    notifyAdminPending({
      slotName: booking.slot_name,
      companyName: booking.company_name,
      bookingId: booking.id,
      siteSlug: booking.site_slug,
    }).catch(() => {});
  }

  return {
    status: 200,
    body: {
      success: true,
      path: publicPath,
      webpPath: webpWritten ? webpSiblingPath(publicPath) : null,
    },
  };
}

async function uploadSlotCreative(token, slotId, { image, filename }) {
  if (!image || !filename) {
    return { status: 400, body: { error: 'image and filename required' } };
  }

  const booking = await getBookingByToken(token);
  if (!booking) return { status: 404, body: { error: 'Booking not found' } };

  const bundleSlot = await getSlotById(booking.slot_id);
  if (bundleSlot?.is_bundle !== 1) {
    return { status: 400, body: { error: 'Per-slot upload only available for bundle bookings' } };
  }

  if (!['pending_upload', 'approved', 'rejected'].includes(booking.status)) {
    return {
      status: 403,
      body: {
        error:
          booking.status === 'pending_approval' || booking.status === 'live'
            ? 'This placement is managed from the advertiser panel — sign in there to change your creative.'
            : `Cannot upload in status: ${booking.status}`,
      },
    };
  }

  const members = await getBundleMembers(booking.slot_id);
  if (!members.includes(slotId)) {
    return { status: 400, body: { error: 'Invalid slot for this bundle' } };
  }

  const parsed = parseBase64Image(image);
  if (parsed.error) return { status: 400, body: { error: parsed.error } };

  const memberSlot = await getSlotById(slotId);
  if (!memberSlot) return { status: 404, body: { error: 'Slot not found' } };

  let finalBuffer;
  try {
    finalBuffer = await normalizeCreativeBuffer(parsed.buffer, memberSlot.width, memberSlot.height);
  } catch (err) {
    return {
      status: 400,
      body: { error: `We could not process this image (${err.message}). Try a different file.` },
    };
  }

  const dimError = validateCreativeDimensions(finalBuffer, memberSlot.width, memberSlot.height);
  if (dimError) {
    return { status: 400, body: { error: dimError } };
  }

  const slotSubdir = `${booking.id}/${slotId}`;
  const slotDir = ensureUploadsDir(slotSubdir);
  const safeName = `${Date.now()}.png`;
  const stored = await storeCreativeBuffer(slotSubdir, safeName, finalBuffer, 'image/png');
  const webpWritten = stored.url.startsWith('/uploads/')
    ? await writeWebpSibling(path.join(slotDir, safeName), finalBuffer)
    : false;

  const publicPath = stored.url;
  await saveSlotCreative(booking.id, slotId, publicPath, filename);

  return {
    status: 200,
    body: {
      success: true,
      path: publicPath,
      webpPath: webpWritten ? webpSiblingPath(publicPath) : null,
    },
  };
}

module.exports = {
  uploadBookingCreative,
  uploadSlotCreative,
  normalizeCreativeBuffer,
};
