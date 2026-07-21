# PuniCodex — Admin Portal Security Audit, 2026-07-21

**Date:** 2026-07-21
**Scope:** Unified admin portal — frontend (`platform/public/admin-portal/**`),
portal backend (`platform/api/admin-portal-auth.js`,
`platform/api/admin-portal-service.js`, `api/admin/portal/**`), every legacy
admin route (`api/admin/**`), and the admin analytics surfaces
(`platform/api/site-analytics.js`, `platform/api/observability-service.js`,
`platform/api/ad-analytics.js`, `api/analytics/**`). Also covered: wiring the
newsletter (`newsletter_subscribers`) and creator-merch (`creator_products`,
`creator_order_ledger`) data into the portal.
**Methodology:** Static review. Every auth check, role gate, and dashboard
number was confirmed by reading the code path end to end (handler → auth
guard → service → SQL) before being accepted, then re-proven by executing
the handlers against an isolated database. No dynamic scanning or penetration
testing; the weekly red-team CI covers the authenticity subsystem separately.
**Data version under review:** `2.0.63`.

## Summary

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | MED | `tenant-requests/[id]/{approve,reject}` routes crashed on load (wrong relative `require` paths) | **Fixed** |
| 2 | LOW | Newsletter subscribers and creator merch had no admin oversight surface at all | **Fixed** (this workstream) |
| 3 | LOW | New CSV export introduced a spreadsheet formula-injection vector (`+`-prefixed phones) | **Fixed** (escaped at generation) |
| 4 | LOW | Login responses reveal account state (`account_locked`, `account_inactive`, attempts remaining) | Documented-accepted |
| 5 | LOW | Portal session cache weakens cross-instance revocation by ≤30 s | Documented-accepted |
| 6 | LOW | Auth events (login success/failure/lockout, logout) are not written to `admin_actions` | Recommendation R1 |

**Already sound (verified, not just assumed):** every route under
`api/admin/**` rejects unauthenticated requests (45/45 proven by the new
contract suite); the server-side role matrix is correct on every route;
bcrypt(12) with a constant-time dummy-hash path for unknown emails; 256-bit
session tokens stored as SHA-256; 5-attempt/15-minute lockout that refuses
even the correct password; immediate session revocation on password
change/reset/disable; rate-limited logins; bootstrap never seeds a known
password; last-superadmin and self-mutation guards; every admin mutation is
written to `admin_actions` with the acting portal user; no `password_hash`
or `ip_hash` ever leaves a handler; production 500s are generic.

**Dashboard number audit:** every figure on every admin dashboard traces to
a real database aggregate — no placeholder, sample, or hardcoded numbers
were found anywhere in the portal or the legacy admin dashboards. A new
seed-and-verify integration suite proves exact-count authority.

---

## Finding 1 — MED: `tenant-requests` approve/reject routes crashed at require time

**Evidence (pre-fix):** the concurrently developed sponsor-portal backend
routes `api/admin/portal/tenant-requests/[id]/approve/index.js:8,10` and
`api/admin/portal/tenant-requests/[id]/reject/index.js:8,10` required
`../../_portal.js` and `../../../../../platform/api/tenant-portal.js`. Both
paths are one directory level short for files sitting three levels below
`api/admin/portal/` (compare the working sibling pattern in
`api/admin/portal/patrons/[id]/index.js`, one level shallower). The module
therefore threw `MODULE_NOT_FOUND` at load — every request to these routes
would 500, silently disabling the tenant change-request approval queue in
production.

**Fix:** corrected both `require` paths in both files
(`../../../_portal.js`, `../../../../../../platform/api/tenant-portal.js`).
The routes live under `api/admin/**` (this workstream's ownership); the
sponsor-portal workstream has been notified via the handoff notes. The
routes' own logic (ops-gated approve/reject with audit context) was reviewed
after the fix and is sound.

**Verification:** `node test/admin-route-auth.test.js` — 45/45 routes
enforce auth and load cleanly; before the fix the suite failed with
`Cannot find module` on both files.

## Finding 2 — LOW: newsletter and creator-merch data had no admin surface

**Evidence:** `api/newsletter/subscribe.js` writes `newsletter_subscribers`
(email, optional phone, source) and the creator-merch pipeline writes
`creator_products` / `creator_order_ledger` (revenue-split accounting), but
no `/api/admin/**` route read either table. Subscriber PII and creator
payout accounting were inspectable only by opening the database. Not a data
leak — an oversight gap.

**Fix:** new portal routes, all behind `requirePortal`:

| Route | Methods | Gating | Purpose |
|-------|---------|--------|---------|
| `/api/admin/portal/newsletter/` | GET | `read` (all roles) | Paginated subscriber list (email, phone, source, date) + total |
| `/api/admin/portal/newsletter/export/` | GET | `leasing` | Full CSV export, `Content-Disposition` attachment, `Cache-Control: no-store` |
| `/api/admin/portal/merch/` | GET | `read` (all roles) | Product catalog (title, creator, university, price, status) + exact ledger totals |
| `/api/admin/portal/merch/:id/withdraw/` | POST | `leasing` | Force-withdraw a live product; audit-logged |

Gating rationale: the list mirrors the patron roster (the portal's other PII
list, `read`-gated); bulk PII exfiltration and money-adjacent takedowns are
gated one tier higher (`leasing` = superadmin + leasing). The withdraw path
reuses `platform/api/creator-merch.js#withdrawCreatorProduct` so the public
store catalog and the admin view cannot diverge, refuses non-live products
(400) and unknown ids (404), and writes `portal.merch.withdraw` to
`admin_actions` with the acting user, product title, and asset id. Frontend:
new `newsletter/` and `merch/` portal sections following the existing page
pattern, plus a `Requests` nav item for the sponsor portal's queue page.
`ip_hash` is deliberately not selected in any response.

**Verification:** `node test/admin-portal-growth.test.js` — 16 passed,
0 failed (auth negatives, full role matrix, exact list/CSV contents,
pagination, ledger totals, withdraw + audit-trail persistence, store-catalog
consistency, 405s).

## Finding 3 — LOW: CSV export formula-injection vector

**Evidence:** subscriber phone numbers legitimately begin with `+`, and a
spreadsheet opens any cell starting with `=`, `+`, `-`, or `@` as a formula.
An exported CSV of raw subscriber data is therefore a CSV-injection carrier
(e.g. a signup with `email = "=HYPERLINK(...)"` would execute in Excel).

**Fix:** `admin-portal-service.js#csvCell` prefixes every formula-leading
cell with a single quote before applying RFC-4180 quoting; the exporter is
covered by exact-bytes tests including all four leading characters and
embedded quotes/commas/newlines.

**Verification:** `node test/admin-portal-growth.test.js` — "CSV export:
exact rows, attachment headers, formula-injection escaping", "CSV escaper
guards every formula-leading character".

## Finding 4 — LOW (documented-accepted): login responses reveal account state

`platform/api/admin-portal-auth.js#login` returns distinct codes for
`account_locked` (before password verification, once a lock exists) and
`account_inactive` (before password verification), and appends "N attempts
remaining" to invalid-credential responses. An unauthenticated caller who
already knows an admin email can confirm the account exists and observe its
lock/disable state. **Accepted risk:** the codes drive deliberate login-UI
flows (the login page handles each state explicitly, and the behavior is
encoded in `test/admin-portal.test.js`); the information value is modest
behind rate-limited, locked-down accounts, and changing it would degrade the
legitimate lockout UX. Re-evaluate if the portal ever faces public internet
brute-force at scale.

## Finding 5 — LOW (documented-accepted): ≤30 s cross-instance revocation window

`admin-portal-auth.js` caches resolved sessions per token hash for 30 s
(documented in the source, lines 143-158). A session destroyed on *another*
warm serverless instance (logout, password change/reset, account disable)
may authenticate here for up to the TTL. Same-instance revocation — the
overwhelming common case, since the actor typically shares the instance — is
immediate and synchronously invalidated. **Accepted risk**, previously
designed and documented; flagged here so incident responders know the bound.
If immediate cross-instance revocation ever becomes a hard requirement, the
cache needs a shared invalidation channel (Redis `DEL punicodex:sess:*`),
not more code.

## Finding 6 — LOW: auth events are not in the audit trail

Every portal *mutation* writes `admin_actions` with `admin_user_id`, but
login success/failure/lockout and logout write nothing. Forensic
reconstruction of "who was in the portal when X happened" relies on
`admin_users.last_login_at` only. Recommendation R1; no code change in this
workstream (the write path is trivial but the volume/retention decision is
operational).

---

## Analytics authority

Every admin analytics surface was traced from widget to SQL:

| Surface | Number | Source |
|---------|--------|--------|
| Portal dashboard — Business Apps Pending | `COUNT(*) bookings WHERE status='pending_application'` | `admin-portal-service.js` |
| Portal dashboard — University Apps / Edits / Media | `scholars_sponsorship_applications`, `scholars_edits`, `scholars_media` counts | `platform/db/scholars` |
| Portal dashboard — Patrons / MRR | `patrons` status counts + `SUM(amount_cents)` | `patron-service.js` |
| Portal dashboard — Revenue 30d | `SUM(amount_paid_cents)` over live/ended/approved bookings | `platform/api/admin.js#getRevenueStats` |
| Portal dashboard — Requests / Errors 24h | `api_request_log` counts (status ≥ 400) | `observability-service.js#getMetrics` |
| Portal dashboard — Indexed Sites | `COUNT(*) indexed_sites WHERE status='active'` | `observability-service.js#getHealthSummary` |
| Legacy admin-analytics.html | all widgets | `GET /api/analytics/overview/` → `site_analytics_daily` / `site_analytics_events` |
| `/api/admin/observability/` | latency, status codes, top paths | `api_request_log` aggregates |

No endpoint fabricates, samples, or inflates numbers; empty sources render
honest zeros (the portal pages initialize badges at 0 and the dashboard
degrades a failing source to zeros with a server-side warning rather than
inventing data). Two caching behaviors are by design and worth knowing: the
portal dashboard memoizes its aggregate for 45 s per instance (the payload
carries `generatedAt`), and patron stats for 60 s.

**New proof:** `test/admin-analytics-authority.test.js` seeds known events
through the real write paths (5 page views across 2 temples + 5
`api_request_log` rows with known statuses/durations) and asserts the
dashboards return the exact seeded counts — totals, bot split, referrers,
devices, error rate, average duration — and that every remaining portal
widget equals a direct independent aggregate executed inside the test.
5 passed, 0 failed.

---

## Documented-accepted findings

See findings 4 and 5 above.

---

## Remaining recommendations

- **R1 — Audit-log auth events.** Record login success/failure/lockout and
  logout in `admin_actions` (action `portal.auth.*`, nullable
  `admin_user_id`, no IP storage beyond the existing hash convention).
  Decide volume/retention before enabling in production.
- **R2 — Require `REDIS_URL` in production docs.** Portal/scholars/public
  rate limits fall back to per-process memory without it (same class as the
  2026-07-17 audit's finding 3, which fixed the scholars half). The
  deployment checklist should treat `REDIS_URL` as required, not optional.
- **R3 — Degraded-source visibility.** The portal dashboard's `orFallback`
  turns a failing data source into zeros with only a `console.warn`. Surface
  a per-widget "degraded" flag in the payload so a zero caused by an outage
  is visually distinct from a true zero.
- **R4 — Re-run the contract suite on every new admin route.**
  `test/admin-route-auth.test.js` walks `api/admin/**` and fails on any
  route that loads badly or skips auth — it caught finding 1 within minutes
  of the routes landing. No action needed beyond keeping it in CI.

## Verification record

All commands below were run on 2026-07-21 against the audited tree:

```bash
node test/admin-portal-growth.test.js         # 16 passed, 0 failed (new suite)
node test/admin-analytics-authority.test.js   # 5 passed, 0 failed (new suite)
node test/admin-route-auth.test.js            # 45/45 routes enforced (new suite)
node test/admin.test.js                       # 12 passed, 0 failed
node test/admin-portal.test.js                # all tests passed
node test/portal-endpoints.test.js            # all tests passed
node test/admin-bookings.test.js              # all tests passed
node test/security-hardening.test.js          # 15 passed, 0 failed
node test/analytics-e2e.test.js               # all tests passed
node test/site-analytics.test.js              # all tests passed
node test/ad-analytics.test.js                # 27 passed, 0 failed
node test/admin-portal-page.test.js           # all passed except the
                                              # synced-copy byte-identity check,
                                              # which passes after `npm run
                                              # generate` (canonical-first
                                              # flywheel state)
npx biome lint <touched files>                # clean
npx biome format <touched files>              # clean
```

`node --check` passes on every JavaScript file created or modified.
