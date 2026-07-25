/**
 * PuniCodex — Membership automation service.
 *
 * Weekly analytics digests (sponsors + patrons), patron expiry reminders,
 * patron self-service cancellation, and the admin alert channel. Every
 * automated email is recorded in digest_log (platform/db/migrate-digest.js);
 * services check the (kind, target, detail) triple before sending, so re-runs
 * and overlapping cron invocations stay idempotent. Per-recipient failures
 * are isolated: one bad email never blocks the rest of the batch.
 *
 * Cancellation semantics: patron cancellation mirrors the booking END flow
 * (admin-booking-service.js#endBookingAdmin) and the existing Stripe
 * subscription.deleted webhook (patron-service.cancelPatronBySubscriptionId):
 * the Stripe subscription is cancelled immediately and the patron row flips
 * to 'cancelled' with ends_at = now. The booking self-service uncancel parity
 * deliberately does NOT transfer: booking cancel is a reversible flag
 * (cancel_at_end) with no Stripe side effect, while a cancelled Stripe
 * subscription cannot be revived — a DB-only "uncancel" would produce an
 * active patron with no billing. Rejoining means a new checkout on the
 * temple page.
 */

const { get, all, run } = require('../db/operational');
const { getDb } = require('../db/connection');
const { migrate: migrateDigest } = require('../db/migrate-digest');
const email = require('./email');
const patronService = require('./patron-service');

// Cold-start schema: idempotent, once per serverless instance (mirrors
// tenant-portal's ensureSchema).
let schemaReady = false;
function ensureSchema() {
  if (schemaReady) return;
  migrateDigest(getDb());
  schemaReady = true;
}

// ─────────────────────────────────────────────────────────────
// Dedup log
// ─────────────────────────────────────────────────────────────

async function hasDigestEntry(kind, target, detail) {
  const row = await get(
    'SELECT id FROM digest_log WHERE kind = $1 AND target = $2 AND detail = $3 LIMIT 1',
    [kind, target, detail]
  );
  return Boolean(row);
}

async function recordDigestEntry(kind, target, detail, sentAt) {
  await run(
    `INSERT INTO digest_log (kind, target, detail, sent_at) VALUES ($1, $2, $3, $4)
     ON CONFLICT(kind, target, detail, sent_at) DO NOTHING`,
    [kind, target, detail, sentAt]
  );
}

// ─────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────

function dayString(date) {
  return date.toISOString().slice(0, 10);
}

/** ISO-8601 week label, e.g. "2026-W30" — the weekly-digest dedup detail. */
function isoWeekString(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Monday = 1 … Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thursday anchors the ISO week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** "1m 24s" style attention label for the digest emails. */
function formatVisibleMs(ms) {
  const total = Math.round((Number(ms) || 0) / 1000);
  if (total <= 0) return '0s';
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? `${minutes}m ${String(seconds).padStart(2, '0')}s` : `${seconds}s`;
}

/** Weekly slot totals from getBookingEventStats' daily series. */
function summarizeSlotWeek(stats, nowDate) {
  const cutoff = dayString(new Date(nowDate.getTime() - 6 * 86400000));
  const weekDays = (stats?.daily || []).filter((d) => d.day >= cutoff);
  const impressions = weekDays.reduce((sum, d) => sum + (Number(d.impressions) || 0), 0);
  const clicks = weekDays.reduce((sum, d) => sum + (Number(d.clicks) || 0), 0);
  return {
    impressions,
    clicks,
    ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00',
    // Viewability is only tracked as an all-time aggregate, not per day.
    viewabilityPct: stats?.viewabilityPct ?? '0.0',
  };
}

function templeBlock(templeAnalytics) {
  if (!templeAnalytics?.totals) return null;
  return {
    views: templeAnalytics.totals.views || 0,
    uniqueSessions: templeAnalytics.totals.uniqueSessions || 0,
    avgVisibleLabel: formatVisibleMs(templeAnalytics.totals.avgVisibleMs),
    countries: (templeAnalytics.countries || []).slice(0, 3),
  };
}

// ─────────────────────────────────────────────────────────────
// Weekly digest
// ─────────────────────────────────────────────────────────────

async function listLiveBookings() {
  return all(
    `SELECT b.id, b.email, b.company_name, b.site_slug, b.analytics_token,
            s.name AS slot_name
       FROM bookings b
       JOIN ad_slots s ON b.slot_id = s.id
      WHERE b.status = 'live' AND b.email <> ''`,
    []
  );
}

async function listActivePatrons() {
  return all(
    `SELECT id, email, temple_id, display_name
       FROM patrons
      WHERE status = 'active' AND email <> ''`,
    []
  );
}

async function buildPulse() {
  const { getTrending } = require('./site-analytics');
  const trending = await getTrending({ days: 7, limit: 5 });
  return (trending.temples || []).slice(0, 5).map((t) => ({
    templeId: t.templeId,
    name: email.getSiteDisplayName(t.templeId),
    views: t.views,
  }));
}

/**
 * Send the weekly analytics digest to every live sponsor and active patron.
 * One email per recipient per ISO week (digest_log kind='weekly-digest',
 * target=booking:{id}|patron:{id}, detail=ISO week string).
 */
async function sendWeeklyDigest({ now } = {}) {
  ensureSchema();
  const nowDate = now ? new Date(now) : new Date();
  const week = isoWeekString(nowDate);
  const { getTempleAnalytics } = require('./site-analytics');
  const { getBookingEventStats } = require('./tenant-portal');

  // The site pulse is shared by every digest; if it fails the emails still
  // go out without that section.
  let pulse = [];
  try {
    pulse = await buildPulse();
  } catch (err) {
    console.error('[digest] site pulse unavailable:', err.message);
  }

  // Temple analytics are shared across recipients on the same temple.
  const templeCache = new Map();
  async function templeBlockFor(templeId) {
    if (!templeCache.has(templeId)) {
      try {
        templeCache.set(templeId, templeBlock(await getTempleAnalytics(templeId, { days: 7 })));
      } catch (err) {
        console.error(`[digest] temple analytics failed for ${templeId}:`, err.message);
        templeCache.set(templeId, null);
      }
    }
    return templeCache.get(templeId);
  }

  const result = { sent: 0, skipped: 0, failed: 0 };

  for (const booking of await listLiveBookings()) {
    const target = `booking:${booking.id}`;
    try {
      if (await hasDigestEntry('weekly-digest', target, week)) {
        result.skipped++;
        continue;
      }
      const stats = await getBookingEventStats(booking.id);
      await email.notifyWeeklyDigestSponsor({
        email: booking.email,
        companyName: booking.company_name,
        siteSlug: booking.site_slug,
        slotName: booking.slot_name,
        bookingToken: booking.analytics_token,
        weekLabel: week,
        slot: summarizeSlotWeek(stats, nowDate),
        temple: await templeBlockFor(booking.site_slug),
        pulse,
      });
      await recordDigestEntry('weekly-digest', target, week, nowDate.toISOString());
      result.sent++;
    } catch (err) {
      console.error(`[digest] weekly digest failed for booking ${booking.id}:`, err.message);
      result.failed++;
    }
  }

  for (const patron of await listActivePatrons()) {
    const target = `patron:${patron.id}`;
    try {
      if (await hasDigestEntry('weekly-digest', target, week)) {
        result.skipped++;
        continue;
      }
      await email.notifyWeeklyDigestPatron({
        email: patron.email,
        displayName: patron.display_name,
        siteSlug: patron.temple_id,
        weekLabel: week,
        temple: await templeBlockFor(patron.temple_id),
        pulse,
      });
      await recordDigestEntry('weekly-digest', target, week, nowDate.toISOString());
      result.sent++;
    } catch (err) {
      console.error(`[digest] weekly digest failed for patron ${patron.id}:`, err.message);
      result.failed++;
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// Patron expiry reminders
// ─────────────────────────────────────────────────────────────

/**
 * Remind active patrons whose membership ends within the next 7 days.
 * Patrons without an ends_at (the common case — monthly renewals) are
 * skipped. One reminder per patron per ends_at date (digest_log
 * kind='patron-expiry', target=patron:{id}, detail=ends_at date).
 */
async function sendExpiryReminders({ now } = {}) {
  ensureSchema();
  const nowDate = now ? new Date(now) : new Date();
  const result = { sent: 0, skipped: 0, failed: 0 };

  const patrons = await all(
    `SELECT id, email, temple_id, display_name, ends_at
       FROM patrons
      WHERE status = 'active' AND ends_at IS NOT NULL AND email <> ''`,
    []
  );

  for (const patron of patrons) {
    const target = `patron:${patron.id}`;
    try {
      const endsAt = new Date(patron.ends_at);
      if (Number.isNaN(endsAt.getTime())) continue;
      const daysLeft = Math.ceil((endsAt.getTime() - nowDate.getTime()) / 86400000);
      if (daysLeft < 0 || daysLeft > 7) continue;
      const detail = String(patron.ends_at).slice(0, 10);
      if (await hasDigestEntry('patron-expiry', target, detail)) {
        result.skipped++;
        continue;
      }
      await email.notifyPatronExpiryReminder({
        email: patron.email,
        displayName: patron.display_name,
        siteSlug: patron.temple_id,
        endsAt: patron.ends_at,
        daysLeft,
      });
      await recordDigestEntry('patron-expiry', target, detail, nowDate.toISOString());
      result.sent++;
    } catch (err) {
      console.error(`[digest] expiry reminder failed for patron ${patron.id}:`, err.message);
      result.failed++;
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// Patron self-service cancellation
// ─────────────────────────────────────────────────────────────

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

// Mirror of platform/api/stripe.js#getStripe, which is module-private there.
// Constructing the client the same way keeps the Stripe call identical to
// the booking end flow (admin-booking-service.js#endBookingAdmin).
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }
  return require('stripe')(key);
}

/**
 * Cancel a patron membership on behalf of its owner. Ownership is the
 * patron row's contact email matching the authenticated account email —
 * the same linkage rule as tenant-portal. Effective immediately: the Stripe
 * subscription is cancelled (a Stripe failure never blocks the local
 * cancellation, mirroring the booking end flow) and the row flips to
 * 'cancelled'.
 */
async function cancelPatron({ patronId, email: accountEmail }) {
  ensureSchema();
  const id = Number.parseInt(patronId, 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw Object.assign(new Error('Invalid patron id'), { status: 400 });
  }
  const patron = await get('SELECT * FROM patrons WHERE id = $1', [id]);
  if (!patron) {
    throw Object.assign(new Error('Patron not found'), { status: 404 });
  }
  if (normalizeEmail(patron.email) !== normalizeEmail(accountEmail)) {
    throw Object.assign(new Error('You do not own this patron membership'), {
      status: 403,
      code: 'not_owner',
    });
  }
  if (patron.status !== 'active') {
    throw Object.assign(new Error(`Cannot cancel in status: ${patron.status}`), { status: 400 });
  }

  if (patron.stripe_subscription_id) {
    try {
      await getStripe().subscriptions.cancel(patron.stripe_subscription_id);
    } catch (stripeErr) {
      console.error('Stripe cancel error:', stripeErr.message);
    }
  }

  await patronService.setPatronStatus(id, 'cancelled');
  await email
    .notifyPatronCancelled({
      email: patron.email,
      displayName: patron.display_name,
      siteSlug: patron.temple_id,
    })
    .catch(() => {});
  return { ok: true, status: 'cancelled' };
}

// ─────────────────────────────────────────────────────────────
// Admin alerts
// ─────────────────────────────────────────────────────────────

/**
 * Fire an operational alert to the admin inbox. No dedup here — callers own
 * their dedup semantics (spike alerts use digest_log kind='spike').
 */
async function sendAdminAlert({ kind, subject, html }) {
  const to = process.env.ADMIN_EMAIL || 'punicodex@gmail.com';
  console.log(`[digest] admin alert (${kind}): ${subject}`);
  return email.sendEmail({ to, subject, html });
}

/** Admin alert for a completed patron signup (Stripe webhook activation). */
async function alertPatronSignup(patron) {
  const templeName = email.getSiteDisplayName(patron.temple_id);
  const amount = `$${((Number(patron.amount_cents) || 0) / 100).toFixed(2)}/mo`;
  return sendAdminAlert({
    kind: 'patron-signup',
    subject: `New patron — ${templeName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="color:#d4af37;">PuniCodex — New Patron</h2>
        <p><strong>${email.escapeHtml(patron.display_name)}</strong> became a patron of the <strong>${email.escapeHtml(templeName)}</strong> temple.</p>
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;margin:1rem 0;">
          <tr><td style="padding:6px;color:#666;">Temple</td><td style="padding:6px;text-align:right;font-weight:600;">${email.escapeHtml(templeName)}</td></tr>
          <tr><td style="padding:6px;color:#666;">Amount</td><td style="padding:6px;text-align:right;font-weight:600;">${email.escapeHtml(amount)}</td></tr>
          <tr><td style="padding:6px;color:#666;">Email</td><td style="padding:6px;text-align:right;font-weight:600;">${email.escapeHtml(patron.email)}</td></tr>
        </table>
      </div>
    `,
  });
}

module.exports = {
  sendWeeklyDigest,
  sendExpiryReminders,
  cancelPatron,
  sendAdminAlert,
  alertPatronSignup,
  hasDigestEntry,
  recordDigestEntry,
  isoWeekString,
  formatVisibleMs,
};
