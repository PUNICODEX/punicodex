const { get, all, run, insert } = require('../db/operational');

const PATRON_TIER_DEFAULT_CENTS = 700; // $7.00 USD / month
const PATRON_TIER_MIN_CENTS = 500; // $5.00
const PATRON_TIER_MAX_CENTS = 1000; // $10.00
const PATRON_LIMIT_PER_TEMPLE = 20; // limited number of patrons per temple wall

function sanitizeDisplayName(name) {
  if (!name || typeof name !== 'string') return 'Anonymous Patron';
  const trimmed = name.trim().slice(0, 48);
  return trimmed || 'Anonymous Patron';
}

function sanitizeTitle(title) {
  if (!title || typeof title !== 'string') return null;
  return title.trim().slice(0, 48) || null;
}

function sanitizeMessage(message) {
  if (!message || typeof message !== 'string') return null;
  return message.trim().slice(0, 200) || null;
}

function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase().slice(0, 254);
}

const SOCIAL_PLATFORMS = {
  x: { label: 'X / Twitter', host: 'x.com' },
  instagram: { label: 'Instagram', host: 'instagram.com' },
  linkedin: { label: 'LinkedIn', host: 'linkedin.com' },
  tiktok: { label: 'TikTok', host: 'tiktok.com' },
  youtube: { label: 'YouTube', host: 'youtube.com' },
  github: { label: 'GitHub', host: 'github.com' },
  website: { label: 'Website', host: null },
};

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

function sanitizeSocialPlatform(platform) {
  if (!platform || typeof platform !== 'string') return null;
  const key = platform.trim().toLowerCase();
  return SOCIAL_PLATFORMS[key] ? key : null;
}

function sanitizeSocialUrl(platform, url) {
  if (!platform || !url || typeof url !== 'string') return null;
  const trimmed = url.trim().slice(0, 500);
  if (!trimmed.startsWith('https://')) return null;
  const pattern = SOCIAL_PATTERNS[platform];
  if (!pattern) return null;
  if (!pattern.test(trimmed)) return null;
  return trimmed;
}

function validateAmountCents(amountCents) {
  const cents = Number(amountCents) || PATRON_TIER_DEFAULT_CENTS;
  return Math.max(PATRON_TIER_MIN_CENTS, Math.min(PATRON_TIER_MAX_CENTS, cents));
}

async function isPatronLimitReached(templeId) {
  const count = await countActivePatronsByTemple(templeId);
  return count >= PATRON_LIMIT_PER_TEMPLE;
}

async function createPatronCheckoutRecord({
  templeId,
  email,
  displayName,
  title,
  message,
  amountCents,
  socialPlatform,
  socialUrl,
}) {
  const platform = sanitizeSocialPlatform(socialPlatform);
  const url = sanitizeSocialUrl(platform, socialUrl);

  const normalized = {
    templeId: String(templeId || '')
      .trim()
      .slice(0, 64),
    email: sanitizeEmail(email),
    displayName: sanitizeDisplayName(displayName),
    title: sanitizeTitle(title),
    message: sanitizeMessage(message),
    amountCents: validateAmountCents(amountCents),
    socialPlatform: platform,
    socialUrl: url,
  };

  if (!normalized.templeId) {
    throw Object.assign(new Error('templeId is required'), { status: 400 });
  }
  if (!normalized.email?.includes('@')) {
    throw Object.assign(new Error('valid email is required'), { status: 400 });
  }

  const limitReached = await isPatronLimitReached(normalized.templeId);
  if (limitReached) {
    throw Object.assign(
      new Error(
        `This temple has reached its limit of ${PATRON_LIMIT_PER_TEMPLE} patrons. Please check again later.`
      ),
      { status: 409 }
    );
  }

  const id = await insert(
    `INSERT INTO patrons (temple_id, email, display_name, title, message, amount_cents, social_platform, social_url, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_payment')
     RETURNING id`,
    [
      normalized.templeId,
      normalized.email,
      normalized.displayName,
      normalized.title,
      normalized.message,
      normalized.amountCents,
      normalized.socialPlatform,
      normalized.socialUrl,
    ]
  );

  return { id, ...normalized };
}

async function getPatronById(id) {
  return get('SELECT * FROM patrons WHERE id = $1', [id]);
}

async function getPatronByStripeSubscriptionId(stripeSubscriptionId) {
  return get('SELECT * FROM patrons WHERE stripe_subscription_id = $1', [stripeSubscriptionId]);
}

async function listActivePatronsByTemple(templeId) {
  return all(
    `SELECT id, temple_id, display_name, title, message, amount_cents, social_platform, social_url, started_at, created_at
     FROM patrons
     WHERE temple_id = $1 AND status = 'active'
     ORDER BY amount_cents DESC, started_at ASC`,
    [templeId]
  );
}

async function markPatronPaid(sessionId, stripeSubscriptionId, stripeCustomerId, amountCents) {
  const row = await get('SELECT * FROM patrons WHERE id = $1', [sessionId]);
  if (!row) return null;

  await run(
    `UPDATE patrons
     SET status = 'active',
         stripe_subscription_id = $1,
         stripe_customer_id = $2,
         amount_cents = $3,
         started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [stripeSubscriptionId, stripeCustomerId, amountCents, row.id]
  );

  return getPatronById(row.id);
}

async function cancelPatronBySubscriptionId(stripeSubscriptionId) {
  await run(
    `UPDATE patrons
     SET status = 'cancelled', ends_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE stripe_subscription_id = $1`,
    [stripeSubscriptionId]
  );
  return getPatronByStripeSubscriptionId(stripeSubscriptionId);
}

async function countActivePatronsByTemple(templeId) {
  const row = await get(
    "SELECT COUNT(*) as count FROM patrons WHERE temple_id = $1 AND status = 'active'",
    [templeId]
  );
  return row?.count || 0;
}

// ─────────────────────────────────────────────────────────────
// Admin operations (admin portal + /api/patrons admin subroutes)
// ─────────────────────────────────────────────────────────────

const PATRON_ADMIN_STATUSES = ['pending_payment', 'active', 'cancelled', 'expired'];

async function listPatrons({ templeId = null, status = null, limit = 100, offset = 0 } = {}) {
  const conditions = [];
  const params = [];
  if (templeId) {
    conditions.push(`temple_id = $${params.length + 1}`);
    params.push(templeId);
  }
  if (status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);
  return all(
    `SELECT * FROM patrons ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
}

async function countPatrons({ templeId = null, status = null } = {}) {
  const conditions = [];
  const params = [];
  if (templeId) {
    conditions.push(`temple_id = $${params.length + 1}`);
    params.push(templeId);
  }
  if (status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const row = await get(`SELECT COUNT(*) as count FROM patrons ${where}`, params);
  return row?.count || 0;
}

async function getPatronStats() {
  const byStatus = await all(`SELECT status, COUNT(*) as count FROM patrons GROUP BY status`);
  const counts = { pending_payment: 0, active: 0, cancelled: 0, expired: 0 };
  for (const row of byStatus) {
    counts[row.status] = row.count;
  }
  const mrrRow = await get(
    "SELECT COALESCE(SUM(amount_cents), 0) as mrr FROM patrons WHERE status = 'active'"
  );
  const templeRow = await get(
    "SELECT COUNT(DISTINCT temple_id) as count FROM patrons WHERE status = 'active'"
  );
  const mrrCents = mrrRow?.mrr || 0;
  return {
    total: counts.pending_payment + counts.active + counts.cancelled + counts.expired,
    pendingPayment: counts.pending_payment,
    active: counts.active,
    cancelled: counts.cancelled,
    expired: counts.expired,
    activeTemples: templeRow?.count || 0,
    estimatedMrrCents: mrrCents,
    estimatedMrrDollars: (mrrCents / 100).toFixed(2),
    limitPerTemple: PATRON_LIMIT_PER_TEMPLE,
  };
}

async function setPatronStatus(id, status) {
  if (!['cancelled', 'expired'].includes(status)) {
    throw Object.assign(new Error("status must be 'cancelled' or 'expired'"), { status: 400 });
  }
  const existing = await getPatronById(id);
  if (!existing) return null;
  await run(
    `UPDATE patrons
     SET status = $1, ends_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [status, id]
  );
  return getPatronById(id);
}

module.exports = {
  PATRON_TIER_DEFAULT_CENTS,
  PATRON_TIER_MIN_CENTS,
  PATRON_TIER_MAX_CENTS,
  PATRON_LIMIT_PER_TEMPLE,
  PATRON_ADMIN_STATUSES,
  createPatronCheckoutRecord,
  getPatronById,
  getPatronByStripeSubscriptionId,
  listActivePatronsByTemple,
  markPatronPaid,
  cancelPatronBySubscriptionId,
  countActivePatronsByTemple,
  isPatronLimitReached,
  listPatrons,
  countPatrons,
  getPatronStats,
  setPatronStatus,
};
