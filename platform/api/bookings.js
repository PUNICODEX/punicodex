const Database = require('better-sqlite3');
const crypto = require('node:crypto');
const { getDbPath } = require('../db/db');
const { extractAndSave } = require('./keyword-extractor');

function getDb() {
  const db = new Database(getDbPath());
  db.pragma('journal_mode = WAL');
  return db;
}

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

// ─── Ad Slots ───

function getSlots(siteSlug = null) {
  const db = getDb();
  let query = `
    SELECT s.*,
      b.status as booking_status, b.analytics_token, b.company_name, b.website_url, b.hide_meta, b.id as booking_id,
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
    query += ` WHERE s.site_slug = ?`;
    params.push(siteSlug);
  }
  query += ` ORDER BY s.sort_order`;
  const slots = db.prepare(query).all(...params);
  db.close();
  return slots;
}

function isBundleSlot(slotId) {
  const db = getDb();
  const row = db.prepare('SELECT is_bundle FROM ad_slots WHERE id = ?').get(slotId);
  db.close();
  return row ? row.is_bundle === 1 : false;
}

function getBundleMembers(bundleSlotId) {
  const db = getDb();
  const rows = db
    .prepare('SELECT member_slot_id FROM bundle_members WHERE bundle_slot_id = ?')
    .all(bundleSlotId);
  db.close();
  return rows.map((r) => r.member_slot_id);
}

function getSlotBySlug(slug, siteSlug = null) {
  const db = getDb();
  let query = `
    SELECT s.*, b.status as booking_status, b.analytics_token, b.company_name, b.website_url
    FROM ad_slots s
    LEFT JOIN bookings b ON s.current_booking_id = b.id
    WHERE s.slug = ?
  `;
  const params = [slug];
  if (siteSlug) {
    query += ` AND s.site_slug = ?`;
    params.push(siteSlug);
  }
  const slot = db.prepare(query).get(...params);
  db.close();
  return slot;
}

function getSlotById(id) {
  const db = getDb();
  const slot = db.prepare('SELECT * FROM ad_slots WHERE id = ?').get(id);
  db.close();
  return slot;
}

// ─── Bookings ───

function createBooking({
  slotId,
  email,
  companyName,
  websiteUrl,
  customHeading,
  customSubtitle,
  leaseMonths = 1,
  trialMonths = 0,
  siteSlug = null,
}) {
  const db = getDb();
  const token = generateToken();
  const stmt = db.prepare(`
    INSERT INTO bookings (slot_id, email, company_name, website_url, custom_heading, custom_subtitle, status, analytics_token, lease_months, trial_months, site_slug)
    VALUES (?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?, ?, ?)
  `);
  const result = stmt.run(
    slotId,
    email,
    companyName || null,
    websiteUrl || null,
    customHeading || null,
    customSubtitle || null,
    token,
    leaseMonths,
    trialMonths,
    siteSlug || 'nike'
  );
  const bookingId = result.lastInsertRowid;

  // If booking a bundle, reserve the bundle slot and all member slots
  if (isBundleSlot(slotId)) {
    const members = getBundleMembers(slotId);
    const reserveStmt = db.prepare(`
      UPDATE ad_slots SET status = 'reserved', current_booking_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    // Reserve member slots 1-12
    for (const memberId of members) {
      reserveStmt.run(bookingId, memberId);
    }
    // Reserve the bundle slot itself (13)
    reserveStmt.run(bookingId, slotId);
  }

  db.close();
  return { id: bookingId, token };
}

function getBookingByToken(token) {
  const db = getDb();
  const booking = db
    .prepare(`
    SELECT b.*, s.name as slot_name, s.slug as slot_slug, s.width, s.height, s.price_cents
    FROM bookings b
    JOIN ad_slots s ON b.slot_id = s.id
    WHERE b.analytics_token = ?
  `)
    .get(token);
  db.close();
  return booking;
}

function getBookingById(id) {
  const db = getDb();
  const booking = db
    .prepare(`
    SELECT b.*, s.name as slot_name, s.slug as slot_slug
    FROM bookings b
    JOIN ad_slots s ON b.slot_id = s.id
    WHERE b.id = ?
  `)
    .get(id);
  db.close();
  return booking;
}

function getBookingByStripeSession(sessionId) {
  const db = getDb();
  const booking = db.prepare('SELECT * FROM bookings WHERE stripe_session_id = ?').get(sessionId);
  db.close();
  return booking;
}

function updateBookingStripeSession(bookingId, sessionId) {
  const db = getDb();
  db.prepare('UPDATE bookings SET stripe_session_id = ?, status = ? WHERE id = ?').run(
    sessionId,
    'pending_payment',
    bookingId
  );
  db.close();
}

function markBookingPaid(sessionId, paymentIntent, amountCents, subscriptionId = null) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM bookings WHERE stripe_session_id = ?').get(sessionId);
  if (existing && !['pending_payment', 'pending_application'].includes(existing.status)) {
    db.close();
    return existing;
  }
  db.prepare(`
    UPDATE bookings
    SET stripe_payment_intent = ?, amount_paid_cents = ?, stripe_subscription_id = ?, status = 'pending_upload', updated_at = CURRENT_TIMESTAMP
    WHERE stripe_session_id = ?
  `).run(paymentIntent, amountCents, subscriptionId || null, sessionId);
  const booking = db.prepare('SELECT * FROM bookings WHERE stripe_session_id = ?').get(sessionId);
  db.close();
  return booking;
}

function saveCreative(bookingId, filePath, originalName) {
  const db = getDb();
  db.prepare(`
    UPDATE bookings
    SET creative_path = ?, creative_original_name = ?, status = 'pending_approval', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(filePath, originalName, bookingId);
  db.close();
}

function setBookingStatus(bookingId, status, note = null) {
  const db = getDb();
  const updates = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
  const params = [status];
  if (note !== null) {
    updates.push('admin_note = ?');
    params.push(note);
  }
  params.push(bookingId);
  db.prepare(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  db.close();
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

async function goLive(bookingId) {
  const db = getDb();
  const bookingMeta = db
    .prepare(`
    SELECT b.slot_id, b.lease_months, b.trial_months, b.company_name, b.website_url, b.custom_heading,
           s.site_slug
    FROM bookings b
    JOIN ad_slots s ON b.slot_id = s.id
    WHERE b.id = ?
  `)
    .get(bookingId);

  const now = new Date();
  const nowIso = now.toISOString();
  const months = bookingMeta?.lease_months || 1;
  const trialMonths = bookingMeta?.trial_months || 0;
  const trialEnds = trialMonths > 0 ? addMonths(now, trialMonths) : now;
  const trialEndsIso = trialEnds.toISOString();
  const billingStartsIso = trialMonths > 0 ? trialEndsIso : nowIso;
  const ends = addMonths(now, months);
  const endsIso = ends.toISOString();

  const billingStatus = trialMonths > 0 ? 'trialing' : 'active';

  db.prepare(`
    UPDATE bookings
    SET status = 'live', started_at = ?, ends_at = ?, trial_ends_at = ?, billing_starts_at = ?, billing_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(nowIso, endsIso, trialEndsIso, billingStartsIso, billingStatus, bookingId);

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);

  // Set bundle slot live
  db.prepare(
    `UPDATE ad_slots SET status = 'live', current_booking_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(bookingId, booking.slot_id);

  // Cascade to all member slots
  if (isBundleSlot(booking.slot_id)) {
    const members = getBundleMembers(booking.slot_id);
    const cascadeStmt = db.prepare(
      `UPDATE ad_slots SET status = 'live', current_booking_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    );
    for (const memberId of members) {
      cascadeStmt.run(bookingId, memberId);
    }
  }

  // Push tenant details to indexed_sites so the search engine can crawl
  // their real website and extract SEO keywords.
  if (bookingMeta?.website_url && bookingMeta?.site_slug) {
    db.prepare(`
      UPDATE indexed_sites
      SET tenant_name = COALESCE(tenant_name, ?),
          tenant_front_url = COALESCE(tenant_front_url, ?),
          tenant_category = COALESCE(tenant_category, ?),
          lease_status = 'leased'
      WHERE lexicon_entry_id = ? AND status = 'active'
    `).run(
      bookingMeta.company_name || null,
      bookingMeta.website_url,
      bookingMeta.custom_heading || bookingMeta.company_name || null,
      bookingMeta.site_slug
    );

    // Crawl the tenant's real site and extract keywords immediately.
    try {
      const site = db
        .prepare(`
        SELECT * FROM indexed_sites
        WHERE lexicon_entry_id = ? AND status = 'active'
        ORDER BY is_flagship DESC, id ASC
        LIMIT 1
      `)
        .get(bookingMeta.site_slug);
      if (site) {
        db.close();
        await extractAndSave(site);
        return booking;
      }
    } catch (err) {
      console.error(`Keyword extraction failed for booking ${bookingId}:`, err.message);
    }
  }

  db.close();
  return booking;
}

function setBillingStatus(bookingId, status) {
  const db = getDb();
  db.prepare(
    `UPDATE bookings SET billing_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(status, bookingId);
  db.close();
}

function recordTrialReminder(bookingId, type) {
  const db = getDb();
  const col = type === '7d' ? 'reminder_7d_sent' : 'reminder_1d_sent';
  db.prepare(`UPDATE bookings SET ${col} = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(
    bookingId
  );
  db.close();
}

function getTrialsNeedingReminder() {
  const db = getDb();
  const rows = db
    .prepare(`
    SELECT b.*, s.name as slot_name, s.slug as slot_slug
    FROM bookings b
    JOIN ad_slots s ON b.slot_id = s.id
    WHERE b.status = 'live'
      AND b.trial_months > 0
      AND b.trial_ends_at IS NOT NULL
      AND b.billing_status = 'trialing'
  `)
    .all();
  db.close();
  return rows;
}

function endBooking(bookingId) {
  const db = getDb();
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  db.prepare(`
    UPDATE bookings SET status = 'ended', billing_status = 'canceled', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(bookingId);
  // Free bundle slot
  db.prepare(`
    UPDATE ad_slots SET status = 'available', current_booking_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(booking.slot_id);
  // Cascade to all member slots
  if (isBundleSlot(booking.slot_id)) {
    const members = getBundleMembers(booking.slot_id);
    const cascadeStmt = db.prepare(
      `UPDATE ad_slots SET status = 'available', current_booking_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    );
    for (const memberId of members) {
      cascadeStmt.run(memberId);
    }
  }
  // Clear tenant metadata and reset lease status on the associated indexed site.
  if (booking?.site_slug) {
    db.prepare(`
      UPDATE indexed_sites
      SET tenant_name = NULL,
          tenant_category = NULL,
          tenant_front_url = NULL,
          lease_status = 'available',
          archetype_score = 0.0,
          archetype_signals = NULL
      WHERE lexicon_entry_id = ? AND status = 'active'
    `).run(booking.site_slug);
  }
  db.close();
}

function getBookingsByEmail(email, siteSlug = null) {
  const db = getDb();
  let query = `
    SELECT b.*, s.name as slot_name, s.slug as slot_slug, s.is_bundle
    FROM bookings b
    JOIN ad_slots s ON b.slot_id = s.id
    WHERE b.email = ?
  `;
  const params = [email];
  if (siteSlug) {
    query += ` AND b.site_slug = ?`;
    params.push(siteSlug);
  }
  query += ` ORDER BY b.created_at DESC`;
  const bookings = db.prepare(query).all(...params);
  db.close();
  return bookings;
}

// ─── Slot Creatives (for bundle bookings) ───

function getSlotCreative(bookingId, slotId) {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM slot_creatives WHERE booking_id = ? AND slot_id = ?')
    .get(bookingId, slotId);
  db.close();
  return row || null;
}

function getSlotCreatives(bookingId) {
  const db = getDb();
  const rows = db
    .prepare(`
    SELECT sc.*, s.name as slot_name, s.width, s.height, s.slug as slot_slug
    FROM slot_creatives sc
    JOIN ad_slots s ON sc.slot_id = s.id
    WHERE sc.booking_id = ?
  `)
    .all(bookingId);
  db.close();
  return rows;
}

function saveSlotCreative(bookingId, slotId, filePath, originalName) {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM slot_creatives WHERE booking_id = ? AND slot_id = ?')
    .get(bookingId, slotId);
  if (existing) {
    db.prepare(
      `UPDATE slot_creatives SET creative_path = ?, creative_original_name = ? WHERE booking_id = ? AND slot_id = ?`
    ).run(filePath, originalName, bookingId, slotId);
  } else {
    db.prepare(
      `INSERT INTO slot_creatives (booking_id, slot_id, creative_path, creative_original_name) VALUES (?, ?, ?, ?)`
    ).run(bookingId, slotId, filePath, originalName);
  }
  db.close();
}

function updateSlotMeta(bookingId, slotId, { customHeading, customSubtitle, websiteUrl }) {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM slot_creatives WHERE booking_id = ? AND slot_id = ?')
    .get(bookingId, slotId);
  if (existing) {
    const sets = [];
    const params = [];
    if (customHeading !== undefined) {
      sets.push('custom_heading = ?');
      params.push(customHeading || null);
    }
    if (customSubtitle !== undefined) {
      sets.push('custom_subtitle = ?');
      params.push(customSubtitle || null);
    }
    if (websiteUrl !== undefined) {
      sets.push('website_url = ?');
      params.push(websiteUrl || null);
    }
    if (sets.length > 0) {
      params.push(bookingId, slotId);
      db.prepare(
        `UPDATE slot_creatives SET ${sets.join(', ')} WHERE booking_id = ? AND slot_id = ?`
      ).run(...params);
    }
  } else {
    db.prepare(
      `INSERT INTO slot_creatives (booking_id, slot_id, custom_heading, custom_subtitle, website_url) VALUES (?, ?, ?, ?, ?)`
    ).run(bookingId, slotId, customHeading || null, customSubtitle || null, websiteUrl || null);
  }
  db.close();
}

// ─── Analytics ───

function recordEvent({ bookingId, eventType, ip, userAgent, referrer }) {
  const db = getDb();
  const ipHash = hashIp(ip || 'unknown');
  db.prepare(`
    INSERT INTO analytics_events (booking_id, event_type, ip_hash, user_agent, referrer)
    VALUES (?, ?, ?, ?, ?)
  `).run(bookingId, eventType, ipHash, userAgent || null, referrer || null);
  db.close();
}

function getDashboardMetrics(token) {
  const db = getDb();
  const booking = db
    .prepare(`
    SELECT b.*, s.name as slot_name, s.slug as slot_slug
    FROM bookings b
    JOIN ad_slots s ON b.slot_id = s.id
    WHERE b.analytics_token = ?
  `)
    .get(token);
  if (!booking) {
    db.close();
    return null;
  }

  const totalImpressions = db
    .prepare(`
    SELECT COUNT(*) as c FROM analytics_events
    WHERE booking_id = ? AND event_type = 'impression'
  `)
    .get(booking.id).c;

  const uniqueImpressions = db
    .prepare(`
    SELECT COUNT(DISTINCT ip_hash) as c FROM analytics_events
    WHERE booking_id = ? AND event_type = 'impression'
  `)
    .get(booking.id).c;

  const totalClicks = db
    .prepare(`
    SELECT COUNT(*) as c FROM analytics_events
    WHERE booking_id = ? AND event_type = 'click'
  `)
    .get(booking.id).c;

  const daily = db
    .prepare(`
    SELECT date(created_at) as day, event_type, COUNT(*) as count
    FROM analytics_events
    WHERE booking_id = ? AND created_at >= date('now', '-30 days')
    GROUP BY day, event_type
    ORDER BY day DESC
  `)
    .all(booking.id);

  const referrers = db
    .prepare(`
    SELECT referrer, COUNT(*) as count
    FROM analytics_events
    WHERE booking_id = ? AND event_type = 'impression' AND referrer IS NOT NULL
    GROUP BY referrer
    ORDER BY count DESC
    LIMIT 10
  `)
    .all(booking.id);

  db.close();

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
      totalClicks,
      ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00',
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
};
