# Sponsorship Flow Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the seven sponsorship-flow defects (creative never going live, reserved slots opening the booking modal, stale "upload your creative" banner, My Placements 500, broken report-a-bug link) and raise the advertiser panel and admin creative review to enterprise grade (Creative Studio with in-frame preview, ad-copy editing, self-service publish/pause; admin Creative Review queue; Command dashboard notification surfacing).

**Architecture:** All changes extend the existing layers — `platform/api/bookings.js` (booking state machine), `platform/api/tenant-portal.js` (account service), `api/account/[[...slug]].js` (account router), `platform/api/admin-booking-service.js` + `platform/api-handlers/admin/portal/` (admin), `templates/flagship/flagship.js` (temple renderer), `account/` (advertiser panel, canonical), `platform/public/admin-portal/` (admin portal, canonical — root `admin-portal/` is GENERATED). No new frameworks; vanilla JS, CommonJS, existing `run/get/all/transaction/withSlotLock` DB helpers.

**Tech Stack:** Node 20+ CommonJS, better-sqlite3 (local) + Postgres/Neon (prod) behind `platform/db/operational.js`, vanilla JS frontends, plain `node --test` suites orchestrated by `test/run-all.js`.

## Global Constraints

- **Biome style:** 2-space indent, single quotes, semicolons, `require('node:…')` protocol, line width 100. Covered paths include `api/**`, `platform/**` (except `platform/scholars/taxonomy-data.js`), `test/**`. Run `npm run format` and `npm run lint` on changed files.
- **`account/` and `templates/flagship/` are not biome-covered** — match surrounding style exactly (ES5 `var`, string-concat HTML, `S.esc()` escaping in account pages; ES6 in flagship.js).
- **Canonical vs generated:** edit `platform/public/admin-portal/`, never root `admin-portal/`. Edit `templates/flagship/flagship.js`, never `sites/{id}/script.js`. `account/` is canonical.
- **`?v=` version bumps are mandatory** on every touched CSS/JS reference (immutable 1-year caching). Bump: `account/index.html` (sandbox.css→v=3, sandbox.js→v=3, index.js→v=3), `account/brand/index.html` (sandbox.css→v=3, sandbox.js→v=3, brand.js→v=4), every admin-portal page that references changed portal assets, and `templates/flagship/index.html` if flagship.css/flagship.js carry a `?v=`.
- **Security invariants:** sponsor-supplied strings (`company_name`, headings) render via `textContent`/property assignment or `S.esc()`/`Portal.escapeHtml` — never raw interpolation. Every new account endpoint must verify ownership via the booking's email vs `account.email` (the `linkTenantAccount` pattern). New admin endpoints must sit behind the portal auth middleware exactly like sibling handlers.
- **DB duality:** every query must run on both SQLite and Postgres (positional `$1` params via the operational helpers; no SQLite-only syntax in operational queries).
- **Tests:** mirror the setup of the existing tenant/booking suites (look at `test/store-checkout.test.js` and the tenant-portal-related suites listed in `test/run-all.js` for the exact DB bootstrap idiom). New suites must be registered in `test/run-all.js`.
- **After ALL tasks:** `npm run generate` (regenerates root `admin-portal/`, `sites/{id}/script.js`, data-version) then `npm test` must be green.

## Status Lifecycle Reference (existing, do not change)

`pending_application → pending_payment → pending_upload → pending_approval → approved → live` (+ `rejected`, `ended`). Slot status: `available / reserved / live`. New in this plan: advertiser-driven `approved ⇄ live` via publish/pause; admin `approve-live` composite action.

---

### Task 1: Postgres analytics column drift + resilient space analytics

**Files:**
- Modify: `platform/db/init-operational-postgres.js:201-207` (COLUMN_DRIFT list)
- Modify: `platform/api/tenant-portal.js:587-604` (`getSpaceAnalytics`)
- Test: `test/analytics-schema-drift.test.js` (create)

**Interfaces:**
- Consumes: existing `COLUMN_DRIFT` loop (`ALTER TABLE … ADD COLUMN IF NOT EXISTS`).
- Produces: `getSpaceAnalytics(account)` — unchanged shape; never throws because one booking's stats query failed (per-booking try/catch yields zeroed stats).

- [ ] **Step 1: Write the failing drift test**

Create `test/analytics-schema-drift.test.js`:

```js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// The Neon initializer's COLUMN_DRIFT backfill must cover every column that
// operational analytics queries reference but only SQLite migrations add.
// Regression guard for the "My placements: Internal server error" incident.
test('COLUMN_DRIFT covers analytics_events columns used by tenant analytics', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'platform', 'db', 'init-operational-postgres.js'),
    'utf8'
  );
  const required = [
    ['analytics_events', 'slot_slug'],
    ['analytics_events', 'visible_seconds'],
    ['analytics_events', 'visible_percent'],
  ];
  for (const [table, column] of required) {
    const needle = `table: '${table}', column: '${column}'`;
    assert.ok(
      src.includes(needle),
      `init-operational-postgres.js COLUMN_DRIFT is missing { ${needle} }`
    );
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/analytics-schema-drift.test.js`
Expected: FAIL — "COLUMN_DRIFT is missing { table: 'analytics_events', column: 'slot_slug' }"

- [ ] **Step 3: Add the drift entries**

In `platform/db/init-operational-postgres.js`, extend the `COLUMN_DRIFT` array (line 201-207):

```js
  const COLUMN_DRIFT = [
    { table: 'admin_sessions', column: 'admin_user_id', definition: 'INTEGER' },
    { table: 'admin_actions', column: 'admin_user_id', definition: 'INTEGER' },
    { table: 'admin_actions', column: 'target', definition: 'TEXT' },
    { table: 'admin_actions', column: 'meta', definition: 'TEXT' },
    { table: 'bookings', column: 'public_id', definition: 'TEXT' },
    // analytics_events columns added by SQLite-only migrations
    // (migrate-analytics-slot.js, migrate-booking-v4.js) — without these,
    // tenant analytics queries throw on Neon ("column does not exist") and
    // the advertiser panel's My Placements section 500s.
    { table: 'analytics_events', column: 'slot_slug', definition: 'TEXT' },
    { table: 'analytics_events', column: 'visible_seconds', definition: 'REAL' },
    { table: 'analytics_events', column: 'visible_percent', definition: 'REAL' },
  ];
```

- [ ] **Step 4: Harden getSpaceAnalytics per-booking**

In `platform/api/tenant-portal.js`, replace the loop body in `getSpaceAnalytics` (lines 587-604) so one failing booking degrades to zeros instead of 500ing the panel:

```js
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
  // patrons mapping below unchanged
```

(Keep the existing `patrons` mapping and `return` exactly as-is.)

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test test/analytics-schema-drift.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add platform/db/init-operational-postgres.js platform/api/tenant-portal.js test/analytics-schema-drift.test.js
git commit -m "fix(account): backfill analytics_events columns on Neon, isolate per-booking stats failures"
```

---

### Task 2: Temple slot click behaviour + bundle creative fallback

**Files:**
- Modify: `templates/flagship/flagship.js:79-88` (loadSlots), `:166-172` (hasOwnCreative), `:541-580` (click handler)
- Modify: `templates/flagship/flagship.css` (append toast styles)
- Test: `test/flagship-slots.test.js` (create)

**Interfaces:**
- Consumes: `/api/slots/?site={id}` payload (`status`, `creative_path`, `has_slot_creative`, `is_bundle`, `booking_id`, `current_booking_id`).
- Produces: `window.__punicodexSlots` unchanged; new module-level flag `slotsLoadFailed`; new `showSlotToast(message)`; click contract: modal opens **iff** resolved slot exists AND `slot.status === 'available'`.

- [ ] **Step 1: Write the failing test**

The click logic lives inline in a template with `{{TEMPLE_ID}}` placeholders, so the test asserts the source contract textually (same idiom as other template-guard tests in this repo — check `test/service-worker.test.js` for the pattern of reading a JS asset and asserting on its source):

Create `test/flagship-slots.test.js`:

```js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'templates', 'flagship', 'flagship.js'),
  'utf8'
);

test('booking modal only opens for available slots', () => {
  // The click handler must gate on the resolved slot status, so a reserved
  // or live slot never re-opens the reservation modal.
  assert.match(SRC, /slot\.status !== 'available'\)\s*return;/);
});

test('bundle member frames fall back to the booking-level creative', () => {
  assert.match(SRC, /slot\.has_slot_creative \|\| !!slot\.creative_path/);
});

test('slots API failure disables booking instead of a dead-end modal', () => {
  assert.match(SRC, /slotsLoadFailed\s*=\s*true/);
  assert.match(SRC, /showSlotToast\(/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/flagship-slots.test.js`
Expected: FAIL (all three assertions)

- [ ] **Step 3: Implement the flagship.js changes**

Three edits in `templates/flagship/flagship.js`:

(a) Track API failure — in the module state near `let currentUploadSlot = null;` (line ~76) add:

```js
let slotsLoadFailed = false;
```

and in `loadSlots()` (line 79-88):

```js
async function loadSlots() {
  try {
    const res = await fetch(`${API_BASE}/api/slots/?site={{TEMPLE_ID}}`);
    const data = await res.json();
    slotsData = data.slots || [];
    slotsLoadFailed = false;
    updateSlotUI();
  } catch (err) {
    slotsLoadFailed = true;
    console.error('[PUNICODEX] loadSlots failed:', err);
  }
}
```

(b) Bundle member creative fallback — line 170, replace:

```js
const hasOwnCreative = isBundleMember ? slot.has_slot_creative : !!slot.creative_path;
```

with:

```js
// Bundle members prefer their per-slot creative but fall back to the
// booking-level creative (the slots payload COALESCEs it into creative_path),
// so an approved takeover creative always renders in every member frame.
const hasOwnCreative = isBundleMember
  ? slot.has_slot_creative || !!slot.creative_path
  : !!slot.creative_path;
```

(c) Click handler — replace the handler at lines 559-580 with:

```js
// Brief, self-clearing notice for the rare case the slots API is unreachable.
let slotToastTimer = null;
function showSlotToast(message) {
  let toast = document.querySelector('.slot-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'slot-toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  if (slotToastTimer) clearTimeout(slotToastTimer);
  slotToastTimer = setTimeout(() => toast.classList.remove('visible'), 4000);
}

// Event: click an AVAILABLE frame to open booking. Reserved and live slots
// never open the modal — a live slot's creative is a real link out to the
// sponsor, and a reserved slot is simply inert.
document.addEventListener('click', (e) => {
  const slotEl = e.target.closest('.space-slot');
  if (!slotEl) return;
  // Don't intercept clicks on live ad links
  if (e.target.closest('a.space-live-ad')) return;

  let slot;
  if (slotEl.dataset.bundle === '1') {
    // Full-page takeover maps to the bundle slot.
    slot = slotsData.find(s => s.is_bundle === 1);
  } else {
    const sortOrder = parseInt(slotEl.dataset.space, 10);
    slot = slotsData.find(s => s.sort_order === sortOrder);
  }

  if (!slot) {
    // The slots API is the only source of truth for availability. When it
    // failed (or the slot is absent), never open the modal on DOM guesses —
    // the booking would fail at the server after the sponsor did all the work.
    if (slotsLoadFailed) {
      showSlotToast('Bookings are temporarily unavailable — please try again shortly.');
    }
    return;
  }
  if (slot.status !== 'available') return;

  openModal(slot);
});
```

Note: `buildSlotFromDom` (lines 541-556) becomes unused — delete the function as part of this edit.

- [ ] **Step 4: Toast styles**

Append to `templates/flagship/flagship.css`:

```css
/* Slot booking toast — API-unavailable notice */
.slot-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(12px);
  background: rgba(20, 18, 14, 0.92);
  color: #e8dcc4;
  border: 1px solid rgba(200, 169, 106, 0.4);
  border-radius: 10px;
  padding: 12px 20px;
  font-size: 14px;
  letter-spacing: 0.02em;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease, transform 0.25s ease;
  z-index: 10000;
}

.slot-toast.visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test test/flagship-slots.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add templates/flagship/flagship.js templates/flagship/flagship.css test/flagship-slots.test.js
git commit -m "fix(temple): never open booking modal on reserved/live slots; bundle creative fallback"
```

---

### Task 3: Booking publish/pause primitives in the state machine

**Files:**
- Modify: `platform/api/bookings.js:362-460` (`goLive` — make resume-safe), add `pause()` after it; extend `module.exports`
- Test: `test/booking-publish-pause.test.js` (create)

**Interfaces:**
- Consumes: existing `getBookingById`, `getSlotById`, `withSlotLock`, `transaction`, `getBundleMembers`-style cascade (see `goLive` lines 401-432), `BookingConflictError`.
- Produces:
  - `pause(bookingId)` → booking row. Throws `BookingConflictError` unless booking is `live`. Sets booking `live → approved`, keeps dates, sets the slot (and bundle members) `live → reserved` **keeping** `current_booking_id` so the frame stays held for this sponsor.
  - `goLive(bookingId)` — unchanged contract, but when `booking.started_at` is already set (re-publish after a pause) it preserves the original lease dates instead of resetting the lease window.

- [ ] **Step 1: Write the failing test**

Mirror the DB bootstrap idiom of the existing booking suites (read `test/store-checkout.test.js` header for the exact local-SQLite setup; reuse it). Create `test/booking-publish-pause.test.js` with these behaviors:

```js
// Behaviors to assert (exact setup mirrors test/store-checkout.test.js):
// 1. pause() on a live booking flips booking → 'approved' and slot → 'reserved',
//    keeping ad_slots.current_booking_id pointing at the booking.
// 2. pause() on an 'approved' booking throws BookingConflictError.
// 3. pause() on a live bundle booking cascades: every member slot goes
//    'reserved' and keeps current_booking_id.
// 4. goLive() on a booking that already has started_at set (republish after
//    pause) preserves started_at/ends_at instead of extending the lease.
// 5. goLive() first-time still sets started_at/ends_at as today.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/booking-publish-pause.test.js`
Expected: FAIL — "pause is not a function"

- [ ] **Step 3: Implement**

In `platform/api/bookings.js`, make `goLive` resume-safe. Replace the date computation (lines 389-399) and the booking UPDATE (lines 403-413):

```js
  // Resume-safe: a booking coming back from a pause keeps its original lease
  // window — pausing must never extend a lease.
  const resuming = Boolean(booking.started_at);
  const now = new Date();
  const nowIso = now.toISOString();
  const months = booking.lease_months || 1;
  const trialMonths = booking.trial_months || 0;
  const trialEnds = trialMonths > 0 ? addMonths(now, trialMonths) : now;
  const trialEndsIso = trialEnds.toISOString();
  const billingStartsIso = trialMonths > 0 ? trialEndsIso : nowIso;
  const ends = addMonths(now, months);
  const endsIso = ends.toISOString();

  const billingStatus = booking.billing_status || (trialMonths > 0 ? 'trialing' : 'active');

  const liveBooking = await withSlotLock(booking.slot_id, async () => {
    await transaction(async ({ all, run }) => {
      const bookingUpdate = resuming
        ? await run(
            `UPDATE bookings
             SET status = 'live', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status = 'approved'`,
            [bookingId]
          )
        : await run(
            `UPDATE bookings
             SET status = 'live', started_at = $1, ends_at = $2, trial_ends_at = $3, billing_starts_at = $4, billing_status = $5, updated_at = CURRENT_TIMESTAMP
             WHERE id = $6 AND status = 'approved'`,
            [nowIso, endsIso, trialEndsIso, billingStartsIso, billingStatus, bookingId]
          );
      if (bookingUpdate.changes === 0) {
        throw new BookingConflictError('Booking is no longer approved');
      }
      // … slot live + bundle cascade unchanged (lines 415-432)
```

Then add `pause` immediately after `goLive`:

```js
/**
 * Advertiser-initiated pause: live → approved, frames flip back to RESERVED
 * but keep current_booking_id, so the placement stays held for this sponsor
 * and goLive() can resume it without touching the lease dates.
 */
async function pause(bookingId) {
  const booking = await getBookingById(bookingId);
  if (!booking) throw Object.assign(new Error('Booking not found'), { status: 404 });
  if (booking.status !== 'live') {
    throw new BookingConflictError('Only a live booking can be paused');
  }
  const slot = await getSlotById(booking.slot_id);
  if (!slot) throw Object.assign(new Error('Slot not found'), { status: 404 });

  await withSlotLock(booking.slot_id, async () => {
    await transaction(async ({ all, run }) => {
      const bookingUpdate = await run(
        `UPDATE bookings SET status = 'approved', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'live'`,
        [bookingId]
      );
      if (bookingUpdate.changes === 0) {
        throw new BookingConflictError('Booking is no longer live');
      }
      await run(
        `UPDATE ad_slots SET status = 'reserved', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND current_booking_id = $2`,
        [booking.slot_id, bookingId]
      );
      if (slot.is_bundle === 1) {
        const memberRows = await all(
          'SELECT member_slot_id FROM bundle_members WHERE bundle_slot_id = $1',
          [booking.slot_id]
        );
        for (const member of memberRows) {
          await run(
            `UPDATE ad_slots SET status = 'reserved', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND current_booking_id = $2`,
            [member.member_slot_id, bookingId]
          );
        }
      }
    });
  });
  return getBookingById(bookingId);
}
```

Add `pause` to `module.exports` (next to `goLive`).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/booking-publish-pause.test.js`
Expected: PASS (5 behaviors)

- [ ] **Step 5: Commit**

```bash
git add platform/api/bookings.js test/booking-publish-pause.test.js
git commit -m "feat(bookings): advertiser pause + resume-safe goLive"
```

---

### Task 4: Account endpoints — publish, pause, meta edit

**Files:**
- Modify: `platform/api/tenant-portal.js` (new service functions + `getMe` enrichment + exports)
- Modify: `api/account/[[...slug]].js` (new routes)
- Test: `test/account-booking-controls.test.js` (create)

**Interfaces:**
- Consumes: `pause`/`goLive` from `./bookings` (Task 3); `validateMeta` from `./booking-validation`; `linkTenantAccount`; `notifyLive` from `./email` (same notify the admin go-live path uses — read its exact signature at `platform/api/admin-booking-service.js:490-499`).
- Produces (all take the authenticated `account` as first arg and throw `portalError(status, message, code)`):
  - `publishOwnBooking(account, bookingId)` → `{ success: true, status: 'live' }`. Requires ownership + status `approved`; calls `goLive(bookingId)`; sends `notifyLive` (fire-and-forget, `.catch(() => {})`).
  - `pauseOwnBooking(account, bookingId)` → `{ success: true, status: 'approved' }`. Requires ownership + status `live`; calls `pause(bookingId)`.
  - `updateOwnBookingMeta(account, bookingId, { customHeading, customSubtitle, websiteUrl })` → `{ success: true }`. Ownership-checked; reuses the re-review rule: editing a `live`/`approved` booking flips it to `pending_approval`.
  - `getMe(account)` bookings gain: `hasCreative` (bool), `pendingImageRequest` (bool), `customHeading`, `customSubtitle`.

- [ ] **Step 1: Write the failing test**

Create `test/account-booking-controls.test.js` mirroring the DB bootstrap of the existing tenant-portal/booking suites. Behaviors:

```js
// 1. publishOwnBooking: owned + approved + creative → live; slot live.
// 2. publishOwnBooking: booking owned by another email → 403 not_owner.
// 3. publishOwnBooking: status 'pending_upload' → 400/409 conflict.
// 4. pauseOwnBooking: live booking → approved; slot reserved, current_booking_id kept.
// 5. updateOwnBookingMeta: sets custom_heading/custom_subtitle/website_url on an
//    owned non-bundle booking; a 'live' booking flips to 'pending_approval'.
// 6. updateOwnBookingMeta: heading over the slot's char limit (validateMeta) → 400.
// 7. updateOwnBookingMeta: websiteUrl not starting with https:// → 400.
// 8. getMe: booking with a pending image change request reports
//    pendingImageRequest: true; booking with slot_creatives-only creative
//    reports hasCreative: true.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/account-booking-controls.test.js`
Expected: FAIL — functions not exported

- [ ] **Step 3: getMe enrichment**

In `platform/api/tenant-portal.js`:

(a) Extend the bookings SELECT in `linkTenantAccount` (lines 136-145) — add `b.custom_heading, b.custom_subtitle` and the creative-existence subselect:

```js
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
```

(b) In `getMe` (line 445), fetch pending image requests once and flag bookings:

```js
async function getMe(account) {
  const { bookings, patrons } = await linkTenantAccount(account.email);
  const pendingImageRows = await all(
    `SELECT target_id FROM tenant_change_requests
      WHERE account_id = $1 AND type = 'image' AND status = 'pending'`,
    [account.id]
  );
  const pendingImageTargets = new Set(pendingImageRows.map((r) => r.target_id));
  // … existing isSponsor/isPatron self-heal unchanged …
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
        dashboardToken: b.analytics_token || null,
      })),
      // patrons mapping unchanged
```

(c) New service functions (place after `getSlotAnalytics`, before the admin queue section). Add at the top of the file: `const { goLive, pause } = require('./bookings');` and `const { validateMeta } = require('./booking-validation');` and the email import matching the existing admin path (`notifyLive` — check `platform/api/email.js` exports; the admin service requires it, mirror that require).

```js
// ─────────────────────────────────────────────────────────────
// Advertiser self-service controls (ownership-scoped)
// ─────────────────────────────────────────────────────────────

async function getOwnedBooking(account, bookingId) {
  ensureSchema();
  const id = parseInt(bookingId, 10);
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
async function updateOwnBookingMeta(account, bookingId, { customHeading, customSubtitle, websiteUrl } = {}) {
  const booking = await getOwnedBooking(account, bookingId);
  if (!['pending_upload', 'pending_approval', 'approved', 'live', 'rejected'].includes(booking.status)) {
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
  if (['live', 'approved'].includes(booking.status)) {
    sets.push(`status = $${params.length + 1}`);
    params.push('pending_approval');
  }
  if (sets.length === 0) return { success: true };
  params.push(booking.id);
  await run(
    `UPDATE bookings SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length}`,
    params
  );
  // If the booking was live, the frames must stop serving until re-approval:
  // flip the slot(s) back to reserved (same shape as pause(), inline here to
  // keep the re-review transition atomic with the copy change).
  if (booking.status === 'live') {
    await run(
      `UPDATE ad_slots SET status = 'reserved', updated_at = CURRENT_TIMESTAMP
       WHERE current_booking_id = $1`,
      [booking.id]
    );
  }
  return { success: true };
}
```

Add `publishOwnBooking`, `pauseOwnBooking`, `updateOwnBookingMeta` to `module.exports`.

- [ ] **Step 4: Wire the router**

In `api/account/[[...slug]].js`, add a section after the Change requests block (after line 131):

```js
    // ── Booking controls (publish / pause / ad copy) ──────────
    if (slugParts[0] === 'bookings' && slugParts.length === 3 && req.method === 'POST') {
      const account = await tenantPortal.requireAccount(req, res);
      if (!account) return;
      const bookingId = slugParts[1];
      if (slugParts[2] === 'publish') {
        return res.json(await tenantPortal.publishOwnBooking(account, bookingId));
      }
      if (slugParts[2] === 'pause') {
        return res.json(await tenantPortal.pauseOwnBooking(account, bookingId));
      }
      if (slugParts[2] === 'meta') {
        const { customHeading, customSubtitle, websiteUrl } = body;
        return res.json(
          await tenantPortal.updateOwnBookingMeta(account, bookingId, {
            customHeading,
            customSubtitle,
            websiteUrl,
          })
        );
      }
    }
```

Also update the header comment block (lines 7-19) with three lines documenting the new routes.

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test test/account-booking-controls.test.js`
Expected: PASS (8 behaviors)

- [ ] **Step 6: Commit**

```bash
git add platform/api/tenant-portal.js api/account/[[...slug]].js test/account-booking-controls.test.js
git commit -m "feat(account): advertiser publish/pause/ad-copy endpoints + enriched /me payload"
```

---

### Task 5: Overview banner fix (advertiser panel)

**Files:**
- Modify: `account/index.js:37-76` (`renderActions`), `:23` (status list stays)
- Modify: `account/index.html:15,72-73,84-85` (version bumps + report-a-bug fix)
- Test: covered by Task 4's `getMe` contract tests + `test/flagship-slots.test.js`-style source assertion below

**Interfaces:**
- Consumes: `getMe` payload fields from Task 4 (`hasCreative`, `pendingImageRequest`, `customHeading`, `customSubtitle`).
- Produces: four honest banner states; publish button wiring calling `POST /api/account/bookings/:id/publish/`.

- [ ] **Step 1: Rewrite renderActions**

Replace `renderActions` in `account/index.js` (lines 37-76) with:

```js
  /**
   * The top-of-page action area. Four honest states, driven by the enriched
   * /me payload (hasCreative, pendingImageRequest):
   *   - a creative is genuinely missing            → gold action banner
   *   - a creative is staged in the review queue   → calm "under review" note
   *   - approved with a creative but not live yet  → publish call-to-action
   *   - live                                        → no banner
   */
  function renderActions(bookings) {
    var wrap = document.getElementById('overview-actions');
    var hasCreative = function (b) {
      return b.hasCreative || !!b.creativePath;
    };
    var awaiting = bookings.filter(function (b) {
      return IMAGE_CHANGEABLE_STATUSES.indexOf(b.status) !== -1 && !hasCreative(b) && !b.pendingImageRequest;
    });
    var inReview = bookings.filter(function (b) {
      return (
        b.pendingImageRequest ||
        (b.status === 'pending_approval' && hasCreative(b))
      );
    });
    var publishable = bookings.filter(function (b) {
      return b.status === 'approved' && hasCreative(b);
    });
    var html = '';
    if (awaiting.length) {
      html +=
        '<div class="sb-action-banner" role="alert">' +
        '<span class="sb-action-glyph" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M12 16V4"></path><path d="m6 10 6-6 6 6"></path><path d="M4 20h16"></path>' +
        '</svg></span>' +
        '<div class="sb-action-body">' +
        '<h2>Action needed — upload your creative</h2>' +
        '<p>' + slotList(awaiting) + (awaiting.length === 1 ? ' is' : ' are') +
        ' approved but ha' + (awaiting.length === 1 ? 's' : 've') +
        ' no creative yet — the placement can’t go live until you upload one.</p>' +
        '</div>' +
        '<a class="sb-btn sb-btn-primary" href="/account/brand/">Upload creative</a>' +
        '</div>';
    }
    if (publishable.length) {
      html +=
        '<div class="sb-action-banner" role="alert">' +
        '<span class="sb-action-glyph" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        '<polygon points="6 3 20 12 6 21 6 3"></polygon>' +
        '</svg></span>' +
        '<div class="sb-action-body">' +
        '<h2>Approved — publish when you’re ready</h2>' +
        '<p>' + slotList(publishable) + (publishable.length === 1 ? ' has' : ' have') +
        ' an approved creative. Nothing appears on the temple until you publish.</p>' +
        '</div>' +
        '<button type="button" class="sb-btn sb-btn-primary" id="sb-publish-all">Publish now</button>' +
        '</div>';
    }
    if (inReview.length) {
      html +=
        '<div class="sb-action-banner info" role="status">' +
        '<span class="sb-action-glyph" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>' +
        '</svg></span>' +
        '<div class="sb-action-body">' +
        '<h2>Creative under review by the PuniCodex team</h2>' +
        '<p>' + slotList(inReview) + ' — we’ll email you the moment it’s approved. No action needed from you.</p>' +
        '</div>' +
        '</div>';
    }
    wrap.innerHTML = html;

    var publishBtn = document.getElementById('sb-publish-all');
    if (publishBtn) {
      publishBtn.addEventListener('click', async function () {
        publishBtn.disabled = true;
        publishBtn.textContent = 'Publishing…';
        try {
          for (var i = 0; i < publishable.length; i++) {
            await S.api('/api/account/bookings/' + publishable[i].id + '/publish/', { method: 'POST', body: {} });
          }
          window.location.reload();
        } catch (err) {
          publishBtn.disabled = false;
          publishBtn.textContent = 'Publish now';
          alert(err.message || 'Could not publish — please try again.');
        }
      });
    }
  }
```

- [ ] **Step 2: Fix report-a-bug + version bumps in account/index.html**

Line 72-73: replace the mailto with the contact page:

```html
        <a class="sb-panel sb-panel-link" href="/contact/">
          <h3>Report a bug →</h3>
```

(keep the existing `<p>` description under it; if it mentions email, reword to "Tell us what broke — the contact form reaches the team directly.")

Version bumps: `sandbox.css?v=2` → `?v=3`, `sandbox.js?v=2` → `?v=3`, `index.js?v=2` → `?v=3`.

- [ ] **Step 3: Fix the shared empty-state mailto**

In `account/sandbox.js` `emptyHero()` (line 248), replace:

```js
      '<a href="mailto:support@punicodex.com?subject=Advertiser%20panel%20—%20bug%20report">report a bug</a>.</p>' +
```

with:

```js
      '<a href="/contact/">report a bug</a>.</p>' +
```

- [ ] **Step 4: Source-contract test**

Add to `test/flagship-slots.test.js`… no — create `test/account-overview.test.js`:

```js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const indexJs = fs.readFileSync(path.join(__dirname, '..', 'account', 'index.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'account', 'index.html'), 'utf8');
const sandboxJs = fs.readFileSync(path.join(__dirname, '..', 'account', 'sandbox.js'), 'utf8');

test('overview banner consults staged change requests and hasCreative', () => {
  assert.match(indexJs, /b\.pendingImageRequest/);
  assert.match(indexJs, /b\.hasCreative/);
});

test('approved + creative placements get a publish call-to-action', () => {
  assert.match(indexJs, /sb-publish-all/);
  assert.match(indexJs, /\/api\/account\/bookings\/' \+ publishable\[i\]\.id \+ '\/publish\//);
});

test('no raw mailto: bug-report links (dead without a mail client)', () => {
  assert.ok(!indexHtml.includes('mailto:'), 'account/index.html still has a mailto link');
  assert.ok(!sandboxJs.includes('mailto:'), 'account/sandbox.js still has a mailto link');
});
```

Run: `node --test test/account-overview.test.js` — expect PASS after the edits.

- [ ] **Step 5: Commit**

```bash
git add account/index.js account/index.html account/sandbox.js test/account-overview.test.js
git commit -m "fix(account): honest action-banner states, publish CTA, working report-a-bug link"
```

---

### Task 6: Advertiser Creative Studio (brand page rewrite)

**Files:**
- Rewrite: `account/brand/brand.js` (full rewrite)
- Modify: `account/brand/index.html` (page copy + version bumps)
- Modify: `account/sandbox.css` (append studio styles)
- Test: `test/creative-studio.test.js` (create)

**Interfaces:**
- Consumes: `GET /api/account/me/` (enriched bookings, Task 4), `GET|POST /api/account/requests/`, `POST /api/account/bookings/:id/meta|publish|pause/` (Task 4), `window.CreativeNormalize.normalizeCreative(file, w, h)`, `window.Sandbox` helpers.
- Produces: per-placement studio cards; one upload zone per card; ad-copy editor; publish/pause control; status timeline.

This is the flagship UX task. Structure of the rewritten `brand.js`:

- [ ] **Step 1: Studio card renderer**

One card per booking in `STUDIO_STATUSES = ['pending_upload', 'pending_approval', 'approved', 'live', 'rejected']`. Each card (ES5 style, string concat, `S.esc` everywhere sponsor data renders):

```
┌ .sb-panel.sb-studio ────────────────────────────────────────┐
│ header: slotName · temple link · statusBadge                │
│ status timeline: Applied → Paid → Creative → Approved → Live│
│   (ol.steps; each li done/current/todo per booking.status)  │
│ .sb-studio-grid:                                            │
│   left: .sb-frame-preview — aspect-ratio:width/height box;  │
│         contains current creative img OR staged preview OR  │
│         empty-frame placeholder; overlaid heading/subtitle  │
│         exactly as the temple renders them (.space-meta     │
│         equivalent), plus a "live preview" link to the      │
│         temple when status==='live'                         │
│   right: controls column:                                   │
│     1. upload zone (.sb-dropzone, drag&drop + file input,   │
│        CreativeNormalize on select, staged image swaps into │
│        the frame preview, note text as today)               │
│     2. ad copy form: heading input (maxlength from slot     │
│        width via the same tiers as getCharLimits: ≥1000→60, │
│        ≥500→36, ≥300→24, else 12), subtitle (100/60/40/20), │
│        destination URL input; prefilled from customHeading/ │
│        customSubtitle/websiteUrl; live char counters        │
│     3. action row (status-dependent):                       │
│        pending_upload/no creative → "Submit for Review"     │
│        (upload)                                               │
│        pending_approval → note "In review — we'll email you"│
│        approved + creative → [Publish] [Save copy] [upload] │
│        live → [Pause] [Save copy] [Replace creative]        │
│        rejected → re-upload allowed                         │
│     4. .sb-form-message per card                            │
└─────────────────────────────────────────────────────────────┘
```

Behavioral requirements (all testable):

- **One upload area** per card. Whether the booking has a creative or not, the same dropzone handles it; the button label is the only thing that changes ("Upload creative" / "Replace creative").
- Staged upload renders **in the frame preview** before submission — "what you see is what runs", replacing the separate `sb-upload-preview` img.
- Submit posts the existing change-request contract: `POST /api/account/requests/` `{type:'image', target: bookingId, payload:{image: dataUrl, filename}}`.
- Copy save posts `POST /api/account/bookings/{id}/meta/` `{customHeading, customSubtitle, websiteUrl}`; on success show "Saved — live/approved placements go back through review before changes appear." when the booking was live/approved, else "Saved."
- Publish posts `…/publish/`, Pause posts `…/pause/`; on success re-init the page state (re-fetch `/me` and re-render the card).
- Bundle bookings: copy form shows only the destination URL field with a note "Per-frame headlines for takeovers are set by the team — tell us via the request history if you need them changed." (website_url edits still allowed).
- Patron social-link forms and Request History section: port over unchanged from the current `brand.js` (lines 62-83, 175-248).

- [ ] **Step 2: Page + styles**

`account/brand/index.html`:
- `<title>Creative Studio — Sponsor Sandbox · PuniCodex</title>`
- Page head: `<h1>Creative Studio</h1>`, sub: "Design, preview, publish — every placement, exactly as it will appear on the temple."
- Section heading "Placements" instead of "Request a Change"; keep Request History section verbatim.
- Version bumps: `sandbox.css?v=3`, `sandbox.js?v=3`, `brand.js?v=4`.

`account/sandbox.css` — append studio styles: `.sb-studio`, `.sb-studio-grid` (2-col, collapses to 1-col ≤900px), `.sb-frame-preview` (aspect-ratio via inline style, dark frame, gold 1px border matching `.sb-panel` aesthetic, overlay caption bar), `.sb-dropzone` (dashed gold border, hover/focus state, `.dragover` highlight), `.sb-steps` timeline (flex row, dots + connecting line, `.done` gold, `.current` pulsing, `.todo` dim), `.sb-char-count` (matches existing form-hint style). Match the existing palette/spacing tokens already in the file — do not introduce new colors.

- [ ] **Step 3: Source-contract test**

Create `test/creative-studio.test.js`:

```js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const brandJs = fs.readFileSync(path.join(__dirname, '..', 'account', 'brand', 'brand.js'), 'utf8');
const brandHtml = fs.readFileSync(path.join(__dirname, '..', 'account', 'brand', 'index.html'), 'utf8');
const sandboxCss = fs.readFileSync(path.join(__dirname, '..', 'account', 'sandbox.css'), 'utf8');

test('single unified upload zone per placement (no separate replace section)', () => {
  // The old dual-card split rendered "Upload creative — " and
  // "Replace creative — " as two different cards; the studio has one zone.
  assert.ok(!brandJs.includes("'Upload creative — '"), 'old upload card title still present');
  assert.match(brandJs, /sb-dropzone/);
});

test('studio edits ad copy through the account meta endpoint', () => {
  assert.match(brandJs, /\/api\/account\/bookings\//);
  assert.match(brandJs, /\/meta\//);
});

test('studio exposes publish and pause controls', () => {
  assert.match(brandJs, /\/publish\//);
  assert.match(brandJs, /\/pause\//);
});

test('staged upload previews inside the frame (what you see is what runs)', () => {
  assert.match(brandJs, /CreativeNormalize\.normalizeCreative/);
  assert.match(brandJs, /sb-frame-preview/);
});

test('studio styles exist and page versions bumped', () => {
  assert.match(sandboxCss, /\.sb-dropzone/);
  assert.match(sandboxCss, /\.sb-steps/);
  assert.match(brandHtml, /brand\.js\?v=4/);
  assert.match(brandHtml, /Creative Studio/);
});
```

Run: `node --test test/creative-studio.test.js` — FAIL before, PASS after.

- [ ] **Step 4: Commit**

```bash
git add account/brand/brand.js account/brand/index.html account/sandbox.css test/creative-studio.test.js
git commit -m "feat(account): Creative Studio — in-frame preview, ad copy editor, publish/pause"
```

---

### Task 7: Admin portal — Creative Review queue + approve-and-go-live

**Files:**
- Modify: `platform/api/admin-booking-service.js` (add `approveAndGoLive`)
- Create: `platform/api-handlers/admin/portal/bookings/[id]/approve-live/index.js`
- Modify: `platform/api-handlers/admin/portal/bookings/index.js:24-34` (add `pending_approval` to `BOOKING_STATUSES`)
- Modify: `platform/public/admin-portal/leasing/index.html` (filter option, stat card, new Creative Review tab)
- Test: `test/admin-creative-review.test.js` (create)

**Interfaces:**
- Consumes: `approveBooking`, `goLiveBooking` (`platform/api/admin-booking-service.js:409,468`); existing portal handler pattern (mirror `platform/api-handlers/admin/portal/bookings/[id]/golive/index.js` exactly for auth/shape); `listBookingsPortal` with `status` filter; `adminListChangeRequests({status:'pending'})`.
- Produces:
  - `approveAndGoLive(id, note, adminToken)` → `{ success: true, status: 'live' }` (approve then goLive, two audit entries).
  - `POST /api/admin/portal/bookings/:id/approve-live/` → same payload.

- [ ] **Step 1: Backend**

In `platform/api/admin-booking-service.js`, after `goLiveBooking`:

```js
/**
 * One-step creative approval + publication for reviewers who have already
 * judged the creative: approveBooking's audit + email, then goLive's.
 */
async function approveAndGoLive(id, note, adminToken) {
  await approveBooking(id, note, adminToken);
  return goLiveBooking(id, adminToken);
}
```

Export it. Create `platform/api-handlers/admin/portal/bookings/[id]/approve-live/index.js` mirroring the sibling `golive/index.js` handler (same `requirePortal` leasing permission, same id parsing, same error mapping) but calling `approveAndGoLive`.

In `platform/api-handlers/admin/portal/bookings/index.js`, add `'pending_approval'` to the `BOOKING_STATUSES` whitelist.

- [ ] **Step 2: Leasing page — filter, stat card, Creative Review tab**

In `platform/public/admin-portal/leasing/index.html`:

(a) Status `<select>` (~line 53): add `<option value="pending_approval">Creative review</option>` after `pending_upload`.

(b) `renderBookingStats` (~line 506): add a `pending_approval` stat card ("Creative review") between the existing cards — the stats payload already carries it via `getBookingStats().totalPending`/byStatus; read the existing card markup and clone with the new key. (Read `platform/api/admin.js:114-134` first; if `byStatus` lacks `pending_approval`, add it there.)

(c) New tab "Creative Review" in the tab bar (~lines 32-37), placed second (after Bookings). Panel content: two groups —
  1. **New creatives on bookings** — from `GET /api/admin/portal/bookings/?status=pending_approval`.
  2. **Staged replacements from the panel** — from `GET /api/admin/portal/tenant-requests/?status=pending`, `type === 'image'` only.

Each review card shows:
- Large creative preview (click → existing `showImagePreview` zoom): the booking's `creative_path` for group 1; the staged `payload.creativePath` for group 2 **side-by-side with** the target's current `creative_path` ("Current" / "New" labels) so replacements are reviewed as a diff.
- The ad as it will appear: heading, subheading, destination link (clickable, `rel="noopener"`), temple + slot name, sponsor company/email, amount paid.
- Actions per card, reusing existing machinery: **Approve** (`bookingAction(id,'approve')`), **Approve & Go Live** (`bookingAction(id,'approve-live')`), **Reject** (existing `showRejectModal`), **End** — for group 1. For group 2: **Approve** / **Reject** posting to the existing tenant-requests endpoints (`/api/admin/portal/tenant-requests/{id}/approve|reject/`).
- Empty state: "The review queue is clear." with a subtle glyph — never a bare blank.
- After any action, reload both groups and the bookings roster so counts stay truthful.

All rendering through `Portal.escapeHtml` for sponsor-supplied strings (existing convention in this file).

- [ ] **Step 3: Test**

Create `test/admin-creative-review.test.js`:

```js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const service = fs.readFileSync(
  path.join(__dirname, '..', 'platform', 'api', 'admin-booking-service.js'), 'utf8');
const handler = path.join(
  __dirname, '..', 'platform', 'api-handlers', 'admin', 'portal', 'bookings', '[id]', 'approve-live', 'index.js');
const roster = fs.readFileSync(
  path.join(__dirname, '..', 'platform', 'api-handlers', 'admin', 'portal', 'bookings', 'index.js'), 'utf8');
const leasing = fs.readFileSync(
  path.join(__dirname, '..', 'platform', 'public', 'admin-portal', 'leasing', 'index.html'), 'utf8');

test('approve-and-go-live service + handler exist', () => {
  assert.match(service, /async function approveAndGoLive\(/);
  assert.match(service, /approveAndGoLive/);
  assert.ok(fs.existsSync(handler), 'approve-live handler missing');
});

test('pending_approval is a first-class bookings filter', () => {
  assert.match(roster, /'pending_approval'/);
  assert.match(leasing, /value="pending_approval"/);
});

test('leasing page carries the Creative Review tab with side-by-side compare', () => {
  assert.match(leasing, /Creative Review/);
  assert.match(leasing, /approve-live/);
});
```

Plus a service-level behavior test for `approveAndGoLive` (booking `pending_approval` + creative → ends `live`, two `admin_actions` rows) mirroring an existing admin-booking-service test setup (find one under `test/` that exercises `approveBooking`/`goLiveBooking` and clone its bootstrap).

Run: `node --test test/admin-creative-review.test.js` — FAIL before, PASS after.

- [ ] **Step 4: Commit**

```bash
git add platform/api/admin-booking-service.js "platform/api-handlers/admin/portal/bookings/[id]/approve-live/index.js" platform/api-handlers/admin/portal/bookings/index.js platform/public/admin-portal/leasing/index.html test/admin-creative-review.test.js
git commit -m "feat(admin): Creative Review queue with side-by-side compare + approve-and-go-live"
```

---

### Task 8: Admin Command — full queue coverage + notification badge

**Files:**
- Modify: `platform/api/admin-portal-service.js:107-225` (`getDashboard`)
- Modify: `platform/public/admin-portal/index.html:199-225` (`renderQueues`), init/polling (~line 389)
- Modify: `platform/public/admin-portal/portal.js` (`renderShell` ~line 274 — topbar badge + shared poller)
- Modify: `platform/public/admin-portal/portal.css` (badge styles) — confirm the actual stylesheet name in `renderShell`/page heads first
- Test: `test/admin-command-notifications.test.js` (create)

**Interfaces:**
- Consumes: existing `orFallback(label, thunk, fallback)` helper; `get("SELECT COUNT(*) …")` operational queries; `Portal.api`, `Portal.fmtNumber`, `Portal.can`.
- Produces: dashboard payload gains `pendingCreativeApprovals`, `pendingPatrons`, `failedStoreOrders`, `pendingMerch`; `renderQueues` renders four new rows; shell gains `#pz-notif-badge` updated by a 60s poller on every portal page.

- [ ] **Step 1: Extend getDashboard**

In `platform/api/admin-portal-service.js`, add to the `Promise.all` array:

```js
    orFallback(
      'pendingCreativeApprovals',
      get("SELECT COUNT(*) as c FROM bookings WHERE status = 'pending_approval'"),
      null
    ),
    orFallback(
      'pendingPatrons',
      get("SELECT COUNT(*) as c FROM patrons WHERE status = 'pending_payment'"),
      null
    ),
    orFallback(
      'failedStoreOrders',
      get("SELECT COUNT(*) as c FROM store_orders WHERE status = 'fulfillment_failed'"),
      null
    ),
```

and a fourth for creator merch pending — first read the merch admin handler under `platform/api-handlers/admin/portal/merch/` to find the exact table/status it counts as `counts.pending`, then mirror that query in an `orFallback('pendingMerch', …)`. If no such count exists, omit merch.

Add to the payload:

```js
    pendingCreativeApprovals: pendingCreativeApprovalsRow?.c || 0,
    pendingPatrons: pendingPatronsRow?.c || 0,
    failedStoreOrders: failedStoreOrdersRow?.c || 0,
    pendingMerch: pendingMerchRow?.c || 0,
```

(rename destructured bindings accordingly.)

- [ ] **Step 2: renderQueues — four new rows**

In `platform/public/admin-portal/index.html` `renderQueues`, add to the `queues` array (order matters — most time-sensitive first, right after sponsorship applications):

```js
                { label: 'Creative reviews', desc: 'New and replacement ad creatives awaiting approval', count: d.pendingCreativeApprovals, href: 'leasing/?tab=creative-review', permission: 'leasing' },
                { label: 'Pending patrons', desc: 'Patron checkouts started but not completed', count: d.pendingPatrons, href: 'leasing/?tab=patrons', permission: 'leasing' },
                { label: 'Store fulfillment failures', desc: 'Paid store orders that failed Printful fulfillment', count: d.failedStoreOrders, href: 'leasing/?tab=store-orders', permission: 'leasing' },
```

(plus the merch row if Task 8.1 found a source: `{ label: 'Creator merch pending', …, href: 'merch/', permission: 'ops' }`.)

Deep-link support: `leasing/index.html` must read `?tab=` on load and activate the matching tab (read the existing tab-switching code; add a `new URLSearchParams(location.search).get('tab')` check at init — if the tab name matches a tab button's data attribute, activate it).

- [ ] **Step 3: Shell notification badge + poller**

In `platform/public/admin-portal/portal.js` `renderShell`:

- Add to the topbar, next to the Refresh control: `<a class="pz-notif" href="/admin-portal/" id="pz-notif" title="Pending decisions">…<span class="pz-notif-badge" id="pz-notif-badge" hidden></span></a>` (bell glyph via inline SVG, matching existing icon style in the file).
- Add a shared poller (runs on every portal page, shell-level):

```js
        // Pending-decisions badge: one memoized dashboard fetch per minute,
        // shared by every portal page through the shell.
        var NOTIF_POLL_MS = 60 * 1000;
        async function refreshNotifBadge() {
          var badge = document.getElementById('pz-notif-badge');
          if (!badge) return;
          try {
            var d = await Portal.api('/api/admin/portal/dashboard/');
            var queues = [
              d.applications && d.applications.businessPending,
              d.applications && d.applications.universityPending,
              d.pendingCreativeApprovals,
              d.pendingCareers,
              d.pendingArbitrage,
              d.pendingChangeRequests,
              d.scholars && d.scholars.pendingEdits,
              d.pendingPatrons,
              d.failedStoreOrders,
              d.pendingMerch,
            ];
            var total = queues.reduce(function (sum, n) { return sum + (Number(n) || 0); }, 0);
            badge.hidden = total === 0;
            badge.textContent = total > 99 ? '99+' : String(total);
          } catch (e) {
            /* badge stays stale; next tick retries */
          }
        }
        refreshNotifBadge();
        setInterval(refreshNotifBadge, NOTIF_POLL_MS);
```

(Guard: only poll when `Portal` is authenticated — hook it into wherever the shell already knows the session is valid; if `renderShell` only runs post-auth, no extra guard needed.)

Badge CSS in the portal stylesheet: gold dot counter, absolute-positioned on the bell, `hidden` attribute respected.

- [ ] **Step 4: Command page live refresh**

In `platform/public/admin-portal/index.html`, after the initial parallel fetch (~line 389), add:

```js
        // The Command page re-pulls the (45s-memoized) dashboard every minute
        // so queue counts and KPIs never require a manual reload.
        setInterval(async function () {
            try {
                var fresh = await Portal.api('/api/admin/portal/dashboard/');
                renderQueues(fresh);
            } catch (e) {
                /* keep last good render */
            }
        }, 60 * 1000);
```

- [ ] **Step 5: Test**

Create `test/admin-command-notifications.test.js`:

```js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const svc = fs.readFileSync(
  path.join(__dirname, '..', 'platform', 'api', 'admin-portal-service.js'), 'utf8');
const command = fs.readFileSync(
  path.join(__dirname, '..', 'platform', 'public', 'admin-portal', 'index.html'), 'utf8');
const shell = fs.readFileSync(
  path.join(__dirname, '..', 'platform', 'public', 'admin-portal', 'portal.js'), 'utf8');

test('dashboard counts every decision queue', () => {
  for (const key of ['pendingCreativeApprovals', 'pendingPatrons', 'failedStoreOrders']) {
    assert.ok(svc.includes(key), `dashboard payload missing ${key}`);
  }
  assert.match(svc, /bookings WHERE status = 'pending_approval'/);
});

test('command page renders the new queues and self-refreshes', () => {
  assert.match(command, /Creative reviews/);
  assert.match(command, /Store fulfillment failures/);
  assert.match(command, /setInterval/);
});

test('shell carries a pending-decisions badge with a 60s poller', () => {
  assert.match(shell, /pz-notif-badge/);
  assert.match(shell, /refreshNotifBadge/);
  assert.match(shell, /60 \* 1000/);
});
```

Run: `node --test test/admin-command-notifications.test.js` — FAIL before, PASS after.

- [ ] **Step 6: Commit**

```bash
git add platform/api/admin-portal-service.js platform/public/admin-portal/index.html platform/public/admin-portal/portal.js platform/public/admin-portal/portal.css platform/public/admin-portal/leasing/index.html test/admin-command-notifications.test.js
git commit -m "feat(admin): full decision-queue coverage, shell badge, 60s self-refresh"
```

---

### Task 9: Approval email tells the sponsor to publish

**Files:**
- Modify: `platform/api/email.js` (`notifyApproved` body)
- Test: extend `test/account-overview.test.js` or the existing email test if one covers `notifyApproved` (search `test/` for `notifyApproved` first)

- [ ] **Step 1:** Find `notifyApproved` in `platform/api/email.js`. Add one line to both the HTML and text bodies, after the approval sentence:

> "Your placement is approved. Nothing appears on the temple until you publish — sign in to your advertiser panel and press Publish when you're ready: {panelUrl}"

where `panelUrl` is `https://punicodex.com/account/` (match how the existing email builds its links — the file already constructs panel/login URLs; reuse that helper).

- [ ] **Step 2:** Source-contract assertion in the covering test: `assert.match(emailSrc, /publish/i)` within the `notifyApproved` function body region, or a behavior test if the email module is unit-testable (check how existing email tests stub the transport).

- [ ] **Step 3: Commit**

```bash
git add platform/api/email.js test/<covering-test>.js
git commit -m "feat(email): approval mail points sponsors at the Publish switch"
```

---

### Task 10: Register suites, regenerate, full battery

- [ ] **Step 1:** Register the four new suites in `test/run-all.js` next to their thematic neighbors (booking/account suites): `analytics-schema-drift`, `flagship-slots`, `booking-publish-pause`, `account-booking-controls`, `account-overview`, `creative-studio`, `admin-creative-review`, `admin-command-notifications` (30s timeouts, matching sibling entries).

- [ ] **Step 2:** Run the new suites directly: `node --test test/analytics-schema-drift.test.js test/flagship-slots.test.js test/booking-publish-pause.test.js test/account-booking-controls.test.js test/account-overview.test.js test/creative-studio.test.js test/admin-creative-review.test.js test/admin-command-notifications.test.js`

- [ ] **Step 3:** `npm run format && npm run lint` — fix anything biome flags in covered paths.

- [ ] **Step 4:** `npm run generate` — regenerates root `admin-portal/`, `sites/{id}/script.js` (from the edited template), `data-version.json`, etc. **Do not** hand-edit generated outputs. Confirm `git status` shows the regenerated copies of the admin portal and temple scripts.

- [ ] **Step 5:** `npm test` — full 232+ suite battery must be green. Pay special attention to: `seo-regression`, `links`, `menu-consistency`, `flywheel` validators, and the existing booking/tenant/store suites.

- [ ] **Step 6:** `npm run generate:check` — divergence gate green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: regenerate derived artifacts for sponsorship flow overhaul"
```

## Self-Review Notes

- Spec coverage: D1→Tasks 3,4,5(publish CTA),7(approve-live),9 · D2→Task 2 · D3→Task 7 · D4→Task 8 · D5→Tasks 4(getMe),5 · D6→Task 1 · D7→Tasks 4,5,6 + report-a-bug in Task 5.
- Type consistency: `publishOwnBooking/pauseOwnBooking/updateOwnBookingMeta` names identical across Tasks 4,5,6; `approveAndGoLive` across Task 7; dashboard keys identical across Task 8 steps.
- Deliberately out of scope (YAGNI): WebSocket/push notifications, bulk approve, per-frame bundle copy editing in the panel, advertiser-initiated cancellation (exists via token flow), merch queue if no countable source exists.
