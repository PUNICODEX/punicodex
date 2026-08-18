# Sponsorship Flow Overhaul — Design

Date: 2026-08-17
Status: approved-in-concept (auto mode; decisions made by agent, reversible in review)

## Problem

End-to-end test of the sponsorship frames (complimentary coupon → booking →
creative upload → admin approval) surfaced seven defects across the temple
renderer, the advertiser panel (`/account/`), and the admin portal:

1. After admin approves a creative, the temple still shows "RESERVED" — the
   creative never appears, because approval leaves the slot `reserved`; only
   the separate admin Go Live step flips it `live`.
2. A reserved/occupied slot still opens the booking modal on click instead of
   linking to the sponsor's URL.
3. The admin creative-review UI is a generic booking-detail modal — no
   dedicated queue, no side-by-side comparison, `pending_approval` missing
   from the status filter and stat cards.
4. The admin Command dashboard has no notification surfacing: creative
   reviews aren't counted at all, no badges, no polling — nothing important
   can be seen without hunting.
5. The advertiser overview keeps showing "Action needed — upload your
   creative" after the creative was uploaded and approved, because
   Brand-page uploads are staged change requests invisible to the banner.
6. "My placements" renders "Internal server error" (Postgres column drift on
   `analytics_events` — `slot_slug`, `visible_seconds`, `visible_percent`
   missing from the Neon drift backfill).
7. The advertiser panel is not sponsor-grade: two confusing upload cards, no
   way to edit heading/subheading/link, no go-live control, and a dead
   "Report a bug" mailto link.

## Design decisions

### D1. Publish model: approval vs go-live

Admin approval of a creative means "this creative may run", not "this
creative is running". The advertiser controls publication of their own
approved placements:

- New advertiser endpoints (account-token auth, ownership-checked):
  - `POST /api/account/bookings/:id/publish/` — booking must be `approved`
    with a creative; reuses `goLive()` (`platform/api/bookings.js:362`).
  - `POST /api/account/bookings/:id/pause/` — booking must be `live`;
    flips booking `live → approved` and slot(s) `live → reserved`
    (inverse of `goLive`, bundle-cascading).
- Admin portal keeps Go Live and gains a one-click **Approve & Go Live**
  for `pending_approval` bookings (approve + goLive in one action).
- Approval emails (`notifyApproved`) gain one line telling the sponsor to
  publish from their panel.

### D2. Temple slot click behaviour (`templates/flagship/flagship.js`)

- The document click handler opens the booking modal **only** when the
  resolved slot's `status === 'available'`.
- `reserved` slots: click is a no-op (overlay already shows RESERVED).
- `live` slots: the creative anchor (`a.space-live-ad`) already links out;
  extend pointer behaviour so clicks anywhere in a live slot's frame that
  are not the anchor do nothing (no modal). Keep the existing exemption for
  the anchor.
- If the slots API failed (`slotsData` empty), the `buildSlotFromDom`
  fallback no longer opens the modal; show a subtle toast "Bookings are
  temporarily unavailable — please try again shortly." This kills the
  "looks available, fails at checkout" dead end.
- Bundle member slots with `status === 'live'` but no own creative fall
  back to the booking-level creative (`creative_path` COALESCE already
  carries it): change `hasOwnCreative` for bundle members to
  `has_slot_creative || creative_path` so an approved bundle creative
  always renders.

### D3. Admin portal — Creative Review queue (leasing tab)

New "Creative Review" tab in `platform/public/admin-portal/leasing/index.html`:

- Dedicated queue listing `pending_approval` bookings **and** pending
  tenant image change requests in one review surface.
- Each review card: large creative preview (click to zoom, existing
  `showImagePreview`), the live/current creative side-by-side for
  replacements, heading, subheading, destination link (rendered as the ad
  would appear), temple + slot, sponsor, amount.
- Actions per card: **Approve**, **Approve & Go Live**, **Reject** (reason
  modal, emailed — reuse `showRejectModal`), **End**.
- Add `pending_approval` to the bookings status whitelist
  (`platform/api-handlers/admin/portal/bookings/index.js`) and to the
  roster filter `<select>` and stat cards.

### D4. Admin portal — Command notifications

- Extend `getDashboard()` (`platform/api/admin-portal-service.js`) queues
  with four missing sources: creative reviews (`pending_approval`
  bookings), pending patrons (`patrons.status='pending_payment'` — only
  if already queryable without schema risk; otherwise count via existing
  patrons list endpoint), failed store fulfillments
  (`store_orders.status='fulfillment_failed'`), pending creator merch.
- Frontend (`platform/public/admin-portal/index.html`): the "Needs Your
  Decision" list re-fetches `/api/admin/portal/dashboard/` every 60s
  (server payload is already memoized 45s) and updates counts in place.
- Topbar badge: total pending decisions across queues, updated by the same
  poll; clicking scrolls to the queues section. No WebSocket, no new
  infra — pull-based, consistent with the existing architecture.

### D5. Advertiser overview banner fix

- Server: `getMe()` bookings include `hasCreative` computed with the same
  COALESCE logic as the slots API (`slot_creatives` or
  `bookings.creative_path`), plus `pendingImageRequest` (a pending
  `tenant_change_requests` image row exists for the booking).
- Client (`account/index.js renderActions`): four honest states —
  - live + creative → no banner;
  - pending image request → "Creative under review — we'll email you the
    moment it's approved" (calm state, no action);
  - changeable status + no creative → the existing action banner;
  - approved + creative + not live → "Approved — publish when ready"
    with a Publish button (D1).

### D6. My placements 500 fix

- Add `analytics_events.slot_slug`, `analytics_events.visible_seconds`,
  `analytics_events.visible_percent` to the Postgres `COLUMN_DRIFT`
  backfill in `platform/db/init-operational-postgres.js`.
- Harden `getSpaceAnalytics()` (`platform/api/tenant-portal.js:587`):
  per-booking stats wrapped so one failing booking yields zeroed stats
  instead of a 500 for the whole panel.
- Add a regression test asserting the drift list covers every column the
  analytics queries reference.

### D7. Advertiser panel overhaul (Brand → "Creative Studio")

Rewrite `account/brand/` as a per-placement studio card. One card per
placement containing:

- **In-frame preview**: the creative rendered inside a mock of the actual
  slot frame (correct aspect ratio, temple name + slot label), showing the
  live creative, the staged replacement, or the empty frame.
- **One upload area** (drag & drop + file picker) replacing both old
  cards; client-side normalization (`/js/creative-normalize.js`) exactly
  as today; the staged result previews in-frame before submission.
- **Ad copy editor**: heading, subheading, destination link fields,
  prefilled from the booking; Save calls a new account-side endpoint
  `POST /api/account/bookings/:id/meta/` that reuses the
  `updateBookingMeta` rules (live/approved edits flip to
  `pending_approval`, bundle bookings write to `slot_creatives`).
- **Publication control**: status timeline (Applied → Paid → Creative →
  Approved → Live) plus Publish/Pause button per D1.
- Request history stays, collapsed, at the bottom of the card.
- "Report a bug" → link to `/contact/` (real page, works everywhere);
  remove the raw `mailto:` (unencoded em-dash, dead without a mail
  client). Same fix in `account/sandbox.js` `emptyHero()`.

## Data flow (unchanged pieces)

Uploads keep the staged change-request pipeline (`normalizeCreativeBuffer`
→ `stageImage` → `tenant_change_requests` → admin approval applies to
`booking.creative_path`). The temple modal upload flow
(`POST /api/bookings/:token/upload`, immediate `pending_approval`) is
untouched.

## Error handling

- Publish without creative → 400 with a clear message (matches `goLive`).
- Pause a non-live booking → 400.
- Meta edit on a booking the account doesn't own → 403/404 (existing
  tenant-portal ownership pattern).
- Slots API failure on temple → no modal, toast only (D2).

## Testing

- New suite `test/sponsorship-flow.test.js`: publish/pause endpoint
  contract, account meta endpoint, banner-state logic inputs (hasCreative /
  pendingImageRequest from `getMe`), drift-list coverage assertion.
- Extend existing suites: `test/menu-consistency.test.js` untouched;
  flagship slot-click logic covered by a small DOM-free unit extraction if
  practical, otherwise covered by the flywheel validator + links suites.
- `npm run generate && npm test` must pass (account pages are canonical;
  admin portal root copy and flagship `sites/{id}/script.js` regenerate).

## Versioning / deploy notes

- `?v=` bumps on every touched CSS/JS reference (immutable 1-year caching).
- Root `admin-portal/` regenerates via `sync-admin-portal.js`; never edit
  it directly.
- `templates/flagship/flagship.js` edits propagate to `sites/{id}/script.js`
  through `create-flagship.js --regenerate-all` inside `npm run generate`.
