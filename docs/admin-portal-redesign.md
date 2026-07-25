# The Sanctum — Admin Portal v2 & Sponsor Sandbox — Architecture

Status: design contract for the build agents. Everything below must map to
real tables/endpoints — nothing aspirational is allowed to ship.

## 0. What exists today (verified inventory)

**Portal (canonical `platform/public/admin-portal/` → synced `admin-portal/`):**
`index.html` (dashboard), `login/`, `applications/`, `requests/`, `patrons/`,
`scholars/`, `newsletter/`, `merch/`, `users/`, `analytics/`. Shared
`portal.js` (`Portal.api` with `x-admin-token`, `initShell`, NAV_ITEMS by
permission) + `portal.css`. Roles: superadmin, ops, leasing, scholars, viewer.

**Portal API (`api/admin/portal/`):** login/logout/me(+password), dashboard,
users CRUD, applications (business bookings + university sponsorships,
approve/reject), patrons, scholars queues, tenant-requests (change
requests), newsletter (+export), merch, analytics (overview+engagement+depth).

**Legacy standalone pages (to absorb or retire):** `admin.html` (crawler),
`platform/public/admin-*.html` ×11 (analytics, api-keys, authenticity ×6,
bookings, curator, disputes, tenants, ai-review) — legacy shared-password
auth (`nike_admin_token` localStorage key), scattered styling, several stale.

**Tenant portal (existing, sound):** `platform/api/tenant-portal.js` —
`tenant_accounts` (email-linked to bookings.email / patrons.email),
`tenant_sessions` (sha256 bearer), `tenant_change_requests` (creative swaps +
social links, approval queue), `tenant_tokens` (provisioning). Page:
`tenant.html` + `api/account/[[...slug]].js`.

**Advertiser analytics (existing):** `platform/api/ad-analytics.js` —
impressions / viewable / clicks / CTR per booking via `analytics_token`;
`api/analytics/dashboard/`.

**Site analytics (new, mine):** `platform/api/site-analytics.js` —
getOverview, getEngagementStats, getSessionDepth, getTrending,
getCountryStats, getTempleAnalytics. Public: `/api/analytics/trending/`,
`/api/analytics/temple/`.

## 1. Known defects to kill (do not carry over)

1. "Requests · 24h" stat card (`admin-portal/index.html:122`) is API
   telemetry (`traffic.requests` from `api_request_log`) mislabeled as a work
   queue. → Relabel "API Calls · 24h".
2. `requests/` page is empty by design (tenant self-service queue) but reads
   broken. → Repurpose as **Change Requests** fed by `tenant_change_requests`
   with approve/reject and real counts; hide the tab when zero.
3. `getDashboardUrl(token, siteSlug = 'nike')` in `platform/api/email.js:55`
   hardcodes the Nike temple in every advertiser dashboard link. → Derive the
   slug from the booking's temple.
4. Broken/legacy tabs (curator, AI review, tenants) → absorbed into System
   (crawler/curator stats) and Leasing/Tenants (real `tenant_accounts`
   directory) or retired into a Legacy Tools directory with a deprecation
   note. No dead links anywhere.
5. Crawler lives in a foreign interface (`admin.html`) → absorbed as
   System/Crawler inside the shell (same endpoints — portal tokens already
   pass `requireAdmin`).

## 2. The Sanctum — shell & design system

- `portal.css` v2: 240px obsidian sidebar (desktop) → backdrop drawer
  (mobile); gold accent system matching the site; sectioned nav with labels;
  dense tables (zebra, right-aligned numerics), stat cards, status badges,
  chart canvases, modals, toasts, breadcrumbs with page actions.
- `portal.js` v2: SECTIONS = Command, Analytics, Applications, Leasing,
  Store, Scholars, People, System. Same auth/api contracts (no auth changes).
  `Portal.initShell(pageId)` keeps its signature; adds section grouping,
  active states, drawer toggle, `Portal.badge(status)`, `Portal.sparkline`.
- Every page: `<body data-page data-depth>`, noindex, canonical favicon set.

## 3. The Sanctum — pages

1. **Command** (`index.html`): views today/7d, unique sessions, top 5
   temples (trending), top 5 countries, pending work broken out by queue
   (sponsorships, universities, careers, arbitrage, scholars edits, change
   requests), revenue 30d, patron MRR, indexed sites, system health (error
   rate 24h, slowest endpoints), quick links. Endpoint: extend
   `admin-portal-service.getDashboard` with trending/countries/pending maps.
2. **Analytics** (`analytics/`): existing deep page + Countries panel
   (`getCountryStats`) + per-temple drill-down links out to
   `/trending/temple/?id=` for the top temples + top pages (already added).
3. **Applications** (`applications/`): kind tabs — Sponsorships (existing),
   Universities (existing), Careers (`career_applications` table), Arbitrage
   (`arbitrage_requests` table). Careers/Arbitrage get a status flow
   (pending → contacted → closed) via new PATCH endpoints; emails via the
   existing notification helpers where appropriate.
4. **Change Requests** (`requests/` repurposed): `tenant_change_requests`
   queue — creative swaps + social-link changes with diff preview and
   approve/reject (backend exists).
5. **Leasing** (`leasing/`): bookings roster w/ statuses (from
   admin-booking-service), patrons (existing page moves), ad slots overview,
   **Tenants** directory (`tenant_accounts` + linkage: which
   temples/bookings/patrons each email holds, status, last login).
6. **Store** (`merch/`): existing creator-merch admin, re-skinned.
7. **Scholars** (`scholars/`): existing queues, re-skinned.
8. **People** (`people/`): newsletter (existing) + users (existing,
   superadmin-only) under one section.
9. **System** (`system/`): Crawler (stats, triggers, site list, spam queue —
   calls existing `/api/crawler/*` + `/api/crawl*` admin endpoints with the
   portal token), API Keys (absorbs admin-api-keys.html flows via
   `/api/admin/api-keys/*`), Observability (existing observability-service
   panels), DB info (tables, migrations, sizes), **Legacy Tools** directory
   (curated links to the remaining standalone admin-*.html with a
   deprecation banner; each link verified live).

## 4. The Sponsor Sandbox (`/account/` v2)

Tenant-facing, same design language (lighter chrome). Auth: existing
`tenant-portal.js` (no changes to auth model). Pages (under `account/`,
canonical `platform/public/account/` if present else root `account/`):

1. **Overview**: my temples (from email linkage), active leases with status
   + days remaining, patron memberships.
2. **Analytics**: per-booking ad performance (ad-analytics: impressions,
   viewable impressions, viewability %, clicks, CTR over 30d) AND temple
   traffic (`getTempleAnalytics` per owned temple: views, uniques, attention,
   countries) — aggregates only, scoped strictly to owned resources.
3. **Bookings**: full roster with statuses and advertiser dashboard links
   (with the nike hardcode fixed to the real temple slug).
4. **Brand**: creative swap + social links with the existing approval queue
   (submit → pending → reviewed in the Sanctum's Change Requests page).
5. **Account**: password change (existing flow).

New endpoints (tenant-authenticated, `api/account/`): `analytics` (scoped
ad metrics + temple traffic for owned temples only — email-verified
linkage), `overview` (temples + leases + patrons).

## 5. Test matrix (all new suites registered in test/run-all.js)

- `test/portal-v2-shell.test.js` — shell contract: NAV sections, permission
  gating strings, synced-copy byte-identity, every nav href resolves to a
  real file or verified live endpoint, no dead tabs.
- `test/portal-v2-pages.test.js` — every Sanctum page: markers, data-page,
  endpoint literals match the API_ROUTES table (extend
  admin-portal-page.test.js conventions).
- `test/portal-v2-endpoints.test.js` — new endpoints: 401 without token,
  role matrix, envelope shapes, careers/arbitrage status flow, tenants
  directory, dashboard additions.
- `test/sponsor-sandbox.test.js` — tenant auth required everywhere; scoping
  (tenant A never sees tenant B's data — two fixture tenants, cross-check);
  analytics only returns owned temples; change-request submission still
  flows.
- Regression guards: existing portal-endpoints, admin-portal-page,
  portal-auth, ad-analytics suites must stay green.
- The nike hardcode fix gets a direct test: getDashboardUrl for a non-nike
  booking returns that booking's temple slug.

## 6. Non-negotiables

- No auth model changes. No new dependencies. Vanilla JS only.
- Every number on every page must trace to a real table/endpoint; honest
  empty states everywhere; nothing fabricated.
- Aggregates only in the Sponsor Sandbox; strict email-verified scoping.
- portal tokens keep passing `requireAdmin` (the System pages depend on it).
- The sync direction never inverts: edit `platform/public/admin-portal/`,
  regenerate with `scripts/sync-admin-portal.js`.
