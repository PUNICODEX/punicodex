/**
 * PuniCodex — Tenant Portal service (sponsor/patron self-service)
 *
 * Identity, sessions, one-time tokens, ownership-scoped analytics, and the
 * change-request approval queue for the tenant portal at /account/.
 *
 * Model:
 *   - One tenant_accounts row per contact email. Linkage to owned resources
 *     is by email match against bookings.email (sponsor) and patrons.email
 *     (patron) — the existing schemas already carry the contact email, so no
 *     linkage columns are added to those tables. An email may hold both
 *     kinds; is_sponsor / is_patron flags are recomputed from the linkage.
 *   - Sessions are bearer tokens stored sha256-hashed in tenant_sessions
 *     (NOT admin_sessions). Password set/reset and account disable destroy
 *     the account's sessions immediately (deleteSessionsForUser), mirroring
 *     the Scholars / admin-portal revocation model.
 *   - tenant_change_requests queue sponsor creative swaps ('image') and
 *     patron social-link changes ('social_links'). Nothing applies until a
 *     superadmin/ops reviews in the unified admin portal; approval applies
 *     the change to the real record inside a transaction.
 *
 * Creative staging reuses the repo's existing upload convention (base64 data
 * URI → dimension validation → file under platform/api/public/uploads →
 * public /uploads/... path), but writes to a tenant-requests staging
 * directory and only points the booking at the staged file on approval.
 */

const crypto = require('node:crypto');
const path = require('node:path');
const bcrypt = require('bcrypt');
const { imageSize } = require('image-size');
const { get, all, run, insert, transaction } = require('../db/operational');
const { getDb } = require('../db/connection');
const { migrate: migrateTenantPortal } = require('../db/migrate-tenant-portal');
const { migrate: migrateAnalyticsSlot } = require('../db/migrate-analytics-slot');
const { hashToken } = require('./admin');
const { goLive, pause } = require('./bookings');
const { validateMeta } = require('./booking-validation');
const { notifyLive } = require('./email');
const { getTempleTraffic, getOverview } = require('./site-analytics');
const { logAction } = require('./admin-actions');
const { writeWebpSibling } = require('./image-webp');

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (set-password / reset)
const BCRYPT_ROUNDS = Number(process.env.PUNICODEX_BCRYPT_ROUNDS) || 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // matches booking-upload.js

const { ensureUploadsDir, storeCreativeBuffer } = require('./upload-storage');
const { normalizeCreativeBuffer } = require('./booking-upload');

// Booking statuses in which a creative swap is meaningful (mirrors the
// allowed-upload statuses in platform/api/booking-upload.js; under-review
// included — the reviewer always sees the latest).
const IMAGE_CHANGEABLE_STATUSES = [
  'pending_upload',
  'rejected',
  'approved',
  'live',
  'pending_approval',
];

// Social link validation mirrored from platform/api/patron-service.js
// (SOCIAL_PLATFORMS / SOCIAL_PATTERNS are not exported there). Keep in sync
// with the patron checkout validators.
const SOCIAL_PLATFORMS = ['x', 'instagram', 'linkedin', 'tiktok', 'youtube', 'github', 'website'];
const SOCIAL_PATTERNS = {
  x: /^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/?$/,
  instagram: /^https:\/\/www\.instagram\.com\/[A-Za-z0-9_.]{1,30}\/?$/,
  linkedin: /^https:\/\/www\.linkedin\.com\/in\/[A-Za-z0-9-]{3,100}\/?$/,
  tiktok: /^https:\/\/www\.tiktok\.com\/@?[A-Za-z0-9_.]{1,24}\/?$/,
  youtube:
    /^https:\/\/(www\.)?(youtube\.com\/(channel\/|c\/|@)[A-Za-z0-9_-]+|youtu\.be\/[A-Za-z0-9_-]+)\/?$/,
  github: /^https:\/\/github\.com\/[A-Za-z0-9-]{1,39}\/?$/,
  website: /^https:\/\/([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(\/[A-Za-z0-9-._~:/?#[\]@!$&'()*+,;=]*)?$/,
};

// Cold-start schema: idempotent, once per serverless instance (lazy so
// importing the module stays cheap). The analytics-slot migration rides
// along because getBookingEventStats reads analytics_events.slot_slug.
let schemaReady = false;
function ensureSchema() {
  if (schemaReady) return;
  migrateTenantPortal(getDb());
  migrateAnalyticsSlot(getDb());
  schemaReady = true;
}

function portalError(status, message, code) {
  return Object.assign(new Error(message), { status, code });
}

// ─────────────────────────────────────────────────────────────
// Accounts & linkage
// ─────────────────────────────────────────────────────────────

function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase().slice(0, 254);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getAccountByEmail(email) {
  ensureSchema();
  return get('SELECT * FROM tenant_accounts WHERE email = $1', [normalizeEmail(email)]);
}

async function getAccountById(id) {
  ensureSchema();
  return get('SELECT * FROM tenant_accounts WHERE id = $1', [id]);
}

function sanitizeAccount(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    isSponsor: Boolean(row.is_sponsor),
    isPatron: Boolean(row.is_patron),
    status: row.status,
    hasPassword: Boolean(row.password_hash),
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

/**
 * Resolve everything an email owns: ad-slot bookings (sponsor side) and
 * patron subscriptions (patron side). This is the single ownership source of
 * truth — every scoping decision goes through it.
 */
async function linkTenantAccount(email) {
  const normalized = normalizeEmail(email);
  const [bookings, patrons] = await Promise.all([
    all(
      `SELECT b.id, b.slot_id, b.email, b.company_name, b.website_url, b.status, b.site_slug,
              b.creative_path, b.custom_heading, b.custom_subtitle,
              b.started_at, b.ends_at, b.created_at, b.analytics_token,
              s.name AS slot_name, s.slug AS slot_slug, s.width, s.height, s.is_bundle,
              (b.creative_path IS NOT NULL OR EXISTS (
                 SELECT 1 FROM slot_creatives sc
                  WHERE sc.booking_id = b.id AND sc.creative_path IS NOT NULL
               )) AS has_creative
         FROM bookings b
         JOIN ad_slots s ON b.slot_id = s.id
        WHERE LOWER(b.email) = $1
        ORDER BY b.created_at DESC`,
      [normalized]
    ),
    all(
      `SELECT id, temple_id, email, display_name, title, message, amount_cents,
              social_platform, social_url, status, started_at, ends_at, created_at
         FROM patrons
        WHERE LOWER(email) = $1
        ORDER BY created_at DESC`,
      [normalized]
    ),
  ]);
  return { bookings, patrons };
}

/**
 * Create-or-find the tenant account for a contact email and refresh its
 * sponsor/patron flags from the actual linkage. Issues a one-time
 * set-password token only when the account has no password yet (repeat
 * customers keep their existing password).
 */
async function provisionTenantAccount(email, { kind } = {}) {
  ensureSchema();
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw portalError(400, 'A valid email is required', 'invalid_email');
  }
  if (kind && !['sponsor', 'patron'].includes(kind)) {
    throw portalError(400, "kind must be 'sponsor' or 'patron'", 'invalid_kind');
  }

  let account = await getAccountByEmail(normalized);
  let created = false;
  if (!account) {
    await run('INSERT INTO tenant_accounts (email) VALUES ($1)', [normalized]);
    account = await getAccountByEmail(normalized);
    created = true;
  }

  const { bookings, patrons } = await linkTenantAccount(normalized);
  const isSponsor = bookings.length > 0 || kind === 'sponsor';
  const isPatron = patrons.length > 0 || kind === 'patron';
  await run(
    `UPDATE tenant_accounts
        SET is_sponsor = CASE WHEN $1 = 1 THEN 1 ELSE is_sponsor END,
            is_patron = CASE WHEN $2 = 1 THEN 1 ELSE is_patron END,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $3`,
    [isSponsor ? 1 : 0, isPatron ? 1 : 0, account.id]
  );

  let token = null;
  if (!account.password_hash) {
    token = await issueToken(account.id, 'set_password');
  }

  return { account: sanitizeAccount(await getAccountById(account.id)), token, created };
}

// ─────────────────────────────────────────────────────────────
// One-time tokens (set-password / reset)
// ─────────────────────────────────────────────────────────────

async function issueToken(accountId, purpose) {
  ensureSchema();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  await run(
    'INSERT INTO tenant_tokens (token, account_id, purpose, expires_at) VALUES ($1, $2, $3, $4)',
    [hashToken(token), accountId, purpose, expiresAt]
  );
  return token;
}

async function getValidToken(rawToken, purpose) {
  ensureSchema();
  if (!rawToken || typeof rawToken !== 'string') return null;
  const row = await get('SELECT * FROM tenant_tokens WHERE token = $1', [hashToken(rawToken)]);
  if (row?.purpose !== purpose) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at) < new Date()) return null;
  return row;
}

/**
 * Set (or reset) the account password from a one-time token. The token is
 * consumed atomically (single use), every existing session is revoked, and a
 * fresh session is returned so the user lands signed in.
 */
async function setPassword({ token, password }) {
  ensureSchema();
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw portalError(400, `password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  const purpose = 'set_password';
  let row = await getValidToken(token, purpose);
  // Reset tokens issued by the forgot flow work identically.
  if (!row) row = await getValidToken(token, 'reset');
  if (!row) {
    throw portalError(400, 'Invalid or expired token', 'invalid_token');
  }

  // Atomic single-use consume: a second concurrent attempt updates 0 rows.
  const consumed = await run(
    'UPDATE tenant_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = $1 AND used_at IS NULL',
    [row.token]
  );
  if (consumed.changes === 0) {
    throw portalError(400, 'Invalid or expired token', 'invalid_token');
  }

  const account = await getAccountById(row.account_id);
  if (account?.status !== 'active') {
    throw portalError(400, 'Invalid or expired token', 'invalid_token');
  }

  const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  await run(
    'UPDATE tenant_accounts SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [passwordHash, account.id]
  );
  // A credential change revokes every prior session immediately.
  await deleteSessionsForUser(account.id);

  const sessionToken = await createSession(account.id);

  // The sponsor must never lose their way back: the one-time link is spent,
  // so send the permanent panel URL. Fire-and-forget — email trouble must
  // never fail a password set.
  try {
    const { notifyPanelReady } = require('./email');
    notifyPanelReady({ email: account.email, companyName: account.company_name }).catch(() => {});
  } catch {
    // email module unavailable — ignore
  }

  return { token: sessionToken, account: sanitizeAccount(await getAccountById(account.id)) };
}

// ─────────────────────────────────────────────────────────────
// Sessions
// ─────────────────────────────────────────────────────────────

async function createSession(accountId) {
  ensureSchema();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await run('INSERT INTO tenant_sessions (token, account_id, expires_at) VALUES ($1, $2, $3)', [
    hashToken(token),
    accountId,
    expiresAt,
  ]);
  return token;
}

async function deleteSession(token) {
  ensureSchema();
  await run('DELETE FROM tenant_sessions WHERE token = $1', [hashToken(token)]);
}

async function deleteSessionsForUser(accountId) {
  ensureSchema();
  await run('DELETE FROM tenant_sessions WHERE account_id = $1', [accountId]);
}

async function resolveAccount(token) {
  if (!token || typeof token !== 'string') return null;
  ensureSchema();
  const row = await get(
    `SELECT a.*, s.token AS session_token, s.expires_at AS session_expires_at
       FROM tenant_sessions s
       JOIN tenant_accounts a ON a.id = s.account_id
      WHERE s.token = $1`,
    [hashToken(token)]
  );
  if (!row) return null;
  if (row.session_expires_at && new Date(row.session_expires_at) < new Date()) {
    await deleteSession(token);
    return null;
  }
  // Immediate revocation: a disabled account loses access on the next
  // request and all of its sessions are destroyed.
  if (row.status !== 'active') {
    await deleteSessionsForUser(row.id);
    return null;
  }
  return sanitizeAccount(row);
}

function bearerToken(req) {
  const header = req.headers?.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  const alt = req.headers?.['x-session-token'];
  return typeof alt === 'string' ? alt.trim() : null;
}

/**
 * Guard for tenant handlers. Resolves the bearer session, rejecting disabled
 * accounts and expired sessions. Returns the account or false after 401.
 */
async function requireAccount(req, res) {
  const account = await resolveAccount(bearerToken(req));
  if (!account) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return account;
}

// ─────────────────────────────────────────────────────────────
// Login / logout / forgot
// ─────────────────────────────────────────────────────────────

let dummyHash = null;
function getDummyHash() {
  // Constant-time-ish unknown-user path so account existence is not leaked
  // by timing (same approach as the admin portal login).
  if (!dummyHash) {
    dummyHash = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), BCRYPT_ROUNDS);
  }
  return dummyHash;
}

// Failed logins are attack telemetry for the Security tab. Privacy-first: the
// email is stored only as a truncated sha256 — never raw, never the password.
// Logging is fire-and-forget and can never throw into the request path.
async function logLoginFailure(email, reason) {
  try {
    await logAction({
      action: 'tenant.login.failed',
      meta: {
        emailHash: crypto.createHash('sha256').update(String(email)).digest('hex').slice(0, 16),
        reason,
      },
    });
  } catch (err) {
    console.error('[tenant-portal] login-failure audit failed:', err.message);
  }
}

async function login({ email, password }) {
  ensureSchema();
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw portalError(401, 'Invalid email or password', 'invalid_credentials');
  }
  const normalized = normalizeEmail(email);
  const account = normalized ? await getAccountByEmail(normalized) : null;
  if (!account?.password_hash) {
    // Unknown email, or an account that was provisioned but never activated
    // (password not set yet): identical generic failure either way.
    bcrypt.compareSync(password || '', getDummyHash());
    if (normalized) await logLoginFailure(normalized, 'unknown_account');
    throw portalError(401, 'Invalid email or password', 'invalid_credentials');
  }
  const valid = bcrypt.compareSync(password, account.password_hash);
  if (!valid) {
    await logLoginFailure(normalized, 'bad_credentials');
    throw portalError(401, 'Invalid email or password', 'invalid_credentials');
  }
  // Checked only after credentials verify, so disabled status is not leaked
  // to anyone without the password.
  if (account.status !== 'active') {
    throw portalError(403, 'Account is disabled. Contact support.', 'account_disabled');
  }

  await run('UPDATE tenant_accounts SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [
    account.id,
  ]);
  const token = await createSession(account.id);
  return { token, account: sanitizeAccount(await getAccountById(account.id)) };
}

async function logout(token) {
  if (token) await deleteSession(token);
}

/**
 * Issue a password-reset token and email the link. Always succeeds from the
 * caller's perspective so account existence is not leaked; the email only
 * goes out when an active account exists.
 */
async function forgot({ email }) {
  ensureSchema();
  const normalized = normalizeEmail(email);
  const account = normalized ? await getAccountByEmail(normalized) : null;
  if (account && account.status === 'active') {
    const token = await issueToken(account.id, 'reset');
    const { notifyTenantPasswordReset } = require('./email');
    notifyTenantPasswordReset({ email: normalized, token }).catch(() => {});
  }
  return {
    success: true,
    message: 'If an account exists for this email, a reset link has been sent.',
  };
}

// ─────────────────────────────────────────────────────────────
// Profile & analytics (ownership-scoped)
// ─────────────────────────────────────────────────────────────

async function getMe(account) {
  const { bookings, patrons } = await linkTenantAccount(account.email);
  const pendingImageRows = await all(
    `SELECT target_id FROM tenant_change_requests
      WHERE account_id = $1 AND type = 'image' AND status = 'pending'`,
    [account.id]
  );
  const pendingImageTargets = new Set(pendingImageRows.map((r) => r.target_id));
  // Self-heal the sponsor/patron flags from the live linkage: accounts
  // provisioned while the email match was case-broken (or before a booking
  // existed) otherwise keep stale zero flags forever.
  const isSponsor = bookings.length > 0;
  const isPatron = patrons.length > 0;
  if (isSponsor !== account.isSponsor || isPatron !== account.isPatron) {
    await run(
      `UPDATE tenant_accounts
          SET is_sponsor = $1, is_patron = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3`,
      [isSponsor ? 1 : 0, isPatron ? 1 : 0, account.id]
    );
    account = { ...account, isSponsor, isPatron };
  }
  return {
    account,
    resources: {
      bookings: bookings.map((b) => ({
        id: b.id,
        slotId: b.slot_id,
        slotName: b.slot_name,
        slotSlug: b.slot_slug,
        siteSlug: b.site_slug,
        templeSlug: b.site_slug,
        status: b.status,
        creativePath: b.creative_path,
        hasCreative: Boolean(b.has_creative),
        pendingImageRequest: pendingImageTargets.has(b.id),
        customHeading: b.custom_heading || '',
        customSubtitle: b.custom_subtitle || '',
        companyName: b.company_name,
        websiteUrl: b.website_url,
        width: b.width,
        height: b.height,
        isBundle: Boolean(b.is_bundle),
        startedAt: b.started_at,
        endsAt: b.ends_at,
        // The analytics_token doubles as the advertiser-dashboard credential.
        // It is returned only to the authenticated owner of the booking's
        // contact email — the same disclosure as the /api/bookings/recover
        // email, never to anyone else.
        dashboardToken: b.analytics_token || null,
      })),
      patrons: patrons.map((p) => ({
        id: p.id,
        templeId: p.temple_id,
        displayName: p.display_name,
        title: p.title,
        status: p.status,
        socialPlatform: p.social_platform,
        socialUrl: p.social_url,
        startedAt: p.started_at,
        endsAt: p.ends_at,
      })),
    },
  };
}

function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function getBookingEventStats(bookingId) {
  const totals = await get(
    `SELECT
       SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) AS impressions,
       SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) AS clicks,
       SUM(CASE WHEN event_type = 'viewable_impression' THEN 1 ELSE 0 END) AS viewable
     FROM analytics_events
     WHERE booking_id = $1 AND is_bot = 0`,
    [bookingId]
  );
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const dailyRows = await all(
    `SELECT date(created_at) AS day, event_type, COUNT(*) AS count
       FROM analytics_events
      WHERE booking_id = $1 AND created_at >= $2 AND is_bot = 0
      GROUP BY day, event_type
      ORDER BY day ASC`,
    [bookingId, cutoff]
  );
  const byDay = new Map();
  for (const row of dailyRows) {
    const entry = byDay.get(row.day) || { day: row.day, impressions: 0, clicks: 0 };
    if (row.event_type === 'impression') entry.impressions += toCount(row.count);
    if (row.event_type === 'click') entry.clicks += toCount(row.count);
    byDay.set(row.day, entry);
  }

  // Placement-level split. Events without a slot slug (pre-dimension events,
  // whole-slot renders) group under slot_slug NULL — the booking's whole-slot
  // bucket; the UI labels it as the slot itself.
  const slotRows = await all(
    `SELECT slot_slug,
            SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) AS impressions,
            SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) AS clicks,
            SUM(CASE WHEN event_type = 'viewable_impression' THEN 1 ELSE 0 END) AS viewable
       FROM analytics_events
      WHERE booking_id = $1 AND is_bot = 0
      GROUP BY slot_slug
      ORDER BY impressions DESC, slot_slug ASC`,
    [bookingId]
  );
  const bySlot = slotRows
    .filter(
      (row) => toCount(row.impressions) > 0 || toCount(row.clicks) > 0 || toCount(row.viewable) > 0
    )
    .map((row) => {
      const impressions = toCount(row.impressions);
      const clicks = toCount(row.clicks);
      const viewableImpressions = toCount(row.viewable);
      return {
        slotSlug: row.slot_slug || null,
        impressions,
        clicks,
        ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00',
        viewableImpressions,
        viewabilityPct:
          impressions > 0 ? ((viewableImpressions / impressions) * 100).toFixed(1) : '0.0',
      };
    });

  const impressions = toCount(totals?.impressions);
  const clicks = toCount(totals?.clicks);
  const viewableImpressions = toCount(totals?.viewable);
  return {
    impressions,
    clicks,
    ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00',
    viewableImpressions,
    viewabilityPct:
      impressions > 0 ? ((viewableImpressions / impressions) * 100).toFixed(1) : '0.0',
    bySlot,
    daily: [...byDay.values()],
  };
}

/**
 * Per owned slot / patron spot. Real rows only: slots read analytics_events
 * (zeros when nothing was recorded); patron spots have no per-spot event
 * tracking, so they report zeros with tracking: 'none' rather than a
 * fabricated number.
 */
async function getSpaceAnalytics(account) {
  const { bookings, patrons } = await linkTenantAccount(account.email);
  const slots = [];
  for (const b of bookings) {
    // Per-booking isolation: a schema/DB fault on one placement must not take
    // the sponsor's whole panel down — that placement reports zeros.
    let stats;
    try {
      stats = await getBookingEventStats(b.id);
    } catch (err) {
      console.warn(`[tenant-portal] stats degraded for booking ${b.id}: ${err.message}`);
      stats = {
        impressions: 0,
        clicks: 0,
        ctr: '0.00',
        viewableImpressions: 0,
        viewabilityPct: '0.0',
        bySlot: [],
        daily: [],
      };
    }
    slots.push({
      bookingId: b.id,
      slotName: b.slot_name,
      slotSlug: b.slot_slug,
      siteSlug: b.site_slug,
      templeSlug: b.site_slug,
      status: b.status,
      creativePath: b.creative_path,
      isBundle: Boolean(b.is_bundle),
      tracking: 'events',
      ...stats,
    });
  }
  return {
    slots,
    patrons: patrons.map((p) => ({
      patronId: p.id,
      templeId: p.temple_id,
      displayName: p.display_name,
      status: p.status,
      tracking: 'none',
      impressions: 0,
      clicks: 0,
      ctr: '0.00',
      daily: [],
    })),
  };
}

async function ownsTempleResource(email, templeId) {
  const normalized = normalizeEmail(email);
  const booking = await get('SELECT id FROM bookings WHERE email = $1 AND site_slug = $2 LIMIT 1', [
    normalized,
    templeId,
  ]);
  if (booking) return true;
  const patron = await get('SELECT id FROM patrons WHERE email = $1 AND temple_id = $2 LIMIT 1', [
    normalized,
    templeId,
  ]);
  return Boolean(patron);
}

/**
 * Deep per-temple aggregates from site-analytics#getTempleAnalytics
 * (attention, countries, referrers, sub-pages). Lazy-required like the other
 * optional deps and fully guarded: an analytics failure must never 500 the
 * sandbox, so any error degrades every enriched field to null.
 */
async function getTempleEnrichment(templeId, days) {
  try {
    const { getTempleAnalytics: getTempleDeep } = require('./site-analytics');
    return await getTempleDeep(templeId, { days });
  } catch (err) {
    console.error('[tenant-portal] temple enrichment failed:', err.message);
    return null;
  }
}

/**
 * Build the temple analytics payload shared by the temple route and the
 * placement-detail route: the existing getTempleTraffic overview plus the
 * guarded enrichment block.
 */
async function buildTempleAnalyticsPayload(tid) {
  const data = await getTempleTraffic(tid, { days: 30 });
  const deep = await getTempleEnrichment(tid, 30);
  return {
    templeId: tid,
    periodDays: data.periodDays,
    totals: data.totals,
    byDay: data.byDay,
    devices: data.devices,
    attention: deep
      ? {
          avgVisibleMs: deep.totals?.avgVisibleMs ?? 0,
          engagementDays: deep.totals?.engagementDays ?? 0,
        }
      : null,
    countries: deep?.countries ?? null,
    referrers: deep?.referrers ?? null,
    subPages: deep?.subPages ?? null,
  };
}

/**
 * Aggregate page stats for one temple. Only available when the account owns
 * a resource (booking or patron spot) on that temple — 403 otherwise.
 */
async function getTempleAnalytics(account, templeId) {
  const tid = typeof templeId === 'string' ? templeId.trim() : '';
  if (!/^[a-z0-9-]{1,64}$/.test(tid)) {
    throw portalError(400, 'Invalid temple id');
  }
  if (!(await ownsTempleResource(account.email, tid))) {
    throw portalError(403, 'You do not own a resource on this temple', 'not_owner');
  }
  return buildTempleAnalyticsPayload(tid);
}

/**
 * Full placement detail for one owned booking: the booking itself, its event
 * stats (totals + per-placement bySlot + 30d daily), and the host temple's
 * traffic summary. Ownership is the booking's contact email — 403 otherwise.
 */
async function getSlotAnalytics(account, bookingId) {
  const id = Number.parseInt(bookingId, 10);
  if (Number.isNaN(id) || id <= 0) {
    throw portalError(400, 'Invalid booking id');
  }
  const booking = await get(
    `SELECT b.id, b.slot_id, b.email, b.company_name, b.website_url, b.status, b.site_slug,
            b.creative_path, b.started_at, b.ends_at, b.created_at,
            s.name AS slot_name, s.slug AS slot_slug, s.width, s.height, s.is_bundle
       FROM bookings b
       JOIN ad_slots s ON b.slot_id = s.id
      WHERE b.id = $1`,
    [id]
  );
  if (!booking) throw portalError(404, 'Booking not found');
  if (normalizeEmail(booking.email) !== account.email) {
    throw portalError(403, 'You do not own this booking', 'not_owner');
  }

  const stats = await getBookingEventStats(booking.id);
  // The temple summary is additive context; a traffic-store failure must not
  // take the placement stats down with it.
  let temple = null;
  if (booking.site_slug && /^[a-z0-9-]{1,64}$/.test(booking.site_slug)) {
    try {
      temple = await buildTempleAnalyticsPayload(booking.site_slug);
    } catch (err) {
      console.error('[tenant-portal] slot temple summary failed:', err.message);
      temple = null;
    }
  }

  return {
    booking: {
      id: booking.id,
      slotId: booking.slot_id,
      slotName: booking.slot_name,
      slotSlug: booking.slot_slug,
      siteSlug: booking.site_slug,
      templeSlug: booking.site_slug,
      status: booking.status,
      creativePath: booking.creative_path,
      companyName: booking.company_name,
      websiteUrl: booking.website_url,
      width: booking.width,
      height: booking.height,
      isBundle: Boolean(booking.is_bundle),
      startedAt: booking.started_at,
      endsAt: booking.ends_at,
    },
    ...stats,
    temple,
  };
}

// ─────────────────────────────────────────────────────────────
// Advertiser self-service controls (ownership-scoped)
// ─────────────────────────────────────────────────────────────

async function getOwnedBooking(account, bookingId) {
  ensureSchema();
  const id = Number.parseInt(bookingId, 10);
  if (Number.isNaN(id)) throw portalError(400, 'booking id must be numeric');
  const booking = await get(
    `SELECT b.*, s.name AS slot_name, s.width, s.height, s.is_bundle
       FROM bookings b JOIN ad_slots s ON b.slot_id = s.id
      WHERE b.id = $1`,
    [id]
  );
  if (!booking) throw portalError(404, 'Booking not found');
  if (normalizeEmail(booking.email) !== account.email) {
    throw portalError(403, 'You do not own this booking', 'not_owner');
  }
  return booking;
}

/**
 * Sponsor publishes their own approved placement. Approval is the team's
 * gate; going live is the sponsor's switch.
 */
async function publishOwnBooking(account, bookingId) {
  const booking = await getOwnedBooking(account, bookingId);
  if (booking.status !== 'approved') {
    throw portalError(409, `Cannot publish a booking in status: ${booking.status}`);
  }
  await goLive(booking.id);
  notifyLive({
    email: booking.email,
    slotName: booking.slot_name,
    companyName: booking.company_name,
    bookingToken: booking.analytics_token,
    leaseMonths: booking.lease_months,
    siteSlug: booking.site_slug,
  }).catch(() => {});
  return { success: true, status: 'live' };
}

async function pauseOwnBooking(account, bookingId) {
  const booking = await getOwnedBooking(account, bookingId);
  await pause(booking.id); // throws conflict unless live
  return { success: true, status: 'approved' };
}

const WEBSITE_URL_PATTERN = /^https:\/\/[^\s]+$/;

/**
 * Edit ad copy / destination from the panel. Same rule as the token
 * dashboard meta endpoint: touching a live or approved booking sends it
 * back through review (pending_approval). Bundle (takeover) bookings edit
 * booking-level fields only — per-frame copy is not exposed here.
 */
async function updateOwnBookingMeta(
  account,
  bookingId,
  { customHeading, customSubtitle, websiteUrl } = {}
) {
  const booking = await getOwnedBooking(account, bookingId);
  // Same gate as creative swaps: the copy is editable in exactly the statuses
  // in which the creative is changeable.
  if (!IMAGE_CHANGEABLE_STATUSES.includes(booking.status)) {
    throw portalError(400, `Cannot edit ad copy in status: ${booking.status}`);
  }
  const metaError = validateMeta(booking.width, customHeading, customSubtitle);
  if (metaError) throw portalError(400, metaError);
  if (websiteUrl !== undefined && websiteUrl && !WEBSITE_URL_PATTERN.test(websiteUrl)) {
    throw portalError(400, 'Destination link must be a full https:// URL');
  }

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
  // A no-fields request is a true no-op: no writes at all. Checking before
  // the status flip matters — otherwise an empty edit on a live/approved
  // booking would pull the ad off the air for nothing.
  if (sets.length === 0) return { success: true };
  if (['live', 'approved'].includes(booking.status)) {
    sets.push(`status = $${params.length + 1}`);
    params.push('pending_approval');
  }
  params.push(booking.id);
  // Both writes in one transaction: the booking flip to pending_approval and
  // the frame reservation must succeed or fail together, so a crash can never
  // leave frames serving copy that is back in review.
  await transaction(async ({ run: tRun }) => {
    await tRun(
      `UPDATE bookings SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length}`,
      params
    );
    // If the booking was live, the frames must stop serving until
    // re-approval: flip the slot(s) back to reserved (same shape as pause()).
    if (booking.status === 'live') {
      await tRun(
        `UPDATE ad_slots SET status = 'reserved', updated_at = CURRENT_TIMESTAMP
         WHERE current_booking_id = $1`,
        [booking.id]
      );
    }
  });
  return { success: true };
}

/**
 * Site-wide aggregate, public-level only: traffic rollups (no per-user
 * fields — site_analytics stores only hashes) plus lexicon content counts.
 */
async function getSiteAnalytics() {
  const overview = await getOverview({ days: 30 });
  const [entriesRow, flagshipsRow, pantheonsRow] = await Promise.all([
    get('SELECT COUNT(*) AS c FROM entries'),
    get('SELECT COUNT(*) AS c FROM entries WHERE has_flagship = 1'),
    get('SELECT COUNT(DISTINCT pantheon) AS c FROM entries'),
  ]);
  return {
    periodDays: overview.periodDays,
    totals: overview.totals,
    byDay: overview.byDay,
    devices: overview.devices,
    content: {
      entries: toCount(entriesRow?.c),
      flagships: toCount(flagshipsRow?.c),
      pantheons: toCount(pantheonsRow?.c),
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Change requests
// ─────────────────────────────────────────────────────────────

function parseBase64Image(image) {
  // Same contract as platform/api/booking-upload.js.
  if (typeof image !== 'string') return { error: 'image must be a base64 data URI' };
  const match = image.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) return { error: 'Invalid image format. Must be base64 data URI.' };
  const buffer = Buffer.from(match[3], 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) {
    return { error: 'Image must be under 2MB' };
  }
  return { mimeType: match[1], buffer };
}

// Dimension rules mirror platform/api/image-meta.js validateCreativeDimensions
// (exact match, or aspect ratio within 5%). Implemented here because
// image-meta calls the image-size v1 default export, which no longer exists
// under the pinned image-size@2 (its named export is `imageSize`).
function validateCreativeDimensions(buffer, expectedWidth, expectedHeight, tolerance = 0.05) {
  let dims;
  try {
    dims = imageSize(buffer);
  } catch (err) {
    return err.message || 'Invalid image data';
  }
  if (!dims?.width || !dims?.height) return 'Could not determine image dimensions';
  const { width, height } = dims;
  if (width === expectedWidth && height === expectedHeight) return null;
  if (expectedWidth > 0 && expectedHeight > 0) {
    const expectedRatio = expectedWidth / expectedHeight;
    const ratioDiff = Math.abs(expectedRatio - width / height) / expectedRatio;
    if (ratioDiff <= tolerance) return null;
  }
  return `Image dimensions (${width}×${height}) do not match the required ${expectedWidth}×${expectedHeight} slot.`;
}

function sanitizeSocialLinks(payload) {
  const platform =
    typeof payload?.socialPlatform === 'string' ? payload.socialPlatform.trim().toLowerCase() : '';
  const url = typeof payload?.socialUrl === 'string' ? payload.socialUrl.trim().slice(0, 500) : '';
  // Explicit clear: both empty removes the links from the wall spot.
  if (!platform && !url) {
    return { socialPlatform: null, socialUrl: null };
  }
  if (!SOCIAL_PLATFORMS.includes(platform)) {
    return { error: `socialPlatform must be one of: ${SOCIAL_PLATFORMS.join(', ')}` };
  }
  const pattern = SOCIAL_PATTERNS[platform];
  if (!url.startsWith('https://') || !pattern.test(url)) {
    return { error: `socialUrl is not a valid ${platform} URL` };
  }
  return { socialPlatform: platform, socialUrl: url };
}

async function stageImage(accountId, parsed) {
  const ext = parsed.mimeType.split('/')[1];
  const safeName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const subdir = `tenant-requests/${accountId}`;
  const stored = await storeCreativeBuffer(subdir, safeName, parsed.buffer, parsed.mimeType);
  if (stored.url.startsWith('/uploads/')) {
    const dir = ensureUploadsDir(subdir);
    await writeWebpSibling(path.join(dir, safeName), parsed.buffer);
  }
  return stored.url;
}

function sanitizeRequest(row) {
  if (!row) return null;
  let payload = null;
  try {
    payload = row.payload ? JSON.parse(row.payload) : null;
  } catch {
    payload = null;
  }
  return {
    id: row.id,
    accountId: row.account_id,
    targetKind: row.target_kind,
    targetId: row.target_id,
    type: row.type,
    payload,
    status: row.status,
    reviewerNote: row.reviewer_note,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

/**
 * Create a change request against a resource the account owns. Validation
 * (ownership, status, payload shape, image dimensions, social URL patterns)
 * happens here; the change itself applies only on admin approval.
 */
async function createChangeRequest(account, { type, target, payload } = {}) {
  ensureSchema();
  if (!['image', 'social_links'].includes(type)) {
    throw portalError(400, "type must be 'image' or 'social_links'");
  }
  const targetId = parseInt(target, 10);
  if (Number.isNaN(targetId)) throw portalError(400, 'target must be a numeric id');

  let targetKind;
  let storedPayload;

  if (type === 'image') {
    targetKind = 'booking';
    const booking = await get(
      `SELECT b.*, s.name AS slot_name, s.width, s.height
         FROM bookings b JOIN ad_slots s ON b.slot_id = s.id
        WHERE b.id = $1`,
      [targetId]
    );
    if (!booking) throw portalError(404, 'Booking not found');
    if (normalizeEmail(booking.email) !== account.email) {
      throw portalError(403, 'You do not own this booking', 'not_owner');
    }
    if (!IMAGE_CHANGEABLE_STATUSES.includes(booking.status)) {
      throw portalError(400, `Cannot change the creative in status: ${booking.status}`);
    }
    const parsed = parseBase64Image(payload?.image);
    if (parsed.error) throw portalError(400, parsed.error);
    const filename =
      typeof payload?.filename === 'string' && payload.filename.trim()
        ? payload.filename.trim().slice(0, 200)
        : 'creative';
    // Same normalization as the direct upload path: EXIF rotate, center-crop
    // to the slot frame, downscale to 2×. Any sane photo fits.
    let finalBuffer;
    try {
      finalBuffer = await normalizeCreativeBuffer(parsed.buffer, booking.width, booking.height);
    } catch (err) {
      throw portalError(
        400,
        `We could not process this image (${err.message}). Try a different file.`
      );
    }
    const dimError = validateCreativeDimensions(finalBuffer, booking.width, booking.height);
    if (dimError) throw portalError(400, dimError);
    const creativePath = await stageImage(account.id, {
      ...parsed,
      buffer: finalBuffer,
      mimeType: 'image/png',
    });
    storedPayload = { creativePath, originalName: filename };
  } else {
    targetKind = 'patron';
    const patron = await get('SELECT * FROM patrons WHERE id = $1', [targetId]);
    if (!patron) throw portalError(404, 'Patron not found');
    if (normalizeEmail(patron.email) !== account.email) {
      throw portalError(403, 'You do not own this patron spot', 'not_owner');
    }
    if (patron.status !== 'active') {
      throw portalError(400, `Cannot change links in status: ${patron.status}`);
    }
    const links = sanitizeSocialLinks(payload);
    if (links.error) throw portalError(400, links.error);
    storedPayload = { socialPlatform: links.socialPlatform, socialUrl: links.socialUrl };
  }

  const id = await insert(
    `INSERT INTO tenant_change_requests (account_id, target_kind, target_id, type, payload)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [account.id, targetKind, targetId, type, JSON.stringify(storedPayload)]
  );
  return sanitizeRequest(await get('SELECT * FROM tenant_change_requests WHERE id = $1', [id]));
}

async function listChangeRequests(account) {
  ensureSchema();
  const rows = await all(
    'SELECT * FROM tenant_change_requests WHERE account_id = $1 ORDER BY created_at DESC LIMIT 200',
    [account.id]
  );
  return rows.map(sanitizeRequest);
}

// ─────────────────────────────────────────────────────────────
// Admin approval queue (unified admin portal)
// ─────────────────────────────────────────────────────────────

async function adminListChangeRequests({ status = null, limit = 100, offset = 0 } = {}) {
  ensureSchema();
  if (status && !['pending', 'approved', 'rejected'].includes(status)) {
    throw portalError(400, 'status must be one of: pending, approved, rejected');
  }
  const where = status ? 'WHERE r.status = $1' : '';
  const params = status ? [status] : [];
  params.push(limit, offset);
  const rows = await all(
    `SELECT r.*, a.email AS account_email
       FROM tenant_change_requests r
       JOIN tenant_accounts a ON a.id = r.account_id
       ${where}
      ORDER BY r.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const countParams = status ? [status] : [];
  const totalRow = await get(
    `SELECT COUNT(*) AS c FROM tenant_change_requests r ${where}`,
    countParams
  );

  // Attach a human-readable target label per row (bounded by limit).
  const items = [];
  for (const row of rows) {
    let target = null;
    if (row.target_kind === 'booking') {
      target = await get(
        `SELECT b.id, b.status, b.site_slug, b.creative_path, s.name AS slot_name
           FROM bookings b JOIN ad_slots s ON b.slot_id = s.id WHERE b.id = $1`,
        [row.target_id]
      );
    } else {
      target = await get(
        'SELECT id, temple_id, display_name, status, social_platform, social_url FROM patrons WHERE id = $1',
        [row.target_id]
      );
    }
    items.push({
      ...sanitizeRequest(row),
      accountEmail: row.account_email,
      target: target || null,
    });
  }
  return { items, total: toCount(totalRow?.c), limit, offset };
}

/**
 * Tenants directory for the unified admin portal (Leasing section). Lists
 * tenant_accounts and augments each row through the same ownership linkage
 * the tenant portal scopes by (bookings.email / patrons.email), so the admin
 * sees exactly the temples, bookings, and patron spots the tenant can see.
 * Read-only; N+1 is bounded by limit.
 */
async function adminListTenants({ limit = 100, offset = 0 } = {}) {
  ensureSchema();
  const rows = await all(
    `SELECT id, email, is_sponsor, is_patron, status, created_at, last_login_at
       FROM tenant_accounts
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const totalRow = await get('SELECT COUNT(*) AS c FROM tenant_accounts');

  const items = [];
  for (const row of rows) {
    const { bookings, patrons } = await linkTenantAccount(row.email);
    items.push({
      id: row.id,
      email: row.email,
      status: row.status,
      isSponsor: Boolean(row.is_sponsor),
      isPatron: Boolean(row.is_patron),
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      siteSlugs: [...new Set(bookings.map((b) => b.site_slug).filter(Boolean))],
      patronTempleIds: [...new Set(patrons.map((p) => p.temple_id).filter(Boolean))],
      bookingCount: bookings.length,
      patronCount: patrons.length,
    });
  }
  return { items, total: toCount(totalRow?.c), limit, offset };
}

/**
 * Approve or reject a pending request. Approval re-validates ownership and
 * applies the change to the real record (bookings creative swap / patrons
 * social links) inside the same transaction that marks the request reviewed,
 * so a partial apply is impossible. Audit-logged via admin_actions.
 */
async function reviewChangeRequest(id, action, { note = null, reviewer = null } = {}) {
  ensureSchema();
  if (!['approve', 'reject'].includes(action)) {
    throw portalError(400, "action must be 'approve' or 'reject'");
  }
  const row = await get(
    `SELECT r.*, a.email AS account_email
       FROM tenant_change_requests r
       JOIN tenant_accounts a ON a.id = r.account_id
      WHERE r.id = $1`,
    [id]
  );
  if (!row) throw portalError(404, 'Change request not found');
  if (row.status !== 'pending') {
    throw portalError(409, `Request is already ${row.status}`, 'already_reviewed');
  }
  const reviewerNote = typeof note === 'string' && note.trim() ? note.trim().slice(0, 500) : null;
  const reviewedBy = reviewer?.user?.id ?? null;

  if (action === 'reject') {
    const result = await run(
      `UPDATE tenant_change_requests
          SET status = 'rejected', reviewer_note = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND status = 'pending'`,
      [reviewerNote, reviewedBy, id]
    );
    if (result.changes === 0) throw portalError(409, 'Request is no longer pending');
  } else {
    const payload = JSON.parse(row.payload);
    await transaction(async ({ get: tGet, run: tRun }) => {
      // Defense in depth: the target must still exist, still belong to the
      // requesting account, and still accept creative changes at approval
      // time.
      if (row.target_kind === 'booking') {
        const booking = await tGet('SELECT id, email, status FROM bookings WHERE id = $1', [
          row.target_id,
        ]);
        if (!booking || normalizeEmail(booking.email) !== row.account_email) {
          throw portalError(409, 'Booking is no longer owned by this account', 'target_moved');
        }
        // The booking may have ended since the request was staged — never
        // apply a creative to a dead booking. Throwing rolls the transaction
        // back, so the request stays pending for an explicit reject.
        if (!IMAGE_CHANGEABLE_STATUSES.includes(booking.status)) {
          throw portalError(409, 'Booking is no longer accepting creative changes', 'target_moved');
        }
        await tRun(
          `UPDATE bookings
              SET creative_path = $1, creative_original_name = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3`,
          [payload.creativePath, payload.originalName || null, row.target_id]
        );
      } else {
        const patron = await tGet('SELECT id, email FROM patrons WHERE id = $1', [row.target_id]);
        if (!patron || normalizeEmail(patron.email) !== row.account_email) {
          throw portalError(409, 'Patron spot is no longer owned by this account', 'target_moved');
        }
        await tRun(
          `UPDATE patrons
              SET social_platform = $1, social_url = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3`,
          [payload.socialPlatform, payload.socialUrl, row.target_id]
        );
      }
      const marked = await tRun(
        `UPDATE tenant_change_requests
            SET status = 'approved', reviewer_note = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
          WHERE id = $3 AND status = 'pending'`,
        [reviewerNote, reviewedBy, id]
      );
      if (marked.changes === 0) throw portalError(409, 'Request is no longer pending');
    });
  }

  await logAction({
    adminUserId: reviewedBy,
    action: `portal.tenant-request.${action}`,
    target: `tenant_change_requests:${id}`,
    meta: {
      type: row.type,
      targetKind: row.target_kind,
      targetId: row.target_id,
      accountEmail: row.account_email,
      note: reviewerNote,
      by: reviewer?.user?.email,
    },
  });

  return sanitizeRequest(await get('SELECT * FROM tenant_change_requests WHERE id = $1', [id]));
}

module.exports = {
  SESSION_TTL_MS,
  TOKEN_TTL_MS,
  ensureSchema,
  normalizeEmail,
  getAccountByEmail,
  getAccountById,
  sanitizeAccount,
  linkTenantAccount,
  provisionTenantAccount,
  issueToken,
  setPassword,
  login,
  logout,
  forgot,
  resolveAccount,
  requireAccount,
  bearerToken,
  createSession,
  deleteSession,
  deleteSessionsForUser,
  getMe,
  getBookingEventStats,
  getSpaceAnalytics,
  getTempleAnalytics,
  getSlotAnalytics,
  getSiteAnalytics,
  publishOwnBooking,
  pauseOwnBooking,
  updateOwnBookingMeta,
  createChangeRequest,
  listChangeRequests,
  adminListChangeRequests,
  adminListTenants,
  reviewChangeRequest,
};
