# PuniCodex — Second-Pass Security & Quality Review, July 2026

**Date:** 2026-07-17
**Scope:** Unified admin portal (`api/admin/portal/**`,
`platform/api/admin-portal-{auth,service}.js`,
`platform/db/migrate-admin-users.js`), patrons (`api/patrons/**`,
`platform/api/patron-service.js`), bookings (`platform/api/booking-service.js`,
`admin-booking-service.js`, `booking-validation.js`), and the analytics
pipeline (`api/analytics/**`, `platform/api/site-analytics.js`,
`platform/api/ad-analytics.js`). This is a follow-up to
`docs/security/security-audit-2026-07.md`; findings 1-11 there are not
repeated except where this pass changed their state.
**Methodology:** Static review, handler → service → datastore, plus a
property-style fuzz harness (`test/api-fuzz.test.js`) run against the
in-process handlers. No dynamic scanning of the deployed site.

## Summary

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | HIGH | Booking `analytics_token` (management + dashboard credential) is publicly exposed via `/api/slots` and temple page markup | **Open — reported** |
| 2 | MED | `/api/analytics/click` is an open redirect | **Open — reported** |
| 3 | MED | Portal tokens of any role (incl. `viewer`) pass legacy `requireAdmin` and can call legacy admin mutations | Documented-accepted, residual risk |
| 4 | MED | Five fuzz-confirmed 500-on-bad-shape crashes (portal login ×2, verify send/check, bookings recover, crawl events) | **Fixed in this pass, with tests** |
| 5 | LOW | `/api/analytics/dashboard`: non-string token crashed the SQL bind; 500 body leaked `err.message` | **Fixed in this pass, with tests** |
| 6 | LOW | Same-class crash shapes in `createUser`/`updateUser`/`changePassword` (non-string email/displayName/currentPassword) | **Fixed in this pass, with tests** |
| 7 | LOW | 30s portal session-resolution cache weakens cross-instance revocation | Documented-accepted, residual risk |
| 8 | LOW | Dashboard/booking bearer tokens in URLs; no rotation; no rate limit on token-GET routes | Documented-accepted, residual risk |
| 9 | LOW | Portal `viewer` role can read patron emails + Stripe customer IDs | Documented-accepted, residual risk |

## Open findings (reported, not fixed in this pass)

### 1 — HIGH: the booking management token is public for every live slot

`getSlots`/`getSlotBySlug` select `b.analytics_token`
(`platform/api/bookings.js:52,85`) and the public, unauthenticated slot
endpoints return those rows verbatim (`api/slots/[[...slug]].js:12-20`).
The same token is also rendered into public temple HTML for ad tracking
(`templates/flagship/flagship.js:168-184`: pixel, click, viewability). Yet
the identical string is the **bearer credential** for booking management:
`GET /api/bookings/:token` (full record incl. tenant email), `/all` (every
booking for that email, with *their* tokens), `POST /meta|cancel|uncancel|
renew|upload` (`api/bookings/[[...slug]].js:40-104`), and the advertiser
dashboard (`api/analytics/dashboard`). Any visitor of a temple with a live
ad can extract the token from page source or `/api/slots` and read tenant
PII, flip a live booking to `pending_approval` via a meta POST (takes the
ad offline pending re-approval), set `cancel_at_end`, or spawn renewal
checkout sessions. Entropy is fine (192 bits,
`platform/api/bookings.js:7-9`) — the problem is the token is not secret.
Pre-existing (introduced June 2026); a fix means splitting a public
tracking ID from a secret management token across templates, email flows,
and the 196 generated flagship pages, so it is reported here rather than
half-fixed in this pass. **Recommendation:** issue a separate public
`tracking_id` for pixel/click/viewability (usable only for event
recording) and keep `analytics_token` secret, emailed only; until then,
treat the token as public and re-evaluate what it may authorize.

### 2 — MED: open redirect in the click tracker

`isSafeRedirectUrl` returns `true` for any valid http/https URL
(`platform/api/ad-analytics.js:17-18`), and `trackClick` redirects even
when the token is invalid (`ad-analytics.js:53-77`).
`GET /api/analytics/click?b=x&url=https://evil.example` therefore 302s
from a first-party domain — a ready-made phishing redirector (CWE-601).
**Recommendation:** resolve the booking by token and redirect only to its
registered `website_url` (400 otherwise); the caller-supplied `url` should
never be authoritative.

## Fixed in this pass (with regression tests)

### 4 — MED: five 500-on-bad-shape crashes → 4xx (fuzz-confirmed)

All five were found by `test/api-fuzz.test.js` and are now strictly
asserted (no 5xx tolerated anywhere in the suite):

1. `platform/api/admin-portal-auth.js#login` — truthy non-string `email`
   threw on `.toLowerCase()`; truthy non-string `password` crashed
   `bcrypt.compareSync`. Now a typeof guard returns the
   `invalid_credentials` failure the login route maps to **401**
   (`api/admin/portal/login/index.js:24-27`).
2. `platform/api/booking-service.js#sendVerification` and
   `#recoverBookings` — `email?.includes('@')` threw on non-string,
   non-null emails and let arrays through to the bind. Now
   `typeof email === 'string' && email.includes('@')` → **400**
   `Valid email required` (the endpoint's existing BookingError shape).
3. `platform/api/booking-service.js#checkVerification` — non-string emails
   reached the SQLite bind and threw. Now a typeof guard → **400** before
   any DB call. (Numeric emails previously bound cleanly and 400'd on
   "no verification found"; they now 400 on the guard — same status,
   clearer contract.)
4. `api/crawl/events/index.js` — `source`/`eventType` were validated only
   as strings while `crawl_events` enforces CHECK enums
   (`platform/db/migrate-event-crawler.js:17,20`); any other well-formed
   string crashed the INSERT. Both are now whitelist-validated against the
   same enums before enqueueing → **400**.

The five quarantined "known bug" blocks in `test/api-fuzz.test.js` were
converted to strict assertions (exact 400/401, never 5xx) and all
known-bug bookkeeping was removed.

### 5 — LOW: analytics dashboard token shape + error masking

`getDashboard` (`platform/api/ad-analytics.js`) bound `req.query.token`
unchecked: a repeated query param arrives as an array and crashed the
SQLite bind, and the catch returned `err.message` in the 500 body —
bypassing the production masking from first-pass finding 4. Non-string
tokens now get 400; the 500 body is masked when `NODE_ENV=production` or
`VERCEL` is set, mirroring `api/_utils.js:12-17`. Test:
`test/ad-analytics.test.js` (400s for array/object tokens; masked vs
unmasked 500 body against a sabotaged database).

### 6 — LOW: same-class guards in the portal auth service

`createUser` normalized with `(email || '').toLowerCase()` and bound raw
`displayName`; `updateUser` bound raw `displayName`; `changePassword`
passed `currentPassword` straight to `bcrypt.compareSync` — all 500'd on
non-string truthy shapes. These are superadmin/self-service routes, so the
blast radius was small, but they are the identical defect class in the
file already fixed above. Now: 400 on non-string email/displayName, 401
("current password is incorrect") on non-string currentPassword. Test:
"malformed payload shapes return 4xx, never 5xx" in
`test/admin-portal.test.js`.

## Documented-accepted (with residual risk)

### 3 — MED: portal tokens are full-power on legacy admin routes

`validateAdminToken` (`platform/api/admin.js:30-40`) accepts any valid
`admin_sessions` row without consulting the linked portal user's role, so
a `viewer`-role portal token passes `requireAdmin` (`api/_utils.js:41-48`)
and can invoke legacy admin mutations, e.g. `PATCH /api/patrons/:id`
cancel/expire (`api/patrons/[[...slug]].js:119-127`) and `PUT
/api/crawl/events`. This is an intentional, test-pinned compatibility
bridge (`test/admin-portal.test.js` "portal token still passes legacy
requireAdmin endpoints"), but it means the portal RBAC matrix only holds
on `/api/admin/portal/*`: a viewer is not read-only across the whole
surface. Accepted for backward compatibility; recommend enforcing the
portal role in `validateAdminToken` when `admin_user_id` is present.

### 7 — LOW: 30s session-resolution cache

`platform/api/admin-portal-auth.js:142-177` caches resolved sessions per
token hash for 30s. Same-instance revocation is synchronous (logout,
password change/reset, disable, user updates all invalidate), so the
window only applies across concurrently warm serverless instances: a
session destroyed elsewhere may authenticate here for ≤30s. Blessed —
bounded, documented in code, and the alternative is a cross-region DB read
per portal request. Residual risk: up to 30s of continued access for a
disabled account on other warm instances.

### 8 — LOW: bearer tokens in URLs, no rotation, unrated token-GETs

Booking/dashboard tokens travel in URLs (`/sites/{id}/dashboard/?token=`,
`/api/analytics/dashboard?token=`), so they appear in browser history and
edge access logs; site-wide strict `Referrer-Policy` prevents query
leakage to third-party subresources. Tokens are 192-bit random, never
rotated, and emailed to tenants (recover flow). Token-GET routes
(`GET /api/bookings/:token*`, `/api/analytics/dashboard`) carry no rate
limit; online guessing against 192 bits is infeasible, and all token
*mutations* are rate-limited (`booking-meta`, `booking-upload` buckets).
Accepted; a per-IP limit on the dashboard route would be cheap
defense-in-depth. Superseded in importance by finding 1, which makes these
tokens public anyway for live slots.

### 9 — LOW: viewer role reads patron PII

Portal `GET /patrons` returns `SELECT *` rows — patron emails, Stripe
customer/subscription IDs — to every role including `viewer`
(`platform/api/patron-service.js:202-219`; route requires only `read`).
The public wall is clean (no email column,
`patron-service.js:148-152`). Accepted because `viewer` is an
internal-trust role; if external viewers are ever provisioned, project the
columns instead.

## Areas verified clean

- **Authorization on portal mutations:** every mutation route enforces a
  role server-side via `requirePortal` — users CRUD/disable/reset
  `users`, patron status `leasing`, application approve/reject
  `leasing|scholars` by kind, scholar edit/media review `scholars`. Roles
  are never taken from the client body on privileged routes;
  `updateUser`/`createUser` validate role against the whitelist and block
  self-demotion and last-superadmin removal.
- **Injection:** all SQL in scope is parameterized; dynamic WHERE clauses
  are built from whitelisted condition fragments with positional params
  (`patron-service.js:202-235`); `days`/limit/offset are integer-clamped;
  no LIKE or ORDER BY interpolation anywhere in scope.
- **XSS:** the patron wall escapes every user field and constrains social
  URLs to per-platform https patterns server-side
  (`templates/flagship/patron/patron.js:90-94,176-202`,
  `platform/api/patron-service.js:39-64`); all portal pages render user
  content through `Portal.escapeHtml`
  (`platform/public/admin-portal/portal.js:273-281` and the
  patrons/applications/scholars/users pages); `statusBadge` slugifies its
  class. No unescaped sink found.
- **Webhook (patron activation):** raw body preserved
  (`api/webhook/index.js:41-44`), Stripe signature verified via
  `constructEvent` (`platform/api/stripe.js:248-257`), activation keyed on
  signed metadata, amount overwritten from `session.amount_total`, and
  re-activation is idempotent (`markPatronPaid`,
  `platform/api/patron-service.js:157-175`).
- **Response hygiene:** `sanitizeUser` drops password hashes
  (`admin-portal-auth.js:68-81`, asserted in
  `test/admin-portal.test.js`); temp passwords are returned exactly once
  (create/reset/university-approval) and flagged `tempPassword` until
  changed; production 500 masking is now uniform (finding 5).
- **Rate-limit coverage:** login (`admin-login`), patrons checkout
  (`public-strict`), patrons wall, verify send/check, bookings
  create/apply/recover/meta/upload, crawl events, analytics
  collect/click/pixel/viewability are all limited. Unrated routes are
  admin-authenticated (audited in `admin_actions`, login lockout after 5
  attempts) or 192-bit token reads (finding 8). Acceptable.
- **Privacy model of site analytics:** IPs/UA stored only as truncated
  hashes, session hashes rotate daily
  (`platform/api/site-analytics.js:196-245`); collect never 500s the
  beacon.

## Feature gaps worth building

1. **Split the booking token** — public tracking ID for
   pixel/click/viewability vs. a secret (rotatable) management token;
   resolves finding 1 without weakening tracking.
2. **Server-side click-target binding** — redirect `/api/analytics/click`
   only to the booking's registered `website_url`; kills the open
   redirect and click-URL tampering at once.
3. **Transactional email wiring** — temp passwords and dashboard links are
   currently relayed out-of-band; the Resend path exists but unconfigured
   flows still log-and-drop.
4. **Role-aware legacy admin bridge** — enforce the portal role inside
   `validateAdminToken` when `admin_user_id` is set, so `viewer` is truly
   read-only everywhere (finding 3).
5. **Rate-limit the token-GET and dashboard endpoints** — cheap
   defense-in-depth behind the existing `public` bucket (finding 8).

## Verification record

All commands run on 2026-07-17 against this tree (Windows, Node 22):

```bash
node test/api-fuzz.test.js               # 18 checks passed, strict — 0 known-bug sightings
node test/booking-service.test.js        # 19 passed, 0 failed
node test/event-crawler.test.js          # passed
node test/security-hardening.test.js     # passed
node test/admin-portal.test.js           # all passed (incl. new malformed-shape test)
node test/ad-analytics.test.js           # 18 passed, 0 failed (incl. new masking/shape test)
npx biome format <changed files>         # clean
```
