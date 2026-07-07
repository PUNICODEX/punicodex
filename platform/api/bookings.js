const crypto = require('node:crypto');
const { insert, get, all, run, transaction } = require('../db/operational');
const { getDb } = require('../db/connection');
const { extractAndSave } = require('./keyword-extractor');

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

// Per-process serialization for slot-mutating operations. Serverless processes are
// single-request-per-function on Vercel, so this prevents intra-process races; the
// database partial unique index is the cross-process backstop.
const slotLocks = new Map();

function withSlotLock(slotId, fn) {
  const next = (slotLocks.get(slotId) || Promise.resolve()).catch(() => {});
  const run = next.then(fn);
  slotLocks.set(
    slotId,
    run.catch(() => {})
  );
  return run;
}

const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scrape/i,
  /slurp/i,
  /facebookexternalhit/i,
  /whatsapp/i,
  /linkedinbot/i,
  /pingdom/i,
  /gtmetrix/i,
  /chrome-lighthouse/i,
  /googlebot/i,
  /bingbot/i,
  /yandex/i,
  /baiduspider/i,
  /duckduckbot/i,
  /ahrefs/i,
  /semrush/i,
];

function isBot(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') return false;
  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

class BookingConflictError extends Error {
  constructor(message) {
    super(message);
    this.status = 409;
    this.isBookingConflict = true;
  }
}

function isUniqueViolation(err) {
  if (!err) return false;
  // SQLite
  if (err.message?.includes('UNIQUE constraint failed')) return true;
  // Postgres
  if (err.code === '23505') return true;
  return false;
}

// ─── Ad Slots ───

async function getSlots(siteSlug = null) {
  let query = `
    SELECT s.*,
      b.status as booking_status, b.analytics_token, b.company_name, b.website_url, b.id as booking_id,
      COALESCE(sc.creative_path, b.creative_path) as creative_path,
      COALESCE(sc.custom_heading, b.custom_heading) as custom_heading,
      COALESCE(sc.custom_subtitle, b.custom_subtitle) as custom_subtitle,
      COALESCE(sc.website_url, b.website_url) as website_url,
      CASE WHEN sc.creative_path IS NOT NULL THEN 1 ELSE 0 END as has_slot_creative
    FROM ad_slots s
    LEFT JOIN bookings b ON s.current_booking_id = b.id
    LEFT JOIN slot_creatives sc ON b.id = sc.booking_id AND s.id = sc.slot_id
  `;
  const params = [];
  if (siteSlug) {
    query += ` WHERE s.site_slug = $${params.length + 1}`;
    params.push(siteSlug);
  }
  query += ` ORDER BY s.sort_order`;
  return all(query, params);
}

async function isBundleSlot(slotId) {
  const row = await get('SELECT is_bundle FROM ad_slots WHERE id = $1', [slotId]);
  return row ? row.is_bundle === 1 : false;
}

async function getBundleMembers(bundleSlotId) {
  const rows = await all('SELECT member_slot_id FROM bundle_members WHERE bundle_slot_id = $1', [
    bundleSlotId,
  ]);
  return rows.map((r) => r.member_slot_id);
}

async function getSlotBySlug(slug, siteSlug = null) {
  let query = `
    SELECT s.*, b.status as booking_status, b.analytics_token, b.company_name, b.website_url
    FROM ad_slots s
    LEFT JOIN bookings b ON s.current_booking_id = b.id
    WHERE s.slug = $1
  `;
  const params = [slug];
  if (siteSlug) {
    query += ` AND s.site_slug = $${params.length + 1}`;
    params.push(siteSlug);
  }
  return get(query, params);
}

async function getSlotById(id) {
  return get('SELECT * FROM ad_slots WHERE id = $1', [id]);
}

// ─── Bookings ───

async function createBooking({
  slotId,
  email,
  companyName,
  websiteUrl,
  customHeading,
  customSubtitle,
  leaseMonths = 1,
  trialMonths = 0,
  siteSlug = null,
  status = 'pending_payment',
  applicationNote = null,
}) {
  return withSlotLock(slotId, async () => {
    const token = generateToken();
    let result;

    try {
      await transaction(async ({ get, all, run, insert }) => {
        const slot = await get('SELECT * FROM ad_slots WHERE id = $1', [slotId]);
        if (!slot) throw Object.assign(new Error('Slot not found'), { status: 404 });
        if (slot.status !== 'available') {
          throw new BookingConflictError('Slot is not available');
        }

        const bookingId = await insert(
          `
              INSERT INTO bookings (slot_id, email, company_name, website_url, custom_heading, custom_subtitle, status, analytics_token, lease_months, trial_months, site_slug, admin_note)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              RETURNING id
            `,
          [
            slotId,
            email,
            companyName || null,
            websiteUrl || null,
            customHeading || null,
            customSubtitle || null,
            status,
            token,
            leaseMonths,
            trialMonths,
            siteSlug || 'nike',
            applicationNote || null,
          ]
        );

        result = { id: bookingId, token };

        const reserveSql = `
            UPDATE ad_slots
            SET status = 'reserved', current_booking_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND status = 'available'
          `;

        if (slot.is_bundle === 1) {
          const memberRows = await all(
            'SELECT member_slot_id FROM bundle_members WHERE bundle_slot_id = $1',
            [slotId]
          );
          const members = memberRows.map((r) => r.member_slot_id);
          for (const memberId of members) {
            const member = await get('SELECT status FROM ad_slots WHERE id = $1', [memberId]);
            if (member?.status !== 'available') {
              throw new BookingConflictError('Bundle member slot is no longer available');
            }
            const reserveResult = await run(reserveSql, [bookingId, memberId]);
            if (reserveResult.changes === 0) {
              throw new BookingConflictError('Bundle member slot is no longer available');
            }
          }
        }

        const reserveResult = await run(reserveSql, [bookingId, slotId]);
        if (reserveResult.changes === 0) {
          throw new BookingConflictError('Slot is no longer available');
        }
      });
    } catch (err) {
      if (err.isBookingConflict) throw err;
      if (isUniqueViolation(err)) {
        throw new BookingConflictError('Slot is no longer available');
      }
      throw err;
    }

    return result;
  });
}

async function getBookingByToken(token) {
  return get(
    `
      SELECT b.*, s.name as slot_name, s.slug as slot_slug, s.width, s.height, s.price_cents
      FROM bookings b
      JOIN ad_slots s ON b.slot_id = s.id
      WHERE b.analytics_token = $1
    `,
    [token]
  );
}

async function getBookingById(id) {
  return get(
    `
      SELECT b.*, s.name as slot_name, s.slug as slot_slug
      FROM bookings b
      JOIN ad_slots s ON b.slot_id = s.id
      WHERE b.id = $1
    `,
    [id]
  );
}

async function getBookingByStripeSession(sessionId) {
  return get('SELECT * FROM bookings WHERE stripe_session_id = $1', [sessionId]);
}

async function updateBookingStripeSession(bookingId, sessionId) {
  await run('UPDATE bookings SET stripe_session_id = $1, status = $2 WHERE id = $3', [
    sessionId,
    'pending_payment',
    bookingId,
  ]);
}

async function markBookingPaid(sessionId, paymentIntent, amountCents, subscriptionId = null) {
  const existing = await getBookingByStripeSession(sessionId);
  if (existing && !['pending_payment', 'pending_application'].includes(existing.status)) {
    return existing;
  }
  await run(
    `
      UPDATE bookings
      SET stripe_payment_intent = $1, amount_paid_cents = $2, stripe_subscription_id = $3, status = 'pending_upload', updated_at = CURRENT_TIMESTAMP
      WHERE stripe_session_id = $4
    `,
    [paymentIntent, amountCents, subscriptionId || null, sessionId]
  );
  return getBookingByStripeSession(sessionId);
}

async function saveCreative(bookingId, filePath, originalName) {
  await run(
    `
      UPDATE bookings
      SET creative_path = $1, creative_original_name = $2, status = 'pending_approval', updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `,
    [filePath, originalName, bookingId]
  );
}

async function setBookingStatus(bookingId, status, note = null) {
  const updates = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
  const params = [status];
  if (note !== null) {
    updates.push(`admin_note = $${params.length + 1}`);
    params.push(note);
  }
  params.push(bookingId);
  await run(`UPDATE bookings SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

async function goLive(bookingId) {
  const booking = await getBookingById(bookingId);
  if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });
  if (booking.status !== 'approved') {
    throw new BookingConflictError('Booking must be approved before going live');
  }

  const slot = await getSlotById(booking.slot_id);
  if (!slot) throw Object.assign(new Error('Slot not found'), { status: 404 });
  if (slot.status === 'live' && slot.current_booking_id !== bookingId) {
    throw new BookingConflictError('Slot is already live with another booking');
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const months = booking.lease_months || 1;
  const trialMonths = booking.trial_months || 0;
  const trialEnds = trialMonths > 0 ? addMonths(now, trialMonths) : now;
  const trialEndsIso = trialEnds.toISOString();
  const billingStartsIso = trialMonths > 0 ? trialEndsIso : nowIso;
  const ends = addMonths(now, months);
  const endsIso = ends.toISOString();

  const billingStatus = trialMonths > 0 ? 'trialing' : 'active';

  const liveBooking = await withSlotLock(booking.slot_id, async () => {
    await transaction(async ({ all, run }) => {
      const bookingUpdate = await run(
        `
            UPDATE bookings
            SET status = 'live', started_at = $1, ends_at = $2, trial_ends_at = $3, billing_starts_at = $4, billing_status = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $6 AND status = 'approved'
          `,
        [nowIso, endsIso, trialEndsIso, billingStartsIso, billingStatus, bookingId]
      );
      if (bookingUpdate.changes === 0) {
        throw new BookingConflictError('Booking is no longer approved');
      }

      // Set bundle slot live
      await run(
        `UPDATE ad_slots SET status = 'live', current_booking_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [bookingId, booking.slot_id]
      );

      // Cascade to all member slots
      if (slot.is_bundle === 1) {
        const memberRows = await all(
          'SELECT member_slot_id FROM bundle_members WHERE bundle_slot_id = $1',
          [booking.slot_id]
        );
        const members = memberRows.map((r) => r.member_slot_id);
        const cascadeSql = `UPDATE ad_slots SET status = 'live', current_booking_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
        for (const memberId of members) {
          await run(cascadeSql, [bookingId, memberId]);
        }
      }
    });

    return getBookingById(bookingId);
  });

  // Push tenant details to indexed_sites so the search engine can crawl
  // their real website and extract SEO keywords.
  if (booking.website_url && slot.site_slug) {
    const sqlite = getDb();
    sqlite
      .prepare(
        `
          UPDATE indexed_sites
          SET tenant_name = COALESCE(tenant_name, ?),
              tenant_front_url = COALESCE(tenant_front_url, ?),
              tenant_category = COALESCE(tenant_category, ?),
              lease_status = 'leased'
          WHERE lexicon_entry_id = ? AND status = 'active'
        `
      )
      .run(
        booking.company_name || null,
        booking.website_url,
        booking.custom_heading || booking.company_name || null,
        slot.site_slug
      );

    // Crawl the tenant's real site and extract keywords immediately.
    try {
      const site = sqlite
        .prepare(
          `
            SELECT * FROM indexed_sites
            WHERE lexicon_entry_id = ? AND status = 'active'
            ORDER BY is_flagship DESC, id ASC
            LIMIT 1
          `
        )
        .get(slot.site_slug);
      if (site) {
        await extractAndSave(site);
        return liveBooking;
      }
    } catch (err) {
      console.error(`Keyword extraction failed for booking ${bookingId}:`, err.message);
    }
  }

  return liveBooking;
}

async function setBillingStatus(bookingId, status) {
  await run(
    `UPDATE bookings SET billing_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [status, bookingId]
  );
}

async function recordTrialReminder(bookingId, type) {
  const col = type === '7d' ? 'reminder_7d_sent' : 'reminder_1d_sent';
  await run(`UPDATE bookings SET ${col} = 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [
    bookingId,
  ]);
}

async function getTrialsNeedingReminder() {
  return all(
    `
      SELECT b.*, s.name as slot_name, s.slug as slot_slug
      FROM bookings b
      JOIN ad_slots s ON b.slot_id = s.id
      WHERE b.status = 'live'
        AND b.trial_months > 0
        AND b.trial_ends_at IS NOT NULL
        AND b.billing_status = 'trialing'
    `
  );
}

async function setCancelAtEnd(bookingId, cancel) {
  if (cancel) {
    await run(
      `UPDATE bookings SET cancel_at_end = 1, canceled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [bookingId]
    );
  } else {
    await run(
      `UPDATE bookings SET cancel_at_end = 0, canceled_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [bookingId]
    );
  }
}

async function extendBooking(bookingId, extensionMonths, amountCents) {
  const booking = await getBookingById(bookingId);
  if (!booking) return null;
  const currentEnds = booking.ends_at ? new Date(booking.ends_at) : new Date();
  const newEnds = addMonths(currentEnds, extensionMonths).toISOString();
  await run(
    `
      UPDATE bookings
      SET ends_at = $1, lease_months = lease_months + $2, amount_paid_cents = COALESCE(amount_paid_cents, 0) + $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `,
    [newEnds, extensionMonths, amountCents, bookingId]
  );
  return getBookingById(bookingId);
}

async function endBooking(bookingId) {
  const booking = await getBookingById(bookingId);
  await run(
    `UPDATE bookings SET status = 'ended', billing_status = 'canceled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [bookingId]
  );
  // Free bundle slot
  await run(
    `UPDATE ad_slots SET status = 'available', current_booking_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [booking.slot_id]
  );
  // Cascade to all member slots
  if (await isBundleSlot(booking.slot_id)) {
    const members = await getBundleMembers(booking.slot_id);
    const cascadeSql = `UPDATE ad_slots SET status = 'available', current_booking_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`;
    for (const memberId of members) {
      await run(cascadeSql, [memberId]);
    }
  }
  // Clear tenant metadata and reset lease status on the associated indexed site.
  if (booking?.site_slug) {
    const sqlite = getDb();
    sqlite
      .prepare(
        `
          UPDATE indexed_sites
          SET tenant_name = NULL,
              tenant_category = NULL,
              tenant_front_url = NULL,
              lease_status = 'available',
              archetype_score = 0.0,
              archetype_signals = NULL
          WHERE lexicon_entry_id = ? AND status = 'active'
        `
      )
      .run(booking.site_slug);
  }
}

async function getBookingsByEmail(email, siteSlug = null) {
  let query = `
    SELECT b.*, s.name as slot_name, s.slug as slot_slug, s.is_bundle
    FROM bookings b
    JOIN ad_slots s ON b.slot_id = s.id
    WHERE b.email = $1
  `;
  const params = [email];
  if (siteSlug) {
    query += ` AND b.site_slug = $${params.length + 1}`;
    params.push(siteSlug);
  }
  query += ` ORDER BY b.created_at DESC`;
  return all(query, params);
}

// ─── Slot Creatives (for bundle bookings) ───

async function getSlotCreative(bookingId, slotId) {
  const row = await get('SELECT * FROM slot_creatives WHERE booking_id = $1 AND slot_id = $2', [
    bookingId,
    slotId,
  ]);
  return row || null;
}

async function getSlotCreatives(bookingId) {
  return all(
    `
      SELECT sc.*, s.name as slot_name, s.width, s.height, s.slug as slot_slug
      FROM slot_creatives sc
      JOIN ad_slots s ON sc.slot_id = s.id
      WHERE sc.booking_id = $1
    `,
    [bookingId]
  );
}

async function saveSlotCreative(bookingId, slotId, filePath, originalName) {
  const existing = await getSlotCreative(bookingId, slotId);
  if (existing) {
    await run(
      `UPDATE slot_creatives SET creative_path = $1, creative_original_name = $2 WHERE booking_id = $3 AND slot_id = $4`,
      [filePath, originalName, bookingId, slotId]
    );
  } else {
    await insert(
      `INSERT INTO slot_creatives (booking_id, slot_id, creative_path, creative_original_name) VALUES ($1, $2, $3, $4) RETURNING id`,
      [bookingId, slotId, filePath, originalName]
    );
  }
  // A new or updated slot creative requires admin re-approval before going live.
  await run(
    `UPDATE bookings SET status = 'pending_approval', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [bookingId]
  );
}

async function updateSlotMeta(bookingId, slotId, { customHeading, customSubtitle, websiteUrl }) {
  const existing = await getSlotCreative(bookingId, slotId);
  if (existing) {
    const sets = [];
    const params = [];
    if (customHeading !== undefined) {
      sets.push(`custom_heading = $${params.length + 1}`);
      params.push(customHeading || null);
    }
    if (customSubtitle !== undefined) {
      sets.push(`custom_subtitle = $${params.length + 1}`);
      params.push(customSubtitle || null);
    }
    if (websiteUrl !== undefined) {
      sets.push(`website_url = $${params.length + 1}`);
      params.push(websiteUrl || null);
    }
    if (sets.length > 0) {
      params.push(bookingId, slotId);
      await run(
        `UPDATE slot_creatives SET ${sets.join(', ')} WHERE booking_id = $${params.length - 1} AND slot_id = $${params.length}`,
        params
      );
    }
  } else {
    await insert(
      `INSERT INTO slot_creatives (booking_id, slot_id, custom_heading, custom_subtitle, website_url) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [bookingId, slotId, customHeading || null, customSubtitle || null, websiteUrl || null]
    );
  }
  // Text/URL changes on a live bundle slot require admin re-approval.
  await run(
    `UPDATE bookings SET status = 'pending_approval', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [bookingId]
  );
}

// ─── Analytics ───

async function recordEvent({
  bookingId,
  eventType,
  ip,
  userAgent,
  referrer,
  visibleSeconds,
  visiblePercent,
}) {
  const ipHash = hashIp(ip || 'unknown');
  const botFlag = isBot(userAgent) ? 1 : 0;
  await insert(
    `
      INSERT INTO analytics_events (booking_id, event_type, ip_hash, user_agent, referrer, is_bot, visible_seconds, visible_percent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `,
    [
      bookingId,
      eventType,
      ipHash,
      userAgent || null,
      referrer || null,
      botFlag,
      visibleSeconds ?? null,
      visiblePercent ?? null,
    ]
  );
}

async function getDashboardMetrics(token) {
  const booking = await get(
    `
      SELECT b.*, s.name as slot_name, s.slug as slot_slug
      FROM bookings b
      JOIN ad_slots s ON b.slot_id = s.id
      WHERE b.analytics_token = $1
    `,
    [token]
  );
  if (!booking) return null;

  const totalImpressionsRow = await get(
    `SELECT COUNT(*) as c FROM analytics_events WHERE booking_id = $1 AND event_type = 'impression' AND is_bot = 0`,
    [booking.id]
  );
  const totalImpressions = totalImpressionsRow?.c || 0;

  const uniqueImpressionsRow = await get(
    `SELECT COUNT(DISTINCT ip_hash) as c FROM analytics_events WHERE booking_id = $1 AND event_type = 'impression' AND is_bot = 0`,
    [booking.id]
  );
  const uniqueImpressions = uniqueImpressionsRow?.c || 0;

  const viewableImpressionsRow = await get(
    `SELECT COUNT(*) as c FROM analytics_events WHERE booking_id = $1 AND event_type = 'viewable_impression' AND is_bot = 0`,
    [booking.id]
  );
  const viewableImpressions = viewableImpressionsRow?.c || 0;

  const totalClicksRow = await get(
    `SELECT COUNT(*) as c FROM analytics_events WHERE booking_id = $1 AND event_type = 'click' AND is_bot = 0`,
    [booking.id]
  );
  const totalClicks = totalClicksRow?.c || 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffIso = cutoff.toISOString();

  const daily = await all(
    `
      SELECT date(created_at) as day, event_type, COUNT(*) as count
      FROM analytics_events
      WHERE booking_id = $1 AND created_at >= $2 AND is_bot = 0
      GROUP BY day, event_type
      ORDER BY day DESC
    `,
    [booking.id, cutoffIso]
  );

  const referrers = await all(
    `
      SELECT referrer, COUNT(*) as count
      FROM analytics_events
      WHERE booking_id = $1 AND event_type = 'impression' AND referrer IS NOT NULL AND is_bot = 0
      GROUP BY referrer
      ORDER BY count DESC
      LIMIT 10
    `,
    [booking.id]
  );

  return {
    booking: {
      id: booking.id,
      slot_name: booking.slot_name,
      slot_slug: booking.slot_slug,
      company_name: booking.company_name,
      website_url: booking.website_url,
      status: booking.status,
      creative_path: booking.creative_path,
      started_at: booking.started_at,
      ends_at: booking.ends_at,
      created_at: booking.created_at,
    },
    metrics: {
      totalImpressions,
      uniqueImpressions,
      viewableImpressions,
      totalClicks,
      ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00',
      vtr:
        totalImpressions > 0 ? ((viewableImpressions / totalImpressions) * 100).toFixed(2) : '0.00',
      daily,
      referrers,
    },
  };
}

module.exports = {
  getSlots,
  getSlotBySlug,
  getSlotById,
  createBooking,
  getBookingByToken,
  getBookingById,
  getBookingByStripeSession,
  updateBookingStripeSession,
  markBookingPaid,
  saveCreative,
  setBookingStatus,
  goLive,
  endBooking,
  getBookingsByEmail,
  recordEvent,
  getDashboardMetrics,
  generateToken,
  hashIp,
  isBundleSlot,
  getBundleMembers,
  getSlotCreative,
  getSlotCreatives,
  saveSlotCreative,
  updateSlotMeta,
  setBillingStatus,
  recordTrialReminder,
  getTrialsNeedingReminder,
  setCancelAtEnd,
  extendBooking,
};
