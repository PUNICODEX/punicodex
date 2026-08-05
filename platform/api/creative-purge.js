/**
 * Creative storage lifecycle — purges for ended and abandoned placements.
 *
 * What happens to a creative when a sponsorship lapses, is revoked, or is
 * never paid for: the slot stops displaying it the moment the booking ends
 * (ad_slots.current_booking_id is cleared), and this module deletes the
 * stored file after a grace period — 30 days, so a sponsor who re-leases
 * quickly keeps their asset. Files on Vercel Blob are deleted via the SDK;
 * local /tmp or dev files are unlinked. The booking row keeps its audit
 * fields; only the creative references are cleared.
 *
 * Runs from the daily lease-expiry cron. Never throws at the caller: a
 * storage hiccup must not block lease expiry.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { all, run } = require('../db/operational');
const { blobEnabled, uploadsRoot } = require('./upload-storage');

const GRACE_DAYS = 30;

async function deleteStoredCreative(publicPath) {
  if (!publicPath) return;
  try {
    if (/^https?:\/\//.test(publicPath)) {
      if (!blobEnabled()) return; // cannot delete without the token; leave it
      const { del } = require('@vercel/blob');
      await del(publicPath);
      return;
    }
    if (!publicPath.startsWith('/uploads/')) return;
    const abs = path.join(uploadsRoot(), publicPath.slice('/uploads/'.length));
    fs.rmSync(abs, { force: true });
    // The local webp sibling goes too.
    fs.rmSync(abs.replace(/\.(png|jpe?g)$/i, '.webp'), { force: true });
  } catch (err) {
    console.error(`[creative-purge] delete failed for ${publicPath}:`, err.message);
  }
}

/** JS-computed cutoff — the operational layer translates placeholders only,
 *  so no INTERVAL/datetime() dialect code belongs in the SQL. */
function cutoffIso(days) {
  return new Date(Date.now() - days * 86400000).toISOString().replace('T', ' ').slice(0, 19);
}

/** Delete creatives for bookings ended/canceled beyond the grace period. */
async function purgeEndedCreatives({ graceDays = GRACE_DAYS } = {}) {
  const rows = await all(
    `SELECT id, creative_path FROM bookings
     WHERE status IN ('ended', 'canceled') AND creative_path IS NOT NULL
       AND updated_at <= $1`,
    [cutoffIso(graceDays)]
  );
  let purged = 0;
  for (const b of rows) {
    // Bundle members carry per-slot creatives.
    const slotRows = await all('SELECT creative_path FROM slot_creatives WHERE booking_id = $1', [
      b.id,
    ]);
    for (const s of slotRows) await deleteStoredCreative(s.creative_path);
    await deleteStoredCreative(b.creative_path);
    await run('DELETE FROM slot_creatives WHERE booking_id = $1', [b.id]);
    await run(
      'UPDATE bookings SET creative_path = NULL, creative_original_name = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [b.id]
    );
    purged++;
  }
  return { purged };
}

/** Delete staged images for decided/abandoned tenant change requests. */
async function purgeStaleRequestImages({ olderThanDays = GRACE_DAYS } = {}) {
  const rows = await all(
    `SELECT id, payload FROM tenant_change_requests
     WHERE status IN ('approved', 'rejected')
       AND created_at <= $1`,
    [cutoffIso(olderThanDays)]
  );
  let purged = 0;
  for (const r of rows) {
    let payload = null;
    try {
      payload = r.payload ? JSON.parse(r.payload) : null;
    } catch {
      payload = null;
    }
    if (!payload?.creativePath) continue;
    await deleteStoredCreative(payload.creativePath);
    await run(
      `UPDATE tenant_change_requests SET payload = REPLACE(payload, $1, 'purged') WHERE id = $2`,
      [payload.creativePath, r.id]
    );
    purged++;
  }
  return { purged };
}

async function runCreativePurge() {
  const ended = await purgeEndedCreatives();
  const requests = await purgeStaleRequestImages();
  return { endedCreativesPurged: ended.purged, requestImagesPurged: requests.purged };
}

module.exports = {
  runCreativePurge,
  purgeEndedCreatives,
  purgeStaleRequestImages,
  deleteStoredCreative,
};
