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

const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function parseBase64Image(image) {
  const match = image.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) return { error: 'Invalid image format. Must be base64 data URI.' };
  const mimeType = match[1];
  const buffer = Buffer.from(match[3], 'base64');
  if (buffer.length > 2 * 1024 * 1024) {
    return { error: 'Image must be under 2MB' };
  }
  return { mimeType, buffer };
}

async function uploadBookingCreative(token, { image, filename }, { notifyAdminPending }) {
  if (!image || !filename) {
    return { status: 400, body: { error: 'image and filename required' } };
  }

  const booking = await getBookingByToken(token);
  if (!booking) return { status: 404, body: { error: 'Booking not found' } };

  // Allow upload during initial setup, after rejection, or when updating a live placement.
  if (!['pending_upload', 'rejected', 'approved', 'live'].includes(booking.status)) {
    return { status: 400, body: { error: `Cannot upload in status: ${booking.status}` } };
  }

  const parsed = parseBase64Image(image);
  if (parsed.error) return { status: 400, body: { error: parsed.error } };

  const dimError = validateCreativeDimensions(parsed.buffer, booking.width, booking.height);
  if (dimError) {
    return { status: 400, body: { error: dimError } };
  }

  ensureUploadsDir();
  const ext = parsed.mimeType.split('/')[1];
  const safeName = `${Date.now()}.${ext}`;
  const slotDir = path.join(UPLOADS_DIR, String(booking.id));
  if (!fs.existsSync(slotDir)) fs.mkdirSync(slotDir, { recursive: true });
  const filePath = path.join(slotDir, safeName);
  fs.writeFileSync(filePath, parsed.buffer);
  const webpWritten = await writeWebpSibling(filePath, parsed.buffer);

  const publicPath = `/uploads/${booking.id}/${safeName}`;
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
  if (!bundleSlot || bundleSlot.is_bundle !== 1) {
    return { status: 400, body: { error: 'Per-slot upload only available for bundle bookings' } };
  }

  if (!['pending_upload', 'rejected', 'approved', 'live'].includes(booking.status)) {
    return { status: 400, body: { error: `Cannot upload in status: ${booking.status}` } };
  }

  const members = await getBundleMembers(booking.slot_id);
  if (!members.includes(slotId)) {
    return { status: 400, body: { error: 'Invalid slot for this bundle' } };
  }

  const parsed = parseBase64Image(image);
  if (parsed.error) return { status: 400, body: { error: parsed.error } };

  const memberSlot = await getSlotById(slotId);
  if (!memberSlot) return { status: 404, body: { error: 'Slot not found' } };

  const dimError = validateCreativeDimensions(parsed.buffer, memberSlot.width, memberSlot.height);
  if (dimError) {
    return { status: 400, body: { error: dimError } };
  }

  ensureUploadsDir();
  const ext = parsed.mimeType.split('/')[1];
  const safeName = `${Date.now()}.${ext}`;
  const slotDir = path.join(UPLOADS_DIR, String(booking.id), String(slotId));
  if (!fs.existsSync(slotDir)) fs.mkdirSync(slotDir, { recursive: true });
  const filePath = path.join(slotDir, safeName);
  fs.writeFileSync(filePath, parsed.buffer);
  const webpWritten = await writeWebpSibling(filePath, parsed.buffer);

  const publicPath = `/uploads/${booking.id}/${slotId}/${safeName}`;
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
};
