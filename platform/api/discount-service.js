/**
 * PuniCodex — Discount codes for temple SPONSORSHIPS (ad-slot bookings).
 *
 * Scope: sponsorship bookings only. This system NEVER touches patrons —
 * patron subscriptions (platform/api/patron-service.js) have their own
 * checkout and no code path here accepts, prices, or redeems a patron
 * context. `validateCode` hard-rejects one defensively.
 *
 * Flow: a sponsor quotes a code on their application (stored on
 * bookings.discount_code, unvalidated beyond shape). When an admin approves
 * the application, admin-booking-service#approveApplication re-validates the
 * code authoritatively, adjusts the Stripe checkout terms via computePrice,
 * and records a redemption. A code that died since application never blocks
 * approval — the booking falls back to full price with an admin note.
 *
 * Term math per kind (computePrice; `priceCents` is the caller's base —
 * the monthly slot price from the public validator, the lease total from
 * approveApplication):
 *   percent_off           → finalCents = round(price × (1 − percent/100))
 *   fixed_off             → finalCents = max(0, price − fixed_cents)
 *   free_months           → price unchanged; freeMonths added to the trial
 *   free_months_then_price→ freeMonths at $0, then then_price_cents/mo
 *                           (then_price must be below the regular price)
 *   trial_extension       → price unchanged; freeMonths extend the trial
 */

const { get, all, run, insert, transaction, isPostgres } = require('../db/operational');
const { runMigration } = require('../db/migrate-discount-codes');
const { logAction } = require('./admin-actions');

const KINDS = [
  'percent_off',
  'fixed_off',
  'free_months_then_price',
  'free_months',
  'trial_extension',
];

// Cold-start schema. SQLite: run the idempotent migration on the shared
// connection. Postgres deployments apply platform/db/migrate-discount-codes.js
// out of band (same convention as the patrons schema), so there is nothing
// to do here.
let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  schemaReady = true;
  if (!isPostgres()) runMigration();
}

function discountError(status, message, code) {
  return Object.assign(new Error(message), { status, code });
}

function sanitizeCode(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, 40);
  return trimmed || null;
}

function sanitizeAppliesTo(value) {
  if (value == null || value === '' || value === 'all') return 'all';
  const slug = String(value).trim().toLowerCase();
  return /^[a-z0-9-]{1,64}$/.test(slug) ? slug : null;
}

function toInt(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * Pure term math. Returns { originalCents, finalCents, freeMonths,
 * thenPriceCents } or null when the terms are internally invalid (missing
 * fields, then_price not below the price). leaseMonths is accepted for
 * caller context; the math itself is per-base-amount and lease-independent.
 */
function computePrice({ priceCents, kind, percent, fixedCents, freeMonths, thenPriceCents }) {
  const base = Math.max(0, Math.round(Number(priceCents) || 0));
  const pricing = { originalCents: base, finalCents: base, freeMonths: 0, thenPriceCents: null };

  switch (kind) {
    case 'percent_off': {
      const p = Number(percent);
      // 100% is legitimate: it reduces a term to nil and routes approval
      // down the complimentary (zero-payment, no-Stripe) path.
      if (!(p > 0 && p <= 100)) return null;
      pricing.finalCents = Math.round(base * (1 - p / 100));
      return pricing;
    }
    case 'fixed_off': {
      const fixed = toInt(fixedCents);
      if (fixed == null || fixed < 1) return null;
      pricing.finalCents = Math.max(0, base - fixed);
      return pricing;
    }
    case 'free_months': {
      const free = toInt(freeMonths);
      if (free == null || free < 1) return null;
      // Complimentary term: N months free, no card, no checkout, no renewal —
      // the placement activates on approval and ends with the term.
      pricing.finalCents = 0;
      pricing.freeMonths = free;
      return pricing;
    }
    case 'trial_extension': {
      const free = toInt(freeMonths);
      if (free == null || free < 1) return null;
      // Trial months on a carded subscription: full price, billing starts
      // after the extended trial.
      pricing.finalCents = base;
      pricing.freeMonths = free;
      return pricing;
    }
    case 'free_months_then_price': {
      const free = toInt(freeMonths);
      const then = toInt(thenPriceCents);
      // then_price is per month and must undercut the regular (monthly) price.
      if (free == null || free < 1 || then == null || then < 1 || then >= base) {
        return null;
      }
      pricing.finalCents = then;
      pricing.freeMonths = free;
      pricing.thenPriceCents = then;
      return pricing;
    }
    default:
      return null;
  }
}

/**
 * Authoritative code check. Failures return { valid:false, reason } with an
 * internal reason string — public callers must normalize every failure to a
 * single generic reason so the response never reveals whether a code exists.
 */
async function validateCode({ code, siteSlug, leaseMonths = 1, priceCents, slotId = null, context = 'booking' }) {
  await ensureSchema();
  const invalid = (reason) => ({ valid: false, reason });

  // Patronage is a separate product with its own checkout; discount codes
  // exist for sponsorship bookings only.
  if (context !== 'booking') return invalid('patron_context');

  const normalized = sanitizeCode(code);
  if (!normalized) return invalid('unknown_code');

  const row = await get('SELECT * FROM discount_codes WHERE code = $1', [normalized]);
  if (!row) return invalid('unknown_code');
  if (!row.active) return invalid('inactive');
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return invalid('expired');
  }
  if (row.max_uses != null && row.used_count >= row.max_uses) {
    return invalid('max_uses_reached');
  }
  if (row.applies_to !== 'all' && row.applies_to !== siteSlug) {
    return invalid('temple_mismatch');
  }

  // Slot-level scoping: when the code names specific slots, the booking must
  // target one of them. NULL applies_slots means every slot of the temple.
  if (row.applies_slots) {
    let allowed = [];
    try {
      allowed = JSON.parse(row.applies_slots) || [];
    } catch {
      allowed = [];
    }
    if (allowed.length > 0 && !allowed.map(Number).includes(Number(slotId))) {
      return invalid('slot_restricted');
    }
  }

  const terms = {
    kind: row.kind,
    percent: row.percent,
    fixedCents: row.fixed_cents,
    freeMonths: row.free_months,
    thenPriceCents: row.then_price_cents,
  };
  const pricing = computePrice({ priceCents, leaseMonths, ...terms });
  if (!pricing) return invalid('invalid_terms');

  return { valid: true, code: row.code, codeId: row.id, terms, pricing };
}

// ─── Admin: list / stats ────────────────────────────────────────

function parseSlots(row) {
  if (!row) return row;
  if (!row.applies_slots) return { ...row, applies_slots: null };
  try {
    return { ...row, applies_slots: JSON.parse(row.applies_slots) || null };
  } catch {
    return { ...row, applies_slots: null };
  }
}

async function listCodes({ limit = 100, offset = 0, includeInactive = false } = {}) {
  await ensureSchema();
  const where = includeInactive ? '' : 'WHERE active = 1';
  const [items, totalRow, statsRow, redemptions30dRow] = await Promise.all([
    all(
      `SELECT * FROM discount_codes ${where} ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    get(`SELECT COUNT(*) AS c FROM discount_codes ${where}`),
    get(
      `SELECT
         SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) AS active_codes,
         SUM(CASE WHEN active = 1 AND max_uses IS NOT NULL THEN max_uses - used_count ELSE 0 END) AS uses_remaining,
         SUM(CASE WHEN active = 1 AND max_uses IS NULL THEN 1 ELSE 0 END) AS unlimited_codes
       FROM discount_codes`
    ),
    get(
      `SELECT COUNT(*) AS c FROM discount_redemptions
       WHERE created_at >= $1`,
      [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()]
    ),
  ]);
  return {
    items: items.map(parseSlots),
    total: Number(totalRow?.c ?? 0),
    limit,
    offset,
    stats: {
      activeCodes: Number(statsRow?.active_codes ?? 0),
      redemptions30d: Number(redemptions30dRow?.c ?? 0),
      usesRemaining: Number(statsRow?.uses_remaining ?? 0),
      unlimitedCodes: Number(statsRow?.unlimited_codes ?? 0),
    },
  };
}

// ─── Admin: create ──────────────────────────────────────────────

/**
 * The price a code is checked against: the temple's bundle (Full Page
 * Takeover) slot price — the sponsorship application price. For 'all' codes
 * the cheapest bundle price across temples, so the terms stay valid
 * everywhere the code can be used.
 */
async function referencePriceCents(appliesTo) {
  if (appliesTo !== 'all') {
    const bundle = await get(
      'SELECT price_cents FROM ad_slots WHERE site_slug = $1 AND is_bundle = 1 ORDER BY price_cents DESC LIMIT 1',
      [appliesTo]
    );
    if (bundle) return bundle.price_cents;
    const any = await get(
      'SELECT MAX(price_cents) AS price_cents FROM ad_slots WHERE site_slug = $1',
      [appliesTo]
    );
    return any?.price_cents ?? null;
  }
  const bundle = await get(
    'SELECT MIN(price_cents) AS price_cents FROM ad_slots WHERE is_bundle = 1'
  );
  if (bundle?.price_cents != null) return bundle.price_cents;
  const any = await get('SELECT MIN(price_cents) AS price_cents FROM ad_slots');
  return any?.price_cents ?? null;
}

async function getCodeById(id) {
  return parseSlots(await get('SELECT * FROM discount_codes WHERE id = $1', [id]));
}

async function createCode(fields, actor) {
  await ensureSchema();
  const input = fields || {};

  const code = sanitizeCode(input.code);
  if (!code) throw discountError(400, 'code is required (1–40 characters)');

  const kind = String(input.kind || '');
  if (!KINDS.includes(kind)) {
    throw discountError(400, `kind must be one of: ${KINDS.join(', ')}`);
  }

  const appliesTo = sanitizeAppliesTo(input.appliesTo ?? input.applies_to);
  if (!appliesTo) throw discountError(400, 'appliesTo must be a temple slug or "all"');

  const percent = input.percent == null || input.percent === '' ? null : Number(input.percent);
  const fixedCents = toInt(input.fixedCents ?? input.fixed_cents);
  const freeMonths = toInt(input.freeMonths ?? input.free_months);
  const thenPriceCents = toInt(input.thenPriceCents ?? input.then_price_cents);
  const maxUses = toInt(input.maxUses ?? input.max_uses);
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 500) || null : null;
  const createdBy = actor?.user?.email ?? (typeof actor === 'string' ? actor : null);

  let expiresAt = null;
  if (input.expiresAt ?? input.expires_at) {
    const raw = String(input.expiresAt ?? input.expires_at).trim();
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw discountError(400, 'expiresAt must be a valid date');
    }
    expiresAt = parsed.toISOString();
  }

  if (maxUses != null && maxUses < 1) {
    throw discountError(400, 'maxUses must be at least 1');
  }

  // Optional slot-level scoping: a non-empty array of ad_slots.id the code is
  // valid for within its temple. Null/absent means every slot of the temple.
  let appliesSlots = null;
  if (input.appliesSlots != null && input.appliesSlots !== '') {
    if (!Array.isArray(input.appliesSlots)) {
      throw discountError(400, 'appliesSlots must be an array of slot ids');
    }
    const ids = [...new Set(input.appliesSlots.map(Number))];
    if (!ids.length || ids.length > 32 || !ids.every((n) => Number.isInteger(n) && n > 0)) {
      throw discountError(400, 'appliesSlots must be 1–32 positive integer slot ids');
    }
    if (appliesTo === 'all') {
      throw discountError(400, 'slot-scoped codes must name a temple (appliesTo)');
    }
    appliesSlots = JSON.stringify(ids);
  }

  if (kind === 'percent_off') {
    if (!(percent > 0)) throw discountError(400, 'percent is required for percent_off');
    if (percent < 1 || percent > 100) {
      throw discountError(400, 'percent must be between 1 and 100');
    }
  }
  if (kind === 'fixed_off' && (fixedCents == null || fixedCents < 1)) {
    throw discountError(400, 'fixedCents must be at least 1 for fixed_off');
  }
  if (
    (kind === 'free_months' || kind === 'trial_extension') &&
    (freeMonths == null || freeMonths < 1)
  ) {
    throw discountError(400, 'freeMonths must be at least 1');
  }
  if (kind === 'free_months_then_price') {
    if (freeMonths == null || freeMonths < 1) {
      throw discountError(400, 'freeMonths must be at least 1');
    }
    if (thenPriceCents == null || thenPriceCents < 1) {
      throw discountError(400, 'thenPriceCents must be at least 1');
    }
  }

  // Price-relative rules (fixed ≤ price, then_price < price) need the
  // temple's sponsorship price. A temple-scoped code for a temple with no
  // priced slots is rejected outright — it could never be redeemed.
  if (kind === 'fixed_off' || kind === 'free_months_then_price' || appliesTo !== 'all') {
    const reference = await referencePriceCents(appliesTo);
    if (reference == null) {
      throw discountError(400, `Unknown temple: ${appliesTo}`);
    }
    if (kind === 'fixed_off' && fixedCents > reference) {
      throw discountError(400, 'fixedCents cannot exceed the temple price');
    }
    if (kind === 'free_months_then_price' && thenPriceCents >= reference) {
      throw discountError(400, 'thenPriceCents must be below the temple price');
    }
  }

  let id;
  try {
    id = await insert(
      `INSERT INTO discount_codes
         (code, kind, percent, fixed_cents, free_months, then_price_cents, applies_to, applies_slots, max_uses, expires_at, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        code,
        kind,
        percent,
        fixedCents,
        freeMonths,
        thenPriceCents,
        appliesTo,
        appliesSlots,
        maxUses,
        expiresAt,
        note,
        createdBy,
      ]
    );
  } catch (err) {
    if (String(err.message).includes('UNIQUE') || err.code === '23505') {
      throw discountError(409, 'A code with this name already exists');
    }
    throw err;
  }

  await logAction({
    adminUserId: actor?.user?.id ?? null,
    action: 'portal.discount.create',
    target: `discount_code:${id}`,
    meta: { code, kind, appliesTo, by: createdBy },
  });

  return getCodeById(id);
}

// ─── Admin: toggle / delete / redemptions ───────────────────────

async function setCodeActive(id, active, actor) {
  await ensureSchema();
  const existing = await getCodeById(id);
  if (!existing) throw discountError(404, 'Discount code not found');
  await run('UPDATE discount_codes SET active = $1 WHERE id = $2', [active ? 1 : 0, id]);
  await logAction({
    adminUserId: actor?.user?.id ?? null,
    action: `portal.discount.${active ? 'activate' : 'deactivate'}`,
    target: `discount_code:${id}`,
    meta: { code: existing.code, by: actor?.user?.email ?? null },
  });
  return getCodeById(id);
}

async function deleteCode(id, actor) {
  await ensureSchema();
  const existing = await getCodeById(id);
  if (!existing) throw discountError(404, 'Discount code not found');
  if (existing.used_count > 0) {
    throw discountError(409, 'Code has redemptions and can only be deactivated');
  }
  await run('DELETE FROM discount_codes WHERE id = $1 AND used_count = 0', [id]);
  await logAction({
    adminUserId: actor?.user?.id ?? null,
    action: 'portal.discount.delete',
    target: `discount_code:${id}`,
    meta: { code: existing.code, by: actor?.user?.email ?? null },
  });
  return { deleted: true, id };
}

async function redemptions({ codeId, limit = 100, offset = 0 } = {}) {
  await ensureSchema();
  const code = await getCodeById(codeId);
  if (!code) throw discountError(404, 'Discount code not found');
  const [items, totalRow] = await Promise.all([
    all(
      `SELECT r.*, c.code AS code
       FROM discount_redemptions r
       JOIN discount_codes c ON c.id = r.code_id
       WHERE r.code_id = $1
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT $2 OFFSET $3`,
      [codeId, limit, offset]
    ),
    get('SELECT COUNT(*) AS c FROM discount_redemptions WHERE code_id = $1', [codeId]),
  ]);
  return { items, total: Number(totalRow?.c ?? 0), limit, offset };
}

// ─── Redemption (approval-time, atomic) ─────────────────────────

/**
 * Record a redemption and increment used_count atomically: a single guarded
 * UPDATE (… WHERE max_uses IS NULL OR used_count < max_uses) is the
 * cross-process backstop against over-redemption; the surrounding
 * transaction rolls the increment back if the redemption row cannot be
 * written. Returns { ok:false, reason } instead of throwing when the code
 * was exhausted by a concurrent approval.
 */
async function redeem({ codeId, bookingId, email, originalCents, finalCents }) {
  await ensureSchema();
  try {
    // operational.transaction discards the callback's return value (the
    // commit happens after fn resolves), so the id flows out via closure —
    // the same pattern bookings.js#createBooking uses.
    let redemptionId = null;
    await transaction(async ({ run: tRun, insert: tInsert }) => {
      const bumped = await tRun(
        `UPDATE discount_codes
         SET used_count = used_count + 1
         WHERE id = $1 AND (max_uses IS NULL OR used_count < max_uses)`,
        [codeId]
      );
      if (bumped.changes === 0) {
        throw discountError(409, 'Discount code usage limit reached', 'exhausted');
      }
      redemptionId = await tInsert(
        `INSERT INTO discount_redemptions (code_id, booking_id, email, original_cents, final_cents)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [codeId, bookingId, email || null, originalCents ?? null, finalCents ?? null]
      );
    });
    return { ok: true, redemptionId };
  } catch (err) {
    if (err.code === 'exhausted') return { ok: false, reason: 'max_uses_reached' };
    throw err;
  }
}

module.exports = {
  KINDS,
  computePrice,
  validateCode,
  listCodes,
  createCode,
  setCodeActive,
  deleteCode,
  redemptions,
  redeem,
  sanitizeCode,
};
